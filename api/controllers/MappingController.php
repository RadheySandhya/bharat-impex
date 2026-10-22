<?php
// ============================================================
// BHARAT IMPEX — TALLY ITEM MAPPING CONTROLLER
// ============================================================

class MappingController {

    public static function index(): void {
        Auth::requireAuth();
        $db = Database::getConnection();

        $type = $_GET['material_type'] ?? null;
        $search = trim($_GET['search'] ?? '');
        $status = $_GET['status'] ?? null;

        $sql = "
            SELECT im.*,
                   CASE 
                       WHEN im.material_type = 'RM' THEN rm.material_name
                       WHEN im.material_type = 'FG' THEN fg.product_name
                       ELSE ''
                   END as internal_item_name,
                   CASE 
                       WHEN im.material_type = 'RM' THEN u_rm.unit_code
                       WHEN im.material_type = 'FG' THEN u_fg.unit_code
                       ELSE ''
                   END as unit_code
            FROM item_mappings im
            LEFT JOIN raw_materials rm ON im.material_type = 'RM' AND im.internal_item_id = rm.id
            LEFT JOIN finished_goods fg ON im.material_type = 'FG' AND im.internal_item_id = fg.id
            LEFT JOIN units u_rm ON rm.unit_id = u_rm.id
            LEFT JOIN units u_fg ON fg.unit_id = u_fg.id
            WHERE 1=1
        ";

        $params = [];
        if ($type) {
            $sql .= " AND im.material_type = ?";
            $params[] = $type;
        }
        if ($status) {
            $sql .= " AND im.status = ?";
            $params[] = $status;
        }
        if ($search) {
            $sql .= " AND (im.external_item_name LIKE ? OR im.internal_item_code LIKE ?)";
            $params[] = "%{$search}%";
            $params[] = "%{$search}%";
        }

        $sql .= " ORDER BY im.material_type ASC, im.external_item_name ASC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $mappings = $stmt->fetchAll();

        Response::success($mappings);
    }

    public static function save(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $externalName = trim($input['external_item_name'] ?? '');
        $materialType = $input['material_type'] ?? 'RM';
        $internalId = (int)($input['internal_item_id'] ?? 0);

        if (empty($externalName) || !$internalId) {
            Response::error('External Tally Item Name and Internal Material selection are required.', null, 400);
        }

        $db = Database::getConnection();

        // Fetch internal code
        if ($materialType === 'RM') {
            $stmt = $db->prepare("SELECT rm_code FROM raw_materials WHERE id = ?");
            $stmt->execute([$internalId]);
            $code = $stmt->fetchColumn();
        } else {
            $stmt = $db->prepare("SELECT fg_code FROM finished_goods WHERE id = ?");
            $stmt->execute([$internalId]);
            $code = $stmt->fetchColumn();
        }

        if (!$code) {
            Response::error('Selected internal material does not exist.', null, 404);
        }

        $upsertStmt = $db->prepare("
            INSERT INTO item_mappings (external_source, external_item_name, material_type, internal_item_id, internal_item_code, status, active, created_by, created_at)
            VALUES ('TALLY', ?, ?, ?, ?, 'MAPPED', 1, ?, NOW())
            ON DUPLICATE KEY UPDATE 
                internal_item_id = VALUES(internal_item_id),
                internal_item_code = VALUES(internal_item_code),
                status = 'MAPPED',
                updated_by = VALUES(created_by),
                updated_at = NOW()
        ");
        $upsertStmt->execute([$externalName, $materialType, $internalId, $code, $user['id']]);

        AuditService::log('ITEM_MAPPING_SAVED', 'MAPPINGS', $externalName, null, [
            'external' => $externalName,
            'type'     => $materialType,
            'internal' => $code
        ]);

        Response::success([
            'external_item_name' => $externalName,
            'internal_item_id'   => $internalId,
            'internal_item_code' => $code,
            'status'             => 'MAPPED'
        ], 'Mapping saved successfully.');
    }

    public static function delete(): void {
        $user = Auth::requireAuth();
        $id = (int)($_GET['id'] ?? 0);

        if (!$id) {
            Response::error('Mapping ID is required.', null, 400);
        }

        $db = Database::getConnection();
        $db->prepare("DELETE FROM item_mappings WHERE id = ?")->execute([$id]);

        Response::success(null, 'Mapping removed.');
    }
}
