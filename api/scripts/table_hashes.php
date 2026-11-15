<?php
// Script to generate MD5 of every table's data on remote
$secret = $_GET['secret'] ?? '';
if (!hash_equals('bharat_impex_deploy_secret_key_2026', $secret)) {
    http_response_code(403);
    exit;
}

require_once __DIR__ . '/../core/Database.php';
$db = Database::getConnection();

$tables = $db->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
$hashes = [];

foreach ($tables as $t) {
    $rows = $db->query("SELECT * FROM `{$t}` ORDER BY 1")->fetchAll(PDO::FETCH_ASSOC);
    $hashes[$t] = [
        'count' => count($rows),
        'md5' => md5(json_encode($rows))
    ];
}

header('Content-Type: application/json');
echo json_encode($hashes, JSON_PRETTY_PRINT);
