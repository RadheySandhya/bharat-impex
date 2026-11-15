<?php
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
    $dbName = $db->query('SELECT DATABASE()')->fetchColumn();
    
    $tables = $db->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    
    $result = [];
    foreach ($tables as $name) {
        if (empty($name)) continue;
        try {
            $cnt = (int)$db->query("SELECT COUNT(*) FROM `{$name}`")->fetchColumn();
            $cols = $db->query("SHOW COLUMNS FROM `{$name}`")->fetchAll(PDO::FETCH_COLUMN);
            $result[$name] = [
                'count' => $cnt,
                'columns' => $cols
            ];
        } catch (Exception $ex) {
            $result[$name] = ['error' => $ex->getMessage()];
        }
    }
    
    echo json_encode([
        'status' => 'success',
        'database' => $dbName,
        'server_time' => date('Y-m-d H:i:s T'),
        'table_count' => count($result),
        'tables' => $result
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
