<?php
// ============================================================
// BHARAT IMPEX — REJECTION TRACKING & REJECTION PROCESS ROUTES
// ============================================================
//
// A rejected quantity found at any SKU-tracking stage is split by disposition:
//   MINOR   = minor defect, reworked and returned to a production stage
//   FURNACE = unrecoverable, weighed as scrap and melted in the furnace
// Each split becomes a "rejection lot" that walks through the steps of its
// rejection process route (drawn on the Rejection Process map). Completing a
// FURNACE lot books the scrap weight into SCRAP stock; completing a MINOR lot
// returns the pieces to the chosen production stage of the batch.

class RejectionController {

    // Lot dispositions: PENDING = in the common rejection pipeline, decision not made yet
    public const DISPOSITIONS = ['PENDING', 'MINOR', 'FURNACE'];
    // Routes: COMMON = pipeline every rejection goes through first, ending in the decision
    public const ROUTE_TYPES = ['COMMON', 'MINOR', 'FURNACE'];

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
        if (!empty($_GET['from_date'])) { $sql .= " AND DATE(rl.created_at) >= ?"; $params[] = $_GET['from_date']; }
        if (!empty($_GET['to_date'])) { $sql .= " AND DATE(rl.created_at) <= ?"; $params[] = $_GET['to_date']; }
        $search = trim($_GET['search'] ?? '');
        if ($search !== '') {
            $sql .= " AND (rl.batch_no LIKE ? OR rl.item_name LIKE ? OR rl.lot_number LIKE ? OR rl.defect_reason LIKE ?)";
            array_push($params, "%{$search}%", "%{$search}%", "%{$search}%", "%{$search}%");
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
                $routeType = self::routeFor($disp);
                $routes[$routeType] = $routes[$routeType] ?? self::loadRoute($db, $routeType);
                $steps = $routes[$routeType]['steps'];
                if (!$steps) throw new RuntimeException("Rejection route {$disp} has no steps.");

                $lotNumber = 'RJ-' . date('ymd') . '-' . strtoupper(bin2hex(random_bytes(3)));
                $history = [[
                    'step_index' => 0,
                    'step_name'  => $steps[0]['name'],
                    'action'     => 'CREATED',
                    'at'         => $now,
                    'by'         => $operator,
                    'remarks'    => trim((string)($input['remarks'] ?? '')),
                ]];

                $db->prepare("
                    INSERT INTO rejection_lots (
                        lot_number, release_id, batch_no, fg_id, item_name, source_stage_key, source_stage_name,
                        defect_reason, disposition, quantity, avg_weight, scrap_weight_kg,
                        return_stage_key, return_stage_name, steps_json, current_step, history_json, status,
                        operator, remarks, created_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'OPEN', ?, ?, ?)
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
                    json_encode($steps, JSON_UNESCAPED_UNICODE),
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
