<?php
// ============================================================
// BHARAT IMPEX — RAW MATERIAL CONTROLLER
// ============================================================

class RawMaterialController {

    public static function index(): void {
        Auth::requireAuth();
        $db = Database::getConnection();

        $search = trim($_GET['search'] ?? '');
        $categoryId = $_GET['category_id'] ?? null;
        $archived = !empty($_GET['archived']) && ($_GET['archived'] == '1' || $_GET['archived'] === 'true');

        $sql = "
            SELECT rm.*, c.category_name, u.unit_code, u.unit_name, pu.unit_code as purchase_unit_code,
                   COALESCE(s.quantity, 0) as current_stock,
                   COALESCE(s.reserved_quantity, 0) as reserved_stock,
                   COALESCE(s.available_quantity, 0) as available_stock
            FROM raw_materials rm
            JOIN units u ON rm.unit_id = u.id
            LEFT JOIN units pu ON rm.purchase_unit_id = pu.id
            LEFT JOIN categories c ON rm.category_id = c.id
            LEFT JOIN stock s ON s.material_type = 'RM' AND s.material_id = rm.id AND s.warehouse_id = 1
            WHERE " . ($archived ? "rm.deleted_at IS NOT NULL" : "rm.deleted_at IS NULL AND (rm.active IS NULL OR rm.active = 1)") . "
        ";

        $params = [];
        if ($categoryId) {
            $sql .= " AND rm.category_id = ?";
            $params[] = $categoryId;
        }
        if ($search) {
            $sql .= " AND (rm.rm_code LIKE ? OR rm.material_name LIKE ? OR rm.description LIKE ?)";
            $params[] = "%{$search}%";
            $params[] = "%{$search}%";
            $params[] = "%{$search}%";
        }

        $sql .= " ORDER BY rm.id ASC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $materials = $stmt->fetchAll();

        Response::success($materials);
    }

    public static function create(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $name = trim($input['material_name'] ?? '');
        $unitId = (int)($input['unit_id'] ?? 0);
        $categoryId = !empty($input['category_id']) ? (int)$input['category_id'] : null;
        $standardRate = (float)($input['standard_rate'] ?? 0);
        $minStock = (float)($input['minimum_stock'] ?? 0);
        $reorderLevel = (float)($input['reorder_level'] ?? 0);
        $maxStock = (float)($input['maximum_stock'] ?? 0);
        $hsn = trim($input['hsn_code'] ?? '');
        $desc = trim($input['description'] ?? '');

        if (empty($name) || !$unitId) {
            Response::error('Material name and stock unit are required.', null, 400);
        }

        $db = Database::getConnection();

        // Auto generate RM-00000X code
        $seqStmt = $db->query("SELECT MAX(id) FROM raw_materials");
        $maxId = (int)($seqStmt->fetchColumn() ?: 0) + 1;
        $rmCode = 'RM-' . str_pad($maxId, 6, '0', STR_PAD_LEFT);

        $stmt = $db->prepare("
            INSERT INTO raw_materials (
                rm_code, material_name, description, category_id, unit_id, purchase_unit_id,
                conversion_factor, standard_rate, minimum_stock, reorder_level, maximum_stock,
                hsn_code, created_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 1.0000, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([
            $rmCode,
            $name,
            $desc,
            $categoryId,
            $unitId,
            $unitId,
            $standardRate,
            $minStock,
            $reorderLevel,
            $maxStock,
            $hsn,
            $user['id']
        ]);
        $id = (int)$db->lastInsertId();

        AuditService::log('RAW_MATERIAL_CREATED', 'MASTERS', $rmCode, null, ['id' => $id, 'name' => $name]);

        Response::success(['id' => $id, 'rm_code' => $rmCode], 'Raw material created successfully.');
    }

    public static function update(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $id = (int)($input['id'] ?? 0);

        if (!$id) {
            Response::error('Material ID is required.', null, 400);
        }

        $db = Database::getConnection();
        $stmt = $db->prepare("
            UPDATE raw_materials 
            SET material_name = ?, description = ?, category_id = ?, unit_id = ?,
                standard_rate = ?, minimum_stock = ?, reorder_level = ?, maximum_stock = ?,
                hsn_code = ?, updated_by = ?, updated_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([
            trim($input['material_name']),
            trim($input['description'] ?? ''),
            !empty($input['category_id']) ? (int)$input['category_id'] : null,
            (int)$input['unit_id'],
            (float)($input['standard_rate'] ?? 0),
            (float)($input['minimum_stock'] ?? 0),
            (float)($input['reorder_level'] ?? 0),
            (float)($input['maximum_stock'] ?? 0),
            trim($input['hsn_code'] ?? ''),
            $user['id'],
            $id
        ]);

        Response::success(null, 'Raw material updated successfully.');
    }

    public static function delete(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $id = (int)($input['id'] ?? 0);

        if (!$id) {
            Response::error('Raw Material ID is required.', null, 400);
        }

        $db = Database::getConnection();
        $chk = $db->prepare("SELECT id, rm_code, material_name FROM raw_materials WHERE id = ?");
        $chk->execute([$id]);
        $rm = $chk->fetch();

        if (!$rm) {
            Response::error('Raw material not found.', null, 404);
        }

        // Soft delete: keep row and all transactions/snapshots/stock intact in backend
        $stmt = $db->prepare("
            UPDATE raw_materials 
            SET deleted_at = NOW(), active = 0, updated_by = ? 
            WHERE id = ?
        ");
        $stmt->execute([$user['id'], $id]);

        AuditService::log('RAW_MATERIAL_DELETED', 'MASTERS', $rm['rm_code'], null, [
            'id' => $id,
            'name' => $rm['material_name'],
            'action' => 'soft_delete'
        ]);

        Response::success([
            'id' => $id,
            'rm_code' => $rm['rm_code']
        ], "Raw Material '{$rm['material_name']}' has been deleted and archived. Historical records are preserved in backend.");
    }

    public static function restore(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $id = (int)($input['id'] ?? 0);

        if (!$id) {
            Response::error('Raw Material ID is required.', null, 400);
        }

        $db = Database::getConnection();
        $stmt = $db->prepare("
            UPDATE raw_materials 
            SET deleted_at = NULL, active = 1, updated_by = ? 
            WHERE id = ?
        ");
        $stmt->execute([$user['id'], $id]);

        AuditService::log('RAW_MATERIAL_RESTORED', 'MASTERS', (string)$id, null, ['id' => $id]);

        Response::success(null, 'Raw Material restored to active catalog.');
    }

    public static function bulkImport(): void {
        $user = Auth::requireAuth();
        $db = Database::getConnection();

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $items = $input['items'] ?? $input;

        if (empty($items) || !is_array($items)) {
            Response::error('No items provided for raw material bulk import.', null, 400);
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
                $code = strtoupper(trim((string)($item['rm_code'] ?? $item['code'] ?? '')));
                $name = trim((string)($item['material_name'] ?? $item['name'] ?? ''));
                if (empty($name) && empty($code)) continue;

                $rate = (float)($item['standard_rate'] ?? $item['rate'] ?? 0);
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
                    $chk = $db->prepare("SELECT id FROM raw_materials WHERE id = ?");
                    $chk->execute([(int)$item['id']]);
                    $existingId = $chk->fetchColumn();
                }
                if (!$existingId && !empty($code)) {
                    $chk = $db->prepare("SELECT id FROM raw_materials WHERE rm_code = ?");
                    $chk->execute([$code]);
                    $existingId = $chk->fetchColumn();
                }

                if ($existingId) {
                    $upd = $db->prepare("
                        UPDATE raw_materials 
                        SET material_name = COALESCE(NULLIF(?, ''), material_name),
                            standard_rate = CASE WHEN ? > 0 THEN ? ELSE standard_rate END,
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
                        $name, $rate, $rate,
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
                        $seqStmt = $db->query("SELECT COALESCE(MAX(id), 0) FROM raw_materials");
                        $nextSeq = (int)$seqStmt->fetchColumn() + 1;
                        $code = 'RM-' . str_pad($nextSeq, 6, '0', STR_PAD_LEFT);
                    }
                    $ins = $db->prepare("
                        INSERT INTO raw_materials (
                            rm_code, material_name, description, category_id, unit_id, purchase_unit_id,
                            conversion_factor, standard_rate, minimum_stock, reorder_level, maximum_stock,
                            hsn_code, created_by, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, 1.0, ?, ?, ?, ?, ?, ?, NOW())
                    ");
                    $ins->execute([
                        $code, $name ?: ('Raw Material ' . $code), $desc, $catId, $unitId, $unitId,
                        $rate, $minStock, $reorderLevel, $maxStock, $hsn, $user['id']
                    ]);
                    $createdCount++;
                }
            }

            $db->commit();
            Response::success([
                'created_count' => $createdCount,
                'updated_count' => $updatedCount,
                'total'         => $createdCount + $updatedCount
            ], "Bulk Raw Materials import complete: {$createdCount} created, {$updatedCount} updated.");
        } catch (Exception $e) {
            $db->rollBack();
            Response::error('Failed to import raw materials: ' . $e->getMessage(), null, 400);
        }
    }
}
