<?php
// ============================================================
// BHARAT IMPEX — BOM (BILL OF MATERIALS) SERVICE
// ============================================================

class BOMService {
    
    /**
     * Get active BOM with all constituent items for a Finished Good
     */
    public static function getActiveBOMForProduct(int $fgId): ?array {
        $db = Database::getConnection();
        $stmt = $db->prepare("
            SELECT b.*, fg.fg_code, fg.product_name, u.unit_code as fg_unit
            FROM bom_headers b
            JOIN finished_goods fg ON b.fg_id = fg.id
            JOIN units u ON fg.unit_id = u.id
            WHERE b.fg_id = ? AND b.status = 'ACTIVE' AND b.is_active = 1
            ORDER BY b.id DESC
            LIMIT 1
        ");
        $stmt->execute([$fgId]);
        $bom = $stmt->fetch();

        if (!$bom) return null;

        $itemsStmt = $db->prepare("
            SELECT bi.*, rm.rm_code, rm.material_name, u.unit_code, rm.standard_rate
            FROM bom_items bi
            JOIN raw_materials rm ON bi.rm_id = rm.id
            JOIN units u ON bi.unit_id = u.id
            WHERE bi.bom_id = ?
            ORDER BY bi.sequence ASC
        ");
        $itemsStmt->execute([$bom['id']]);
        $bom['items'] = $itemsStmt->fetchAll();

        return $bom;
    }

    /**
     * Calculate required raw materials for a target FG production quantity
     */
    public static function calculateRequirements(int $bomId, float $plannedQty, int $warehouseId = 1): array {
        $db = Database::getConnection();
        
        $bomStmt = $db->prepare("SELECT * FROM bom_headers WHERE id = ?");
        $bomStmt->execute([$bomId]);
        $bom = $bomStmt->fetch();

        if (!$bom) {
            throw new RuntimeException("BOM not found with ID {$bomId}");
        }

        $itemsStmt = $db->prepare("
            SELECT bi.*, rm.rm_code, rm.material_name, u.unit_code, rm.standard_rate,
                   COALESCE(s.quantity, 0) as current_stock,
                   COALESCE(s.reserved_quantity, 0) as reserved_stock,
                   COALESCE(s.available_quantity, 0) as available_stock
            FROM bom_items bi
            JOIN raw_materials rm ON bi.rm_id = rm.id
            JOIN units u ON bi.unit_id = u.id
            LEFT JOIN stock s ON s.material_type = 'RM' AND s.material_id = rm.id AND s.warehouse_id = ?
            WHERE bi.bom_id = ?
            ORDER BY bi.sequence ASC
        ");
        $itemsStmt->execute([$warehouseId, $bomId]);
        $rawItems = $itemsStmt->fetchAll();

        $allAvailable = true;
        $calculatedItems = [];
        $totalEstimatedMaterialCost = 0.0;

        foreach ($rawItems as $item) {
            $baseQty = (float)$item['quantity_per_unit'] * $plannedQty;
            $wastage = (float)$item['wastage_percentage'];
            $totalRequired = round($baseQty * (1 + ($wastage / 100)), 3);
            $available = (float)$item['available_stock'];
            $isSufficient = $available >= $totalRequired;
            $shortage = $isSufficient ? 0.0 : round($totalRequired - $available, 3);

            if ($item['mandatory'] && !$isSufficient) {
                $allAvailable = false;
            }

            $estimatedCost = round($totalRequired * (float)$item['standard_rate'], 2);
            $totalEstimatedMaterialCost += $estimatedCost;

            $calculatedItems[] = [
                'rm_id'              => (int)$item['rm_id'],
                'rm_code'            => $item['rm_code'],
                'material_name'      => $item['material_name'],
                'unit_id'            => (int)$item['unit_id'],
                'unit_code'          => $item['unit_code'],
                'quantity_per_unit'  => (float)$item['quantity_per_unit'],
                'wastage_percentage' => $wastage,
                'scrap_factor'       => (float)$item['scrap_factor'],
                'base_quantity'      => $baseQty,
                'total_required_qty' => $totalRequired,
                'current_stock'      => (float)$item['current_stock'],
                'reserved_stock'     => (float)$item['reserved_stock'],
                'available_stock'    => $available,
                'is_sufficient'      => $isSufficient,
                'shortage_quantity'  => $shortage,
                'mandatory'          => (bool)$item['mandatory'],
                'standard_rate'      => (float)$item['standard_rate'],
                'estimated_cost'     => $estimatedCost,
                'sequence'           => (int)$item['sequence'],
            ];
        }

        return [
            'bom_id'                 => $bomId,
            'bom_code'               => $bom['bom_code'],
            'bom_name'               => $bom['bom_name'],
            'version'                => $bom['version'],
            'planned_quantity'       => $plannedQty,
            'warehouse_id'           => $warehouseId,
            'all_materials_available'=> $allAvailable,
            'total_estimated_cost'   => $totalEstimatedMaterialCost,
            'items'                  => $calculatedItems
        ];
    }

    /**
     * Create a new version of BOM (e.g. V2 when modifying recipe)
     */
    public static function createNewVersion(int $sourceBomId, array $newItems, string $versionTag, ?string $remarks = null, ?int $userId = null): int {
        $db = Database::getConnection();
        $db->beginTransaction();

        try {
            $srcStmt = $db->prepare("SELECT * FROM bom_headers WHERE id = ?");
            $srcStmt->execute([$sourceBomId]);
            $srcBom = $srcStmt->fetch();

            if (!$srcBom) throw new RuntimeException("Source BOM not found.");

            // Mark old version as SUPERSEDED
            $db->prepare("UPDATE bom_headers SET status = 'SUPERSEDED', is_active = 0 WHERE id = ?")->execute([$sourceBomId]);

            // Create new version header
            $newCode = "BOM-FG" . str_pad($srcBom['fg_id'], 3, '0', STR_PAD_LEFT) . "-" . strtoupper($versionTag);
            $newStmt = $db->prepare("
                INSERT INTO bom_headers (fg_id, bom_code, bom_name, version, is_active, status, effective_from, remarks, created_by, created_at)
                VALUES (?, ?, ?, ?, 1, 'ACTIVE', CURDATE(), ?, ?, NOW())
            ");
            $newStmt->execute([
                $srcBom['fg_id'],
                $newCode,
                $srcBom['bom_name'] . " ({$versionTag})",
                $versionTag,
                $remarks,
                $userId
            ]);
            $newBomId = (int)$db->lastInsertId();

            // Insert new items
            $itemStmt = $db->prepare("
                INSERT INTO bom_items (bom_id, rm_id, quantity_per_unit, unit_id, wastage_percentage, scrap_factor, sequence, mandatory, remarks)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");

            foreach ($newItems as $idx => $item) {
                $itemStmt->execute([
                    $newBomId,
                    $item['rm_id'],
                    $item['quantity_per_unit'],
                    $item['unit_id'],
                    $item['wastage_percentage'] ?? 0.00,
                    $item['scrap_factor'] ?? 0.00,
                    $item['sequence'] ?? ($idx + 1),
                    isset($item['mandatory']) ? (int)$item['mandatory'] : 1,
                    $item['remarks'] ?? null
                ]);
            }

            AuditService::log('BOM_VERSION_CREATED', 'BOM', (string)$newBomId, ['old_bom_id' => $sourceBomId], ['new_bom_id' => $newBomId, 'version' => $versionTag]);

            $db->commit();
            return $newBomId;
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }
}
