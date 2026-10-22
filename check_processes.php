<?php
require_once __DIR__ . '/api/core/Database.php';
$db = Database::getConnection();

// View current process mappings
$stmt = $db->query("SELECT ppm.*, p.process_name, p.process_code FROM process_product_mapping ppm JOIN processes p ON ppm.process_id = p.id ORDER BY ppm.fg_id, ppm.sequence");
$rows = $stmt->fetchAll();
echo "Current Mappings (" . count($rows) . "):\n";
foreach ($rows as $r) {
    echo "FG #{$r['fg_id']} | Seq {$r['sequence']} | {$r['process_code']} - {$r['process_name']}\n";
}
