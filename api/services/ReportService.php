<?php
// ============================================================
// BHARAT IMPEX — REPORT & ANALYTICS SERVICE
// ============================================================

class ReportService {

    /**
     * Executive Dashboard Analytics & KPIs
     */
    public static function getDashboardStats(?string $range = 'THIS_MONTH'): array {
        $db = Database::getConnection();

        // 1. Stock Counts & Valuation
        $stockStmt = $db->query("
            SELECT 
                SUM(CASE WHEN material_type = 'RM' THEN quantity ELSE 0 END) as total_rm_qty,
                SUM(CASE WHEN material_type = 'FG' THEN quantity ELSE 0 END) as total_fg_qty,
                SUM(CASE WHEN material_type = 'SCRAP' THEN quantity ELSE 0 END) as total_scrap_qty,
                COUNT(CASE WHEN material_type = 'RM' AND available_quantity <= 0 THEN 1 END) as rm_out_of_stock,
                COUNT(CASE WHEN material_type = 'FG' AND available_quantity <= 0 THEN 1 END) as fg_out_of_stock
            FROM stock
        ");
        $stockStats = $stockStmt->fetch();

        // Low stock items query
        $lowStockStmt = $db->query("
            SELECT s.*, rm.minimum_stock, rm.reorder_level, u.unit_code
            FROM stock s
            JOIN raw_materials rm ON s.material_id = rm.id AND s.material_type = 'RM'
            JOIN units u ON s.unit_id = u.id
            WHERE s.available_quantity <= rm.reorder_level AND rm.reorder_level > 0
            LIMIT 10
        ");
        $lowStockItems = $lowStockStmt->fetchAll();

        // 2. Today's Transactions
        $todayStmt = $db->query("
            SELECT
                COALESCE((SELECT SUM(quantity) FROM purchase_inputs WHERE purchase_date = CURDATE() AND is_reversed = 0), 0) as today_purchase_qty,
                COALESCE((SELECT SUM(amount) FROM purchase_inputs WHERE purchase_date = CURDATE() AND is_reversed = 0), 0) as today_purchase_val,
                COALESCE((SELECT SUM(quantity) FROM sale_inputs WHERE sale_date = CURDATE() AND is_reversed = 0), 0) as today_sale_qty,
                COALESCE((SELECT SUM(amount) FROM sale_inputs WHERE sale_date = CURDATE() AND is_reversed = 0), 0) as today_sale_val,
                COALESCE((SELECT SUM(produced_quantity) FROM production_orders WHERE DATE(actual_end_date) = CURDATE() AND status = 'COMPLETED'), 0) as today_production_qty,
                COALESCE((SELECT SUM(quantity) FROM production_rejections WHERE DATE(created_at) = CURDATE()), 0) as today_rejection_qty
        ");
        $todayStats = $todayStmt->fetch();

        // 3. Pending & Active Production Orders
        $activeOrdersStmt = $db->query("
            SELECT po.*, fg.product_name, fg.fg_code, u.unit_code,
                   (SELECT COUNT(*) FROM production_stage_entries pse WHERE pse.production_order_id = po.id AND pse.status = 'COMPLETED') as completed_stages,
                   (SELECT COUNT(*) FROM production_stage_entries pse WHERE pse.production_order_id = po.id) as total_stages,
                   (SELECT p.process_name FROM production_stage_entries pse JOIN processes p ON pse.process_id = p.id WHERE pse.production_order_id = po.id AND pse.status = 'IN_PROGRESS' LIMIT 1) as current_stage_name
            FROM production_orders po
            JOIN finished_goods fg ON po.fg_id = fg.id
            JOIN units u ON fg.unit_id = u.id
            WHERE po.status IN ('PLANNED', 'APPROVED', 'IN_PROGRESS', 'ON_HOLD')
            ORDER BY CASE po.priority WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'NORMAL' THEN 3 ELSE 4 END, po.planned_start_date ASC
            LIMIT 15
        ");
        $activeOrders = $activeOrdersStmt->fetchAll();

        foreach ($activeOrders as &$order) {
            $stgStmt = $db->prepare("
                SELECT pse.id, pse.sequence, pse.status, pse.input_quantity, pse.good_quantity, pse.rejected_quantity,
                       p.process_name, p.process_code
                FROM production_stage_entries pse
                JOIN processes p ON pse.process_id = p.id
                WHERE pse.production_order_id = ?
                ORDER BY pse.sequence ASC
            ");
            $stgStmt->execute([$order['id']]);
            $order['stages'] = $stgStmt->fetchAll();
        }
        unset($order);

        // 4. Production Funnel (WIP by active/configured route stages)
        $funnelStmt = $db->query("
            SELECT p.id, p.process_name, p.process_code,
                   MIN(ppm.sequence) as stage_sequence,
                   COALESCE(SUM(CASE WHEN pse.status = 'IN_PROGRESS' THEN pse.input_quantity ELSE 0 END), 0) as in_progress_qty,
                   COALESCE(SUM(CASE WHEN pse.status = 'COMPLETED' THEN pse.good_quantity ELSE 0 END), 0) as completed_qty,
                   COALESCE(SUM(pse.rejected_quantity), 0) as total_rejected
            FROM processes p
            INNER JOIN process_product_mapping ppm ON ppm.process_id = p.id
            LEFT JOIN production_stage_entries pse ON pse.process_id = p.id
            LEFT JOIN production_orders po ON pse.production_order_id = po.id AND po.status = 'IN_PROGRESS'
            WHERE p.active = 1
            GROUP BY p.id, p.process_name, p.process_code
            ORDER BY stage_sequence ASC
        ");
        $funnel = $funnelStmt->fetchAll();

        // Fallback to active processes if no product route mappings exist
        if (empty($funnel)) {
            $funnelStmt = $db->query("
                SELECT p.id, p.process_name, p.process_code, p.sequence as stage_sequence,
                       COALESCE(SUM(CASE WHEN pse.status = 'IN_PROGRESS' THEN pse.input_quantity ELSE 0 END), 0) as in_progress_qty,
                       COALESCE(SUM(CASE WHEN pse.status = 'COMPLETED' THEN pse.good_quantity ELSE 0 END), 0) as completed_qty,
                       COALESCE(SUM(pse.rejected_quantity), 0) as total_rejected
                FROM processes p
                LEFT JOIN production_stage_entries pse ON pse.process_id = p.id
                LEFT JOIN production_orders po ON pse.production_order_id = po.id AND po.status = 'IN_PROGRESS'
                WHERE p.active = 1
                GROUP BY p.id, p.process_name, p.process_code
                ORDER BY p.sequence ASC, p.id ASC
            ");
            $funnel = $funnelStmt->fetchAll();
        }

        // 5. Monthly Trend Data (Last 6 months)
        $trendsStmt = $db->query("
            SELECT 
                DATE_FORMAT(transaction_date, '%b %Y') as month_label,
                DATE_FORMAT(transaction_date, '%Y-%m') as sort_key,
                SUM(CASE WHEN transaction_type = 'PURCHASE' THEN quantity_in * rate ELSE 0 END) as purchase_amount,
                SUM(CASE WHEN transaction_type = 'SALE' THEN quantity_out * rate ELSE 0 END) as sale_amount,
                SUM(CASE WHEN transaction_type = 'PRODUCTION_OUTPUT' THEN quantity_in ELSE 0 END) as production_qty,
                SUM(CASE WHEN transaction_type = 'REJECTION' THEN quantity_out ELSE 0 END) as rejection_qty
            FROM stock_ledger
            WHERE transaction_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
            GROUP BY sort_key, month_label
            ORDER BY sort_key ASC
        ");
        $trends = $trendsStmt->fetchAll();

        // 6. Rejection Reasons Pareto Breakdown
        $rejStmt = $db->query("
            SELECT rr.reason_name, rr.category, SUM(pr.quantity) as total_qty, COUNT(pr.id) as incident_count
            FROM production_rejections pr
            JOIN rejection_reasons rr ON pr.rejection_reason_id = rr.id
            GROUP BY rr.id, rr.reason_name, rr.category
            ORDER BY total_qty DESC
            LIMIT 6
        ");
        $rejectionReasons = $rejStmt->fetchAll();

        // 7. Planning Summary (Current Planning)
        $planningSummary = [
            'total_plans'         => 0,
            'active_plans'        => 0,
            'total_planned_qty'   => 0.0,
            'total_released_qty'  => 0.0,
            'pending_release_qty' => 0.0,
            'recent_plans'        => []
        ];
        try {
            $planStmt = $db->query("
                SELECT 
                    COUNT(*) as total_plans,
                    COUNT(CASE WHEN status NOT IN ('COMPLETED', 'CANCELLED') THEN 1 END) as active_plans,
                    COALESCE(SUM(planned_quantity), 0) as total_planned_qty,
                    COALESCE(SUM(released_quantity), 0) as total_released_qty,
                    COALESCE(SUM(planned_quantity - released_quantity), 0) as pending_release_qty
                FROM production_planning
            ");
            $planStats = $planStmt->fetch();
            if ($planStats) {
                $planningSummary['total_plans']         = (int)$planStats['total_plans'];
                $planningSummary['active_plans']        = (int)$planStats['active_plans'];
                $planningSummary['total_planned_qty']   = (float)$planStats['total_planned_qty'];
                $planningSummary['total_released_qty']  = (float)$planStats['total_released_qty'];
                $planningSummary['pending_release_qty'] = (float)$planStats['pending_release_qty'];
            }

            $recentPlansStmt = $db->query("
                SELECT pp.id, pp.planning_number, pp.planned_quantity, pp.released_quantity, 
                       (pp.planned_quantity - pp.released_quantity) as pending_quantity,
                       pp.priority, pp.status, pp.planning_date,
                       fg.fg_code, fg.product_name, u.unit_code
                FROM production_planning pp
                JOIN finished_goods fg ON pp.fg_id = fg.id
                JOIN units u ON pp.unit_id = u.id
                WHERE pp.status NOT IN ('COMPLETED', 'CANCELLED', 'FULLY_RELEASED')
                  AND (pp.planned_quantity - pp.released_quantity) > 0
                ORDER BY pp.planning_date DESC, pp.id DESC
                LIMIT 8
            ");
            $planningSummary['recent_plans'] = $recentPlansStmt->fetchAll();
        } catch (Exception $e) {
            // optional pass
        }

        // 8. Open SKU Tracking (Live Batches in WIP not yet converted to FG)
        $openSkus = [];
        try {
            $openStmt = $db->query("
                SELECT pr.id, pr.release_number as production_number, pr.release_number as batch_no,
                       pr.planning_id, pr.release_quantity as planned_quantity,
                       0 as produced_quantity,
                       pr.release_quantity as pending_to_fg,
                       pr.release_date as planned_start_date,
                       pr.status,
                       pp.planning_number,
                       fg.id as fg_id, fg.fg_code, fg.product_name, u.unit_code,
                       'In Production' as current_stage_name,
                       0 as completed_stages,
                       4 as total_stages
                FROM planning_releases pr
                JOIN production_planning pp ON pr.planning_id = pp.id
                JOIN finished_goods fg ON pp.fg_id = fg.id
                JOIN units u ON pp.unit_id = u.id
                WHERE pr.status = 'ACTIVE'
                ORDER BY pr.id DESC
                LIMIT 20
            ");
            $openSkus = $openStmt->fetchAll();
        } catch (Exception $e) {
            $openSkus = [];
        }

        return [
            'stock_summary'     => $stockStats,
            'planning_summary'  => $planningSummary,
            'open_skus'         => $openSkus,
            'today_kpis'        => $todayStats,
            'low_stock_alerts'  => $lowStockItems,
            'active_orders'     => $activeOrders,
            'production_funnel' => $funnel,
            'monthly_trends'    => $trends,
            'rejection_pareto'  => $rejectionReasons
        ];
    }

    /**
     * Stage Efficiency Analytics
     */
    public static function getStageEfficiencyReport(?string $fromDate = null, ?string $toDate = null): array {
        $db = Database::getConnection();
        
        $sql = "
            SELECT 
                p.id as process_id,
                p.process_code,
                p.process_name,
                COUNT(pse.id) as total_batches,
                SUM(pse.input_quantity) as total_input,
                SUM(pse.good_quantity) as total_good,
                SUM(pse.rejected_quantity) as total_rejected,
                SUM(pse.scrap_quantity) as total_scrap,
                SUM(pse.loss_quantity) as total_loss,
                AVG(pse.total_duration_minutes) as avg_duration_mins
            FROM processes p
            JOIN production_stage_entries pse ON pse.process_id = p.id
            JOIN production_orders po ON pse.production_order_id = po.id
            WHERE pse.status = 'COMPLETED'
        ";

        $params = [];
        if ($fromDate) {
            $sql .= " AND po.planned_start_date >= ?";
            $params[] = $fromDate;
        }
        if ($toDate) {
            $sql .= " AND po.planned_start_date <= ?";
            $params[] = $toDate;
        }

        $sql .= " GROUP BY p.id, p.process_code, p.process_name ORDER BY p.sequence ASC, p.id ASC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        foreach ($rows as &$r) {
            $input = (float)$r['total_input'];
            $good = (float)$r['total_good'];
            $rej = (float)$r['total_rejected'];
            $loss = (float)$r['total_loss'];

            $r['efficiency_pct'] = $input > 0 ? round(($good / $input) * 100, 2) : 100.0;
            $r['rejection_pct'] = $input > 0 ? round(($rej / $input) * 100, 2) : 0.0;
            $r['loss_pct'] = $input > 0 ? round(($loss / $input) * 100, 2) : 0.0;
        }

        return $rows;
    }

    /**
     * SKU Traceability Complete Lifecycle
     */
    public static function getSKUTraceability(int $fgId): array {
        $db = Database::getConnection();

        // Finished Good details
        $fgStmt = $db->prepare("
            SELECT fg.*, u.unit_code, c.category_name 
            FROM finished_goods fg
            JOIN units u ON fg.unit_id = u.id
            LEFT JOIN categories c ON fg.category_id = c.id
            WHERE fg.id = ?
        ");
        $fgStmt->execute([$fgId]);
        $fg = $fgStmt->fetch();

        if (!$fg) throw new RuntimeException("Finished good not found.");

        // Production History
        $ordersStmt = $db->prepare("
            SELECT po.*, bh.bom_code, bh.version as bom_version
            FROM production_orders po
            JOIN bom_headers bh ON po.bom_id = bh.id
            WHERE po.fg_id = ?
            ORDER BY po.id DESC
        ");
        $ordersStmt->execute([$fgId]);
        $orders = $ordersStmt->fetchAll();

        foreach ($orders as &$ord) {
            // Fetch stages
            $stagesStmt = $db->prepare("
                SELECT pse.*, p.process_name, p.process_code, u.full_name as operator_name
                FROM production_stage_entries pse
                JOIN processes p ON pse.process_id = p.id
                LEFT JOIN users u ON pse.operator_id = u.id
                WHERE pse.production_order_id = ?
                ORDER BY pse.sequence ASC
            ");
            $stagesStmt->execute([$ord['id']]);
            $ord['stages'] = $stagesStmt->fetchAll();

            // Fetch RM consumed
            $consStmt = $db->prepare("
                SELECT pc.*, rm.material_name, u.unit_code
                FROM production_consumption pc
                JOIN raw_materials rm ON pc.rm_id = rm.id
                JOIN units u ON pc.unit_id = u.id
                WHERE pc.production_order_id = ?
            ");
            $consStmt->execute([$ord['id']]);
            $ord['consumed_materials'] = $consStmt->fetchAll();

            // Fetch rejections
            $rejStmt = $db->prepare("
                SELECT pr.*, rr.reason_name, sm.scrap_name
                FROM production_rejections pr
                JOIN rejection_reasons rr ON pr.rejection_reason_id = rr.id
                LEFT JOIN scrap_materials sm ON pr.scrap_material_id = sm.id
                WHERE pr.production_order_id = ?
            ");
            $rejStmt->execute([$ord['id']]);
            $ord['rejections'] = $rejStmt->fetchAll();
        }

        // Sales history for this SKU
        $salesStmt = $db->prepare("
            SELECT si.*, u.unit_code, sib.batch_code
            FROM sale_inputs si
            JOIN units u ON si.unit_id = u.id
            LEFT JOIN sale_import_batches sib ON si.sale_batch_id = sib.id
            WHERE si.fg_id = ? AND si.is_reversed = 0
            ORDER BY si.sale_date DESC
            LIMIT 50
        ");
        $salesStmt->execute([$fgId]);
        $sales = $salesStmt->fetchAll();

        return [
            'finished_good' => $fg,
            'productions'   => $orders,
            'sales_history' => $sales
        ];
    }
}
