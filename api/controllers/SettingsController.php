<?php
// ============================================================
// BHARAT IMPEX — SETTINGS & SYSTEM MASTERS CONTROLLER
// ============================================================

class SettingsController {

    /**
     * Get all reference masters in one bundle for rapid frontend caching
     */
    public static function bundle(): void {
        Auth::requireAuth();
        $db = Database::getConnection();

        $categories = $db->query("SELECT * FROM categories WHERE active = 1 ORDER BY category_name ASC")->fetchAll();
        $units = $db->query("SELECT * FROM units WHERE active = 1 ORDER BY id ASC")->fetchAll();
        $warehouses = $db->query("SELECT * FROM warehouses WHERE active = 1 ORDER BY id ASC")->fetchAll();
        $reasons = $db->query("SELECT * FROM rejection_reasons WHERE active = 1 ORDER BY category ASC, reason_name ASC")->fetchAll();
        $scrapMaterials = $db->query("SELECT sm.*, u.unit_code FROM scrap_materials sm JOIN units u ON sm.unit_id = u.id WHERE sm.active = 1")->fetchAll();
        $company = $db->query("SELECT * FROM company_settings WHERE id = 1")->fetch();
        $processes = $db->query("SELECT * FROM processes WHERE active = 1 ORDER BY sequence ASC, id ASC")->fetchAll();

        Response::success([
            'categories'       => $categories,
            'units'            => $units,
            'warehouses'       => $warehouses,
            'rejection_reasons'=> $reasons,
            'scrap_materials'  => $scrapMaterials,
            'company'          => $company,
            'processes'        => $processes
        ]);
    }

    // Categories CRUD
    public static function categories(): void {
        Auth::requireAuth();
        $db = Database::getConnection();
        $cats = $db->query("SELECT * FROM categories ORDER BY id ASC")->fetchAll();
        Response::success($cats);
    }

    public static function saveCategory(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $id = (int)($input['id'] ?? 0);
        $name = trim($input['category_name'] ?? '');
        $code = strtoupper(trim($input['category_code'] ?? ''));
        $type = $input['category_type'] ?? 'BOTH';
        $desc = trim($input['description'] ?? '');

        if (empty($name)) {
            Response::error('Category name is required.', null, 400);
        }

        if (empty($code)) {
            $code = 'CAT-' . strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $name), 0, 8));
        }

        $db = Database::getConnection();
        if ($id) {
            $db->prepare("UPDATE categories SET category_name = ?, category_type = ?, description = ?, updated_at = NOW() WHERE id = ?")
               ->execute([$name, $type, $desc, $id]);
        } else {
            $db->prepare("INSERT INTO categories (category_name, category_code, category_type, description, active, created_at) VALUES (?, ?, ?, ?, 1, NOW())")
               ->execute([$name, $code, $type, $desc]);
        }

        Response::success(null, 'Category saved successfully.');
    }

    // Units CRUD
    public static function units(): void {
        Auth::requireAuth();
        $db = Database::getConnection();
        $units = $db->query("SELECT * FROM units ORDER BY id ASC")->fetchAll();
        Response::success($units);
    }

    public static function saveUnit(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $id = (int)($input['id'] ?? 0);
        $code = strtoupper(trim($input['unit_code'] ?? ''));
        $name = trim($input['unit_name'] ?? '');
        $dec = isset($input['decimal_allowed']) ? (int)$input['decimal_allowed'] : 1;

        if (empty($code) || empty($name)) {
            Response::error('Unit code and name are required.', null, 400);
        }

        $db = Database::getConnection();
        if ($id) {
            $db->prepare("UPDATE units SET unit_code = ?, unit_name = ?, decimal_allowed = ?, updated_at = NOW() WHERE id = ?")
               ->execute([$code, $name, $dec, $id]);
        } else {
            $db->prepare("INSERT INTO units (unit_code, unit_name, decimal_allowed, active, created_at) VALUES (?, ?, ?, 1, NOW())")
               ->execute([$code, $name, $dec]);
        }

        Response::success(null, 'Unit saved successfully.');
    }

    // Rejection Reasons CRUD
    public static function rejectionReasons(): void {
        Auth::requireAuth();
        $db = Database::getConnection();
        $reasons = $db->query("SELECT * FROM rejection_reasons ORDER BY id ASC")->fetchAll();
        Response::success($reasons);
    }

    public static function saveRejectionReason(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $id = (int)($input['id'] ?? 0);
        $name = trim($input['reason_name'] ?? '');
        $category = strtoupper(trim($input['category'] ?? 'GENERAL'));
        $desc = trim($input['description'] ?? '');

        if (empty($name)) {
            Response::error('Reason name is required.', null, 400);
        }

        $code = 'REJ-' . strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $name), 0, 8));

        $db = Database::getConnection();
        if ($id) {
            $db->prepare("UPDATE rejection_reasons SET reason_name = ?, category = ?, description = ?, updated_at = NOW() WHERE id = ?")
               ->execute([$name, $category, $desc, $id]);
        } else {
            $db->prepare("INSERT INTO rejection_reasons (reason_code, reason_name, category, description, active, created_at) VALUES (?, ?, ?, ?, 1, NOW())")
               ->execute([$code, $name, $category, $desc]);
        }

        Response::success(null, 'Rejection reason saved successfully.');
    }

    // Warehouses CRUD
    public static function warehouses(): void {
        Auth::requireAuth();
        $db = Database::getConnection();
        $stmt = $db->query("
            SELECT w.*, 
                   (SELECT COUNT(*) FROM stock s WHERE s.warehouse_id = w.id AND s.quantity > 0) as active_item_count,
                   (SELECT COALESCE(SUM(s.quantity), 0) FROM stock s WHERE s.warehouse_id = w.id) as total_stock_qty
            FROM warehouses w 
            WHERE w.active = 1 
            ORDER BY w.is_default DESC, w.id ASC
        ");
        $wh = $stmt->fetchAll();
        Response::success($wh);
    }

    public static function saveWarehouse(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $id = (int)($input['id'] ?? 0);
        $name = trim($input['warehouse_name'] ?? '');
        $code = strtoupper(trim($input['warehouse_code'] ?? ''));
        $location = trim($input['location'] ?? '');
        $contact = trim($input['contact_person'] ?? '');
        $phone = trim($input['phone'] ?? '');

        if (empty($name)) {
            Response::error('Warehouse name is required.', null, 400);
        }

        if (empty($code)) {
            $code = 'WH-' . strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $name), 0, 6));
        }

        $db = Database::getConnection();

        // Check unique code
        if ($id) {
            $chk = $db->prepare("SELECT id FROM warehouses WHERE warehouse_code = ? AND id != ?");
            $chk->execute([$code, $id]);
        } else {
            $chk = $db->prepare("SELECT id FROM warehouses WHERE warehouse_code = ?");
            $chk->execute([$code]);
        }
        if ($chk->fetch()) {
            Response::error("Warehouse code '{$code}' already exists. Please choose a unique code.", null, 400);
        }

        if ($id) {
            $db->prepare("UPDATE warehouses SET warehouse_code = ?, warehouse_name = ?, location = ?, contact_person = ?, phone = ?, updated_at = NOW() WHERE id = ?")
               ->execute([$code, $name, $location, $contact, $phone, $id]);
        } else {
            $db->prepare("INSERT INTO warehouses (warehouse_code, warehouse_name, location, contact_person, phone, active, created_at) VALUES (?, ?, ?, ?, ?, 1, NOW())")
               ->execute([$code, $name, $location, $contact, $phone]);
        }

        Response::success(null, 'Warehouse saved successfully.');
    }

    public static function deleteWarehouse(): void {
        Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $id = (int)($input['id'] ?? ($_GET['id'] ?? 0));

        if (!$id) {
            Response::error('Warehouse ID is required.', null, 400);
        }

        $db = Database::getConnection();

        $stmt = $db->prepare("SELECT * FROM warehouses WHERE id = ?");
        $stmt->execute([$id]);
        $wh = $stmt->fetch();

        if (!$wh) {
            Response::error('Warehouse not found.', null, 404);
        }

        if (!empty($wh['is_default'])) {
            Response::error('The default primary warehouse cannot be deleted.', null, 400);
        }

        // Check if active stock exists in this warehouse
        $stockCheck = $db->prepare("SELECT COUNT(*) FROM stock WHERE warehouse_id = ? AND quantity > 0");
        $stockCheck->execute([$id]);
        $activeStockCount = (int)$stockCheck->fetchColumn();

        if ($activeStockCount > 0) {
            Response::error("Cannot delete warehouse '{$wh['warehouse_name']}' because it currently holds active stock for {$activeStockCount} item(s). Please transfer or adjust stock out first.", null, 400);
        }

        // Soft delete / deactivate
        $db->prepare("UPDATE warehouses SET active = 0, updated_at = NOW() WHERE id = ?")->execute([$id]);

        Response::success(null, "Warehouse '{$wh['warehouse_name']}' deleted successfully.");
    }

    // Company Settings
    public static function getCompany(): void {
        Auth::requireAuth();
        $db = Database::getConnection();
        $company = $db->query("SELECT * FROM company_settings WHERE id = 1")->fetch();
        Response::success($company);
    }

    public static function saveCompany(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $name = trim($input['company_name'] ?? 'Bharat Impex');
        $address = trim($input['address'] ?? '');
        $phone = trim($input['phone'] ?? '');
        $email = trim($input['email'] ?? '');
        $gstin = trim($input['gstin'] ?? '');
        $allowNegative = !empty($input['allow_negative_stock']) ? 1 : 0;

        $db = Database::getConnection();
        $stmt = $db->prepare("
            UPDATE company_settings 
            SET company_name = ?, address = ?, phone = ?, email = ?, gstin = ?,
                allow_negative_stock = ?, updated_at = NOW()
            WHERE id = 1
        ");
        $stmt->execute([$name, $address, $phone, $email, $gstin, $allowNegative]);

        Response::success(null, 'Company settings updated successfully.');
    }

    // Users & Roles
    public static function users(): void {
        Auth::requireAuth();
        PermissionService::ensureSchema();
        $db = Database::getConnection();
        $users = $db->query("
            SELECT u.id, u.username, u.email, u.full_name, u.phone, u.role_id, u.active, u.last_login_at, u.created_at,
                   u.stage_access, r.role_code, r.role_name
            FROM users u
            JOIN roles r ON u.role_id = r.id
            ORDER BY u.id ASC
        ")->fetchAll();
        foreach ($users as &$u) {
            $list = $u['stage_access'] !== null && $u['stage_access'] !== '' ? json_decode($u['stage_access'], true) : null;
            $u['stage_access'] = is_array($list) ? $list : null;
        }
        unset($u);
        Response::success($users);
    }

    private static function isAdminRole(PDO $db, int $roleId): bool {
        $stmt = $db->prepare("SELECT role_code, role_name, permissions FROM roles WHERE id = ?");
        $stmt->execute([$roleId]);
        $r = $stmt->fetch();
        return $r ? PermissionService::isAdminUser($r) : false;
    }

    public static function saveUser(): void {
        $user = Auth::requireAuth();
        PermissionService::ensureSchema();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $id = (int)($input['id'] ?? 0);
        $username = trim($input['username'] ?? '');
        $email = trim($input['email'] ?? '');
        $fullName = trim($input['full_name'] ?? '');
        $phone = trim($input['phone'] ?? '');
        $roleId = (int)($input['role_id'] ?? 2);
        $password = $input['password'] ?? '';
        $active = isset($input['active']) ? (int)$input['active'] : 1;

        // Personal stage list: null = follow the role, ['ALL'] = every stage, [ids] = only those stages
        $stageAccess = null;
        if (array_key_exists('stage_access', $input) && is_array($input['stage_access'])) {
            $sa = $input['stage_access'];
            $stageAccess = in_array('ALL', $sa, true)
                ? json_encode(['ALL'])
                : json_encode(array_values(array_unique(array_map('intval', $sa))));
        }

        if (empty($username) || empty($email) || empty($fullName)) {
            Response::error('Username, Email and Full Name are required.', null, 400);
        }

        $db = Database::getConnection();

        $roleChk = $db->prepare("SELECT id FROM roles WHERE id = ?");
        $roleChk->execute([$roleId]);
        if (!$roleChk->fetch()) Response::error('Selected role does not exist.', null, 400);

        $dup = $db->prepare("SELECT id FROM users WHERE (username = ? OR email = ?) AND id <> ?");
        $dup->execute([$username, $email, $id]);
        if ($dup->fetch()) Response::error('Another user already has this username or email.', null, 400);

        // Never remove the last active administrator
        if ($id) {
            $cur = $db->prepare("SELECT role_id, active FROM users WHERE id = ?");
            $cur->execute([$id]);
            $before = $cur->fetch();
            if ($before && (int)$before['active'] === 1 && self::isAdminRole($db, (int)$before['role_id'])
                && (!$active || !self::isAdminRole($db, $roleId))) {
                $admins = 0;
                foreach ($db->query("SELECT role_id FROM users WHERE active = 1")->fetchAll() as $row) {
                    if (self::isAdminRole($db, (int)$row['role_id'])) $admins++;
                }
                if ($admins <= 1) Response::error('This is the last active administrator. Make another user admin first.', null, 400);
            }
        }

        if ($id) {
            if (!empty($password)) {
                $hash = Auth::hashPassword($password);
                $stmt = $db->prepare("UPDATE users SET username = ?, email = ?, full_name = ?, phone = ?, role_id = ?, stage_access = ?, active = ?, password_hash = ?, updated_at = NOW() WHERE id = ?");
                $stmt->execute([$username, $email, $fullName, $phone, $roleId, $stageAccess, $active, $hash, $id]);
            } else {
                $stmt = $db->prepare("UPDATE users SET username = ?, email = ?, full_name = ?, phone = ?, role_id = ?, stage_access = ?, active = ?, updated_at = NOW() WHERE id = ?");
                $stmt->execute([$username, $email, $fullName, $phone, $roleId, $stageAccess, $active, $id]);
            }
        } else {
            if (empty($password)) {
                $password = 'welcome123';
            }
            $hash = Auth::hashPassword($password);
            $stmt = $db->prepare("INSERT INTO users (username, email, password_hash, full_name, phone, role_id, stage_access, active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())");
            $stmt->execute([$username, $email, $hash, $fullName, $phone, $roleId, $stageAccess, $active]);
        }

        AuditService::log($id ? 'USER_UPDATED' : 'USER_CREATED', 'SETTINGS', $username, null, ['role_id' => $roleId, 'stage_access' => $stageAccess, 'by' => $user['username'] ?? null]);
        Response::success(null, 'User saved successfully.');
    }

    public static function roles(): void {
        Auth::requireAuth();
        $db = Database::getConnection();
        $roles = $db->query("
            SELECT r.*, (SELECT COUNT(*) FROM users u WHERE u.role_id = r.id) AS user_count
            FROM roles r ORDER BY r.id ASC
        ")->fetchAll();
        foreach ($roles as &$r) {
            $raw = json_decode($r['permissions'] ?? '[]', true) ?: [];
            $eff = PermissionService::effective($r);
            $r['permissions'] = $raw;
            $r['is_admin'] = $eff['is_admin'];
            // Expanded keys so legacy roles show ticked boxes in the editor
            $r['effective_permissions'] = $eff['permissions'];
            $r['effective_stages'] = $eff['stages'];
        }
        unset($r);
        Response::success($roles);
    }

    /** Catalog of modules/actions plus the production stages that can be assigned. */
    public static function permissionCatalog(): void {
        Auth::requireAuth();
        $db = Database::getConnection();
        $stages = [];
        foreach ($db->query("SELECT id, process_code, process_name FROM processes WHERE active = 1 ORDER BY sequence ASC, id ASC")->fetchAll() as $p) {
            $stages[] = ['id' => (int)$p['id'], 'key' => PermissionService::stageKeyFor($p), 'name' => $p['process_name']];
        }
        Response::success(['modules' => PermissionService::catalog(), 'stages' => $stages]);
    }

    /** POST settings/roles {id?, role_code, role_name, description, permissions: [...keys], stages: 'ALL' | [ids]} */
    public static function saveRole(): void {
        $user = Auth::requireAuth();
        $db = Database::getConnection();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $id = (int)($input['id'] ?? 0);
        $name = trim((string)($input['role_name'] ?? ''));
        $code = strtoupper(preg_replace('/[^A-Za-z0-9_]+/', '_', trim((string)($input['role_code'] ?? ''))));
        $desc = trim((string)($input['description'] ?? ''));
        if ($name === '') Response::error('Role name is required.', null, 400);
        if ($code === '') $code = strtoupper(preg_replace('/[^A-Za-z0-9]+/', '_', $name));

        if ($id) {
            $cur = $db->prepare("SELECT * FROM roles WHERE id = ?");
            $cur->execute([$id]);
            $existing = $cur->fetch();
            if (!$existing) Response::error('Role not found.', null, 404);
            if (PermissionService::isAdminUser($existing)) {
                Response::error('The administrator role always has full access and cannot be changed.', null, 400);
            }
        }

        $valid = array_flip(PermissionService::allKeys());
        $perms = [];
        foreach (($input['permissions'] ?? []) as $k) {
            if (isset($valid[$k])) $perms[] = $k;
        }
        // Ticking any action implies View for that module
        foreach ($perms as $k) {
            [$mod] = explode('.', $k, 2);
            if (isset($valid["{$mod}.view"]) && !in_array("{$mod}.view", $perms, true)) $perms[] = "{$mod}.view";
        }
        $stages = $input['stages'] ?? 'ALL';
        if ($stages === 'ALL' || (is_array($stages) && in_array('ALL', $stages, true))) {
            $perms[] = 'sku_tracking.stage.all';
        } elseif (is_array($stages)) {
            foreach (array_unique(array_map('intval', $stages)) as $sid) {
                if ($sid > 0) $perms[] = "sku_tracking.stage.{$sid}";
            }
        }
        $perms = array_values(array_unique($perms));

        $dup = $db->prepare("SELECT id FROM roles WHERE role_code = ? AND id <> ?");
        $dup->execute([$code, $id]);
        if ($dup->fetch()) Response::error("Role code {$code} already exists.", null, 400);

        $json = json_encode($perms);
        if ($id) {
            $db->prepare("UPDATE roles SET role_code = ?, role_name = ?, description = ?, permissions = ? WHERE id = ?")
               ->execute([$code, $name, $desc, $json, $id]);
        } else {
            $db->prepare("INSERT INTO roles (role_code, role_name, description, permissions) VALUES (?, ?, ?, ?)")
               ->execute([$code, $name, $desc, $json]);
            $id = (int)$db->lastInsertId();
        }
        AuditService::log('ROLE_SAVED', 'SETTINGS', $code, null, ['permissions' => $perms, 'by' => $user['username'] ?? null]);
        Response::success(['id' => $id], 'Role saved. Users with this role get the new access on their next page load.');
    }

    public static function deleteRole(): void {
        Auth::requireAuth();
        $db = Database::getConnection();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $id = (int)($input['id'] ?? ($_GET['id'] ?? 0));
        $cur = $db->prepare("SELECT * FROM roles WHERE id = ?");
        $cur->execute([$id]);
        $role = $cur->fetch();
        if (!$role) Response::error('Role not found.', null, 404);
        if (PermissionService::isAdminUser($role)) Response::error('The administrator role cannot be deleted.', null, 400);
        $cnt = $db->prepare("SELECT COUNT(*) FROM users WHERE role_id = ?");
        $cnt->execute([$id]);
        if ((int)$cnt->fetchColumn() > 0) Response::error('Move the users of this role to another role before deleting it.', null, 400);
        $db->prepare("DELETE FROM roles WHERE id = ?")->execute([$id]);
        AuditService::log('ROLE_DELETED', 'SETTINGS', $role['role_code'], null, null);
        Response::success(null, 'Role deleted.');
    }

    /**
     * POST settings/factory-reset {confirm: "DELETE ALL DATA", password}
     * Empties every table except the signed-in admin's account, the company profile, roles and units.
     * Admin only; requires the typed phrase and the admin's real password (no shortcuts). Irreversible.
     */
    public static function factoryReset(): void {
        $user = Auth::requireAuth();
        $eff = PermissionService::current();
        if (!$eff['is_admin']) Response::error('Only an administrator can reset the system.', null, 403);

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        if (trim((string)($input['confirm'] ?? '')) !== 'DELETE ALL DATA') {
            Response::error('Type DELETE ALL DATA exactly to confirm.', null, 400);
        }
        $db = Database::getConnection();
        $hashStmt = $db->prepare("SELECT password_hash FROM users WHERE id = ?");
        $hashStmt->execute([$user['id']]);
        if (!Auth::verifyPassword((string)($input['password'] ?? ''), (string)$hashStmt->fetchColumn())) {
            Response::error('Password is incorrect.', null, 403);
        }

        $keep = ['users', 'roles', 'units', 'company_settings'];
        $tables = $db->query("
            SELECT TABLE_NAME FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
        ")->fetchAll(PDO::FETCH_COLUMN);

        $cleared = [];
        try {
            $db->exec("SET FOREIGN_KEY_CHECKS = 0");
            foreach ($tables as $t) {
                if (in_array($t, $keep, true)) continue;
                $db->exec("TRUNCATE TABLE `" . str_replace('`', '', $t) . "`");
                $cleared[] = $t;
            }
            $db->prepare("DELETE FROM users WHERE id <> ?")->execute([$user['id']]);
            $db->prepare("UPDATE users SET stage_access = NULL WHERE id = ?")->execute([$user['id']]);
            $db->exec("SET FOREIGN_KEY_CHECKS = 1");
        } catch (Exception $e) {
            $db->exec("SET FOREIGN_KEY_CHECKS = 1");
            Response::error('Reset stopped part-way: ' . $e->getMessage(), ['cleared' => $cleared], 500);
        }

        AuditService::log('FACTORY_RESET', 'SETTINGS', null, null, ['tables_cleared' => count($cleared)]);
        Response::success(['tables_cleared' => $cleared], 'All data cleared. Only your admin account, company profile, roles and units remain.');
    }

    public static function auditLogs(): void {
        Auth::requireAuth();
        $db = Database::getConnection();
        $limit = min(500, max(10, (int)($_GET['limit'] ?? 100)));
        $module = $_GET['module'] ?? null;

        $sql = "SELECT * FROM audit_logs WHERE 1=1";
        $params = [];
        if ($module) {
            $sql .= " AND module = ?";
            $params[] = $module;
        }
        $sql .= " ORDER BY id DESC LIMIT {$limit}";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $logs = $stmt->fetchAll();

        Response::success($logs);
    }
}
