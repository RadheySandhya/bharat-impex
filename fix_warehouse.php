<?php
if (php_sapi_name() !== 'cli') {
    if (($_GET['secret'] ?? '') !== 'bharat_impex_deploy_secret_key_2026') {
        http_response_code(403);
        die("Forbidden: Invalid secret key.");
    }
}
header('Content-Type: text/plain; charset=UTF-8');
require_once __DIR__ . '/api/config/database.php';
$config = require __DIR__ . '/api/config/database.php';
$dsn = "{$config['driver']}:host={$config['host']};port={$config['port']};dbname={$config['database']};charset={$config['charset']}";

try {
    $db = new PDO($dsn, $config['username'], $config['password'], $config['options']);
    
    // Check current warehouses
    $stmt = $db->query("SELECT * FROM warehouses");
    $warehouses = $stmt->fetchAll();
    
    echo "Current warehouses in DB: " . count($warehouses) . "\n";
    
    if (count($warehouses) === 0) {
        // Insert clean primary default warehouse
        $insertStmt = $db->prepare("
            INSERT INTO warehouses (id, warehouse_code, warehouse_name, location, contact_person, phone, is_default, active, created_at, updated_at)
            VALUES (1, 'WH-01', 'Main Warehouse', 'Factory Store Unit', 'Store Manager', '', 1, 1, NOW(), NOW())
        ");
        $insertStmt->execute();
        echo "✓ Created default warehouse: [WH-01] Main Warehouse (ID: 1)\n";
    } else {
        foreach ($warehouses as $w) {
            echo "- ID: {$w['id']}, Code: {$w['warehouse_code']}, Name: {$w['warehouse_name']}\n";
        }
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
