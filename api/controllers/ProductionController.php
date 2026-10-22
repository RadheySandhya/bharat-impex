<?php
// ============================================================
// BHARAT IMPEX — PRODUCTION CONTROLLER
// ============================================================

class ProductionController {

    /**
     * List Production Orders
     */
    public static function index(): void {
        Auth::requireAuth();
        $db = Database::getConnection();

        $status = $_GET['status'] ?? null;
        $priority = $_GET['priority'] ?? null;
        $fgId = $_GET['fg_id'] ?? null;
        $search = trim($_GET['search'] ?? '');

        $sql = "
            SELECT po.*, fg.product_name, fg.fg_code, u.unit_code, bh.bom_code, bh.version as bom_version,
                   w.warehouse_name,
                   (SELECT COUNT(*) FROM production_stage_entries pse WHERE pse.production_order_id = po.id AND pse.status = 'COMPLETED') as completed_stages,
                   (SELECT COUNT(*) FROM production_stage_entries pse WHERE pse.production_order_id = po.id) as total_stages,
                   (SELECT p.process_name FROM production_stage_entries pse JOIN processes p ON pse.process_id = p.id WHERE pse.production_order_id = po.id AND pse.status = 'IN_PROGRESS' LIMIT 1) as current_active_stage
            FROM production_orders po
            JOIN finished_goods fg ON po.fg_id = fg.id
            JOIN units u ON fg.unit_id = u.id
            JOIN bom_headers bh ON po.bom_id = bh.id
            JOIN warehouses w ON po.warehouse_id = w.id
            WHERE 1=1
        ";

        $params = [];
        if ($status) {
            $sql .= " AND po.status = ?";
            $params[] = $status;
        }
        if ($priority) {
            $sql .= " AND po.priority = ?";
            $params[] = $priority;
        }
        if ($fgId) {
            $sql .= " AND po.fg_id = ?";
            $params[] = $fgId;
        }
        if ($search) {
            $sql .= " AND (po.production_number LIKE ? OR fg.product_name LIKE ? OR fg.fg_code LIKE ?)";
            $params[] = "%{$search}%";
            $params[] = "%{$search}%";
            $params[] = "%{$search}%";
        }

        $sql .= " ORDER BY CASE po.priority WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'NORMAL' THEN 3 ELSE 4 END, po.id DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $orders = $stmt->fetchAll();

        Response::success($orders);
    }

    /**
     * Get single Production Order with complete stages, rejections, and consumption
     */
    public static function show(): void {
        Auth::requireAuth();
        $id = (int)($_GET['id'] ?? 0);

        if (!$id) {
            Response::error('Order ID is required.', null, 400);
        }

        $db = Database::getConnection();
        $stmt = $db->prepare("
            SELECT po.*, fg.product_name, fg.fg_code, u.unit_code, bh.bom_code, bh.version as bom_version, w.warehouse_name
            FROM production_orders po
            JOIN finished_goods fg ON po.fg_id = fg.id
            JOIN units u ON fg.unit_id = u.id
            JOIN bom_headers bh ON po.bom_id = bh.id
            JOIN warehouses w ON po.warehouse_id = w.id
            WHERE po.id = ?
        ");
        $stmt->execute([$id]);
        $order = $stmt->fetch();

        if (!$order) {
            Response::error('Production order not found.', null, 404);
        }

        // Fetch Stages with Process Info
        $stageStmt = $db->prepare("
            SELECT pse.*, p.process_name, p.process_code, p.standard_duration_minutes,
                   u.full_name as operator_name, s.full_name as supervisor_name
            FROM production_stage_entries pse
            JOIN processes p ON pse.process_id = p.id
            LEFT JOIN users u ON pse.operator_id = u.id
            LEFT JOIN users s ON pse.supervisor_id = s.id
            WHERE pse.production_order_id = ?
            ORDER BY pse.sequence ASC
        ");
        $stageStmt->execute([$id]);
        $order['stages'] = $stageStmt->fetchAll();

        // Fetch Rejections
        $rejStmt = $db->prepare("
            SELECT pr.*, rr.reason_name, rr.category, sm.scrap_name, pse.sequence as stage_sequence, p.process_name
            FROM production_rejections pr
            JOIN rejection_reasons rr ON pr.rejection_reason_id = rr.id
            JOIN production_stage_entries pse ON pr.stage_entry_id = pse.id
            JOIN processes p ON pse.process_id = p.id
            LEFT JOIN scrap_materials sm ON pr.scrap_material_id = sm.id
            WHERE pr.production_order_id = ?
            ORDER BY pr.id DESC
        ");
        $rejStmt->execute([$id]);
        $order['rejections'] = $rejStmt->fetchAll();

        // Fetch Raw Material Consumption
        $consStmt = $db->prepare("
            SELECT pc.*, rm.material_name, u.unit_code,
                   COALESCE(s.available_quantity, 0) as current_rm_available
            FROM production_consumption pc
            JOIN raw_materials rm ON pc.rm_id = rm.id
            JOIN units u ON pc.unit_id = u.id
            LEFT JOIN stock s ON s.material_type = 'RM' AND s.material_id = rm.id AND s.warehouse_id = ?
            WHERE pc.production_order_id = ?
        ");
        $consStmt->execute([$order['warehouse_id'], $id]);
        $order['consumption'] = $consStmt->fetchAll();

        Response::success($order);
    }

    /**
     * Preview / Calculate BOM requirements before creating order
     */
    public static function calculate(): void {
        Auth::requireAuth();
        $bomId = (int)($_GET['bom_id'] ?? 0);
        $qty = (float)($_GET['quantity'] ?? 1);
        $warehouseId = (int)($_GET['warehouse_id'] ?? 1);

        if (!$bomId || $qty <= 0) {
            Response::error('Valid BOM ID and positive quantity are required.', null, 400);
        }

        try {
            $calc = BOMService::calculateRequirements($bomId, $qty, $warehouseId);
            Response::success($calc);
        } catch (Exception $e) {
            Response::error($e->getMessage(), null, 400);
        }
    }

    /**
     * Create new Production Order
     */
    public static function create(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $fgId = (int)($input['fg_id'] ?? 0);
        $bomId = (int)($input['bom_id'] ?? 0);
        $qty = (float)($input['planned_quantity'] ?? 0);
        $warehouseId = (int)($input['warehouse_id'] ?? 1);
        $startDate = $input['planned_start_date'] ?? date('Y-m-d');
        $endDate = $input['planned_end_date'] ?? null;
        $priority = $input['priority'] ?? 'NORMAL';
        $remarks = trim($input['remarks'] ?? '');

        if (!$fgId || !$bomId || $qty <= 0) {
            Response::error('Finished Good, BOM, and positive planned quantity are required.', null, 400);
        }

        try {
            $res = ProductionService::createProductionPlan(
                $fgId,
                $bomId,
                $qty,
                $warehouseId,
                $startDate,
                $endDate,
                $priority,
                $remarks,
                $user['id']
            );
            Response::success($res, 'Production order created successfully.');
        } catch (Exception $e) {
            Response::error($e->getMessage(), null, 400);
        }
    }

    /**
     * Approve Order & Reserve Materials
     */
    public static function approve(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $orderId = (int)($input['order_id'] ?? 0);

        if (!$orderId) {
            Response::error('Order ID is required.', null, 400);
        }

        try {
            ProductionService::approveAndReserveMaterials($orderId, $user['id']);
            Response::success(null, 'Production order approved and materials reserved.');
        } catch (Exception $e) {
            Response::error('Approval failed: ' . $e->getMessage(), null, 400);
        }
    }

    /**
     * Start Stage
     */
    public static function startStage(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $stageId = (int)($input['stage_id'] ?? 0);
        $operatorId = (int)($input['operator_id'] ?? $user['id']);

        if (!$stageId) {
            Response::error('Stage ID is required.', null, 400);
        }

        try {
            ProductionService::startStage($stageId, $operatorId, $user['id']);
            Response::success(null, 'Stage started successfully.');
        } catch (Exception $e) {
            Response::error($e->getMessage(), null, 400);
        }
    }

    /**
     * Pause Stage
     */
    public static function pauseStage(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $stageId = (int)($input['stage_id'] ?? 0);
        $reason = trim($input['reason'] ?? 'Operator break / maintenance');

        if (!$stageId) {
            Response::error('Stage ID is required.', null, 400);
        }

        try {
            ProductionService::pauseStage($stageId, $reason, $user['id']);
            Response::success(null, 'Stage paused.');
        } catch (Exception $e) {
            Response::error($e->getMessage(), null, 400);
        }
    }

    /**
     * Resume Stage
     */
    public static function resumeStage(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $stageId = (int)($input['stage_id'] ?? 0);

        if (!$stageId) {
            Response::error('Stage ID is required.', null, 400);
        }

        try {
            ProductionService::resumeStage($stageId, $user['id']);
            Response::success(null, 'Stage resumed.');
        } catch (Exception $e) {
            Response::error($e->getMessage(), null, 400);
        }
    }

    /**
     * Log Stage Rejection
     */
    public static function logRejection(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $stageId = (int)($input['stage_id'] ?? 0);
        $reasonId = (int)($input['rejection_reason_id'] ?? 0);
        $qty = (float)($input['quantity'] ?? 0);
        $scrapQty = (float)($input['scrap_recoverable_quantity'] ?? 0);
        $scrapMatId = !empty($input['scrap_material_id']) ? (int)$input['scrap_material_id'] : null;
        $remarks = trim($input['remarks'] ?? '');

        if (!$stageId || !$reasonId || $qty <= 0) {
            Response::error('Stage, Rejection Reason, and positive quantity are required.', null, 400);
        }

        try {
            ProductionService::recordStageRejection($stageId, $reasonId, $qty, $scrapQty, $scrapMatId, $remarks, $user['id']);
            Response::success(null, 'Rejection logged and scrap updated.');
        } catch (Exception $e) {
            Response::error($e->getMessage(), null, 400);
        }
    }

    /**
     * Complete Stage
     */
    public static function completeStage(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $stageId = (int)($input['stage_id'] ?? 0);
        $goodQty = (float)($input['good_quantity'] ?? 0);
        $rejQty = (float)($input['rejected_quantity'] ?? 0);
        $scrapQty = (float)($input['scrap_quantity'] ?? 0);
        $lossQty = (float)($input['loss_quantity'] ?? 0);
        $remarks = trim($input['remarks'] ?? '');

        if (!$stageId) {
            Response::error('Stage ID is required.', null, 400);
        }

        try {
            ProductionService::completeStage($stageId, $goodQty, $rejQty, $scrapQty, $lossQty, $remarks, $user['id']);
            Response::success(null, 'Stage completed and next stage updated.');
        } catch (Exception $e) {
            Response::error($e->getMessage(), null, 400);
        }
    }

    /**
     * Operator Queue for Shopfloor & Mobile view
     */
    public static function operatorQueue(): void {
        Auth::requireAuth();
        $db = Database::getConnection();

        $stmt = $db->query("
            SELECT pse.*, p.process_name, p.process_code, po.production_number, po.priority,
                   fg.product_name, fg.fg_code, u.unit_code
            FROM production_stage_entries pse
            JOIN production_orders po ON pse.production_order_id = po.id
            JOIN processes p ON pse.process_id = p.id
            JOIN finished_goods fg ON po.fg_id = fg.id
            JOIN units u ON fg.unit_id = u.id
            WHERE pse.status IN ('READY', 'IN_PROGRESS', 'PAUSED') AND po.status = 'IN_PROGRESS'
            ORDER BY CASE po.priority WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'NORMAL' THEN 3 ELSE 4 END, pse.sequence ASC
        ");
        $queue = $stmt->fetchAll();

        Response::success($queue);
    }

    /**
     * Complete Batch from SKU Tracking to Finished Goods Stock
     * Directly transfers finished batch quantity into Finished Goods inventory (stock & stock_ledger)
     */
    public static function completeBatchToFG(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $batchNo = trim($input['batch_no'] ?? '');
        $catNo = trim($input['cat_no'] ?? '');
        $itemName = trim($input['item_name'] ?? '');
        $fgId = (int)($input['fg_id'] ?? 0);
        $goodQty = (float)($input['good_quantity'] ?? 0);
        $rejQty = (float)($input['rejected_quantity'] ?? 0);
        $operator = trim($input['operator'] ?? 'Supervisor / Operator');
        $remarks = trim($input['remarks'] ?? '');
        $force = !empty($input['force']);

        if (!$batchNo) {
            Response::error('Batch number is required.', null, 400);
        }
        if ($goodQty <= 0) {
            Response::error('Good quantity must be greater than zero.', null, 400);
        }

        $db = Database::getConnection();

        // 1. Resolve Finished Good
        $fg = null;
        if ($fgId > 0) {
            $stmt = $db->prepare("SELECT * FROM finished_goods WHERE id = ?");
            $stmt->execute([$fgId]);
            $fg = $stmt->fetch();
        }

        if (!$fg && $catNo) {
            $stmt = $db->prepare("SELECT * FROM finished_goods WHERE fg_code = ?");
            $stmt->execute([$catNo]);
            $fg = $stmt->fetch();
        }

        if (!$fg && $itemName) {
            $stmt = $db->prepare("SELECT * FROM finished_goods WHERE LOWER(product_name) = LOWER(?) LIMIT 1");
            $stmt->execute([$itemName]);
            $fg = $stmt->fetch();
        }

        // Try searching in planning_releases for this batch
        if (!$fg) {
            $stmt = $db->prepare("
                SELECT fg.* 
                FROM planning_releases pr
                JOIN production_planning pp ON pr.planning_id = pp.id
                JOIN finished_goods fg ON pp.fg_id = fg.id
                WHERE pr.release_number = ?
                LIMIT 1
            ");
            $stmt->execute([$batchNo]);
            $fg = $stmt->fetch();
        }

        if (!$fg) {
            Response::error("Finished Good could not be identified for Batch: {$batchNo} (CAT: {$catNo}).", null, 404);
        }

        // 2. Check if this batch was already credited into FG stock to prevent double-crediting
        $existingCheck = $db->prepare("
            SELECT id, quantity_in, balance_after, created_at 
            FROM stock_ledger 
            WHERE material_type = 'FG' AND material_id = ? AND transaction_type = 'PRODUCTION_OUTPUT' 
              AND (transaction_id = ? OR reference_number = ?)
            ORDER BY id DESC LIMIT 1
        ");
        $existingCheck->execute([$fg['id'], $batchNo, $batchNo]);
        $alreadyDeposited = $existingCheck->fetch();

        $warehouseId = !empty($input['warehouse_id']) ? (int)$input['warehouse_id'] : 3; // Selected FG Warehouse (default WH-FG)

        if ($alreadyDeposited && !$force) {
            $currStockStmt = $db->prepare("
                SELECT quantity, available_quantity FROM stock 
                WHERE material_type = 'FG' AND material_id = ? AND warehouse_id = ?
            ");
            $currStockStmt->execute([$fg['id'], $warehouseId]);
            $currStock = $currStockStmt->fetch();

            Response::success([
                'already_deposited' => true,
                'batch_no'          => $batchNo,
                'fg_id'             => $fg['id'],
                'current_stock'     => $currStock ? (float)$currStock['quantity'] : 0,
                'deposited_at'      => $alreadyDeposited['created_at'],
                'deposited_qty'     => (float)$alreadyDeposited['quantity_in']
            ], "Batch {$batchNo} was already deposited into Finished Goods stock.");
            return;
        }

        $unitId = (int)($fg['unit_id'] ?: 3);
        $rate = (float)($fg['selling_price'] ?: 0.0);

        try {
            $db->beginTransaction();

            // 3. Deposit into Finished Goods inventory via central stock engine
            $stockRes = InventoryService::increaseStock(
                'FG',
                $fg['id'],
                $fg['fg_code'],
                $fg['product_name'],
                $warehouseId,
                $goodQty,
                $unitId,
                $rate,
                'PRODUCTION_OUTPUT',
                $batchNo,
                $batchNo,
                $batchNo,
                date('Y-m-d'),
                "SKU Tracking Final Handoff to Ready FG Stock. Operator: {$operator}. " . ($remarks ?: ''),
                $user['id'] ?? null
            );

            // 4. Update planning_releases and production_planning if exists
            $prStmt = $db->prepare("SELECT * FROM planning_releases WHERE release_number = ?");
            $prStmt->execute([$batchNo]);
            $rel = $prStmt->fetch();

            if ($rel && !empty($rel['planning_id'])) {
                $db->prepare("
                    UPDATE production_planning 
                    SET produced_quantity = produced_quantity + ?,
                        completed_quantity = completed_quantity + ?,
                        rejected_quantity = rejected_quantity + ?,
                        status = CASE WHEN (produced_quantity + ?) >= planned_quantity THEN 'COMPLETED' ELSE status END,
                        updated_at = NOW()
                    WHERE id = ?
                ")->execute([$goodQty, $goodQty, $rejQty, $goodQty, $rel['planning_id']]);
            }

            // 5. Audit log
            AuditService::log('FG_BATCH_COMPLETED', 'STOCK', $batchNo, null, [
                'batch_no'      => $batchNo,
                'fg_id'         => $fg['id'],
                'fg_code'       => $fg['fg_code'],
                'product_name'  => $fg['product_name'],
                'good_qty'      => $goodQty,
                'new_stock'     => $stockRes['new_qty'],
                'operator'      => $operator
            ]);

            $db->commit();

            Response::success([
                'success'           => true,
                'batch_no'          => $batchNo,
                'fg_id'             => $fg['id'],
                'fg_code'           => $fg['fg_code'],
                'product_name'      => $fg['product_name'],
                'quantity_added'    => $goodQty,
                'previous_qty'      => $stockRes['previous_qty'],
                'new_stock'         => $stockRes['new_qty'],
                'warehouse_id'      => $warehouseId
            ], "Successfully added {$goodQty} PCS to Finished Goods Stock! New Live Balance: {$stockRes['new_qty']} PCS.");
        } catch (Exception $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            Response::error($e->getMessage(), null, 400);
        }
    }

    /**
     * Preview Full Kitting requirements for a finished good & planned quantity
     */
    public static function kittingPreview(): void {
        Auth::requireAuth();
        $db = Database::getConnection();

        $fgId = (int)($_GET['fg_id'] ?? 0);
        $catNo = trim($_GET['cat_no'] ?? '');
        $batchNo = trim($_GET['batch_no'] ?? '');
        $quantity = (float)($_GET['quantity'] ?? 1);
        $warehouseId = (int)($_GET['warehouse_id'] ?? 1); // WH-MAIN (RM Store)

        if ($quantity <= 0) $quantity = 1;

        $fg = null;
        if ($fgId > 0) {
            $stmt = $db->prepare("SELECT * FROM finished_goods WHERE id = ?");
            $stmt->execute([$fgId]);
            $fg = $stmt->fetch();
        }
        if (!$fg && $catNo) {
            $stmt = $db->prepare("SELECT * FROM finished_goods WHERE fg_code = ? OR cat_no = ?");
            $stmt->execute([$catNo, $catNo]);
            $fg = $stmt->fetch();
        }
        if (!$fg && $batchNo) {
            $stmt = $db->prepare("
                SELECT fg.* 
                FROM planning_releases pr
                JOIN production_planning pp ON pr.planning_id = pp.id
                JOIN finished_goods fg ON pp.fg_id = fg.id
                WHERE pr.release_number = ?
                LIMIT 1
            ");
            $stmt->execute([$batchNo]);
            $fg = $stmt->fetch();
        }

        if (!$fg) {
            Response::error('Finished Good not found.', null, 404);
        }

        // Check if release is already deducted
        $isAlreadyDeducted = false;
        if ($batchNo) {
            $chk = $db->prepare("
                SELECT COUNT(*) FROM stock_ledger 
                WHERE material_type = 'RM' AND transaction_type IN ('PRODUCTION_CONSUMPTION', 'PRODUCTION_ISSUE') 
                  AND (transaction_id = ? OR reference_number = ?)
            ");
            $chk->execute([$batchNo, $batchNo]);
            $isAlreadyDeducted = ((int)$chk->fetchColumn()) > 0;

            if (!$isAlreadyDeducted) {
                $prChk = $db->prepare("SELECT rm_deducted FROM planning_releases WHERE release_number = ?");
                $prChk->execute([$batchNo]);
                $isAlreadyDeducted = (bool)$prChk->fetchColumn();
            }
        }

        $bom = BOMService::getActiveBOMForProduct($fg['id']);
        $items = [];
        $hasShortage = false;
        $totalCost = 0.0;

        if ($bom) {
            $calc = BOMService::calculateRequirements($bom['id'], $quantity, $warehouseId);
            $items = $calc['items'];
            $hasShortage = !$calc['all_materials_available'];
            $totalCost = (float)$calc['total_estimated_cost'];
        } else {
            // Dynamic fallback kitting based on product weight
            $weight = (float)(!empty($fg['gross_weight']) ? $fg['gross_weight'] : (!empty($fg['net_weight']) ? $fg['net_weight'] : 0.350));
            $totalBrass = round($weight * $quantity, 3);

            $rm1Stmt = $db->prepare("
                SELECT rm.*, u.unit_code, 
                       COALESCE(s.quantity, 0) as current_stock,
                       COALESCE(s.available_quantity, 0) as available_stock
                FROM raw_materials rm
                JOIN units u ON rm.unit_id = u.id
                LEFT JOIN stock s ON s.material_type = 'RM' AND s.material_id = rm.id AND s.warehouse_id = ?
                WHERE rm.id = 1
            ");
            $rm1Stmt->execute([$warehouseId]);
            $rm1 = $rm1Stmt->fetch();

            $rm8Stmt = $db->prepare("
                SELECT rm.*, u.unit_code, 
                       COALESCE(s.quantity, 0) as current_stock,
                       COALESCE(s.available_quantity, 0) as available_stock
                FROM raw_materials rm
                JOIN units u ON rm.unit_id = u.id
                LEFT JOIN stock s ON s.material_type = 'RM' AND s.material_id = rm.id AND s.warehouse_id = ?
                WHERE rm.id = 8
            ");
            $rm8Stmt->execute([$warehouseId]);
            $rm8 = $rm8Stmt->fetch();

            if ($rm1) {
                $avail = (float)$rm1['available_stock'];
                $isSuff = $avail >= $totalBrass;
                if (!$isSuff) $hasShortage = true;
                $est = round($totalBrass * (float)$rm1['standard_rate'], 2);
                $totalCost += $est;

                $items[] = [
                    'rm_id'              => (int)$rm1['id'],
                    'rm_code'            => $rm1['rm_code'],
                    'material_name'      => $rm1['material_name'],
                    'unit_id'            => (int)$rm1['unit_id'],
                    'unit_code'          => $rm1['unit_code'],
                    'quantity_per_unit'  => $weight,
                    'total_required_qty' => $totalBrass,
                    'current_stock'      => (float)$rm1['current_stock'],
                    'available_stock'    => $avail,
                    'is_sufficient'      => $isSuff,
                    'shortage_quantity'  => $isSuff ? 0.0 : round($totalBrass - $avail, 3),
                    'standard_rate'      => (float)$rm1['standard_rate'],
                    'estimated_cost'     => $est,
                ];
            }

            if ($rm8) {
                $avail = (float)$rm8['available_stock'];
                $isSuff = $avail >= $quantity;
                if (!$isSuff) $hasShortage = true;
                $est = round($quantity * (float)$rm8['standard_rate'], 2);
                $totalCost += $est;

                $items[] = [
                    'rm_id'              => (int)$rm8['id'],
                    'rm_code'            => $rm8['rm_code'],
                    'material_name'      => $rm8['material_name'],
                    'unit_id'            => (int)$rm8['unit_id'],
                    'unit_code'          => $rm8['unit_code'],
                    'quantity_per_unit'  => 1.0,
                    'total_required_qty' => (float)$quantity,
                    'current_stock'      => (float)$rm8['current_stock'],
                    'available_stock'    => $avail,
                    'is_sufficient'      => $isSuff,
                    'shortage_quantity'  => $isSuff ? 0.0 : round($quantity - $avail, 3),
                    'standard_rate'      => (float)$rm8['standard_rate'],
                    'estimated_cost'     => $est,
                ];
            }
        }

        Response::success([
            'fg_id'               => $fg['id'],
            'fg_code'             => $fg['fg_code'],
            'product_name'        => $fg['product_name'],
            'quantity'            => $quantity,
            'warehouse_id'        => $warehouseId,
            'has_bom'             => (bool)$bom,
            'bom_code'            => $bom ? $bom['bom_code'] : null,
            'has_shortage'        => $hasShortage,
            'total_cost'          => $totalCost,
            'is_already_deducted' => $isAlreadyDeducted,
            'items'               => $items
        ]);
    }

    /**
     * Issue & Deduct Raw Materials (Full Kitting) for a Production Batch
     */
    public static function issueKitting(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $batchNo = trim($input['batch_no'] ?? '');
        $releaseId = (int)($input['release_id'] ?? 0);
        $fgId = (int)($input['fg_id'] ?? 0);
        $quantity = (float)($input['quantity'] ?? 0);
        $warehouseId = (int)($input['warehouse_id'] ?? 1); // WH-MAIN (RM Store)
        $customItems = $input['items'] ?? ($input['custom_items'] ?? null);
        $allowOverride = !empty($input['allow_shortage_override']) || !empty($input['allow_override']);
        $remarks = trim($input['remarks'] ?? '');

        if (!$batchNo) {
            Response::error('Batch number is required.', null, 400);
        }
        if ($quantity <= 0) {
            Response::error('Quantity must be greater than zero.', null, 400);
        }

        $db = Database::getConnection();

        // 1. Resolve Finished Good
        $fg = null;
        if ($fgId > 0) {
            $stmt = $db->prepare("SELECT * FROM finished_goods WHERE id = ?");
            $stmt->execute([$fgId]);
            $fg = $stmt->fetch();
        }

        if (!$fg) {
            $stmt = $db->prepare("
                SELECT fg.*, pr.id as release_id, pr.release_quantity 
                FROM planning_releases pr
                JOIN production_planning pp ON pr.planning_id = pp.id
                JOIN finished_goods fg ON pp.fg_id = fg.id
                WHERE pr.release_number = ?
                LIMIT 1
            ");
            $stmt->execute([$batchNo]);
            $fg = $stmt->fetch();
            if ($fg && empty($releaseId)) {
                $releaseId = (int)$fg['release_id'];
            }
        }

        if (!$fg) {
            Response::error("Could not find product for Batch {$batchNo}.", null, 404);
        }

        // 2. Check if this batch already had RM deducted in stock_ledger or release
        $deductedCheck = $db->prepare("
            SELECT id, quantity_out, material_code, created_at 
            FROM stock_ledger 
            WHERE material_type = 'RM' AND transaction_type IN ('PRODUCTION_CONSUMPTION', 'PRODUCTION_ISSUE') 
              AND (transaction_id = ? OR reference_number = ?)
        ");
        $deductedCheck->execute([$batchNo, $batchNo]);
        $alreadyDeducted = $deductedCheck->fetchAll();

        if (empty($alreadyDeducted)) {
            $prChk = $db->prepare("SELECT rm_deducted FROM planning_releases WHERE release_number = ?");
            $prChk->execute([$batchNo]);
            if ($prChk->fetchColumn()) {
                $alreadyDeducted = [['id' => 0, 'material_code' => 'BOM_KITTING', 'quantity_out' => 0, 'created_at' => date('Y-m-d H:i:s')]];
            }
        }

        if (!empty($alreadyDeducted) && empty($input['force'])) {
            Response::success([
                'already_issued' => true,
                'batch_no'       => $batchNo,
                'deductions'     => $alreadyDeducted
            ], "Raw materials for Batch {$batchNo} have already been issued & deducted from RM stock.");
            return;
        }

        // 3. Resolve kitting items
        $kittingItems = [];
        if (!empty($customItems) && is_array($customItems)) {
            $kittingItems = $customItems;
        } else {
            $bom = BOMService::getActiveBOMForProduct($fg['id']);
            if ($bom) {
                $calc = BOMService::calculateRequirements($bom['id'], $quantity, $warehouseId);
                $kittingItems = $calc['items'];
            } else {
                $weight = (float)(!empty($fg['gross_weight']) ? $fg['gross_weight'] : (!empty($fg['net_weight']) ? $fg['net_weight'] : 0.350));
                $totalBrass = round($weight * $quantity, 3);

                $rm1 = $db->query("SELECT * FROM raw_materials WHERE id = 1")->fetch();
                $rm8 = $db->query("SELECT * FROM raw_materials WHERE id = 8")->fetch();

                if ($rm1) {
                    $kittingItems[] = [
                        'rm_id'              => (int)$rm1['id'],
                        'rm_code'            => $rm1['rm_code'],
                        'material_name'      => $rm1['material_name'],
                        'unit_id'            => (int)$rm1['unit_id'],
                        'unit_code'          => 'KG',
                        'total_required_qty' => $totalBrass,
                        'standard_rate'      => (float)$rm1['standard_rate']
                    ];
                }
                if ($rm8) {
                    $kittingItems[] = [
                        'rm_id'              => (int)$rm8['id'],
                        'rm_code'            => $rm8['rm_code'],
                        'material_name'      => $rm8['material_name'],
                        'unit_id'            => (int)$rm8['unit_id'],
                        'unit_code'          => 'PCS',
                        'total_required_qty' => (float)$quantity,
                        'standard_rate'      => (float)$rm8['standard_rate']
                    ];
                }
            }
        }

        if (empty($kittingItems)) {
            Response::error('No raw materials found for kitting this product.', null, 400);
        }

        try {
            $db->beginTransaction();

            $deductionResults = [];
            foreach ($kittingItems as $item) {
                $rmId = (int)($item['rm_id'] ?? 0);
                $reqQty = (float)($item['total_required_qty'] ?? ($item['quantity'] ?? 0));
                if ($rmId <= 0 || $reqQty <= 0) continue;

                $rmStmt = $db->prepare("SELECT * FROM raw_materials WHERE id = ?");
                $rmStmt->execute([$rmId]);
                $rmData = $rmStmt->fetch();
                if (!$rmData) continue;

                $unitId = (int)($rmData['unit_id'] ?: 1);
                $rate = (float)($rmData['standard_rate'] ?: 0.0);

                // Decrease stock
                $decRes = InventoryService::decreaseStock(
                    'RM',
                    $rmId,
                    $rmData['rm_code'],
                    $warehouseId,
                    $reqQty,
                    $unitId,
                    $rate,
                    'PRODUCTION_CONSUMPTION',
                    $batchNo,
                    $batchNo,
                    $batchNo,
                    date('Y-m-d'),
                    "Raw Material Consumption (Full Kitting) for Batch #{$batchNo} - {$fg['product_name']} (Qty: {$quantity}). " . ($remarks ?: ''),
                    $user['id'] ?? null,
                    $allowOverride
                );

                $deductionResults[] = [
                    'rm_id'         => $rmId,
                    'rm_code'       => $rmData['rm_code'],
                    'material_name' => $rmData['material_name'],
                    'qty_deducted'  => $reqQty,
                    'unit_code'     => $item['unit_code'] ?? 'PCS',
                    'new_stock'     => $decRes['new_qty']
                ];
            }

            // 4. Mark planning_releases as rm_deducted
            $db->prepare("
                UPDATE planning_releases 
                SET rm_deducted = 1, kitting_details = ?, updated_at = NOW() 
                WHERE release_number = ?
            ")->execute([json_encode($deductionResults), $batchNo]);

            AuditService::log('RM_KITTING_ISSUED', 'STOCK', $batchNo, null, [
                'batch_no'   => $batchNo,
                'fg_id'      => $fg['id'],
                'fg_code'    => $fg['fg_code'],
                'deductions' => $deductionResults
            ]);

            $db->commit();

            Response::success([
                'success'    => true,
                'batch_no'   => $batchNo,
                'deductions' => $deductionResults
            ], "Full Kitting completed: " . count($deductionResults) . " Raw Materials deducted from store for Batch #{$batchNo}.");
        } catch (Exception $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            Response::error($e->getMessage(), null, 400);
        }
    }
}
