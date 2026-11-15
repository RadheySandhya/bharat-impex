<?php
// ============================================================
// BHARAT IMPEX — REJECTION TRACKING & REJECTION PROCESS ROUTES
// ============================================================
//
// Rejected pieces found at any SKU-tracking stage become a "rejection lot" that starts in the
// Rejection Bin. There is no fixed rejection route: the decision is made later, step by step.
// From wherever the pieces are, any quantity can be sent:
//   STAGE   -> to any production stage for work (still tracked, e.g. re-machining)
//   RETURN  -> back into the production flow of the batch at any stage (lot completes)
//   FURNACE -> total reject: weighed and booked into scrap stock (lot completes)
// Moving part of a lot splits it: the moved pieces become a child lot, the rest stay put.
// Every move is kept in history_json, which the tracker popup shows as the lot's journey.

class RejectionController {

    // Lot dispositions: PENDING = in the common rejection pipeline, decision not made yet
    public const DISPOSITIONS = ['PENDING', 'MINOR', 'FURNACE'];
    // Routes: COMMON = pipeline every rejection goes through first, ending in the decision
    public const ROUTE_TYPES = ['COMMON', 'MINOR', 'FURNACE'];
    public const BIN_NAME = 'Rejection Bin';

    private static function routeFor(string $disposition): string {
        return $disposition === 'PENDING' ? 'COMMON' : $disposition;
    }

    private static function defaultRouteName(string $type): string {
        return ['COMMON' => 'Rejection Pipeline', 'FURNACE' => 'Furnace Remelt Route', 'MINOR' => 'Rework Route'][$type] ?? 'Rejection Route';
    }

    private static function defaultFlow(string $type): array {
        if ($type === 'COMMON') {
            $names = [
                ['Rejection Received (QC Bin)', 'Rejected pieces from the stage arrive here'],
                ['Segregation & Counting', 'Sort and count the rejected pieces'],
                ['Inspection & Decision', 'Decide: how many to Furnace, how many to Rework'],
            ];
        } elseif ($type === 'FURNACE') {
            $names = [
                ['Scrap Weighing', 'Weigh pieces and confirm scrap kg'],
                ['Scrap Yard / Store', 'Held in scrap store until melting'],
                ['Furnace Melting', 'Melted back in the foundry furnace'],
                ['Recast to Raw Brass', 'Scrap booked into scrap stock'],
            ];
        } else {
            $names = [
                ['Rework Station', 'Re-buff / re-machine / re-plate'],
                ['Re-inspection QC', 'Quality check after rework'],
                ['Return to Production', 'Pieces go back to the selected stage'],
            ];
        }
        $nodes = [];
        $edges = [];
        foreach ($names as $i => [$name, $note]) {
            $id = 'n' . ($i + 1);
            $nodes[] = ['id' => $id, 'name' => $name, 'note' => $note, 'x' => 60 + $i * 290, 'y' => 160 + ($i % 2) * 50];
            if ($i > 0) {
                $edges[] = ['id' => 'e' . $i, 'from' => 'n' . $i, 'to' => $id];
            }
        }
        return ['nodes' => $nodes, 'edges' => $edges];
    }

    private static function ensureTables(PDO $db): void {
        static $done = false;
        if ($done) return;
        $done = true;
        $db->exec("
            CREATE TABLE IF NOT EXISTS rejection_routes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                route_type VARCHAR(30) NOT NULL UNIQUE,
                route_name VARCHAR(150) NOT NULL,
                flow_json LONGTEXT NOT NULL,
                updated_by INT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ");
        $db->exec("
            CREATE TABLE IF NOT EXISTS rejection_lots (
                id INT AUTO_INCREMENT PRIMARY KEY,
                lot_number VARCHAR(50) NOT NULL UNIQUE,
                release_id INT NULL,
                batch_no VARCHAR(100) NOT NULL,
                fg_id INT NULL,
                item_name VARCHAR(255) NULL,
                source_stage_key VARCHAR(100) NULL,
                source_stage_name VARCHAR(150) NULL,
                defect_reason VARCHAR(255) NULL,
                disposition VARCHAR(20) NOT NULL,
                quantity DECIMAL(14,3) NOT NULL,
                avg_weight DECIMAL(10,3) NOT NULL DEFAULT 0,
                scrap_weight_kg DECIMAL(14,3) NOT NULL DEFAULT 0,
                return_stage_key VARCHAR(100) NULL,
                return_stage_name VARCHAR(150) NULL,
                steps_json LONGTEXT NOT NULL,
                current_step INT NOT NULL DEFAULT 0,
                history_json LONGTEXT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
                warehouse_id INT NULL,
                operator VARCHAR(150) NULL,
                remarks TEXT NULL,
                created_by INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                completed_at DATETIME NULL,
                INDEX idx_rej_batch (batch_no),
                INDEX idx_rej_status (status),
                INDEX idx_rej_disp (disposition)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ");
        try {
            if (!$db->query("SHOW COLUMNS FROM rejection_lots LIKE 'parent_lot_number'")->fetch()) {
                $db->exec("ALTER TABLE rejection_lots ADD COLUMN parent_lot_number VARCHAR(50) NULL AFTER lot_number");
            }
            if (!$db->query("SHOW COLUMNS FROM rejection_lots LIKE 'location_type'")->fetch()) {
                $db->exec("ALTER TABLE rejection_lots
                    ADD COLUMN location_type VARCHAR(20) NULL AFTER current_step,
                    ADD COLUMN location_key VARCHAR(100) NULL AFTER location_type,
                    ADD COLUMN location_name VARCHAR(150) NULL AFTER location_key");
            }
        } catch (Exception $e) {
            error_log('rejection_lots upgrade failed: ' . $e->getMessage());
        }
    }

    /**
     * Order route nodes along the drawn connections (topological), ties broken by x position.
     * Disconnected nodes are appended by x position.
     */
    private static function orderSteps(array $flow): array {
        $nodes = $flow['nodes'] ?? [];
        $edges = $flow['edges'] ?? [];
        $byId = [];
        foreach ($nodes as $n) {
            if (!isset($n['id'])) continue;
            $byId[(string)$n['id']] = $n;
        }
        $inDeg = array_fill_keys(array_keys($byId), 0);
        $out = array_fill_keys(array_keys($byId), []);
        foreach ($edges as $e) {
            $f = (string)($e['from'] ?? '');
            $t = (string)($e['to'] ?? '');
            if (!isset($byId[$f], $byId[$t]) || $f === $t) continue;
            $out[$f][] = $t;
            $inDeg[$t]++;
        }
        $byX = function ($a, $b) use ($byId) {
            return ((float)($byId[$a]['x'] ?? 0)) <=> ((float)($byId[$b]['x'] ?? 0));
        };
        $queue = array_keys(array_filter($inDeg, fn($d) => $d === 0));
        usort($queue, $byX);
        $ordered = [];
        $seen = [];
        while ($queue) {
            $id = array_shift($queue);
            if (isset($seen[$id])) continue;
            $seen[$id] = true;
            $ordered[] = $id;
            $next = $out[$id];
            usort($next, $byX);
            foreach ($next as $t) {
                $inDeg[$t]--;
                if ($inDeg[$t] <= 0 && !isset($seen[$t])) $queue[] = $t;
            }
            usort($queue, $byX);
        }
        $rest = array_values(array_diff(array_keys($byId), $ordered));
        usort($rest, $byX);
        $ordered = array_merge($ordered, $rest);

        return array_map(function ($id) use ($byId) {
            return [
                'id'   => $id,
                'name' => trim((string)($byId[$id]['name'] ?? 'Step')),
                'note' => trim((string)($byId[$id]['note'] ?? '')),
            ];
        }, $ordered);
    }

    private static function loadRoute(PDO $db, string $type): array {
        $stmt = $db->prepare("SELECT route_type, route_name, flow_json, updated_at FROM rejection_routes WHERE route_type = ?");
        $stmt->execute([$type]);
        $row = $stmt->fetch();
        if ($row) {
            $flow = json_decode($row['flow_json'], true) ?: self::defaultFlow($type);
            $name = $row['route_name'];
            $updated = $row['updated_at'];
        } else {
            $flow = self::defaultFlow($type);
            $name = self::defaultRouteName($type);
            $updated = null;
        }
        return [
            'route_type' => $type,
            'route_name' => $name,
            'nodes'      => $flow['nodes'] ?? [],
            'edges'      => $flow['edges'] ?? [],
            'steps'      => self::orderSteps($flow),
            'updated_at' => $updated,
        ];
    }

    /** GET /rejections/routes */
    public static function routes(): void {
        Auth::requireAuth();
        $db = Database::getConnection();
        self::ensureTables($db);
        $out = [];
        foreach (self::ROUTE_TYPES as $t) {
            $out[$t] = self::loadRoute($db, $t);
        }
        Response::success($out);
    }

    /** POST /rejections/routes  {route_type, route_name, nodes, edges} */
    public static function saveRoute(): void {
        $user = Auth::requireAuth();
        $db = Database::getConnection();
        self::ensureTables($db);
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $type = strtoupper(trim((string)($input['route_type'] ?? '')));
        if (!in_array($type, self::ROUTE_TYPES, true)) {
            Response::error('route_type must be COMMON, MINOR or FURNACE.', null, 400);
        }
        $name = trim((string)($input['route_name'] ?? '')) ?: self::defaultRouteName($type);

        $nodes = [];
        foreach (($input['nodes'] ?? []) as $n) {
            $id = trim((string)($n['id'] ?? ''));
            $nm = trim((string)($n['name'] ?? ''));
            if ($id === '' || $nm === '') continue;
            $nodes[] = [
                'id'   => $id,
                'name' => mb_substr($nm, 0, 120),
                'note' => mb_substr(trim((string)($n['note'] ?? '')), 0, 255),
                'x'    => round((float)($n['x'] ?? 0)),
                'y'    => round((float)($n['y'] ?? 0)),
            ];
        }
        if (count($nodes) < 1) {
            Response::error('A rejection route needs at least one step.', null, 400);
        }
        $ids = array_column($nodes, 'id');
        $edges = [];
        foreach (($input['edges'] ?? []) as $e) {
            $f = (string)($e['from'] ?? '');
            $t = (string)($e['to'] ?? '');
            if ($f === $t || !in_array($f, $ids, true) || !in_array($t, $ids, true)) continue;
            $edges[] = ['id' => (string)($e['id'] ?? "e-{$f}-{$t}"), 'from' => $f, 'to' => $t];
        }
        $flow = ['nodes' => $nodes, 'edges' => $edges];

        $db->prepare("
            INSERT INTO rejection_routes (route_type, route_name, flow_json, updated_by)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE route_name = VALUES(route_name), flow_json = VALUES(flow_json), updated_by = VALUES(updated_by)
        ")->execute([$type, $name, json_encode($flow, JSON_UNESCAPED_UNICODE), $user['id'] ?? null]);

        AuditService::log('REJECTION_ROUTE_SAVED', 'PROCESSES', $type, null, ['steps' => count($nodes)]);
        Response::success(self::loadRoute($db, $type), 'Rejection process route saved.');
    }

    private static function decodeLot(array $r): array {
        $r['steps'] = json_decode($r['steps_json'] ?? '[]', true) ?: [];
        $r['history'] = json_decode($r['history_json'] ?? '[]', true) ?: [];
        unset($r['steps_json'], $r['history_json']);
        $r['quantity'] = (float)$r['quantity'];
        $r['avg_weight'] = (float)$r['avg_weight'];
        $r['scrap_weight_kg'] = (float)$r['scrap_weight_kg'];
        $r['current_step'] = (int)$r['current_step'];
        $idx = $r['current_step'];
        $r['current_step_name'] = $r['steps'][$idx]['name'] ?? null;
        $r['is_last_step'] = $idx >= count($r['steps']) - 1;

        // Where the pieces are now (lots created before free tracking have no location columns set)
        if (empty($r['location_type'])) {
            if ($r['status'] === 'COMPLETED') {
                $r['location_type'] = $r['disposition'] === 'FURNACE' ? 'FURNACE' : 'RETURNED';
                $r['location_name'] = $r['disposition'] === 'FURNACE' ? 'Furnace (scrap booked)' : ($r['return_stage_name'] ?: 'Production');
            } elseif ($r['disposition'] === 'PENDING') {
                $r['location_type'] = 'BIN';
                $r['location_name'] = self::BIN_NAME;
            } else {
                $r['location_type'] = $r['disposition'] === 'FURNACE' ? 'BIN' : 'STAGE';
                $r['location_key'] = $r['return_stage_key'];
                $r['location_name'] = $r['disposition'] === 'FURNACE' ? self::BIN_NAME : ($r['return_stage_name'] ?: self::BIN_NAME);
            }
        }
        return $r;
    }

    /** GET /rejections/lots?status=&disposition=&batch_no=&search= */
    public static function lots(): void {
        Auth::requireAuth();
        $db = Database::getConnection();
        self::ensureTables($db);

        $sql = "SELECT rl.*, w.warehouse_name FROM rejection_lots rl LEFT JOIN warehouses w ON w.id = rl.warehouse_id WHERE 1=1";
        $params = [];
        $status = strtoupper(trim($_GET['status'] ?? ''));
        if ($status && $status !== 'ALL') { $sql .= " AND rl.status = ?"; $params[] = $status; }
        $disp = strtoupper(trim($_GET['disposition'] ?? ''));
        if ($disp && $disp !== 'ALL') { $sql .= " AND rl.disposition = ?"; $params[] = $disp; }
        if (!empty($_GET['batch_no'])) { $sql .= " AND rl.batch_no = ?"; $params[] = trim($_GET['batch_no']); }
        if (!empty($_GET['source_stage_key'])) { $sql .= " AND rl.source_stage_key = ?"; $params[] = trim($_GET['source_stage_key']); }
        if (!empty($_GET['from_date'])) { $sql .= " AND DATE(rl.created_at) >= ?"; $params[] = $_GET['from_date']; }
        if (!empty($_GET['to_date'])) { $sql .= " AND DATE(rl.created_at) <= ?"; $params[] = $_GET['to_date']; }
        $search = trim($_GET['search'] ?? '');
        if ($search !== '') {
            $sql .= " AND (rl.batch_no LIKE ? OR rl.item_name LIKE ? OR rl.lot_number LIKE ? OR rl.defect_reason LIKE ? OR rl.location_name LIKE ?)";
            array_push($params, "%{$search}%", "%{$search}%", "%{$search}%", "%{$search}%", "%{$search}%");
        }
        $sql .= " ORDER BY (rl.status = 'OPEN') DESC, rl.id DESC LIMIT 500";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        Response::success(array_map([self::class, 'decodeLot'], $stmt->fetchAll()));
    }

    /**
     * POST /rejections/lots
     * {batch_no, release_id, fg_id, item_name, source_stage_key, source_stage_name, defect_reason,
     *  avg_weight, operator, remarks, splits: [{disposition, quantity, return_stage_key, return_stage_name}]}
     */
    public static function createLots(): void {
        $user = Auth::requireAuth();
        $db = Database::getConnection();
        self::ensureTables($db);
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $batchNo = trim((string)($input['batch_no'] ?? ''));
        $splits = $input['splits'] ?? [];
        if ($batchNo === '') Response::error('Batch number is required.', null, 400);
        if (!is_array($splits) || !$splits) Response::error('At least one rejection split is required.', null, 400);
        $srcStage = trim((string)($input['source_stage_key'] ?? ''));
        if ($srcStage !== '' && !PermissionService::canStageKey($srcStage)) {
            Response::error('You can only log rejections for your assigned stages.', null, 403);
        }

        $avgWeight = max(0.0, (float)($input['avg_weight'] ?? 0));
        $operator = trim((string)($input['operator'] ?? '')) ?: ($user['full_name'] ?? 'Supervisor');
        $now = date('Y-m-d H:i:s');
        $routes = [];
        $created = [];

        $db->beginTransaction();
        try {
            foreach ($splits as $i => $sp) {
                $disp = strtoupper(trim((string)($sp['disposition'] ?? ''))) ?: 'PENDING';
                $qty = round((float)($sp['quantity'] ?? 0), 3);
                if ($qty <= 0) continue;
                if (!in_array($disp, self::DISPOSITIONS, true)) {
                    throw new InvalidArgumentException('Split #' . ($i + 1) . ': disposition must be PENDING, MINOR or FURNACE.');
                }
                $lotNumber = 'RJ-' . date('ymd') . '-' . strtoupper(bin2hex(random_bytes(3)));
                $srcName = trim((string)($input['source_stage_name'] ?? '')) ?: 'stage';
                $history = [[
                    'action'    => 'REJECTED',
                    'step_name' => self::BIN_NAME,
                    'from'      => $srcName,
                    'to'        => self::BIN_NAME,
                    'qty'       => $qty,
                    'at'        => $now,
                    'by'        => $operator,
                    'remarks'   => trim((string)(($input['defect_reason'] ?? '') . ((($input['remarks'] ?? '') !== '') ? ' - ' . $input['remarks'] : ''))),
                ]];

                $db->prepare("
                    INSERT INTO rejection_lots (
                        lot_number, release_id, batch_no, fg_id, item_name, source_stage_key, source_stage_name,
                        defect_reason, disposition, quantity, avg_weight, scrap_weight_kg,
                        return_stage_key, return_stage_name, steps_json, current_step, location_type, location_key, location_name,
                        history_json, status, operator, remarks, created_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'BIN', NULL, ?, ?, 'OPEN', ?, ?, ?)
                ")->execute([
                    $lotNumber,
                    !empty($input['release_id']) ? (int)$input['release_id'] : null,
                    $batchNo,
                    !empty($input['fg_id']) ? (int)$input['fg_id'] : null,
                    trim((string)($input['item_name'] ?? '')),
                    trim((string)($input['source_stage_key'] ?? '')),
                    trim((string)($input['source_stage_name'] ?? '')),
                    trim((string)($input['defect_reason'] ?? '')),
                    $disp,
                    $qty,
                    $avgWeight,
                    $disp === 'FURNACE' ? round($qty * $avgWeight, 3) : 0,
                    $disp === 'MINOR' ? (trim((string)($sp['return_stage_key'] ?? '')) ?: trim((string)($input['source_stage_key'] ?? ''))) : null,
                    $disp === 'MINOR' ? (trim((string)($sp['return_stage_name'] ?? '')) ?: trim((string)($input['source_stage_name'] ?? ''))) : null,
                    '[]',
                    self::BIN_NAME,
                    json_encode($history, JSON_UNESCAPED_UNICODE),
                    $operator,
                    trim((string)($input['remarks'] ?? '')),
                    $user['id'] ?? null,
                ]);
                $created[] = (int)$db->lastInsertId();
            }

            if (!$created) {
                throw new InvalidArgumentException('Rejection split quantities must be greater than zero.');
            }

            AuditService::log('REJECTION_LOTS_CREATED', 'PRODUCTION', $batchNo, null, ['lots' => $created]);
            $db->commit();
        } catch (Exception $e) {
            if ($db->inTransaction()) $db->rollBack();
            Response::error($e->getMessage(), null, 400);
        }

        $ph = implode(',', array_fill(0, count($created), '?'));
        $stmt = $db->prepare("SELECT rl.*, NULL AS warehouse_name FROM rejection_lots rl WHERE rl.id IN ({$ph}) ORDER BY rl.id");
        $stmt->execute($created);
        Response::success(array_map([self::class, 'decodeLot'], $stmt->fetchAll()), count($created) . ' rejection lot(s) created.');
    }

    private static function fetchLotForUpdate(PDO $db, int $id): array {
        $stmt = $db->prepare("SELECT * FROM rejection_lots WHERE id = ? FOR UPDATE");
        $stmt->execute([$id]);
        $lot = $stmt->fetch();
        if (!$lot) throw new RuntimeException('Rejection lot not found.');
        return $lot;
    }

    /** Resolve (or create) the scrap material used for furnace-bound rejected castings. */
    private static function furnaceScrapMaterial(PDO $db): array {
        $row = $db->query("SELECT * FROM scrap_materials WHERE scrap_code = 'SCRAP-BRASS-REJ' LIMIT 1")->fetch();
        if (!$row) $row = $db->query("SELECT * FROM scrap_materials WHERE active = 1 ORDER BY id ASC LIMIT 1")->fetch();
        if ($row) return $row;

        $kg = $db->query("SELECT id FROM units WHERE UPPER(unit_code) = 'KG' LIMIT 1")->fetchColumn();
        if (!$kg) $kg = $db->query("SELECT id FROM units ORDER BY id LIMIT 1")->fetchColumn();
        $db->prepare("
            INSERT INTO scrap_materials (scrap_code, scrap_name, unit_id, standard_rate, description, active)
            VALUES ('SCRAP-BRASS-REJ', 'Brass Rejected Castings (Solid)', ?, 0, 'Rejected castings sent to furnace for remelting', 1)
        ")->execute([(int)$kg]);
        $id = (int)$db->lastInsertId();
        return $db->query("SELECT * FROM scrap_materials WHERE id = {$id}")->fetch();
    }

    /**
     * Repaired pieces are OK: credit them to stock right away (same quantity) and count them as
     * Ready in the batch's SKU-tracking sheet. FG batch -> Finished Good stock; in-house child-part
     * batch -> Child Part stock. Godown: the one chosen, else the plan's godown, else the first.
     */
    private static function addRepairedToStock(PDO $db, array $lot, float $qty, int $warehouseId, string $by, ?int $userId): array {
        $plan = null;
        try {
            $st = $db->prepare("SELECT pr.id AS release_id, pr.stage_tracking, pp.warehouse_id, pp.fg_id, COALESCE(pp.item_type, 'FG') AS item_type, pp.rm_id
                                FROM planning_releases pr JOIN production_planning pp ON pp.id = pr.planning_id
                                WHERE pr.id = ? OR pr.release_number = ? LIMIT 1");
            $st->execute([(int)($lot['release_id'] ?? 0), $lot['batch_no']]);
            $plan = $st->fetch();
        } catch (Exception $e) {
            $st = $db->prepare("SELECT pr.id AS release_id, pr.stage_tracking, pp.warehouse_id, pp.fg_id, 'FG' AS item_type, NULL AS rm_id
                                FROM planning_releases pr JOIN production_planning pp ON pp.id = pr.planning_id
                                WHERE pr.id = ? OR pr.release_number = ? LIMIT 1");
            $st->execute([(int)($lot['release_id'] ?? 0), $lot['batch_no']]);
            $plan = $st->fetch();
        }
        $isRM = $plan && $plan['item_type'] === 'RM' && !empty($plan['rm_id']);
        if ($isRM) {
            $it = $db->prepare("SELECT id, rm_code AS code, material_name AS name, unit_id, standard_rate AS rate FROM raw_materials WHERE id = ?");
            $it->execute([(int)$plan['rm_id']]);
        } else {
            $fgId = (int)($lot['fg_id'] ?: ($plan['fg_id'] ?? 0));
            $it = $db->prepare("SELECT id, fg_code AS code, product_name AS name, unit_id, selling_price AS rate FROM finished_goods WHERE id = ?");
            $it->execute([$fgId]);
        }
        $item = $it->fetch();
        if (!$item) throw new RuntimeException('Could not find the product of this batch to add the repaired pieces to stock.');

        $wh = InventoryService::getValidWarehouseId($warehouseId ?: (int)($plan['warehouse_id'] ?? 0));
        InventoryService::increaseStock(
            $isRM ? 'RM' : 'FG', (int)$item['id'], $item['code'], $item['name'], $wh, $qty, (int)($item['unit_id'] ?: 3),
            (float)($item['rate'] ?? 0), 'PRODUCTION_OUTPUT', $lot['lot_number'], $lot['batch_no'], $lot['lot_number'], date('Y-m-d'),
            "Repaired rejection {$lot['lot_number']}: {$qty} pcs OK (rejected at {$lot['source_stage_name']}). By {$by}", $userId
        );

        // SKU tracking sheet: count the repaired pieces as Ready
        if ($plan && !empty($plan['stage_tracking'])) {
            $tracking = json_decode($plan['stage_tracking'], true);
            if (is_array($tracking)) {
                $tracking['ready'] = $tracking['ready'] ?? ['date_form' => '', 'stock_qty' => 0, 'total_rejection' => 0, 'status' => 'In Production'];
                $tracking['ready']['stock_qty'] = (float)($tracking['ready']['stock_qty'] ?? 0) + $qty;
                $tracking['ready']['repaired_qty'] = (float)($tracking['ready']['repaired_qty'] ?? 0) + $qty;
                $tracking['updated_at'] = date('Y-m-d H:i:s');
                $db->prepare("UPDATE planning_releases SET stage_tracking = ? WHERE id = ?")
                   ->execute([json_encode($tracking, JSON_UNESCAPED_UNICODE), $plan['release_id']]);
            }
        }
        $cur = $db->prepare("SELECT COALESCE(SUM(quantity), 0) FROM stock WHERE material_type = ? AND material_id = ?");
        $cur->execute([$isRM ? 'RM' : 'FG', $item['id']]);
        return ['label' => ($isRM ? 'Child Part ' : 'Finished Good ') . $item['name'], 'warehouse_id' => $wh, 'new_stock' => (float)$cur->fetchColumn()];
    }

    /** Return reworked pieces to a production stage of the batch in SKU tracking. */
    private static function returnToStage(PDO $db, array $lot, string $by): ?string {
        $stageKey = trim((string)($lot['return_stage_key'] ?? ''));
        if ($stageKey === '') return null;
        try {
            $stmt = $db->prepare("SELECT id, stage_tracking FROM planning_releases WHERE id = ? OR release_number = ? LIMIT 1");
            $stmt->execute([(int)($lot['release_id'] ?? 0), $lot['batch_no']]);
            $rel = $stmt->fetch();
            if (!$rel) return null;

            $tracking = json_decode($rel['stage_tracking'] ?? '', true);
            if (!is_array($tracking) || !isset($tracking['stages']) || !is_array($tracking['stages'])) return null;

            $qty = (float)$lot['quantity'];
            $stg = $tracking['stages'][$stageKey] ?? ['prod_qty' => 0, 'rejection' => 0, 'bal' => 0, 'date' => ''];
            $stg['prod_qty'] = (float)($stg['prod_qty'] ?? 0) + $qty;
            $stg['bal'] = (float)($stg['bal'] ?? 0) + $qty;
            $stg['rework_in'] = (float)($stg['rework_in'] ?? 0) + $qty;
            $stg['date'] = $stg['date'] ?? date('d/m/Y');
            $tracking['stages'][$stageKey] = $stg;

            // Bring a completed batch back into production when reworked pieces return
            if (isset($tracking['ready']) && is_array($tracking['ready']) && ($tracking['ready']['status'] ?? '') !== 'In Production') {
                $tracking['ready']['status'] = 'In Production';
            }
            $tracking['updated_at'] = date('Y-m-d H:i:s');
            $tracking['last_rework_return'] = ['lot' => $lot['lot_number'], 'qty' => $qty, 'stage' => $stageKey, 'by' => $by];

            $db->prepare("UPDATE planning_releases SET stage_tracking = ? WHERE id = ?")
               ->execute([json_encode($tracking, JSON_UNESCAPED_UNICODE), $rel['id']]);
            return $lot['return_stage_name'] ?: $stageKey;
        } catch (Exception $e) {
            error_log('Rework return failed: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * POST /rejections/lots/advance {id, remarks, operator, warehouse_id, scrap_weight_kg}
     * Moves the lot to its next route step; on the last step it completes the lot.
     */
    public static function advanceLot(): void {
        $user = Auth::requireAuth();
        $db = Database::getConnection();
        self::ensureTables($db);
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $id = (int)($input['id'] ?? 0);
        if (!$id) Response::error('Lot id is required.', null, 400);

        $by = trim((string)($input['operator'] ?? '')) ?: ($user['full_name'] ?? 'Supervisor');
        $remarks = trim((string)($input['remarks'] ?? ''));
        $message = '';

        $db->beginTransaction();
        try {
            $lot = self::fetchLotForUpdate($db, $id);
            if ($lot['status'] !== 'OPEN') throw new RuntimeException("Lot {$lot['lot_number']} is already {$lot['status']}.");

            $steps = json_decode($lot['steps_json'], true) ?: [];
            if ($lot['disposition'] === 'PENDING' && (int)$lot['current_step'] >= count($steps) - 1) {
                throw new InvalidArgumentException('This lot is at the decision step. Decide how many pieces go to Furnace and how many to Rework.');
            }
            $history = json_decode($lot['history_json'] ?? '[]', true) ?: [];
            $cur = (int)$lot['current_step'];
            $now = date('Y-m-d H:i:s');

            if ($lot['disposition'] === 'FURNACE' && isset($input['scrap_weight_kg']) && (float)$input['scrap_weight_kg'] > 0) {
                $lot['scrap_weight_kg'] = round((float)$input['scrap_weight_kg'], 3);
                $db->prepare("UPDATE rejection_lots SET scrap_weight_kg = ? WHERE id = ?")->execute([$lot['scrap_weight_kg'], $id]);
            }

            if ($cur < count($steps) - 1) {
                $next = $cur + 1;
                $history[] = ['step_index' => $next, 'step_name' => $steps[$next]['name'], 'action' => 'MOVED', 'at' => $now, 'by' => $by, 'remarks' => $remarks];
                $db->prepare("UPDATE rejection_lots SET current_step = ?, history_json = ? WHERE id = ?")
                   ->execute([$next, json_encode($history, JSON_UNESCAPED_UNICODE), $id]);
                $message = "Lot {$lot['lot_number']} moved to: {$steps[$next]['name']}";
            } else {
                // Completion
                $warehouseId = null;
                if ($lot['disposition'] === 'FURNACE') {
                    $kg = (float)$lot['scrap_weight_kg'];
                    if ($kg <= 0) throw new InvalidArgumentException('Enter the scrap weight (kg) before completing a furnace lot.');
                    $warehouseId = InventoryService::getValidWarehouseId((int)($input['warehouse_id'] ?? 0));
                    $scrap = self::furnaceScrapMaterial($db);
                    InventoryService::increaseStock(
                        'SCRAP',
                        (int)$scrap['id'],
                        $scrap['scrap_code'],
                        $scrap['scrap_name'],
                        $warehouseId,
                        $kg,
                        (int)$scrap['unit_id'],
                        (float)($scrap['standard_rate'] ?? 0),
                        'SCRAP_GENERATED',
                        $lot['lot_number'],
                        $lot['batch_no'],
                        $lot['lot_number'],
                        date('Y-m-d'),
                        "Furnace rejection {$lot['quantity']} pcs of {$lot['item_name']} (Batch {$lot['batch_no']}, {$lot['source_stage_name']})",
                        $user['id'] ?? null
                    );
                    $message = "Lot {$lot['lot_number']} completed: {$kg} kg booked to furnace scrap stock.";
                } else {
                    $stageName = self::returnToStage($db, $lot, $by);
                    $message = $stageName
                        ? "Lot {$lot['lot_number']} completed: {$lot['quantity']} pcs returned to {$stageName}."
                        : "Lot {$lot['lot_number']} completed (rework done).";
                }
                $history[] = ['step_index' => $cur, 'step_name' => $steps[$cur]['name'] ?? 'Final', 'action' => 'COMPLETED', 'at' => $now, 'by' => $by, 'remarks' => $remarks];
                $db->prepare("UPDATE rejection_lots SET status = 'COMPLETED', completed_at = NOW(), warehouse_id = ?, history_json = ? WHERE id = ?")
                   ->execute([$warehouseId, json_encode($history, JSON_UNESCAPED_UNICODE), $id]);
            }

            $db->commit();
        } catch (Exception $e) {
            if ($db->inTransaction()) $db->rollBack();
            Response::error($e->getMessage(), null, 400);
        }

        $stmt = $db->prepare("SELECT rl.*, w.warehouse_name FROM rejection_lots rl LEFT JOIN warehouses w ON w.id = rl.warehouse_id WHERE rl.id = ?");
        $stmt->execute([$id]);
        Response::success(self::decodeLot($stmt->fetch()), $message);
    }

    /**
     * POST /rejections/lots/decide {id, minor_qty, furnace_qty, return_stage_key, return_stage_name, remarks, operator}
     * End of the common rejection pipeline: split the lot into a Rework lot and/or a Furnace lot,
     * each continuing on its own route.
     */
    public static function decideLot(): void {
        $user = Auth::requireAuth();
        $db = Database::getConnection();
        self::ensureTables($db);
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $id = (int)($input['id'] ?? 0);
        $minor = round((float)($input['minor_qty'] ?? 0), 3);
        $furnace = round((float)($input['furnace_qty'] ?? 0), 3);
        $furnaceKg = isset($input['furnace_weight_kg']) && (float)$input['furnace_weight_kg'] > 0 ? round((float)$input['furnace_weight_kg'], 3) : null;
        if (!$id) Response::error('Lot id is required.', null, 400);
        if ($minor < 0 || $furnace < 0) Response::error('Quantities cannot be negative.', null, 400);

        $by = trim((string)($input['operator'] ?? '')) ?: ($user['full_name'] ?? 'Supervisor');
        $remarks = trim((string)($input['remarks'] ?? ''));
        $created = [];

        $db->beginTransaction();
        try {
            $lot = self::fetchLotForUpdate($db, $id);
            if ($lot['disposition'] !== 'PENDING') throw new RuntimeException("Lot {$lot['lot_number']} is already decided.");
            if ($lot['status'] !== 'OPEN') throw new RuntimeException("Lot {$lot['lot_number']} is {$lot['status']}.");
            $qty = round((float)$lot['quantity'], 3);
            if (abs(($minor + $furnace) - $qty) > 0.0005) {
                throw new InvalidArgumentException("Rework ({$minor}) + Furnace ({$furnace}) must equal the lot quantity ({$qty}).");
            }

            $now = date('Y-m-d H:i:s');
            $returnKey = trim((string)($input['return_stage_key'] ?? '')) ?: $lot['source_stage_key'];
            $returnName = trim((string)($input['return_stage_name'] ?? '')) ?: $lot['source_stage_name'];

            foreach ([['MINOR', $minor], ['FURNACE', $furnace]] as [$disp, $q]) {
                if ($q <= 0) continue;
                $steps = self::loadRoute($db, $disp)['steps'];
                if (!$steps) throw new RuntimeException("Rejection route {$disp} has no steps.");
                $childNo = 'RJ-' . date('ymd') . '-' . strtoupper(bin2hex(random_bytes(3)));
                $history = [[
                    'step_index' => 0, 'step_name' => $steps[0]['name'], 'action' => 'CREATED',
                    'at' => $now, 'by' => $by, 'remarks' => "From pipeline lot {$lot['lot_number']}" . ($remarks ? " - {$remarks}" : ''),
                ]];
                $db->prepare("
                    INSERT INTO rejection_lots (
                        lot_number, parent_lot_number, release_id, batch_no, fg_id, item_name, source_stage_key, source_stage_name,
                        defect_reason, disposition, quantity, avg_weight, scrap_weight_kg,
                        return_stage_key, return_stage_name, steps_json, current_step, history_json, status,
                        operator, remarks, created_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'OPEN', ?, ?, ?)
                ")->execute([
                    $childNo, $lot['lot_number'], $lot['release_id'], $lot['batch_no'], $lot['fg_id'], $lot['item_name'],
                    $lot['source_stage_key'], $lot['source_stage_name'], $lot['defect_reason'], $disp, $q, $lot['avg_weight'],
                    $disp === 'FURNACE' ? ($furnaceKg ?? round($q * (float)$lot['avg_weight'], 3)) : 0,
                    $disp === 'MINOR' ? $returnKey : null, $disp === 'MINOR' ? $returnName : null,
                    json_encode($steps, JSON_UNESCAPED_UNICODE), json_encode($history, JSON_UNESCAPED_UNICODE),
                    $by, $remarks, $user['id'] ?? null,
                ]);
                $created[] = ['disposition' => $disp, 'lot_number' => $childNo, 'quantity' => $q];
            }

            $history = json_decode($lot['history_json'] ?? '[]', true) ?: [];
            $steps = json_decode($lot['steps_json'], true) ?: [];
            $cur = (int)$lot['current_step'];
            $history[] = [
                'step_index' => $cur, 'step_name' => $steps[$cur]['name'] ?? 'Decision', 'action' => 'DECIDED',
                'at' => $now, 'by' => $by, 'remarks' => $remarks, 'minor_qty' => $minor, 'furnace_qty' => $furnace,
                'children' => array_column($created, 'lot_number'), 'return_stage_name' => $minor > 0 ? $returnName : null,
            ];
            $db->prepare("UPDATE rejection_lots SET status = 'COMPLETED', completed_at = NOW(), history_json = ? WHERE id = ?")
               ->execute([json_encode($history, JSON_UNESCAPED_UNICODE), $id]);

            AuditService::log('REJECTION_DECIDED', 'PRODUCTION', $lot['lot_number'], null, ['minor' => $minor, 'furnace' => $furnace]);
            $db->commit();
        } catch (Exception $e) {
            if ($db->inTransaction()) $db->rollBack();
            Response::error($e->getMessage(), null, 400);
        }

        $parts = [];
        if ($minor > 0) $parts[] = "{$minor} pcs to Rework";
        if ($furnace > 0) $parts[] = "{$furnace} pcs to Furnace";
        Response::success(['children' => $created], 'Decision saved: ' . implode(' + ', $parts) . '.');
    }

    /**
     * POST /rejections/lots/move
     * {id, quantity, action: STAGE|RETURN|STOCK|FURNACE|BIN, stage_key, stage_name, scrap_weight_kg, warehouse_id, remarks, operator}
     * STOCK = repaired pieces are OK: added straight to Ready stock (FG, or Child Part for in-house child-part plans).
     * Free tracking: send any part of an open lot anywhere. Part quantities split into a child lot.
     */
    public static function moveLot(): void {
        $user = Auth::requireAuth();
        $db = Database::getConnection();
        self::ensureTables($db);
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $id = (int)($input['id'] ?? 0);
        $action = strtoupper(trim((string)($input['action'] ?? '')));
        $qty = round((float)($input['quantity'] ?? 0), 3);
        $stageKey = trim((string)($input['stage_key'] ?? ''));
        $stageName = trim((string)($input['stage_name'] ?? '')) ?: $stageKey;
        $by = trim((string)($input['operator'] ?? '')) ?: ($user['full_name'] ?? 'Supervisor');
        $remarks = trim((string)($input['remarks'] ?? ''));

        if (!$id) Response::error('Lot id is required.', null, 400);
        if (!in_array($action, ['STAGE', 'RETURN', 'STOCK', 'FURNACE', 'BIN'], true)) Response::error('Choose where to send the pieces.', null, 400);
        if (in_array($action, ['STAGE', 'RETURN'], true) && $stageKey === '') Response::error('Choose the production stage.', null, 400);
        if ($qty <= 0) Response::error('Quantity must be greater than zero.', null, 400);

        $message = '';
        $movedId = $id;
        $db->beginTransaction();
        try {
            $lot = self::fetchLotForUpdate($db, $id);
            if ($lot['status'] !== 'OPEN') throw new RuntimeException("Lot {$lot['lot_number']} is already {$lot['status']}.");
            $lotQty = round((float)$lot['quantity'], 3);
            if ($qty - $lotQty > 0.0005) throw new InvalidArgumentException("Only {$lotQty} pcs are in this lot.");

            $current = self::decodeLot($lot);
            $fromName = $current['location_name'] ?: self::BIN_NAME;
            $now = date('Y-m-d H:i:s');
            $history = json_decode($lot['history_json'] ?? '[]', true) ?: [];

            // Part quantity: split the moved pieces into a child lot, the rest stay where they are
            if ($lotQty - $qty > 0.0005) {
                $childNo = 'RJ-' . date('ymd') . '-' . strtoupper(bin2hex(random_bytes(3)));
                $remaining = round($lotQty - $qty, 3);
                $childHistory = $history;
                $childHistory[] = ['action' => 'SPLIT', 'step_name' => $fromName, 'from' => $fromName, 'to' => $fromName, 'qty' => $qty,
                                   'at' => $now, 'by' => $by, 'remarks' => "Split {$qty} of {$lotQty} pcs from lot {$lot['lot_number']}"];
                $db->prepare("
                    INSERT INTO rejection_lots (
                        lot_number, parent_lot_number, release_id, batch_no, fg_id, item_name, source_stage_key, source_stage_name,
                        defect_reason, disposition, quantity, avg_weight, scrap_weight_kg, return_stage_key, return_stage_name,
                        steps_json, current_step, location_type, location_key, location_name, history_json, status, operator, remarks, created_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, '[]', 0, ?, ?, ?, ?, 'OPEN', ?, ?, ?)
                ")->execute([
                    $childNo, $lot['lot_number'], $lot['release_id'], $lot['batch_no'], $lot['fg_id'], $lot['item_name'],
                    $lot['source_stage_key'], $lot['source_stage_name'], $lot['defect_reason'], $lot['disposition'], $qty, $lot['avg_weight'],
                    $lot['return_stage_key'], $lot['return_stage_name'],
                    $current['location_type'], $current['location_key'] ?? null, $fromName,
                    json_encode($childHistory, JSON_UNESCAPED_UNICODE), $by, $lot['remarks'], $user['id'] ?? null,
                ]);
                $movedId = (int)$db->lastInsertId();
                $history[] = ['action' => 'SPLIT_OUT', 'step_name' => $fromName, 'from' => $fromName, 'to' => $fromName, 'qty' => $qty,
                              'at' => $now, 'by' => $by, 'remarks' => "{$qty} pcs moved out as lot {$childNo}; {$remaining} pcs remain here", 'child' => $childNo];
                $db->prepare("UPDATE rejection_lots SET quantity = ?, history_json = ? WHERE id = ?")
                   ->execute([$remaining, json_encode($history, JSON_UNESCAPED_UNICODE), $id]);
                $lot = self::fetchLotForUpdate($db, $movedId);
                $history = json_decode($lot['history_json'] ?? '[]', true) ?: [];
            }

            $entry = ['action' => $action, 'from' => $fromName, 'qty' => $qty, 'at' => $now, 'by' => $by, 'remarks' => $remarks];

            if ($action === 'STAGE') {
                $entry['to'] = $stageName; $entry['step_name'] = $stageName; $entry['stage_key'] = $stageKey;
                $history[] = $entry;
                $db->prepare("UPDATE rejection_lots SET disposition = 'MINOR', location_type = 'STAGE', location_key = ?, location_name = ?,
                              return_stage_key = ?, return_stage_name = ?, history_json = ? WHERE id = ?")
                   ->execute([$stageKey, $stageName, $stageKey, $stageName, json_encode($history, JSON_UNESCAPED_UNICODE), $movedId]);
                $message = "{$qty} pcs sent to {$stageName} for work.";
            } elseif ($action === 'BIN') {
                $entry['to'] = self::BIN_NAME; $entry['step_name'] = self::BIN_NAME;
                $history[] = $entry;
                $db->prepare("UPDATE rejection_lots SET location_type = 'BIN', location_key = NULL, location_name = ?, history_json = ? WHERE id = ?")
                   ->execute([self::BIN_NAME, json_encode($history, JSON_UNESCAPED_UNICODE), $movedId]);
                $message = "{$qty} pcs moved back to the Rejection Bin.";
            } elseif ($action === 'RETURN') {
                $lot['return_stage_key'] = $stageKey;
                $lot['return_stage_name'] = $stageName;
                $lot['quantity'] = $qty;
                $joined = self::returnToStage($db, $lot, $by);
                $entry['to'] = $stageName; $entry['step_name'] = $stageName; $entry['stage_key'] = $stageKey;
                $history[] = $entry;
                $db->prepare("UPDATE rejection_lots SET disposition = 'MINOR', status = 'COMPLETED', completed_at = NOW(), location_type = 'RETURNED',
                              location_key = ?, location_name = ?, return_stage_key = ?, return_stage_name = ?, history_json = ? WHERE id = ?")
                   ->execute([$stageKey, $stageName, $stageKey, $stageName, json_encode($history, JSON_UNESCAPED_UNICODE), $movedId]);
                $message = $joined ? "{$qty} pcs returned to production at {$stageName}." : "{$qty} pcs marked as returned to {$stageName}.";
            } elseif ($action === 'STOCK') {
                $res = self::addRepairedToStock($db, $lot, $qty, (int)($input['warehouse_id'] ?? 0), $by, $user['id'] ?? null);
                $entry['to'] = 'Ready stock'; $entry['step_name'] = 'Ready stock'; $entry['stock'] = $res['label'];
                $history[] = $entry;
                $db->prepare("UPDATE rejection_lots SET disposition = 'MINOR', status = 'COMPLETED', completed_at = NOW(), warehouse_id = ?,
                              location_type = 'STOCK', location_key = 'ready', location_name = 'Ready stock', history_json = ? WHERE id = ?")
                   ->execute([$res['warehouse_id'], json_encode($history, JSON_UNESCAPED_UNICODE), $movedId]);
                $message = "{$qty} repaired pcs added to {$res['label']} stock (now {$res['new_stock']}).";
            } else { // FURNACE
                $kg = isset($input['scrap_weight_kg']) && (float)$input['scrap_weight_kg'] > 0
                    ? round((float)$input['scrap_weight_kg'], 3)
                    : round($qty * (float)$lot['avg_weight'], 3);
                if ($kg <= 0) throw new InvalidArgumentException('Enter the scrap weight (kg).');
                $warehouseId = InventoryService::getValidWarehouseId((int)($input['warehouse_id'] ?? 0));
                $scrap = self::furnaceScrapMaterial($db);
                InventoryService::increaseStock(
                    'SCRAP', (int)$scrap['id'], $scrap['scrap_code'], $scrap['scrap_name'], $warehouseId, $kg, (int)$scrap['unit_id'],
                    (float)($scrap['standard_rate'] ?? 0), 'SCRAP_GENERATED', $lot['lot_number'], $lot['batch_no'], $lot['lot_number'], date('Y-m-d'),
                    "Furnace rejection {$qty} pcs of {$lot['item_name']} (Batch {$lot['batch_no']}, rejected at {$lot['source_stage_name']})",
                    $user['id'] ?? null
                );
                $entry['to'] = 'Furnace'; $entry['step_name'] = 'Furnace'; $entry['scrap_weight_kg'] = $kg;
                $history[] = $entry;
                $db->prepare("UPDATE rejection_lots SET disposition = 'FURNACE', status = 'COMPLETED', completed_at = NOW(), scrap_weight_kg = ?,
                              warehouse_id = ?, location_type = 'FURNACE', location_key = NULL, location_name = 'Furnace', history_json = ? WHERE id = ?")
                   ->execute([$kg, $warehouseId, json_encode($history, JSON_UNESCAPED_UNICODE), $movedId]);
                $message = "{$qty} pcs sent to furnace: {$kg} kg booked to scrap stock.";
            }

            AuditService::log('REJECTION_MOVED', 'PRODUCTION', $lot['lot_number'], null, ['action' => $action, 'qty' => $qty, 'to' => $entry['to'] ?? null]);
            $db->commit();
        } catch (Exception $e) {
            if ($db->inTransaction()) $db->rollBack();
            Response::error($e->getMessage(), null, 400);
        }

        $stmt = $db->prepare("SELECT rl.*, w.warehouse_name FROM rejection_lots rl LEFT JOIN warehouses w ON w.id = rl.warehouse_id WHERE rl.id = ?");
        $stmt->execute([$movedId]);
        Response::success(self::decodeLot($stmt->fetch()), $message);
    }

    /** POST /rejections/lots/cancel {id, remarks} */
    public static function cancelLot(): void {
        $user = Auth::requireAuth();
        $db = Database::getConnection();
        self::ensureTables($db);
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $id = (int)($input['id'] ?? 0);
        if (!$id) Response::error('Lot id is required.', null, 400);

        $db->beginTransaction();
        try {
            $lot = self::fetchLotForUpdate($db, $id);
            if ($lot['status'] !== 'OPEN') throw new RuntimeException("Lot {$lot['lot_number']} is already {$lot['status']}.");
            $history = json_decode($lot['history_json'] ?? '[]', true) ?: [];
            $history[] = ['step_index' => (int)$lot['current_step'], 'step_name' => null, 'action' => 'CANCELLED', 'at' => date('Y-m-d H:i:s'), 'by' => $user['full_name'] ?? 'User', 'remarks' => trim((string)($input['remarks'] ?? ''))];
            $db->prepare("UPDATE rejection_lots SET status = 'CANCELLED', history_json = ? WHERE id = ?")
               ->execute([json_encode($history, JSON_UNESCAPED_UNICODE), $id]);
            $db->commit();
        } catch (Exception $e) {
            if ($db->inTransaction()) $db->rollBack();
            Response::error($e->getMessage(), null, 400);
        }
        Response::success(['id' => $id], 'Rejection lot cancelled.');
    }
}
