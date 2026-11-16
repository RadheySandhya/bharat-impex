<?php
// ============================================================
// BHARAT IMPEX — OEM / BRAND SUB-SKU GODOWN STOCK SERVICE
// ------------------------------------------------------------
// A finished good (e.g. "Pillar Cock") can be made for several OEM
// brands (Sub-SKUs: "Somany Pillar Cock", "Jaquar Pillar Cock" ...).
// Each Sub-SKU keeps its own stock per godown.
//
// The parent finished good's godown stock stays the TOTAL of everything
// physically there (own brand + every OEM brand), so all existing
// reports, dashboards and ledgers keep working unchanged.
// ============================================================

class SubSkuStockService {

    private static bool $schemaChecked = false;

    public static function ensureSchema(): void {
        if (self::$schemaChecked) return;
        $db = Database::getConnection();
        // DDL implicitly COMMITs an open transaction in MySQL - never run it mid-transaction.
        if ($db->inTransaction()) return;
        self::$schemaChecked = true;

        try {
            $db->exec("
                CREATE TABLE IF NOT EXISTS `sub_sku_stock` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `sub_sku_id` INT NOT NULL,
                    `warehouse_id` INT NOT NULL,
                    `quantity` DECIMAL(14, 3) NOT NULL DEFAULT 0.000,
                    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY `uq_ssku_wh` (`sub_sku_id`, `warehouse_id`),
                    INDEX `idx_sskus_wh` (`warehouse_id`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            ");
            $db->exec("
                CREATE TABLE IF NOT EXISTS `sub_sku_ledger` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `sub_sku_id` INT NOT NULL,
                    `warehouse_id` INT NOT NULL,
                    `transaction_type` VARCHAR(40) NOT NULL,
                    `reference_number` VARCHAR(100) NULL,
                    `quantity_in` DECIMAL(14, 3) NOT NULL DEFAULT 0.000,
                    `quantity_out` DECIMAL(14, 3) NOT NULL DEFAULT 0.000,
                    `balance_after` DECIMAL(14, 3) NOT NULL DEFAULT 0.000,
                    `remarks` VARCHAR(500) NULL,
                    `created_by` INT NULL,
                    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX `idx_sskul_sku` (`sub_sku_id`),
                    INDEX `idx_sskul_ref` (`reference_number`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            ");
            // Production plans remember which OEM brand is being made
            if (!$db->query("SHOW COLUMNS FROM production_planning LIKE 'sub_sku_id'")->fetch()) {
                $db->exec("ALTER TABLE production_planning ADD COLUMN sub_sku_id INT NULL DEFAULT NULL AFTER fg_id");
            }
            // Purchases can be brand-specific too
            if (!$db->query("SHOW COLUMNS FROM purchase_inputs LIKE 'sub_sku_id'")->fetch()) {
                $db->exec("ALTER TABLE purchase_inputs ADD COLUMN sub_sku_id INT NULL DEFAULT NULL AFTER fg_id");
            }
        } catch (Exception $e) {
            error_log('SubSkuStockService schema heal failed: ' . $e->getMessage());
        }
    }

    /** Active OEM brands of a finished good. */
    public static function brandsOf(int $fgId): array {
        $db = Database::getConnection();
        $st = $db->prepare("SELECT id, parent_fg_id, sub_sku_code, sub_sku_name, brand_name, selling_price
                            FROM sub_skus WHERE parent_fg_id = ? AND active = 1 ORDER BY brand_name, sub_sku_name");
        $st->execute([$fgId]);
        return $st->fetchAll();
    }

    /** Sub-SKU row, verified to belong to the finished good. */
    public static function requireForFg(int $subSkuId, int $fgId): array {
        $db = Database::getConnection();
        $st = $db->prepare("SELECT * FROM sub_skus WHERE id = ?");
        $st->execute([$subSkuId]);
        $s = $st->fetch();
        if (!$s) throw new InvalidArgumentException("OEM brand SKU #{$subSkuId} was not found.");
        if ((int)$s['parent_fg_id'] !== $fgId) {
            throw new InvalidArgumentException("OEM brand SKU \"{$s['sub_sku_name']}\" does not belong to this finished good.");
        }
        return $s;
    }

    public static function available(int $subSkuId, int $warehouseId): float {
        $db = Database::getConnection();
        $st = $db->prepare("SELECT quantity FROM sub_sku_stock WHERE sub_sku_id = ? AND warehouse_id = ?");
        $st->execute([$subSkuId, $warehouseId]);
        return (float)($st->fetchColumn() ?: 0);
    }

    public static function totals(array $ids = []): array {
        $db = Database::getConnection();
        $ids = array_values(array_filter(array_map('intval', $ids)));
        $sql = "SELECT sub_sku_id, SUM(quantity) q FROM sub_sku_stock";
        if ($ids) $sql .= " WHERE sub_sku_id IN (" . implode(',', $ids) . ")";
        $sql .= " GROUP BY sub_sku_id";
        $out = [];
        foreach ($db->query($sql)->fetchAll() as $r) $out[(int)$r['sub_sku_id']] = (float)$r['q'];
        return $out;
    }

    /** [subSkuId => [ {warehouse_id, warehouse_code, warehouse_name, quantity}, ... ]] */
    public static function stockByWarehouse(array $ids = []): array {
        $db = Database::getConnection();
        $ids = array_values(array_filter(array_map('intval', $ids)));
        $sql = "SELECT s.sub_sku_id, s.warehouse_id, w.warehouse_code, w.warehouse_name, s.quantity
                FROM sub_sku_stock s JOIN warehouses w ON w.id = s.warehouse_id
                WHERE s.quantity <> 0";
        if ($ids) $sql .= " AND s.sub_sku_id IN (" . implode(',', $ids) . ")";
        $sql .= " ORDER BY w.id ASC";
        $out = [];
        foreach ($db->query($sql)->fetchAll() as $r) {
            $out[(int)$r['sub_sku_id']][] = [
                'warehouse_id'   => (int)$r['warehouse_id'],
                'warehouse_code' => $r['warehouse_code'],
                'warehouse_name' => $r['warehouse_name'],
                'quantity'       => (float)$r['quantity'],
            ];
        }
        return $out;
    }

    /**
     * Move OEM brand stock in a godown by $delta (+ in / - out) and write the brand ledger.
     * Does NOT touch the parent finished good stock — callers do that through InventoryService.
     */
    public static function move(
        int $subSkuId,
        int $warehouseId,
        float $delta,
        string $transactionType,
        ?string $reference = null,
        ?string $remarks = null,
        ?int $userId = null,
        bool $allowNegative = true
    ): float {
        $db = Database::getConnection();
        $delta = round($delta, 3);
        if ($delta == 0.0) return self::available($subSkuId, $warehouseId);

        $st = $db->prepare("SELECT id, quantity FROM sub_sku_stock WHERE sub_sku_id = ? AND warehouse_id = ? FOR UPDATE");
        $st->execute([$subSkuId, $warehouseId]);
        $row = $st->fetch();
        $current = $row ? (float)$row['quantity'] : 0.0;
        $new = round($current + $delta, 3);

        if ($new < 0 && !$allowNegative) {
            $nm = $db->prepare("SELECT CONCAT(brand_name, ' - ', sub_sku_name) FROM sub_skus WHERE id = ?");
            $nm->execute([$subSkuId]);
            $label = $nm->fetchColumn() ?: "OEM SKU #{$subSkuId}";
            throw new RuntimeException("Insufficient stock of [{$label}] in " . InventoryService::warehouseLabel($warehouseId) . ". Available: {$current}, Requested: " . abs($delta));
        }

        if ($row) {
            $db->prepare("UPDATE sub_sku_stock SET quantity = ?, updated_at = NOW() WHERE id = ?")->execute([$new, $row['id']]);
        } else {
            $db->prepare("INSERT INTO sub_sku_stock (sub_sku_id, warehouse_id, quantity) VALUES (?, ?, ?)")
               ->execute([$subSkuId, $warehouseId, $new]);
        }

        $db->prepare("
            INSERT INTO sub_sku_ledger (sub_sku_id, warehouse_id, transaction_type, reference_number, quantity_in, quantity_out, balance_after, remarks, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ")->execute([
            $subSkuId, $warehouseId, $transactionType, $reference,
            $delta > 0 ? $delta : 0, $delta < 0 ? -$delta : 0, $new,
            $remarks !== null ? mb_substr($remarks, 0, 500) : null, $userId
        ]);

        return $new;
    }

    /** Company negative-stock policy (same rule the parent stock engine uses). */
    public static function negativeAllowed(): bool {
        $db = Database::getConnection();
        try {
            return (bool)($db->query("SELECT allow_negative_stock FROM company_settings WHERE id = 1")->fetchColumn() ?? 0);
        } catch (Exception $e) {
            return false;
        }
    }
}
