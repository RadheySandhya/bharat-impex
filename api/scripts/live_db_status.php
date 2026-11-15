<?php
// Security check
$secret = $_GET['secret'] ?? '';
if (!hash_equals('bharat_impex_deploy_secret_key_2026', $secret)) {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../core/Database.php';

try {
    $db = Database::getConnection();
    
    // Get database info
    $dbName = $db->query('SELECT DATABASE()')->fetchColumn();
    
    // Get all tables and row counts
    $tablesStmt = $db->query("
        SELECT table_name, table_rows, create_time, update_time
        FROM information_schema.tables 
        WHERE table_schema = DATABASE()
        ORDER BY table_name ASC
    ");
    $tables = $tablesStmt->fetchAll(PDO::FETCH_ASSOC);
    
    $result = [];
    foreach ($tables as $t) {
        $name = $t['table_name'];
        // Accurate count
        $cnt = (int)$db->query("SELECT COUNT(*) FROM `{$name}`")->fetchColumn();
        $colsStmt = $db->query("SHOW COLUMNS FROM `{$name}`");
        $cols = $colsStmt->fetchAll(PDO::FETCH_COLUMN);
        
        $result[$name] = [
            'count' => $cnt,
            'columns' => $cols
        ];
    }
    
    echo json_encode([
        'status' => 'success',
        'database' => $dbName,
        'server_time' => date('Y-m-d H:i:s T'),
        'tables' => $result
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
