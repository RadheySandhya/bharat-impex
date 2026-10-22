<?php
require_once __DIR__ . '/../core/Database.php';

try {
    $db = Database::getConnection();
    $cols = $db->query("SHOW COLUMNS FROM processes LIKE 'sequence'")->fetchAll();
    if (empty($cols)) {
        $db->exec("ALTER TABLE processes ADD COLUMN sequence INT DEFAULT 1 AFTER standard_duration_minutes");
        echo "Added sequence column to processes table.\n";
    } else {
        echo "Sequence column already exists in processes.\n";
    }

    // Set initial sequential order 1..9
    $procs = $db->query("SELECT id FROM processes ORDER BY id ASC")->fetchAll(PDO::FETCH_COLUMN);
    $upStmt = $db->prepare("UPDATE processes SET sequence = ? WHERE id = ?");
    foreach ($procs as $idx => $pid) {
        $upStmt->execute([$idx + 1, $pid]);
    }
    echo "Initialized sequences for " . count($procs) . " processes.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
