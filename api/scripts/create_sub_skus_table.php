<?php
// Migration: Create sub_skus table and seed sample OEM brand mappings
require_once __DIR__ . '/../core/Database.php';

$db = Database::getConnection();

// 1. Create table
$sql = "
CREATE TABLE IF NOT EXISTS `sub_skus` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `parent_fg_id` INT NOT NULL,
    `sub_sku_code` VARCHAR(50) NOT NULL UNIQUE,
    `sub_sku_name` VARCHAR(255) NOT NULL,
    `brand_name` VARCHAR(150) NOT NULL,
    `client_item_code` VARCHAR(100) NULL,
    `selling_price` DECIMAL(12, 2) DEFAULT 0.00,
    `description` TEXT NULL,
    `active` TINYINT(1) DEFAULT 1,
    `created_by` INT NULL,
    `updated_by` INT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`parent_fg_id`) REFERENCES `finished_goods` (`id`) ON DELETE CASCADE,
    INDEX `idx_sub_sku_parent` (`parent_fg_id`),
    INDEX `idx_sub_sku_brand` (`brand_name`),
    INDEX `idx_sub_sku_name` (`sub_sku_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
";

$db->exec($sql);
echo "sub_skus table created successfully.\n";

// 2. Add optional sub_sku_id column to sale_inputs if not exists
try {
    $colCheck = $db->query("SHOW COLUMNS FROM sale_inputs LIKE 'sub_sku_id'")->fetch();
    if (!$colCheck) {
        $db->exec("ALTER TABLE sale_inputs ADD COLUMN sub_sku_id INT NULL AFTER fg_id, ADD INDEX idx_sale_sub_sku (sub_sku_id)");
        echo "Added sub_sku_id column to sale_inputs.\n";
    }
} catch (Exception $e) {
    echo "Notice: " . $e->getMessage() . "\n";
}

// 3. Seed sample OEM Brand Sub-SKUs as requested by user (Somany, Prince Pipe, Zen Bath Fittings)
$count = (int)$db->query("SELECT COUNT(*) FROM sub_skus")->fetchColumn();
if ($count === 0) {
    // Get parent FG 1 (Brass Basin Tap Model A)
    $fg1 = $db->query("SELECT id, fg_code, product_name, selling_price FROM finished_goods WHERE id = 1")->fetch();
    // Get parent FG 2 (Kitchen Sink Mixer)
    $fg2 = $db->query("SELECT id, fg_code, product_name, selling_price FROM finished_goods WHERE id = 2")->fetch();
    // Get parent FG 3 (Angle Valve 2-in-1)
    $fg3 = $db->query("SELECT id, fg_code, product_name, selling_price FROM finished_goods WHERE id = 3")->fetch();

    $samples = [];
    if ($fg1) {
        $samples[] = [
            'parent_fg_id'     => $fg1['id'],
            'sub_sku_code'     => 'SOM-TAP-01',
            'sub_sku_name'     => 'Somany Brass Basin Tap Model A',
            'brand_name'       => 'Somany',
            'selling_price'    => 1350.00,
            'description'      => 'OEM Branding for Somany Ceramics'
        ];
        $samples[] = [
            'parent_fg_id'     => $fg1['id'],
            'sub_sku_code'     => 'PP-TAP-01',
            'sub_sku_name'     => 'Prince Pipe Chrome Basin Tap',
            'brand_name'       => 'Prince Pipe',
            'selling_price'    => 1300.00,
            'description'      => 'Private Label for Prince Pipes & Fittings'
        ];
        $samples[] = [
            'parent_fg_id'     => $fg1['id'],
            'sub_sku_code'     => 'ZEN-TAP-01',
            'sub_sku_name'     => 'Zen Bath Elegance Basin Tap',
            'brand_name'       => 'Zen Bath Fittings',
            'selling_price'    => 1280.00,
            'description'      => 'Private Label for Zen Bath'
        ];
    }
    if ($fg3) {
        $samples[] = [
            'parent_fg_id'     => $fg3['id'],
            'sub_sku_code'     => 'SOM-ANG-02',
            'sub_sku_name'     => 'Somany Angle Valve 2-in-1 Heavy',
            'brand_name'       => 'Somany',
            'selling_price'    => 720.00,
            'description'      => 'OEM for Somany'
        ];
        $samples[] = [
            'parent_fg_id'     => $fg3['id'],
            'sub_sku_code'     => 'ZEN-ANG-02',
            'sub_sku_name'     => 'Zen Bath Angle Cock Duo',
            'brand_name'       => 'Zen Bath Fittings',
            'selling_price'    => 690.00,
            'description'      => 'OEM for Zen Bath Fittings'
        ];
    }

    $insertStmt = $db->prepare("
        INSERT INTO sub_skus (parent_fg_id, sub_sku_code, sub_sku_name, brand_name, selling_price, description, active)
        VALUES (?, ?, ?, ?, ?, ?, 1)
    ");

    $mapStmt = $db->prepare("
        INSERT INTO item_mappings (external_source, external_item_name, material_type, internal_item_id, internal_item_code, status, active)
        VALUES ('TALLY', ?, 'FG', ?, ?, 'MAPPED', 1)
        ON DUPLICATE KEY UPDATE internal_item_id = VALUES(internal_item_id), internal_item_code = VALUES(internal_item_code)
    ");

    foreach ($samples as $s) {
        $insertStmt->execute([
            $s['parent_fg_id'],
            $s['sub_sku_code'],
            $s['sub_sku_name'],
            $s['brand_name'],
            $s['selling_price'],
            $s['description']
        ]);

        // Sync into item_mappings for instant Tally import resolution!
        $parentCode = $s['parent_fg_id'] == 1 ? $fg1['fg_code'] : $fg3['fg_code'];
        $mapStmt->execute([
            strtoupper($s['sub_sku_name']),
            $s['parent_fg_id'],
            $parentCode
        ]);
    }

    echo "Seeded " . count($samples) . " sample Sub-SKUs and synced item_mappings.\n";
}
