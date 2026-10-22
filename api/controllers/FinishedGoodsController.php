<?php
// ============================================================
// BHARAT IMPEX — FINISHED GOODS (SKU) CONTROLLER
// ============================================================

class FinishedGoodsController {

    public static function index(): void {
        Auth::requireAuth();
        $db = Database::getConnection();

        $search = trim($_GET['search'] ?? '');
        $categoryId = $_GET['category_id'] ?? null;
        $archived = !empty($_GET['archived']) && ($_GET['archived'] == '1' || $_GET['archived'] === 'true');

        $sql = "
            SELECT fg.*, c.category_name, u.unit_code, u.unit_name,
                   COALESCE(s.quantity, 0) as current_stock,
                   COALESCE(s.reserved_quantity, 0) as reserved_stock,
                   COALESCE(s.available_quantity, 0) as available_stock,
                   (SELECT bh.bom_code FROM bom_headers bh WHERE bh.fg_id = fg.id AND bh.is_active = 1 LIMIT 1) as active_bom_code,
                   (SELECT bh.id FROM bom_headers bh WHERE bh.fg_id = fg.id AND bh.is_active = 1 LIMIT 1) as active_bom_id
            FROM finished_goods fg
            JOIN units u ON fg.unit_id = u.id
            LEFT JOIN categories c ON fg.category_id = c.id
            LEFT JOIN stock s ON s.material_type = 'FG' AND s.material_id = fg.id AND s.warehouse_id = 3
            WHERE " . ($archived ? "fg.deleted_at IS NOT NULL" : "fg.deleted_at IS NULL AND (fg.active IS NULL OR fg.active = 1)") . "
        ";

        $params = [];
        if ($categoryId) {
            $sql .= " AND fg.category_id = ?";
            $params[] = $categoryId;
        }
        if ($search) {
            $sql .= " AND (fg.fg_code LIKE ? OR fg.product_name LIKE ? OR fg.description LIKE ?)";
            $params[] = "%{$search}%";
            $params[] = "%{$search}%";
            $params[] = "%{$search}%";
        }

        $sql .= " ORDER BY fg.id ASC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $products = $stmt->fetchAll();

        Response::success($products);
    }

    public static function create(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $name = trim($input['product_name'] ?? '');
        $unitId = (int)($input['unit_id'] ?? 0);
        $categoryId = !empty($input['category_id']) ? (int)$input['category_id'] : null;
        $sellingPrice = (float)($input['selling_price'] ?? 0);
        $minStock = (float)($input['minimum_stock'] ?? 0);
        $reorderLevel = (float)($input['reorder_level'] ?? 0);
        $maxStock = (float)($input['maximum_stock'] ?? 0);
        $hsn = trim($input['hsn_code'] ?? '');
        $desc = trim($input['description'] ?? '');

        if (empty($name) || !$unitId) {
            Response::error('Product name and unit are required.', null, 400);
        }

        $db = Database::getConnection();

        // Auto generate FG-00000X code
        $seqStmt = $db->query("SELECT MAX(id) FROM finished_goods");
        $maxId = (int)($seqStmt->fetchColumn() ?: 0) + 1;
        $fgCode = 'FG-' . str_pad($maxId, 6, '0', STR_PAD_LEFT);

        $stmt = $db->prepare("
            INSERT INTO finished_goods (
                fg_code, product_name, description, category_id, unit_id,
                selling_price, minimum_stock, reorder_level, maximum_stock,
                hsn_code, created_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([
            $fgCode,
            $name,
            $desc,
            $categoryId,
            $unitId,
            $sellingPrice,
            $minStock,
            $reorderLevel,
            $maxStock,
            $hsn,
            $user['id']
        ]);
        $id = (int)$db->lastInsertId();

        AuditService::log('FINISHED_GOOD_CREATED', 'MASTERS', $fgCode, null, ['id' => $id, 'name' => $name]);

        Response::success(['id' => $id, 'fg_code' => $fgCode], 'Finished good created successfully.');
    }

    public static function update(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $id = (int)($input['id'] ?? 0);

        if (!$id) {
            Response::error('Product ID is required.', null, 400);
        }

        $db = Database::getConnection();
        $stmt = $db->prepare("
            UPDATE finished_goods 
            SET product_name = ?, description = ?, category_id = ?, unit_id = ?,
                selling_price = ?, minimum_stock = ?, reorder_level = ?, maximum_stock = ?,
                hsn_code = ?, updated_by = ?, updated_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([
            trim($input['product_name']),
            trim($input['description'] ?? ''),
            !empty($input['category_id']) ? (int)$input['category_id'] : null,
            (int)$input['unit_id'],
            (float)($input['selling_price'] ?? 0),
            (float)($input['minimum_stock'] ?? 0),
            (float)($input['reorder_level'] ?? 0),
            (float)($input['maximum_stock'] ?? 0),
            trim($input['hsn_code'] ?? ''),
            $user['id'],
            $id
        ]);

        Response::success(null, 'Finished good updated successfully.');
    }

    public static function delete(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $id = (int)($input['id'] ?? 0);

        if (!$id) {
            Response::error('Finished Good ID is required.', null, 400);
        }

        $db = Database::getConnection();
        $chk = $db->prepare("SELECT id, fg_code, product_name FROM finished_goods WHERE id = ?");
        $chk->execute([$id]);
        $fg = $chk->fetch();

        if (!$fg) {
            Response::error('Finished good SKU not found.', null, 404);
        }

        // Soft delete: keep row and all transactions/snapshots/stock intact in backend
        $stmt = $db->prepare("
            UPDATE finished_goods 
            SET deleted_at = NOW(), active = 0, updated_by = ? 
            WHERE id = ?
        ");
        $stmt->execute([$user['id'], $id]);

        AuditService::log('FINISHED_GOOD_DELETED', 'MASTERS', $fg['fg_code'], null, [
            'id' => $id,
            'name' => $fg['product_name'],
            'action' => 'soft_delete'
        ]);

        Response::success([
            'id' => $id,
            'fg_code' => $fg['fg_code']
        ], "Finished Good '{$fg['product_name']}' has been deleted and archived. Historical records are preserved in backend.");
    }

    public static function restore(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $id = (int)($input['id'] ?? 0);

        if (!$id) {
            Response::error('Finished Good ID is required.', null, 400);
        }

        $db = Database::getConnection();
        $stmt = $db->prepare("
            UPDATE finished_goods 
            SET deleted_at = NULL, active = 1, updated_by = ? 
            WHERE id = ?
        ");
        $stmt->execute([$user['id'], $id]);

        AuditService::log('FINISHED_GOOD_RESTORED', 'MASTERS', (string)$id, null, ['id' => $id]);

        Response::success(null, 'Finished Good SKU restored to active catalog.');
    }

    public static function bulkImport(): void {
        $user = Auth::requireAuth();
        $db = Database::getConnection();

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $items = $input['items'] ?? $input;

        if (empty($items) || !is_array($items)) {
            Response::error('No items provided for finished goods bulk import.', null, 400);
        }

        $db->beginTransaction();
        try {
            // Pre-fetch units and categories
            $unitMap = [];
            $uStmt = $db->query("SELECT id, UPPER(unit_code) as ucode FROM units");
            while ($u = $uStmt->fetch()) {
                $unitMap[$u['ucode']] = (int)$u['id'];
            }

            $catMap = [];
            $cStmt = $db->query("SELECT id, LOWER(category_name) as cname FROM categories");
            while ($c = $cStmt->fetch()) {
                $catMap[$c['cname']] = (int)$c['id'];
            }

            $createdCount = 0;
            $updatedCount = 0;

            foreach ($items as $item) {
                $code = strtoupper(trim((string)($item['fg_code'] ?? $item['code'] ?? '')));
                $name = trim((string)($item['product_name'] ?? $item['name'] ?? ''));
                if (empty($name) && empty($code)) continue;

                $price = (float)($item['selling_price'] ?? $item['rate'] ?? 0);
                $minStock = (float)($item['minimum_stock'] ?? $item['min_level'] ?? $item['reorder_level'] ?? 0);
                $reorderLevel = (float)($item['reorder_level'] ?? $minStock);
                $maxStock = (float)($item['maximum_stock'] ?? $item['max_level'] ?? 0);
                $desc = trim((string)($item['description'] ?? ''));
                $hsn = trim((string)($item['hsn_code'] ?? ''));

                $uCode = strtoupper(trim((string)($item['unit_code'] ?? $item['unit'] ?? 'PCS')));
                $unitId = (int)($item['unit_id'] ?? 0);
                if ($unitId <= 0) $unitId = $unitMap[$uCode] ?? 1;

                $catName = strtolower(trim((string)($item['category_name'] ?? $item['category'] ?? '')));
                $catId = !empty($item['category_id']) ? (int)$item['category_id'] : ($catMap[$catName] ?? null);

                // Check existing by id or code
                $existingId = null;
                if (!empty($item['id']) && is_numeric($item['id'])) {
                    $chk = $db->prepare("SELECT id FROM finished_goods WHERE id = ?");
                    $chk->execute([(int)$item['id']]);
                    $existingId = $chk->fetchColumn();
                }
                if (!$existingId && !empty($code)) {
                    $chk = $db->prepare("SELECT id FROM finished_goods WHERE fg_code = ?");
                    $chk->execute([$code]);
                    $existingId = $chk->fetchColumn();
                }

                if ($existingId) {
                    $upd = $db->prepare("
                        UPDATE finished_goods 
                        SET product_name = COALESCE(NULLIF(?, ''), product_name),
                            selling_price = CASE WHEN ? > 0 THEN ? ELSE selling_price END,
                            reorder_level = CASE WHEN ? > 0 THEN ? ELSE reorder_level END,
                            minimum_stock = CASE WHEN ? > 0 THEN ? ELSE minimum_stock END,
                            maximum_stock = CASE WHEN ? > 0 THEN ? ELSE maximum_stock END,
                            category_id = COALESCE(?, category_id),
                            unit_id = COALESCE(NULLIF(?, 0), unit_id),
                            description = CASE WHEN ? != '' THEN ? ELSE description END,
                            updated_by = ?, updated_at = NOW()
                        WHERE id = ?
                    ");
                    $upd->execute([
                        $name, $price, $price,
                        $reorderLevel, $reorderLevel,
                        $minStock, $minStock,
                        $maxStock, $maxStock,
                        $catId, $unitId,
                        $desc, $desc,
                        $user['id'], $existingId
                    ]);
                    $updatedCount++;
                } else {
                    if (empty($code)) {
                        $seqStmt = $db->query("SELECT COALESCE(MAX(id), 0) FROM finished_goods");
                        $nextSeq = (int)$seqStmt->fetchColumn() + 1;
                        $code = 'FG-' . str_pad($nextSeq, 6, '0', STR_PAD_LEFT);
                    }
                    $ins = $db->prepare("
                        INSERT INTO finished_goods (
                            fg_code, product_name, description, category_id, unit_id,
                            selling_price, minimum_stock, reorder_level, maximum_stock,
                            hsn_code, created_by, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                    ");
                    $ins->execute([
                        $code, $name ?: ('Finished Good ' . $code), $desc, $catId, $unitId,
                        $price, $minStock, $reorderLevel, $maxStock, $hsn, $user['id']
                    ]);
                    $createdCount++;
                }
            }

            $db->commit();
            Response::success([
                'created_count' => $createdCount,
                'updated_count' => $updatedCount,
                'total'         => $createdCount + $updatedCount
            ], "Bulk Finished Goods import complete: {$createdCount} created, {$updatedCount} updated.");
        } catch (Exception $e) {
            $db->rollBack();
            Response::error('Failed to import finished goods: ' . $e->getMessage(), null, 400);
        }
    }
}
