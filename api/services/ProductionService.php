<?php
// ============================================================
// BHARAT IMPEX — PRODUCTION SERVICE (DYNAMIC WORKFLOW ENGINE)
// ============================================================

class ProductionService {
    
    /**
     * Create a new production plan and instantiate dynamic stage sequence from product route
     */
    public static function createProductionPlan(
        int $fgId,
        int $bomId,
        float $plannedQuantity,
        int $warehouseId,
        string $plannedStartDate,
        ?string $plannedEndDate = null,
        string $priority = 'NORMAL',
        ?string $remarks = null,
        ?int $userId = null
    ): array {
        $db = Database::getConnection();
        $db->beginTransaction();

        try {
            // Check BOM and calculate requirements
            $calc = BOMService::calculateRequirements($bomId, $plannedQuantity, $warehouseId);
            
            // Generate Production Order Number (e.g. PROD-000002)
            $seqStmt = $db->query("SELECT MAX(id) FROM production_orders");
            $maxId = (int)($seqStmt->fetchColumn() ?: 0) + 1;
            $prodNumber = 'PROD-' . str_pad($maxId, 6, '0', STR_PAD_LEFT);

            // Insert Production Order
            $orderStmt = $db->prepare("
                INSERT INTO production_orders (
                    production_number, fg_id, bom_id, warehouse_id, planned_quantity,
                    priority, status, planned_start_date, planned_end_date, remarks, created_by, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'PLANNED', ?, ?, ?, ?, NOW())
            ");
            $orderStmt->execute([
                $prodNumber,
                $fgId,
                $bomId,
                $warehouseId,
                $plannedQuantity,
                $priority,
                $plannedStartDate,
                $plannedEndDate,
                $remarks,
                $userId
            ]);
            $orderId = (int)$db->lastInsertId();

            // Populate Dynamic Stages from Product Process Route
            $routeStmt = $db->prepare("
                SELECT ppm.*, p.process_name, p.process_code 
                FROM process_product_mapping ppm
                JOIN processes p ON ppm.process_id = p.id
                WHERE ppm.fg_id = ? AND ppm.active = 1
                ORDER BY ppm.sequence ASC
            ");
            $routeStmt->execute([$fgId]);
            $routes = $routeStmt->fetchAll();

            if (empty($routes)) {
                // If no specific route mapping exists, fetch standard active processes
                $routes = $db->query("
                    SELECT id as process_id, sequence, process_name, process_code, 1 as is_mandatory, 0.00 as expected_loss_percent 
                    FROM processes 
                    WHERE active = 1 
                    ORDER BY sequence ASC, id ASC
                ")->fetchAll();
            }

            $stageInsertStmt = $db->prepare("
                INSERT INTO production_stage_entries (
                    production_order_id, process_id, sequence, input_quantity, good_quantity,
                    rejected_quantity, scrap_quantity, loss_quantity, status, created_at
                ) VALUES (?, ?, ?, ?, 0.000, 0.000, 0.000, 0.000, ?, NOW())
            ");

            foreach ($routes as $idx => $route) {
                // First stage gets planned quantity as input and READY status; subsequent stages are PENDING
                $isFirst = ($idx === 0);
                $inputQty = $isFirst ? $plannedQuantity : 0.000;
                $status = $isFirst ? 'READY' : 'PENDING';

                $stageInsertStmt->execute([
                    $orderId,
                    $route['process_id'],
                    $route['sequence'] ?? ($idx + 1),
                    $inputQty,
                    $status
                ]);
            }

            // Create planned consumption lines from BOM
            $consStmt = $db->prepare("
                INSERT INTO production_consumption (
                    production_order_id, rm_id, rm_code, planned_quantity, reserved_quantity,
                    consumed_quantity, unit_id, consumption_date, created_at
                ) VALUES (?, ?, ?, ?, 0.000, 0.000, ?, CURDATE(), NOW())
            ");

            foreach ($calc['items'] as $item) {
                $consStmt->execute([
                    $orderId,
                    $item['rm_id'],
                    $item['rm_code'],
                    $item['total_required_qty'],
                    $item['unit_id']
                ]);
            }

            AuditService::log('PRODUCTION_ORDER_CREATED', 'PRODUCTION', $prodNumber, null, [
                'order_id'   => $orderId,
                'fg_id'      => $fgId,
                'planned_qty'=> $plannedQuantity,
                'priority'   => $priority
            ]);

            $db->commit();
            return [
                'order_id'          => $orderId,
                'production_number' => $prodNumber,
                'materials'         => $calc
            ];
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }

    /**
     * Approve Production Order and Reserve Raw Materials in Inventory
     */
    public static function approveAndReserveMaterials(int $orderId, ?int $userId = null): void {
        $db = Database::getConnection();
        $db->beginTransaction();

        try {
            $orderStmt = $db->prepare("SELECT * FROM production_orders WHERE id = ? FOR UPDATE");
            $orderStmt->execute([$orderId]);
            $order = $orderStmt->fetch();

            if (!$order) throw new RuntimeException("Production order not found.");
            if ($order['status'] !== 'PLANNED' && $order['status'] !== 'DRAFT') {
                throw new RuntimeException("Order is already in status '{$order['status']}'.");
            }

            // Fetch consumption lines to reserve
            $consStmt = $db->prepare("
                SELECT pc.*, rm.material_name, rm.unit_id 
                FROM production_consumption pc
                JOIN raw_materials rm ON pc.rm_id = rm.id
                WHERE pc.production_order_id = ?
            ");
            $consStmt->execute([$orderId]);
            $consumptions = $consStmt->fetchAll();

            foreach ($consumptions as $c) {
                $qtyToReserve = (float)$c['planned_quantity'];
                InventoryService::reserveStock(
                    'RM',
                    $c['rm_id'],
                    $c['rm_code'],
                    $order['warehouse_id'],
                    $qtyToReserve,
                    $order['production_number'],
                    $order['production_number'],
                    $userId
                );

                $db->prepare("UPDATE production_consumption SET reserved_quantity = ? WHERE id = ?")
                   ->execute([$qtyToReserve, $c['id']]);
            }

            $db->prepare("
                UPDATE production_orders 
                SET status = 'APPROVED', approved_by = ?, updated_at = NOW() 
                WHERE id = ?
            ")->execute([$userId, $orderId]);

            AuditService::log('PRODUCTION_ORDER_APPROVED', 'PRODUCTION', $order['production_number'], ['status' => 'PLANNED'], ['status' => 'APPROVED']);

            $db->commit();
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }

    /**
     * Start a Production Stage
     */
    public static function startStage(int $stageEntryId, ?int $operatorId = null, ?int $supervisorId = null): void {
        $db = Database::getConnection();
        $db->beginTransaction();

        try {
            $stmt = $db->prepare("SELECT * FROM production_stage_entries WHERE id = ? FOR UPDATE");
            $stmt->execute([$stageEntryId]);
            $stage = $stmt->fetch();

            if (!$stage) throw new RuntimeException("Stage entry not found.");
            if (!in_array($stage['status'], ['READY', 'PENDING', 'PAUSED'])) {
                throw new RuntimeException("Stage cannot be started from status '{$stage['status']}'.");
            }

            // Check if previous stage is completed (unless it's the 1st sequence)
            if ($stage['sequence'] > 1) {
                $prevStmt = $db->prepare("
                    SELECT status, good_quantity FROM production_stage_entries 
                    WHERE production_order_id = ? AND sequence = ?
                ");
                $prevStmt->execute([$stage['production_order_id'], $stage['sequence'] - 1]);
                $prev = $prevStmt->fetch();

                if (!$prev || $prev['status'] !== 'COMPLETED') {
                    throw new RuntimeException("Previous production stage must be COMPLETED before starting this stage.");
                }
                
                // If input quantity was 0, sync from previous stage good quantity
                if ((float)$stage['input_quantity'] <= 0) {
                    $stage['input_quantity'] = (float)$prev['good_quantity'];
                }
            }

            $now = date('Y-m-d H:i:s');
            $db->prepare("
                UPDATE production_stage_entries 
                SET status = 'IN_PROGRESS', 
                    input_quantity = ?,
                    started_at = COALESCE(started_at, ?),
                    operator_id = COALESCE(?, operator_id),
                    supervisor_id = COALESCE(?, supervisor_id),
                    updated_at = NOW()
                WHERE id = ?
            ")->execute([$stage['input_quantity'], $now, $operatorId, $supervisorId, $stageEntryId]);

            // Update main order to IN_PROGRESS if not already
            $db->prepare("
                UPDATE production_orders 
                SET status = 'IN_PROGRESS', actual_start_date = COALESCE(actual_start_date, ?), updated_at = NOW()
                WHERE id = ? AND status IN ('PLANNED', 'APPROVED', 'MATERIAL_RESERVED')
            ")->execute([$now, $stage['production_order_id']]);

            // Log action
            $db->prepare("
                INSERT INTO production_stage_logs (stage_entry_id, action, action_time, operator_id)
                VALUES (?, 'START', ?, ?)
            ")->execute([$stageEntryId, $now, $operatorId]);

            $db->commit();
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }

    /**
     * Pause / Hold a Stage
     */
    public static function pauseStage(int $stageEntryId, ?string $reason = null, ?int $operatorId = null): void {
        $db = Database::getConnection();
        $db->beginTransaction();

        try {
            $now = date('Y-m-d H:i:s');
            $db->prepare("
                UPDATE production_stage_entries 
                SET status = 'PAUSED', remarks = CONCAT(COALESCE(remarks, ''), ' [PAUSED: ', ?, ']'), updated_at = NOW()
                WHERE id = ? AND status = 'IN_PROGRESS'
            ")->execute([$reason ?: 'Operator paused', $stageEntryId]);

            $db->prepare("
                INSERT INTO production_stage_logs (stage_entry_id, action, action_time, operator_id, reason)
                VALUES (?, 'PAUSE', ?, ?, ?)
            ")->execute([$stageEntryId, $now, $operatorId, $reason]);

            $db->commit();
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }

    /**
     * Resume a Paused Stage
     */
    public static function resumeStage(int $stageEntryId, ?int $operatorId = null): void {
        $db = Database::getConnection();
        $db->beginTransaction();

        try {
            $now = date('Y-m-d H:i:s');
            $db->prepare("
                UPDATE production_stage_entries 
                SET status = 'IN_PROGRESS', updated_at = NOW()
                WHERE id = ? AND status = 'PAUSED'
            ")->execute([$stageEntryId]);

            $db->prepare("
                INSERT INTO production_stage_logs (stage_entry_id, action, action_time, operator_id)
                VALUES (?, 'RESUME', ?, ?)
            ")->execute([$stageEntryId, $now, $operatorId]);

            $db->commit();
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }

    /**
     * Record Stage Rejection & generate recoverable scrap
     */
    public static function recordStageRejection(
        int $stageEntryId,
        int $rejectionReasonId,
        float $quantity,
        float $scrapRecoverableQty = 0.0,
        ?int $scrapMaterialId = null,
        ?string $remarks = null,
        ?int $userId = null
    ): void {
        $db = Database::getConnection();
        $db->beginTransaction();

        try {
            $stmt = $db->prepare("SELECT * FROM production_stage_entries WHERE id = ? FOR UPDATE");
            $stmt->execute([$stageEntryId]);
            $stage = $stmt->fetch();

            if (!$stage) throw new RuntimeException("Stage not found.");

            $qty = round($quantity, 3);
            $scrapQty = round($scrapRecoverableQty, 3);

            // Record rejection details
            $rejStmt = $db->prepare("
                INSERT INTO production_rejections (
                    production_order_id, stage_entry_id, rejection_reason_id, quantity,
                    scrap_recoverable_quantity, scrap_material_id, remarks, created_by, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ");
            $rejStmt->execute([
                $stage['production_order_id'],
                $stageEntryId,
                $rejectionReasonId,
                $qty,
                $scrapQty,
                $scrapMaterialId,
                $remarks,
                $userId
            ]);

            // Update stage cumulative rejection and scrap quantities
            $newRejTotal = (float)$stage['rejected_quantity'] + $qty;
            $newScrapTotal = (float)$stage['scrap_quantity'] + $scrapQty;

            $db->prepare("
                UPDATE production_stage_entries 
                SET rejected_quantity = ?, scrap_quantity = ?, updated_at = NOW()
                WHERE id = ?
            ")->execute([$newRejTotal, $newScrapTotal, $stageEntryId]);

            // If scrap is recoverable and scrap material selected, increase SCRAP stock
            if ($scrapQty > 0 && $scrapMaterialId) {
                $scrapMatStmt = $db->prepare("SELECT * FROM scrap_materials WHERE id = ?");
                $scrapMatStmt->execute([$scrapMaterialId]);
                $scrapMat = $scrapMatStmt->fetch();

                if ($scrapMat) {
                    $orderStmt = $db->prepare("SELECT production_number, warehouse_id FROM production_orders WHERE id = ?");
                    $orderStmt->execute([$stage['production_order_id']]);
                    $ord = $orderStmt->fetch();

                    InventoryService::increaseStock(
                        'SCRAP',
                        $scrapMaterialId,
                        $scrapMat['scrap_code'],
                        $scrapMat['scrap_name'],
                        $ord['warehouse_id'],
                        $scrapQty,
                        $scrapMat['unit_id'],
                        (float)$scrapMat['standard_rate'],
                        'SCRAP_GENERATED',
                        $ord['production_number'] . '-S' . $stage['sequence'],
                        $ord['production_number'],
                        null,
                        date('Y-m-d'),
                        "Recovered from Stage #{$stage['sequence']} Rejections: {$remarks}",
                        $userId
                    );
                }
            }

            $db->commit();
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }

    /**
     * Complete a stage and advance to the next stage in the route
     */
    public static function completeStage(
        int $stageEntryId,
        float $goodQuantity,
        float $rejectedQuantity = 0.0,
        float $scrapQuantity = 0.0,
        float $lossQuantity = 0.0,
        ?string $remarks = null,
        ?int $operatorId = null
    ): void {
        $db = Database::getConnection();
        $db->beginTransaction();

        try {
            $stmt = $db->prepare("SELECT * FROM production_stage_entries WHERE id = ? FOR UPDATE");
            $stmt->execute([$stageEntryId]);
            $stage = $stmt->fetch();

            if (!$stage) throw new RuntimeException("Stage not found.");

            $inputQty = (float)$stage['input_quantity'];
            $goodQty = round($goodQuantity, 3);
            $rejQty = round($rejectedQuantity, 3);
            $scrapQty = round($scrapQuantity, 3);
            $lossQty = round($lossQuantity, 3);

            // Validation of mass balance equation: Input = Good + Rejection + Loss (or Scrap accounted in Rejection/Loss)
            $accountedTotal = round($goodQty + $rejQty + $lossQty, 3);
            if (abs($inputQty - $accountedTotal) > 0.001) {
                // If there's an unaccounted gap, automatically assign remainder to process loss or throw error
                $lossQty = round($inputQty - ($goodQty + $rejQty), 3);
                if ($lossQty < 0) {
                    throw new InvalidArgumentException("Good quantity ({$goodQty}) + Rejection ({$rejQty}) cannot exceed Input quantity ({$inputQty}).");
                }
            }

            // Calculate duration in minutes if started_at exists
            $durationMinutes = 0;
            $now = date('Y-m-d H:i:s');
            if ($stage['started_at']) {
                $durationMinutes = max(1, (int)round((strtotime($now) - strtotime($stage['started_at'])) / 60));
            }

            $db->prepare("
                UPDATE production_stage_entries 
                SET status = 'COMPLETED',
                    good_quantity = ?,
                    rejected_quantity = ?,
                    scrap_quantity = ?,
                    loss_quantity = ?,
                    completed_at = ?,
                    total_duration_minutes = ?,
                    operator_id = COALESCE(?, operator_id),
                    remarks = CONCAT(COALESCE(remarks, ''), ' ', ?),
                    updated_at = NOW()
                WHERE id = ?
            ")->execute([
                $goodQty,
                $rejQty,
                $scrapQty,
                $lossQty,
                $now,
                $durationMinutes,
                $operatorId,
                $remarks ?: '',
                $stageEntryId
            ]);

            // Log completion
            $db->prepare("
                INSERT INTO production_stage_logs (stage_entry_id, action, action_time, operator_id)
                VALUES (?, 'COMPLETE', ?, ?)
            ")->execute([$stageEntryId, $now, $operatorId]);

            // Check if there is a next stage in sequence
            $nextStageStmt = $db->prepare("
                SELECT id, sequence FROM production_stage_entries 
                WHERE production_order_id = ? AND sequence = ?
            ");
            $nextStageStmt->execute([$stage['production_order_id'], $stage['sequence'] + 1]);
            $nextStage = $nextStageStmt->fetch();

            if ($nextStage) {
                // Next stage becomes READY with input_quantity = current good_quantity
                $db->prepare("
                    UPDATE production_stage_entries 
                    SET status = 'READY', input_quantity = ?, updated_at = NOW()
                    WHERE id = ?
                ")->execute([$goodQty, $nextStage['id']]);
            } else {
                // This was the final stage! Automatically finalize production output
                self::finalizeProductionOutput($stage['production_order_id'], $goodQty, $operatorId);
            }

            $db->commit();
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }

    /**
     * Finalize Production Order output and increase Finished Goods Stock
     */
    public static function finalizeProductionOutput(int $orderId, float $finalGoodQty, ?int $userId = null): void {
        $db = Database::getConnection();

        $orderStmt = $db->prepare("
            SELECT po.*, fg.fg_code, fg.product_name, fg.unit_id, fg.selling_price
            FROM production_orders po
            JOIN finished_goods fg ON po.fg_id = fg.id
            WHERE po.id = ? FOR UPDATE
        ");
        $orderStmt->execute([$orderId]);
        $order = $orderStmt->fetch();

        if (!$order) throw new RuntimeException("Order not found.");

        // Calculate total rejected and scrap across all stages
        $totalsStmt = $db->prepare("
            SELECT SUM(rejected_quantity) as total_rej, SUM(scrap_quantity) as total_scrap
            FROM production_stage_entries 
            WHERE production_order_id = ?
        ");
        $totalsStmt->execute([$orderId]);
        $totals = $totalsStmt->fetch();

        $totalRej = (float)($totals['total_rej'] ?? 0.0);
        $totalScrap = (float)($totals['total_scrap'] ?? 0.0);

        // Record in production_outputs
        $batchLot = 'LOT-' . date('ymd') . '-' . substr($order['production_number'], -4);
        $outStmt = $db->prepare("
            INSERT INTO production_outputs (
                production_order_id, fg_id, fg_code, warehouse_id, accepted_quantity,
                rejected_quantity, batch_lot_number, output_date, remarks, created_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, ?, NOW())
        ");
        $outStmt->execute([
            $orderId,
            $order['fg_id'],
            $order['fg_code'],
            $order['warehouse_id'],
            $finalGoodQty,
            $totalRej,
            $batchLot,
            "Completed production output for {$order['production_number']}",
            $userId
        ]);

        // Consume any remaining reserved RM for this order
        $consStmt = $db->prepare("
            SELECT pc.*, rm.material_name, rm.unit_id 
            FROM production_consumption pc
            JOIN raw_materials rm ON pc.rm_id = rm.id
            WHERE pc.production_order_id = ?
        ");
        $consStmt->execute([$orderId]);
        $consumptions = $consStmt->fetchAll();

        foreach ($consumptions as $c) {
            $unconsumedReserved = (float)$c['reserved_quantity'] - (float)$c['consumed_quantity'];
            if ($unconsumedReserved > 0) {
                InventoryService::consumeReservedStock(
                    'RM',
                    $c['rm_id'],
                    $c['rm_code'],
                    $order['warehouse_id'],
                    $unconsumedReserved,
                    $c['unit_id'],
                    $order['production_number'],
                    $order['production_number'],
                    $userId,
                    "Final consumption on production order completion"
                );

                $db->prepare("UPDATE production_consumption SET consumed_quantity = planned_quantity WHERE id = ?")
                   ->execute([$c['id']]);
            }
        }

        // Increase Finished Goods Stock via central stock engine
        InventoryService::increaseStock(
            'FG',
            $order['fg_id'],
            $order['fg_code'],
            $order['product_name'],
            $order['warehouse_id'],
            $finalGoodQty,
            $order['unit_id'],
            (float)$order['selling_price'],
            'PRODUCTION_OUTPUT',
            $order['production_number'],
            $order['production_number'],
            $batchLot,
            date('Y-m-d'),
            "Finished Goods Output from Production {$order['production_number']}",
            $userId
        );

        // Update main production order to COMPLETED
        $now = date('Y-m-d H:i:s');
        $db->prepare("
            UPDATE production_orders 
            SET status = 'COMPLETED',
                produced_quantity = ?,
                rejected_quantity = ?,
                scrap_quantity = ?,
                actual_end_date = ?,
                updated_at = NOW()
            WHERE id = ?
        ")->execute([$finalGoodQty, $totalRej, $totalScrap, $now, $orderId]);

        AuditService::log('PRODUCTION_ORDER_COMPLETED', 'PRODUCTION', $order['production_number'], ['status' => 'IN_PROGRESS'], [
            'status'            => 'COMPLETED',
            'produced_quantity' => $finalGoodQty,
            'rejected_quantity' => $totalRej
        ]);
    }
}
