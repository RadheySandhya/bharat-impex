<?php
// ============================================================
// BHARAT IMPEX — SALES CONTROLLER
// ============================================================

class SalesController {

    /**
     * Preview and validate uploaded Sales CSV
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
            $parsed = ImportService::parseCSV($tmpPath, 'SALES');
            $parsed['file_name'] = $originalName;
            Response::success($parsed, 'Sales CSV parsed and validated successfully.');
        } catch (Exception $e) {
            Response::error('Failed to parse CSV: ' . $e->getMessage(), null, 400);
        }
    }

    /**
     * Confirm and execute Sales Import Batch
     */
    public static function confirmImport(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $warehouseId = (int)($input['warehouse_id'] ?? 3);
        $batchData = $input['batch_data'] ?? null;

        if (!$batchData || empty($batchData['rows'])) {
            Response::error('No valid batch data provided for import.', null, 400);
        }

        try {
            $result = ImportService::importSalesBatch($batchData, $warehouseId, $user['id']);
            Response::success($result, 'Sales batch imported successfully and FG stock reduced.');
        } catch (Exception $e) {
            Response::error('Import failed: ' . $e->getMessage(), null, 400);
        }
    }

    /**
     * Direct Sales Entry
     */
    public static function createDirect(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $fgId = (int)($input['fg_id'] ?? 0);
        $warehouseId = (int)($input['warehouse_id'] ?? 3);
        $quantity = (float)($input['quantity'] ?? 0);
        $rate = (float)($input['rate'] ?? 0);
        $invoiceNumber = trim($input['invoice_number'] ?? 'MANUAL-SALE-' . date('Ymd'));
        $customerName = trim($input['customer_name'] ?? 'Direct Customer');
        $saleDate = $input['sale_date'] ?? date('Y-m-d');
        $remarks = trim($input['remarks'] ?? '');

        if (!$fgId || $quantity <= 0) {
            Response::error('Finished Good and positive quantity are required.', null, 400);
        }

        $db = Database::getConnection();
        $db->beginTransaction();

        try {
            $fgStmt = $db->prepare("SELECT fg_code, product_name, unit_id, selling_price FROM finished_goods WHERE id = ?");
            $fgStmt->execute([$fgId]);
            $fg = $fgStmt->fetch();

            if (!$fg) throw new RuntimeException("Finished good not found.");

            $effectiveRate = $rate ?: (float)$fg['selling_price'];
            $amount = round($quantity * $effectiveRate, 2);

            // Record Sales Line
            $db->prepare("
                INSERT INTO sale_inputs (
                    sale_date, invoice_number, customer_name, tally_item_name,
                    fg_id, fg_code, warehouse_id, quantity, unit_id, rate, amount, source, created_by, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'MANUAL_ENTRY', ?, NOW())
            ")->execute([
                $saleDate,
                $invoiceNumber,
                $customerName,
                $fg['product_name'],
                $fgId,
                $fg['fg_code'],
                $warehouseId,
                $quantity,
                $fg['unit_id'],
                $effectiveRate,
                $amount,
                $user['id']
            ]);

            // Decrease FG Stock & Ledger
            InventoryService::decreaseStock(
                'FG',
                $fgId,
                $fg['fg_code'],
                $warehouseId,
                $quantity,
                $fg['unit_id'],
                $effectiveRate,
                'SALE',
                $invoiceNumber,
                $invoiceNumber,
                null,
                $saleDate,
                "Direct Sale: {$customerName} (Inv: {$invoiceNumber}) - {$remarks}",
                $user['id']
            );

            $db->commit();
            Response::success(null, 'Sale recorded and FG stock decreased successfully.');
        } catch (Exception $e) {
            $db->rollBack();
            Response::error($e->getMessage(), null, 400);
        }
    }

    /**
     * List Sales History / Line items
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
            SELECT si.*, fg.product_name, u.unit_code, w.warehouse_name, sib.batch_code
            FROM sale_inputs si
            JOIN finished_goods fg ON si.fg_id = fg.id
            JOIN units u ON si.unit_id = u.id
            JOIN warehouses w ON si.warehouse_id = w.id
            LEFT JOIN sale_import_batches sib ON si.sale_batch_id = sib.id
            WHERE 1=1
        ";

        $params = [];
        if ($fromDate) {
            $sql .= " AND si.sale_date >= ?";
            $params[] = $fromDate;
        }
        if ($toDate) {
            $sql .= " AND si.sale_date <= ?";
            $params[] = $toDate;
        }
        if ($batchId) {
            $sql .= " AND si.sale_batch_id = ?";
            $params[] = $batchId;
        }
        if ($search) {
            $sql .= " AND (si.invoice_number LIKE ? OR si.customer_name LIKE ? OR si.tally_item_name LIKE ? OR fg.product_name LIKE ?)";
            $params[] = "%{$search}%";
            $params[] = "%{$search}%";
            $params[] = "%{$search}%";
            $params[] = "%{$search}%";
        }

        $sql .= " ORDER BY si.sale_date DESC, si.id DESC LIMIT {$limit}";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        Response::success($rows);
    }

    /**
     * List Sales Import Batches
     */
    public static function batches(): void {
        Auth::requireAuth();
        $db = Database::getConnection();

        $stmt = $db->query("
            SELECT sib.*, u.full_name as imported_by_name, ur.full_name as reversed_by_name
            FROM sale_import_batches sib
            LEFT JOIN users u ON sib.imported_by = u.id
            LEFT JOIN users ur ON sib.reversed_by = ur.id
            ORDER BY sib.id DESC
            LIMIT 50
        ");
        $batches = $stmt->fetchAll();

        Response::success($batches);
    }

    /**
     * Reverse a Sales Import Batch
     */
    public static function reverseBatch(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $batchId = (int)($input['batch_id'] ?? 0);

        if (!$batchId) {
            Response::error('Batch ID is required.', null, 400);
        }

        try {
            ImportService::reverseSalesBatch($batchId, $user['id']);
            Response::success(null, 'Sales batch reversed successfully.');
        } catch (Exception $e) {
            Response::error('Reversal failed: ' . $e->getMessage(), null, 400);
        }
    }
}
