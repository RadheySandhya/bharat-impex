<?php
require_once __DIR__ . '/api/core/Database.php';
$db = Database::getConnection();
$rows = $db->query("SELECT * FROM stock_ledger WHERE id IN (52, 53)")->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($rows, JSON_PRETTY_PRINT);
