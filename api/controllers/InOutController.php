<?php
// ============================================================
// BHARAT IMPEX — IN / OUT (PURCHASE & SALES) CONTROLLER
// ============================================================

class InOutController {

    /**
     * Get or create parties (Suppliers & Customers)
     */
    public static function parties(): void {
        Auth::requireAuth();
        $db = Database::getConnection();
        $method = $_SERVER['REQUEST_METHOD'];

        if ($method === 'GET') {
            $type = $_GET['type'] ?? 'ALL'; // 'ALL', 'SUPPLIER', 'CUSTOMER'
            $query = "SELECT id, party_name, party_type, phone, email, gstin, address FROM parties WHERE active = 1";
            $params = [];

            if ($type === 'SUPPLIER') {
                $query .= " AND party_type IN ('SUPPLIER', 'BOTH')";
            } elseif ($type === 'CUSTOMER') {
                $query .= " AND party_type IN ('CUSTOMER', 'BOTH')";
            }
            $query .= " ORDER BY party_name ASC";

            $stmt = $db->prepare($query);
            $stmt->execute($params);
            Response::success($stmt->fetchAll());
        } elseif ($method === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true) ?? [];
            $name = trim($input['party_name'] ?? '');
            $type = strtoupper(trim($input['party_type'] ?? 'BOTH'));
            if (!in_array($type, ['SUPPLIER', 'CUSTOMER', 'BOTH'])) $type = 'BOTH';
            $phone = trim($input['phone'] ?? '');
            $email = trim($input['email'] ?? '');
            $gstin = trim($input['gstin'] ?? '');
            $address = trim($input['address'] ?? '');

            if (!$name) {
                Response::error('Party name is required.', null, 400);
            }

            $stmt = $db->prepare("
                INSERT INTO parties (party_name, party_type, phone, email, gstin, address)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    party_type = IF(party_type != VALUES(party_type), 'BOTH', party_type),
                    phone = COALESCE(NULLIF(VALUES(phone), ''), phone),
                    gstin = COALESCE(NULLIF(VALUES(gstin), ''), gstin),
                    address = COALESCE(NULLIF(VALUES(address), ''), address)
            ");
            $stmt->execute([$name, $type, $phone, $email, $gstin, $address]);

            $idStmt = $db->prepare("SELECT id, party_name, party_type FROM parties WHERE party_name = ?");
            $idStmt->execute([$name]);
            Response::success($idStmt->fetch(), 'Party saved successfully.');
        }
    }

    /**
     * Combined list of all items (RMs and FGs) with live stock
     */
    public static function items(): void {
        Auth::requireAuth();
        $db = Database::getConnection();

        // Raw Materials
        $rmStmt = $db->query("
            SELECT 
                rm.id,
                'RM' AS material_type,
                rm.rm_code AS item_code,
                rm.material_name AS item_name,
                rm.unit_id,
                u.unit_code,
                rm.standard_rate AS default_rate,
                COALESCE(s.quantity, 0) AS current_stock
            FROM raw_materials rm
            LEFT JOIN units u ON rm.unit_id = u.id
            LEFT JOIN stock s ON s.material_type = 'RM' AND s.material_id = rm.id AND s.warehouse_id = 1
            WHERE rm.active = 1 AND rm.deleted_at IS NULL
            ORDER BY rm.material_name ASC
        ");
        $rms = $rmStmt->fetchAll();

        // Finished Goods
        $fgStmt = $db->query("
            SELECT 
                fg.id,
                'FG' AS material_type,
                fg.fg_code AS item_code,
                fg.product_name AS item_name,
                fg.unit_id,
                u.unit_code,
                fg.selling_price AS default_rate,
                COALESCE(s.quantity, 0) AS current_stock
            FROM finished_goods fg
            LEFT JOIN units u ON fg.unit_id = u.id
            LEFT JOIN stock s ON s.material_type = 'FG' AND s.material_id = fg.id AND s.warehouse_id = 3
            WHERE fg.active = 1 AND fg.deleted_at IS NULL
            ORDER BY fg.product_name ASC
        ");
        $fgs = $fgStmt->fetchAll();

        // Sub-SKUs (Brand / Client Mappings)
        $subSkus = [];
        try {
            $subSkuStmt = $db->query("
                SELECT 
                    s.id AS sub_sku_id,
                    s.parent_fg_id,
                    s.sub_sku_code,
                    s.sub_sku_name,
                    s.brand_name,
                    s.selling_price,
                    fg.fg_code AS parent_fg_code,
                    fg.product_name AS parent_product_name,
                    fg.unit_id,
                    u.unit_code,
                    COALESCE(stk.quantity, 0) AS current_stock
                FROM sub_skus s
                JOIN finished_goods fg ON s.parent_fg_id = fg.id
                LEFT JOIN units u ON fg.unit_id = u.id
                LEFT JOIN stock stk ON stk.material_type = 'FG' AND stk.material_id = fg.id AND stk.warehouse_id = 3
                WHERE s.active = 1 AND fg.active = 1 AND fg.deleted_at IS NULL
                ORDER BY s.brand_name ASC, s.sub_sku_name ASC
            ");
            $subSkus = $subSkuStmt->fetchAll();
        } catch (Exception $e) {
            $subSkus = [];
        }

        $subSkuFormatted = [];
        foreach ($subSkus as $sub) {
            $subSkuFormatted[] = [
                'id'            => $sub['parent_fg_id'], // Links directly to parent FG ID so stock decreases from parent!
                'sub_sku_id'    => $sub['sub_sku_id'],
                'material_type' => 'FG',
                'item_code'     => $sub['sub_sku_code'],
                'item_name'     => "{$sub['sub_sku_name']} [Brand: {$sub['brand_name']}]",
                'clean_name'    => $sub['sub_sku_name'],
                'brand_name'    => $sub['brand_name'],
                'unit_id'       => $sub['unit_id'],
                'unit_code'     => $sub['unit_code'],
                'default_rate'  => (float)($sub['selling_price'] ?: 0),
                'current_stock' => (float)$sub['current_stock'],
                'is_sub_sku'    => true,
                'parent_fg_id'  => $sub['parent_fg_id'],
                'parent_fg_name'=> $sub['parent_product_name']
            ];
        }

        Response::success([
            'raw_materials'  => $rms,
            'finished_goods' => $fgs,
            'sub_skus'       => $subSkus,
            'all_items'      => array_merge($rms, $fgs, $subSkuFormatted)
        ]);
    }

    /**
     * In / Out Transaction History Register (Combined IN & OUT)
     */
    public static function index(): void {
        Auth::requireAuth();
        $db = Database::getConnection();

        $type = strtoupper($_GET['type'] ?? 'ALL'); // 'ALL', 'IN', 'OUT'
        $fromDate = $_GET['from_date'] ?? null;
        $toDate = $_GET['to_date'] ?? null;
        $search = trim($_GET['search'] ?? '');

        $records = [];

        // 1. IN Records (from purchase_inputs)
        if ($type === 'ALL' || $type === 'IN') {
            $inSql = "
                SELECT 
                    pi.id,
                    'IN' AS transaction_type,
                    pi.purchase_date AS transaction_date,
                    pi.invoice_number,
                    pi.supplier_name AS party_name,
                    'RM' AS material_type,
                    pi.rm_id AS item_id,
                    pi.rm_code AS item_code,
                    pi.tally_item_name AS item_name,
                    pi.warehouse_id,
                    pi.quantity,
                    u.unit_code,
                    pi.rate,
                    pi.amount,
                    pi.source,
                    pi.is_reversed,
                    pi.created_at
                FROM purchase_inputs pi
                LEFT JOIN units u ON pi.unit_id = u.id
                WHERE 1=1
            ";
            $inParams = [];
            if ($fromDate) { $inSql .= " AND pi.purchase_date >= ?"; $inParams[] = $fromDate; }
            if ($toDate) { $inSql .= " AND pi.purchase_date <= ?"; $inParams[] = $toDate; }
            if ($search) {
                $inSql .= " AND (pi.supplier_name LIKE ? OR pi.invoice_number LIKE ? OR pi.tally_item_name LIKE ? OR pi.rm_code LIKE ?)";
                $inParams = array_merge($inParams, ["%$search%", "%$search%", "%$search%", "%$search%"]);
            }
            $inSql .= " ORDER BY pi.purchase_date DESC, pi.id DESC LIMIT 500";
            $stmt = $db->prepare($inSql);
            $stmt->execute($inParams);
            $records = array_merge($records, $stmt->fetchAll());
        }

        // 2. OUT Records (from sale_inputs)
        if ($type === 'ALL' || $type === 'OUT') {
            $outSql = "
                SELECT 
                    si.id,
                    'OUT' AS transaction_type,
                    si.sale_date AS transaction_date,
                    si.invoice_number,
                    si.customer_name AS party_name,
                    'FG' AS material_type,
                    si.fg_id AS item_id,
                    si.fg_code AS item_code,
                    si.tally_item_name AS item_name,
                    si.warehouse_id,
                    si.quantity,
                    u.unit_code,
                    si.rate,
                    si.amount,
                    si.source,
                    si.is_reversed,
                    si.created_at
                FROM sale_inputs si
                LEFT JOIN units u ON si.unit_id = u.id
                WHERE 1=1
            ";
            $outParams = [];
            if ($fromDate) { $outSql .= " AND si.sale_date >= ?"; $outParams[] = $fromDate; }
            if ($toDate) { $outSql .= " AND si.sale_date <= ?"; $outParams[] = $toDate; }
            if ($search) {
                $outSql .= " AND (si.customer_name LIKE ? OR si.invoice_number LIKE ? OR si.tally_item_name LIKE ? OR si.fg_code LIKE ?)";
                $outParams = array_merge($outParams, ["%$search%", "%$search%", "%$search%", "%$search%"]);
            }
            $outSql .= " ORDER BY si.sale_date DESC, si.id DESC LIMIT 500";
            $stmt = $db->prepare($outSql);
            $stmt->execute($outParams);
            $records = array_merge($records, $stmt->fetchAll());
        }

        // Sort combined records by transaction_date DESC, created_at DESC
        usort($records, function ($a, $b) {
            $d = strcmp($b['transaction_date'], $a['transaction_date']);
            if ($d !== 0) return $d;
            return strcmp($b['created_at'] ?? '', $a['created_at'] ?? '');
        });

        Response::success(array_slice($records, 0, 500));
    }

    /**
     * Batch Save In/Out Spreadsheet Entries
     */
    public static function batchSave(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $rows = $input['rows'] ?? [];

        if (empty($rows)) {
            Response::error('No rows submitted for batch save.', null, 400);
        }

        $db = Database::getConnection();
        $db->beginTransaction();

        try {
            $processedCount = 0;
            $now = date('Ymd-His');

            // Cache party upsert statement
            $partyStmt = $db->prepare("
                INSERT INTO parties (party_name, party_type)
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE party_type = IF(party_type != VALUES(party_type), 'BOTH', party_type)
            ");

            foreach ($rows as $index => $row) {
                $type = strtoupper(trim($row['type'] ?? 'IN'));
                if (!in_array($type, ['IN', 'OUT'])) {
                    throw new InvalidArgumentException("Row #" . ($index + 1) . ": Invalid type '{$type}'. Must be IN or OUT.");
                }

                $partyName = trim($row['party_name'] ?? '');
                if (!$partyName) {
                    throw new InvalidArgumentException("Row #" . ($index + 1) . ": Party Name is required.");
                }

                $materialType = strtoupper(trim($row['material_type'] ?? ($type === 'IN' ? 'RM' : 'FG')));
                $itemId = (int)($row['item_id'] ?? 0);
                $quantity = (float)($row['quantity'] ?? 0);
                $rate = (float)($row['rate'] ?? 0);
                $invoiceNumber = trim($row['invoice_number'] ?? '');
                $date = $row['date'] ?? date('Y-m-d');
                $remarks = trim($row['remarks'] ?? '');

                if ($itemId <= 0) {
                    throw new InvalidArgumentException("Row #" . ($index + 1) . ": Please select a valid item.");
                }

                if ($quantity <= 0) {
                    throw new InvalidArgumentException("Row #" . ($index + 1) . ": Quantity must be greater than zero.");
                }

                // Auto-generate invoice/challan number if missing
                if (!$invoiceNumber) {
                    $invoiceNumber = ($type === 'IN' ? 'INW-' : 'DSP-') . date('ymd') . '-' . str_pad($index + 1, 3, '0', STR_PAD_LEFT);
                }

                // Ensure party exists in party master
                $partyPartyType = $type === 'IN' ? 'SUPPLIER' : 'CUSTOMER';
                $partyStmt->execute([$partyName, $partyPartyType]);

                // 1. TRANSACTION TYPE: IN (Purchase Inward / Stock Addition)
                if ($type === 'IN') {
                    if ($materialType === 'RM') {
                        $rmStmt = $db->prepare("SELECT rm_code, material_name, unit_id, standard_rate FROM raw_materials WHERE id = ?");
                        $rmStmt->execute([$itemId]);
                        $rm = $rmStmt->fetch();
                        if (!$rm) throw new RuntimeException("Raw Material [ID: {$itemId}] not found.");

                        $effectiveRate = $rate > 0 ? $rate : (float)$rm['standard_rate'];
                        $amount = round($quantity * $effectiveRate, 2);
                        $warehouseId = (int)($row['warehouse_id'] ?? 1);

                        // Record in purchase_inputs table
                        $db->prepare("
                            INSERT INTO purchase_inputs (
                                purchase_date, invoice_number, supplier_name, tally_item_name,
                                rm_id, rm_code, warehouse_id, quantity, unit_id, rate, amount, source, created_by, created_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'MANUAL_ENTRY', ?, NOW())
                        ")->execute([
                            $date, $invoiceNumber, $partyName, $rm['material_name'],
                            $itemId, $rm['rm_code'], $warehouseId, $quantity, $rm['unit_id'],
                            $effectiveRate, $amount, $user['id']
                        ]);

                        // Stock engine: increase stock & ledger
                        InventoryService::increaseStock(
                            'RM',
                            $itemId,
                            $rm['rm_code'],
                            $rm['material_name'],
                            $warehouseId,
                            $quantity,
                            $rm['unit_id'],
                            $effectiveRate,
                            'PURCHASE',
                            $invoiceNumber,
                            $invoiceNumber,
                            null,
                            $date,
                            "Inward from {$partyName} (Inv: {$invoiceNumber}) - {$remarks}",
                            $user['id']
                        );
                    } else {
                        // Inward of FG (e.g. Return or Production Inward)
                        $fgStmt = $db->prepare("SELECT fg_code, product_name, unit_id, selling_price FROM finished_goods WHERE id = ?");
                        $fgStmt->execute([$itemId]);
                        $fg = $fgStmt->fetch();
                        if (!$fg) throw new RuntimeException("Finished Good [ID: {$itemId}] not found.");

                        $effectiveRate = $rate > 0 ? $rate : (float)$fg['selling_price'];
                        $warehouseId = (int)($row['warehouse_id'] ?? 3);

                        InventoryService::increaseStock(
                            'FG',
                            $itemId,
                            $fg['fg_code'],
                            $fg['product_name'],
                            $warehouseId,
                            $quantity,
                            $fg['unit_id'],
                            $effectiveRate,
                            'PRODUCTION_OUTPUT',
                            $invoiceNumber,
                            $invoiceNumber,
                            null,
                            $date,
                            "FG Inward from {$partyName} (Ref: {$invoiceNumber}) - {$remarks}",
                            $user['id']
                        );
                    }
                } 
                // 2. TRANSACTION TYPE: OUT (Sales Dispatch / Stock Deduction)
                else {
                    if ($materialType === 'FG') {
                        $fgStmt = $db->prepare("SELECT fg_code, product_name, unit_id, selling_price FROM finished_goods WHERE id = ?");
                        $fgStmt->execute([$itemId]);
                        $fg = $fgStmt->fetch();
                        if (!$fg) throw new RuntimeException("Finished Good [ID: {$itemId}] not found.");

                        $effectiveRate = $rate > 0 ? $rate : (float)$fg['selling_price'];
                        $amount = round($quantity * $effectiveRate, 2);
                        $warehouseId = (int)($row['warehouse_id'] ?? 3);

                        $itemNameForSale = !empty($row['clean_name']) ? $row['clean_name'] : (!empty($row['item_name']) ? $row['item_name'] : $fg['product_name']);
                        $subSkuId = !empty($row['sub_sku_id']) ? (int)$row['sub_sku_id'] : null;

                        // Record in sale_inputs table
                        $db->prepare("
                            INSERT INTO sale_inputs (
                                sale_date, invoice_number, customer_name, tally_item_name,
                                fg_id, sub_sku_id, fg_code, warehouse_id, quantity, unit_id, rate, amount, source, created_by, created_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'MANUAL_ENTRY', ?, NOW())
                        ")->execute([
                            $date, $invoiceNumber, $partyName, $itemNameForSale,
                            $itemId, $subSkuId, $fg['fg_code'], $warehouseId, $quantity, $fg['unit_id'],
                            $effectiveRate, $amount, $user['id']
                        ]);

                        // Stock engine: decrease stock & ledger
                        InventoryService::decreaseStock(
                            'FG',
                            $itemId,
                            $fg['fg_code'],
                            $warehouseId,
                            $quantity,
                            $fg['unit_id'],
                            $effectiveRate,
                            'SALE',
                            $invoiceNumber,
                            $invoiceNumber,
                            null,
                            $date,
                            "Dispatch to {$partyName} (Inv: {$invoiceNumber}) - {$remarks}",
                            $user['id']
                        );
                    } else {
                        // Outward of RM (e.g. RM Sale or Subcontract Issue)
                        $rmStmt = $db->prepare("SELECT rm_code, material_name, unit_id, standard_rate FROM raw_materials WHERE id = ?");
                        $rmStmt->execute([$itemId]);
                        $rm = $rmStmt->fetch();
                        if (!$rm) throw new RuntimeException("Raw Material [ID: {$itemId}] not found.");

                        $effectiveRate = $rate > 0 ? $rate : (float)$rm['standard_rate'];
                        $warehouseId = (int)($row['warehouse_id'] ?? 1);

                        InventoryService::decreaseStock(
                            'RM',
                            $itemId,
                            $rm['rm_code'],
                            $warehouseId,
                            $quantity,
                            $rm['unit_id'],
                            $effectiveRate,
                            'SALE',
                            $invoiceNumber,
                            $invoiceNumber,
                            null,
                            $date,
                            "RM Outward to {$partyName} (Ref: {$invoiceNumber}) - {$remarks}",
                            $user['id']
                        );
                    }
                }

                $processedCount++;
            }

            $db->commit();
            Response::success([
                'processed_count' => $processedCount,
            ], "Successfully saved {$processedCount} In/Out entries and updated stock ledger!");
        } catch (Exception $e) {
            $db->rollBack();
            Response::error($e->getMessage(), null, 400);
        }
    }
}
