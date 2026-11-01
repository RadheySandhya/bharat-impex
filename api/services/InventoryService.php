<?php
// ============================================================
// BHARAT IMPEX — INVENTORY SERVICE (CENTRAL STOCK ENGINE)
// ============================================================

class InventoryService {

    /** Cached per request: is stock.available_quantity a GENERATED column? */
    private static ?bool $availableIsGenerated = null;
    private static bool $stockHealed = false;

    /**
     * Local schema.sql defines `stock.available_quantity` as GENERATED (quantity - reserved),
     * but the live cPanel database has it as a plain column. Writing to a generated column
     * fails ("value specified for generated column is not allowed"), while never writing a
     * plain column leaves it stale (and decreaseStock then reports false "Insufficient stock").
     * Detect which schema we are on so every write path works on both.
     */
    public static function availableIsGenerated(): bool {
        if (self::$availableIsGenerated !== null) {
            return self::$availableIsGenerated;
        }
        $db = Database::getConnection();
        try {
            $stmt = $db->query("
                SELECT EXTRA FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock' AND COLUMN_NAME = 'available_quantity'
            ");
            $extra = strtoupper((string)($stmt->fetchColumn() ?: ''));
            self::$availableIsGenerated = (strpos($extra, 'GENERATED') !== false
                || strpos($extra, 'PERSISTENT') !== false
                || strpos($extra, 'VIRTUAL') !== false);
        } catch (Exception $e) {
            self::$availableIsGenerated = true; // safest: never write to it
        }
        return self::$availableIsGenerated;
    }

    /**
     * Recompute available_quantity for one stock row (or all rows) when it is a plain column.
     * No-op on schemas where the database maintains it automatically.
     */
    public static function syncAvailable(?int $stockId = null): void {
        if (self::availableIsGenerated()) return;
        $db = Database::getConnection();
        if ($stockId) {
            $db->prepare("UPDATE stock SET available_quantity = quantity - reserved_quantity WHERE id = ?")
               ->execute([$stockId]);
        } else {
            $db->exec("UPDATE stock SET available_quantity = quantity - reserved_quantity
                       WHERE available_quantity <> quantity - reserved_quantity");
        }
    }

    /**
     * One-time (per request) repair of rows whose available_quantity drifted on plain-column schemas.
     */
    public static function healStockTable(): void {
        if (self::$stockHealed) return;
        self::$stockHealed = true;
        try {
            self::syncAvailable(null);
        } catch (Exception $e) {
            error_log('Stock heal failed: ' . $e->getMessage());
        }
    }

    /**
     * Find the stock row id for a material in a warehouse.
     */
    private static function stockRowId(string $materialType, int $materialId, int $warehouseId): ?int {
        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT id FROM stock WHERE material_type = ? AND material_id = ? AND warehouse_id = ?");
        $stmt->execute([$materialType, $materialId, $warehouseId]);
        $id = $stmt->fetchColumn();
        return $id ? (int)$id : null;
    }

    /**
     * Warehouse display label for ledger remarks.
     */
    public static function warehouseLabel(int $warehouseId): string {
        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT warehouse_name FROM warehouses WHERE id = ?");
        $stmt->execute([$warehouseId]);
        $name = $stmt->fetchColumn();
        return $name ?: "WH #{$warehouseId}";
    }

    /**
     * Get or create a valid warehouse ID
     * Prevents foreign key constraint violations if warehouses were wiped
     */
    public static function getValidWarehouseId(?int $requestedId = null, string $fallbackCode = 'WH-01', string $fallbackName = 'Main Warehouse'): int {
        $db = Database::getConnection();

        // 1. If requested ID is provided, verify it exists and is active
        if ($requestedId && $requestedId > 0) {
            $stmt = $db->prepare("SELECT id FROM warehouses WHERE id = ? AND active = 1");
            $stmt->execute([$requestedId]);
            $wh = $stmt->fetch();
            if ($wh) return (int)$wh['id'];
        }

        // 2. Look for any existing active warehouse (preferred default first)
        $defaultStmt = $db->query("SELECT id FROM warehouses WHERE active = 1 ORDER BY is_default DESC, id ASC LIMIT 1");
        $existing = $defaultStmt->fetch();
        if ($existing) {
            return (int)$existing['id'];
        }

        // 3. If NO warehouses exist at all, self-heal by creating the primary Default Main Warehouse
        $insertStmt = $db->prepare("
            INSERT INTO warehouses (warehouse_code, warehouse_name, location, contact_person, phone, is_default, active, created_at, updated_at)
            VALUES (?, ?, 'Factory Main Unit', 'Admin', '', 1, 1, NOW(), NOW())
        ");
        $insertStmt->execute([$fallbackCode, $fallbackName]);
        return (int)$db->lastInsertId();
    }

    /**
     * Increase stock (e.g. Purchase, Production Output, Opening, Adjustment In, Transfer In)
     */
    public static function increaseStock(
        string $materialType,
        int $materialId,
        string $materialCode,
        string $materialName,
        int $warehouseId,
        float $quantity,
        int $unitId,
        float $rate,
        string $transactionType,
        string $transactionId,
        ?string $referenceNumber = null,
        ?string $batchLotNumber = null,
        ?string $transactionDate = null,
        ?string $remarks = null,
        ?int $userId = null
    ): array {
        $db = Database::getConnection();
        $warehouseId = self::getValidWarehouseId($warehouseId);
        $date = $transactionDate ?: date('Y-m-d');
        $qty = round($quantity, 3);

        if ($qty <= 0) {
            throw new InvalidArgumentException("Increase quantity must be greater than zero.");
        }

        // Lock existing stock row or insert if not exists
        $stmt = $db->prepare("
            SELECT id, quantity, reserved_quantity, available_quantity 
            FROM stock 
            WHERE material_type = ? AND material_id = ? AND warehouse_id = ?
            FOR UPDATE
        ");
        $stmt->execute([$materialType, $materialId, $warehouseId]);
        $stock = $stmt->fetch();

        if ($stock) {
            $newQuantity = $stock['quantity'] + $qty;
            $updateStmt = $db->prepare("
                UPDATE stock 
                SET quantity = ?, material_code = ?, material_name = ?, unit_id = ?, updated_at = NOW()
                WHERE id = ?
            ");
            $updateStmt->execute([$newQuantity, $materialCode, $materialName, $unitId, $stock['id']]);
        } else {
            $newQuantity = $qty;
            $insertStmt = $db->prepare("
                INSERT INTO stock (material_type, material_id, material_code, material_name, warehouse_id, quantity, reserved_quantity, unit_id, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, 0.000, ?, NOW())
            ");
            $insertStmt->execute([$materialType, $materialId, $materialCode, $materialName, $warehouseId, $newQuantity, $unitId]);
        }
        self::syncAvailable($stock ? (int)$stock['id'] : self::stockRowId($materialType, $materialId, $warehouseId));

        // Insert into immutable stock ledger
        $ledgerStmt = $db->prepare("
            INSERT INTO stock_ledger (
                transaction_type, transaction_id, material_type, material_id, material_code,
                warehouse_id, quantity_in, quantity_out, balance_after, unit_id, rate,
                reference_number, batch_lot_number, transaction_date, remarks, created_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 0.000, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $ledgerStmt->execute([
            $transactionType,
            $transactionId,
            $materialType,
            $materialId,
            $materialCode,
            $warehouseId,
            $qty,
            $newQuantity,
            $unitId,
            $rate,
            $referenceNumber,
            $batchLotNumber,
            $date,
            $remarks,
            $userId
        ]);

        return [
            'material_type' => $materialType,
            'material_id'   => $materialId,
            'warehouse_id'  => $warehouseId,
            'previous_qty'  => $stock ? (float)$stock['quantity'] : 0.0,
            'new_qty'       => $newQuantity,
            'quantity_in'   => $qty
        ];
    }

    /**
     * Decrease stock (e.g. Sales, Scrap Sale, Direct Consumption, Adjustment Out, Transfer Out)
     */
    public static function decreaseStock(
        string $materialType,
        int $materialId,
        string $materialCode,
        int $warehouseId,
        float $quantity,
        int $unitId,
        float $rate,
        string $transactionType,
        string $transactionId,
        ?string $referenceNumber = null,
        ?string $batchLotNumber = null,
        ?string $transactionDate = null,
        ?string $remarks = null,
        ?int $userId = null,
        bool $allowNegativeOverride = false
    ): array {
        $db = Database::getConnection();
        $warehouseId = self::getValidWarehouseId($warehouseId);
        $date = $transactionDate ?: date('Y-m-d');
        $qty = round($quantity, 3);

        if ($qty <= 0) {
            throw new InvalidArgumentException("Decrease quantity must be greater than zero.");
        }

        $stmt = $db->prepare("
            SELECT id, quantity, reserved_quantity, available_quantity 
            FROM stock 
            WHERE material_type = ? AND material_id = ? AND warehouse_id = ?
            FOR UPDATE
        ");
        $stmt->execute([$materialType, $materialId, $warehouseId]);
        $stock = $stmt->fetch();

        $currentQty = $stock ? (float)$stock['quantity'] : 0.0;
        $availQty = $stock ? ((float)$stock['quantity'] - (float)$stock['reserved_quantity']) : 0.0;

        // Check company negative stock policy
        $settingsStmt = $db->query("SELECT allow_negative_stock FROM company_settings WHERE id = 1");
        $allowNegative = (bool)($settingsStmt->fetchColumn() ?? 0);

        if (!$allowNegative && !$allowNegativeOverride && ($currentQty < $qty || $availQty < $qty)) {
            throw new RuntimeException("Insufficient stock for {$materialType} [{$materialCode}]. Available: {$availQty}, Requested: {$qty}");
        }

        $newQuantity = $currentQty - $qty;

        if ($stock) {
            $updateStmt = $db->prepare("
                UPDATE stock 
                SET quantity = ?, updated_at = NOW()
                WHERE id = ?
            ");
            $updateStmt->execute([$newQuantity, $stock['id']]);
        } else {
            $matName = $materialCode;
            if ($materialType === 'RM') {
                $nStmt = $db->prepare("SELECT material_name FROM raw_materials WHERE id = ?");
                $nStmt->execute([$materialId]);
                $matName = $nStmt->fetchColumn() ?: $materialCode;
            } elseif ($materialType === 'FG') {
                $nStmt = $db->prepare("SELECT product_name FROM finished_goods WHERE id = ?");
                $nStmt->execute([$materialId]);
                $matName = $nStmt->fetchColumn() ?: $materialCode;
            }
            $insertStmt = $db->prepare("
                INSERT INTO stock (material_type, material_id, material_code, material_name, warehouse_id, quantity, reserved_quantity, unit_id, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, 0.000, ?, NOW())
            ");
            $insertStmt->execute([$materialType, $materialId, $materialCode, $matName, $warehouseId, $newQuantity, $unitId]);
        }
        self::syncAvailable($stock ? (int)$stock['id'] : self::stockRowId($materialType, $materialId, $warehouseId));

        // Insert into immutable stock ledger
        $ledgerStmt = $db->prepare("
            INSERT INTO stock_ledger (
                transaction_type, transaction_id, material_type, material_id, material_code,
                warehouse_id, quantity_in, quantity_out, balance_after, unit_id, rate,
                reference_number, batch_lot_number, transaction_date, remarks, created_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 0.000, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $ledgerStmt->execute([
            $transactionType,
            $transactionId,
            $materialType,
            $materialId,
            $materialCode,
            $warehouseId,
            $qty,
            $newQuantity,
            $unitId,
            $rate,
            $referenceNumber,
            $batchLotNumber,
            $date,
            $remarks,
            $userId
        ]);

        return [
            'material_type' => $materialType,
            'material_id'   => $materialId,
            'warehouse_id'  => $warehouseId,
            'previous_qty'  => $currentQty,
            'new_qty'       => $newQuantity,
            'quantity_out'  => $qty
        ];
    }

    /**
     * Reserve Raw Material for Production Plan
     */
    public static function reserveStock(
        string $materialType,
        int $materialId,
        string $materialCode,
        int $warehouseId,
        float $quantity,
        string $transactionId,
        ?string $referenceNumber = null,
        ?int $userId = null
    ): void {
        $db = Database::getConnection();
        $qty = round($quantity, 3);

        $stmt = $db->prepare("
            SELECT id, quantity, reserved_quantity, available_quantity, unit_id 
            FROM stock 
            WHERE material_type = ? AND material_id = ? AND warehouse_id = ?
            FOR UPDATE
        ");
        $stmt->execute([$materialType, $materialId, $warehouseId]);
        $stock = $stmt->fetch();

        $stockAvail = $stock ? ((float)$stock['quantity'] - (float)$stock['reserved_quantity']) : 0.0;
        if (!$stock || $stockAvail < $qty) {
            $avail = $stockAvail;
            throw new RuntimeException("Cannot reserve {$qty} of {$materialCode}. Available: {$avail}");
        }

        $newReserved = (float)$stock['reserved_quantity'] + $qty;
        $db->prepare("UPDATE stock SET reserved_quantity = ?, updated_at = NOW() WHERE id = ?")
           ->execute([$newReserved, $stock['id']]);
        self::syncAvailable((int)$stock['id']);

        // Ledger record for reservation tracking
        $db->prepare("
            INSERT INTO stock_ledger (
                transaction_type, transaction_id, material_type, material_id, material_code,
                warehouse_id, quantity_in, quantity_out, balance_after, unit_id,
                reference_number, transaction_date, remarks, created_by, created_at
            ) VALUES ('PRODUCTION_RESERVE', ?, ?, ?, ?, ?, 0.000, 0.000, ?, ?, ?, CURDATE(), ?, ?, NOW())
        ")->execute([
            $transactionId,
            $materialType,
            $materialId,
            $materialCode,
            $warehouseId,
            $stock['quantity'],
            $stock['unit_id'],
            $referenceNumber,
            "Reserved {$qty} for Production Order {$referenceNumber}",
            $userId
        ]);
    }

    /**
     * Consume reserved stock during actual production execution
     */
    public static function consumeReservedStock(
        string $materialType,
        int $materialId,
        string $materialCode,
        int $warehouseId,
        float $quantity,
        int $unitId,
        string $transactionId,
        ?string $referenceNumber = null,
        ?int $userId = null,
        ?string $remarks = null
    ): void {
        $db = Database::getConnection();
        $qty = round($quantity, 3);

        $stmt = $db->prepare("
            SELECT id, quantity, reserved_quantity 
            FROM stock 
            WHERE material_type = ? AND material_id = ? AND warehouse_id = ?
            FOR UPDATE
        ");
        $stmt->execute([$materialType, $materialId, $warehouseId]);
        $stock = $stmt->fetch();

        if (!$stock) {
            throw new RuntimeException("Stock not found for {$materialCode}");
        }

        $newQuantity = max(0.0, (float)$stock['quantity'] - $qty);
        $newReserved = max(0.0, (float)$stock['reserved_quantity'] - $qty);

        $db->prepare("UPDATE stock SET quantity = ?, reserved_quantity = ?, updated_at = NOW() WHERE id = ?")
           ->execute([$newQuantity, $newReserved, $stock['id']]);
        self::syncAvailable((int)$stock['id']);

        $db->prepare("
            INSERT INTO stock_ledger (
                transaction_type, transaction_id, material_type, material_id, material_code,
                warehouse_id, quantity_in, quantity_out, balance_after, unit_id,
                reference_number, transaction_date, remarks, created_by, created_at
            ) VALUES ('PRODUCTION_CONSUMPTION', ?, ?, ?, ?, ?, 0.000, ?, ?, ?, ?, CURDATE(), ?, ?, NOW())
        ")->execute([
            $transactionId,
            $materialType,
            $materialId,
            $materialCode,
            $warehouseId,
            $qty,
            $newQuantity,
            $unitId,
            $referenceNumber,
            $remarks ?: "Consumed in Production Order {$referenceNumber}",
            $userId
        ]);
    }

    /**
     * Release reserved stock back to available (e.g. if Production Order cancelled)
     */
    public static function releaseReservation(
        string $materialType,
        int $materialId,
        string $materialCode,
        int $warehouseId,
        float $quantity,
        string $transactionId,
        ?string $referenceNumber = null,
        ?int $userId = null
    ): void {
        $db = Database::getConnection();
        $qty = round($quantity, 3);

        $stmt = $db->prepare("
            SELECT id, quantity, reserved_quantity, unit_id 
            FROM stock 
            WHERE material_type = ? AND material_id = ? AND warehouse_id = ?
            FOR UPDATE
        ");
        $stmt->execute([$materialType, $materialId, $warehouseId]);
        $stock = $stmt->fetch();

        if ($stock) {
            $newReserved = max(0.0, (float)$stock['reserved_quantity'] - $qty);
            $db->prepare("UPDATE stock SET reserved_quantity = ?, updated_at = NOW() WHERE id = ?")
               ->execute([$newReserved, $stock['id']]);
            self::syncAvailable((int)$stock['id']);

            $db->prepare("
                INSERT INTO stock_ledger (
                    transaction_type, transaction_id, material_type, material_id, material_code,
                    warehouse_id, quantity_in, quantity_out, balance_after, unit_id,
                    reference_number, transaction_date, remarks, created_by, created_at
                ) VALUES ('PRODUCTION_RELEASE', ?, ?, ?, ?, ?, 0.000, 0.000, ?, ?, ?, CURDATE(), ?, ?, NOW())
            ")->execute([
                $transactionId,
                $materialType,
                $materialId,
                $materialCode,
                $warehouseId,
                $stock['quantity'],
                $stock['unit_id'],
                $referenceNumber,
                "Released {$qty} reserved for {$referenceNumber}",
                $userId
            ]);
        }
    }

    /**
     * Stock Adjustment (Physical vs System count)
     */
    public static function adjustStock(
        string $materialType,
        int $materialId,
        string $materialCode,
        string $materialName,
        int $warehouseId,
        float $physicalQty,
        int $unitId,
        string $reason,
        ?string $remarks = null,
        ?int $userId = null
    ): array {
        $db = Database::getConnection();
        $db->beginTransaction();

        try {
            $stmt = $db->prepare("
                SELECT id, quantity, available_quantity 
                FROM stock 
                WHERE material_type = ? AND material_id = ? AND warehouse_id = ?
                FOR UPDATE
            ");
            $stmt->execute([$materialType, $materialId, $warehouseId]);
            $stock = $stmt->fetch();

            $currentQty = $stock ? (float)$stock['quantity'] : 0.0;
            $diff = round($physicalQty - $currentQty, 3);
            $adjNumber = 'ADJ-' . strtoupper(bin2hex(random_bytes(4)));

            if ($diff == 0) {
                $db->rollBack();
                return ['status' => 'no_change', 'message' => 'Physical quantity matches system quantity.'];
            }

            $adjType = $diff > 0 ? 'IN' : 'OUT';
            $absDiff = abs($diff);

            // Record adjustment master
            $adjStmt = $db->prepare("
                INSERT INTO stock_adjustments (
                    adjustment_number, material_type, material_id, warehouse_id, adjustment_type,
                    system_quantity, physical_quantity, difference_quantity, reason, remarks, created_by, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ");
            $adjStmt->execute([
                $adjNumber,
                $materialType,
                $materialId,
                $warehouseId,
                $adjType,
                $currentQty,
                $physicalQty,
                $diff,
                $reason,
                $remarks,
                $userId ?? 1
            ]);

            if ($diff > 0) {
                self::increaseStock(
                    $materialType,
                    $materialId,
                    $materialCode,
                    $materialName,
                    $warehouseId,
                    $absDiff,
                    $unitId,
                    0.00,
                    'ADJUSTMENT_IN',
                    $adjNumber,
                    $adjNumber,
                    null,
                    date('Y-m-d'),
                    "Adjustment [{$reason}]: {$remarks}",
                    $userId
                );
            } else {
                self::decreaseStock(
                    $materialType,
                    $materialId,
                    $materialCode,
                    $warehouseId,
                    $absDiff,
                    $unitId,
                    0.00,
                    'ADJUSTMENT_OUT',
                    $adjNumber,
                    $adjNumber,
                    null,
                    date('Y-m-d'),
                    "Adjustment [{$reason}]: {$remarks}",
                    $userId
                );
            }

            AuditService::log('STOCK_ADJUSTMENT', 'INVENTORY', $adjNumber, ['old_qty' => $currentQty], ['new_qty' => $physicalQty, 'reason' => $reason]);

            $db->commit();
            return [
                'adjustment_number'   => $adjNumber,
                'previous_quantity'   => $currentQty,
                'physical_quantity'   => $physicalQty,
                'difference_quantity' => $diff
            ];
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }

    /**
     * Stock Transfer between warehouses
     */
    public static function transferStock(
        int $sourceWarehouseId,
        int $destWarehouseId,
        array $items, // array of ['material_type', 'material_id', 'material_code', 'material_name', 'quantity', 'unit_id']
        ?string $remarks = null,
        ?int $userId = null
    ): string {
        $db = Database::getConnection();
        $db->beginTransaction();

        try {
            if ($sourceWarehouseId === $destWarehouseId) {
                throw new InvalidArgumentException("Source and destination warehouses cannot be the same.");
            }
            $whChk = $db->prepare("SELECT COUNT(*) FROM warehouses WHERE id IN (?, ?) AND active = 1");
            $whChk->execute([$sourceWarehouseId, $destWarehouseId]);
            if ((int)$whChk->fetchColumn() !== 2) {
                throw new InvalidArgumentException("Source or destination warehouse is invalid or inactive.");
            }
            $srcLabel = self::warehouseLabel($sourceWarehouseId);
            $dstLabel = self::warehouseLabel($destWarehouseId);
            $note = $remarks ? " - {$remarks}" : '';
            $movedLines = 0;

            $txNumber = 'TRF-' . strtoupper(bin2hex(random_bytes(4)));

            $txStmt = $db->prepare("
                INSERT INTO stock_transfers (transfer_number, source_warehouse_id, destination_warehouse_id, transfer_date, status, remarks, created_by, created_at)
                VALUES (?, ?, ?, CURDATE(), 'COMPLETED', ?, ?, NOW())
            ");
            $txStmt->execute([$txNumber, $sourceWarehouseId, $destWarehouseId, $remarks, $userId ?? 1]);
            $transferId = $db->lastInsertId();

            foreach ($items as $item) {
                $qty = round((float)$item['quantity'], 3);
                if ($qty <= 0) continue;

                // Transfer items row
                $db->prepare("
                    INSERT INTO stock_transfer_items (transfer_id, material_type, material_id, quantity, unit_id)
                    VALUES (?, ?, ?, ?, ?)
                ")->execute([$transferId, $item['material_type'], $item['material_id'], $qty, $item['unit_id']]);

                // 1. Decrease source
                self::decreaseStock(
                    $item['material_type'],
                    $item['material_id'],
                    $item['material_code'],
                    $sourceWarehouseId,
                    $qty,
                    $item['unit_id'],
                    0.00,
                    'TRANSFER_OUT',
                    $txNumber,
                    $txNumber,
                    null,
                    date('Y-m-d'),
                    "Transferred to {$dstLabel}{$note}",
                    $userId
                );

                // 2. Increase destination
                self::increaseStock(
                    $item['material_type'],
                    $item['material_id'],
                    $item['material_code'],
                    $item['material_name'],
                    $destWarehouseId,
                    $qty,
                    $item['unit_id'],
                    0.00,
                    'TRANSFER_IN',
                    $txNumber,
                    $txNumber,
                    null,
                    date('Y-m-d'),
                    "Transferred from {$srcLabel}{$note}",
                    $userId
                );
                $movedLines++;
            }

            if ($movedLines === 0) {
                throw new InvalidArgumentException("No valid transfer lines (quantity must be greater than zero).");
            }

            AuditService::log('STOCK_TRANSFER', 'INVENTORY', $txNumber, ['source' => $sourceWarehouseId, 'dest' => $destWarehouseId], ['items' => $items]);

            $db->commit();
            return $txNumber;
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }
}
