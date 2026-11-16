<?php
// ============================================================
// BHARAT IMPEX — SUB-CHILD PART (VARIANT) GODOWN STOCK SERVICE
// ------------------------------------------------------------
// A master Child Part (e.g. "Handle") can have many Sub-Child Parts
// (e.g. "Handle Type A", "Handle Type B"). Each sub-child part keeps its
// own stock per godown, exactly like a child part does.
//
// The parent Child Part's godown stock stays the TOTAL of everything
// physically in that godown (generic + all variants), so every existing
// report, BOM shortage check and ledger keeps working unchanged.
// ============================================================

class SubChildStockService {

    private static bool $schemaChecked = false;

    public static function ensureSchema(): void {
        if (self::$schemaChecked) return;
        $db = Database::getConnection();
        // DDL implicitly COMMITs an open transaction in MySQL - never run it mid-transaction.
        if ($db->inTransaction()) return;
        self::$schemaChecked = true;

        try {
            BOMService::ensureSchema($db);
            $hasCol = $db->query("SHOW COLUMNS FROM `sub_child_parts` LIKE 'current_stock'")->fetchAll();
            if (empty($hasCol)) {
                $db->exec("ALTER TABLE `sub_child_parts` ADD COLUMN `current_stock` DECIMAL(14, 3) NOT NULL DEFAULT 0.000 AFTER `standard_rate`");
            }

            $db->exec("
                CREATE TABLE IF NOT EXISTS `sub_child_part_stock` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `sub_child_part_id` INT NOT NULL,
                    `warehouse_id` INT NOT NULL,
                    `quantity` DECIMAL(14, 3) NOT NULL DEFAULT 0.000,
                    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY `uq_scp_wh` (`sub_child_part_id`, `warehouse_id`),
                    INDEX `idx_scps_wh` (`warehouse_id`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            ");

            $db->exec("
                CREATE TABLE IF NOT EXISTS `sub_child_part_ledger` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `sub_child_part_id` INT NOT NULL,
                    `warehouse_id` INT NOT NULL,
                    `transaction_type` VARCHAR(40) NOT NULL,
                    `reference_number` VARCHAR(100) NULL,
                    `quantity_in` DECIMAL(14, 3) NOT NULL DEFAULT 0.000,
                    `quantity_out` DECIMAL(14, 3) NOT NULL DEFAULT 0.000,
                    `balance_after` DECIMAL(14, 3) NOT NULL DEFAULT 0.000,
                    `remarks` VARCHAR(500) NULL,
                    `created_by` INT NULL,
                    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX `idx_scpl_part` (`sub_child_part_id`),
                    INDEX `idx_scpl_ref` (`reference_number`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            ");

            // One-time migration: older versions kept a single flat counter with no godown.
            // Park that balance in the default godown so nothing is lost.
            $legacy = $db->query("
                SELECT scp.id, scp.current_stock
                FROM sub_child_parts scp
                WHERE scp.current_stock <> 0
                  AND NOT EXISTS (SELECT 1 FROM sub_child_part_stock s WHERE s.sub_child_part_id = scp.id)
            ")->fetchAll();
            if ($legacy) {
                $whId = InventoryService::getValidWarehouseId(1);
                $ins = $db->prepare("INSERT IGNORE INTO sub_child_part_stock (sub_child_part_id, warehouse_id, quantity) VALUES (?, ?, ?)");
                foreach ($legacy as $row) {
                    $ins->execute([(int)$row['id'], $whId, (float)$row['current_stock']]);
                }
            }
        } catch (Exception $e) {
            error_log('SubChildStockService schema heal failed: ' . $e->getMessage());
        }
    }

    /**
     * Active variants of a child part.
     */
    public static function variantsOf(int $rmId): array {
        self::ensureSchema();
        $db = Database::getConnection();
        $st = $db->prepare("SELECT id, parent_rm_id, sub_part_code, sub_part_name, brand_name, standard_rate, COALESCE(current_stock,0) AS current_stock
                            FROM sub_child_parts WHERE parent_rm_id = ? AND active = 1 ORDER BY brand_name, sub_part_name");
        $st->execute([$rmId]);
        return $st->fetchAll();
    }

    /**
     * Quantity of one variant in one godown.
     */
    public static function available(int $scpId, int $warehouseId): float {
        self::ensureSchema();
        $db = Database::getConnection();
        $st = $db->prepare("SELECT quantity FROM sub_child_part_stock WHERE sub_child_part_id = ? AND warehouse_id = ?");
        $st->execute([$scpId, $warehouseId]);
        return (float)($st->fetchColumn() ?: 0);
    }

    /**
     * Godown-wise stock for many variants: [scpId => [ {warehouse_id, warehouse_name, quantity}, ... ]]
     */
    public static function stockByWarehouse(array $scpIds = []): array {
        self::ensureSchema();
        $db = Database::getConnection();
        $sql = "SELECT s.sub_child_part_id, s.warehouse_id, w.warehouse_code, w.warehouse_name, s.quantity
                FROM sub_child_part_stock s
                JOIN warehouses w ON w.id = s.warehouse_id
                WHERE s.quantity <> 0";
        $params = [];
        $scpIds = array_values(array_filter(array_map('intval', $scpIds)));
        if ($scpIds) {
            $sql .= " AND s.sub_child_part_id IN (" . implode(',', array_fill(0, count($scpIds), '?')) . ")";
            $params = $scpIds;
        }
        $sql .= " ORDER BY w.id ASC";
        $st = $db->prepare($sql);
        $st->execute($params);
        $out = [];
        foreach ($st->fetchAll() as $r) {
            $out[(int)$r['sub_child_part_id']][] = [
                'warehouse_id'   => (int)$r['warehouse_id'],
                'warehouse_code' => $r['warehouse_code'],
                'warehouse_name' => $r['warehouse_name'],
                'quantity'       => (float)$r['quantity'],
            ];
        }
        return $out;
    }

    /**
     * Move variant stock in a godown by $delta (+ in, - out) and write the variant ledger.
     * Keeps sub_child_parts.current_stock = total across all godowns.
     * Does NOT touch the parent child part stock — callers do that through InventoryService.
     */
    public static function move(
        int $scpId,
        int $warehouseId,
        float $delta,
        string $transactionType,
        ?string $reference = null,
        ?string $remarks = null,
        ?int $userId = null,
        bool $allowNegative = true
    ): float {
        self::ensureSchema();
        $db = Database::getConnection();
        $delta = round($delta, 3);
        if ($delta == 0.0) return self::available($scpId, $warehouseId);

        $st = $db->prepare("SELECT id, quantity FROM sub_child_part_stock WHERE sub_child_part_id = ? AND warehouse_id = ? FOR UPDATE");
        $st->execute([$scpId, $warehouseId]);
        $row = $st->fetch();
        $current = $row ? (float)$row['quantity'] : 0.0;
        $new = round($current + $delta, 3);

        if ($new < 0 && !$allowNegative) {
            $nm = $db->prepare("SELECT CONCAT(brand_name, ' - ', sub_part_name) FROM sub_child_parts WHERE id = ?");
            $nm->execute([$scpId]);
            $label = $nm->fetchColumn() ?: "Sub-child part #{$scpId}";
            throw new RuntimeException("Insufficient stock for sub-child part [{$label}] in " . InventoryService::warehouseLabel($warehouseId) . ". Available: {$current}, Requested: " . abs($delta));
        }

        if ($row) {
            $db->prepare("UPDATE sub_child_part_stock SET quantity = ?, updated_at = NOW() WHERE id = ?")->execute([$new, $row['id']]);
        } else {
            $db->prepare("INSERT INTO sub_child_part_stock (sub_child_part_id, warehouse_id, quantity) VALUES (?, ?, ?)")
               ->execute([$scpId, $warehouseId, $new]);
        }

        $db->prepare("UPDATE sub_child_parts SET current_stock = (SELECT COALESCE(SUM(quantity),0) FROM sub_child_part_stock WHERE sub_child_part_id = ?) WHERE id = ?")
           ->execute([$scpId, $scpId]);

        $db->prepare("
            INSERT INTO sub_child_part_ledger (sub_child_part_id, warehouse_id, transaction_type, reference_number, quantity_in, quantity_out, balance_after, remarks, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ")->execute([
            $scpId, $warehouseId, $transactionType, $reference,
            $delta > 0 ? $delta : 0, $delta < 0 ? -$delta : 0, $new,
            $remarks !== null ? mb_substr($remarks, 0, 500) : null, $userId
        ]);

        return $new;
    }

    /**
     * Shared kitting logic (Full Kitting & Planning release):
     * validates the chosen variant for a child part line and deducts it from the godown.
     * Returns [scpId|null, name|null, brand|null].
     */
    public static function consumeForKitting(
        array $item,
        int $rmId,
        string $rmName,
        int $warehouseId,
        float $qty,
        string $batchNo,
        bool $allowOverride,
        ?int $userId,
        bool $requireVariant
    ): array {
        self::ensureSchema();
        $db = Database::getConnection();
        $scpId = !empty($item['sub_child_part_id']) ? (int)$item['sub_child_part_id'] : 0;

        if ($scpId <= 0) {
            if ($requireVariant && count(self::variantsOf($rmId)) > 0) {
                throw new InvalidArgumentException("Please choose which sub-child part to use for \"{$rmName}\" (it has multiple types mapped).");
            }
            return [null, null, null];
        }

        $st = $db->prepare("SELECT id, parent_rm_id, sub_part_name, brand_name FROM sub_child_parts WHERE id = ?");
        $st->execute([$scpId]);
        $scp = $st->fetch();
        if (!$scp) {
            throw new InvalidArgumentException("Selected sub-child part #{$scpId} was not found.");
        }
        if ((int)$scp['parent_rm_id'] !== $rmId) {
            throw new InvalidArgumentException("Sub-child part \"{$scp['sub_part_name']}\" is not mapped under child part \"{$rmName}\".");
        }

        self::move($scpId, $warehouseId, -$qty, 'PRODUCTION_CONSUMPTION', $batchNo,
            "Full Kitting for Batch #{$batchNo}", $userId, $allowOverride);

        return [$scpId, $scp['sub_part_name'], $scp['brand_name']];
    }
}
