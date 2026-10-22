<?php
require_once __DIR__ . '/api/core/Database.php';

try {
    $db = Database::getConnection();

    // 1. Activate only the 4 configured processes
    $db->exec("UPDATE processes SET active = 0");
    $db->exec("UPDATE processes SET active = 1 WHERE process_code IN ('PROC-CAST', 'PROC-CNC', 'PROC-POLISH', 'PROC-ASSY')");

    // 2. Set the 4 stages route for all Finished Goods
    $fgStmt = $db->query("SELECT id FROM finished_goods");
    $fgs = $fgStmt->fetchAll(PDO::FETCH_COLUMN);

    $db->exec("DELETE FROM process_product_mapping");

    $insStmt = $db->prepare("
        INSERT INTO process_product_mapping (fg_id, process_id, sequence, is_mandatory, expected_loss_percent, description, active)
        VALUES (?, ?, ?, 1, 1.00, ?, 1)
    ");

    $configuredStages = [
        ['code' => 'PROC-CAST', 'seq' => 1, 'desc' => 'Gravity Die Casting'],
        ['code' => 'PROC-CNC',  'seq' => 2, 'desc' => 'CNC Machining & Threading'],
        ['code' => 'PROC-POLISH','seq' => 3, 'desc' => 'Mirror Buffing & Polishing'],
        ['code' => 'PROC-ASSY', 'seq' => 4, 'desc' => 'Assembly & Cartridge Fitment'],
    ];

    $procMap = [];
    $pRows = $db->query("SELECT id, process_code FROM processes WHERE process_code IN ('PROC-CAST', 'PROC-CNC', 'PROC-POLISH', 'PROC-ASSY')")->fetchAll();
    foreach ($pRows as $p) {
        $procMap[$p['process_code']] = (int)$p['id'];
    }

    foreach ($fgs as $fgId) {
        foreach ($configuredStages as $stage) {
            $pId = $procMap[$stage['code']] ?? null;
            if ($pId) {
                $insStmt->execute([$fgId, $pId, $stage['seq'], $stage['desc']]);
            }
        }
    }

    echo "Successfully synchronized all product routes and active processes to the 4 configured stages!\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
