<?php
require_once __DIR__ . '/api/core/Database.php';
$db = Database::getConnection();

echo "MySQL CURDATE(): " . $db->query("SELECT CURDATE()")->fetchColumn() . "\n";
echo "MySQL NOW(): " . $db->query("SELECT NOW()")->fetchColumn() . "\n";
echo "PHP date('Y-m-d'): " . date('Y-m-d') . "\n";

echo "\nRecent stock_ledger records:\n";
$rows = $db->query("SELECT id, material_type, material_id, material_code, quantity_in, quantity_out, transaction_type, transaction_date, created_at FROM stock_ledger ORDER BY id DESC LIMIT 10")->fetchAll(PDO::FETCH_ASSOC);
foreach ($rows as $r) {
    echo "ID: {$r['id']} | Type: {$r['material_type']} | MatID: {$r['material_id']} | Code: {$r['material_code']} | In: {$r['quantity_in']} | Out: {$r['quantity_out']} | TxType: {$r['transaction_type']} | TxDate: {$r['transaction_date']} | Created: {$r['created_at']}\n";
}
