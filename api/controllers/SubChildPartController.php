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
        $unitId       = (int)($input['unit_id'] ?? 1);
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

        if ($unitId <= 0) {
            $unitId = (int)($parentRm['unit_id'] ?? 1);
        }

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
}
