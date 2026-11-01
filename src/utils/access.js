// Which permission opens which screen. Keys match api/services/PermissionService.php
export const TAB_PERMISSION = {
  dashboard: 'dashboard.view',
  planning: 'planning.view',
  sku_tracker: 'sku_tracking.view',
  operator_queue: 'sku_tracking.view',
  inventory: 'inventory.view',
  in_out: 'in_out.view',
  purchase: 'in_out.view',
  sales: 'in_out.view',
  production: 'planning.view',
  sku_bom: 'sku_bom.view',
  rejections: 'rejections.view',
  production_process: 'production_process.view',
  processes: 'production_process.view',
  reports: 'reports.view',
};

export const SETTINGS_SUB_PERMISSION = {
  raw_materials: 'masters.view',
  sub_child_parts: 'masters.view',
  finished_goods: 'masters.view',
  warehouses: 'masters.view',
  sub_skus: 'masters.view',
  categories: 'masters.view',
  units: 'masters.view',
  users: 'settings.users',
  company: 'settings.company',
  audit: 'settings.audit',
};

// Order used to pick a landing screen for a user
export const TAB_PRIORITY = [
  'sku_tracker', 'dashboard', 'planning', 'inventory', 'in_out', 'rejections',
  'sku_bom', 'production_process', 'reports', 'settings',
];

export function canSettingsSub(subId, hasPermission) {
  const perm = SETTINGS_SUB_PERMISSION[subId];
  return perm ? hasPermission(perm) : hasPermission('masters.view');
}

export function canOpenTab(tab, hasPermission) {
  if (tab === 'settings') {
    return Object.keys(SETTINGS_SUB_PERMISSION).some((s) => canSettingsSub(s, hasPermission));
  }
  const perm = TAB_PERMISSION[tab];
  return perm ? hasPermission(perm) : true;
}

export function firstAllowedTab(hasPermission) {
  return TAB_PRIORITY.find((t) => canOpenTab(t, hasPermission)) || null;
}

export function firstAllowedSettingsSub(hasPermission) {
  return Object.keys(SETTINGS_SUB_PERMISSION).find((s) => canSettingsSub(s, hasPermission)) || null;
}
