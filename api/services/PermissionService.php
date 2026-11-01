<?php
// ============================================================
// BHARAT IMPEX — ROLE / USER PERMISSION ENGINE
// ============================================================
//
// Permissions are "module.action" keys ticked per role (checkbox matrix in
// Settings -> Users & Roles). SKU Tracking can additionally be limited to
// particular production stages: "sku_tracking.stage.<process_id>" or
// "sku_tracking.stage.all". A user may carry a personal stage list
// (users.stage_access) that overrides the role's stage list, so each
// supervisor can be given only his own stages.

class PermissionService {

    private static ?array $effectiveCache = null;

    public static function catalog(): array {
        return [
            ['key' => 'dashboard', 'label' => 'Dashboard', 'actions' => [
                ['key' => 'view', 'label' => 'View'],
            ]],
            ['key' => 'planning', 'label' => 'Production Planning', 'actions' => [
                ['key' => 'view', 'label' => 'View'],
                ['key' => 'edit', 'label' => 'Create / Edit / Cancel'],
                ['key' => 'approve', 'label' => 'Approve'],
                ['key' => 'release', 'label' => 'Release Batches'],
            ]],
            ['key' => 'sku_tracking', 'label' => 'SKU Tracking', 'has_stages' => true, 'actions' => [
                ['key' => 'view', 'label' => 'View'],
                ['key' => 'handoff', 'label' => 'Stage Handoff & Rejection Entry'],
                ['key' => 'edit', 'label' => 'New Batch / Edit Figures'],
                ['key' => 'kitting', 'label' => 'Full Kitting'],
                ['key' => 'export', 'label' => 'Export CSV'],
            ]],
            ['key' => 'inventory', 'label' => 'Stock & Inventory', 'actions' => [
                ['key' => 'view', 'label' => 'View'],
                ['key' => 'transfer', 'label' => 'Godown Transfer'],
                ['key' => 'adjust', 'label' => 'Stock Adjustment'],
                ['key' => 'opening', 'label' => 'Opening Stock'],
                ['key' => 'bulk', 'label' => 'Bulk Stock Upload'],
            ]],
            ['key' => 'in_out', 'label' => 'In / Out (Purchase & Sales)', 'actions' => [
                ['key' => 'view', 'label' => 'View'],
                ['key' => 'purchase', 'label' => 'IN Entry (Purchase)'],
                ['key' => 'sale', 'label' => 'OUT Entry (Sales)'],
                ['key' => 'tally_import', 'label' => 'Tally CSV Import / Reverse'],
                ['key' => 'parties', 'label' => 'Manage Parties'],
            ]],
            ['key' => 'sku_bom', 'label' => 'SKU & Multi-BOM', 'actions' => [
                ['key' => 'view', 'label' => 'View'],
                ['key' => 'edit', 'label' => 'Create / Edit'],
            ]],
            ['key' => 'rejections', 'label' => 'Rejection & Scrap', 'actions' => [
                ['key' => 'view', 'label' => 'View'],
                ['key' => 'process', 'label' => 'Move / Complete Lots'],
                ['key' => 'cancel', 'label' => 'Cancel Lots'],
            ]],
            ['key' => 'production_process', 'label' => 'Process Maps (Production & Rejection)', 'actions' => [
                ['key' => 'view', 'label' => 'View'],
                ['key' => 'edit', 'label' => 'Edit & Save'],
            ]],
            ['key' => 'reports', 'label' => 'Reports', 'actions' => [
                ['key' => 'view', 'label' => 'View'],
            ]],
            ['key' => 'masters', 'label' => 'Masters (Parts, SKUs, Godowns...)', 'actions' => [
                ['key' => 'view', 'label' => 'View'],
                ['key' => 'edit', 'label' => 'Create / Edit / Delete'],
            ]],
            ['key' => 'settings', 'label' => 'Administration', 'actions' => [
                ['key' => 'users', 'label' => 'Users & Roles'],
                ['key' => 'company', 'label' => 'Company Profile'],
                ['key' => 'audit', 'label' => 'Audit Logs'],
            ]],
        ];
    }

    public static function allKeys(): array {
        $keys = [];
        foreach (self::catalog() as $m) {
            foreach ($m['actions'] as $a) $keys[] = $m['key'] . '.' . $a['key'];
        }
        return $keys;
    }

    /** Old role codes from the original seed, translated so existing users keep sensible access. */
    private static function legacyMap(): array {
        $managerAll = array_values(array_filter(self::allKeys(), fn($k) => !str_starts_with($k, 'settings.')));
        return [
            'VIEW_ALL'                 => $managerAll,
            'APPROVE_PRODUCTION'       => ['planning.view', 'planning.approve', 'planning.release'],
            'MANAGE_MASTERS'           => ['masters.view', 'masters.edit'],
            'VIEW_REPORTS'             => ['reports.view', 'dashboard.view'],
            'REPORTS_VIEW'             => ['reports.view', 'dashboard.view'],
            'PURCHASE_READ'            => ['in_out.view'],
            'PURCHASE_IMPORT'          => ['in_out.view', 'in_out.purchase', 'in_out.tally_import', 'in_out.parties'],
            'PURCHASE_REVERSE'         => ['in_out.tally_import'],
            'MAPPING_MANAGE'           => ['in_out.tally_import'],
            'STOCK_READ'               => ['inventory.view'],
            'STOCK_ADJUST'             => ['inventory.view', 'inventory.adjust', 'inventory.opening', 'inventory.bulk'],
            'STOCK_TRANSFER'           => ['inventory.view', 'inventory.transfer'],
            'PRODUCTION_READ'          => ['planning.view', 'sku_tracking.view', 'rejections.view', 'production_process.view'],
            'PRODUCTION_PLAN'          => ['planning.view', 'planning.edit', 'planning.release', 'sku_tracking.kitting', 'sku_tracking.edit'],
            'BOM_MANAGE'               => ['sku_bom.view', 'sku_bom.edit'],
            'PROCESS_MANAGE'           => ['production_process.view', 'production_process.edit'],
            'PRODUCTION_OPERATOR_VIEW' => ['sku_tracking.view'],
            'STAGE_EXECUTE'            => ['sku_tracking.view', 'sku_tracking.handoff'],
            'REJECTION_LOG'            => ['rejections.view', 'rejections.process'],
            'SALES_READ'               => ['in_out.view'],
            'SALES_IMPORT'             => ['in_out.view', 'in_out.sale', 'in_out.tally_import', 'in_out.parties'],
            'SALES_REVERSE'            => ['in_out.tally_import'],
        ];
    }

    public static function isAdminUser(array $user): bool {
        $roleCode = strtoupper($user['role_code'] ?? '');
        $roleName = strtoupper($user['role_name'] ?? '');
        $raw = is_array($user['permissions'] ?? null) ? $user['permissions'] : (json_decode($user['permissions'] ?? '[]', true) ?: []);
        return $roleCode === 'ADMIN' || $roleCode === 'SUPERADMIN' || str_contains($roleName, 'ADMIN')
            || in_array('ALL', $raw, true) || in_array('*', $raw, true);
    }

    /** users.stage_access holds a personal stage list (JSON array of process ids) or NULL = follow role. */
    public static function ensureSchema(): void {
        static $done = false;
        if ($done) return;
        $done = true;
        try {
            $db = Database::getConnection();
            $has = $db->query("SHOW COLUMNS FROM users LIKE 'stage_access'")->fetch();
            if (!$has) {
                $db->exec("ALTER TABLE users ADD COLUMN stage_access TEXT NULL AFTER role_id");
            }
        } catch (Exception $e) {
            error_log('stage_access column check failed: ' . $e->getMessage());
        }
    }

    /**
     * Effective access for a user row (needs role_code, role_name, permissions, stage_access).
     * Returns ['is_admin' => bool, 'permissions' => [...keys], 'stages' => 'ALL' | [process ids]]
     */
    public static function effective(array $user): array {
        $raw = is_array($user['permissions'] ?? null) ? $user['permissions'] : (json_decode($user['permissions'] ?? '[]', true) ?: []);
        if (self::isAdminUser($user)) {
            return ['is_admin' => true, 'permissions' => self::allKeys(), 'stages' => 'ALL'];
        }

        $valid = array_flip(self::allKeys());
        $legacy = self::legacyMap();
        $perms = [];
        $roleStages = [];
        $roleStagesAll = false;
        $usesNewKeys = false;
        $usedLegacy = false;

        foreach ($raw as $p) {
            $p = (string)$p;
            if (isset($valid[$p])) {
                $perms[$p] = true;
                $usesNewKeys = true;
            } elseif ($p === 'sku_tracking.stage.all') {
                $roleStagesAll = true;
                $usesNewKeys = true;
            } elseif (preg_match('/^sku_tracking\.stage\.(\d+)$/', $p, $m)) {
                $roleStages[] = (int)$m[1];
                $usesNewKeys = true;
            } elseif (isset($legacy[$p])) {
                foreach ($legacy[$p] as $k) $perms[$k] = true;
                $usedLegacy = true;
            }
        }
        if ($usedLegacy && !$usesNewKeys) {
            $perms['dashboard.view'] = true;
            $roleStagesAll = true; // legacy roles were never stage-restricted
        }
        // Any action in a module implies seeing that module
        foreach (array_keys($perms) as $k) {
            [$mod] = explode('.', $k, 2);
            if (isset($valid["{$mod}.view"])) $perms["{$mod}.view"] = true;
        }

        $stages = $roleStagesAll ? 'ALL' : array_values(array_unique($roleStages));
        $personal = $user['stage_access'] ?? null;
        if ($personal !== null && $personal !== '') {
            $list = is_array($personal) ? $personal : json_decode((string)$personal, true);
            if (is_array($list)) {
                $stages = in_array('ALL', $list, true) ? 'ALL' : array_values(array_unique(array_map('intval', $list)));
            }
        }

        return ['is_admin' => false, 'permissions' => array_keys($perms), 'stages' => $stages];
    }

    public static function current(): array {
        if (self::$effectiveCache !== null) return self::$effectiveCache;
        $user = Auth::requireAuth();
        return self::$effectiveCache = self::effective($user);
    }

    public static function can(string $key): bool {
        $eff = self::current();
        return $eff['is_admin'] || in_array($key, $eff['permissions'], true);
    }

    public static function canAny(array $keys): bool {
        foreach ($keys as $k) if (self::can($k)) return true;
        return false;
    }

    public static function requireAny(array $keys): void {
        if (!self::canAny($keys)) {
            $labels = implode(' or ', $keys);
            Response::error("Access denied. Your role does not allow this action ({$labels}). Ask the admin to tick it in Users & Roles.", ['required' => $keys], 403);
        }
    }

    /** Stage key used in SKU tracking JSON (process_code lowercased, non-alphanumerics -> "_"). */
    public static function stageKeyFor(array $process): string {
        $code = (string)($process['process_code'] ?? '');
        return $code !== '' ? preg_replace('/[^a-z0-9]/', '_', strtolower($code)) : 'proc_' . $process['id'];
    }

    /** Map of stage key => process id for active processes, ordered by sequence. */
    public static function stageMap(): array {
        static $map = null;
        if ($map !== null) return $map;
        $map = [];
        $rows = Database::getConnection()->query("SELECT id, process_code FROM processes WHERE active = 1 ORDER BY sequence ASC, id ASC")->fetchAll();
        foreach ($rows as $r) $map[self::stageKeyFor($r)] = (int)$r['id'];
        return $map;
    }

    public static function canStageKey(string $stageKey): bool {
        $eff = self::current();
        if ($eff['is_admin'] || $eff['stages'] === 'ALL') return true;
        $map = self::stageMap();
        if (!isset($map[$stageKey])) return false;
        return in_array($map[$stageKey], $eff['stages'], true);
    }

    /**
     * SKU-tracking save: every stage whose figures changed must be one the user may work on,
     * or the stage right after an allowed stage (it receives the handed-off pieces).
     */
    public static function requireStageChangesAllowed(array $oldStages, array $newStages): void {
        $eff = self::current();
        if ($eff['is_admin'] || $eff['stages'] === 'ALL') return;
        $keys = array_keys(self::stageMap());
        $changed = [];
        foreach (array_unique(array_merge(array_keys($oldStages), array_keys($newStages))) as $k) {
            if (json_encode($oldStages[$k] ?? null) !== json_encode($newStages[$k] ?? null)) $changed[] = $k;
        }
        foreach ($changed as $k) {
            if (self::canStageKey($k)) continue;
            $idx = array_search($k, $keys, true);
            if ($idx !== false && $idx > 0 && self::canStageKey($keys[$idx - 1])) continue;
            Response::error("Access denied for stage '{$k}'. You can only work on your assigned stages.", ['stage' => $k], 403);
        }
    }

    /**
     * How many pieces in a batch's tracking were moved forward beyond what the previous stage
     * actually released (received - rejected), ignoring reworked pieces returned to a stage.
     */
    public static function overflowPieces(array $stages): float {
        $keys = array_keys(self::stageMap());
        $over = 0.0;
        for ($i = 1; $i < count($keys); $i++) {
            $prev = $stages[$keys[$i - 1]] ?? null;
            $cur = $stages[$keys[$i]] ?? null;
            if (!$prev || !$cur) continue;
            $released = (float)($prev['prod_qty'] ?? 0) - (float)($prev['rejection'] ?? 0);
            $received = (float)($cur['prod_qty'] ?? 0) - (float)($cur['rework_in'] ?? 0);
            $over += max(0.0, $received - max(0.0, $released));
        }
        return round($over, 3);
    }

    /**
     * Route-level guard. Each entry: route => [method|'*' => [any-of permission keys]].
     * Routes not listed only require a valid login (shared lookups such as item masters).
     */
    public static function guard(string $route, string $method): void {
        $rules = [
            'dashboard'                    => ['GET' => ['dashboard.view']],
            'stock'                        => ['GET' => ['inventory.view', 'rejections.view']],
            'stock/ledger'                 => ['GET' => ['inventory.view']],
            'stock/ims-master'             => ['GET' => ['inventory.view']],
            'stock/transfers'              => ['GET' => ['inventory.view']],
            'stock/adjust'                 => ['*' => ['inventory.adjust']],
            'stock/transfer'               => ['*' => ['inventory.transfer']],
            'stock/opening'                => ['*' => ['inventory.opening']],
            'stock/bulk-import'            => ['*' => ['inventory.bulk']],
            'stock/record-snapshot'        => ['*' => ['inventory.adjust']],
            'purchase'                     => ['GET' => ['in_out.view'], 'POST' => ['in_out.purchase']],
            'purchase/upload-preview'      => ['*' => ['in_out.tally_import']],
            'purchase/confirm-import'      => ['*' => ['in_out.tally_import']],
            'purchase/batches'             => ['*' => ['in_out.view']],
            'purchase/reverse-batch'       => ['*' => ['in_out.tally_import']],
            'sales'                        => ['GET' => ['in_out.view'], 'POST' => ['in_out.sale']],
            'sales/upload-preview'         => ['*' => ['in_out.tally_import']],
            'sales/confirm-import'         => ['*' => ['in_out.tally_import']],
            'sales/batches'                => ['*' => ['in_out.view']],
            'sales/reverse-batch'          => ['*' => ['in_out.tally_import']],
            'in-out'                       => ['*' => ['in_out.view']],
            'in-out/items'                 => ['*' => ['in_out.view']],
            'in-out/parties'               => ['GET' => ['in_out.view'], 'POST' => ['in_out.parties', 'in_out.purchase', 'in_out.sale']],
            'in-out/batch-save'            => ['*' => ['in_out.purchase', 'in_out.sale']],
            'planning'                     => ['GET' => ['planning.view'], 'POST' => ['planning.edit']],
            'planning/stats'               => ['*' => ['planning.view', 'sku_tracking.view']],
            'planning/show'                => ['*' => ['planning.view', 'sku_tracking.view']],
            'planning/releases'            => ['*' => ['planning.view', 'sku_tracking.view']],
            'planning/approve'             => ['*' => ['planning.approve']],
            'planning/release'             => ['*' => ['planning.release']],
            'planning/update'              => ['*' => ['planning.edit']],
            'planning/cancel'              => ['*' => ['planning.edit']],
            'planning/update-stages'       => ['*' => ['sku_tracking.handoff', 'sku_tracking.edit']],
            'bom'                          => ['GET' => ['sku_bom.view', 'planning.view', 'sku_tracking.view'], 'POST' => ['sku_bom.edit']],
            'bom/all-items'                => ['*' => ['sku_bom.view', 'planning.view']],
            'bom/show'                     => ['*' => ['sku_bom.view', 'planning.view', 'sku_tracking.view']],
            'bom/batch-save-grid'          => ['*' => ['sku_bom.edit']],
            'bom/update'                   => ['*' => ['sku_bom.edit']],
            'bom/create-version'           => ['*' => ['sku_bom.edit']],
            'production/kitting-preview'   => ['*' => ['sku_tracking.view', 'planning.view']],
            'production/issue-kitting'     => ['*' => ['sku_tracking.kitting']],
            'production/complete-batch-to-fg' => ['*' => ['sku_tracking.handoff']],
            'production/log-rejection'     => ['*' => ['sku_tracking.handoff']],
            'production/start-stage'       => ['*' => ['sku_tracking.handoff']],
            'production/pause-stage'       => ['*' => ['sku_tracking.handoff']],
            'production/resume-stage'      => ['*' => ['sku_tracking.handoff']],
            'production/complete-stage'    => ['*' => ['sku_tracking.handoff']],
            'production/orders'            => ['GET' => ['planning.view', 'sku_tracking.view'], 'POST' => ['planning.edit']],
            'production/approve'           => ['*' => ['planning.approve']],
            'processes'                    => ['POST' => ['production_process.edit']],
            'processes/update'             => ['*' => ['production_process.edit']],
            'processes/product-route'      => ['POST' => ['production_process.edit']],
            'processes/delete'             => ['*' => ['production_process.edit']],
            'processes/batch-save-flow'    => ['*' => ['production_process.edit']],
            'rejections/routes'            => ['GET' => ['rejections.view', 'production_process.view', 'sku_tracking.handoff'], 'POST' => ['production_process.edit']],
            'rejections/lots'              => ['GET' => ['rejections.view'], 'POST' => ['sku_tracking.handoff']],
            'rejections/lots/advance'      => ['*' => ['rejections.process']],
            'rejections/lots/cancel'       => ['*' => ['rejections.cancel']],
            'rejections/lots/decide'       => ['*' => ['rejections.process']],
            'raw-materials'                => ['POST' => ['masters.edit']],
            'raw-materials/update'         => ['*' => ['masters.edit']],
            'raw-materials/delete'         => ['*' => ['masters.edit']],
            'raw-materials/restore'        => ['*' => ['masters.edit']],
            'raw-materials/bulk-import'    => ['*' => ['masters.edit']],
            'finished-goods'               => ['POST' => ['masters.edit']],
            'finished-goods/update'        => ['*' => ['masters.edit']],
            'finished-goods/delete'        => ['*' => ['masters.edit']],
            'finished-goods/restore'       => ['*' => ['masters.edit']],
            'finished-goods/bulk-import'   => ['*' => ['masters.edit']],
            'sub-skus'                     => ['POST' => ['masters.edit'], 'DELETE' => ['masters.edit']],
            'sub-skus/delete'              => ['*' => ['masters.edit']],
            'sub-skus/bulk-import'         => ['*' => ['masters.edit']],
            'sub-child-parts'              => ['POST' => ['masters.edit'], 'DELETE' => ['masters.edit']],
            'sub-child-parts/delete'       => ['*' => ['masters.edit']],
            'mappings'                     => ['GET' => ['in_out.view'], 'POST' => ['in_out.tally_import'], 'DELETE' => ['in_out.tally_import']],
            'reports/stage-efficiency'     => ['*' => ['reports.view']],
            'reports/sku-traceability'     => ['*' => ['reports.view']],
            'reports/stock-valuation'      => ['*' => ['reports.view']],
            'settings/categories'          => ['POST' => ['masters.edit']],
            'settings/units'               => ['POST' => ['masters.edit']],
            'settings/rejection-reasons'   => ['POST' => ['masters.edit']],
            'settings/warehouses'          => ['POST' => ['masters.edit'], 'DELETE' => ['masters.edit']],
            'settings/delete-warehouse'    => ['*' => ['masters.edit']],
            'settings/company'             => ['POST' => ['settings.company']],
            'settings/users'               => ['*' => ['settings.users']],
            'settings/roles'               => ['POST' => ['settings.users'], 'DELETE' => ['settings.users']],
            'settings/delete-role'         => ['*' => ['settings.users']],
            'settings/audit-logs'          => ['*' => ['settings.audit']],
            'settings/factory-reset'       => ['*' => ['settings.users']],
        ];
        if (!isset($rules[$route])) return;
        $rule = $rules[$route];
        $need = $rule[$method] ?? ($rule['*'] ?? null);
        if ($need === null) return;
        Auth::requireAuth();
        self::requireAny($need);
    }
}
