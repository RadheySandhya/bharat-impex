// ============================================================
// BHARAT IMPEX — API CLIENT SERVICE
// ============================================================

// Dynamically determine API base URL based on runtime environment
const getApiBase = () => {
  if (typeof window === 'undefined') return '/api';
  
  // If running on Vite dev server
  if (window.location.port === '5173' || window.location.port === '3000') {
    return '/api';
  }
  
  // If running in Apache subdirectory (e.g., /bharat%20impex%20stock%20project/ or similar)
  const pathname = window.location.pathname;
  const match = pathname.match(/^(\/[^/]*bharat[^/]*)/i);
  if (match) {
    return `${match[1].replace(/\/+$/, '')}/api`;
  }
  
  return './api';
};

const API_BASE = getApiBase();


// Helper to make API calls with JWT authorization
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('bharat_impex_token');
  
  const headers = {
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If body is not FormData, default to application/json
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // Try relative endpoint first, then fallback to full path if running without Vite proxy
  const url = `${API_BASE}${cleanEndpoint}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      if (res.status === 401 && !cleanEndpoint.includes('/auth/login')) {
        localStorage.removeItem('bharat_impex_token');
        localStorage.removeItem('bharat_impex_user');
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
      throw new Error(data?.message || `HTTP Error ${res.status}: ${res.statusText}`);
    }

    return data;
  } catch (err) {
    console.error(`API Request Error [${endpoint}]:`, err);
    throw err;
  }
}

export const api = {
  // Auth
  auth: {
    login: (username, password) => request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
    me: () => request('/auth/me'),
  },

  // Dashboard
  dashboard: {
    get: (range = 'THIS_MONTH') => request(`/dashboard?range=${encodeURIComponent(range)}`),
  },

  // Stock & Inventory
  stock: {
    getAll: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/stock?${q}`);
    },
    getLedger: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/stock/ledger?${q}`);
    },
    adjust: (data) => request('/stock/adjust', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    transfer: (data) => request('/stock/transfer', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    opening: (data) => request('/stock/opening', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    bulkImport: (itemsOrFormData) => {
      if (itemsOrFormData instanceof FormData) {
        return request('/stock/bulk-import', {
          method: 'POST',
          body: itemsOrFormData,
        });
      }
      return request('/stock/bulk-import', {
        method: 'POST',
        body: JSON.stringify({ items: itemsOrFormData }),
      });
    },
    getImsMaster: (params = {}) => {
      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '' && v !== 'undefined')
      );
      const q = new URLSearchParams(cleanParams).toString();
      return request(`/stock/ims-master?${q}`);
    },
    recordSnapshot: (snapshotDate) => request('/stock/record-snapshot', {
      method: 'POST',
      body: JSON.stringify({ snapshot_date: snapshotDate }),
    }),
  },

  // Purchase
  purchase: {
    getAll: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/purchase?${q}`);
    },
    uploadPreview: (file) => {
      const formData = new FormData();
      formData.append('file', file);
      return request('/purchase/upload-preview', {
        method: 'POST',
        body: formData,
      });
    },
    confirmImport: (batchData, warehouseId = 1) => request('/purchase/confirm-import', {
      method: 'POST',
      body: JSON.stringify({ batch_data: batchData, warehouse_id: warehouseId }),
    }),
    createDirect: (data) => request('/purchase', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    getBatches: () => request('/purchase/batches'),
  },

  // In / Out (Unified Purchase & Sales Spreadsheet)
  inOut: {
    getAll: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/in-out?${q}`);
    },
    getParties: (type = 'ALL') => request(`/in-out/parties?type=${encodeURIComponent(type)}`),
    saveParty: (data) => request('/in-out/parties', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    getItems: () => request('/in-out/items'),
    batchSave: (rows) => request('/in-out/batch-save', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    }),
  },

  // Sales
  sales: {
    getAll: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/sales?${q}`);
    },
    uploadPreview: (file) => {
      const formData = new FormData();
      formData.append('file', file);
      return request('/sales/upload-preview', {
        method: 'POST',
        body: formData,
      });
    },
    confirmImport: (batchData, warehouseId = 3) => request('/sales/confirm-import', {
      method: 'POST',
      body: JSON.stringify({ batch_data: batchData, warehouse_id: warehouseId }),
    }),
    createDirect: (data) => request('/sales', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    getBatches: () => request('/sales/batches'),
    reverseBatch: (batchId) => request('/sales/reverse-batch', {
      method: 'POST',
      body: JSON.stringify({ batch_id: batchId }),
    }),
  },

  // Production
  production: {
    getOrders: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/production/orders?${q}`);
    },
    getOrder: (id) => request(`/production/order?id=${id}`),
    calculate: (bomId, quantity, warehouseId = 1) => request(`/production/calculate?bom_id=${bomId}&quantity=${quantity}&warehouse_id=${warehouseId}`),
    createOrder: (data) => request('/production/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    approve: (orderId) => request('/production/approve', {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId }),
    }),
    startStage: (stageId, operatorId) => request('/production/start-stage', {
      method: 'POST',
      body: JSON.stringify({ stage_id: stageId, operator_id: operatorId }),
    }),
    pauseStage: (stageId, reason) => request('/production/pause-stage', {
      method: 'POST',
      body: JSON.stringify({ stage_id: stageId, reason }),
    }),
    resumeStage: (stageId) => request('/production/resume-stage', {
      method: 'POST',
      body: JSON.stringify({ stage_id: stageId }),
    }),
    logRejection: (data) => request('/production/log-rejection', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    completeStage: (data) => request('/production/complete-stage', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    completeBatchToFG: (data) => request('/production/complete-batch-to-fg', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    getKittingPreview: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/production/kitting-preview?${q}`);
    },
    issueKitting: (data) => request('/production/issue-kitting', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    getQueue: () => request('/production/queue'),
  },

  // Production Planning
  planning: {
    getAll: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/planning?${q}`);
    },
    getStats: () => request('/planning/stats'),
    get: (id) => request(`/planning/show?id=${id}`),
    create: (data) => request('/planning', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    approve: (planningId) => request('/planning/approve', {
      method: 'POST',
      body: JSON.stringify({ planning_id: planningId }),
    }),
    release: (planningId, releaseQuantity, remarks = '', extra = {}) => request('/planning/release', {
      method: 'POST',
      body: JSON.stringify({ planning_id: planningId, release_quantity: releaseQuantity, remarks, ...extra }),
    }),
    getReleases: (planningId = null) => request(`/planning/releases${planningId ? `?planning_id=${planningId}` : ''}`),
    update: (data) => request('/planning/update', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    cancel: (planningId, reason) => request('/planning/cancel', {
      method: 'POST',
      body: JSON.stringify({ planning_id: planningId, reason }),
    }),
    getPending: () => request('/planning?pending=1'),
  },

  // BOM

  bom: {
    getAll: (fgId = null) => request(`/bom${fgId ? `?fg_id=${fgId}` : ''}`),
    getAllItems: () => request('/bom/all-items'),
    batchSaveGrid: (rows) => request('/bom/batch-save-grid', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    }),
    get: (id) => request(`/bom/show?id=${id}`),
    create: (data) => request('/bom', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (data) => request('/bom/update', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    createVersion: (data) => request('/bom/create-version', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  },

  // Masters: Raw Materials & Finished Goods
  rawMaterials: {
    getAll: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/raw-materials?${q}`);
    },
    create: (data) => request('/raw-materials', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (data) => request('/raw-materials/update', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    delete: (id) => request('/raw-materials/delete', {
      method: 'POST',
      body: JSON.stringify({ id }),
    }),
    restore: (id) => request('/raw-materials/restore', {
      method: 'POST',
      body: JSON.stringify({ id }),
    }),
    bulkImport: (items) => request('/raw-materials/bulk-import', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),
  },

  finishedGoods: {
    getAll: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/finished-goods?${q}`);
    },
    create: (data) => request('/finished-goods', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (data) => request('/finished-goods/update', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    delete: (id) => request('/finished-goods/delete', {
      method: 'POST',
      body: JSON.stringify({ id }),
    }),
    restore: (id) => request('/finished-goods/restore', {
      method: 'POST',
      body: JSON.stringify({ id }),
    }),
    bulkImport: (items) => request('/finished-goods/bulk-import', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),
  },

  // Sub-SKUs & OEM Brand Mappings
  subSkus: {
    getAll: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/sub-skus?${q}`);
    },
    save: (data) => request('/sub-skus', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    delete: (id) => request('/sub-skus/delete', {
      method: 'POST',
      body: JSON.stringify({ id }),
    }),
    bulkImport: (items) => request('/sub-skus/bulk-import', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),
  },

  // Dynamic Processes & Routes
  processes: {
    getAll: () => request('/processes'),
    create: (data) => request('/processes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (data) => request('/processes/update', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    delete: (id) => request('/processes/delete', {
      method: 'POST',
      body: JSON.stringify({ id }),
    }),
    batchSaveFlow: (steps, deletedIds = []) => request('/processes/batch-save-flow', {
      method: 'POST',
      body: JSON.stringify({ steps, deleted_ids: deletedIds }),
    }),
    getProductRoute: (fgId) => request(`/processes/product-route?fg_id=${fgId}`),
    saveProductRoute: (fgId, stages) => request('/processes/product-route', {
      method: 'POST',
      body: JSON.stringify({ fg_id: fgId, stages }),
    }),
  },

  // Tally Item Mappings
  mappings: {
    getAll: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/mappings?${q}`);
    },
    save: (data) => request('/mappings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    delete: (id) => request(`/mappings?id=${id}`, {
      method: 'DELETE',
    }),
  },

  // Reports
  reports: {
    getStageEfficiency: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/reports/stage-efficiency?${q}`);
    },
    getSKUTraceability: (fgId) => request(`/reports/sku-traceability?fg_id=${fgId}`),
    getStockValuation: () => request('/reports/stock-valuation'),
  },

  // Settings & System
  settings: {
    getBundle: () => request('/settings/bundle'),
    saveCategory: (data) => request('/settings/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    saveUnit: (data) => request('/settings/units', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    saveReason: (data) => request('/settings/rejection-reasons', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    getWarehouses: () => request('/settings/warehouses'),
    saveWarehouse: (data) => request('/settings/warehouses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    deleteWarehouse: (id) => request('/settings/delete-warehouse', {
      method: 'POST',
      body: JSON.stringify({ id }),
    }),
    getCompany: () => request('/settings/company'),
    saveCompany: (data) => request('/settings/company', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    getUsers: () => request('/settings/users'),
    saveUser: (data) => request('/settings/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    getRoles: () => request('/settings/roles'),
    getAuditLogs: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/settings/audit-logs?${q}`);
    },
  },
};
