<?php
// ============================================================
// BHARAT IMPEX — SUB-SKU & OEM BRAND MAPPINGS CONTROLLER
// ============================================================

class SubSKUController {

    /**
     * Get all Sub-SKUs with Parent Manufacturing SKU & Live Stock details
     */
    public static function index(): void {
        Auth::requireAuth();
        $db = Database::getConnection();

        $search = trim($_GET['search'] ?? '');
        $brand = trim($_GET['brand'] ?? '');
        $parentFgId = (int)($_GET['parent_fg_id'] ?? 0);

        $sql = "
            SELECT 
                s.id,
                s.parent_fg_id,
                s.sub_sku_code,
                s.sub_sku_name,
                s.brand_name,
                s.client_item_code,
                s.selling_price,
                s.description,
                s.active,
                s.created_at,
                s.updated_at,
                fg.fg_code AS parent_fg_code,
                fg.product_name AS parent_product_name,
                fg.selling_price AS parent_selling_price,
                u.unit_code,
                COALESCE(stk.total_stock, 0) AS parent_stock
            FROM sub_skus s
            JOIN finished_goods fg ON s.parent_fg_id = fg.id
            LEFT JOIN units u ON fg.unit_id = u.id
            LEFT JOIN (
                SELECT material_id, SUM(quantity) AS total_stock
                FROM stock
                WHERE material_type = 'FG'
                GROUP BY material_id
            ) stk ON stk.material_id = fg.id
            WHERE 1=1
        ";

        $params = [];

        if ($parentFgId > 0) {
            $sql .= " AND s.parent_fg_id = ?";
            $params[] = $parentFgId;
        }

        if ($brand !== '' && $brand !== 'ALL') {
            $sql .= " AND s.brand_name = ?";
            $params[] = $brand;
        }

        if ($search !== '') {
            $sql .= " AND (
                s.sub_sku_name LIKE ? 
                OR s.sub_sku_code LIKE ? 
                OR s.brand_name LIKE ? 
                OR fg.product_name LIKE ? 
                OR fg.fg_code LIKE ?
            )";
            $term = "%{$search}%";
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
        }

        $sql .= " ORDER BY s.brand_name ASC, s.sub_sku_name ASC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $subSkus = $stmt->fetchAll();

        // Also fetch list of unique brands for quick filter pills
        $brandsStmt = $db->query("SELECT DISTINCT brand_name FROM sub_skus WHERE active = 1 ORDER BY brand_name ASC");
        $brands = $brandsStmt->fetchAll(PDO::FETCH_COLUMN);

        Response::success([
            'sub_skus' => $subSkus,
            'brands'   => $brands
        ]);
    }

    /**
     * Create or Update a Sub-SKU Mapping
     */
    public static function save(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $id = (int)($input['id'] ?? 0);
        $parentFgId = (int)($input['parent_fg_id'] ?? 0);
        $subSkuName = trim($input['sub_sku_name'] ?? '');
        $brandName = trim($input['brand_name'] ?? '');
        $subSkuCode = strtoupper(trim($input['sub_sku_code'] ?? ''));
        $clientItemCode = trim($input['client_item_code'] ?? '');
        $sellingPrice = (float)($input['selling_price'] ?? 0);
        $description = trim($input['description'] ?? '');
        $active = isset($input['active']) ? (int)$input['active'] : 1;

        if (!$parentFgId) {
            Response::error('Parent Manufacturing SKU is required.', null, 400);
        }
        if (!$subSkuName) {
            Response::error('Sub-SKU Name (Billed Product Name) is required.', null, 400);
        }
        if (!$brandName) {
            Response::error('Brand / Client Name is required (e.g. Somany, Prince Pipe, Zen Bath).', null, 400);
        }

        $db = Database::getConnection();

        // Verify parent FG exists
        $fgStmt = $db->prepare("SELECT id, fg_code, product_name, selling_price FROM finished_goods WHERE id = ?");
        $fgStmt->execute([$parentFgId]);
        $parentFg = $fgStmt->fetch();
        if (!$parentFg) {
            Response::error('Parent Finished Good not found.', null, 404);
        }

        if (empty($subSkuCode)) {
            $brandPrefix = strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $brandName), 0, 3));
            $subSkuCode = ($brandPrefix ?: 'SUB') . '-' . strtoupper(substr(uniqid(), -5));
        }

        if ($sellingPrice <= 0) {
            $sellingPrice = (float)$parentFg['selling_price'];
        }

        if ($id > 0) {
            // Update
            $stmt = $db->prepare("
                UPDATE sub_skus 
                SET parent_fg_id = ?, sub_sku_code = ?, sub_sku_name = ?, brand_name = ?,
                    client_item_code = ?, selling_price = ?, description = ?, active = ?,
                    updated_by = ?, updated_at = NOW()
                WHERE id = ?
            ");
            $stmt->execute([
                $parentFgId, $subSkuCode, $subSkuName, $brandName,
                $clientItemCode, $sellingPrice, $description, $active,
                $user['id'], $id
            ]);
        } else {
            // Insert
            $stmt = $db->prepare("
                INSERT INTO sub_skus (
                    parent_fg_id, sub_sku_code, sub_sku_name, brand_name,
                    client_item_code, selling_price, description, active, created_by, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ");
            $stmt->execute([
                $parentFgId, $subSkuCode, $subSkuName, $brandName,
                $clientItemCode, $sellingPrice, $description, $active, $user['id']
            ]);
            $id = (int)$db->lastInsertId();
        }

        // Keep item_mappings in sync so Tally imports recognize this sub-sku name immediately
        try {
            $mapStmt = $db->prepare("
                INSERT INTO item_mappings (
                    external_source, external_item_name, material_type,
                    internal_item_id, internal_item_code, status, active, created_at
                ) VALUES ('TALLY', ?, 'FG', ?, ?, 'MAPPED', 1, NOW())
                ON DUPLICATE KEY UPDATE 
                    internal_item_id = VALUES(internal_item_id),
                    internal_item_code = VALUES(internal_item_code),
                    updated_at = NOW()
            ");
            $mapStmt->execute([
                strtoupper($subSkuName),
                $parentFgId,
                $parentFg['fg_code']
            ]);
        } catch (Exception $e) {
            // Ignore mapping duplicate conflict if any
        }

        Response::success(['id' => $id], 'Sub-SKU mapping saved successfully.');
    }

    /**
     * Delete / Deactivate a Sub-SKU
     */
    public static function delete(): void {
        Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $id = (int)($input['id'] ?? ($_GET['id'] ?? 0));

        if (!$id) {
            Response::error('Sub-SKU ID is required.', null, 400);
        }

        $db = Database::getConnection();
        $stmt = $db->prepare("DELETE FROM sub_skus WHERE id = ?");
        $stmt->execute([$id]);

        Response::success(null, 'Sub-SKU mapping removed successfully.');
    }

    /**
     * Bulk Import Sub-SKUs
     */
    public static function bulkImport(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $items = $input['items'] ?? [];

        if (empty($items) || !is_array($items)) {
            Response::error('No Sub-SKU items provided for import.', null, 400);
        }

        $db = Database::getConnection();
        $db->beginTransaction();

        try {
            $inserted = 0;
            $updated = 0;

            // Pre-load FG map by code and name
            $fgs = $db->query("SELECT id, fg_code, product_name, selling_price FROM finished_goods WHERE active = 1")->fetchAll();
            $fgMap = [];
            foreach ($fgs as $f) {
                $fgMap[strtoupper(trim($f['fg_code']))] = $f;
                $fgMap[strtoupper(trim($f['product_name']))] = $f;
            }

            $insertStmt = $db->prepare("
                INSERT INTO sub_skus (
                    parent_fg_id, sub_sku_code, sub_sku_name, brand_name,
                    client_item_code, selling_price, description, active, created_by, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, NOW())
                ON DUPLICATE KEY UPDATE
                    parent_fg_id = VALUES(parent_fg_id),
                    sub_sku_name = VALUES(sub_sku_name),
                    brand_name = VALUES(brand_name),
                    selling_price = VALUES(selling_price),
                    updated_at = NOW()
            ");

            $mapStmt = $db->prepare("
                INSERT INTO item_mappings (
                    external_source, external_item_name, material_type,
                    internal_item_id, internal_item_code, status, active, created_at
                ) VALUES ('TALLY', ?, 'FG', ?, ?, 'MAPPED', 1, NOW())
                ON DUPLICATE KEY UPDATE 
                    internal_item_id = VALUES(internal_item_id),
                    internal_item_code = VALUES(internal_item_code),
                    updated_at = NOW()
            ");

            foreach ($items as $item) {
                $parentRef = strtoupper(trim($item['parent_sku'] ?? ($item['parent_fg_code'] ?? ($item['parent_product_name'] ?? ''))));
                $parentFg = $fgMap[$parentRef] ?? null;

                if (!$parentFg && !empty($item['parent_fg_id'])) {
                    $pid = (int)$item['parent_fg_id'];
                    foreach ($fgs as $f) {
                        if ($f['id'] == $pid) { $parentFg = $f; break; }
                    }
                }

                if (!$parentFg) continue;

                $subSkuName = trim($item['sub_sku_name'] ?? '');
                $brandName = trim($item['brand_name'] ?? 'General Brand');
                if (!$subSkuName) continue;

                $subSkuCode = strtoupper(trim($item['sub_sku_code'] ?? ''));
                if (!$subSkuCode) {
                    $brandPrefix = strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $brandName), 0, 3));
                    $subSkuCode = ($brandPrefix ?: 'SUB') . '-' . strtoupper(substr(uniqid(), -5));
                }

                $price = (float)($item['selling_price'] ?? $parentFg['selling_price']);
                $desc = trim($item['description'] ?? '');
                $clientCode = trim($item['client_item_code'] ?? '');

                $insertStmt->execute([
                    $parentFg['id'],
                    $subSkuCode,
                    $subSkuName,
                    $brandName,
                    $clientCode,
                    $price,
                    $desc,
                    $user['id']
                ]);

                $mapStmt->execute([
                    strtoupper($subSkuName),
                    $parentFg['id'],
                    $parentFg['fg_code']
                ]);

                $inserted++;
            }

            $db->commit();
            Response::success(['processed' => $inserted], "Successfully imported {$inserted} Sub-SKU mappings.");
        } catch (Exception $e) {
            $db->rollBack();
            Response::error('Failed to import Sub-SKUs: ' . $e->getMessage(), null, 400);
        }
    }
}
