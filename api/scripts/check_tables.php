<?php
require_once __DIR__ . '/../core/Database.php';
$db = Database::getConnection();
echo "--- FINISHED GOODS SAMPLE ---\n";
$fgs = $db->query('SELECT id, fg_code, product_name, selling_price FROM finished_goods LIMIT 10')->fetchAll(PDO::FETCH_ASSOC);
print_r($fgs);
