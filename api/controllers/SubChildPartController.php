<?php
// ============================================================
// BHARAT IMPEX — SUB-CHILD PARTS & COMPONENT VARIANT CONTROLLER
// ============================================================

class SubChildPartController {

    /**
     * Self-healing: Ensure sub_child_parts table exists
     */
    private static function ensureTable(PDO $db): void {
        static $checked = false;
        if ($checked) return;

        try {
            $sql = "
                CREATE TABLE IF NOT EXISTS `sub_child_parts` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `parent_rm_id` INT NOT NULL,
                    `sub_part_code` VARCHAR(50) NOT NULL UNIQUE,
                    `sub_part_name` VARCHAR(255) NOT NULL,
                    `brand_name` VARCHAR(150) NOT NULL,
                    `party_id` INT NULL,
                    `unit_id` INT NOT NULL DEFAULT 1,
                    `standard_rate` DECIMAL(12, 2) DEFAULT 0.00,
                    `current_stock` DECIMAL(14, 3) NOT NULL DEFAULT 0.000,
                    `description` TEXT NULL,
                    `active` TINYINT(1) DEFAULT 1,
                    `created_by` INT NULL,
                    `updated_by` INT NULL,
                    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX `idx_scp_parent` (`parent_rm_id`),
                    INDEX `idx_scp_brand` (`brand_name`),
                    INDEX `idx_scp_party` (`party_id`),
                    INDEX `idx_scp_name` (`sub_part_name`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ";
            $db->exec($sql);

            // current_stock column + godown-wise variant stock tables
            SubChildStockService::ensureSchema();
        } catch (Exception $e) {
            // Silently ignore if already exists or permission issue
        }
        $checked = true;
    }

    /**
     * GET /api/sub-child-parts
     */
    public static function index(): void {
        Auth::requireAuth();
        $db = Database::getConnection();
        self::ensureTable($db);

        $search     = trim($_GET['search'] ?? '');
        $brand      = trim($_GET['brand'] ?? '');
        $parentRmId = (int)($_GET['parent_rm_id'] ?? 0);
        $partyId    = (int)($_GET['party_id'] ?? 0);

        $sql = "
            SELECT 
                scp.id,
                scp.parent_rm_id,
                scp.sub_part_code,
                scp.sub_part_name,
                scp.brand_name,
                scp.party_id,
                scp.unit_id,
                scp.standard_rate,
                COALESCE(scp.current_stock, 0) as current_stock,
                scp.description,
                scp.active,
                scp.created_at,
                scp.updated_at,
                rm.rm_code AS parent_rm_code,
                rm.material_name AS parent_rm_name,
                rm.standard_rate AS parent_standard_rate,
                COALESCE(u.unit_code, 'PCS') AS unit_code,
                p.party_name AS mapped_customer_name
            FROM sub_child_parts scp
            JOIN raw_materials rm ON scp.parent_rm_id = rm.id
            LEFT JOIN units u ON scp.unit_id = u.id
            LEFT JOIN parties p ON scp.party_id = p.id
            WHERE scp.active = 1
        ";

        $params = [];

        if ($parentRmId > 0) {
            $sql .= " AND scp.parent_rm_id = ?";
            $params[] = $parentRmId;
        }

        if ($partyId > 0) {
            $sql .= " AND scp.party_id = ?";
            $params[] = $partyId;
        }

        if ($brand !== '' && $brand !== 'ALL') {
            $sql .= " AND scp.brand_name = ?";
            $params[] = $brand;
        }

        if ($search !== '') {
            $sql .= " AND (
                scp.sub_part_name LIKE ? 
                OR scp.sub_part_code LIKE ? 
                OR scp.brand_name LIKE ? 
                OR rm.material_name LIKE ? 
                OR rm.rm_code LIKE ?
                OR p.party_name LIKE ?
            )";
            $term = "%{$search}%";
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
        }

        $sql .= " ORDER BY scp.brand_name ASC, scp.sub_part_name ASC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $parts = $stmt->fetchAll();

        // Godown-wise stock of every variant
        $byWh = SubChildStockService::stockByWarehouse(array_column($parts, 'id'));
        foreach ($parts as &$p) {
            $p['current_stock'] = (float)$p['current_stock'];
            $p['godown_stocks'] = $byWh[(int)$p['id']] ?? [];
        }
        unset($p);

        // Get distinct brands for filter chips
        $brandStmt = $db->query("
            SELECT DISTINCT brand_name 
            FROM sub_child_parts 
            WHERE active = 1 AND brand_name IS NOT NULL AND brand_name != ''
            ORDER BY brand_name ASC
        ");
        $brands = $brandStmt->fetchAll(PDO::FETCH_COLUMN);

        Response::success([
            'sub_child_parts' => $parts,
            'brands'          => $brands,
            'total'           => count($parts)
        ]);
    }

    /**
     * POST /api/sub-child-parts
     * Create or update a sub child part
     */
    public static function save(): void {
        $user = Auth::requireAuth();
        $db = Database::getConnection();
        self::ensureTable($db);

        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $id           = (int)($input['id'] ?? 0);
        $parentRmId   = (int)($input['parent_rm_id'] ?? 0);
        $subPartName  = trim($input['sub_part_name'] ?? '');
        $subPartCode  = strtoupper(trim($input['sub_part_code'] ?? ''));
        $brandName    = trim($input['brand_name'] ?? '');
        $partyId      = !empty($input['party_id']) ? (int)$input['party_id'] : null;
        $unitId       = (int)($input['unit_id'] ?? 3); // default PCS
        $standardRate = (float)($input['standard_rate'] ?? 0);
        $description  = trim($input['description'] ?? '');
        $active       = isset($input['active']) ? (int)$input['active'] : 1;

        if (!$parentRmId) {
            Response::error('Parent Child Part (Raw Material) selection is required.', null, 400);
            return;
        }
        if (!$subPartName) {
            Response::error('Sub-Child Part Name is required (e.g. Somany Cartridge 35mm).', null, 400);
            return;
        }
        if (!$brandName) {
            Response::error('Brand / Variety Name is required (e.g. Somany, Prince Pipe, Neoperl).', null, 400);
            return;
        }

        // Verify parent raw material exists
        $rmStmt = $db->prepare("SELECT id, rm_code, material_name, standard_rate, unit_id FROM raw_materials WHERE id = ?");
        $rmStmt->execute([$parentRmId]);
        $parentRm = $rmStmt->fetch();
        if (!$parentRm) {
            Response::error('Parent Child Part not found.', null, 404);
            return;
        }

        if (empty($subPartCode)) {
            $brandPrefix = strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $brandName), 0, 3));
            $subPartCode = ($brandPrefix ?: 'SCP') . '-' . strtoupper(substr(uniqid(), -5));
        }

        $unitId = InventoryService::resolveUnitId($unitId > 0 ? $unitId : (int)($parentRm['unit_id'] ?? 0), 'PCS');

        if ($standardRate <= 0) {
            $standardRate = (float)$parentRm['standard_rate'];
        }

        if ($id > 0) {
            // Check code uniqueness excluding this ID
            $dupStmt = $db->prepare("SELECT id FROM sub_child_parts WHERE sub_part_code = ? AND id != ?");
            $dupStmt->execute([$subPartCode, $id]);
            if ($dupStmt->fetch()) {
                Response::error("Sub-Child Part Code '{$subPartCode}' is already in use.", null, 409);
                return;
            }

            $stmt = $db->prepare("
                UPDATE sub_child_parts 
                SET parent_rm_id = ?, sub_part_code = ?, sub_part_name = ?, brand_name = ?,
                    party_id = ?, unit_id = ?, standard_rate = ?, description = ?, active = ?,
                    updated_by = ?, updated_at = NOW()
                WHERE id = ?
            ");
            $stmt->execute([
                $parentRmId, $subPartCode, $subPartName, $brandName,
                $partyId, $unitId, $standardRate, $description, $active,
                $user['id'], $id
            ]);

            Response::success(['id' => $id, 'sub_part_code' => $subPartCode], 'Sub-Child Part updated successfully.');
        } else {
            // Check code uniqueness
            $dupStmt = $db->prepare("SELECT id FROM sub_child_parts WHERE sub_part_code = ?");
            $dupStmt->execute([$subPartCode]);
            if ($dupStmt->fetch()) {
                Response::error("Sub-Child Part Code '{$subPartCode}' is already in use.", null, 409);
                return;
            }

            $stmt = $db->prepare("
                INSERT INTO sub_child_parts (
                    parent_rm_id, sub_part_code, sub_part_name, brand_name,
                    party_id, unit_id, standard_rate, description, active, created_by, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ");
            $stmt->execute([
                $parentRmId, $subPartCode, $subPartName, $brandName,
                $partyId, $unitId, $standardRate, $description, $active,
                $user['id']
            ]);
            $newId = (int)$db->lastInsertId();

            Response::success(['id' => $newId, 'sub_part_code' => $subPartCode], 'Sub-Child Part created successfully.', 201);
        }
    }

    /**
     * POST /api/sub-child-parts/delete
     */
    public static function delete(): void {
        Auth::requireAuth();
        $db = Database::getConnection();
        self::ensureTable($db);

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $id = (int)($input['id'] ?? ($_GET['id'] ?? 0));

        if (!$id) {
            Response::error('Sub-Child Part ID is required.', null, 400);
            return;
        }

        $stmt = $db->prepare("UPDATE sub_child_parts SET active = 0, updated_at = NOW() WHERE id = ?");
        $stmt->execute([$id]);

        Response::success(['id' => $id], 'Sub-Child Part archived successfully.');
    }

    /**
     * GET /api/sub-child-parts/stock?id=X
     * Godown-wise balance + recent movement ledger of one sub-child part.
     */
    public static function stock(): void {
        Auth::requireAuth();
        $db = Database::getConnection();
        self::ensureTable($db);

        $id = (int)($_GET['id'] ?? 0);
        if (!$id) {
            Response::error('Sub-Child Part ID is required.', null, 400);
            return;
        }

        $ledger = $db->prepare("
            SELECT l.*, w.warehouse_name
            FROM sub_child_part_ledger l
            LEFT JOIN warehouses w ON w.id = l.warehouse_id
            WHERE l.sub_child_part_id = ?
            ORDER BY l.id DESC
            LIMIT 100
        ");
        $ledger->execute([$id]);

        Response::success([
            'id'            => $id,
            'godown_stocks' => SubChildStockService::stockByWarehouse([$id])[$id] ?? [],
            'ledger'        => $ledger->fetchAll(),
        ]);
    }

    /**
     * POST /api/sub-child-parts/stock
     * { id, warehouse_id, quantity, mode: 'add' | 'set', update_parent: bool, remarks }
     *  - add : put more stock of this sub-child part into the godown (opening / receipt)
     *  - set : physical count — set the godown balance to exactly this quantity
     * With update_parent (default true) the parent child part's godown stock moves by the
     * same difference, so the parent always equals generic + all its sub-child parts.
     */
    public static function updateStock(): void {
        $user = Auth::requireAuth();
        $db = Database::getConnection();
        self::ensureTable($db);

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $id = (int)($input['id'] ?? 0);
        $qty = round((float)($input['quantity'] ?? 0), 3);
        $mode = strtolower(trim($input['mode'] ?? 'add')) === 'set' ? 'set' : 'add';
        $updateParent = !isset($input['update_parent']) || !empty($input['update_parent']);
        $remarks = trim((string)($input['remarks'] ?? ''));

        if (!$id) {
            Response::error('Sub-Child Part ID is required.', null, 400);
            return;
        }
        if ($qty < 0 || ($mode === 'add' && $qty <= 0)) {
            Response::error($mode === 'add' ? 'Quantity to add must be greater than zero.' : 'Quantity cannot be negative.', null, 400);
            return;
        }

        $st = $db->prepare("
            SELECT scp.*, rm.rm_code, rm.material_name, rm.unit_id AS rm_unit_id, rm.standard_rate AS rm_rate
            FROM sub_child_parts scp
            JOIN raw_materials rm ON rm.id = scp.parent_rm_id
            WHERE scp.id = ?
        ");
        $st->execute([$id]);
        $scp = $st->fetch();
        if (!$scp) {
            Response::error('Sub-Child Part not found.', null, 404);
            return;
        }

        $warehouseId = InventoryService::getValidWarehouseId((int)($input['warehouse_id'] ?? 0));
        $current = SubChildStockService::available($id, $warehouseId);
        $delta = $mode === 'set' ? round($qty - $current, 3) : $qty;
        if ($delta == 0.0) {
            Response::success(['quantity' => $current, 'warehouse_id' => $warehouseId], 'No change - godown balance already matches.');
            return;
        }

        $label = "[{$scp['brand_name']}] {$scp['sub_part_name']}";
        $ref = ($mode === 'set' ? 'SCP-ADJ-' : 'SCP-OPN-') . strtoupper(bin2hex(random_bytes(4)));
        $note = ($mode === 'set' ? 'Physical count' : 'Stock added') . " for sub-child part {$label}" . ($remarks ? " - {$remarks}" : '');

        $db->beginTransaction();
        try {
            $newQty = SubChildStockService::move(
                $id, $warehouseId, $delta,
                $mode === 'set' ? ($delta > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT') : 'OPENING',
                $ref, $note, $user['id'], false
            );

            if ($updateParent) {
                $unitId = InventoryService::resolveUnitId((int)$scp['rm_unit_id'], 'PCS');
                $rate = (float)($scp['standard_rate'] ?: $scp['rm_rate']);
                if ($delta > 0) {
                    InventoryService::increaseStock(
                        'RM', (int)$scp['parent_rm_id'], $scp['rm_code'], $scp['material_name'],
                        $warehouseId, $delta, $unitId, $rate,
                        $mode === 'set' ? 'ADJUSTMENT_IN' : 'OPENING', $ref, $ref, null, date('Y-m-d'),
                        $note, $user['id']
                    );
                } else {
                    InventoryService::decreaseStock(
                        'RM', (int)$scp['parent_rm_id'], $scp['rm_code'],
                        $warehouseId, -$delta, $unitId, $rate,
                        'ADJUSTMENT_OUT', $ref, $ref, null, date('Y-m-d'),
                        $note, $user['id'], true
                    );
                }
            }

            $db->commit();
        } catch (Exception $e) {
            if ($db->inTransaction()) $db->rollBack();
            Response::error($e->getMessage(), null, 400);
            return;
        }

        AuditService::log('SUB_CHILD_STOCK_' . strtoupper($mode), 'INVENTORY', $ref, ['quantity' => $current], [
            'sub_child_part_id' => $id, 'warehouse_id' => $warehouseId, 'quantity' => $newQty, 'parent_updated' => $updateParent
        ]);

        Response::success([
            'quantity'     => $newQty,
            'warehouse_id' => $warehouseId,
            'difference'   => $delta,
        ], "Stock of {$label} in " . InventoryService::warehouseLabel($warehouseId) . " is now {$newQty}.");
    }
}
