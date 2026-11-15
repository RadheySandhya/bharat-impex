<?php
// ============================================================
// BHARAT IMPEX — LIVE DATABASE SYNC & MIGRATION RUNNER
// ============================================================

define('DEPLOY_SECRET', 'bharat_impex_deploy_secret_key_2026');

$secret = $_GET['secret'] ?? '';
if (!hash_equals(DEPLOY_SECRET, $secret)) {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit;
}

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../core/Database.php';

$response = [
    'status' => 'success',
    'timestamp' => date('Y-m-d H:i:s T'),
    'database' => '',
    'backup_file' => null,
    'migrations' => [],
    'data_synced' => []
];

try {
    $db = Database::getConnection();
    $dbName = $db->query('SELECT DATABASE()')->fetchColumn();
    $response['database'] = $dbName;

    // ---------------------------------------------------------
    // 1. SAFETY FIRST: BACKUP REMOTE DATABASE
    // ---------------------------------------------------------
    $backupDir = __DIR__ . '/../../database/backups';
    if (!is_dir($backupDir)) {
        @mkdir($backupDir, 0755, true);
    }
    $backupFileName = 'db_backup_' . date('Ymd_His') . '.sql';
    $backupFilePath = $backupDir . '/' . $backupFileName;

    // Export tables to backup file
    $tables = $db->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    $backupContent = "-- BHARAT IMPEX DATABASE BACKUP\n-- Database: {$dbName}\n-- Date: " . date('Y-m-d H:i:s T') . "\n\n";
    $backupContent .= "SET FOREIGN_KEY_CHECKS=0;\n\n";

    foreach ($tables as $tbl) {
        $createTableSql = $db->query("SHOW CREATE TABLE `{$tbl}`")->fetch(PDO::FETCH_ASSOC)['Create Table'] ?? '';
        $backupContent .= "-- Table: {$tbl}\n";
        $backupContent .= "DROP TABLE IF EXISTS `{$tbl}`;\n";
        $backupContent .= $createTableSql . ";\n\n";

        $rows = $db->query("SELECT * FROM `{$tbl}`")->fetchAll(PDO::FETCH_ASSOC);
        if (!empty($rows)) {
            $cols = array_keys($rows[0]);
            $colList = implode('`, `', $cols);
            $backupContent .= "INSERT INTO `{$tbl}` (`{$colList}`) VALUES\n";
            $valRows = [];
            foreach ($rows as $row) {
                $escaped = array_map(function($val) use ($db) {
                    if ($val === null) return 'NULL';
                    return $db->quote($val);
                }, array_values($row));
                $valRows[] = "(" . implode(', ', $escaped) . ")";
            }
            $backupContent .= implode(",\n", $valRows) . ";\n\n";
        }
    }
    $backupContent .= "SET FOREIGN_KEY_CHECKS=1;\n";
    file_put_contents($backupFilePath, $backupContent);
    $response['backup_file'] = $backupFileName . ' (' . round(filesize($backupFilePath) / 1024, 2) . ' KB)';

    // ---------------------------------------------------------
    // 2. SCHEMA MIGRATIONS (Additive, Safe, Idempotent)
    // ---------------------------------------------------------

    // A. production_planning: item_type & rm_id
    $planCols = $db->query("SHOW COLUMNS FROM production_planning")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('item_type', $planCols)) {
        $db->exec("ALTER TABLE production_planning ADD COLUMN item_type VARCHAR(5) NOT NULL DEFAULT 'FG' AFTER planning_number");
        $response['migrations'][] = "Added column item_type to production_planning";
    }
    if (!in_array('rm_id', $planCols)) {
        $db->exec("ALTER TABLE production_planning ADD COLUMN rm_id INT NULL AFTER fg_id");
        $response['migrations'][] = "Added column rm_id to production_planning";
    }

    // Ensure fg_id allows NULL
    $fgIdCol = $db->query("SHOW COLUMNS FROM production_planning LIKE 'fg_id'")->fetch(PDO::FETCH_ASSOC);
    if ($fgIdCol && strtoupper($fgIdCol['Null'] ?? '') === 'NO') {
        $db->exec("ALTER TABLE production_planning MODIFY fg_id INT NULL");
        $response['migrations'][] = "Modified fg_id in production_planning to allow NULL";
    }

    // B. rejection_lots: parent_lot_number, location_type, location_key, location_name
    $rejCols = $db->query("SHOW COLUMNS FROM rejection_lots")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('parent_lot_number', $rejCols)) {
        $db->exec("ALTER TABLE rejection_lots ADD COLUMN parent_lot_number VARCHAR(50) NULL AFTER lot_number");
        $response['migrations'][] = "Added column parent_lot_number to rejection_lots";
    }
    if (!in_array('location_type', $rejCols)) {
        $db->exec("ALTER TABLE rejection_lots
            ADD COLUMN location_type VARCHAR(20) NULL AFTER current_step,
            ADD COLUMN location_key VARCHAR(100) NULL AFTER location_type,
            ADD COLUMN location_name VARCHAR(150) NULL AFTER location_key");
        $response['migrations'][] = "Added location columns to rejection_lots";
    }

    // ---------------------------------------------------------
    // 3. MASTER DATA SYNC (INSERT OR UPDATE)
    // ---------------------------------------------------------

    // A. Processes (5 Standard Stages)
    $processes = [
        ['id' => 1, 'code' => 'PROC-GRIND', 'name' => 'CASTING', 'desc' => 'Stage: CASTING', 'dur' => 25, 'seq' => 1],
        ['id' => 2, 'code' => 'PROC-CNC', 'name' => 'Machining', 'desc' => 'Stage: Machining', 'dur' => 35, 'seq' => 2],
        ['id' => 3, 'code' => 'PROC-ASSY', 'name' => 'Grinding', 'desc' => 'Stage: Grinding', 'dur' => 20, 'seq' => 3],
        ['id' => 4, 'code' => 'PROC-PACK', 'name' => 'Polishing', 'desc' => 'Stage: Polishing', 'dur' => 15, 'seq' => 4],
        ['id' => 5, 'code' => 'PROC-5', 'name' => 'Assembly', 'desc' => 'Stage: Assembly', 'dur' => 30, 'seq' => 5],
    ];

    $procStmt = $db->prepare("
        INSERT INTO processes (id, process_code, process_name, description, standard_duration_minutes, sequence, active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
            process_name = VALUES(process_name),
            description = VALUES(description),
            sequence = VALUES(sequence),
            active = VALUES(active),
            updated_at = NOW()
    ");

    $procCount = 0;
    foreach ($processes as $p) {
        $procStmt->execute([$p['id'], $p['code'], $p['name'], $p['desc'], $p['dur'], $p['seq']]);
        $procCount++;
    }
    $response['data_synced'][] = "Synced {$procCount} production stages/processes";

    // B. Process Product Mappings (10 stage mappings for FG 1 and FG 2)
    $mappings = [
        ['id' => 19, 'fg_id' => 1, 'proc_id' => 1, 'seq' => 1],
        ['id' => 20, 'fg_id' => 1, 'proc_id' => 2, 'seq' => 2],
        ['id' => 21, 'fg_id' => 1, 'proc_id' => 3, 'seq' => 3],
        ['id' => 22, 'fg_id' => 1, 'proc_id' => 4, 'seq' => 4],
        ['id' => 23, 'fg_id' => 1, 'proc_id' => 5, 'seq' => 5],
        ['id' => 24, 'fg_id' => 2, 'proc_id' => 1, 'seq' => 1],
        ['id' => 25, 'fg_id' => 2, 'proc_id' => 2, 'seq' => 2],
        ['id' => 26, 'fg_id' => 2, 'proc_id' => 3, 'seq' => 3],
        ['id' => 27, 'fg_id' => 2, 'proc_id' => 4, 'seq' => 4],
        ['id' => 28, 'fg_id' => 2, 'proc_id' => 5, 'seq' => 5],
    ];

    $mapStmt = $db->prepare("
        INSERT INTO process_product_mapping (id, fg_id, process_id, sequence, is_mandatory, expected_loss_percent, active, created_at)
        VALUES (?, ?, ?, ?, 1, 0.50, 1, NOW())
        ON DUPLICATE KEY UPDATE
            sequence = VALUES(sequence),
            is_mandatory = VALUES(is_mandatory),
            expected_loss_percent = VALUES(expected_loss_percent),
            active = VALUES(active)
    ");

    $mapCount = 0;
    foreach ($mappings as $m) {
        $mapStmt->execute([$m['id'], $m['fg_id'], $m['proc_id'], $m['seq']]);
        $mapCount++;
    }
    $response['data_synced'][] = "Synced {$mapCount} product-process stage mappings";

    // C. Rejection Reasons (Standard 8 Defect Reasons)
    $defects = [
        'REJ-001' => 'Blow Hole / Porosity',
        'REJ-002' => 'Crack / Shrinkage',
        'REJ-003' => 'Tool Break / Undercut',
        'REJ-004' => 'Thread Slip / Burr',
        'REJ-005' => 'Dimension Out of Tolerance',
        'REJ-006' => 'Buffing Dent / Scratches',
        'REJ-007' => 'Plating Blister / Color Peel',
        'REJ-008' => 'Assembly Leak / Pressure Drop'
    ];
    $rejStmt = $db->prepare("
        INSERT INTO rejection_reasons (reason_code, reason_name, category, active, created_at)
        VALUES (?, ?, 'GENERAL', 1, NOW())
        ON DUPLICATE KEY UPDATE
            reason_name = VALUES(reason_name),
            active = VALUES(active)
    ");
    $rejCount = 0;
    foreach ($defects as $code => $name) {
        $rejStmt->execute([$code, $name]);
        $rejCount++;
    }
    $response['data_synced'][] = "Synced {$rejCount} rejection defect reasons";

    // ---------------------------------------------------------
    // 4. VERIFY FINAL STATUS
    // ---------------------------------------------------------
    $response['final_counts'] = [
        'processes' => (int)$db->query("SELECT COUNT(*) FROM processes")->fetchColumn(),
        'process_product_mapping' => (int)$db->query("SELECT COUNT(*) FROM process_product_mapping")->fetchColumn(),
        'rejection_reasons' => (int)$db->query("SELECT COUNT(*) FROM rejection_reasons")->fetchColumn(),
        'production_planning' => (int)$db->query("SELECT COUNT(*) FROM production_planning")->fetchColumn(),
        'rejection_lots' => (int)$db->query("SELECT COUNT(*) FROM rejection_lots")->fetchColumn(),
        'raw_materials' => (int)$db->query("SELECT COUNT(*) FROM raw_materials")->fetchColumn(),
        'finished_goods' => (int)$db->query("SELECT COUNT(*) FROM finished_goods")->fetchColumn(),
        'stock' => (int)$db->query("SELECT COUNT(*) FROM stock")->fetchColumn(),
        'stock_ledger' => (int)$db->query("SELECT COUNT(*) FROM stock_ledger")->fetchColumn(),
        'users' => (int)$db->query("SELECT COUNT(*) FROM users")->fetchColumn(),
        'warehouses' => (int)$db->query("SELECT COUNT(*) FROM warehouses")->fetchColumn(),
    ];

    echo json_encode($response, JSON_PRETTY_PRINT);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ], JSON_PRETTY_PRINT);
}
