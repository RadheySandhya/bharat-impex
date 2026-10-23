<?php
// ============================================================
// BHARAT IMPEX — MASTER API ENTRY POINT & ROUTER
// ============================================================

// Error reporting & Timezone
error_reporting(E_ALL & ~E_NOTICE & ~E_DEPRECATED);
ini_set('display_errors', '0');
date_default_timezone_set('Asia/Kolkata');

// CORS Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Max-Age: 86400');

// Handle CORS Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Autoload Core Classes & Services
require_once __DIR__ . '/core/Database.php';
require_once __DIR__ . '/core/Response.php';
require_once __DIR__ . '/core/Auth.php';

require_once __DIR__ . '/services/AuditService.php';
require_once __DIR__ . '/services/InventoryService.php';
require_once __DIR__ . '/services/BOMService.php';
require_once __DIR__ . '/services/ProductionService.php';
require_once __DIR__ . '/services/ImportService.php';
require_once __DIR__ . '/services/ReportService.php';

require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/DashboardController.php';
require_once __DIR__ . '/controllers/StockController.php';
require_once __DIR__ . '/controllers/PurchaseController.php';
require_once __DIR__ . '/controllers/SalesController.php';
require_once __DIR__ . '/controllers/ProductionController.php';
require_once __DIR__ . '/controllers/BOMController.php';
require_once __DIR__ . '/controllers/RawMaterialController.php';
require_once __DIR__ . '/controllers/FinishedGoodsController.php';
require_once __DIR__ . '/controllers/ProcessController.php';
require_once __DIR__ . '/controllers/MappingController.php';
require_once __DIR__ . '/controllers/ReportController.php';
require_once __DIR__ . '/controllers/SettingsController.php';
require_once __DIR__ . '/controllers/PlanningController.php';
require_once __DIR__ . '/controllers/InOutController.php';
require_once __DIR__ . '/controllers/SubSKUController.php';

// Route Extraction
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

// Normalize URI (extract portion after /api/)
$apiPos = strpos($uri, '/api/');
$route = '';
if ($apiPos !== false) {
    $route = trim(substr($uri, $apiPos + 5), '/');
} else {
    $route = trim($uri, '/');
}

try {
    switch ($route) {
        // Health / Status
        case '':
        case 'health':
            Response::success([
                'app'       => 'Bharat Impex ERP API',
                'status'    => 'running',
                'timestamp' => date('Y-m-d H:i:s'),
                'php'       => phpversion(),
            ], 'API is healthy and online');
            break;

        // Auth
        case 'auth/login':
            if ($method === 'POST') AuthController::login();
            break;
        case 'auth/me':
            if ($method === 'GET') AuthController::me();
            break;

        // Dashboard
        case 'dashboard':
            if ($method === 'GET') DashboardController::index();
            break;

        // Raw Materials
        case 'raw-materials':
            if ($method === 'GET') RawMaterialController::index();
            elseif ($method === 'POST') RawMaterialController::create();
            break;
        case 'raw-materials/update':
            if ($method === 'POST') RawMaterialController::update();
            break;
        case 'raw-materials/delete':
            if ($method === 'POST') RawMaterialController::delete();
            break;
        case 'raw-materials/restore':
            if ($method === 'POST') RawMaterialController::restore();
            break;
        case 'raw-materials/bulk-import':
            if ($method === 'POST') RawMaterialController::bulkImport();
            break;

        // Finished Goods
        case 'finished-goods':
            if ($method === 'GET') FinishedGoodsController::index();
            elseif ($method === 'POST') FinishedGoodsController::create();
            break;
        case 'finished-goods/update':
            if ($method === 'POST') FinishedGoodsController::update();
            break;
        case 'finished-goods/delete':
            if ($method === 'POST') FinishedGoodsController::delete();
            break;
        case 'finished-goods/restore':
            if ($method === 'POST') FinishedGoodsController::restore();
            break;
        case 'finished-goods/bulk-import':
            if ($method === 'POST') FinishedGoodsController::bulkImport();
            break;

        // Stock & Ledger
        case 'stock':
            if ($method === 'GET') StockController::index();
            break;
        case 'stock/ledger':
            if ($method === 'GET') StockController::ledger();
            break;
        case 'stock/adjust':
            if ($method === 'POST') StockController::adjust();
            break;
        case 'stock/transfer':
            if ($method === 'POST') StockController::transfer();
            break;
        case 'stock/opening':
            if ($method === 'POST') StockController::openingStock();
            break;
        case 'stock/ims-master':
            if ($method === 'GET') StockController::imsMaster();
            break;
        case 'stock/record-snapshot':
            if ($method === 'POST') StockController::recordSnapshot();
            break;
        case 'stock/cron-snapshot':
            StockController::cronSnapshot();
            break;
        case 'stock/bulk-import':
            if ($method === 'POST') StockController::bulkImport();
            break;

        // Purchase
        case 'purchase':
            if ($method === 'GET') PurchaseController::index();
            elseif ($method === 'POST') PurchaseController::createDirect();
            break;
        case 'purchase/upload-preview':
            if ($method === 'POST') PurchaseController::uploadPreview();
            break;
        case 'purchase/confirm-import':
            if ($method === 'POST') PurchaseController::confirmImport();
            break;
        case 'purchase/batches':
            if ($method === 'GET') PurchaseController::batches();
            break;
        case 'purchase/reverse-batch':
            if ($method === 'POST') PurchaseController::reverseBatch();
            break;

        // Sales
        case 'sales':
            if ($method === 'GET') SalesController::index();
            elseif ($method === 'POST') SalesController::createDirect();
            break;
        case 'sales/upload-preview':
            if ($method === 'POST') SalesController::uploadPreview();
            break;
        case 'sales/confirm-import':
            if ($method === 'POST') SalesController::confirmImport();
            break;
        case 'sales/batches':
            if ($method === 'GET') SalesController::batches();
            break;
        case 'sales/reverse-batch':
            if ($method === 'POST') SalesController::reverseBatch();
            break;

        // In / Out (Unified Purchase & Sales Spreadsheet System)
        case 'in-out':
            if ($method === 'GET') InOutController::index();
            break;
        case 'in-out/parties':
            InOutController::parties();
            break;
        case 'in-out/items':
            if ($method === 'GET') InOutController::items();
            break;
        case 'in-out/batch-save':
            if ($method === 'POST') InOutController::batchSave();
            break;

        // Planning — must come before SKU Tracking & Production routes
        case 'planning':
            if ($method === 'GET')  PlanningController::index();
            elseif ($method === 'POST') PlanningController::create();
            break;
        case 'planning/stats':
            if ($method === 'GET') PlanningController::stats();
            break;
        case 'planning/show':
            if ($method === 'GET') PlanningController::show();
            break;
        case 'planning/approve':
            if ($method === 'POST') PlanningController::approve();
            break;
        case 'planning/release':
            if ($method === 'POST') PlanningController::release();
            break;
        case 'planning/releases':
            if ($method === 'GET') PlanningController::releases();
            break;
        case 'planning/update':
            if ($method === 'POST') PlanningController::update();
            break;
        case 'planning/update-stages':
            if ($method === 'POST') PlanningController::updateStages();
            break;
        case 'planning/cancel':
            if ($method === 'POST') PlanningController::cancel();
            break;

        // BOM
        case 'bom':
            if ($method === 'GET') BOMController::index();
            elseif ($method === 'POST') BOMController::create();
            break;
        case 'bom/all-items':
            if ($method === 'GET') BOMController::allItems();
            break;
        case 'bom/batch-save-grid':
            if ($method === 'POST') BOMController::batchSaveGrid();
            break;
        case 'bom/show':
            if ($method === 'GET') BOMController::show();
            break;
        case 'bom/update':
            if ($method === 'POST') BOMController::update();
            break;
        case 'bom/create-version':
            if ($method === 'POST') BOMController::createVersion();
            break;

        // Production
        case 'production/orders':
            if ($method === 'GET') ProductionController::index();
            elseif ($method === 'POST') ProductionController::create();
            break;
        case 'production/order':
            if ($method === 'GET') ProductionController::show();
            break;
        case 'production/calculate':
            if ($method === 'GET') ProductionController::calculate();
            break;
        case 'production/approve':
            if ($method === 'POST') ProductionController::approve();
            break;
        case 'production/start-stage':
            if ($method === 'POST') ProductionController::startStage();
            break;
        case 'production/pause-stage':
            if ($method === 'POST') ProductionController::pauseStage();
            break;
        case 'production/resume-stage':
            if ($method === 'POST') ProductionController::resumeStage();
            break;
        case 'production/log-rejection':
            if ($method === 'POST') ProductionController::logRejection();
            break;
        case 'production/complete-stage':
            if ($method === 'POST') ProductionController::completeStage();
            break;
        case 'production/complete-batch-to-fg':
            if ($method === 'POST') ProductionController::completeBatchToFG();
            break;
        case 'production/kitting-preview':
            if ($method === 'GET' || $method === 'POST') ProductionController::kittingPreview();
            break;
        case 'production/issue-kitting':
            if ($method === 'POST') ProductionController::issueKitting();
            break;
        case 'production/queue':
            if ($method === 'GET') ProductionController::operatorQueue();
            break;

        // Production Planning & Release Control (PLANNING FIRST)
        case 'planning':
            if ($method === 'GET') PlanningController::index();
            elseif ($method === 'POST') PlanningController::create();
            break;
        case 'planning/stats':
            if ($method === 'GET') PlanningController::stats();
            break;
        case 'planning/show':
            if ($method === 'GET') PlanningController::show();
            break;
        case 'planning/approve':
            if ($method === 'POST') PlanningController::approve();
            break;
        case 'planning/release':
            if ($method === 'POST') PlanningController::release();
            break;
        case 'planning/releases':
            if ($method === 'GET') PlanningController::releases();
            break;
        case 'planning/update':
            if ($method === 'POST') PlanningController::update();
            break;
        case 'planning/update-stages':
            if ($method === 'POST') PlanningController::updateStages();
            break;
        case 'planning/cancel':
            if ($method === 'POST') PlanningController::cancel();
            break;

        // Processes & Dynamic Routes
        case 'processes':
            if ($method === 'GET') ProcessController::index();
            elseif ($method === 'POST') ProcessController::create();
            break;
        case 'processes/update':
            if ($method === 'POST') ProcessController::update();
            break;
        case 'processes/product-route':
            if ($method === 'GET') ProcessController::getProductRoute();
            elseif ($method === 'POST') ProcessController::saveProductRoute();
            break;
        case 'processes/delete':
            if ($method === 'POST' || $method === 'DELETE') ProcessController::delete();
            break;
        case 'processes/batch-save-flow':
            if ($method === 'POST') ProcessController::batchSaveFlow();
            break;

        // Sub-SKUs & OEM Brand Mappings
        case 'sub-skus':
            if ($method === 'GET') SubSKUController::index();
            elseif ($method === 'POST') SubSKUController::save();
            elseif ($method === 'DELETE') SubSKUController::delete();
            break;
        case 'sub-skus/delete':
            if ($method === 'POST') SubSKUController::delete();
            break;
        case 'sub-skus/bulk-import':
            if ($method === 'POST') SubSKUController::bulkImport();
            break;

        // Tally Item Mappings
        case 'mappings':
            if ($method === 'GET') MappingController::index();
            elseif ($method === 'POST') MappingController::save();
            elseif ($method === 'DELETE') MappingController::delete();
            break;

        // Reports
        case 'reports/stage-efficiency':
            if ($method === 'GET') ReportController::stageEfficiency();
            break;
        case 'reports/sku-traceability':
            if ($method === 'GET') ReportController::skuTraceability();
            break;
        case 'reports/stock-valuation':
            if ($method === 'GET') ReportController::stockValuation();
            break;

        // Settings & Masters
        case 'settings/bundle':
            if ($method === 'GET') SettingsController::bundle();
            break;
        case 'settings/categories':
            if ($method === 'GET') SettingsController::categories();
            elseif ($method === 'POST') SettingsController::saveCategory();
            break;
        case 'settings/units':
            if ($method === 'GET') SettingsController::units();
            elseif ($method === 'POST') SettingsController::saveUnit();
            break;
        case 'settings/rejection-reasons':
            if ($method === 'GET') SettingsController::rejectionReasons();
            elseif ($method === 'POST') SettingsController::saveRejectionReason();
            break;
        case 'settings/warehouses':
            if ($method === 'GET') SettingsController::warehouses();
            elseif ($method === 'POST') SettingsController::saveWarehouse();
            elseif ($method === 'DELETE') SettingsController::deleteWarehouse();
            break;
        case 'settings/delete-warehouse':
            if ($method === 'POST' || $method === 'DELETE') SettingsController::deleteWarehouse();
            break;
        case 'settings/company':
            if ($method === 'GET') SettingsController::getCompany();
            elseif ($method === 'POST') SettingsController::saveCompany();
            break;
        case 'settings/users':
            if ($method === 'GET') SettingsController::users();
            elseif ($method === 'POST') SettingsController::saveUser();
            break;
        case 'settings/roles':
            if ($method === 'GET') SettingsController::roles();
            break;
        case 'settings/audit-logs':
            if ($method === 'GET') SettingsController::auditLogs();
            break;

        default:
            Response::error("Endpoint not found: {$method} /api/{$route}", null, 404);
            break;
    }
} catch (Throwable $e) {
    Response::error($e->getMessage(), [
        'file' => basename($e->getFile()),
        'line' => $e->getLine()
    ], 500);
}
