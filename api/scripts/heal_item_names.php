<?php
require_once __DIR__ . '/../core/Database.php';

try {
    $db = Database::getConnection();
    $db->beginTransaction();

    $rmUpdates = [
        'RM-000001' => 'Brass Rod 25MM (IS 319)',
        'RM-000002' => 'Copper Sheet 2MM',
        'RM-000003' => 'Ceramic Disc Cartridge 35MM',
        'RM-000004' => 'Zinc Die-Cast Handle Lever',
        'RM-000005' => 'SS 304 Screw M4x10',
        'RM-000006' => 'EPDM O-Ring 22MM ID',
        'RM-000007' => 'Brass Aerator M24 Neoperl Type',
        'RM-000008' => 'Duplex Printed Product Box A1',
    ];

    foreach ($rmUpdates as $code => $name) {
        $stmt = $db->prepare("UPDATE raw_materials SET material_name = ? WHERE rm_code = ?");
        $stmt->execute([$name, $code]);
        // Also update stock table material_name
        $stmt2 = $db->prepare("UPDATE stock SET material_name = ? WHERE material_code = ? AND material_type = 'RM'");
        $stmt2->execute([$name, $code]);
    }

    $fgUpdates = [
        'FG-000001' => 'Brass Basin Tap Model A - Chrome',
        'FG-000002' => 'Kitchen Sink Mixer Model B - Swivel Spout',
        'FG-000003' => 'Angle Valve 2-in-1 Heavy Duty',
        'ABS-7522'  => 'ABS CLOVA SOAP DISH OVAL',
        'ABS-7521'  => 'ABS CLOVA SOAP DISH SQUARE',
        'ABS-7524'  => 'ABS CLOVA TOWEL RING',
        'CON-1408'  => '2 IN 1 BIB COCK ABS CONTY',
        'CON-1403'  => 'ANGLE COCK ABS CONTY',
        'CON-1404'  => 'LONG BODY ABS CONTY',
        'OHA-2766-BK' => 'OVER HEAD SHOWER CUBIX 6X6 BLACK JALI',
        'PAC-1274'  => 'ANGLE COCK BLANCO ROUND',
        'ARA-7108'  => 'ARALIA - BATH SET',
        'ARA-7102'  => 'ARALIA - TOWEL ROD 24"',
        'APC-1265'  => 'AUTO PUSH ANGLE COCK',
        '8400'      => 'BATHROOM CHAIR WALL MOUNTED',
        'BSR-2103'  => 'BEND SHOWER LILY',
        'BSR-2102'  => 'BEND SHOWER NUPUR',
        'BSR-2105'  => 'BEND SHOWER TULIP',
        'BSR-2366'  => 'BEND SHOWER HEENA',
        'BSR-2356'  => 'BEND SHOWER - HONEY',
        'BSR-2361'  => 'BEND SHOWER LOTUS',
        'BSR-2369'  => 'BEND SHOWER EXCEL WITH BRASS ARM',
        'BSR-2364'  => 'BEND SHOWER HAMMER',
        'BSR-2365'  => 'BEND SHOWER HANKO',
        'BSR-2367'  => 'BEND SHOWER HYDRA',
        'BSR-2371'  => 'BEND SHOWER ALMOND',
        'BSR-2372'  => 'BEND SHOWER APRICOT',
        'BSR-2418'  => 'BEND SHOWER NANO',
        'OHA-2645'  => 'BODY JET SHOWER WATER TILE (4X4)',
        'BTP-1903'  => 'BOTTLE TRAP PARCO',
        'BTP-1901'  => 'BOTTLE TRAP STD',
        'BTP-8718'  => 'BT PIPE BRASS CP SEAMLESS 18"',
        'BTP-8714'  => 'BT PIPE STAINLESS STEEL 18 (SS)',
    ];

    foreach ($fgUpdates as $code => $name) {
        $stmt = $db->prepare("UPDATE finished_goods SET product_name = ? WHERE fg_code = ?");
        $stmt->execute([$name, $code]);
        // Also update stock table material_name
        $stmt2 = $db->prepare("UPDATE stock SET material_name = ? WHERE material_code = ? AND material_type = 'FG'");
        $stmt2->execute([$name, $code]);
    }

    $db->commit();
    echo "SUCCESS: Restored " . count($rmUpdates) . " RM names and " . count($fgUpdates) . " FG names!\n";
} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) $db->rollBack();
    echo "ERROR: " . $e->getMessage() . "\n";
}
