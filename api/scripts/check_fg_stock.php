<?php
require_once __DIR__ . '/../core/Database.php';
$db = Database::getConnection();
$stock8 = $db->query("SELECT * FROM stock WHERE material_type = 'FG' AND material_id = 8")->fetchAll(PDO::FETCH_ASSOC);
echo "--- STOCK FOR FG ID 8 ---\n";
print_r($stock8);
