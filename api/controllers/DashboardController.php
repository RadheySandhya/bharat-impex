<?php
// ============================================================
// BHARAT IMPEX — DASHBOARD CONTROLLER
// ============================================================

class DashboardController {
    public static function index(): void {
        Auth::requireAuth();
        $range = $_GET['range'] ?? 'THIS_MONTH';
        $stats = ReportService::getDashboardStats($range);
        Response::success($stats);
    }
}
