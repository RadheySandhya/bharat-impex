<?php
// ============================================================
// BHARAT IMPEX — FULL FACTORY RESET SCRIPT
// Wipes all demo/old data and restores a pristine clean state
// ============================================================

define('CLEAN_SECRET', 'bharat_impex_deploy_secret_key_2026');

header('Content-Type: text/plain; charset=utf-8');

$isAuthorized = false;
if (isset($_GET['secret']) && hash_equals(CLEAN_SECRET, $_GET['secret'])) {
    $isAuthorized = true;
}
if (php_sapi_name() === 'cli') {
    $isAuthorized = true;
}

if (!$isAuthorized) {
    http_response_code(403);
    echo "403 ACCESS DENIED: Invalid or missing secret token\n";
    exit;
}

require_once __DIR__ . '/api/core/Database.php';

try {
    $db = Database::getConnection();
    echo "============================================================\n";
    echo "BHARAT IMPEX — SYSTEM CLEANUP & FACTORY RESET\n";
    echo "Timestamp: " . date('Y-m-d H:i:s T') . "\n";
    echo "Host: " . ($_SERVER['HTTP_HOST'] ?? 'cli/local') . "\n";
    echo "============================================================\n\n";

    $db->exec("SET FOREIGN_KEY_CHECKS = 0");

    // Keep only essential system reference tables intact
    $keepTables = [
        'users',
        'roles',
        'units',
        'processes',
        'company_settings',
        'warehouses',
        'rejection_reasons',
        'scrap_materials'
    ];

    // Fetch all existing tables in the database dynamically
    $allTables = $db->query("SHOW TABLES")->fetchAll(\PDO::FETCH_COLUMN);

    foreach ($allTables as $tbl) {
        if (in_array(strtolower($tbl), $keepTables)) {
            echo "ℹ️ Kept system definition table: `{$tbl}`\n";
            continue;
        }

        try {
            $db->exec("TRUNCATE TABLE `{$tbl}`");
            echo "✓ Truncated table: `{$tbl}`\n";
        } catch (\PDOException $e) {
            try {
                $db->exec("DELETE FROM `{$tbl}`");
                $db->exec("ALTER TABLE `{$tbl}` AUTO_INCREMENT = 1");
                echo "✓ Cleared table (via DELETE): `{$tbl}`\n";
            } catch (\PDOException $e2) {
                echo "⚠️ Note: Table `{$tbl}` skipped ({$e2->getMessage()})\n";
            }
        }
    }


    // Reset default admin user with clean secure password
    // Password hash for: BharatAdmin@2026!
    $cleanPassword = 'BharatAdmin@2026!';
    $newHash = password_hash($cleanPassword, PASSWORD_BCRYPT);

    $db->exec("DELETE FROM `users` WHERE `username` != 'admin'");
    
    // Ensure admin user exists with role_id = 1
    $checkAdmin = $db->query("SELECT id FROM users WHERE username = 'admin'")->fetch();
    if ($checkAdmin) {
        $stmt = $db->prepare("UPDATE `users` SET `password_hash` = ?, `full_name` = 'Bharat Impex Admin', `email` = 'admin@bharatimpex.com', `active` = 1, `updated_at` = NOW() WHERE `username` = 'admin'");
        $stmt->execute([$newHash]);
        echo "✓ Reset Administrator account (username: admin)\n";
    } else {
        $stmt = $db->prepare("INSERT INTO `users` (`username`, `email`, `password_hash`, `full_name`, `role_id`, `active`) VALUES ('admin', 'admin@bharatimpex.com', ?, 'Bharat Impex Admin', 1, 1)");
        $stmt->execute([$newHash]);
        echo "✓ Created fresh Administrator account (username: admin)\n";
    }

    // Seed clean default categories
    $defaultCategories = [
        ['category_name' => 'Raw Materials', 'category_code' => 'CAT-RM', 'category_type' => 'RM', 'description' => 'Brass Ingots, Rods, Scrap'],
        ['category_name' => 'Finished Goods', 'category_code' => 'CAT-FG', 'category_type' => 'FG', 'description' => 'Faucets, Showers, Bath Fittings'],
        ['category_name' => 'Bought Out Parts', 'category_code' => 'CAT-BOP', 'category_type' => 'RM', 'description' => 'Cartridges, Aerators, Washers, Screws'],
        ['category_name' => 'Packing Materials', 'category_code' => 'CAT-PKG', 'category_type' => 'RM', 'description' => 'Boxes, Monocartons, Tape, Pouches'],
        ['category_name' => 'Consumables', 'category_code' => 'CAT-CONS', 'category_type' => 'RM', 'description' => 'Buffing Compound, Cutting Oil, Grinding Wheels']
    ];

    $catStmt = $db->prepare("INSERT INTO `categories` (`category_name`, `category_code`, `category_type`, `description`, `active`) VALUES (?, ?, ?, ?, 1)");
    foreach ($defaultCategories as $c) {
        $catStmt->execute([$c['category_name'], $c['category_code'], $c['category_type'], $c['description']]);
    }
    echo "✓ Seeded 5 clean standard industry categories (Raw Materials, Finished Goods, BOP, Packing, Consumables)\n";

    $db->exec("SET FOREIGN_KEY_CHECKS = 1");

    echo "\n============================================================\n";
    echo "✓ FULL FACTORY RESET COMPLETED SUCCESSFULLY!\n";
    echo "============================================================\n";
    echo "New Login Credentials:\n";
    echo "Username: admin\n";
    echo "Password: {$cleanPassword}\n";
    echo "============================================================\n";

} catch (\Exception $e) {
    http_response_code(500);
    echo "\n❌ ERROR DURING CLEANUP: " . $e->getMessage() . "\n";
}
