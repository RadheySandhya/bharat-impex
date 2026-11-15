<?php
$secret = $_GET['secret'] ?? '';
if (!hash_equals('bharat_impex_deploy_secret_key_2026', $secret)) {
    http_response_code(403);
    exit;
}

require_once __DIR__ . '/../core/Database.php';
$db = Database::getConnection();

$out = [];
$out['rejection_reasons'] = $db->query("SELECT * FROM rejection_reasons")->fetchAll(PDO::FETCH_ASSOC);
$out['users'] = $db->query("SELECT id, username, email, full_name, role_id, stage_access, active FROM users")->fetchAll(PDO::FETCH_ASSOC);
$out['planning_releases'] = $db->query("SELECT id, release_number, planning_id, release_quantity, release_date, status FROM planning_releases")->fetchAll(PDO::FETCH_ASSOC);

header('Content-Type: application/json');
echo json_encode($out, JSON_PRETTY_PRINT);
