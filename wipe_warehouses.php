<?php
// ============================================================
// BHARAT IMPEX — WIPE WAREHOUSES SCRIPT
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
    echo "403 ACCESS DENIED\n";
    exit;
}

require_once __DIR__ . '/api/core/Database.php';

try {
    $db = Database::getConnection();
    $db->exec("SET FOREIGN_KEY_CHECKS = 0");

    // Clear any references in company_settings
    try {
        $db->exec("UPDATE company_settings SET default_warehouse_id = NULL WHERE id = 1");
    } catch (\Exception $e) {}

    // Truncate warehouses table
    $db->exec("TRUNCATE TABLE warehouses");
    $db->exec("SET FOREIGN_KEY_CHECKS = 1");

    echo "============================================================\n";
    echo "✓ SUCCESS: All 3 old warehouses have been wiped completely!\n";
    echo "The warehouses table is now 100% empty.\n";
    echo "============================================================\n";
} catch (\Exception $e) {
    http_response_code(500);
    echo "ERROR: " . $e->getMessage() . "\n";
}
