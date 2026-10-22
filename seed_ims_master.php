<?php
// ============================================================
// BHARAT IMPEX — IMS TRI NAGAR MASTER SEEDER
// Populates real categories, finished goods master, stock ledger, and stock balances
// ============================================================

require_once __DIR__ . '/api/core/Database.php';

try {
    $db = Database::getConnection();
    echo "Connected to DB\n";

    // Ensure table for daily snapshots if desired
    $db->exec("
        CREATE TABLE IF NOT EXISTS `daily_stock_snapshots` (
            `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
            `snapshot_date` DATE NOT NULL,
            `material_type` ENUM('RM', 'FG', 'SCRAP') NOT NULL,
            `material_id` INT NOT NULL,
            `material_code` VARCHAR(50) NOT NULL,
            `group_name` VARCHAR(150) NULL,
            `closing_stock` DECIMAL(14, 3) NOT NULL DEFAULT 0.000,
            `max_level` DECIMAL(14, 3) NOT NULL DEFAULT 0.000,
            `min_level` DECIMAL(14, 3) NOT NULL DEFAULT 0.000,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY `uk_date_mat` (`snapshot_date`, `material_type`, `material_id`),
            INDEX `idx_snap_date` (`snapshot_date`)
        ) ENGINE=InnoDB;
    ");

    $items = [
        ['cat_no' => 'ABS-7522', 'name' => 'ABS CLOVA SOAP DISH OVAL', 'group' => 'ABS ACCESSORIES', 'max' => 25, 'min' => 10, 'stock' => 15, 'd05' => 15, 'd06' => 15, 'd07' => 15, 'd08' => 15],
        ['cat_no' => 'ABS-7521', 'name' => 'ABS CLOVA SOAP DISH SQUARE', 'group' => 'ABS ACCESSORIES', 'max' => 25, 'min' => 10, 'stock' => 60, 'd05' => 60, 'd06' => 60, 'd07' => 60, 'd08' => 60],
        ['cat_no' => 'ABS-7524', 'name' => 'ABS CLOVA TOWEL RING', 'group' => 'ABS ACCESSORIES', 'max' => 25, 'min' => 10, 'stock' => 57, 'd05' => 57, 'd06' => 57, 'd07' => 57, 'd08' => 57],
        ['cat_no' => 'CON-1408', 'name' => '2 IN 1 BIB COCK ABS CONTY', 'group' => 'ABS CONTY', 'max' => 20, 'min' => 10, 'stock' => 31, 'd05' => 31, 'd06' => 31, 'd07' => 31, 'd08' => 31],
        ['cat_no' => 'CON-1403', 'name' => 'ANGLE COCK ABS CONTY', 'group' => 'ABS CONTY', 'max' => 100, 'min' => 20, 'stock' => 72, 'd05' => 72, 'd06' => 72, 'd07' => 72, 'd08' => 72],
        ['cat_no' => 'CON-1404', 'name' => 'LONG BODY ABS CONTY', 'group' => 'ABS CONTY', 'max' => 150, 'min' => 30, 'stock' => 141, 'd05' => 141, 'd06' => 141, 'd07' => 141, 'd08' => 141],
        ['cat_no' => 'OHA-2766-BK', 'name' => 'OVER HEAD SHOWER CUBIX 6X6 BLACK JALI', 'group' => 'OVERHEAD SHOWER ABS', 'max' => 300, 'min' => 50, 'stock' => 0, 'd05' => 0, 'd06' => 0, 'd07' => 0, 'd08' => 0],
        ['cat_no' => 'PAC-1274', 'name' => 'ANGLE COCK BLANCO ROUND', 'group' => 'PROJECT ANGLE COCK', 'max' => 500, 'min' => 50, 'stock' => 0, 'd05' => 0, 'd06' => 0, 'd07' => 0, 'd08' => 0],
        ['cat_no' => 'ARA-7108', 'name' => 'ARALIA - BATH SET', 'group' => 'ARALIA SERIES', 'max' => 0, 'min' => 5, 'stock' => 8, 'd05' => 8, 'd06' => 8, 'd07' => 8, 'd08' => 8],
        ['cat_no' => 'ARA-7102', 'name' => 'ARALIA - TOWEL ROD 24"', 'group' => 'ARALIA SERIES', 'max' => 0, 'min' => 5, 'stock' => 14, 'd05' => 14, 'd06' => 14, 'd07' => 14, 'd08' => 14],
        ['cat_no' => 'APC-1265', 'name' => 'AUTO PUSH ANGLE COCK', 'group' => 'AUTOMATIC FAUCET', 'max' => 50, 'min' => 10, 'stock' => 19, 'd05' => 19, 'd06' => 19, 'd07' => 19, 'd08' => 19],
        ['cat_no' => '8400', 'name' => 'BATHROOM CHAIR WALL MOUNTED', 'group' => 'BATH ROOM CHAIR', 'max' => 0, 'min' => 5, 'stock' => 24, 'd05' => 24, 'd06' => 24, 'd07' => 24, 'd08' => 24],
        ['cat_no' => 'BSR-2103', 'name' => 'BEND SHOWER LILY', 'group' => 'BEND SHOWER 100 SERIES', 'max' => 100, 'min' => 20, 'stock' => 173, 'd05' => 173, 'd06' => 173, 'd07' => 173, 'd08' => 173],
        ['cat_no' => 'BSR-2102', 'name' => 'BEND SHOWER NUPUR', 'group' => 'BEND SHOWER 100 SERIES', 'max' => 100, 'min' => 20, 'stock' => 253, 'd05' => 253, 'd06' => 253, 'd07' => 253, 'd08' => 253],
        ['cat_no' => 'BSR-2105', 'name' => 'BEND SHOWER TULIP', 'group' => 'BEND SHOWER 100 SERIES', 'max' => 0, 'min' => 20, 'stock' => 329, 'd05' => 329, 'd06' => 329, 'd07' => 329, 'd08' => 329],
        ['cat_no' => 'BSR-2366', 'name' => 'BEND SHOWER HEENA', 'group' => 'BEND SHOWER 300 SERIES', 'max' => 50, 'min' => 15, 'stock' => 118, 'd05' => 118, 'd06' => 118, 'd07' => 118, 'd08' => 118],
        ['cat_no' => 'BSR-2356', 'name' => 'BEND SHOWER - HONEY', 'group' => 'BEND SHOWER 300 SERIES', 'max' => 50, 'min' => 15, 'stock' => 153, 'd05' => 153, 'd06' => 153, 'd07' => 153, 'd08' => 153],
        ['cat_no' => 'BSR-2361', 'name' => 'BEND SHOWER LOTUS', 'group' => 'BEND SHOWER 300 SERIES', 'max' => 50, 'min' => 15, 'stock' => 79, 'd05' => 79, 'd06' => 79, 'd07' => 79, 'd08' => 79],
        ['cat_no' => 'BSR-2369', 'name' => 'BEND SHOWER EXCEL WITH BRASS ARM', 'group' => 'O/H ABS + BRASS SHOWER', 'max' => 50, 'min' => 10, 'stock' => 0, 'd05' => 0, 'd06' => 0, 'd07' => 0, 'd08' => 0],
        ['cat_no' => 'BSR-2364', 'name' => 'BEND SHOWER HAMMER', 'group' => 'BEND SHOWER 300 SERIES', 'max' => 150, 'min' => 25, 'stock' => 353, 'd05' => 353, 'd06' => 353, 'd07' => 353, 'd08' => 353],
        ['cat_no' => 'BSR-2365', 'name' => 'BEND SHOWER HANKO', 'group' => 'BEND SHOWER 300 SERIES', 'max' => 100, 'min' => 20, 'stock' => 167, 'd05' => 167, 'd06' => 167, 'd07' => 167, 'd08' => 167],
        ['cat_no' => 'BSR-2367', 'name' => 'BEND SHOWER HYDRA', 'group' => 'BEND SHOWER 300 SERIES', 'max' => 50, 'min' => 15, 'stock' => 113, 'd05' => 113, 'd06' => 113, 'd07' => 113, 'd08' => 113],
        ['cat_no' => 'BSR-2371', 'name' => 'BEND SHOWER ALMOND', 'group' => 'BEND SHOWER 300 SERIES', 'max' => 100, 'min' => 20, 'stock' => 106, 'd05' => 106, 'd06' => 106, 'd07' => 106, 'd08' => 106],
        ['cat_no' => 'BSR-2372', 'name' => 'BEND SHOWER APRICOT', 'group' => 'BEND SHOWER 300 SERIES', 'max' => 50, 'min' => 15, 'stock' => 340, 'd05' => 340, 'd06' => 340, 'd07' => 340, 'd08' => 340],
        ['cat_no' => 'BSR-2418', 'name' => 'BEND SHOWER NANO', 'group' => 'O/H ABS + BRASS SHOWER', 'max' => 50, 'min' => 10, 'stock' => 0, 'd05' => 0, 'd06' => 0, 'd07' => 0, 'd08' => 0],
        ['cat_no' => 'OHA-2645', 'name' => 'BODY JET SHOWER WATER TILE (4X4)', 'group' => 'SHOWER BEND', 'max' => 0, 'min' => 5, 'stock' => 11, 'd05' => 11, 'd06' => 11, 'd07' => 11, 'd08' => 11],
        ['cat_no' => 'BTP-1903', 'name' => 'BOTTLE TRAP PARCO', 'group' => 'Bottle Trap', 'max' => 50, 'min' => 15, 'stock' => 56, 'd05' => 56, 'd06' => 56, 'd07' => 56, 'd08' => 56],
        ['cat_no' => 'BTP-1901', 'name' => 'BOTTLE TRAP STD', 'group' => 'Bottle Trap', 'max' => 300, 'min' => 50, 'stock' => 314, 'd05' => 318, 'd06' => 318, 'd07' => 314, 'd08' => 314],
        ['cat_no' => 'BTP-8718', 'name' => 'BT PIPE BRASS CP SEAMLESS 18"', 'group' => 'Bottle Trap Pipe', 'max' => 100, 'min' => 20, 'stock' => 39, 'd05' => 43, 'd06' => 43, 'd07' => 39, 'd08' => 39],
        ['cat_no' => 'BTP-8714', 'name' => 'BT PIPE STAINLESS STEEL 18" (SS)', 'group' => 'Bottle Trap Pipe', 'max' => 250, 'min' => 50, 'stock' => 651, 'd05' => 651, 'd06' => 651, 'd07' => 651, 'd08' => 651],
    ];

    // Ensure unit_id 3 (PCS) exists
    $unitStmt = $db->query("SELECT id FROM units WHERE unit_code = 'PCS' LIMIT 1");
    $unitRow = $unitStmt->fetch();
    $unitId = $unitRow ? (int)$unitRow['id'] : 3;

    // Ensure warehouse_id 3 (Finished Goods Warehouse) exists
    $whStmt = $db->query("SELECT id FROM warehouses WHERE id = 3 LIMIT 1");
    $whRow = $whStmt->fetch();
    $whId = $whRow ? 3 : 1;

    foreach ($items as $item) {
        // 1. Ensure category exists
        $catCode = strtoupper(preg_replace('/[^A-Z0-9]/', '_', $item['group']));
        $catStmt = $db->prepare("SELECT id FROM categories WHERE category_name = ? LIMIT 1");
        $catStmt->execute([$item['group']]);
        $cat = $catStmt->fetch();
        if (!$cat) {
            $insCat = $db->prepare("INSERT INTO categories (category_code, category_name, category_type) VALUES (?, ?, 'FG')");
            $insCat->execute([$catCode, $item['group']]);
            $categoryId = (int)$db->lastInsertId();
        } else {
            $categoryId = (int)$cat['id'];
        }

        // 2. Insert or update Finished Good
        $fgStmt = $db->prepare("SELECT id FROM finished_goods WHERE fg_code = ? LIMIT 1");
        $fgStmt->execute([$item['cat_no']]);
        $fg = $fgStmt->fetch();
        if (!$fg) {
            $insFg = $db->prepare("
                INSERT INTO finished_goods (fg_code, product_name, category_id, unit_id, minimum_stock, maximum_stock, reorder_level, active)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1)
            ");
            $insFg->execute([
                $item['cat_no'],
                $item['name'],
                $categoryId,
                $unitId,
                $item['min'],
                $item['max'],
                $item['min']
            ]);
            $fgId = (int)$db->lastInsertId();
        } else {
            $fgId = (int)$fg['id'];
            $updFg = $db->prepare("
                UPDATE finished_goods SET product_name = ?, category_id = ?, minimum_stock = ?, maximum_stock = ?, reorder_level = ? WHERE id = ?
            ");
            $updFg->execute([
                $item['name'],
                $categoryId,
                $item['min'],
                $item['max'],
                $item['min'],
                $fgId
            ]);
        }

        // 3. Insert or update Stock table
        $stkStmt = $db->prepare("SELECT id FROM stock WHERE material_type = 'FG' AND material_id = ? AND warehouse_id = ?");
        $stkStmt->execute([$fgId, $whId]);
        $stk = $stkStmt->fetch();
        if (!$stk) {
            $insStk = $db->prepare("
                INSERT INTO stock (material_type, material_id, material_code, material_name, warehouse_id, quantity, reserved_quantity, unit_id)
                VALUES ('FG', ?, ?, ?, ?, ?, 0, ?)
            ");
            $insStk->execute([$fgId, $item['cat_no'], $item['name'], $whId, $item['stock'], $unitId]);
        } else {
            $updStk = $db->prepare("UPDATE stock SET quantity = ?, material_code = ?, material_name = ? WHERE id = ?");
            $updStk->execute([$item['stock'], $item['cat_no'], $item['name'], $stk['id']]);
        }

        // 4. Seed Daily Stock Snapshots for the days (05, 06, 07, 08 of current month)
        $yearMonth = date('Y-m');
        $dates = [
            "{$yearMonth}-05" => $item['d05'],
            "{$yearMonth}-06" => $item['d06'],
            "{$yearMonth}-07" => $item['d07'],
            "{$yearMonth}-08" => $item['d08'],
        ];

        foreach ($dates as $snapDate => $snapQty) {
            $insSnap = $db->prepare("
                INSERT INTO daily_stock_snapshots (snapshot_date, material_type, material_id, material_code, group_name, closing_stock, max_level, min_level)
                VALUES (?, 'FG', ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE closing_stock = VALUES(closing_stock), group_name = VALUES(group_name), max_level = VALUES(max_level), min_level = VALUES(min_level)
            ");
            $insSnap->execute([
                $snapDate,
                $fgId,
                $item['cat_no'],
                $item['group'],
                $snapQty,
                $item['max'],
                $item['min']
            ]);
        }
    }

    echo "Successfully seeded " . count($items) . " Bharat Impex Tri Nagar items & daily stock history into MySQL!\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
