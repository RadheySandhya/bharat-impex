<?php
require_once __DIR__ . '/../core/Database.php';

try {
    $db = Database::getConnection();

    // 1. Create parties table
    $db->exec("
        CREATE TABLE IF NOT EXISTS `parties` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `party_name` VARCHAR(255) NOT NULL UNIQUE,
            `party_type` ENUM('SUPPLIER', 'CUSTOMER', 'BOTH') DEFAULT 'BOTH',
            `contact_person` VARCHAR(150) NULL,
            `phone` VARCHAR(50) NULL,
            `email` VARCHAR(150) NULL,
            `address` TEXT NULL,
            `gstin` VARCHAR(50) NULL,
            `active` TINYINT(1) DEFAULT 1,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX `idx_party_name` (`party_name`),
            INDEX `idx_party_type` (`party_type`)
        ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    ");

    // 2. Populate parties from purchase_inputs (suppliers)
    $suppliers = $db->query("
        SELECT DISTINCT TRIM(supplier_name) AS name 
        FROM purchase_inputs 
        WHERE supplier_name IS NOT NULL AND TRIM(supplier_name) != ''
    ")->fetchAll(PDO::FETCH_COLUMN);

    $stmt = $db->prepare("
        INSERT INTO parties (party_name, party_type) 
        VALUES (?, 'SUPPLIER') 
        ON DUPLICATE KEY UPDATE party_type = IF(party_type = 'CUSTOMER', 'BOTH', party_type)
    ");
    foreach ($suppliers as $s) {
        $stmt->execute([$s]);
    }

    // 3. Populate parties from sale_inputs (customers)
    $customers = $db->query("
        SELECT DISTINCT TRIM(customer_name) AS name 
        FROM sale_inputs 
        WHERE customer_name IS NOT NULL AND TRIM(customer_name) != ''
    ")->fetchAll(PDO::FETCH_COLUMN);

    $stmt2 = $db->prepare("
        INSERT INTO parties (party_name, party_type) 
        VALUES (?, 'CUSTOMER') 
        ON DUPLICATE KEY UPDATE party_type = IF(party_type = 'SUPPLIER', 'BOTH', party_type)
    ");
    foreach ($customers as $c) {
        $stmt2->execute([$c]);
    }

    // 4. If table is empty, seed a few standard demo parties
    $count = (int)$db->query("SELECT COUNT(*) FROM parties")->fetchColumn();
    if ($count === 0) {
        $demoParties = [
            ['Radhe Brass Industries', 'SUPPLIER', '+91 98250 88771', '24AABCR1234F1Z1', 'Jamnagar GIDC Phase 2'],
            ['Shree Ram Metals', 'SUPPLIER', '+91 98250 44332', '24AABCS5678G1Z2', 'Shankar Tekri, Jamnagar'],
            ['Apex Sanitary Ware Hub', 'CUSTOMER', '+91 99112 33445', '07AACCA9988H1Z3', 'Chawri Bazar, Delhi'],
            ['Royal Bath & Kitchen Mart', 'CUSTOMER', '+91 98200 66778', '27AABCR4455J1Z4', 'Ghatkopar West, Mumbai'],
            ['Krishna Hardware & Traders', 'BOTH', '+91 97240 11990', '24AACCK3322L1Z5', 'Bedi Gate, Jamnagar'],
        ];
        $seedStmt = $db->prepare("
            INSERT INTO parties (party_name, party_type, phone, gstin, address) 
            VALUES (?, ?, ?, ?, ?)
        ");
        foreach ($demoParties as $p) {
            $seedStmt->execute($p);
        }
    }

    echo "Parties table initialized and synced successfully. Total parties: " . $db->query("SELECT COUNT(*) FROM parties")->fetchColumn() . "\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
