<?php
// ============================================================
// BHARAT IMPEX — BOM CONTROLLER
// ============================================================

class BOMController {

    private static function ensureSchema(PDO $db): void {
        BOMService::ensureSchema($db);
    }

    public static function index(): void {
        Auth::requireAuth();
        $db = Database::getConnection();
        self::ensureSchema($db);

        $fgId = $_GET['fg_id'] ?? null;
        $sql = "
            SELECT bh.*, fg.product_name, fg.fg_code, u.unit_code,
                   (SELECT COUNT(*) FROM bom_items bi WHERE bi.bom_id = bh.id) as item_count
            FROM bom_headers bh
            JOIN finished_goods fg ON bh.fg_id = fg.id
            JOIN units u ON fg.unit_id = u.id
            WHERE 1=1
        ";

        $params = [];
        if ($fgId) {
            $sql .= " AND bh.fg_id = ?";
            $params[] = $fgId;
        }

        $sql .= " ORDER BY bh.fg_id ASC, bh.id DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $boms = $stmt->fetchAll();

        Response::success($boms);
    }

    public static function show(): void {
        Auth::requireAuth();
        $id = (int)($_GET['id'] ?? 0);

        if (!$id) {
            Response::error('BOM ID is required.', null, 400);
        }

        $db = Database::getConnection();
        $stmt = $db->prepare("
            SELECT bh.*, fg.product_name, fg.fg_code, u.unit_code
            FROM bom_headers bh
            JOIN finished_goods fg ON bh.fg_id = fg.id
            JOIN units u ON fg.unit_id = u.id
            WHERE bh.id = ?
        ");
        $stmt->execute([$id]);
        $bom = $stmt->fetch();

        if (!$bom) {
            Response::error('BOM not found.', null, 404);
        }

        $itemsStmt = $db->prepare("
            SELECT bi.*, rm.rm_code, rm.material_name, u.unit_code, rm.standard_rate
            FROM bom_items bi
            JOIN raw_materials rm ON bi.rm_id = rm.id
            JOIN units u ON bi.unit_id = u.id
            WHERE bi.bom_id = ?
            ORDER BY bi.sequence ASC
        ");
        $itemsStmt->execute([$id]);
        $bom['items'] = $itemsStmt->fetchAll();

        Response::success($bom);
    }

    public static function create(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $fgId = (int)($input['fg_id'] ?? 0);
        $bomName = trim($input['bom_name'] ?? '');
        $version = trim($input['version'] ?? 'V1');
        $remarks = trim($input['remarks'] ?? '');
        $items = $input['items'] ?? [];

        if (!$fgId || empty($bomName) || empty($items)) {
            Response::error('Finished Good, BOM Name, and at least one item are required.', null, 400);
        }

        $db = Database::getConnection();
        $db->beginTransaction();

        try {
            $bomCode = "BOM-FG" . str_pad($fgId, 3, '0', STR_PAD_LEFT) . "-" . strtoupper($version);

            // Deactivate any existing active BOM for this product if setting active
            $db->prepare("UPDATE bom_headers SET status = 'SUPERSEDED', is_active = 0 WHERE fg_id = ?")->execute([$fgId]);

            $stmt = $db->prepare("
                INSERT INTO bom_headers (fg_id, bom_code, bom_name, version, is_active, status, effective_from, remarks, created_by, created_at)
                VALUES (?, ?, ?, ?, 1, 'ACTIVE', CURDATE(), ?, ?, NOW())
            ");
            $stmt->execute([$fgId, $bomCode, $bomName, $version, $remarks, $user['id']]);
            $bomId = (int)$db->lastInsertId();

            $itemStmt = $db->prepare("
                INSERT INTO bom_items (bom_id, rm_id, quantity_per_unit, unit_id, wastage_percentage, scrap_factor, sequence, mandatory, remarks)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");

            foreach ($items as $idx => $item) {
                $itemStmt->execute([
                    $bomId,
                    $item['rm_id'],
                    $item['quantity_per_unit'],
                    $item['unit_id'],
                    $item['wastage_percentage'] ?? 0.00,
                    $item['scrap_factor'] ?? 0.00,
                    $item['sequence'] ?? ($idx + 1),
                    isset($item['mandatory']) ? (int)$item['mandatory'] : 1,
                    $item['remarks'] ?? null
                ]);
            }

            AuditService::log('BOM_CREATED', 'BOM', $bomCode, null, ['bom_id' => $bomId, 'fg_id' => $fgId]);

            $db->commit();
            Response::success(['bom_id' => $bomId, 'bom_code' => $bomCode], 'BOM created successfully.');
        } catch (Exception $e) {
            $db->rollBack();
            Response::error($e->getMessage(), null, 400);
        }
    }

    public static function createVersion(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $sourceBomId = (int)($input['source_bom_id'] ?? 0);
        $newVersion = trim($input['version'] ?? 'V2');
        $remarks = trim($input['remarks'] ?? '');
        $items = $input['items'] ?? [];

        if (!$sourceBomId || empty($newVersion) || empty($items)) {
            Response::error('Source BOM, new version tag, and items are required.', null, 400);
        }

        try {
            $newBomId = BOMService::createNewVersion($sourceBomId, $items, $newVersion, $remarks, $user['id']);
            Response::success(['bom_id' => $newBomId], "New BOM version {$newVersion} created successfully.");
        } catch (Exception $e) {
            Response::error($e->getMessage(), null, 400);
        }
    }

    /**
     * Update an existing BOM Recipe items
     */
    public static function update(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $id = (int)($input['id'] ?? 0);
        $bomName = trim($input['bom_name'] ?? '');
        $remarks = trim($input['remarks'] ?? '');
        $items = $input['items'] ?? [];

        if (!$id || empty($items)) {
            Response::error('BOM ID and at least one constituent item are required.', null, 400);
        }

        $db = Database::getConnection();
        $db->beginTransaction();

        try {
            if (!empty($bomName)) {
                $db->prepare("UPDATE bom_headers SET bom_name = ?, remarks = ?, updated_at = NOW() WHERE id = ?")
                   ->execute([$bomName, $remarks, $id]);
            }

            // Replace existing items
            $db->prepare("DELETE FROM bom_items WHERE bom_id = ?")->execute([$id]);

            $itemStmt = $db->prepare("
                INSERT INTO bom_items (bom_id, rm_id, quantity_per_unit, unit_id, wastage_percentage, scrap_factor, sequence, mandatory, remarks)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");

            foreach ($items as $idx => $item) {
                $itemStmt->execute([
                    $id,
                    $item['rm_id'],
                    $item['quantity_per_unit'],
                    $item['unit_id'] ?? 1,
                    $item['wastage_percentage'] ?? 0.00,
                    $item['scrap_factor'] ?? 0.00,
                    $item['sequence'] ?? ($idx + 1),
                    isset($item['mandatory']) ? (int)$item['mandatory'] : 1,
                    $item['remarks'] ?? null
                ]);
            }

            $db->commit();
            Response::success(['bom_id' => $id], 'BOM recipe updated successfully.');
        } catch (Exception $e) {
            $db->rollBack();
            Response::error('Failed to update BOM: ' . $e->getMessage(), null, 400);
        }
    }

    public static function allItems(): void {
        Auth::requireAuth();
        $db = Database::getConnection();
        self::ensureSchema($db);

        $sql = "
            SELECT 
                bi.id,
                bi.bom_id,
                bh.fg_id,
                fg.product_name as fg_name,
                fg.fg_code,
                bi.rm_id,
                rm.material_name as rm_name,
                rm.rm_code,
                bi.sub_child_part_id,
                scp.sub_part_code,
                scp.sub_part_name,
                scp.brand_name as sub_part_brand,
                bi.unit_id,
                u.unit_code,
                bi.quantity_per_unit as quantity,
                bi.sequence
            FROM bom_items bi
            JOIN bom_headers bh ON bi.bom_id = bh.id
            JOIN finished_goods fg ON bh.fg_id = fg.id
            JOIN raw_materials rm ON bi.rm_id = rm.id
            LEFT JOIN sub_child_parts scp ON bi.sub_child_part_id = scp.id
            JOIN units u ON bi.unit_id = u.id
            WHERE bh.is_active = 1
            ORDER BY fg.product_name ASC, bi.sequence ASC, bi.id ASC
        ";
        $rows = $db->query($sql)->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$r) {
            $r['quantity'] = (float)$r['quantity'];
        }
        Response::success($rows);
    }

    public static function batchSaveGrid(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $rows = $input['rows'] ?? [];

        if (!is_array($rows)) {
            Response::error('Invalid rows data provided.', null, 400);
        }

        $db = Database::getConnection();
        self::ensureSchema($db);
        $db->beginTransaction();

        try {
            // Group rows by fg_id
            $byFg = [];
            foreach ($rows as $r) {
                $fgId = (int)($r['fg_id'] ?? 0);
                $rmId = (int)($r['rm_id'] ?? 0);
                $subPartId = !empty($r['sub_child_part_id']) ? (int)$r['sub_child_part_id'] : null;
                $qty  = (float)($r['quantity'] ?? 0);
                $uId  = (int)($r['unit_id'] ?? 0);

                if (!$fgId || !$rmId || $qty <= 0) continue;

                if (!isset($byFg[$fgId])) {
                    $byFg[$fgId] = [];
                }
                $byFg[$fgId][] = [
                    'rm_id'             => $rmId,
                    'sub_child_part_id' => $subPartId,
                    'unit_id'           => $uId,
                    'quantity'          => $qty,
                ];
            }

            $savedCount = 0;
            foreach ($byFg as $fgId => $items) {
                // Find active BOM for this FG
                $stmt = $db->prepare("SELECT id, bom_code FROM bom_headers WHERE fg_id = ? AND is_active = 1 LIMIT 1");
                $stmt->execute([$fgId]);
                $header = $stmt->fetch();

                if ($header) {
                    $bomId = (int)$header['id'];
                } else {
                    $fgStmt = $db->prepare("SELECT product_name, fg_code FROM finished_goods WHERE id = ?");
                    $fgStmt->execute([$fgId]);
                    $fg = $fgStmt->fetch();

                    $bomCode = "BOM-FG" . str_pad($fgId, 3, '0', STR_PAD_LEFT) . "-V1";
                    $bomName = "BOM for " . ($fg['product_name'] ?? "FG #$fgId");

                    $insH = $db->prepare("
                        INSERT INTO bom_headers (fg_id, bom_code, bom_name, version, is_active, status, effective_from, created_by, created_at)
                        VALUES (?, ?, ?, 'V1', 1, 'ACTIVE', CURDATE(), ?, NOW())
                    ");
                    $insH->execute([$fgId, $bomCode, $bomName, $user['id']]);
                    $bomId = (int)$db->lastInsertId();
                }

                // Delete existing items for this BOM
                $db->prepare("DELETE FROM bom_items WHERE bom_id = ?")->execute([$bomId]);

                // Insert updated items with sub_child_part_id
                $insItem = $db->prepare("
                    INSERT INTO bom_items (bom_id, rm_id, sub_child_part_id, quantity_per_unit, unit_id, wastage_percentage, scrap_factor, sequence, mandatory)
                    VALUES (?, ?, ?, ?, ?, 0.00, 0.00, ?, 1)
                ");

                foreach ($items as $sIdx => $it) {
                    $unitId = $it['unit_id'];
                    if (!$unitId) {
                        $rmStmt = $db->prepare("SELECT unit_id FROM raw_materials WHERE id = ?");
                        $rmStmt->execute([$it['rm_id']]);
                        $rmU = $rmStmt->fetch();
                        $unitId = (int)($rmU['unit_id'] ?? 1);
                    }

                    $insItem->execute([
                        $bomId,
                        $it['rm_id'],
                        $it['sub_child_part_id'],
                        $it['quantity'],
                        $unitId,
                        $sIdx + 1
                    ]);
                    $savedCount++;
                }
            }

            $db->commit();
            Response::success(['saved_items' => $savedCount], 'BOM recipes saved successfully.');
        } catch (Exception $e) {
            $db->rollBack();
            Response::error('Failed saving recipes: ' . $e->getMessage(), null, 400);
        }
    }
}

