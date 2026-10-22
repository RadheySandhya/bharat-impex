<?php
// ============================================================
// BHARAT IMPEX — AUTOMATED 23:59 EOD STOCK SNAPSHOT SCRIPT
// ============================================================
// This script runs automatically every night at 23:59 (11:59 PM).
// It captures the end-of-day closing stock of all Finished Goods
// and writes them into daily_stock_snapshots.
// Once captured, this day's stock is permanently frozen as "yesterday's stock",
// allowing the next day to start with these balances while today's stock
// calculates dynamically in real-time from Sales, Purchases, and Production.
// ============================================================

if (php_sapi_name() !== 'cli' && empty($_GET['secret'])) {
    // If accessed via browser, allow with optional key or admin session
    // header('Content-Type: text/plain');
}

require_once __DIR__ . '/api/core/Database.php';
require_once __DIR__ . '/api/controllers/StockController.php';

$now = date('Y-m-d H:i:s');
$targetDate = $argv[1] ?? ($_GET['date'] ?? date('Y-m-d'));

echo "============================================================\n";
echo "BHARAT IMPEX — EOD STOCK SNAPSHOT ENGINE\n";
echo "Execution Timestamp: {$now}\n";
echo "Target Snapshot Date: {$targetDate}\n";
echo "============================================================\n";

try {
    $db = Database::getConnection();

    // 1. Auto-catchup any missed prior days before taking today's snapshot
    StockController::autoCatchupSnapshots($db);

    // 2. Execute snapshot for target date
    $result = StockController::executeEodSnapshot($targetDate, $db);

    $itemsCount = $result['recorded_items'] ?? 0;

    // 3. Log execution into audit_logs
    try {
        $auditStmt = $db->prepare("
            INSERT INTO audit_logs (action, module, record_id, details, ip_address, created_at)
            VALUES ('EOD_SNAPSHOT_2359', 'STOCK', ?, ?, 'CLI_CRON', NOW())
        ");
        $details = json_encode([
            'date'         => $targetDate,
            'items_count'  => $itemsCount,
            'triggered_at' => $now,
            'mode'         => php_sapi_name() === 'cli' ? 'CLI_CRON_2359' : 'WEB_TRIGGER'
        ]);
        $auditStmt->execute([$targetDate, $details]);
    } catch (Exception $e) {
        // Audit log table optional or silent pass
    }

    echo "[SUCCESS] Successfully captured and frozen EOD stock for {$itemsCount} items for date: {$targetDate}.\n";
    echo "============================================================\n";
    exit(0);
} catch (Exception $e) {
    echo "[ERROR] Snapshot execution failed: " . $e->getMessage() . "\n";
    echo "============================================================\n";
    exit(1);
}
