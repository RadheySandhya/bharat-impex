<?php
// ============================================================
// BHARAT IMPEX — PLANNING CONTROLLER
// Enforces Planning-First workflow:
//   Planning → Release → SKU Tracking → Production
// ============================================================

class PlanningController {

    private static function db(): PDO {
        return Database::getConnection();
    }

    private static function userId(): int {
        try {
            $token   = Auth::getTokenFromRequest();
            $payload = Auth::decodeToken($token);
            return (int)($payload['user_id'] ?? 1);
        } catch (Throwable $e) {
            return 1;
        }
    }

    private static function nextPlanningNumber(): string {
        $db   = self::db();
        $stmt = $db->query("SELECT MAX(CAST(SUBSTRING(planning_number, 5) AS UNSIGNED)) AS mx FROM production_planning");
        $row  = $stmt->fetch(PDO::FETCH_ASSOC);
        $next = (int)($row['mx'] ?? 0) + 1;
        return 'PLN-' . str_pad($next, 6, '0', STR_PAD_LEFT);
    }

    private static function nextReleaseNumber(int $planningId, string $planningNumber = ''): string {
        $db   = self::db();
        $stmt = $db->prepare("SELECT COUNT(*) AS cnt FROM planning_releases WHERE planning_id = :pid");
        $stmt->execute([':pid' => $planningId]);
        $cnt  = (int)($stmt->fetch(PDO::FETCH_ASSOC)['cnt'] ?? 0);

        $numPart = preg_replace('/[^0-9]/', '', $planningNumber);
        $numPart = str_pad($numPart ?: $planningId, 6, '0', STR_PAD_LEFT);

        $letter = chr(65 + ($cnt % 26));
        $suffix = ($cnt >= 26) ? '-' . chr(65 + (int)($cnt / 26) - 1) . $letter : '-' . $letter;

        $batchNumber = 'BATCH-' . $numPart . $suffix;

        // Safety uniqueness check
        $checkStmt = $db->prepare("SELECT COUNT(*) FROM planning_releases WHERE release_number = :rn");
        $checkStmt->execute([':rn' => $batchNumber]);
        if ((int)$checkStmt->fetchColumn() > 0) {
            $batchNumber = 'BATCH-' . $numPart . $suffix . '-' . (time() % 1000);
        }

        return $batchNumber;
    }

    private static function fetchOne(int $id): ?array {
        $db   = self::db();
        $stmt = $db->prepare("
            SELECT pp.*,
                   fg.fg_code, fg.product_name,
                   u.unit_code, u.unit_name,
                   w.warehouse_name,
                   ub.full_name AS created_by_name,
                   ua.full_name AS approved_by_name,
                   (pp.planned_quantity - pp.released_quantity) AS pending_quantity
            FROM production_planning pp
            JOIN finished_goods fg  ON fg.id = pp.fg_id
            JOIN units u            ON u.id  = pp.unit_id
            JOIN warehouses w       ON w.id  = pp.warehouse_id
            LEFT JOIN users ub      ON ub.id = pp.created_by
            LEFT JOIN users ua      ON ua.id = pp.approved_by
            WHERE pp.id = :id
        ");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) return null;
        $row['planned_quantity']   = (float)$row['planned_quantity'];
        $row['released_quantity']  = (float)$row['released_quantity'];
        $row['pending_quantity']   = (float)$row['pending_quantity'];
        $row['produced_quantity']  = (float)$row['produced_quantity'];
        $row['rejected_quantity']  = (float)$row['rejected_quantity'];
        $row['completed_quantity'] = (float)$row['completed_quantity'];
        return $row;
    }

    private static function fetchReleases(int $planningId): array {
        $db   = self::db();
        $stmt = $db->prepare("
            SELECT pr.*, u.full_name AS released_by_name
            FROM planning_releases pr
            LEFT JOIN users u ON u.id = pr.released_by
            WHERE pr.planning_id = :pid
            ORDER BY pr.created_at ASC
        ");
        $stmt->execute([':pid' => $planningId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$r) $r['release_quantity'] = (float)$r['release_quantity'];
        return $rows;
    }

    private static function fetchRevisions(int $planningId): array {
        $db   = self::db();
        $stmt = $db->prepare("
            SELECT pv.*, u.full_name AS revised_by_name
            FROM planning_revisions pv
            LEFT JOIN users u ON u.id = pv.revised_by
            WHERE pv.planning_id = :pid
            ORDER BY pv.created_at ASC
        ");
        $stmt->execute([':pid' => $planningId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$r) {
            $r['old_quantity'] = (float)$r['old_quantity'];
            $r['new_quantity'] = (float)$r['new_quantity'];
        }
        return $rows;
    }

    // GET /api/planning
    public static function index(): void {
        $db     = self::db();
        $status = $_GET['status']  ?? '';
        $fgId   = $_GET['fg_id']   ?? '';
        $prio   = $_GET['priority'] ?? '';
        $pending = $_GET['pending'] ?? '';

        $where  = ['1=1'];
        $params = [];

        if ($status)  { $where[] = 'pp.status = :status';    $params[':status']   = $status; }
        if ($fgId)    { $where[] = 'pp.fg_id = :fg_id';      $params[':fg_id']    = (int)$fgId; }
        if ($prio)    { $where[] = 'pp.priority = :priority'; $params[':priority'] = $prio; }
        if ($pending === '1') {
            $where[] = "(pp.planned_quantity - pp.released_quantity) > 0";
            $where[] = "pp.status NOT IN ('CANCELLED','FULLY_RELEASED','COMPLETED')";
        }

        $sql = "SELECT pp.*, fg.fg_code, fg.product_name, u.unit_code, w.warehouse_name,
                       ub.full_name AS created_by_name,
                       (pp.planned_quantity - pp.released_quantity) AS pending_quantity
                FROM production_planning pp
                JOIN finished_goods fg  ON fg.id = pp.fg_id
                JOIN units u            ON u.id  = pp.unit_id
                JOIN warehouses w       ON w.id  = pp.warehouse_id
                LEFT JOIN users ub      ON ub.id = pp.created_by
                WHERE " . implode(' AND ', $where) . "
                ORDER BY pp.created_at DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rows as &$r) {
            $r['planned_quantity']  = (float)$r['planned_quantity'];
            $r['released_quantity'] = (float)$r['released_quantity'];
            $r['pending_quantity']  = (float)$r['pending_quantity'];
            $r['produced_quantity'] = (float)($r['produced_quantity'] ?? 0);
            $r['release_pct'] = $r['planned_quantity'] > 0
                ? round(($r['released_quantity'] / $r['planned_quantity']) * 100, 1)
                : 0;
        }

        Response::success($rows, 'Planning records fetched');
    }

    // GET /api/planning/stats
    public static function stats(): void {
        $db   = self::db();
        $stmt = $db->query("
            SELECT
              COUNT(*)                                                                AS total_plans,
              COALESCE(SUM(planned_quantity), 0)                                     AS total_planned_qty,
              COALESCE(SUM(GREATEST(planned_quantity - released_quantity, 0)), 0)    AS total_pending_qty,
              COALESCE(SUM(released_quantity), 0)                                    AS total_released_qty,
              COALESCE(SUM(produced_quantity), 0)                                    AS total_produced_qty,
              COALESCE(SUM(completed_quantity), 0)                                   AS total_completed_qty,
              SUM(CASE WHEN (planned_quantity - released_quantity) > 0
                        AND status NOT IN ('CANCELLED','FULLY_RELEASED','COMPLETED')
                   THEN 1 ELSE 0 END)                                                AS pending_plans_count,
              SUM(CASE WHEN status = 'APPROVED'           THEN 1 ELSE 0 END)        AS approved_count,
              SUM(CASE WHEN status = 'PARTIALLY_RELEASED' THEN 1 ELSE 0 END)        AS partial_count,
              SUM(CASE WHEN status = 'FULLY_RELEASED'     THEN 1 ELSE 0 END)        AS fully_released_count,
              SUM(CASE WHEN status = 'CANCELLED'          THEN 1 ELSE 0 END)        AS cancelled_count,
              SUM(CASE WHEN status = 'COMPLETED'          THEN 1 ELSE 0 END)        AS completed_count
            FROM production_planning
        ");
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        foreach ($row as $k => $v) $row[$k] = (float)$v;
        Response::success($row, 'Planning stats');
    }

    // GET /api/planning/show?id=X
    public static function show(): void {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) { Response::error('id required', null, 400); return; }
        $row = self::fetchOne($id);
        if (!$row) { Response::error('Planning not found', null, 404); return; }
        $row['releases']  = self::fetchReleases($id);
        $row['revisions'] = self::fetchRevisions($id);
        Response::success($row, 'Planning detail');
    }

    // POST /api/planning
    public static function create(): void {
        $body     = json_decode(file_get_contents('php://input'), true) ?? [];
        $fgId     = (int)($body['fg_id']            ?? 0);
        $qty      = (float)($body['planned_quantity'] ?? 0);
        $unitId   = (int)($body['unit_id']           ?? 3);
        $whId     = (int)($body['warehouse_id']      ?? 3);
        $priority = strtoupper($body['priority']     ?? 'NORMAL');
        $date     = $body['planning_date']            ?? date('Y-m-d');
        $reqDate  = !empty($body['required_date'])    ? $body['required_date'] : null;
        $remarks  = $body['remarks']                  ?? null;

        if (!$fgId)   { Response::error('fg_id is required', null, 400); return; }
        if ($qty <= 0) { Response::error('Planned quantity must be > 0', null, 400); return; }
        if (!in_array($priority, ['LOW','NORMAL','HIGH','CRITICAL'])) $priority = 'NORMAL';

        $userId  = self::userId();
        $db      = self::db();
        $planNum = self::nextPlanningNumber();

        $stmt = $db->prepare("
            INSERT INTO production_planning
              (planning_number, fg_id, unit_id, warehouse_id, planned_quantity,
               priority, status, planning_date, required_date, remarks, created_by)
            VALUES
              (:pn, :fg, :unit, :wh, :qty, :prio, 'PLANNED', :pd, :rd, :rem, :cb)
        ");
        $stmt->execute([
            ':pn' => $planNum, ':fg' => $fgId, ':unit' => $unitId, ':wh' => $whId,
            ':qty' => $qty,   ':prio' => $priority, ':pd' => $date,
            ':rd' => $reqDate, ':rem' => $remarks, ':cb' => $userId,
        ]);

        $newId = (int)$db->lastInsertId();
        $row   = self::fetchOne($newId);

        if (class_exists('AuditService')) {
            AuditService::log('planning_created', 'production_planning', $newId, null, ['planning_number' => $planNum, 'quantity' => $qty], $userId);
        }

        Response::success($row, "Planning {$planNum} created successfully", 201);
    }

    // POST /api/planning/approve
    public static function approve(): void {
        $body   = json_decode(file_get_contents('php://input'), true) ?? [];
        $id     = (int)($body['planning_id'] ?? 0);
        if (!$id) { Response::error('planning_id required', null, 400); return; }

        $row = self::fetchOne($id);
        if (!$row) { Response::error('Planning not found', null, 404); return; }

        if (!in_array($row['status'], ['DRAFT','PLANNED'])) {
            Response::error("Cannot approve planning in '{$row['status']}' status", null, 422); return;
        }

        $userId = self::userId();
        self::db()->prepare("
            UPDATE production_planning
            SET status='APPROVED', approved_by=:ab, approved_at=NOW(), updated_at=NOW()
            WHERE id=:id
        ")->execute([':ab' => $userId, ':id' => $id]);

        if (class_exists('AuditService')) {
            AuditService::log('planning_approved', 'production_planning', $id, null, null, $userId);
        }

        Response::success(self::fetchOne($id), "Planning {$row['planning_number']} approved");
    }

    // POST /api/planning/release  — TRANSACTIONAL
    public static function release(): void {
        $body       = json_decode(file_get_contents('php://input'), true) ?? [];
        $planningId = (int)($body['planning_id']       ?? 0);
        $releaseQty = (float)($body['release_quantity'] ?? 0);
        $remarks    = $body['remarks'] ?? null;
        $userId     = self::userId();

        if (!$planningId)  { Response::error('planning_id is required', null, 400); return; }
        if ($releaseQty <= 0) { Response::error('Release quantity must be > 0', null, 400); return; }

        $db = self::db();
        $db->beginTransaction();

        try {
            // Lock row
            $stmt = $db->prepare("SELECT * FROM production_planning WHERE id = :id FOR UPDATE");
            $stmt->execute([':id' => $planningId]);
            $p = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$p) { $db->rollBack(); Response::error('Planning not found', null, 404); return; }

            if (!in_array($p['status'], ['APPROVED','PARTIALLY_RELEASED'])) {
                $db->rollBack();
                Response::error("Cannot release from '{$p['status']}' status. Must be APPROVED first.", null, 422);
                return;
            }

            $pending = (float)$p['planned_quantity'] - (float)$p['released_quantity'];
            if ($releaseQty > $pending) {
                $db->rollBack();
                Response::error(
                    "Only " . number_format($pending, 3) . " units available for release.",
                    ['pending_quantity' => $pending], 422
                );
                return;
            }

            $releaseNum = self::nextReleaseNumber($planningId, $p['planning_number'] ?? '');
            $db->prepare("
                INSERT INTO planning_releases
                  (release_number, planning_id, release_quantity, release_date, released_by, status, remarks)
                VALUES (:rn, :pid, :qty, CURDATE(), :rb, 'ACTIVE', :rem)
            ")->execute([
                ':rn' => $releaseNum, ':pid' => $planningId, ':qty' => $releaseQty,
                ':rb' => $userId, ':rem' => $remarks,
            ]);
            $releaseId  = (int)$db->lastInsertId();
            $newReleased = (float)$p['released_quantity'] + $releaseQty;
            $newStatus   = ($newReleased >= (float)$p['planned_quantity']) ? 'FULLY_RELEASED' : 'PARTIALLY_RELEASED';

            $db->prepare("
                UPDATE production_planning
                SET released_quantity=:rq, status=:st, updated_at=NOW()
                WHERE id=:id
            ")->execute([':rq' => $newReleased, ':st' => $newStatus, ':id' => $planningId]);

            // Upfront Full Kitting (RM Deduction) on Release
            $autoKitting   = isset($body['auto_kitting']) ? (bool)$body['auto_kitting'] : true;
            $allowOverride = isset($body['allow_shortage_override']) ? (bool)$body['allow_shortage_override'] : true;
            $customItems   = $body['kitting_items'] ?? null;
            $warehouseId   = (int)($body['warehouse_id'] ?? 1);
            $deductionResults = [];

            if ($autoKitting) {
                $fgId = (int)$p['fg_id'];
                $fgStmt = $db->prepare("SELECT * FROM finished_goods WHERE id = ?");
                $fgStmt->execute([$fgId]);
                $fg = $fgStmt->fetch(PDO::FETCH_ASSOC);

                $kittingItems = [];
                if (!empty($customItems) && is_array($customItems)) {
                    $kittingItems = $customItems;
                } else {
                    $bom = BOMService::getActiveBOMForProduct($fgId);
                    if ($bom) {
                        $calc = BOMService::calculateRequirements($bom['id'], $releaseQty, $warehouseId);
                        $kittingItems = $calc['items'];
                        if (!$allowOverride && !$calc['all_materials_available']) {
                            $db->rollBack();
                            Response::error('One or more raw materials are in shortage. Check owner override to proceed.', null, 422);
                            return;
                        }
                    } else if ($fg) {
                        $weight = (float)(!empty($fg['gross_weight']) ? $fg['gross_weight'] : (!empty($fg['net_weight']) ? $fg['net_weight'] : 0.350));
                        $totalBrass = round($weight * $releaseQty, 3);
                        $kittingItems[] = [
                            'rm_id' => 1,
                            'total_required_qty' => $totalBrass,
                            'unit_code' => 'KG'
                        ];
                        $kittingItems[] = [
                            'rm_id' => 8,
                            'total_required_qty' => $releaseQty,
                            'unit_code' => 'PCS'
                        ];
                    }
                }

                foreach ($kittingItems as $item) {
                    $rmId = (int)($item['rm_id'] ?? 0);
                    $reqQty = (float)($item['total_required_qty'] ?? ($item['quantity'] ?? 0));
                    if ($rmId <= 0 || $reqQty <= 0) continue;

                    $rmStmt = $db->prepare("SELECT * FROM raw_materials WHERE id = ?");
                    $rmStmt->execute([$rmId]);
                    $rmData = $rmStmt->fetch(PDO::FETCH_ASSOC);
                    if (!$rmData) continue;

                    $unitId = (int)($rmData['unit_id'] ?: 1);
                    $rate   = (float)($rmData['standard_rate'] ?: 0.0);

                    $subChildPartId = !empty($item['sub_child_part_id']) ? (int)$item['sub_child_part_id'] : null;
                    $subPartName    = !empty($item['sub_part_name']) ? trim($item['sub_part_name']) : null;
                    $subPartBrand   = !empty($item['sub_part_brand']) ? trim($item['sub_part_brand']) : null;

                    if ($subChildPartId && (!$subPartName || !$subPartBrand)) {
                        try {
                            $scpStmt = $db->prepare("SELECT sub_part_name, brand_name, sub_part_code FROM sub_child_parts WHERE id = ?");
                            $scpStmt->execute([$subChildPartId]);
                            $scpRow = $scpStmt->fetch(PDO::FETCH_ASSOC);
                            if ($scpRow) {
                                $subPartName = $scpRow['sub_part_name'];
                                $subPartBrand = $scpRow['brand_name'];
                            }
                        } catch (Exception $e) {}
                    }

                    $varNote = ($subPartBrand || $subPartName)
                        ? " [Variant: " . trim(($subPartBrand ? "[$subPartBrand] " : "") . $subPartName) . "]"
                        : "";

                    $decRes = InventoryService::decreaseStock(
                        'RM',
                        $rmId,
                        $rmData['rm_code'],
                        $warehouseId,
                        $reqQty,
                        $unitId,
                        $rate,
                        'PRODUCTION_CONSUMPTION',
                        $releaseNum,
                        $releaseNum,
                        $releaseNum,
                        date('Y-m-d'),
                        "Raw Material Consumption (Full Kitting on Release) for Batch #{$releaseNum} - {$fg['product_name']} (Qty: {$releaseQty}){$varNote}. " . ($remarks ?: ''),
                        $userId,
                        $allowOverride
                    );

                    // Decrement variant stock if tracked
                    if ($subChildPartId > 0) {
                        try {
                            $db->prepare("UPDATE sub_child_parts SET current_stock = GREATEST(0, current_stock - ?) WHERE id = ?")
                               ->execute([$reqQty, $subChildPartId]);
                        } catch (Exception $e) {}
                    }

                    $deductionResults[] = [
                        'rm_id'             => $rmId,
                        'rm_code'           => $rmData['rm_code'],
                        'material_name'     => $rmData['material_name'],
                        'sub_child_part_id' => $subChildPartId,
                        'sub_part_name'     => $subPartName,
                        'sub_part_brand'    => $subPartBrand,
                        'qty_deducted'      => $reqQty,
                        'unit_code'         => $item['unit_code'] ?? 'PCS',
                        'new_stock'         => $decRes['new_qty']
                    ];
                }

                if (!empty($deductionResults)) {
                    $db->prepare("
                        UPDATE planning_releases 
                        SET rm_deducted = 1, kitting_details = ?, updated_at = NOW() 
                        WHERE id = ?
                    ")->execute([json_encode($deductionResults), $releaseId]);
                }
            }

            $db->commit();

            $updated    = self::fetchOne($planningId);
            $relStmt    = $db->prepare("SELECT pr.*, u.full_name AS released_by_name FROM planning_releases pr LEFT JOIN users u ON u.id=pr.released_by WHERE pr.id=:id");
            $relStmt->execute([':id' => $releaseId]);
            $releaseRow = $relStmt->fetch(PDO::FETCH_ASSOC);

            if (class_exists('AuditService')) {
                AuditService::log('planning_released', 'planning_releases', $releaseId,
                    ['pending_before' => $pending],
                    [
                        'release_number' => $releaseNum, 
                        'qty'            => $releaseQty,
                        'auto_kitted'    => !empty($deductionResults),
                        'materials_count'=> count($deductionResults)
                    ],
                    $userId
                );
            }

            $msg = !empty($deductionResults)
                ? "Released {$releaseNum} ({$releaseQty} units) to SKU Tracking with Full Kitting completed (" . count($deductionResults) . " RMs deducted)!"
                : "Released {$releaseNum}: {$releaseQty} units → Status: {$newStatus}";

            Response::success([
                'planning'        => $updated, 
                'release'         => $releaseRow,
                'kitting_results' => $deductionResults
            ], $msg);

        } catch (Throwable $e) {
            $db->rollBack();
            Response::error('Release failed: ' . $e->getMessage(), null, 500);
        }
    }

    // Ensure stage_tracking column exists in planning_releases
    private static function ensureStageTrackingColumn(PDO $db): void {
        static $checked = false;
        if ($checked) return;
        try {
            $colStmt = $db->query("SHOW COLUMNS FROM planning_releases LIKE 'stage_tracking'");
            if (!$colStmt->fetch()) {
                $db->exec("ALTER TABLE planning_releases ADD COLUMN stage_tracking LONGTEXT NULL AFTER kitting_details");
            }
        } catch (Exception $e) {
            // Silently ignore if already exists or permission issues
        }
        $checked = true;
    }

    // GET /api/planning/releases (optional ?planning_id=X)
    public static function releases(): void {
        $db = self::db();
        self::ensureStageTrackingColumn($db);
        $planningId = (int)($_GET['planning_id'] ?? 0);
        $where = ["pr.status = 'ACTIVE'"];
        $params = [];
        if ($planningId) {
            $where[] = "pr.planning_id = :pid";
            $params[':pid'] = $planningId;
        }

        $sql = "
            SELECT pr.*, 
                   pp.planning_number, pp.priority, pp.planned_quantity,
                   fg.id as fg_id, fg.fg_code, fg.product_name,
                   COALESCE(u.unit_code, 'PCS') as unit_code,
                   usr.full_name as released_by_name
            FROM planning_releases pr
            JOIN production_planning pp ON pr.planning_id = pp.id
            JOIN finished_goods fg ON pp.fg_id = fg.id
            LEFT JOIN units u ON pp.unit_id = u.id
            LEFT JOIN users usr ON pr.released_by = usr.id
            WHERE " . implode(' AND ', $where) . "
            ORDER BY pr.id DESC
        ";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$r) {
            $r['release_quantity'] = (float)$r['release_quantity'];
            $r['planned_quantity'] = (float)$r['planned_quantity'];
            $r['rm_deducted'] = (int)($r['rm_deducted'] ?? 0);
        }

        Response::success($rows, 'Planning releases fetched');
    }

    // POST /api/planning/update-stages
    public static function updateStages(): void {
        $db = self::db();
        self::ensureStageTrackingColumn($db);
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $releaseId = (int)($body['release_id'] ?? 0);
        $batchNo   = trim($body['batch_no'] ?? '');
        $stages    = $body['stages'] ?? null;
        $ready     = $body['ready'] ?? null;

        if (!$releaseId && empty($batchNo)) {
            Response::error('release_id or batch_no required', null, 400);
            return;
        }

        $trackingPayload = json_encode([
            'stages' => $stages,
            'ready'  => $ready,
            'updated_at' => date('Y-m-d H:i:s')
        ]);

        $sql = "UPDATE planning_releases SET stage_tracking = :st WHERE id = :id OR release_number = :rn";
        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':st' => $trackingPayload,
            ':id' => $releaseId,
            ':rn' => $batchNo
        ]);

        Response::success(['saved' => true], 'Batch stage tracking updated successfully');
    }

    // POST /api/planning/update
    public static function update(): void {
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $id   = (int)($body['id'] ?? 0);
        if (!$id) { Response::error('id required', null, 400); return; }

        $row = self::fetchOne($id);
        if (!$row) { Response::error('Not found', null, 404); return; }

        if (in_array($row['status'], ['CANCELLED','FULLY_RELEASED','COMPLETED'])) {
            Response::error("Cannot edit planning in '{$row['status']}' status", null, 422); return;
        }

        $db     = self::db();
        $userId = self::userId();
        $sets   = ['updated_at = NOW()'];
        $params = [':id' => $id];

        if (isset($body['planned_quantity'])) {
            $newQty = (float)$body['planned_quantity'];
            if ($newQty <= 0) { Response::error('Quantity must be > 0', null, 400); return; }
            if ($newQty < (float)$row['released_quantity']) {
                Response::error("Planned quantity cannot be lower than already released quantity ({$row['released_quantity']})", null, 422); return;
            }
            $changeType = $newQty > $row['planned_quantity'] ? 'INCREASE' : 'DECREASE';
            $db->prepare("INSERT INTO planning_revisions (planning_id,old_quantity,new_quantity,change_type,reason,revised_by) VALUES (:pid,:oq,:nq,:ct,:r,:rb)")
               ->execute([':pid' => $id, ':oq' => $row['planned_quantity'], ':nq' => $newQty, ':ct' => $changeType, ':r' => ($body['reason'] ?? 'Updated'), ':rb' => $userId]);
            $sets[] = 'planned_quantity = :qty'; $params[':qty'] = $newQty;
            $newRel = (float)$row['released_quantity'];
            $newSt  = $newRel >= $newQty ? 'FULLY_RELEASED' : ($newRel > 0 ? 'PARTIALLY_RELEASED' : $row['status']);
            $sets[] = 'status = :st'; $params[':st'] = $newSt;
        }
        if (isset($body['priority']))     { $sets[] = 'priority = :prio';       $params[':prio'] = strtoupper($body['priority']); }
        if (isset($body['required_date'])){ $sets[] = 'required_date = :rd';    $params[':rd']   = $body['required_date']; }
        if (isset($body['remarks']))      { $sets[] = 'remarks = :rem';         $params[':rem']  = $body['remarks']; }

        $db->prepare("UPDATE production_planning SET " . implode(', ', $sets) . " WHERE id = :id")->execute($params);
        Response::success(self::fetchOne($id), 'Planning updated');
    }

    // POST /api/planning/cancel
    public static function cancel(): void {
        $body   = json_decode(file_get_contents('php://input'), true) ?? [];
        $id     = (int)($body['planning_id'] ?? 0);
        $reason = $body['reason'] ?? 'Cancelled';
        if (!$id) { Response::error('planning_id required', null, 400); return; }

        $row = self::fetchOne($id);
        if (!$row) { Response::error('Not found', null, 404); return; }
        if (in_array($row['status'], ['CANCELLED','COMPLETED'])) {
            Response::error("Already {$row['status']}", null, 422); return;
        }

        $userId  = self::userId();
        $pending = $row['planned_quantity'] - $row['released_quantity'];

        if ($pending > 0) {
            self::db()->prepare("INSERT INTO planning_revisions (planning_id,old_quantity,new_quantity,change_type,reason,revised_by) VALUES (:pid,:oq,:nq,'CANCELLATION',:r,:rb)")
               ->execute([':pid' => $id, ':oq' => $row['planned_quantity'], ':nq' => $row['released_quantity'], ':r' => $reason, ':rb' => $userId]);
        }

        self::db()->prepare("UPDATE production_planning SET status='CANCELLED',cancelled_by=:cb,cancelled_at=NOW(),cancel_reason=:cr,updated_at=NOW() WHERE id=:id")
           ->execute([':cb' => $userId, ':cr' => $reason, ':id' => $id]);

        Response::success(self::fetchOne($id), 'Planning cancelled');
    }
}
