<?php
require_once __DIR__ . '/../core/Database.php';

try {
    $db = Database::getConnection();
    $stmt = $db->prepare("
        UPDATE processes 
        SET process_name = 'Abrasive Belt Grinding',
            process_code = 'PROC-GRIND',
            description = 'Belt Grinding, Parting Line Removal, Surface Defect Check'
        WHERE id = 1 AND process_name LIKE '%Gravity%'
    ");
    $stmt->execute();
    echo "Updated processes table: " . $stmt->rowCount() . " rows updated.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
