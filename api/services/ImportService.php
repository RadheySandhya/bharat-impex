<?php
// ============================================================
// BHARAT IMPEX — IMPORT SERVICE (CSV PARSER & BATCH ENGINE)
// ============================================================

class ImportService {

    /**
     * Parse and validate CSV data for Purchase or Sales
     */
    public static function parseCSV(string $filePath, string $type = 'PURCHASE'): array {
        if (!file_exists($filePath)) {
            throw new InvalidArgumentException("File not found at path: {$filePath}");
        }

        $fileHash = hash_file('sha256', $filePath);
        $fileName = basename($filePath);
        $db = Database::getConnection();

        // Check if identical hash was imported previously
        $table = $type === 'PURCHASE' ? 'purchase_import_batches' : 'sale_import_batches';
        $dupStmt = $db->prepare("SELECT id, batch_code, file_name, imported_at, status FROM {$table} WHERE file_hash = ? AND status = 'IMPORTED'");
        $dupStmt->execute([$fileHash]);
        $existingBatch = $dupStmt->fetch();

        $rows = [];
        $handle = fopen($filePath, 'r');
        if (!$handle) {
            throw new RuntimeException("Unable to open CSV file.");
        }

        $headers = [];
        $headerLine = fgetcsv($handle, 4096, ",");
        if ($headerLine) {
            foreach ($headerLine as $h) {
                $headers[] = trim(preg_replace('/[\x00-\x1F\x80-\xFF]/', '', $h)); // sanitize BOM/whitespace
            }
        }

        // Detect column indices
        $itemCol = self::findColumn($headers, ['item', 'item name', 'tally item', 'particulars', 'product', 'description', 'material']);
        $qtyCol = self::findColumn($headers, ['qty', 'quantity', 'billed qty', 'actual qty', 'pcs', 'kg', 'volume']);
        $dateCol = self::findColumn($headers, ['date', 'purchase date', 'invoice date', 'vch date', 'bill date', 'sale date']);
        $rateCol = self::findColumn($headers, ['rate', 'price', 'unit price', 'rate / unit', 'standard rate']);
        $amountCol = self::findColumn($headers, ['amount', 'total', 'net amount', 'value', 'inv amount']);
        $partyCol = self::findColumn($headers, ['party', 'party name', 'supplier', 'customer', 'ledger name', 'vendor']);
        $invoiceCol = self::findColumn($headers, ['invoice', 'invoice no', 'inv no', 'vch no', 'bill no', 'voucher no']);
        $unitCol = self::findColumn($headers, ['unit', 'uom', 'unit of measure', 'measurement']);

        $materialType = $type === 'PURCHASE' ? 'RM' : 'FG';

        $mapStmt = $db->prepare("
            SELECT external_item_name, internal_item_id, internal_item_code, status
            FROM item_mappings
            WHERE material_type = ? AND active = 1
        ");
        $mapStmt->execute([$materialType]);
        $allMappings = [];
        while ($m = $mapStmt->fetch()) {
            $allMappings[strtoupper(trim($m['external_item_name']))] = $m;
        }

        // Auto-resolve Sub-SKUs & direct Finished Goods to parent FG ID
        if ($materialType === 'FG') {
            // 1. All active Sub-SKUs
            $subSkuStmt = $db->query("
                SELECT s.sub_sku_name, s.sub_sku_code, s.parent_fg_id, fg.fg_code
                FROM sub_skus s
                JOIN finished_goods fg ON s.parent_fg_id = fg.id
                WHERE s.active = 1
            ");
            while ($s = $subSkuStmt->fetch()) {
                $subKeyName = strtoupper(trim($s['sub_sku_name']));
                $subKeyCode = strtoupper(trim($s['sub_sku_code']));
                if (!isset($allMappings[$subKeyName])) {
                    $allMappings[$subKeyName] = [
                        'external_item_name' => $s['sub_sku_name'],
                        'internal_item_id'   => $s['parent_fg_id'],
                        'internal_item_code' => $s['fg_code'],
                        'status'             => 'MAPPED'
                    ];
                }
                if ($subKeyCode && !isset($allMappings[$subKeyCode])) {
                    $allMappings[$subKeyCode] = [
                        'external_item_name' => $s['sub_sku_code'],
                        'internal_item_id'   => $s['parent_fg_id'],
                        'internal_item_code' => $s['fg_code'],
                        'status'             => 'MAPPED'
                    ];
                }
            }

            // 2. Direct Finished Goods names and codes
            $fgDirectStmt = $db->query("SELECT id, fg_code, product_name FROM finished_goods WHERE active = 1");
            while ($fgRow = $fgDirectStmt->fetch()) {
                $fgNameKey = strtoupper(trim($fgRow['product_name']));
                $fgCodeKey = strtoupper(trim($fgRow['fg_code']));
                if (!isset($allMappings[$fgNameKey])) {
                    $allMappings[$fgNameKey] = [
                        'external_item_name' => $fgRow['product_name'],
                        'internal_item_id'   => $fgRow['id'],
                        'internal_item_code' => $fgRow['fg_code'],
                        'status'             => 'MAPPED'
                    ];
                }
                if (!isset($allMappings[$fgCodeKey])) {
                    $allMappings[$fgCodeKey] = [
                        'external_item_name' => $fgRow['fg_code'],
                        'internal_item_id'   => $fgRow['id'],
                        'internal_item_code' => $fgRow['fg_code'],
                        'status'             => 'MAPPED'
                    ];
                }
            }
        }

        $lineNum = 1;
        $totalRows = 0;
        $validRows = 0;
        $unmappedRows = 0;
        $invalidRows = 0;
        $parsedRows = [];

        while (($data = fgetcsv($handle, 4096, ",")) !== false) {
            $lineNum++;
            if (empty(array_filter($data))) continue; // Skip blank lines

            $totalRows++;
            $rawItem = $itemCol !== -1 ? trim($data[$itemCol] ?? '') : '';
            $rawQty = $qtyCol !== -1 ? (float)str_replace([',', ' '], '', $data[$qtyCol] ?? '0') : 0.0;
            $rawDate = $dateCol !== -1 ? trim($data[$dateCol] ?? '') : date('Y-m-d');
            $rawRate = $rateCol !== -1 ? (float)str_replace([',', ' '], '', $data[$rateCol] ?? '0') : 0.0;
            $rawAmount = $amountCol !== -1 ? (float)str_replace([',', ' '], '', $data[$amountCol] ?? '0') : round($rawQty * $rawRate, 2);
            $rawParty = $partyCol !== -1 ? trim($data[$partyCol] ?? '') : 'General Party';
            $rawInvoice = $invoiceCol !== -1 ? trim($data[$invoiceCol] ?? '') : 'CSV-' . date('Ymd');
            $rawUnit = $unitCol !== -1 ? strtoupper(trim($data[$unitCol] ?? '')) : '';

            // Standardize Date
            $stdDate = self::normalizeDate($rawDate);

            // Lookup mapping
            $lookupKey = strtoupper($rawItem);
            $mapped = $allMappings[$lookupKey] ?? null;

            $rowStatus = 'VALID';
            $validationMsg = '';

            if (empty($rawItem)) {
                $rowStatus = 'INVALID';
                $validationMsg = 'Missing item name';
                $invalidRows++;
            } elseif ($rawQty <= 0) {
                $rowStatus = 'INVALID';
                $validationMsg = 'Quantity must be positive number';
                $invalidRows++;
            } elseif (!$mapped) {
                $rowStatus = 'UNMAPPED';
                $validationMsg = 'No mapping found for this Tally item name';
                $unmappedRows++;
            } else {
                $validRows++;
            }

            $parsedRows[] = [
                'row_number'      => $lineNum,
                'tally_item_name' => $rawItem,
                'quantity'        => $rawQty,
                'unit'            => $rawUnit ?: ($mapped ? ($type === 'PURCHASE' ? 'KG' : 'PCS') : ''),
                'rate'            => $rawRate,
                'amount'          => $rawAmount,
                'date'            => $stdDate,
                'party_name'      => $rawParty,
                'invoice_number'  => $rawInvoice,
                'status'          => $rowStatus,
                'validation_msg'  => $validationMsg,
                'mapping'         => $mapped ? [
                    'internal_id'   => $mapped['internal_item_id'],
                    'internal_code' => $mapped['internal_item_code'],
                ] : null
            ];
        }
        fclose($handle);

        return [
            'file_name'        => $fileName,
            'file_hash'        => $fileHash,
            'is_duplicate'     => !empty($existingBatch),
            'duplicate_batch'  => $existingBatch,
            'type'             => $type,
            'total_rows'       => $totalRows,
            'valid_rows'       => $validRows,
            'unmapped_rows'    => $unmappedRows,
            'invalid_rows'     => $invalidRows,
            'detected_headers' => $headers,
            'rows'             => $parsedRows
        ];
    }

    /**
     * Import Purchase CSV batch into Database & Update Raw Material Stock
     */
    public static function importPurchaseBatch(array $batchData, int $warehouseId = 1, ?int $userId = null): array {
        $db = Database::getConnection();
        $db->beginTransaction();

        try {
            $seqStmt = $db->query("SELECT MAX(id) FROM purchase_import_batches");
            $maxId = (int)($seqStmt->fetchColumn() ?: 0) + 1;
            $batchCode = 'PUR-BATCH-' . str_pad($maxId, 5, '0', STR_PAD_LEFT);

            // Create Batch Header
            $batchStmt = $db->prepare("
                INSERT INTO purchase_import_batches (
                    batch_code, file_name, file_hash, total_rows, successful_rows,
                    failed_rows, unmapped_rows, status, imported_by, imported_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'IMPORTED', ?, NOW())
            ");
            $batchStmt->execute([
                $batchCode,
                $batchData['file_name'] ?? 'purchase_upload.csv',
                $batchData['file_hash'] ?? hash('sha256', time()),
                count($batchData['rows']),
                0, // will update
                0,
                0,
                $userId
            ]);
            $batchId = (int)$db->lastInsertId();

            $successCount = 0;
            $purInsertStmt = $db->prepare("
                INSERT INTO purchase_inputs (
                    purchase_batch_id, purchase_date, invoice_number, supplier_name,
                    tally_item_name, rm_id, rm_code, warehouse_id, quantity, unit_id, rate, amount,
                    source, created_by, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'TALLY_CSV', ?, NOW())
            ");

            foreach ($batchData['rows'] as $row) {
                if ($row['status'] !== 'VALID' && empty($row['mapping'])) {
                    continue; // Skip invalid or unresolved unmapped
                }

                $rmId = (int)$row['mapping']['internal_id'];
                
                // Fetch RM details
                $rmStmt = $db->prepare("SELECT rm_code, material_name, unit_id, standard_rate FROM raw_materials WHERE id = ?");
                $rmStmt->execute([$rmId]);
                $rm = $rmStmt->fetch();

                if (!$rm) continue;

                $qty = (float)$row['quantity'];
                $rate = (float)($row['rate'] ?: $rm['standard_rate']);
                $amount = (float)($row['amount'] ?: ($qty * $rate));
                $unitId = (int)$rm['unit_id'];
                $invoice = $row['invoice_number'] ?: $batchCode;
                $supplier = $row['party_name'] ?: 'Tally Supplier';
                $pDate = $row['date'] ?: date('Y-m-d');

                // 1. Insert Purchase Line
                $purInsertStmt->execute([
                    $batchId,
                    $pDate,
                    $invoice,
                    $supplier,
                    $row['tally_item_name'],
                    $rmId,
                    $rm['rm_code'],
                    $warehouseId,
                    $qty,
                    $unitId,
                    $rate,
                    $amount,
                    $userId
                ]);

                // 2. Increase Raw Material Stock via Central Engine
                InventoryService::increaseStock(
                    'RM',
                    $rmId,
                    $rm['rm_code'],
                    $rm['material_name'],
                    $warehouseId,
                    $qty,
                    $unitId,
                    $rate,
                    'PURCHASE',
                    $batchCode,
                    $invoice,
                    null,
                    $pDate,
                    "Purchase import from {$supplier} (Inv: {$invoice})",
                    $userId
                );

                $successCount++;
            }

            // Update batch counts
            $db->prepare("
                UPDATE purchase_import_batches 
                SET successful_rows = ?, failed_rows = ?, updated_at = NOW() 
                WHERE id = ?
            ")->execute([$successCount, count($batchData['rows']) - $successCount, $batchId]);

            AuditService::log('PURCHASE_BATCH_IMPORTED', 'PURCHASE', $batchCode, null, [
                'batch_id'       => $batchId,
                'successful_rows'=> $successCount,
                'file_name'      => $batchData['file_name']
            ]);

            $db->commit();
            return [
                'batch_id'        => $batchId,
                'batch_code'      => $batchCode,
                'successful_rows' => $successCount
            ];
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }

    /**
     * Import Sales CSV batch into Database & Decrease Finished Goods Stock
     */
    public static function importSalesBatch(array $batchData, int $warehouseId = 3, ?int $userId = null): array {
        $db = Database::getConnection();
        $db->beginTransaction();

        try {
            $seqStmt = $db->query("SELECT MAX(id) FROM sale_import_batches");
            $maxId = (int)($seqStmt->fetchColumn() ?: 0) + 1;
            $batchCode = 'SALE-BATCH-' . str_pad($maxId, 5, '0', STR_PAD_LEFT);

            // Create Batch Header
            $batchStmt = $db->prepare("
                INSERT INTO sale_import_batches (
                    batch_code, file_name, file_hash, total_rows, successful_rows,
                    failed_rows, unmapped_rows, status, imported_by, imported_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'IMPORTED', ?, NOW())
            ");
            $batchStmt->execute([
                $batchCode,
                $batchData['file_name'] ?? 'sales_upload.csv',
                $batchData['file_hash'] ?? hash('sha256', time()),
                count($batchData['rows']),
                0,
                0,
                0,
                $userId
            ]);
            $batchId = (int)$db->lastInsertId();

            $successCount = 0;
            $saleInsertStmt = $db->prepare("
                INSERT INTO sale_inputs (
                    sale_batch_id, sale_date, invoice_number, customer_name,
                    tally_item_name, fg_id, fg_code, warehouse_id, quantity, unit_id, rate, amount,
                    source, created_by, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'TALLY_CSV', ?, NOW())
            ");

            foreach ($batchData['rows'] as $row) {
                if ($row['status'] !== 'VALID' && empty($row['mapping'])) {
                    continue;
                }

                $fgId = (int)$row['mapping']['internal_id'];
                
                // Fetch FG details
                $fgStmt = $db->prepare("SELECT fg_code, product_name, unit_id, selling_price FROM finished_goods WHERE id = ?");
                $fgStmt->execute([$fgId]);
                $fg = $fgStmt->fetch();

                if (!$fg) continue;

                $qty = (float)$row['quantity'];
                $rate = (float)($row['rate'] ?: $fg['selling_price']);
                $amount = (float)($row['amount'] ?: ($qty * $rate));
                $unitId = (int)$fg['unit_id'];
                $invoice = $row['invoice_number'] ?: $batchCode;
                $customer = $row['party_name'] ?: 'Direct Customer';
                $sDate = $row['date'] ?: date('Y-m-d');

                // 1. Insert Sales Line
                $saleInsertStmt->execute([
                    $batchId,
                    $sDate,
                    $invoice,
                    $customer,
                    $row['tally_item_name'],
                    $fgId,
                    $fg['fg_code'],
                    $warehouseId,
                    $qty,
                    $unitId,
                    $rate,
                    $amount,
                    $userId
                ]);

                // 2. Decrease Finished Goods Stock via Central Engine (Throws error if insufficient stock)
                InventoryService::decreaseStock(
                    'FG',
                    $fgId,
                    $fg['fg_code'],
                    $warehouseId,
                    $qty,
                    $unitId,
                    $rate,
                    'SALE',
                    $batchCode,
                    $invoice,
                    null,
                    $sDate,
                    "Sales dispatch to {$customer} (Inv: {$invoice})",
                    $userId
                );

                $successCount++;
            }

            // Update batch counts
            $db->prepare("
                UPDATE sale_import_batches 
                SET successful_rows = ?, failed_rows = ?, updated_at = NOW() 
                WHERE id = ?
            ")->execute([$successCount, count($batchData['rows']) - $successCount, $batchId]);

            AuditService::log('SALES_BATCH_IMPORTED', 'SALES', $batchCode, null, [
                'batch_id'        => $batchId,
                'successful_rows' => $successCount,
                'file_name'       => $batchData['file_name']
            ]);

            $db->commit();
            return [
                'batch_id'        => $batchId,
                'batch_code'      => $batchCode,
                'successful_rows' => $successCount
            ];
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }

    /**
     * Reverse a complete Purchase Import Batch cleanly
     */
    public static function reversePurchaseBatch(int $batchId, ?int $userId = null): void {
        $db = Database::getConnection();
        $db->beginTransaction();

        try {
            $bStmt = $db->prepare("SELECT * FROM purchase_import_batches WHERE id = ? FOR UPDATE");
            $bStmt->execute([$batchId]);
            $batch = $bStmt->fetch();

            if (!$batch || $batch['status'] === 'REVERSED') {
                throw new RuntimeException("Batch cannot be reversed or is already reversed.");
            }

            $itemsStmt = $db->prepare("SELECT * FROM purchase_inputs WHERE purchase_batch_id = ? AND is_reversed = 0");
            $itemsStmt->execute([$batchId]);
            $items = $itemsStmt->fetchAll();

            foreach ($items as $item) {
                // Reverse RM stock decrease
                InventoryService::decreaseStock(
                    'RM',
                    $item['rm_id'],
                    $item['rm_code'],
                    $item['warehouse_id'],
                    (float)$item['quantity'],
                    $item['unit_id'],
                    (float)$item['rate'],
                    'PURCHASE_REVERSAL',
                    $batch['batch_code'],
                    $batch['batch_code'],
                    null,
                    date('Y-m-d'),
                    "Reversal of Purchase Batch {$batch['batch_code']}",
                    $userId
                );

                $db->prepare("UPDATE purchase_inputs SET is_reversed = 1 WHERE id = ?")->execute([$item['id']]);
            }

            $db->prepare("
                UPDATE purchase_import_batches 
                SET status = 'REVERSED', reversed_by = ?, reversed_at = NOW() 
                WHERE id = ?
            ")->execute([$userId, $batchId]);

            AuditService::log('PURCHASE_BATCH_REVERSED', 'PURCHASE', $batch['batch_code'], ['status' => 'IMPORTED'], ['status' => 'REVERSED']);

            $db->commit();
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }

    /**
     * Reverse a complete Sales Import Batch cleanly
     */
    public static function reverseSalesBatch(int $batchId, ?int $userId = null): void {
        $db = Database::getConnection();
        $db->beginTransaction();

        try {
            $bStmt = $db->prepare("SELECT * FROM sale_import_batches WHERE id = ? FOR UPDATE");
            $bStmt->execute([$batchId]);
            $batch = $bStmt->fetch();

            if (!$batch || $batch['status'] === 'REVERSED') {
                throw new RuntimeException("Batch cannot be reversed or is already reversed.");
            }

            $itemsStmt = $db->prepare("
                SELECT si.*, fg.product_name 
                FROM sale_inputs si
                JOIN finished_goods fg ON si.fg_id = fg.id
                WHERE si.sale_batch_id = ? AND si.is_reversed = 0
            ");
            $itemsStmt->execute([$batchId]);
            $items = $itemsStmt->fetchAll();

            foreach ($items as $item) {
                // Reverse FG stock increase
                InventoryService::increaseStock(
                    'FG',
                    $item['fg_id'],
                    $item['fg_code'],
                    $item['product_name'],
                    $item['warehouse_id'],
                    (float)$item['quantity'],
                    $item['unit_id'],
                    (float)$item['rate'],
                    'SALE_REVERSAL',
                    $batch['batch_code'],
                    $batch['batch_code'],
                    null,
                    date('Y-m-d'),
                    "Reversal of Sales Batch {$batch['batch_code']}",
                    $userId
                );

                $db->prepare("UPDATE sale_inputs SET is_reversed = 1 WHERE id = ?")->execute([$item['id']]);
            }

            $db->prepare("
                UPDATE sale_import_batches 
                SET status = 'REVERSED', reversed_by = ?, reversed_at = NOW() 
                WHERE id = ?
            ")->execute([$userId, $batchId]);

            AuditService::log('SALES_BATCH_REVERSED', 'SALES', $batch['batch_code'], ['status' => 'IMPORTED'], ['status' => 'REVERSED']);

            $db->commit();
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }

    private static function findColumn(array $headers, array $candidates): int {
        foreach ($headers as $index => $header) {
            $clean = strtolower(trim($header));
            foreach ($candidates as $candidate) {
                if ($clean === strtolower($candidate) || strpos($clean, strtolower($candidate)) !== false) {
                    return $index;
                }
            }
        }
        return -1;
    }

    private static function normalizeDate(string $rawDate): string {
        $rawDate = trim($rawDate);
        if (empty($rawDate)) return date('Y-m-d');

        // Handle DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, DD-MMM-YYYY
        $timestamp = strtotime($rawDate);
        if ($timestamp !== false) {
            return date('Y-m-d', $timestamp);
        }

        // Try parsing DD/MM/YYYY format
        if (preg_match('/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/', $rawDate, $m)) {
            $year = strlen($m[3]) === 2 ? ('20' . $m[3]) : $m[3];
            return sprintf('%04d-%02d-%02d', $year, $m[2], $m[1]);
        }

        return date('Y-m-d');
    }
}
