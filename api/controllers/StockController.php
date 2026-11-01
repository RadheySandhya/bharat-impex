<?php
// ============================================================
// BHARAT IMPEX — STOCK CONTROLLER
// ============================================================

class StockController {

    /**
     * List all stock records with real-time balance, reserved and available quantities
     */
    public static function index(): void {
        Auth::requireAuth();
        $db = Database::getConnection();

        $type = $_GET['material_type'] ?? null;
        $warehouseId = $_GET['warehouse_id'] ?? null;
        $search = trim($_GET['search'] ?? '');
        $status = $_GET['status'] ?? null; // 'low_stock', 'out_of_stock', 'available'

        $sql = "
            SELECT s.*, u.unit_code, u.unit_name, w.warehouse_name, w.warehouse_code,
                   CASE 
                       WHEN s.material_type = 'RM' THEN rm.reorder_level
                       WHEN s.material_type = 'FG' THEN fg.reorder_level
                       ELSE 0 
                   END as reorder_level,
                   CASE 
                       WHEN s.material_type = 'RM' THEN rm.minimum_stock
                       WHEN s.material_type = 'FG' THEN fg.minimum_stock
                       ELSE 0 
                   END as minimum_stock,
                   CASE 
                       WHEN s.material_type = 'RM' THEN rm.maximum_stock
                       WHEN s.material_type = 'FG' THEN fg.maximum_stock
                       ELSE 0 
                   END as maximum_stock,
                   CASE 
                       WHEN s.material_type = 'RM' THEN rm.standard_rate
                       WHEN s.material_type = 'FG' THEN fg.selling_price
                       WHEN s.material_type = 'SCRAP' THEN sm.standard_rate
                       ELSE 0 
                   END as unit_price
            FROM stock s
            JOIN units u ON s.unit_id = u.id
            JOIN warehouses w ON s.warehouse_id = w.id
            LEFT JOIN raw_materials rm ON s.material_type = 'RM' AND s.material_id = rm.id
            LEFT JOIN finished_goods fg ON s.material_type = 'FG' AND s.material_id = fg.id
            LEFT JOIN scrap_materials sm ON s.material_type = 'SCRAP' AND s.material_id = sm.id
            WHERE 1=1
              AND (
                  (s.material_type = 'RM' AND rm.id IS NOT NULL AND rm.deleted_at IS NULL AND (rm.active IS NULL OR rm.active = 1)) OR
                  (s.material_type = 'FG' AND fg.id IS NOT NULL AND fg.deleted_at IS NULL AND (fg.active IS NULL OR fg.active = 1)) OR
                  (s.material_type NOT IN ('RM', 'FG'))
              )
        ";

        $params = [];
        if ($type) {
            $sql .= " AND s.material_type = ?";
            $params[] = $type;
        }
        if ($warehouseId) {
            $sql .= " AND s.warehouse_id = ?";
            $params[] = $warehouseId;
        }
        if ($search) {
            $sql .= " AND (s.material_code LIKE ? OR s.material_name LIKE ?)";
            $params[] = "%{$search}%";
            $params[] = "%{$search}%";
        }
        if ($status === 'low_stock') {
            $sql .= " AND s.available_quantity <= (CASE WHEN s.material_type = 'RM' THEN rm.reorder_level WHEN s.material_type = 'FG' THEN fg.reorder_level ELSE 0 END) AND s.available_quantity > 0";
        } elseif ($status === 'out_of_stock') {
            $sql .= " AND s.available_quantity <= 0";
        }

        $sql .= " ORDER BY s.material_type ASC, s.material_code ASC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $stock = $stmt->fetchAll();

        Response::success($stock);
    }

    /**
     * Stock Ledger history
     */
    public static function ledger(): void {
        Auth::requireAuth();
        $db = Database::getConnection();

        $matType = $_GET['material_type'] ?? null;
        $matId = $_GET['material_id'] ?? null;
        $txType = $_GET['transaction_type'] ?? null;
        $warehouseId = $_GET['warehouse_id'] ?? null;
        $fromDate = $_GET['from_date'] ?? null;
        $toDate = $_GET['to_date'] ?? null;
        $search = trim($_GET['search'] ?? '');
        $limit = min(500, max(10, (int)($_GET['limit'] ?? 100)));

        $sql = "
            SELECT sl.*, u.unit_code, w.warehouse_name, usr.full_name as created_by_name,
                   CASE 
                       WHEN sl.material_type = 'RM' THEN rm.material_name
                       WHEN sl.material_type = 'FG' THEN fg.product_name
                       WHEN sl.material_type = 'SCRAP' THEN sm.scrap_name
                       ELSE sl.material_code 
                   END as resolved_material_name
            FROM stock_ledger sl
            JOIN units u ON sl.unit_id = u.id
            JOIN warehouses w ON sl.warehouse_id = w.id
            LEFT JOIN users usr ON sl.created_by = usr.id
            LEFT JOIN raw_materials rm ON sl.material_type = 'RM' AND sl.material_id = rm.id
            LEFT JOIN finished_goods fg ON sl.material_type = 'FG' AND sl.material_id = fg.id
            LEFT JOIN scrap_materials sm ON sl.material_type = 'SCRAP' AND sl.material_id = sm.id
            WHERE 1=1
        ";

        $params = [];
        if ($matType) {
            $sql .= " AND sl.material_type = ?";
            $params[] = $matType;
        }
        if ($matId) {
            $sql .= " AND sl.material_id = ?";
            $params[] = $matId;
        }
        if ($txType) {
            $sql .= " AND sl.transaction_type = ?";
            $params[] = $txType;
        }
        if ($warehouseId) {
            $sql .= " AND sl.warehouse_id = ?";
            $params[] = $warehouseId;
        }
        if ($fromDate) {
            $sql .= " AND sl.transaction_date >= ?";
            $params[] = $fromDate;
        }
        if ($toDate) {
            $sql .= " AND sl.transaction_date <= ?";
            $params[] = $toDate;
        }
        if ($search) {
            $sql .= " AND (sl.material_code LIKE ? OR sl.reference_number LIKE ? OR sl.remarks LIKE ?)";
            $params[] = "%{$search}%";
            $params[] = "%{$search}%";
            $params[] = "%{$search}%";
        }

        $sql .= " ORDER BY sl.id DESC LIMIT {$limit}";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        Response::success($rows);
    }

    /**
     * Submit Stock Adjustment
     */
    public static function adjust(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $matType = $input['material_type'] ?? '';
        $matId = (int)($input['material_id'] ?? 0);
        $matCode = $input['material_code'] ?? '';
        $matName = $input['material_name'] ?? '';
        $warehouseId = (int)($input['warehouse_id'] ?? 1);
        $physicalQty = (float)($input['physical_quantity'] ?? 0);
        $unitId = (int)($input['unit_id'] ?? 1);
        $reason = trim($input['reason'] ?? 'Physical Verification');
        $remarks = trim($input['remarks'] ?? '');

        if (empty($matType) || empty($matId) || empty($reason)) {
            Response::error('Material, Reason, and Physical Quantity are required.', null, 400);
        }

        try {
            $res = InventoryService::adjustStock(
                $matType,
                $matId,
                $matCode,
                $matName,
                $warehouseId,
                $physicalQty,
                $unitId,
                $reason,
                $remarks,
                $user['id']
            );
            Response::success($res, 'Stock adjusted successfully.');
        } catch (Exception $e) {
            Response::error($e->getMessage(), null, 400);
        }
    }

    /**
     * Submit Stock Transfer (one or many lines) from one godown to another
     */
    public static function transfer(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $db = Database::getConnection();

        $sourceWh = (int)($input['source_warehouse_id'] ?? 0);
        $destWh = (int)($input['destination_warehouse_id'] ?? 0);
        $items = $input['items'] ?? [];
        $remarks = trim($input['remarks'] ?? '');

        if (!$sourceWh || !$destWh || empty($items) || !is_array($items)) {
            Response::error('Source, Destination warehouse and items are required.', null, 400);
        }

        // Resolve code / name / unit on the server so the client only needs type + id + qty
        $resolved = [];
        foreach ($items as $idx => $it) {
            $type = strtoupper(trim((string)($it['material_type'] ?? '')));
            $matId = (int)($it['material_id'] ?? 0);
            $qty = (float)($it['quantity'] ?? 0);
            if (!in_array($type, ['RM', 'FG', 'SCRAP'], true) || $matId <= 0) {
                Response::error('Line #' . ($idx + 1) . ': select a valid item.', null, 400);
            }
            if ($qty <= 0) {
                Response::error('Line #' . ($idx + 1) . ': quantity must be greater than zero.', null, 400);
            }
            $stk = $db->prepare("SELECT material_code, material_name, unit_id FROM stock WHERE material_type = ? AND material_id = ? AND warehouse_id = ?");
            $stk->execute([$type, $matId, $sourceWh]);
            $row = $stk->fetch();
            if (!$row) {
                Response::error('Line #' . ($idx + 1) . ': item has no stock in the source godown.', null, 400);
            }
            $resolved[] = [
                'material_type' => $type,
                'material_id'   => $matId,
                'material_code' => $row['material_code'],
                'material_name' => $row['material_name'],
                'quantity'      => $qty,
                'unit_id'       => (int)$row['unit_id'],
            ];
        }

        try {
            $txNumber = InventoryService::transferStock($sourceWh, $destWh, $resolved, $remarks, $user['id']);
            Response::success(['transfer_number' => $txNumber], 'Stock transfer completed successfully.');
        } catch (Exception $e) {
            Response::error($e->getMessage(), null, 400);
        }
    }

    /**
     * Recent warehouse-to-warehouse transfers with their lines
     */
    public static function transfers(): void {
        Auth::requireAuth();
        $db = Database::getConnection();
        $limit = min(200, max(5, (int)($_GET['limit'] ?? 50)));

        $rows = $db->query("
            SELECT st.id, st.transfer_number, st.transfer_date, st.status, st.remarks, st.created_at,
                   st.source_warehouse_id, st.destination_warehouse_id,
                   ws.warehouse_name AS source_warehouse_name, wd.warehouse_name AS destination_warehouse_name,
                   u.full_name AS created_by_name
            FROM stock_transfers st
            JOIN warehouses ws ON ws.id = st.source_warehouse_id
            JOIN warehouses wd ON wd.id = st.destination_warehouse_id
            LEFT JOIN users u ON u.id = st.created_by
            ORDER BY st.id DESC
            LIMIT {$limit}
        ")->fetchAll();

        if ($rows) {
            $ids = array_column($rows, 'id');
            $ph = implode(',', array_fill(0, count($ids), '?'));
            $itStmt = $db->prepare("
                SELECT sti.transfer_id, sti.material_type, sti.material_id, sti.quantity, un.unit_code,
                       CASE
                           WHEN sti.material_type = 'RM' THEN rm.material_name
                           WHEN sti.material_type = 'FG' THEN fg.product_name
                           WHEN sti.material_type = 'SCRAP' THEN sm.scrap_name
                       END AS material_name,
                       CASE
                           WHEN sti.material_type = 'RM' THEN rm.rm_code
                           WHEN sti.material_type = 'FG' THEN fg.fg_code
                           WHEN sti.material_type = 'SCRAP' THEN sm.scrap_code
                       END AS material_code
                FROM stock_transfer_items sti
                LEFT JOIN units un ON un.id = sti.unit_id
                LEFT JOIN raw_materials rm ON sti.material_type = 'RM' AND rm.id = sti.material_id
                LEFT JOIN finished_goods fg ON sti.material_type = 'FG' AND fg.id = sti.material_id
                LEFT JOIN scrap_materials sm ON sti.material_type = 'SCRAP' AND sm.id = sti.material_id
                WHERE sti.transfer_id IN ({$ph})
                ORDER BY sti.id ASC
            ");
            $itStmt->execute($ids);
            $byTransfer = [];
            foreach ($itStmt->fetchAll() as $it) {
                $byTransfer[$it['transfer_id']][] = $it;
            }
            foreach ($rows as &$r) {
                $r['items'] = $byTransfer[$r['id']] ?? [];
            }
            unset($r);
        }

        Response::success($rows);
    }

    /**
     * Add / Initialize Opening Stock
     */
    public static function openingStock(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $matType = $input['material_type'] ?? '';
        $matId = (int)($input['material_id'] ?? 0);
        $matCode = $input['material_code'] ?? '';
        $matName = $input['material_name'] ?? '';
        $warehouseId = (int)($input['warehouse_id'] ?? 1);
        $quantity = (float)($input['quantity'] ?? 0);
        $unitId = (int)($input['unit_id'] ?? 1);
        $rate = (float)($input['rate'] ?? 0.0);
        $remarks = trim($input['remarks'] ?? 'Opening balance initialization');

        if (empty($matType) || empty($matId) || $quantity <= 0) {
            Response::error('Material and positive quantity are required.', null, 400);
        }

        try {
            $txId = 'OPN-' . strtoupper(bin2hex(random_bytes(4)));
            $res = InventoryService::increaseStock(
                $matType,
                $matId,
                $matCode,
                $matName,
                $warehouseId,
                $quantity,
                $unitId,
                $rate,
                'OPENING',
                $txId,
                $txId,
                null,
                date('Y-m-d'),
                $remarks,
                $user['id']
            );
            Response::success($res, 'Opening stock recorded successfully.');
        } catch (Exception $e) {
            Response::error($e->getMessage(), null, 400);
        }
    }

    /**
     * Bulk Import / Update Stock for Raw Materials & Finished Goods
     * - The quantity given is the new physical balance of the item IN THE CHOSEN GODOWN.
     * - Godown comes from a per-row "warehouse"/"godown" column (code or name), else the
     *   warehouse_id selected in the upload screen, else the default store for that item type.
     * - Existing items are matched by ID, then code, then exact name; unmatched rows create new items.
     * - Every change is written to the stock ledger as OPENING / ADJUSTMENT_IN / ADJUSTMENT_OUT.
     */
    public static function bulkImport(): void {
        $user = Auth::requireAuth();
        $db = Database::getConnection();

        $selectedWarehouseId = 0;

        // Support both JSON payload and multipart CSV file upload
        $items = [];
        if (!empty($_FILES['file']['tmp_name'])) {
            $selectedWarehouseId = (int)($_POST['warehouse_id'] ?? 0);
            $handle = fopen($_FILES['file']['tmp_name'], 'r');
            if ($handle) {
                $header = fgetcsv($handle);
                // Clean UTF-8 BOM
                if ($header && isset($header[0])) {
                    $header[0] = preg_replace('/^\xEF\xBB\xBF/', '', $header[0]);
                }
                $headers = array_map(function($h) { return strtolower(trim((string)$h)); }, $header ?: []);

                // Map columns
                $idCol = -1; $typeCol = -1; $codeCol = -1; $nameCol = -1; $qtyCol = -1; $unitCol = -1; $rateCol = -1;
                $minCol = -1; $maxCol = -1; $whCol = -1;
                foreach ($headers as $idx => $h) {
                    if (in_array($h, ['id', 'item_id', 'item id'])) $idCol = $idx;
                    elseif (in_array($h, ['type', 'material_type', 'item type', 'material type'])) $typeCol = $idx;
                    elseif (in_array($h, ['code', 'material_code', 'item code', 'cat no', 'cat_no'])) $codeCol = $idx;
                    elseif (in_array($h, ['name', 'material_name', 'item_name', 'item name', 'product_name', 'product name'])) $nameCol = $idx;
                    elseif (in_array($h, ['qty', 'quantity', 'stock', 'stock_quantity', 'current_stock', 'current stock quantity', 'pieces', 'pcs'])) $qtyCol = $idx;
                    elseif (in_array($h, ['unit', 'unit_code', 'uom'])) $unitCol = $idx;
                    elseif (in_array($h, ['rate', 'price', 'standard_rate', 'selling_price', 'unit_price'])) $rateCol = $idx;
                    elseif (in_array($h, ['min level', 'min level (reorder)', 'min_level', 'minimum_stock', 'reorder_level', 'reorder level', 'min stock'])) $minCol = $idx;
                    elseif (in_array($h, ['max level', 'max level (max stock)', 'max_level', 'maximum_stock', 'max stock', 'max stock quantity'])) $maxCol = $idx;
                    elseif (in_array($h, ['warehouse', 'godown', 'warehouse_code', 'warehouse code', 'warehouse_name', 'warehouse name', 'location'])) $whCol = $idx;
                }

                while (($row = fgetcsv($handle)) !== false) {
                    if (empty(array_filter($row, fn($v) => trim((string)$v) !== ''))) continue;
                    $items[] = [
                        'id'            => $idCol !== -1 ? trim($row[$idCol] ?? '') : '',
                        'material_type' => $typeCol !== -1 ? trim($row[$typeCol] ?? '') : '',
                        'material_code' => $codeCol !== -1 ? trim($row[$codeCol] ?? '') : '',
                        'material_name' => $nameCol !== -1 ? trim($row[$nameCol] ?? '') : '',
                        'quantity'      => $qtyCol !== -1 ? trim($row[$qtyCol] ?? '0') : '0',
                        'unit_code'     => $unitCol !== -1 ? trim($row[$unitCol] ?? 'PCS') : 'PCS',
                        'rate'          => $rateCol !== -1 ? trim($row[$rateCol] ?? '0') : '0',
                        'reorder_level' => $minCol !== -1 ? trim($row[$minCol] ?? '0') : '0',
                        'maximum_stock' => $maxCol !== -1 ? trim($row[$maxCol] ?? '0') : '0',
                        'warehouse'     => $whCol !== -1 ? trim($row[$whCol] ?? '') : '',
                    ];
                }
                fclose($handle);
            }
        } else {
            $input = json_decode(file_get_contents('php://input'), true) ?? [];
            $selectedWarehouseId = (int)($input['warehouse_id'] ?? 0);
            $items = $input['items'] ?? $input;
        }

        if (empty($items) || !is_array($items)) {
            Response::error('No items provided for bulk stock update.', null, 400);
        }

        $num = function ($v): float {
            return (float)preg_replace('/[^0-9.\-]/', '', (string)($v ?? '0'));
        };

        // Pre-fetch units (fall back to PCS, then to whatever unit exists so the FK never fails)
        $unitMap = [];
        foreach ($db->query("SELECT id, UPPER(unit_code) AS ucode FROM units")->fetchAll() as $u) {
            $unitMap[$u['ucode']] = (int)$u['id'];
        }
        $fallbackUnitId = $unitMap['PCS'] ?? ($unitMap ? (int)reset($unitMap) : 1);

        // Pre-fetch active warehouses for code / name lookup
        $whByKey = [];
        $whList = $db->query("SELECT id, warehouse_code, warehouse_name FROM warehouses WHERE active = 1")->fetchAll();
        foreach ($whList as $w) {
            $whByKey[strtoupper(trim($w['warehouse_code']))] = (int)$w['id'];
            $whByKey[strtoupper(trim($w['warehouse_name']))] = (int)$w['id'];
            $whByKey[(string)$w['id']] = (int)$w['id'];
        }
        $whNames = array_column($whList, 'warehouse_name', 'id');
        if ($selectedWarehouseId && !isset($whNames[$selectedWarehouseId])) {
            Response::error('Selected godown / warehouse is invalid or inactive.', null, 400);
        }

        $typeAliases = [
            'RAW MATERIAL' => 'RM', 'CHILD PART' => 'RM', 'RAW' => 'RM',
            'FINISHED GOOD' => 'FG', 'FINISHED GOODS' => 'FG', 'SKU' => 'FG'
        ];

        $db->beginTransaction();
        try {
            $createdCount = 0;
            $updatedCount = 0;
            $processed = [];
            $rowErrors = [];

            foreach ($items as $rowIdx => $item) {
                $lineNo = $rowIdx + 1;
                $rawId = trim((string)($item['id'] ?? ''));
                $rawCode = strtoupper(trim((string)($item['material_code'] ?? $item['code'] ?? '')));
                $rawName = trim((string)($item['material_name'] ?? $item['item_name'] ?? $item['product_name'] ?? ''));
                $rawType = strtoupper(trim((string)($item['material_type'] ?? $item['type'] ?? '')));
                $rawQty = round($num($item['quantity'] ?? $item['qty'] ?? $item['stock'] ?? 0), 3);
                $rawRate = $num($item['rate'] ?? $item['unit_price'] ?? $item['standard_rate'] ?? 0);
                $rawMinStock = $num($item['reorder_level'] ?? $item['min_level'] ?? $item['minimum_stock'] ?? 0);
                $rawMaxStock = $num($item['maximum_stock'] ?? $item['max_level'] ?? $item['max_stock'] ?? 0);
                $uCode = strtoupper(trim((string)($item['unit_code'] ?? $item['unit'] ?? 'PCS'))) ?: 'PCS';
                $unitId = $unitMap[$uCode] ?? $fallbackUnitId;
                $rawWh = strtoupper(trim((string)($item['warehouse'] ?? $item['godown'] ?? $item['warehouse_code'] ?? $item['warehouse_id'] ?? '')));

                if ($rawName === '' && $rawCode === '' && $rawId === '') continue;
                if ($rawQty < 0) {
                    $rowErrors[] = "Row {$lineNo}: quantity cannot be negative.";
                    continue;
                }

                if (isset($typeAliases[$rawType])) $rawType = $typeAliases[$rawType];

                // Infer type if not specified
                if (!in_array($rawType, ['RM', 'FG'], true)) {
                    if (str_starts_with($rawCode, 'RM-') || stripos($rawName, 'brass rod') !== false || stripos($rawName, 'copper') !== false || stripos($rawName, 'ingot') !== false || stripos($rawName, 'cartridge') !== false) {
                        $rawType = 'RM';
                    } else {
                        $rawType = 'FG';
                    }
                }

                $table = $rawType === 'RM' ? 'raw_materials' : 'finished_goods';
                $codeField = $rawType === 'RM' ? 'rm_code' : 'fg_code';
                $nameField = $rawType === 'RM' ? 'material_name' : 'product_name';
                $rateField = $rawType === 'RM' ? 'standard_rate' : 'selling_price';

                // Resolve godown for this row
                if ($rawWh !== '' && $rawWh !== '0') {
                    if (!isset($whByKey[$rawWh])) {
                        $rowErrors[] = "Row {$lineNo}: godown '{$rawWh}' not found.";
                        continue;
                    }
                    $warehouseId = $whByKey[$rawWh];
                } elseif ($selectedWarehouseId) {
                    $warehouseId = $selectedWarehouseId;
                } else {
                    $warehouseId = InventoryService::getValidWarehouseId($rawType === 'RM' ? 1 : 3);
                }

                $itemId = null;
                $itemCode = null;
                $itemName = $rawName;
                $isNew = false;

                // Match existing item: ID, then code, then exact name
                $lookups = [];
                if ($rawId !== '' && ctype_digit($rawId) && (int)$rawId > 0) $lookups[] = ['id', (int)$rawId];
                if ($rawCode !== '') $lookups[] = [$codeField, $rawCode];
                if ($rawName !== '') $lookups[] = [$nameField, $rawName];
                foreach ($lookups as [$field, $value]) {
                    $chk = $db->prepare("SELECT id, {$codeField} AS code, {$nameField} AS name FROM {$table} WHERE {$field} = ? AND deleted_at IS NULL LIMIT 1");
                    $chk->execute([$value]);
                    if ($existing = $chk->fetch()) {
                        $itemId = (int)$existing['id'];
                        $itemCode = $existing['code'];
                        $itemName = $rawName !== '' ? $rawName : $existing['name'];
                        break;
                    }
                }

                // Not found: AUTO-CREATE NEW ITEM with a code that is guaranteed unused
                if (!$itemId) {
                    $isNew = true;
                    $prefix = $rawType === 'RM' ? 'RM-' : 'FG-';
                    $codeChk = $db->prepare("SELECT COUNT(*) FROM {$table} WHERE {$codeField} = ?");
                    $itemCode = '';
                    if ($rawCode !== '') {
                        $codeChk->execute([$rawCode]);
                        if ((int)$codeChk->fetchColumn() === 0) $itemCode = $rawCode;
                    }
                    if ($itemCode === '') {
                        $seq = (int)$db->query("SELECT COALESCE(MAX(id), 0) FROM {$table}")->fetchColumn() + 1;
                        do {
                            $itemCode = $prefix . str_pad((string)$seq, 6, '0', STR_PAD_LEFT);
                            $codeChk->execute([$itemCode]);
                            $seq++;
                        } while ((int)$codeChk->fetchColumn() > 0);
                    }
                    $itemName = $rawName !== '' ? $rawName : (($rawType === 'RM' ? 'Raw Material ' : 'Finished Good ') . $itemCode);

                    if ($rawType === 'RM') {
                        $db->prepare("
                            INSERT INTO raw_materials (rm_code, material_name, standard_rate, minimum_stock, reorder_level, maximum_stock, unit_id, purchase_unit_id, conversion_factor, created_by, created_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1.0, ?, NOW())
                        ")->execute([$itemCode, $itemName, $rawRate, $rawMinStock, $rawMinStock, $rawMaxStock, $unitId, $unitId, $user['id']]);
                    } else {
                        $db->prepare("
                            INSERT INTO finished_goods (fg_code, product_name, selling_price, minimum_stock, reorder_level, maximum_stock, unit_id, created_by, created_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
                        ")->execute([$itemCode, $itemName, $rawRate, $rawMinStock, $rawMinStock, $rawMaxStock, $unitId, $user['id']]);
                    }
                    $itemId = (int)$db->lastInsertId();
                    $createdCount++;
                } else {
                    $updatedCount++;
                    $db->prepare("
                        UPDATE {$table}
                        SET {$nameField} = ?,
                            {$rateField} = CASE WHEN ? > 0 THEN ? ELSE {$rateField} END,
                            reorder_level = CASE WHEN ? > 0 THEN ? ELSE reorder_level END,
                            minimum_stock = CASE WHEN ? > 0 THEN ? ELSE minimum_stock END,
                            maximum_stock = CASE WHEN ? > 0 THEN ? ELSE maximum_stock END,
                            updated_at = NOW()
                        WHERE id = ?
                    ")->execute([$itemName, $rawRate, $rawRate, $rawMinStock, $rawMinStock, $rawMinStock, $rawMinStock, $rawMaxStock, $rawMaxStock, $itemId]);
                }

                // Set the godown balance. available_quantity is NEVER written here directly:
                // it is a GENERATED column on some schemas; syncAvailable() handles plain-column schemas.
                $stkStmt = $db->prepare("SELECT id, quantity, reserved_quantity FROM stock WHERE material_type = ? AND material_id = ? AND warehouse_id = ? FOR UPDATE");
                $stkStmt->execute([$rawType, $itemId, $warehouseId]);
                $stkRow = $stkStmt->fetch();
                $prevQty = $stkRow ? (float)$stkRow['quantity'] : 0.0;

                if ($stkRow) {
                    $db->prepare("UPDATE stock SET quantity = ?, material_code = ?, material_name = ?, unit_id = ?, updated_at = NOW() WHERE id = ?")
                       ->execute([$rawQty, $itemCode, $itemName, $unitId, $stkRow['id']]);
                    $stockId = (int)$stkRow['id'];
                } else {
                    $db->prepare("
                        INSERT INTO stock (material_type, material_id, material_code, material_name, warehouse_id, quantity, reserved_quantity, unit_id, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, 0.000, ?, NOW())
                    ")->execute([$rawType, $itemId, $itemCode, $itemName, $warehouseId, $rawQty, $unitId]);
                    $stockId = (int)$db->lastInsertId();
                }
                InventoryService::syncAvailable($stockId);

                // Ledger: record only the movement actually made
                $diff = round($rawQty - $prevQty, 3);
                if ($diff != 0.0) {
                    $txType = !$stkRow ? 'OPENING' : ($diff > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT');
                    $txId = 'BLK-' . strtoupper(bin2hex(random_bytes(4)));
                    $db->prepare("
                        INSERT INTO stock_ledger (
                            transaction_type, transaction_id, material_type, material_id, material_code,
                            warehouse_id, quantity_in, quantity_out, balance_after, unit_id, rate,
                            reference_number, transaction_date, remarks, created_by, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'BULK_IMPORT', CURDATE(), ?, ?, NOW())
                    ")->execute([
                        $txType, $txId, $rawType, $itemId, $itemCode, $warehouseId,
                        $diff > 0 ? $diff : 0, $diff < 0 ? -$diff : 0, $rawQty, $unitId, $rawRate,
                        "Bulk stock update: {$prevQty} -> {$rawQty}", $user['id']
                    ]);
                }

                $processed[] = [
                    'id'             => $itemId,
                    'material_code'  => $itemCode,
                    'material_name'  => $itemName,
                    'material_type'  => $rawType,
                    'warehouse_id'   => $warehouseId,
                    'warehouse_name' => $whNames[$warehouseId] ?? InventoryService::warehouseLabel($warehouseId),
                    'previous_qty'   => $prevQty,
                    'quantity'       => $rawQty,
                    'unit'           => $uCode,
                    'status'         => $isNew ? 'CREATED' : 'UPDATED'
                ];
            }

            if (!empty($rowErrors)) {
                $db->rollBack();
                Response::error('Bulk stock update not saved. Fix these rows and retry: ' . implode(' | ', array_slice($rowErrors, 0, 10)), ['errors' => $rowErrors], 400);
            }

            $db->commit();
            Response::success([
                'created_count' => $createdCount,
                'updated_count' => $updatedCount,
                'total'         => count($processed),
                'items'         => $processed
            ], "Bulk stock synchronization complete: {$createdCount} new items created, {$updatedCount} items updated.");
        } catch (Exception $e) {
            if ($db->inTransaction()) $db->rollBack();
            Response::error('Failed to process bulk stock import: ' . $e->getMessage(), null, 400);
        }
    }

    /**
     * Auto-Catchup Snapshots: If system was offline or missed 23:59 EOD snapshots for any past days,
     * this guarantees that yesterday and all preceding closed days are automatically frozen into daily_stock_snapshots.
     */
    public static function autoCatchupSnapshots(PDO $db): void {
        try {
            $yesterday = date('Y-m-d', strtotime('-1 day'));
            
            // Find the most recent snapshot date
            $lastSnapStmt = $db->query("SELECT MAX(snapshot_date) FROM daily_stock_snapshots WHERE material_type = 'FG'");
            $lastSnapDate = $lastSnapStmt->fetchColumn();

            if (!$lastSnapDate) {
                self::executeEodSnapshot($yesterday, $db);
                return;
            }

            if ($lastSnapDate < $yesterday) {
                $start = new DateTime($lastSnapDate);
                $end = new DateTime($yesterday);
                $start->modify('+1 day');

                while ($start <= $end) {
                    $missingDate = $start->format('Y-m-d');
                    self::executeEodSnapshot($missingDate, $db);
                    $start->modify('+1 day');
                }
            }
        } catch (Exception $e) {
            error_log("Auto-catchup snapshot error: " . $e->getMessage());
        }
    }

    /**
     * Stock Science Zone Calculation:
     * Based on Max Level:
     * - 0 to 30% of Max Level => RED ZONE (Critical)
     * - 31 to 60% of Max Level => YELLOW ZONE (Buffer)
     * - 61 to 100% of Max Level => GREEN ZONE (Sufficient)
     * - > 100% of Max Level => PURPLE STOCK (Surplus)
     */
    public static function calculateStockZone(float $stock, float $maxLevel, float $minLevel = 0.0): array {
        if ($maxLevel > 0) {
            $ratio = ($stock / $maxLevel) * 100.0;
            if ($ratio <= 30.0) {
                return [
                    'zone'        => 'RED',
                    'status'      => 'CRITICAL_ZERO',
                    'ratio'       => round($ratio, 1),
                    'color'       => 'red',
                    'label'       => 'Red Zone (0–30%)',
                    'description' => '0 to 30% of Max Level (Critical)'
                ];
            } elseif ($ratio <= 60.0) {
                return [
                    'zone'        => 'YELLOW',
                    'status'      => 'WARNING_LOW',
                    'ratio'       => round($ratio, 1),
                    'color'       => 'yellow',
                    'label'       => 'Yellow Zone (31–60%)',
                    'description' => '31 to 60% of Max Level (Buffer)'
                ];
            } elseif ($ratio <= 100.0) {
                return [
                    'zone'        => 'GREEN',
                    'status'      => 'HEALTHY',
                    'ratio'       => round($ratio, 1),
                    'color'       => 'green',
                    'label'       => 'Green Zone (61–100%)',
                    'description' => '61 to 100% of Max Level (Sufficient)'
                ];
            } else {
                return [
                    'zone'        => 'PURPLE',
                    'status'      => 'SURPLUS_HIGH',
                    'ratio'       => round($ratio, 1),
                    'color'       => 'purple',
                    'label'       => 'Purple Stock (>100%)',
                    'description' => 'Above 100% of Max Level (Surplus)'
                ];
            }
        }

        // Fallback when maxLevel is 0 or not configured
        if ($stock <= 0) {
            return [
                'zone'        => 'RED',
                'status'      => 'CRITICAL_ZERO',
                'ratio'       => 0,
                'color'       => 'red',
                'label'       => 'Red Zone (Zero Stock)',
                'description' => 'Out of stock'
            ];
        } elseif ($minLevel > 0 && $stock <= $minLevel) {
            return [
                'zone'        => 'YELLOW',
                'status'      => 'WARNING_LOW',
                'ratio'       => null,
                'color'       => 'yellow',
                'label'       => 'Yellow Zone (Low Stock)',
                'description' => 'Below minimum buffer level'
            ];
        } else {
            return [
                'zone'        => 'GREEN',
                'status'      => 'HEALTHY',
                'ratio'       => null,
                'color'       => 'green',
                'label'       => 'Green Zone (Sufficient)',
                'description' => 'Normal stock'
            ];
        }
    }

    /**
     * Execute End-Of-Day (EOD) Stock Snapshot for all Finished Goods
     */
    public static function executeEodSnapshot(?string $targetDate = null, ?PDO $db = null): array {
        $db = $db ?: Database::getConnection();
        $date = $targetDate ?: date('Y-m-d');

        // Fetch current live stock for all active finished goods
        $stmt = $db->query("
            SELECT fg.id, fg.fg_code, fg.minimum_stock, fg.maximum_stock,
                   COALESCE(c.category_name, 'GENERAL') as group_name,
                   COALESCE(SUM(s.quantity), 0) as current_stock
            FROM finished_goods fg
            LEFT JOIN categories c ON fg.category_id = c.id
            LEFT JOIN stock s ON s.material_type = 'FG' AND s.material_id = fg.id
            WHERE fg.active = 1
            GROUP BY fg.id, fg.fg_code, fg.minimum_stock, fg.maximum_stock, c.category_name
        ");
        $rows = $stmt->fetchAll();

        $ins = $db->prepare("
            INSERT INTO daily_stock_snapshots (snapshot_date, material_type, material_id, material_code, group_name, closing_stock, max_level, min_level)
            VALUES (?, 'FG', ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                closing_stock = VALUES(closing_stock), 
                group_name = VALUES(group_name), 
                max_level = VALUES(max_level), 
                min_level = VALUES(min_level)
        ");

        $recordedCount = 0;
        foreach ($rows as $r) {
            $ins->execute([
                $date,
                $r['id'],
                $r['fg_code'],
                $r['group_name'],
                $r['current_stock'],
                $r['maximum_stock'],
                $r['minimum_stock']
            ]);
            $recordedCount++;
        }

        return [
            'date'           => $date,
            'recorded_items' => $recordedCount
        ];
    }

    /**
     * IMS Tri Nagar Master Working - Day-Wise Stock Matrix
     * Shows frozen historical snapshots for past closed days, and real-time live stock for today.
     * At 23:59 EOD, today's live stock automatically becomes yesterday's frozen snapshot.
     */
    public static function imsMaster(): void {
        Auth::requireAuth();
        $db = Database::getConnection();

        // 0. Auto-catchup any missed past snapshots so history is always unbroken
        self::autoCatchupSnapshots($db);

        $startDate = $_GET['start_date'] ?? $_GET['from'] ?? null;
        $endDate = $_GET['end_date'] ?? $_GET['to'] ?? null;

        if ($startDate && $endDate) {
            $startTime = strtotime($startDate);
            $endTime = strtotime($endDate);
            if ($startTime && $endTime) {
                if ($startTime > $endTime) {
                    $tmp = $startTime;
                    $startTime = $endTime;
                    $endTime = $tmp;
                }
                $startDate = date('Y-m-d', $startTime);
                $endDate = date('Y-m-d', $endTime);
            } else {
                $startDate = date('Y-m-01');
                $endDate = date('Y-m-t');
            }
            $month = date('Y-m', strtotime($startDate));
        } else {
            $month = $_GET['month'] ?? date('Y-m'); // e.g. 2026-10
            $startDate = "{$month}-01";
            $endDate = date('Y-m-t', strtotime($startDate));
        }

        $search = trim($_GET['search'] ?? '');
        $group = trim($_GET['group'] ?? '');
        $materialType = trim($_GET['material_type'] ?? $_GET['type'] ?? 'ALL');

        // 1. Fetch Items catalog (Finished Goods & Raw Materials)
        $queries = [];
        $params = [];

        if ($materialType === 'ALL' || $materialType === 'FG') {
            $fgSql = "
                SELECT fg.id, 'FG' as material_type, 'Finished Good' as item_type,
                       fg.fg_code as cat_no, fg.product_name as item_name, 
                       COALESCE(c.category_name, 'Finished Good') as group_name,
                       fg.minimum_stock as min_level, fg.maximum_stock as max_level,
                       COALESCE(u.unit_code, 'PCS') as unit_code,
                       COALESCE(SUM(s.quantity), 0) as current_stock
                FROM finished_goods fg
                LEFT JOIN categories c ON fg.category_id = c.id
                LEFT JOIN units u ON fg.unit_id = u.id
                LEFT JOIN stock s ON s.material_type = 'FG' AND s.material_id = fg.id
                WHERE fg.active = 1 AND fg.deleted_at IS NULL
            ";
            if ($search) {
                $fgSql .= " AND (fg.fg_code LIKE ? OR fg.product_name LIKE ? OR c.category_name LIKE ?)";
                $params[] = "%{$search}%";
                $params[] = "%{$search}%";
                $params[] = "%{$search}%";
            }
            if ($group && $group !== 'ALL' && $group !== 'undefined') {
                $fgSql .= " AND (c.category_name = ? OR 'Finished Good' = ?)";
                $params[] = $group;
                $params[] = $group;
            }
            $fgSql .= " GROUP BY fg.id, fg.fg_code, fg.product_name, c.category_name, fg.minimum_stock, fg.maximum_stock, u.unit_code";
            $queries[] = $fgSql;
        }

        if ($materialType === 'ALL' || $materialType === 'RM') {
            $rmSql = "
                SELECT rm.id, 'RM' as material_type, 'Raw Material' as item_type,
                       rm.rm_code as cat_no, rm.material_name as item_name, 
                       COALESCE(c.category_name, 'Raw Material') as group_name,
                       rm.minimum_stock as min_level, rm.maximum_stock as max_level,
                       COALESCE(u.unit_code, 'KG') as unit_code,
                       COALESCE(SUM(s.quantity), 0) as current_stock
                FROM raw_materials rm
                LEFT JOIN categories c ON rm.category_id = c.id
                LEFT JOIN units u ON rm.unit_id = u.id
                LEFT JOIN stock s ON s.material_type = 'RM' AND s.material_id = rm.id
                WHERE rm.active = 1 AND rm.deleted_at IS NULL
            ";
            if ($search) {
                $rmSql .= " AND (rm.rm_code LIKE ? OR rm.material_name LIKE ? OR c.category_name LIKE ?)";
                $params[] = "%{$search}%";
                $params[] = "%{$search}%";
                $params[] = "%{$search}%";
            }
            if ($group && $group !== 'ALL' && $group !== 'undefined') {
                $rmSql .= " AND (c.category_name = ? OR 'Raw Material' = ?)";
                $params[] = $group;
                $params[] = $group;
            }
            $rmSql .= " GROUP BY rm.id, rm.rm_code, rm.material_name, c.category_name, rm.minimum_stock, rm.maximum_stock, u.unit_code";
            $queries[] = $rmSql;
        }

        $fullSql = implode(" UNION ALL ", $queries) . " ORDER BY material_type ASC, cat_no ASC";
        $stmt = $db->prepare($fullSql);
        $stmt->execute($params);
        $products = $stmt->fetchAll();

        // 2. Build Date Columns in Selected Date Range (From Date -> To Date)
        $dateCols = [];
        $dayCols = [];
        $todayStr = date('Y-m-d');
        $todayTime = strtotime($todayStr);
        $curTime = strtotime($startDate);
        // Stock reporting only applies to historical and current dates up to TODAY. Never generate future dates!
        $effectiveEndTime = min(strtotime($endDate), $todayTime);
        $maxEndTime = min($effectiveEndTime, strtotime('+60 days', $curTime));

        while ($curTime <= $maxEndTime) {
            $dStr = date('Y-m-d', $curTime);
            $dayNum = date('d', $curTime);
            $isToday = ($dStr === $todayStr);
            $dateCols[] = [
                'date'       => $dStr,
                'day_num'    => $dayNum,
                'label'      => date('d M', $curTime),      // e.g. "05 Oct"
                'formatted'  => date('d-m-Y', $curTime),    // e.g. "05-10-2026"
                'is_today'   => $isToday
            ];
            $dayCols[] = $dayNum;
            $curTime = strtotime('+1 day', $curTime);
        }

        // 3. Fetch daily snapshots for the specified date range
        $snapSql = "
            SELECT material_type, material_id, material_code, snapshot_date, closing_stock,
                   DATE_FORMAT(snapshot_date, '%Y-%m-%d') as full_date,
                   DATE_FORMAT(snapshot_date, '%d') as day_num,
                   DATE_FORMAT(snapshot_date, '%d %b') as date_label
            FROM daily_stock_snapshots
            WHERE snapshot_date BETWEEN ? AND ?
            ORDER BY snapshot_date ASC
        ";
        $snapStmt = $db->prepare($snapSql);
        $snapStmt->execute([$startDate, $endDate]);
        $snapshots = $snapStmt->fetchAll();

        // Group snapshots by material_type & material_id & full_date (and day_num)
        $snapMap = [];
        foreach ($snapshots as $snap) {
            $matType = $snap['material_type'] ?? 'FG';
            $matId = (int)$snap['material_id'];
            $fDate = $snap['full_date'];
            $key = $matType . '_' . $matId;
            $snapMap[$key][$fDate] = (float)$snap['closing_stock'];
            $snapMap[$key][$snap['day_num']] = (float)$snap['closing_stock'];
            $snapMap[$matId][$fDate] = (float)$snap['closing_stock'];
            $snapMap[$matId][$snap['day_num']] = (float)$snap['closing_stock'];
        }

        // 4. Fetch today's live transaction activity from stock_ledger
        // Tracks today's Sales (outward), Purchases (inward), and Production (inward)
        $todayTxMap = [];
        try {
            $todayTxStmt = $db->query("
                SELECT material_type, material_id,
                       COALESCE(SUM(quantity_in), 0) as today_in,
                       COALESCE(SUM(quantity_out), 0) as today_out,
                       COALESCE(SUM(CASE WHEN transaction_type = 'SALE' THEN quantity_out ELSE 0 END), 0) as today_sales,
                       COALESCE(SUM(CASE WHEN transaction_type = 'PURCHASE' THEN quantity_in ELSE 0 END), 0) as today_purchase,
                       COALESCE(SUM(CASE WHEN transaction_type = 'PRODUCTION_OUTPUT' THEN quantity_in ELSE 0 END), 0) as today_production
                FROM stock_ledger
                WHERE transaction_date = CURDATE() OR DATE(created_at) = CURDATE()
                GROUP BY material_type, material_id
            ");
            foreach ($todayTxStmt->fetchAll() as $row) {
                $matType = $row['material_type'] ?? 'FG';
                $matId = (int)$row['material_id'];
                $todayTxMap[$matType . '_' . $matId] = $row;
                $todayTxMap[$matId] = $row;
            }
        } catch (Exception $e) {
            $todayTxMap = [];
        }

        // 4.1 Fetch Warehouses & Live Warehouse-Wise Stock
        $whStmt = $db->query("SELECT id, warehouse_code, warehouse_name, location FROM warehouses WHERE active = 1 ORDER BY id ASC");
        $warehouses = $whStmt->fetchAll();

        $stockStmt = $db->query("
            SELECT s.material_type, s.material_id, s.warehouse_id, 
                   COALESCE(s.quantity, 0) AS quantity,
                   COALESCE(s.reserved_quantity, 0) AS reserved_quantity,
                   COALESCE(s.available_quantity, 0) AS available_quantity,
                   w.warehouse_code, w.warehouse_name, w.location
            FROM stock s
            JOIN warehouses w ON s.warehouse_id = w.id
            WHERE w.active = 1
        ");
        $stocksByMatKey = [];
        foreach ($stockStmt->fetchAll() as $stk) {
            $key = $stk['material_type'] . '_' . $stk['material_id'];
            if (!isset($stocksByMatKey[$key])) {
                $stocksByMatKey[$key] = [];
            }
            $stocksByMatKey[$key][] = [
                'warehouse_id'       => (int)$stk['warehouse_id'],
                'warehouse_code'     => $stk['warehouse_code'],
                'warehouse_name'     => $stk['warehouse_name'],
                'location'           => $stk['location'] ?? '',
                'quantity'           => (float)$stk['quantity'],
                'reserved_quantity'  => (float)$stk['reserved_quantity'],
                'available_quantity' => (float)$stk['available_quantity'],
            ];
        }

        // 4.2 Fetch Sub-Child Parts (Brand Variants e.g. Somany, Prince Pipe)
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
            foreach ($scpStmt->fetchAll() as $scp) {
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

        // 4.3 Fetch BOM recipe child parts for Finished Goods
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
            foreach ($bomStmt->fetchAll() as $bRow) {
                $fgId = (int)$bRow['fg_id'];
                $rmId = (int)$bRow['rm_id'];
                if (!isset($bomByFgId[$fgId])) {
                    $bomByFgId[$fgId] = [];
                }
                $bomByFgId[$fgId][] = [
                    'rm_id'             => $rmId,
                    'rm_code'           => $bRow['rm_code'],
                    'material_name'     => $bRow['material_name'],
                    'quantity_per_unit' => (float)$bRow['quantity_per_unit'],
                    'unit_code'         => $bRow['unit_code'],
                    'current_stock'     => (float)$bRow['current_stock'],
                    'variants'          => $variantsByRmId[$rmId] ?? [],
                    'godown_stocks'     => $stocksByMatKey["RM_{$rmId}"] ?? []
                ];
            }
        } catch (Exception $e) {}

        // 5. Build response items with status color flags
        $items = [];
        $sNo = 1;
        $allGroups = [];
        $yesterdayDayStr = date('d', strtotime('-1 day'));

        foreach ($products as $p) {
            $matId = (int)$p['id'];
            $currentStock = (float)$p['current_stock'];
            $maxLevel = (float)$p['max_level'];
            $minLevel = (float)$p['min_level'];

            if (!in_array($p['group_name'], $allGroups)) {
                $allGroups[] = $p['group_name'];
            }

            $todayTx = $todayTxMap[$matId] ?? null;
            $todayIn = $todayTx ? (float)$todayTx['today_in'] : 0.0;
            $todayOut = $todayTx ? (float)$todayTx['today_out'] : 0.0;
            $todaySales = $todayTx ? (float)$todayTx['today_sales'] : 0.0;
            $todayPurchase = $todayTx ? (float)$todayTx['today_purchase'] : 0.0;
            $todayProd = $todayTx ? (float)$todayTx['today_production'] : 0.0;

            // Opening stock of today = yesterday's closing stock, or calculated reverse
            $yesterdayClosing = isset($snapMap[$matId][$yesterdayDayStr]) 
                ? $snapMap[$matId][$yesterdayDayStr] 
                : ($currentStock - $todayIn + $todayOut);

            $dayStock = [];
            foreach ($dateCols as $col) {
                $d = $col['date'];
                $dNum = $col['day_num'];
                $isTodayCol = $col['is_today'];

                if ($isTodayCol) {
                    // Current working day: stock is LIVE and updated in real-time by today's transactions
                    $stockVal = $currentStock;
                    $zoneInfo = self::calculateStockZone($stockVal, $maxLevel, $minLevel);

                    $cellData = [
                        'quantity'       => $stockVal,
                        'zone'           => $zoneInfo['zone'],
                        'status'         => $zoneInfo['status'],
                        'zone_ratio'     => $zoneInfo['ratio'],
                        'zone_label'     => $zoneInfo['label'],
                        'is_today'       => true,
                        'date'           => $d,
                        'label'          => $col['label'],
                        'formatted'      => $col['formatted'],
                        'opening_stock'  => $yesterdayClosing,
                        'today_sales'    => $todaySales,
                        'today_purchase' => $todayPurchase,
                        'today_prod'     => $todayProd,
                        'today_in'       => $todayIn,
                        'today_out'      => $todayOut
                    ];
                } else {
                    // Past day: FROZEN closing snapshot from history. NOT recalculated.
                    $stockVal = isset($snapMap[$matId][$d]) 
                        ? $snapMap[$matId][$d] 
                        : (isset($snapMap[$matId][$dNum]) ? $snapMap[$matId][$dNum] : 0.0);
                    $zoneInfo = self::calculateStockZone($stockVal, $maxLevel, $minLevel);

                    $cellData = [
                        'quantity'   => $stockVal,
                        'zone'       => $zoneInfo['zone'],
                        'status'     => $zoneInfo['status'],
                        'zone_ratio' => $zoneInfo['ratio'],
                        'zone_label' => $zoneInfo['label'],
                        'is_today'   => false,
                        'date'       => $d,
                        'label'      => $col['label'],
                        'formatted'  => $col['formatted']
                    ];
                }

                $dayStock[$d] = $cellData;
                $dayStock[$dNum] = $cellData;
            }

            $currentZoneInfo = self::calculateStockZone($currentStock, $maxLevel, $minLevel);

            $matKey = ($p['material_type'] ?? 'FG') . '_' . $matId;

            $items[] = [
                's_no'            => $sNo++,
                'id'              => $p['id'],
                'cat_no'          => $p['cat_no'],
                'item_name'       => $p['item_name'],
                'material_type'   => $p['material_type'] ?? 'FG',
                'item_type'       => $p['item_type'] ?? ($p['material_type'] === 'RM' ? 'Raw Material' : 'Finished Good'),
                'stock_type'      => $p['item_type'] ?? ($p['material_type'] === 'RM' ? 'Raw Material' : 'Finished Good'),
                'group_name'      => $p['group_name'],
                'max_level'       => $maxLevel,
                'min_level'       => $minLevel,
                'current_stock'   => $currentStock,
                'current_zone'    => $currentZoneInfo['zone'],
                'current_ratio'   => $currentZoneInfo['ratio'],
                'current_status'  => $currentZoneInfo['status'],
                'current_label'   => $currentZoneInfo['label'],
                'opening_stock'   => $yesterdayClosing,
                'today_sales'     => $todaySales,
                'today_purchase'  => $todayPurchase,
                'today_prod'      => $todayProd,
                'today_in'        => $todayIn,
                'today_out'       => $todayOut,
                'unit_code'       => $p['unit_code'],
                'day_stock'       => $dayStock,
                'godown_stocks'   => $stocksByMatKey[$matKey] ?? [],
                'variants'        => ($p['material_type'] === 'RM') ? ($variantsByRmId[$matId] ?? []) : [],
                'bom_child_parts' => ($p['material_type'] === 'FG') ? ($bomByFgId[$matId] ?? []) : []
            ];
        }

        Response::success([
            'month'            => $month,
            'start_date'       => $startDate,
            'end_date'         => $endDate,
            'date_columns'     => $dateCols,
            'day_columns'      => $dayCols,
            'today_day'        => date('d'),
            'today_date'       => $todayStr,
            'is_current_month' => ($month === date('Y-m')),
            'groups'           => $allGroups,
            'total_items'      => count($items),
            'warehouses'       => $warehouses,
            'items'            => $items
        ]);
    }

    /**
     * Record / Capture Daily Closing Stock Snapshot (Manual or API)
     */
    public static function recordSnapshot(): void {
        Auth::requireAuth();
        $db = Database::getConnection();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $date = $input['snapshot_date'] ?? date('Y-m-d');

        try {
            $db->beginTransaction();
            $res = self::executeEodSnapshot($date, $db);
            $db->commit();
            Response::success($res, "EOD Daily stock snapshot recorded successfully for date: {$date}");
        } catch (Exception $e) {
            if ($db->inTransaction()) $db->rollBack();
            Response::error('Failed to capture snapshot: ' . $e->getMessage(), null, 400);
        }
    }

    /**
     * Web Cron Endpoint for EOD Snapshot (invoked at 23:59:00 via curl or scheduled job)
     */
    public static function cronSnapshot(): void {
        $db = Database::getConnection();
        $date = $_GET['date'] ?? date('Y-m-d');

        try {
            $res = self::executeEodSnapshot($date, $db);
            Response::success($res, "Automated 23:59 EOD Snapshot captured successfully for date: {$date}");
        } catch (Exception $e) {
            Response::error('Cron snapshot failed: ' . $e->getMessage(), null, 500);
        }
    }
}
