<?php
// ============================================================
// BHARAT IMPEX — REMOVABLE DEMO / SAMPLE DATA
// ------------------------------------------------------------
// Fills every module with realistic sample data. Every record is tagged
// "DEMO-" (codes / numbers / invoices) or "DEMO " / "DEMO - " (names) so
// the whole set can be removed in one call without touching real data.
//
//   Browser : /api/scripts/demo_data.php?secret=...&action=status|seed|remove
//   CLI     : php api/scripts/demo_data.php status|seed|remove
//
// Stock is moved through the real stock engine (InventoryService /
// SubChildStockService), so ledgers, godown balances and the handle-type
// stock all agree exactly as if a user had entered everything by hand.
// ============================================================

$isCli = PHP_SAPI === 'cli';
if (!$isCli) {
    $secret = $_GET['secret'] ?? '';
    if (!hash_equals('bharat_impex_deploy_secret_key_2026', $secret)) {
        http_response_code(403);
        echo json_encode(['error' => 'Unauthorized']);
        exit;
    }
    header('Content-Type: application/json; charset=utf-8');
}
$action = $isCli ? ($argv[1] ?? 'status') : ($_GET['action'] ?? 'status');

date_default_timezone_set('Asia/Kolkata');
require_once __DIR__ . '/../core/Database.php';
require_once __DIR__ . '/../core/Response.php';
require_once __DIR__ . '/../core/Auth.php';
require_once __DIR__ . '/../services/AuditService.php';
require_once __DIR__ . '/../services/PermissionService.php';
require_once __DIR__ . '/../services/InventoryService.php';
require_once __DIR__ . '/../services/BOMService.php';
require_once __DIR__ . '/../services/SubChildStockService.php';
require_once __DIR__ . '/../services/SubSkuStockService.php';

function out(array $data): void {
    echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
    exit;
}

function tableExists(PDO $db, string $t): bool {
    static $cache = null;
    if ($cache === null) $cache = array_flip($db->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN));
    return isset($cache[$t]);
}

function ids(PDO $db, string $sql, array $p = []): array {
    $st = $db->prepare($sql);
    $st->execute($p);
    return array_map('intval', $st->fetchAll(PDO::FETCH_COLUMN));
}

function inList(array $ids): string {
    return $ids ? implode(',', array_map('intval', $ids)) : '0';
}

function demoIds(PDO $db): array {
    $fg  = ids($db, "SELECT id FROM finished_goods WHERE fg_code LIKE 'DEMO-%'");
    $rm  = ids($db, "SELECT id FROM raw_materials WHERE rm_code LIKE 'DEMO-%'");
    $scp = tableExists($db, 'sub_child_parts')
        ? ids($db, "SELECT id FROM sub_child_parts WHERE sub_part_code LIKE 'DEMO-%' OR parent_rm_id IN (" . inList($rm) . ")") : [];
    $plan = ids($db, "SELECT id FROM production_planning WHERE planning_number LIKE 'DEMO-%' OR fg_id IN (" . inList($fg) . ") OR rm_id IN (" . inList($rm) . ")");
    $bom = ids($db, "SELECT id FROM bom_headers WHERE fg_id IN (" . inList($fg) . ")");
    $po  = ids($db, "SELECT id FROM production_orders WHERE fg_id IN (" . inList($fg) . ")");
    return compact('fg', 'rm', 'scp', 'plan', 'bom', 'po');
}

function status(PDO $db): array {
    $d = demoIds($db);
    $count = fn($sql) => (int)$db->query($sql)->fetchColumn();
    return [
        'finished_goods'   => count($d['fg']),
        'child_parts'      => count($d['rm']),
        'sub_child_parts'  => count($d['scp']),
        'planning'         => count($d['plan']),
        'boms'             => count($d['bom']),
        'parties'          => $count("SELECT COUNT(*) FROM parties WHERE party_name LIKE 'DEMO %'"),
        'categories'       => $count("SELECT COUNT(*) FROM categories WHERE category_code LIKE 'DEMO-%'"),
        'stock_rows'       => $count("SELECT COUNT(*) FROM stock WHERE (material_type='RM' AND material_id IN (" . inList($d['rm']) . ")) OR (material_type='FG' AND material_id IN (" . inList($d['fg']) . "))"),
        'ledger_rows'      => $count("SELECT COUNT(*) FROM stock_ledger WHERE (material_type='RM' AND material_id IN (" . inList($d['rm']) . ")) OR (material_type='FG' AND material_id IN (" . inList($d['fg']) . "))"),
    ];
}

// ------------------------------------------------------------
// REMOVE
// ------------------------------------------------------------
function removeDemo(PDO $db): array {
    $d = demoIds($db);
    $rmL = inList($d['rm']); $fgL = inList($d['fg']); $scpL = inList($d['scp']);
    $planL = inList($d['plan']); $bomL = inList($d['bom']); $poL = inList($d['po']);
    $matWhere = "((material_type='RM' AND material_id IN ($rmL)) OR (material_type='FG' AND material_id IN ($fgL)))";

    $steps = [];
    // Production orders (legacy module) and their children, if a user created any for demo SKUs
    foreach (['production_stage_logs', 'production_consumption', 'production_outputs', 'production_rejections', 'production_stage_entries'] as $t) {
        if (tableExists($db, $t)) {
            $hasCol = $db->query("SHOW COLUMNS FROM `$t` LIKE 'production_order_id'")->fetchAll();
            if ($hasCol) $steps[] = "DELETE FROM `$t` WHERE production_order_id IN ($poL)";
        }
    }
    $steps[] = "DELETE FROM production_orders WHERE id IN ($poL)";
    if (tableExists($db, 'rejection_lots')) $steps[] = "DELETE FROM rejection_lots WHERE fg_id IN ($fgL) OR batch_no LIKE 'DEMO-%'";
    if (tableExists($db, 'planning_revisions')) $steps[] = "DELETE FROM planning_revisions WHERE planning_id IN ($planL)";
    $steps[] = "DELETE FROM planning_releases WHERE planning_id IN ($planL)";
    $steps[] = "DELETE FROM production_planning WHERE id IN ($planL)";
    if (tableExists($db, 'sub_child_part_ledger')) $steps[] = "DELETE FROM sub_child_part_ledger WHERE sub_child_part_id IN ($scpL)";
    if (tableExists($db, 'sub_child_part_stock')) $steps[] = "DELETE FROM sub_child_part_stock WHERE sub_child_part_id IN ($scpL)";
    $steps[] = "DELETE FROM bom_items WHERE bom_id IN ($bomL) OR rm_id IN ($rmL)";
    $steps[] = "DELETE FROM bom_headers WHERE id IN ($bomL)";
    if (tableExists($db, 'sub_child_parts')) $steps[] = "DELETE FROM sub_child_parts WHERE id IN ($scpL)";
    $sskuL = tableExists($db, 'sub_skus') ? inList(ids($db, "SELECT id FROM sub_skus WHERE parent_fg_id IN ($fgL) OR sub_sku_code LIKE 'DEMO-%'")) : '0';
    if (tableExists($db, 'sub_sku_ledger')) $steps[] = "DELETE FROM sub_sku_ledger WHERE sub_sku_id IN ($sskuL)";
    if (tableExists($db, 'sub_sku_stock')) $steps[] = "DELETE FROM sub_sku_stock WHERE sub_sku_id IN ($sskuL)";
    if (tableExists($db, 'sub_skus')) $steps[] = "DELETE FROM sub_skus WHERE id IN ($sskuL)";
    $steps[] = "DELETE FROM process_product_mapping WHERE fg_id IN ($fgL)";
    if (tableExists($db, 'item_mappings')) $steps[] = "DELETE FROM item_mappings WHERE (material_type='RM' AND internal_item_id IN ($rmL)) OR (material_type='FG' AND internal_item_id IN ($fgL))";
    $steps[] = "DELETE FROM daily_stock_snapshots WHERE $matWhere";
    $steps[] = "DELETE FROM stock_adjustments WHERE $matWhere";
    $steps[] = "DELETE FROM stock_transfer_items WHERE $matWhere";
    $steps[] = "DELETE FROM stock_transfers WHERE remarks LIKE 'DEMO%' AND id NOT IN (SELECT transfer_id FROM stock_transfer_items)";
    $steps[] = "DELETE FROM stock_ledger WHERE $matWhere";
    $steps[] = "DELETE FROM stock WHERE $matWhere";
    $steps[] = "DELETE FROM purchase_inputs WHERE rm_id IN ($rmL) OR fg_id IN ($fgL) OR invoice_number LIKE 'DEMO-%'";
    $steps[] = "DELETE FROM sale_inputs WHERE fg_id IN ($fgL) OR invoice_number LIKE 'DEMO-%'";
    $steps[] = "DELETE FROM finished_goods WHERE id IN ($fgL)";
    $steps[] = "DELETE FROM raw_materials WHERE id IN ($rmL)";
    $steps[] = "DELETE FROM parties WHERE party_name LIKE 'DEMO %'";
    $steps[] = "DELETE FROM categories WHERE category_code LIKE 'DEMO-%'";

    $done = [];
    $db->beginTransaction();
    try {
        foreach ($steps as $sql) {
            $n = $db->exec($sql);
            if ($n) $done[] = ['rows' => $n, 'sql' => preg_replace('/\s+/', ' ', substr($sql, 0, 90))];
        }
        $db->commit();
    } catch (Exception $e) {
        if ($db->inTransaction()) $db->rollBack();
        throw new RuntimeException('Removal rolled back, nothing deleted: ' . $e->getMessage());
    }
    return $done;
}

// ------------------------------------------------------------
// SEED
// ------------------------------------------------------------
function seedDemo(PDO $db): array {
    $log = [];
    $admin = (int)($db->query("SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE u.active = 1 ORDER BY (r.role_code = 'ADMIN') DESC, u.id ASC LIMIT 1")->fetchColumn() ?: 1);
    $day = fn(int $ago) => date('Y-m-d', strtotime("-{$ago} days"));

    $pcs = InventoryService::resolveUnitId(0, 'PCS');
    $set = InventoryService::resolveUnitId(0, 'SET');
    $whRM = InventoryService::getValidWarehouseId(1);
    $whWIP = InventoryService::getValidWarehouseId(2);
    $whFG = InventoryService::getValidWarehouseId(3);

    // ---------- Categories ----------
    $cat = [];
    foreach ([
        ['DEMO-CAT-KITCHEN', 'DEMO - Kitchen Mixers', 'FG'],
        ['DEMO-CAT-BATH',    'DEMO - Basin & Bath Fittings', 'FG'],
        ['DEMO-CAT-VALVE',   'DEMO - Angle & Pillar Cocks', 'FG'],
        ['DEMO-CAT-CAST',    'DEMO - Brass Castings', 'RM'],
        ['DEMO-CAT-COMP',    'DEMO - Cartridges, Spindles & Handles', 'RM'],
        ['DEMO-CAT-ACC',     'DEMO - Fittings & Packing', 'RM'],
    ] as [$code, $name, $type]) {
        $db->prepare("INSERT INTO categories (category_code, category_name, category_type, description, active) VALUES (?, ?, ?, 'Sample data', 1)")
           ->execute([$code, $name, $type]);
        $cat[$code] = (int)$db->lastInsertId();
    }
    $log[] = 'categories: ' . count($cat);

    // ---------- Parties ----------
    $parties = [
        ['DEMO Supplier - Jamnagar Brass Works', 'SUPPLIER', 'Ramesh Patel', '9800000001'],
        ['DEMO Supplier - Rajkot Cartridge Co', 'SUPPLIER', 'Suresh Shah', '9800000002'],
        ['DEMO Supplier - Delhi Packaging', 'SUPPLIER', 'Anil Kumar', '9800000003'],
        ['DEMO Customer - Sharma Sanitary Store', 'CUSTOMER', 'Vikas Sharma', '9800000004'],
        ['DEMO Customer - Gupta Hardware', 'CUSTOMER', 'Rohit Gupta', '9800000005'],
        ['DEMO Customer - Somany Bath Studio', 'CUSTOMER', 'Neha Jain', '9800000006'],
    ];
    foreach ($parties as [$n, $t, $c, $p]) {
        $db->prepare("INSERT INTO parties (party_name, party_type, contact_person, phone, address, active) VALUES (?, ?, ?, ?, 'Sample address', 1)")
           ->execute([$n, $t, $c, $p]);
    }
    $somanyPartyId = (int)$db->query("SELECT id FROM parties WHERE party_name = 'DEMO Customer - Somany Bath Studio'")->fetchColumn();
    $log[] = 'parties: ' . count($parties);

    // ---------- Child parts (raw materials) ----------
    // code => [name, category, unit, rate, min, max]
    $rmDefs = [
        'DEMO-RM-001' => ['Brass Body Casting - Kitchen Mixer 35mm', 'DEMO-CAT-CAST', $pcs, 320, 50, 400],
        'DEMO-RM-002' => ['Brass Body Casting - Basin Mixer', 'DEMO-CAT-CAST', $pcs, 260, 50, 400],
        'DEMO-RM-003' => ['Brass Body Casting - Angle Cock', 'DEMO-CAT-CAST', $pcs, 150, 100, 800],
        'DEMO-RM-004' => ['Brass Body Casting - Pillar Cock', 'DEMO-CAT-CAST', $pcs, 170, 100, 600],
        'DEMO-RM-005' => ['Ceramic Cartridge 35mm', 'DEMO-CAT-COMP', $pcs, 85, 100, 1000],
        'DEMO-RM-006' => ['Quarter-Turn Spindle 1/2"', 'DEMO-CAT-COMP', $pcs, 60, 100, 1000],
        'DEMO-RM-007' => ['Handle', 'DEMO-CAT-COMP', $pcs, 45, 100, 1000],
        'DEMO-RM-008' => ['Brass Aerator M24', 'DEMO-CAT-ACC', $pcs, 28, 100, 1000],
        'DEMO-RM-009' => ['Connection Hose 18" SS Braided', 'DEMO-CAT-ACC', $pcs, 70, 50, 500],
        'DEMO-RM-010' => ['Wall Flange CP', 'DEMO-CAT-ACC', $pcs, 25, 100, 1000],
        'DEMO-RM-011' => ['EPDM O-Ring Set', 'DEMO-CAT-ACC', $set, 6, 200, 3000],
        'DEMO-RM-012' => ['Printed Product Box', 'DEMO-CAT-ACC', $pcs, 18, 200, 2000],
    ];
    $rm = [];
    foreach ($rmDefs as $code => [$name, $c, $u, $rate, $min, $max]) {
        $db->prepare("
            INSERT INTO raw_materials (rm_code, material_name, description, category_id, unit_id, purchase_unit_id, conversion_factor,
                                       standard_rate, minimum_stock, reorder_level, maximum_stock, hsn_code, active, created_by, created_at)
            VALUES (?, ?, 'Sample data', ?, ?, ?, 1, ?, ?, ?, ?, '84818020', 1, ?, NOW())
        ")->execute([$code, $name, $cat[$c], $u, $u, $rate, $min, $min, $max, $admin]);
        $rm[$code] = ['id' => (int)$db->lastInsertId(), 'name' => $name, 'unit' => $u, 'rate' => $rate];
    }
    $log[] = 'child parts: ' . count($rm);

    // ---------- Sub-child parts: several types under one master child part ----------
    // Handle -> 3 handle types; Cartridge 35mm -> 2 brands
    $scpDefs = [
        'DEMO-SCP-HDL-LEV' => ['DEMO-RM-007', 'Lever', 'Lever Handle (Chrome)', 48, null],
        'DEMO-SCP-HDL-KNB' => ['DEMO-RM-007', 'Knob', 'Knob Handle (Round)', 40, null],
        'DEMO-SCP-HDL-CRS' => ['DEMO-RM-007', 'Cross', 'Cross Handle (4-Arm)', 52, null],
        'DEMO-SCP-CRT-SOM' => ['DEMO-RM-005', 'Somany', 'Somany Ceramic Cartridge 35mm', 95, $somanyPartyId],
        'DEMO-SCP-CRT-STD' => ['DEMO-RM-005', 'Standard', 'Standard Ceramic Cartridge 35mm', 82, null],
    ];
    $scp = [];
    foreach ($scpDefs as $code => [$parent, $brand, $name, $rate, $party]) {
        $db->prepare("
            INSERT INTO sub_child_parts (parent_rm_id, sub_part_code, sub_part_name, brand_name, party_id, unit_id, standard_rate, description, active, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Sample data', 1, ?, NOW())
        ")->execute([$rm[$parent]['id'], $code, $name, $brand, $party, $pcs, $rate, $admin]);
        $scp[$code] = ['id' => (int)$db->lastInsertId(), 'parent' => $parent, 'name' => $name, 'brand' => $brand];
    }
    $log[] = 'sub-child parts: ' . count($scp);

    // ---------- Finished goods (SKUs) ----------
    $fgDefs = [
        'DEMO-FG-001' => ['WTS Kitchen Mix 35mm', 'DEMO-CAT-KITCHEN', 1850, 20, 150],
        'DEMO-FG-002' => ['Single Lever Basin Mixer', 'DEMO-CAT-BATH', 1450, 20, 120],
        'DEMO-FG-003' => ['Angle Cock Quarter Turn', 'DEMO-CAT-VALVE', 420, 50, 400],
        'DEMO-FG-004' => ['Pillar Cock Long Body', 'DEMO-CAT-VALVE', 520, 30, 300],
        'DEMO-FG-005' => ['Wall Mixer 3-in-1 with Bend', 'DEMO-CAT-BATH', 2650, 10, 80],
    ];
    $fg = [];
    foreach ($fgDefs as $code => [$name, $c, $price, $min, $max]) {
        $db->prepare("
            INSERT INTO finished_goods (fg_code, product_name, description, category_id, unit_id, selling_price,
                                        minimum_stock, reorder_level, maximum_stock, hsn_code, active, created_by, created_at)
            VALUES (?, ?, 'Sample data', ?, ?, ?, ?, ?, ?, '84818020', 1, ?, NOW())
        ")->execute([$code, $name, $cat[$c], $pcs, $price, $min, $min, $max, $admin]);
        $fg[$code] = ['id' => (int)$db->lastInsertId(), 'name' => $name, 'price' => $price, 'cat' => $c];
    }
    $db->prepare("INSERT INTO sub_skus (parent_fg_id, sub_sku_code, sub_sku_name, brand_name, client_item_code, selling_price, description, active, created_by)
                  VALUES (?, 'DEMO-SSKU-001', 'Somany Kitchen Mix 35mm', 'Somany', 'SOM-KM-35', 1990, 'Sample data', 1, ?)")
       ->execute([$fg['DEMO-FG-001']['id'], $admin]);
    $log[] = 'finished goods: ' . count($fg) . ' (+1 sub-SKU)';

    // ---------- BOMs ----------
    $bomDefs = [
        'DEMO-FG-001' => [['DEMO-RM-001', 1], ['DEMO-RM-005', 1], ['DEMO-RM-007', 1], ['DEMO-RM-008', 1], ['DEMO-RM-009', 2], ['DEMO-RM-011', 1], ['DEMO-RM-012', 1]],
        'DEMO-FG-002' => [['DEMO-RM-002', 1], ['DEMO-RM-005', 1], ['DEMO-RM-007', 1], ['DEMO-RM-008', 1], ['DEMO-RM-009', 2], ['DEMO-RM-012', 1]],
        'DEMO-FG-003' => [['DEMO-RM-003', 1], ['DEMO-RM-006', 1], ['DEMO-RM-007', 1], ['DEMO-RM-010', 1], ['DEMO-RM-011', 1], ['DEMO-RM-012', 1]],
        'DEMO-FG-004' => [['DEMO-RM-004', 1], ['DEMO-RM-006', 1], ['DEMO-RM-007', 1], ['DEMO-RM-008', 1], ['DEMO-RM-011', 1], ['DEMO-RM-012', 1]],
        'DEMO-FG-005' => [['DEMO-RM-002', 1], ['DEMO-RM-006', 2], ['DEMO-RM-007', 2], ['DEMO-RM-010', 2], ['DEMO-RM-011', 2], ['DEMO-RM-012', 1]],
    ];
    foreach ($bomDefs as $fgCode => $lines) {
        $db->prepare("INSERT INTO bom_headers (fg_id, bom_code, bom_name, version, is_active, status, effective_from, remarks, created_by, created_at)
                      VALUES (?, ?, ?, 'V1', 1, 'ACTIVE', CURDATE(), 'Sample data', ?, NOW())")
           ->execute([$fg[$fgCode]['id'], 'BOM-' . $fgCode, $fg[$fgCode]['name'] . ' BOM', $admin]);
        $bomId = (int)$db->lastInsertId();
        foreach ($lines as $i => [$rmCode, $qty]) {
            $db->prepare("INSERT INTO bom_items (bom_id, rm_id, quantity_per_unit, unit_id, wastage_percentage, scrap_factor, sequence, mandatory)
                          VALUES (?, ?, ?, ?, 0, 0, ?, 1)")
               ->execute([$bomId, $rm[$rmCode]['id'], $qty, $rm[$rmCode]['unit'], $i + 1]);
        }
    }
    $log[] = 'BOMs: ' . count($bomDefs);

    // ---------- Process routes (all active processes, in order) ----------
    $procs = $db->query("SELECT id FROM processes WHERE active = 1 ORDER BY sequence ASC, id ASC")->fetchAll(PDO::FETCH_COLUMN);
    foreach ($fg as $f) {
        foreach ($procs as $i => $pid) {
            $db->prepare("INSERT INTO process_product_mapping (fg_id, process_id, sequence, is_mandatory, expected_loss_percent, active) VALUES (?, ?, ?, 1, 1.5, 1)")
               ->execute([$f['id'], (int)$pid, $i + 1]);
        }
    }
    $log[] = 'process routes: ' . count($procs) . ' stages x ' . count($fg) . ' SKUs';

    // ---------- Purchases (IN) into the child part store ----------
    $purchase = function (string $inv, int $ago, string $supplier, string $rmCode, float $qty, ?string $scpCode = null) use ($db, $rm, $scp, $whRM, $admin, $day) {
        $r = $rm[$rmCode];
        $date = $day($ago);
        $label = $r['name'] . ($scpCode ? " [Variant: [{$scp[$scpCode]['brand']}] {$scp[$scpCode]['name']}]" : '');
        $db->prepare("
            INSERT INTO purchase_inputs (purchase_date, invoice_number, supplier_name, tally_item_name, material_type,
                rm_id, rm_code, warehouse_id, quantity, unit_id, rate, amount, source, reference_number, created_by, created_at)
            VALUES (?, ?, ?, ?, 'RM', ?, ?, ?, ?, ?, ?, ?, 'MANUAL_ENTRY', ?, ?, NOW())
        ")->execute([$date, $inv, $supplier, $label, $r['id'], $rmCode, $whRM, $qty, $r['unit'], $r['rate'], round($qty * $r['rate'], 2),
                     $scpCode ? 'VAR:' . $scp[$scpCode]['id'] : null, $admin]);
        if ($scpCode) {
            SubChildStockService::move($scp[$scpCode]['id'], $whRM, $qty, 'PURCHASE', $inv, "Inward from {$supplier} (Inv: {$inv})", $admin);
        }
        InventoryService::increaseStock('RM', $r['id'], $rmCode, $r['name'], $whRM, $qty, $r['unit'], $r['rate'],
            'PURCHASE', $inv, $inv, null, $date, "Inward from {$supplier} (Inv: {$inv}) - sample data", $admin);
    };
    $sup1 = 'DEMO Supplier - Jamnagar Brass Works';
    $sup2 = 'DEMO Supplier - Rajkot Cartridge Co';
    $sup3 = 'DEMO Supplier - Delhi Packaging';
    $purchase('DEMO-PUR-001', 12, $sup1, 'DEMO-RM-001', 300);
    $purchase('DEMO-PUR-001', 12, $sup1, 'DEMO-RM-002', 250);
    $purchase('DEMO-PUR-001', 12, $sup1, 'DEMO-RM-003', 600);
    $purchase('DEMO-PUR-001', 12, $sup1, 'DEMO-RM-004', 400);
    $purchase('DEMO-PUR-002', 10, $sup2, 'DEMO-RM-005', 300, 'DEMO-SCP-CRT-SOM');
    $purchase('DEMO-PUR-002', 10, $sup2, 'DEMO-RM-005', 400, 'DEMO-SCP-CRT-STD');
    $purchase('DEMO-PUR-002', 10, $sup2, 'DEMO-RM-006', 900);
    $purchase('DEMO-PUR-003', 9, $sup1, 'DEMO-RM-007', 400, 'DEMO-SCP-HDL-LEV');
    $purchase('DEMO-PUR-003', 9, $sup1, 'DEMO-RM-007', 250, 'DEMO-SCP-HDL-KNB');
    $purchase('DEMO-PUR-003', 9, $sup1, 'DEMO-RM-007', 150, 'DEMO-SCP-HDL-CRS');
    $purchase('DEMO-PUR-004', 8, $sup2, 'DEMO-RM-008', 700);
    $purchase('DEMO-PUR-004', 8, $sup2, 'DEMO-RM-009', 500);
    $purchase('DEMO-PUR-004', 8, $sup2, 'DEMO-RM-010', 600);
    $purchase('DEMO-PUR-005', 7, $sup3, 'DEMO-RM-011', 2000);
    $purchase('DEMO-PUR-005', 7, $sup3, 'DEMO-RM-012', 1500);
    $purchase('DEMO-PUR-006', 3, $sup1, 'DEMO-RM-001', 80);
    $purchase('DEMO-PUR-006', 3, $sup1, 'DEMO-RM-003', 40); // stays low → shows in reorder alerts
    $log[] = 'purchases: 6 invoices / 17 lines';

    // ---------- Godown transfer & physical count ----------
    InventoryService::transferStock($whRM, $whWIP, [
        ['material_type' => 'RM', 'material_id' => $rm['DEMO-RM-011']['id'], 'material_code' => 'DEMO-RM-011', 'material_name' => $rm['DEMO-RM-011']['name'], 'quantity' => 300, 'unit_id' => $rm['DEMO-RM-011']['unit']],
        ['material_type' => 'RM', 'material_id' => $rm['DEMO-RM-012']['id'], 'material_code' => 'DEMO-RM-012', 'material_name' => $rm['DEMO-RM-012']['name'], 'quantity' => 200, 'unit_id' => $rm['DEMO-RM-012']['unit']],
    ], 'DEMO sample transfer to shopfloor', $admin);
    InventoryService::adjustStock('RM', $rm['DEMO-RM-010']['id'], 'DEMO-RM-010', $rm['DEMO-RM-010']['name'], $whRM, 590, $rm['DEMO-RM-010']['unit'],
        'Physical Verification', 'DEMO sample count - 10 pcs damaged', $admin);
    $log[] = 'transfer: 1 (to shopfloor), physical count: 1';

    // ---------- Finished goods opening stock & sales (OUT) ----------
    $fgOpening = ['DEMO-FG-001' => 60, 'DEMO-FG-002' => 45, 'DEMO-FG-003' => 220, 'DEMO-FG-004' => 25, 'DEMO-FG-005' => 12];
    foreach ($fgOpening as $code => $qty) {
        InventoryService::increaseStock('FG', $fg[$code]['id'], $code, $fg[$code]['name'], $whFG, $qty, $pcs, $fg[$code]['price'],
            'OPENING', 'DEMO-OPN-FG', 'DEMO-OPN-FG', null, $day(14), 'Opening stock - sample data', $admin);
    }
    $sale = function (string $inv, int $ago, string $customer, string $fgCode, float $qty) use ($db, $fg, $whFG, $pcs, $admin, $day) {
        $f = $fg[$fgCode];
        $date = $day($ago);
        $db->prepare("
            INSERT INTO sale_inputs (sale_date, invoice_number, customer_name, tally_item_name, fg_id, fg_code, warehouse_id,
                quantity, unit_id, rate, amount, source, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'MANUAL_ENTRY', ?, NOW())
        ")->execute([$date, $inv, $customer, $f['name'], $f['id'], $fgCode, $whFG, $qty, $pcs, $f['price'], round($qty * $f['price'], 2), $admin]);
        InventoryService::decreaseStock('FG', $f['id'], $fgCode, $whFG, $qty, $pcs, $f['price'], 'SALE', $inv, $inv, null, $date,
            "Dispatch to {$customer} (Inv: {$inv}) - sample data", $admin);
    };
    $sale('DEMO-SAL-001', 6, 'DEMO Customer - Sharma Sanitary Store', 'DEMO-FG-001', 12);
    $sale('DEMO-SAL-001', 6, 'DEMO Customer - Sharma Sanitary Store', 'DEMO-FG-003', 50);
    $sale('DEMO-SAL-002', 4, 'DEMO Customer - Gupta Hardware', 'DEMO-FG-002', 15);
    $sale('DEMO-SAL-002', 4, 'DEMO Customer - Gupta Hardware', 'DEMO-FG-004', 20);
    $sale('DEMO-SAL-003', 2, 'DEMO Customer - Somany Bath Studio', 'DEMO-FG-001', 18);
    $sale('DEMO-SAL-003', 2, 'DEMO Customer - Somany Bath Studio', 'DEMO-FG-005', 4);
    $log[] = 'FG opening stock: 5 SKUs, sales: 3 invoices / 6 lines';

    // ---------- Planning, releases (SKU Tracking batches) & full kitting ----------
    $plan = function (string $num, string $fgCode, float $qty, string $status, string $priority, int $ago, int $dueIn) use ($db, $fg, $pcs, $whFG, $admin, $day) {
        $db->prepare("
            INSERT INTO production_planning (planning_number, item_type, fg_id, unit_id, warehouse_id, planned_quantity, released_quantity,
                priority, status, planning_date, required_date, remarks, created_by, approved_by, approved_at, created_at)
            VALUES (?, 'FG', ?, ?, ?, ?, 0, ?, ?, ?, ?, 'Sample data', ?, ?, ?, NOW())
        ")->execute([$num, $fg[$fgCode]['id'], $pcs, $whFG, $qty, $priority, $status, $day($ago), date('Y-m-d', strtotime("+{$dueIn} days")),
                     $admin, $status === 'PLANNED' ? null : $admin, $status === 'PLANNED' ? null : date('Y-m-d H:i:s')]);
        return (int)$db->lastInsertId();
    };
    $release = function (int $planId, string $relNum, float $qty, int $ago, float $planQty) use ($db, $admin, $day) {
        $db->prepare("INSERT INTO planning_releases (release_number, planning_id, release_quantity, release_date, released_by, status, rm_deducted, remarks)
                      VALUES (?, ?, ?, ?, ?, 'ACTIVE', 0, 'Sample batch')")
           ->execute([$relNum, $planId, $qty, $day($ago), $admin]);
        $relId = (int)$db->lastInsertId();
        $rel = (float)$db->query("SELECT COALESCE(SUM(release_quantity),0) FROM planning_releases WHERE planning_id = {$planId} AND status='ACTIVE'")->fetchColumn();
        $db->prepare("UPDATE production_planning SET released_quantity = ?, status = ? WHERE id = ?")
           ->execute([$rel, $rel >= $planQty ? 'FULLY_RELEASED' : 'PARTIALLY_RELEASED', $planId]);
        return $relId;
    };

    $p1 = $plan('DEMO-PLN-001', 'DEMO-FG-001', 100, 'APPROVED', 'HIGH', 5, 7);
    $release($p1, 'DEMO-BATCH-001-A', 60, 4, 100);      // NOT kitted → try Full Kitting & pick the handle type
    $p2 = $plan('DEMO-PLN-002', 'DEMO-FG-002', 50, 'APPROVED', 'NORMAL', 6, 5);
    $r2 = $release($p2, 'DEMO-BATCH-002-A', 50, 5, 50); // kitted below (Lever handle + Somany cartridge)
    $p3 = $plan('DEMO-PLN-003', 'DEMO-FG-003', 200, 'APPROVED', 'NORMAL', 3, 10);
    $release($p3, 'DEMO-BATCH-003-A', 120, 2, 200);     // NOT kitted
    $plan('DEMO-PLN-004', 'DEMO-FG-004', 150, 'APPROVED', 'LOW', 1, 14);     // approved, waiting for release
    $plan('DEMO-PLN-005', 'DEMO-FG-005', 40, 'PLANNED', 'CRITICAL', 0, 3);   // new plan, needs approval

    // Full kitting for DEMO-BATCH-002-A, split handle types: 30 Lever + 20 Knob
    $batch = 'DEMO-BATCH-002-A';
    $kitLines = [
        ['DEMO-RM-002', 50, null],
        ['DEMO-RM-005', 50, 'DEMO-SCP-CRT-SOM'],
        ['DEMO-RM-007', 30, 'DEMO-SCP-HDL-LEV'],
        ['DEMO-RM-007', 20, 'DEMO-SCP-HDL-KNB'],
        ['DEMO-RM-008', 50, null],
        ['DEMO-RM-009', 100, null],
        ['DEMO-RM-012', 50, null],
    ];
    $details = [];
    $db->beginTransaction();
    try {
        foreach ($kitLines as [$rmCode, $qty, $scpCode]) {
            $r = $rm[$rmCode];
            [$scpId, $scpName, $scpBrand] = SubChildStockService::consumeForKitting(
                ['sub_child_part_id' => $scpCode ? $scp[$scpCode]['id'] : null], $r['id'], $r['name'], $whRM, $qty, $batch, false, $admin, true
            );
            $note = $scpId ? " [Variant: [{$scpBrand}] {$scpName}]" : '';
            $dec = InventoryService::decreaseStock('RM', $r['id'], $rmCode, $whRM, $qty, $r['unit'], $r['rate'], 'PRODUCTION_CONSUMPTION',
                $batch, $batch, $batch, $day(5), "Raw Material Consumption (Full Kitting) for Batch #{$batch}{$note} - sample data", $admin);
            $details[] = ['rm_id' => $r['id'], 'rm_code' => $rmCode, 'material_name' => $r['name'], 'sub_child_part_id' => $scpId,
                          'sub_part_name' => $scpName, 'sub_part_brand' => $scpBrand, 'qty_deducted' => $qty, 'unit_code' => 'PCS', 'new_stock' => $dec['new_qty']];
        }
        $db->prepare("UPDATE planning_releases SET rm_deducted = 1, kitting_details = ? WHERE id = ?")->execute([json_encode($details), $r2]);
        $db->commit();
    } catch (Exception $e) {
        if ($db->inTransaction()) $db->rollBack();
        throw $e;
    }
    $log[] = 'planning: 5 plans, 3 SKU-tracking batches (1 fully kitted with split handle types)';

    // ---------- Daily closing snapshots (last 7 days) for stock history ----------
    $snapCount = 0;
    foreach (['FG' => $fg, 'RM' => $rm] as $type => $items) {
        foreach ($items as $code => $it) {
            $cur = (float)$db->query("SELECT COALESCE(SUM(quantity),0) FROM stock WHERE material_type = '{$type}' AND material_id = {$it['id']}")->fetchColumn();
            $row = $db->query($type === 'FG'
                ? "SELECT minimum_stock, maximum_stock, (SELECT category_name FROM categories WHERE id = category_id) AS g FROM finished_goods WHERE id = {$it['id']}"
                : "SELECT minimum_stock, maximum_stock, (SELECT category_name FROM categories WHERE id = category_id) AS g FROM raw_materials WHERE id = {$it['id']}")->fetch();
            for ($ago = 7; $ago >= 1; $ago--) {
                $qty = max(0, round($cur + ($ago * (($it['id'] % 3) + 1)) - 3, 3));
                $db->prepare("INSERT INTO daily_stock_snapshots (snapshot_date, material_type, material_id, material_code, group_name, closing_stock, max_level, min_level)
                              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                              ON DUPLICATE KEY UPDATE closing_stock = VALUES(closing_stock)")
                   ->execute([$day($ago), $type, $it['id'], $code, $row['g'], $qty, $row['maximum_stock'], $row['minimum_stock']]);
                $snapCount++;
            }
        }
    }
    $log[] = "daily stock snapshots: {$snapCount}";

    return $log;
}

// ------------------------------------------------------------
// OEM BRAND (SUB-SKU) DEMO — also used by action=upgrade on an existing demo load
// ------------------------------------------------------------
function addOemDemo(PDO $db): array {
    $log = [];
    if ($db->query("SELECT COUNT(*) FROM sub_skus WHERE sub_sku_code = 'DEMO-SSKU-PC-SOM'")->fetchColumn()) {
        return ['OEM demo already present'];
    }
    $fgId = fn(string $code) => (int)$db->query("SELECT id FROM finished_goods WHERE fg_code = " . $db->quote($code))->fetchColumn();
    $pillar = $fgId('DEMO-FG-004');
    $kitchen = $fgId('DEMO-FG-001');
    if (!$pillar || !$kitchen) return ['base demo data missing - run action=seed first'];

    $admin = (int)($db->query("SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE u.active = 1 ORDER BY (r.role_code = 'ADMIN') DESC, u.id ASC LIMIT 1")->fetchColumn() ?: 1);
    $pcs = InventoryService::resolveUnitId(0, 'PCS');
    $whFG = InventoryService::getValidWarehouseId(3);
    $day = fn(int $ago) => date('Y-m-d', strtotime("-{$ago} days"));

    // OEM brands of the Pillar Cock (Kitchen Mix already has a Somany Sub-SKU)
    $ins = $db->prepare("INSERT INTO sub_skus (parent_fg_id, sub_sku_code, sub_sku_name, brand_name, client_item_code, selling_price, description, active, created_by)
                         VALUES (?, ?, ?, ?, ?, ?, 'Sample data', 1, ?)");
    $ins->execute([$pillar, 'DEMO-SSKU-PC-SOM', 'Somany Pillar Cock Long Body', 'Somany', 'SOM-PC-01', 560, $admin]);
    $ins->execute([$pillar, 'DEMO-SSKU-PC-JAQ', 'Jaquar Pillar Cock Long Body', 'Jaquar', 'JAQ-PC-77', 590, $admin]);
    $sku = [];
    foreach ($db->query("SELECT id, sub_sku_code, sub_sku_name, parent_fg_id FROM sub_skus WHERE sub_sku_code LIKE 'DEMO-SSKU-%'")->fetchAll() as $r) {
        $sku[$r['sub_sku_code']] = $r;
    }
    $log[] = 'OEM brand SKUs: Somany & Jaquar Pillar Cock (+ Somany Kitchen Mix)';

    $fgRow = fn(int $id) => $db->query("SELECT id, fg_code, product_name, selling_price FROM finished_goods WHERE id = {$id}")->fetch();

    // Opening OEM brand stock in the FG godown (parent SKU stock goes up by the same amount)
    foreach ([['DEMO-SSKU-PC-SOM', 40], ['DEMO-SSKU-PC-JAQ', 15], ['DEMO-SSKU-001', 10]] as [$code, $qty]) {
        if (empty($sku[$code])) continue;
        $s = $sku[$code];
        $fg = $fgRow((int)$s['parent_fg_id']);
        SubSkuStockService::move((int)$s['id'], $whFG, $qty, 'OPENING', 'DEMO-OPN-OEM', 'Opening OEM stock - sample data', $admin);
        InventoryService::increaseStock('FG', (int)$fg['id'], $fg['fg_code'], $fg['product_name'], $whFG, $qty, $pcs, (float)$fg['selling_price'],
            'OPENING', 'DEMO-OPN-OEM', 'DEMO-OPN-OEM', null, $day(10), "Opening OEM stock ({$s['sub_sku_name']}) - sample data", $admin);
    }
    $log[] = 'OEM opening stock: Somany PC 40, Jaquar PC 15, Somany Kitchen Mix 10';

    // OEM-specific sale: 12 Somany Pillar Cock to the Somany customer
    $s = $sku['DEMO-SSKU-PC-SOM'];
    $fg = $fgRow($pillar);
    $inv = 'DEMO-SAL-004';
    $db->prepare("INSERT INTO sale_inputs (sale_date, invoice_number, customer_name, tally_item_name, fg_id, sub_sku_id, fg_code, warehouse_id,
                    quantity, unit_id, rate, amount, source, created_by, created_at)
                  VALUES (?, ?, 'DEMO Customer - Somany Bath Studio', ?, ?, ?, ?, ?, 12, ?, 560, 6720, 'MANUAL_ENTRY', ?, NOW())")
       ->execute([$day(1), $inv, $s['sub_sku_name'], $pillar, $s['id'], $fg['fg_code'], $whFG, $pcs, $admin]);
    SubSkuStockService::move((int)$s['id'], $whFG, -12, 'SALE', $inv, 'Dispatch to DEMO Customer - Somany Bath Studio', $admin, false);
    InventoryService::decreaseStock('FG', $pillar, $fg['fg_code'], $whFG, 12, $pcs, 560, 'SALE', $inv, $inv, null, $day(1),
        "Dispatch to DEMO Customer - Somany Bath Studio (Inv: {$inv}) - sample data", $admin);
    $log[] = 'OEM sale: 12 Somany Pillar Cock';

    // Production for an OEM: Pillar Cock plan is for Somany; new released batch for Jaquar
    $db->prepare("UPDATE production_planning SET sub_sku_id = ? WHERE planning_number = 'DEMO-PLN-004'")->execute([$sku['DEMO-SSKU-PC-SOM']['id']]);
    $db->prepare("INSERT INTO production_planning (planning_number, item_type, fg_id, sub_sku_id, unit_id, warehouse_id, planned_quantity, released_quantity,
                    priority, status, planning_date, required_date, remarks, created_by, approved_by, approved_at, created_at)
                  VALUES ('DEMO-PLN-006', 'FG', ?, ?, ?, ?, 30, 30, 'HIGH', 'FULLY_RELEASED', ?, ?, 'Sample OEM order - Jaquar', ?, ?, NOW(), NOW())")
       ->execute([$pillar, $sku['DEMO-SSKU-PC-JAQ']['id'], $pcs, $whFG, $day(2), date('Y-m-d', strtotime('+6 days')), $admin, $admin]);
    $planId = (int)$db->lastInsertId();
    $db->prepare("INSERT INTO planning_releases (release_number, planning_id, release_quantity, release_date, released_by, status, rm_deducted, remarks)
                  VALUES ('DEMO-BATCH-006-A', ?, 30, ?, ?, 'ACTIVE', 0, 'Sample OEM batch - Jaquar')")
       ->execute([$planId, $day(1), $admin]);
    $log[] = 'OEM production: DEMO-PLN-004 for Somany, DEMO-BATCH-006-A (30 Jaquar Pillar Cock) in SKU Tracking';

    return $log;
}

// ------------------------------------------------------------
try {
    $db = Database::getConnection();
    InventoryService::ensureMasterData();
    SubChildStockService::ensureSchema();
    SubSkuStockService::ensureSchema();

    if ($action === 'status') {
        out(['status' => 'ok', 'demo_records' => status($db)]);
    }
    if ($action === 'upgrade') {
        // Add newer sample sections (OEM brand stock) to an already-loaded demo without touching anything else
        $db->beginTransaction();
        try {
            $log = addOemDemo($db);
            $db->commit();
        } catch (Throwable $e) {
            if ($db->inTransaction()) $db->rollBack();
            throw $e;
        }
        out(['status' => 'upgraded', 'created' => $log, 'demo_records' => status($db)]);
    }
    if ($action === 'remove') {
        $removed = removeDemo($db);
        out(['status' => 'removed', 'deleted' => $removed, 'remaining_demo_records' => status($db)]);
    }
    if ($action === 'seed') {
        $existing = status($db);
        if ($existing['finished_goods'] > 0 || $existing['child_parts'] > 0) {
            out(['status' => 'skipped', 'message' => 'Demo data is already loaded. Run action=remove first to reload it.', 'demo_records' => $existing]);
        }
        try {
            $log = seedDemo($db);
            $log = array_merge($log, addOemDemo($db));
        } catch (Throwable $e) {
            // leave nothing half-loaded
            try { removeDemo($db); } catch (Throwable $e2) {}
            throw $e;
        }
        out(['status' => 'seeded', 'created' => $log, 'demo_records' => status($db)]);
    }
    out(['status' => 'error', 'message' => "Unknown action '{$action}'. Use status, seed or remove."]);
} catch (Throwable $e) {
    if (!$isCli) http_response_code(500);
    out(['status' => 'error', 'message' => $e->getMessage(), 'line' => $e->getLine()]);
}
