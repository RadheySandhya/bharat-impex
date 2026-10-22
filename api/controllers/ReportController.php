<?php
// ============================================================
// BHARAT IMPEX — REPORT CONTROLLER
// ============================================================

class ReportController {

    public static function stageEfficiency(): void {
        Auth::requireAuth();
        $fromDate = $_GET['from_date'] ?? null;
        $toDate = $_GET['to_date'] ?? null;
        $res = ReportService::getStageEfficiencyReport($fromDate, $toDate);
        Response::success($res);
    }

    public static function skuTraceability(): void {
        Auth::requireAuth();
        $fgId = (int)($_GET['fg_id'] ?? 0);
        if (!$fgId) {
            Response::error('Finished Good ID is required.', null, 400);
        }
        try {
            $res = ReportService::getSKUTraceability($fgId);
            Response::success($res);
        } catch (Exception $e) {
            Response::error($e->getMessage(), null, 404);
        }
    }

    public static function stockValuation(): void {
        Auth::requireAuth();
        $db = Database::getConnection();

        $stmt = $db->query("
            SELECT s.*, u.unit_code, w.warehouse_name,
                   CASE 
                       WHEN s.material_type = 'RM' THEN rm.standard_rate
                       WHEN s.material_type = 'FG' THEN fg.selling_price
                       WHEN s.material_type = 'SCRAP' THEN sm.standard_rate
                       ELSE 0 
                   END as unit_rate,
                   (s.quantity * (
                       CASE 
                           WHEN s.material_type = 'RM' THEN rm.standard_rate
                           WHEN s.material_type = 'FG' THEN fg.selling_price
                           WHEN s.material_type = 'SCRAP' THEN sm.standard_rate
                           ELSE 0 
                       END
                   )) as total_valuation
            FROM stock s
            JOIN units u ON s.unit_id = u.id
            JOIN warehouses w ON s.warehouse_id = w.id
            LEFT JOIN raw_materials rm ON s.material_type = 'RM' AND s.material_id = rm.id
            LEFT JOIN finished_goods fg ON s.material_type = 'FG' AND s.material_id = fg.id
            LEFT JOIN scrap_materials sm ON s.material_type = 'SCRAP' AND s.material_id = sm.id
            WHERE s.quantity > 0
              AND (
                  (s.material_type = 'RM' AND rm.id IS NOT NULL AND rm.deleted_at IS NULL AND (rm.active IS NULL OR rm.active = 1)) OR
                  (s.material_type = 'FG' AND fg.id IS NOT NULL AND fg.deleted_at IS NULL AND (fg.active IS NULL OR fg.active = 1)) OR
                  (s.material_type NOT IN ('RM', 'FG'))
              )
            ORDER BY total_valuation DESC
        ");
        $valuation = $stmt->fetchAll();

        $totalValuation = array_sum(array_column($valuation, 'total_valuation'));

        Response::success([
            'items'           => $valuation,
            'total_valuation' => round($totalValuation, 2)
        ]);
    }
}
