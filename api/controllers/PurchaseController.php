<?php
// ============================================================
// BHARAT IMPEX — PURCHASE CONTROLLER
// ============================================================

class PurchaseController {

    /**
     * Preview and validate uploaded CSV before importing
     */
    public static function uploadPreview(): void {
        Auth::requireAuth();

        if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            Response::error('Please upload a valid CSV file.', null, 400);
        }

        $tmpPath = $_FILES['file']['tmp_name'];
        $originalName = $_FILES['file']['name'];
        $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

        if (!in_array($ext, ['csv', 'txt'])) {
            Response::error('Only .csv or .txt files are supported.', null, 400);
        }

        try {
            $parsed = ImportService::parseCSV($tmpPath, 'PURCHASE');
            $parsed['file_name'] = $originalName;
            Response::success($parsed, 'CSV parsed and validated successfully.');
        } catch (Exception $e) {
            Response::error('Failed to parse CSV: ' . $e->getMessage(), null, 400);
        }
    }

    /**
     * Confirm and execute Purchase Import Batch
     */
    public static function confirmImport(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $warehouseId = (int)($input['warehouse_id'] ?? 1);
        $batchData = $input['batch_data'] ?? null;

        if (!$batchData || empty($batchData['rows'])) {
            Response::error('No valid batch data provided for import.', null, 400);
        }

        try {
            $result = ImportService::importPurchaseBatch($batchData, $warehouseId, $user['id']);
            Response::success($result, 'Purchase batch imported successfully and RM stock updated.');
        } catch (Exception $e) {
            Response::error('Import failed: ' . $e->getMessage(), null, 400);
        }
    }

    /**
     * Direct Purchase Entry (without CSV)
     */
    public static function createDirect(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $rmId = (int)($input['rm_id'] ?? 0);
        $warehouseId = InventoryService::getValidWarehouseId((int)($input['warehouse_id'] ?? 0));
        $quantity = (float)($input['quantity'] ?? 0);
        $rate = (float)($input['rate'] ?? 0);
        $invoiceNumber = trim($input['invoice_number'] ?? 'MANUAL-' . date('Ymd'));
        $supplierName = trim($input['supplier_name'] ?? 'Direct Supplier');
        $purchaseDate = $input['purchase_date'] ?? date('Y-m-d');
        $remarks = trim($input['remarks'] ?? '');

        if (!$rmId || $quantity <= 0) {
            Response::error('Raw Material and positive quantity are required.', null, 400);
        }

        $db = Database::getConnection();
        $db->beginTransaction();

        try {
            $rmStmt = $db->prepare("SELECT rm_code, material_name, unit_id FROM raw_materials WHERE id = ?");
            $rmStmt->execute([$rmId]);
            $rm = $rmStmt->fetch();

            if (!$rm) throw new RuntimeException("Raw material not found.");

            $amount = round($quantity * $rate, 2);

            // Record Purchase Line
            $db->prepare("
                INSERT INTO purchase_inputs (
                    purchase_date, invoice_number, supplier_name, tally_item_name,
                    rm_id, rm_code, warehouse_id, quantity, unit_id, rate, amount, source, created_by, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'MANUAL_ENTRY', ?, NOW())
            ")->execute([
                $purchaseDate,
                $invoiceNumber,
                $supplierName,
                $rm['material_name'],
                $rmId,
                $rm['rm_code'],
                $warehouseId,
                $quantity,
                $rm['unit_id'],
                $rate,
                $amount,
                $user['id']
            ]);

            // Increase Stock & Ledger
            InventoryService::increaseStock(
                'RM',
                $rmId,
                $rm['rm_code'],
                $rm['material_name'],
                $warehouseId,
                $quantity,
                $rm['unit_id'],
                $rate,
                'PURCHASE',
                $invoiceNumber,
                $invoiceNumber,
                null,
                $purchaseDate,
                "Direct Purchase: {$supplierName} (Inv: {$invoiceNumber}) - {$remarks}",
                $user['id']
            );

            $db->commit();
            Response::success(null, 'Purchase recorded and RM stock updated successfully.');
        } catch (Exception $e) {
            $db->rollBack();
            Response::error($e->getMessage(), null, 400);
        }
    }

    /**
     * List Purchase History / Line items
     */
    public static function index(): void {
        Auth::requireAuth();
        $db = Database::getConnection();

        $fromDate = $_GET['from_date'] ?? null;
        $toDate = $_GET['to_date'] ?? null;
        $search = trim($_GET['search'] ?? '');
        $batchId = $_GET['batch_id'] ?? null;
        $limit = min(500, max(10, (int)($_GET['limit'] ?? 100)));

        $sql = "
            SELECT pi.*, rm.material_name, u.unit_code, w.warehouse_name, pib.batch_code
            FROM purchase_inputs pi
            JOIN raw_materials rm ON pi.rm_id = rm.id
            JOIN units u ON pi.unit_id = u.id
            JOIN warehouses w ON pi.warehouse_id = w.id
            LEFT JOIN purchase_import_batches pib ON pi.purchase_batch_id = pib.id
            WHERE 1=1
        ";

        $params = [];
        if ($fromDate) {
            $sql .= " AND pi.purchase_date >= ?";
            $params[] = $fromDate;
        }
        if ($toDate) {
            $sql .= " AND pi.purchase_date <= ?";
            $params[] = $toDate;
        }
        if ($batchId) {
            $sql .= " AND pi.purchase_batch_id = ?";
            $params[] = $batchId;
        }
        if ($search) {
            $sql .= " AND (pi.invoice_number LIKE ? OR pi.supplier_name LIKE ? OR pi.tally_item_name LIKE ? OR rm.material_name LIKE ?)";
            $params[] = "%{$search}%";
            $params[] = "%{$search}%";
            $params[] = "%{$search}%";
            $params[] = "%{$search}%";
        }

        $sql .= " ORDER BY pi.purchase_date DESC, pi.id DESC LIMIT {$limit}";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        Response::success($rows);
    }

    /**
     * List Purchase Import Batches
     */
    public static function batches(): void {
        Auth::requireAuth();
        $db = Database::getConnection();

        $stmt = $db->query("
            SELECT pib.*, u.full_name as imported_by_name, ur.full_name as reversed_by_name
            FROM purchase_import_batches pib
            LEFT JOIN users u ON pib.imported_by = u.id
            LEFT JOIN users ur ON pib.reversed_by = ur.id
            ORDER BY pib.id DESC
            LIMIT 50
        ");
        $batches = $stmt->fetchAll();

        Response::success($batches);
    }

    /**
     * Reverse a Purchase Import Batch
     */
    public static function reverseBatch(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $batchId = (int)($input['batch_id'] ?? 0);

        if (!$batchId) {
            Response::error('Batch ID is required.', null, 400);
        }

        try {
            ImportService::reversePurchaseBatch($batchId, $user['id']);
            Response::success(null, 'Purchase batch reversed successfully.');
        } catch (Exception $e) {
            Response::error('Reversal failed: ' . $e->getMessage(), null, 400);
        }
    }
}
