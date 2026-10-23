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

        // Self-healing: ensure current_stock column on sub_child_parts
        try {
            $db->exec("ALTER TABLE `sub_child_parts` ADD COLUMN `current_stock` DECIMAL(14, 3) NOT NULL DEFAULT 0.000 AFTER `standard_rate`");
        } catch (Exception $e) {}

        // 1. Fetch Warehouses
        $whStmt = $db->query("SELECT id, warehouse_code, warehouse_name, location FROM warehouses WHERE active = 1 ORDER BY id ASC");
        $warehouses = $whStmt->fetchAll();

        // 2. Fetch all stocks by warehouse
        $stockStmt = $db->query("
            SELECT s.material_type, s.material_id, s.warehouse_id, 
                   COALESCE(s.quantity, 0) AS quantity,
                   COALESCE(s.reserved_quantity, 0) AS reserved_quantity,
                   COALESCE(s.available_quantity, 0) AS available_quantity,
                   w.warehouse_code, w.warehouse_name
            FROM stock s
            JOIN warehouses w ON s.warehouse_id = w.id
            WHERE w.active = 1
        ");
        $allStocks = $stockStmt->fetchAll();

        $stocksByMatKey = [];
        foreach ($allStocks as $stk) {
            $key = $stk['material_type'] . '_' . $stk['material_id'];
            if (!isset($stocksByMatKey[$key])) {
                $stocksByMatKey[$key] = [];
            }
            $stocksByMatKey[$key][] = [
                'warehouse_id'       => (int)$stk['warehouse_id'],
                'warehouse_code'     => $stk['warehouse_code'],
                'warehouse_name'     => $stk['warehouse_name'],
                'quantity'           => (float)$stk['quantity'],
                'reserved_quantity'  => (float)$stk['reserved_quantity'],
                'available_quantity' => (float)$stk['available_quantity'],
            ];
        }

        // 3. Fetch Sub-Child Parts (Varieties)
        $subChildParts = [];
        $variantsByRmId = [];
        try {
            $scpStmt = $db->query("
                SELECT 
                    scp.id,
                    scp.parent_rm_id,
                    scp.sub_part_code,
                    scp.sub_part_name,
                    scp.brand_name,
                    scp.party_id,
                    scp.unit_id,
                    scp.standard_rate,
                    COALESCE(scp.current_stock, 0) AS current_stock,
                    p.party_name AS mapped_customer_name
                FROM sub_child_parts scp
                LEFT JOIN parties p ON scp.party_id = p.id
                WHERE scp.active = 1
                ORDER BY scp.brand_name ASC, scp.sub_part_name ASC
            ");
            $subChildParts = $scpStmt->fetchAll();
            foreach ($subChildParts as $scp) {
                $pId = (int)$scp['parent_rm_id'];
                if (!isset($variantsByRmId[$pId])) {
                    $variantsByRmId[$pId] = [];
                }
                $variantsByRmId[$pId][] = [
                    'id'                   => (int)$scp['id'],
                    'parent_rm_id'         => $pId,
                    'sub_part_code'        => $scp['sub_part_code'],
                    'sub_part_name'        => $scp['sub_part_name'],
                    'brand_name'           => $scp['brand_name'],
                    'standard_rate'        => (float)$scp['standard_rate'],
                    'current_stock'        => (float)$scp['current_stock'],
                    'mapped_customer_name' => $scp['mapped_customer_name'] ?? null,
                ];
            }
        } catch (Exception $e) {}

        // 4. Fetch Active BOM Child Parts for Finished Goods
        $bomByFgId = [];
        try {
            $bomStmt = $db->query("
                SELECT b.fg_id, bi.rm_id, rm.rm_code, rm.material_name, bi.quantity_per_unit, u.unit_code,
                       COALESCE(stk.quantity, 0) AS current_stock
                FROM boms b
                JOIN bom_items bi ON bi.bom_id = b.id
                JOIN raw_materials rm ON bi.rm_id = rm.id
                JOIN units u ON bi.unit_id = u.id
                LEFT JOIN stock stk ON stk.material_type = 'RM' AND stk.material_id = rm.id AND stk.warehouse_id = 1
                WHERE b.status = 'ACTIVE'
                ORDER BY b.fg_id, bi.sequence ASC
            ");
            $bomRows = $bomStmt->fetchAll();
            foreach ($bomRows as $bRow) {
                $fgId = (int)$bRow['fg_id'];
                if (!isset($bomByFgId[$fgId])) {
                    $bomByFgId[$fgId] = [];
                }
                $rmId = (int)$bRow['rm_id'];
                $bomByFgId[$fgId][] = [
                    'rm_id'              => $rmId,
                    'rm_code'            => $bRow['rm_code'],
                    'material_name'      => $bRow['material_name'],
                    'quantity_per_unit'  => (float)$bRow['quantity_per_unit'],
                    'unit_code'          => $bRow['unit_code'],
                    'current_stock'      => (float)$bRow['current_stock'],
                    'variants'           => $variantsByRmId[$rmId] ?? [],
                    'godown_stocks'      => $stocksByMatKey["RM_{$rmId}"] ?? []
                ];
            }
        } catch (Exception $e) {}

        // 5. Raw Materials
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
        foreach ($rms as &$rm) {
            $rmId = (int)$rm['id'];
            $rm['current_stock'] = (float)$rm['current_stock'];
            $rm['default_rate']  = (float)$rm['default_rate'];
            $rm['variants']      = $variantsByRmId[$rmId] ?? [];
            $rm['godown_stocks'] = $stocksByMatKey["RM_{$rmId}"] ?? [];
        }

        // 6. Finished Goods
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
        foreach ($fgs as &$fg) {
            $fgId = (int)$fg['id'];
            $fg['current_stock']   = (float)$fg['current_stock'];
            $fg['default_rate']    = (float)$fg['default_rate'];
            $fg['bom_child_parts'] = $bomByFgId[$fgId] ?? [];
            $fg['godown_stocks']   = $stocksByMatKey["FG_{$fgId}"] ?? [];
        }

        // 7. Sub-SKUs (Brand / Client Mappings)
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
            $pId = (int)$sub['parent_fg_id'];
            $subSkuFormatted[] = [
                'id'              => $pId,
                'sub_sku_id'      => $sub['sub_sku_id'],
                'material_type'   => 'FG',
                'item_code'       => $sub['sub_sku_code'],
                'item_name'       => "{$sub['sub_sku_name']} [Brand: {$sub['brand_name']}]",
                'clean_name'      => $sub['sub_sku_name'],
                'brand_name'      => $sub['brand_name'],
                'unit_id'         => $sub['unit_id'],
                'unit_code'       => $sub['unit_code'],
                'default_rate'    => (float)($sub['selling_price'] ?: 0),
                'current_stock'   => (float)$sub['current_stock'],
                'is_sub_sku'      => true,
                'parent_fg_id'    => $pId,
                'parent_fg_name'  => $sub['parent_product_name'],
                'godown_stocks'   => $stocksByMatKey["FG_{$pId}"] ?? [],
                'bom_child_parts' => $bomByFgId[$pId] ?? []
            ];
        }

        Response::success([
            'raw_materials'   => $rms,
            'finished_goods'  => $fgs,
            'sub_skus'        => $subSkus,
            'sub_child_parts' => $subChildParts,
            'warehouses'      => $warehouses,
            'all_items'       => array_merge($rms, $fgs, $subSkuFormatted)
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
                        $warehouseId = InventoryService::getValidWarehouseId((int)($row['warehouse_id'] ?? 0));

                        $subChildPartId = !empty($row['sub_child_part_id']) ? (int)$row['sub_child_part_id'] : null;
                        $subPartName    = !empty($row['sub_part_name']) ? trim($row['sub_part_name']) : null;
                        $subPartBrand   = !empty($row['sub_part_brand']) ? trim($row['sub_part_brand']) : null;

                        if ($subChildPartId && (!$subPartName || !$subPartBrand)) {
                            try {
                                $scpStmt = $db->prepare("SELECT sub_part_name, brand_name, sub_part_code, standard_rate FROM sub_child_parts WHERE id = ?");
                                $scpStmt->execute([$subChildPartId]);
                                $scpRow = $scpStmt->fetch(PDO::FETCH_ASSOC);
                                if ($scpRow) {
                                    $subPartName = $scpRow['sub_part_name'];
                                    $subPartBrand = $scpRow['brand_name'];
                                }
                            } catch (Exception $e) {}
                        }

                        $varLabel = ($subPartBrand || $subPartName)
                            ? " [Variant: " . trim(($subPartBrand ? "[$subPartBrand] " : "") . $subPartName) . "]"
                            : "";

                        // Increase variant stock
                        if ($subChildPartId > 0) {
                            try {
                                $db->prepare("UPDATE sub_child_parts SET current_stock = current_stock + ? WHERE id = ?")
                                   ->execute([$quantity, $subChildPartId]);
                            } catch (Exception $e) {}
                        }

                        $tallyName = $rm['material_name'] . $varLabel;
                        $refNum = $subChildPartId ? "VAR:{$subChildPartId}" : null;

                        // Record in purchase_inputs table
                        $db->prepare("
                            INSERT INTO purchase_inputs (
                                purchase_date, invoice_number, supplier_name, tally_item_name,
                                rm_id, rm_code, warehouse_id, quantity, unit_id, rate, amount, source, reference_number, created_by, created_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'MANUAL_ENTRY', ?, ?, NOW())
                        ")->execute([
                            $date, $invoiceNumber, $partyName, $tallyName,
                            $itemId, $rm['rm_code'], $warehouseId, $quantity, $rm['unit_id'],
                            $effectiveRate, $amount, $refNum, $user['id']
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
                            $refNum,
                            $date,
                            "Inward from {$partyName} (Inv: {$invoiceNumber}){$varLabel} - {$remarks}",
                            $user['id']
                        );
                    } else {
                        // Inward of FG (e.g. Return or Production Inward)
                        $fgStmt = $db->prepare("SELECT fg_code, product_name, unit_id, selling_price FROM finished_goods WHERE id = ?");
                        $fgStmt->execute([$itemId]);
                        $fg = $fgStmt->fetch();
                        if (!$fg) throw new RuntimeException("Finished Good [ID: {$itemId}] not found.");

                        $effectiveRate = $rate > 0 ? $rate : (float)$fg['selling_price'];
                        $warehouseId = InventoryService::getValidWarehouseId((int)($row['warehouse_id'] ?? 0));

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
                        $warehouseId = InventoryService::getValidWarehouseId((int)($row['warehouse_id'] ?? 0));

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
                        $warehouseId = InventoryService::getValidWarehouseId((int)($row['warehouse_id'] ?? 0));

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
