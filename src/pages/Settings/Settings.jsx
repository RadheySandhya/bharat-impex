import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Boxes, 
  Package, 
  FolderTree, 
  Ruler, 
  Warehouse, 
  AlertOctagon, 
  Users, 
  ShieldCheck, 
  Building2, 
  FileText,
  Plus,
  Trash2,
  Check,
  Edit2,
  Upload,
  Download,
  Key,
  Eye,
  EyeOff,
  Tags,
  Search,
  CheckCircle2,
  AlertCircle,
  Archive,
  RotateCcw
} from 'lucide-react';
import { DataTable } from '../../components/UI/DataTable';
import { StatusBadge } from '../../components/UI/StatusBadge';
import { Modal } from '../../components/UI/Modal';
import Icon from '../../components/UI/Icon';
import SearchableSelect from '../../components/UI/SearchableSelect';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { MasterCSVImportModal } from '../../components/UI/MasterCSVImportModal';
import { SubSKUCSVImportModal } from '../../components/UI/SubSKUCSVImportModal';
import { 
  downloadRawMaterialTemplate, 
  downloadFinishedGoodsTemplate,
  downloadSubSKUTemplate 
} from '../../utils/csvTemplates';

export function Settings({ subTab: propSubTab, setSubTab: propSetSubTab }) {
  const [localSubTab, setLocalSubTab] = useState('raw_materials');
  const subTab = propSubTab !== undefined ? propSubTab : localSubTab;
  const setSubTab = propSetSubTab || setLocalSubTab;

  const [loading, setLoading] = useState(false);

  // Data states
  const [rawMaterials, setRawMaterials] = useState([]);
  const [finishedGoods, setFinishedGoods] = useState([]);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [roles, setRoles] = useState([]);
  const [company, setCompany] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);

  // Warehouse Master States
  const [warehouses, setWarehouses] = useState([]);
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [warehouseForm, setWarehouseForm] = useState({
    id: null,
    warehouse_code: '',
    warehouse_name: '',
    location: '',
    is_default: 0,
    is_active: 1
  });

  // Sub-SKU (OEM Brand Mapping) States
  const [subSkus, setSubSkus] = useState([]);
  const [brands, setBrands] = useState([]);
  const [brandFilter, setBrandFilter] = useState('ALL');
  const [subSkuSearch, setSubSkuSearch] = useState('');
  const [isSubSKUModalOpen, setIsSubSKUModalOpen] = useState(false);
  const [isSubSKUCSVModalOpen, setIsSubSKUCSVModalOpen] = useState(false);

  // Modals
  const [isRMModalOpen, setIsRMModalOpen] = useState(false);
  const [isFGModalOpen, setIsFGModalOpen] = useState(false);
  const [isRMCSVModalOpen, setIsRMCSVModalOpen] = useState(false);
  const [isFGCSVModalOpen, setIsFGCSVModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Master View Modes ('active' | 'archived')
  const [rmViewMode, setRMViewMode] = useState('active');
  const [fgViewMode, setFGViewMode] = useState('active');

  // Forms
  const [rmForm, setRMForm] = useState({
    id: null,
    rm_code: '',
    material_name: '',
    unit_id: 1,
    category_id: '',
    standard_rate: 0,
    minimum_stock: 0,
    reorder_level: 0,
    maximum_stock: 0,
    hsn_code: '',
    description: '',
  });

  const [fgForm, setFGForm] = useState({
    id: null,
    fg_code: '',
    product_name: '',
    unit_id: 3,
    category_id: '',
    selling_price: 0,
    minimum_stock: 0,
    reorder_level: 0,
    maximum_stock: 0,
    hsn_code: '',
    description: '',
  });

  const [userForm, setUserForm] = useState({
    id: null,
    username: '',
    full_name: '',
    email: '',
    phone: '',
    role_id: 2,
    password: '',
    active: 1,
  });

  const [subSKUForm, setSubSKUForm] = useState({
    id: null,
    parent_fg_id: '',
    sub_sku_code: '',
    sub_sku_name: '',
    brand_name: 'Somany',
    client_item_code: '',
    selling_price: '',
    description: '',
    active: 1
  });

  const { success, error } = useToast();

  // Load reference categories & units for modals on mount
  useEffect(() => {
    api.settings.getBundle().then((bundle) => {
      if (bundle?.data) {
        setCategories(bundle.data.categories || []);
        setUnits(bundle.data.units || []);
      }
    }).catch(() => {});
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      if (subTab === 'raw_materials') {
        const res = await api.rawMaterials.getAll(rmViewMode === 'archived' ? { archived: 1 } : {});
        if (res?.data) setRawMaterials(res.data);
      } else if (subTab === 'finished_goods') {
        const [fgRes, subRes] = await Promise.all([
          api.finishedGoods.getAll(fgViewMode === 'archived' ? { archived: 1 } : {}),
          api.subSkus.getAll().catch(() => ({ data: { sub_skus: [] } }))
        ]);
        if (fgRes?.data) setFinishedGoods(fgRes.data);
        if (subRes?.data?.sub_skus) setSubSkus(subRes.data.sub_skus);
      } else if (subTab === 'warehouses') {
        const res = await api.settings.getWarehouses();
        if (res?.data) setWarehouses(res.data);
      } else if (subTab === 'sub_skus') {
        const [subRes, fgRes] = await Promise.all([
          api.subSkus.getAll(),
          api.finishedGoods.getAll()
        ]);
        if (subRes?.data) {
          setSubSkus(subRes.data.sub_skus || []);
          setBrands(subRes.data.brands || []);
        }
        if (fgRes?.data) setFinishedGoods(fgRes.data);
      } else if (subTab === 'users') {
        const [usersRes, rolesRes] = await Promise.all([
          api.settings.getUsers(),
          api.settings.getRoles()
        ]);
        if (usersRes?.data) setUsersList(usersRes.data);
        if (rolesRes?.data) setRoles(rolesRes.data);
      } else if (subTab === 'company') {
        const res = await api.settings.getCompany();
        if (res?.data) setCompany(res.data);
      } else if (subTab === 'audit') {
        const res = await api.settings.getAuditLogs();
        if (res?.data) setAuditLogs(res.data);
      }
    } catch (err) {
      error('Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [subTab, rmViewMode, fgViewMode]);

  // Raw Material Form Handlers
  const resetRMForm = () => {
    setRMForm({
      id: null,
      rm_code: '',
      material_name: '',
      unit_id: 1,
      category_id: '',
      standard_rate: 0,
      minimum_stock: 0,
      reorder_level: 0,
      maximum_stock: 0,
      hsn_code: '',
      description: '',
    });
  };

  const handleOpenAddRM = () => {
    resetRMForm();
    setIsRMModalOpen(true);
  };

  const handleOpenEditRM = (rm) => {
    setRMForm({
      id: rm.id,
      rm_code: rm.rm_code,
      material_name: rm.material_name,
      unit_id: rm.unit_id,
      category_id: rm.category_id || '',
      standard_rate: rm.standard_rate || 0,
      minimum_stock: rm.minimum_stock || 0,
      reorder_level: rm.reorder_level || 0,
      maximum_stock: rm.maximum_stock || 0,
      hsn_code: rm.hsn_code || '',
      description: rm.description || '',
    });
    setIsRMModalOpen(true);
  };

  const handleRMSubmit = async (e) => {
    e.preventDefault();
    try {
      if (rmForm.id) {
        await api.rawMaterials.update(rmForm);
        success(`Child part ${rmForm.rm_code} updated successfully.`);
      } else {
        await api.rawMaterials.create(rmForm);
        success('Child part added to master database.');
      }
      setIsRMModalOpen(false);
      resetRMForm();
      loadData();
    } catch (err) {
      error(err.message || 'Failed to save child part.');
    }
  };

  const handleDeleteRM = async (rm) => {
    if (!window.confirm(
      `Delete Child Part "${rm.material_name}" (${rm.rm_code})?\n\n` +
      `• Item will be hidden from frontend Masters, In/Out entry, and Stock & Inventory.\n` +
      `• All historical transactions, purchase orders, and stock balances are preserved in the backend database.`
    )) return;

    try {
      await api.rawMaterials.delete(rm.id);
      success(`Child Part "${rm.material_name}" deleted and archived.`);
      loadData();
    } catch (err) {
      error(err.message || 'Failed to delete child part.');
    }
  };

  const handleRestoreRM = async (id) => {
    try {
      await api.rawMaterials.restore(id);
      success('Child Part restored to active catalog.');
      loadData();
    } catch (err) {
      error(err.message || 'Failed to restore child part.');
    }
  };

  // Finished Goods Form Handlers
  const resetFGForm = () => {
    setFGForm({
      id: null,
      fg_code: '',
      product_name: '',
      unit_id: 3,
      category_id: '',
      selling_price: 0,
      minimum_stock: 0,
      reorder_level: 0,
      maximum_stock: 0,
      hsn_code: '',
      description: '',
    });
  };

  const handleOpenAddFG = () => {
    resetFGForm();
    setIsFGModalOpen(true);
  };

  const handleOpenEditFG = (fg) => {
    setFGForm({
      id: fg.id,
      fg_code: fg.fg_code,
      product_name: fg.product_name,
      unit_id: fg.unit_id,
      category_id: fg.category_id || '',
      selling_price: fg.selling_price || 0,
      minimum_stock: fg.minimum_stock || 0,
      reorder_level: fg.reorder_level || 0,
      maximum_stock: fg.maximum_stock || 0,
      hsn_code: fg.hsn_code || '',
      description: fg.description || '',
    });
    setIsFGModalOpen(true);
  };

  const handleFGSubmit = async (e) => {
    e.preventDefault();
    try {
      if (fgForm.id) {
        await api.finishedGoods.update(fgForm);
        success(`Finished Good SKU ${fgForm.fg_code} updated successfully.`);
      } else {
        await api.finishedGoods.create(fgForm);
        success('Finished Good SKU added to master database.');
      }
      setIsFGModalOpen(false);
      resetFGForm();
      loadData();
    } catch (err) {
      error(err.message || 'Failed to save finished good.');
    }
  };

  const handleDeleteFG = async (fg) => {
    if (!window.confirm(
      `Delete Finished Good SKU "${fg.product_name}" (${fg.fg_code})?\n\n` +
      `• SKU will be hidden from frontend Masters, In/Out entry, and Stock & Inventory.\n` +
      `• All historical transactions, snapshots, and stock balances are preserved in the backend database.`
    )) return;

    try {
      await api.finishedGoods.delete(fg.id);
      success(`Finished Good SKU "${fg.product_name}" deleted and archived.`);
      loadData();
    } catch (err) {
      error(err.message || 'Failed to delete finished good.');
    }
  };

  const handleRestoreFG = async (id) => {
    try {
      await api.finishedGoods.restore(id);
      success('Finished Good SKU restored to active catalog.');
      loadData();
    } catch (err) {
      error(err.message || 'Failed to restore finished good.');
    }
  };

  const handleCompanySave = async (e) => {
    e.preventDefault();
    try {
      await api.settings.saveCompany(company);
      success('Company profile updated.');
    } catch (err) {
      error(err.message || 'Failed to update company settings.');
    }
  };

  const handleOpenAddUser = () => {
    setUserForm({
      id: null,
      username: '',
      full_name: '',
      email: '',
      phone: '',
      role_id: roles[0]?.id || 2,
      password: '',
      active: 1,
    });
    setShowPassword(false);
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (u) => {
    setUserForm({
      id: u.id,
      username: u.username,
      full_name: u.full_name,
      email: u.email || '',
      phone: u.phone || '',
      role_id: u.role_id,
      password: '',
      active: u.active !== undefined ? Number(u.active) : 1,
    });
    setShowPassword(false);
    setIsUserModalOpen(true);
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.settings.saveUser(userForm);
      success(userForm.id ? `User ${userForm.username} credentials updated.` : 'New user created successfully.');
      setIsUserModalOpen(false);
      loadData();
    } catch (err) {
      error(err.message || 'Failed to save user.');
    }
  };

  // Sub-SKU Handlers
  const handleOpenAddSubSKU = (presetFgId = null) => {
    const parentId = presetFgId || (finishedGoods[0]?.id || '');
    const parentFg = finishedGoods.find((f) => f.id === parentId);
    setSubSKUForm({
      id: null,
      parent_fg_id: parentId,
      sub_sku_code: '',
      sub_sku_name: '',
      brand_name: 'Somany',
      client_item_code: '',
      selling_price: parentFg ? Number(parentFg.selling_price) : '',
      description: '',
      active: 1
    });
    setIsSubSKUModalOpen(true);
  };

  const handleOpenEditSubSKU = (sub) => {
    setSubSKUForm({
      id: sub.id,
      parent_fg_id: sub.parent_fg_id,
      sub_sku_code: sub.sub_sku_code,
      sub_sku_name: sub.sub_sku_name,
      brand_name: sub.brand_name,
      client_item_code: sub.client_item_code || '',
      selling_price: sub.selling_price || '',
      description: sub.description || '',
      active: sub.active !== undefined ? Number(sub.active) : 1
    });
    setIsSubSKUModalOpen(true);
  };

  const handleSubSKUSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.subSkus.save(subSKUForm);
      success(subSKUForm.id ? 'Sub-SKU mapping updated.' : 'New Sub-SKU mapped to primary manufacturing SKU.');
      setIsSubSKUModalOpen(false);
      loadData();
    } catch (err) {
      error(err.message || 'Failed to save Sub-SKU mapping.');
    }
  };

  const handleDeleteSubSKU = async (id) => {
    if (!window.confirm('Are you sure you want to remove this Sub-SKU brand mapping?')) return;
    try {
      await api.subSkus.delete(id);
      success('Sub-SKU mapping removed.');
      loadData();
    } catch (err) {
      error(err.message || 'Failed to delete Sub-SKU.');
    }
  };

  // Warehouse Form Handlers
  const resetWarehouseForm = () => {
    setWarehouseForm({
      id: null,
      warehouse_code: '',
      warehouse_name: '',
      location: '',
      is_default: 0,
      is_active: 1
    });
  };

  const handleOpenAddWarehouse = () => {
    resetWarehouseForm();
    setIsWarehouseModalOpen(true);
  };

  const handleOpenEditWarehouse = (wh) => {
    setWarehouseForm({
      id: wh.id,
      warehouse_code: wh.warehouse_code,
      warehouse_name: wh.warehouse_name,
      location: wh.location || '',
      is_default: wh.is_default ? 1 : 0,
      is_active: wh.is_active ? 1 : 0
    });
    setIsWarehouseModalOpen(true);
  };

  const handleWarehouseSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.settings.saveWarehouse(warehouseForm);
      success(warehouseForm.id ? 'Warehouse updated successfully.' : 'New warehouse created successfully.');
      setIsWarehouseModalOpen(false);
      resetWarehouseForm();
      loadData();
    } catch (err) {
      error(err.message || 'Failed to save warehouse.');
    }
  };

  const handleDeleteWarehouse = async (wh) => {
    if (wh.is_default) {
      error('Cannot delete the default warehouse.');
      return;
    }
    if (Number(wh.total_stock_qty || 0) > 0) {
      error(`Cannot delete warehouse "${wh.warehouse_name}" because it currently holds ${Number(wh.total_stock_qty).toLocaleString()} units of inventory. Transfer or clear stock first.`);
      return;
    }
    if (!window.confirm(
      `Are you sure you want to delete warehouse "${wh.warehouse_name}" (${wh.warehouse_code})?\n\n` +
      `This operation cannot be undone.`
    )) return;

    try {
      await api.settings.deleteWarehouse(wh.id);
      success(`Warehouse "${wh.warehouse_name}" deleted successfully.`);
      loadData();
    } catch (err) {
      error(err.message || 'Failed to delete warehouse.');
    }
  };

  // Warehouse Columns
  const warehouseColumns = [
    { 
      header: 'Warehouse Code', 
      key: 'warehouse_code', 
      render: (c, r) => (
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded text-xs border border-slate-200">
            {c}
          </span>
          {r.is_default == 1 && (
            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-300">
              Default Store
            </span>
          )}
        </div>
      ) 
    },
    { 
      header: 'Warehouse Name', 
      key: 'warehouse_name', 
      render: (n) => <span className="font-bold text-slate-900 text-sm">{n}</span> 
    },
    { 
      header: 'Location / Facility', 
      key: 'location', 
      render: (loc) => <span className="text-slate-600 font-medium text-xs">{loc || '—'}</span> 
    },
    { 
      header: 'Active SKUs', 
      key: 'active_item_count', 
      align: 'right',
      render: (cnt) => (
        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-xs">
          {Number(cnt || 0)} SKUs
        </span>
      ) 
    },
    { 
      header: 'Total Live Quantity', 
      key: 'total_stock_qty', 
      align: 'right',
      render: (qty) => (
        <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200 text-xs">
          {Number(qty || 0).toLocaleString()} units
        </span>
      ) 
    },
    { 
      header: 'Status', 
      key: 'is_active', 
      render: (act) => <StatusBadge status={act == 1 ? 'ACTIVE' : 'INACTIVE'} size="xs" /> 
    },
    {
      header: 'Actions',
      key: 'id',
      align: 'right',
      render: (id, row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleOpenEditWarehouse(row); }}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            title="Edit Warehouse Details"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleDeleteWarehouse(row); }}
            disabled={row.is_default == 1 || Number(row.total_stock_qty || 0) > 0}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              row.is_default == 1 || Number(row.total_stock_qty || 0) > 0 
                ? 'text-slate-300 hover:text-slate-300 cursor-not-allowed opacity-40' 
                : 'hover:bg-rose-50 text-slate-400 hover:text-rose-600'
            }`}
            title={
              row.is_default == 1
                ? 'Default warehouse cannot be deleted' 
                : Number(row.total_stock_qty || 0) > 0 
                  ? 'Warehouse has active stock, cannot be deleted' 
                  : 'Delete Warehouse'
            }
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ];

  // RM Columns
  const rmColumns = [
    { header: 'Child Part Code', key: 'rm_code', render: (c) => <span className="font-mono font-bold text-slate-900">{c}</span> },
    { header: 'Child Part Name', key: 'material_name', render: (n) => <span className="font-semibold text-slate-900">{n}</span> },
    { header: 'Category', key: 'category_name' },
    { header: 'Stock Unit', key: 'unit_code', align: 'center' },
    { header: 'Standard Rate (₹)', key: 'standard_rate', align: 'right', render: (r) => <span className="font-mono text-slate-700">₹{Number(r).toFixed(2)}</span> },
    { header: 'Reorder Level', key: 'reorder_level', align: 'right', render: (v, r) => <span className="font-mono font-bold text-amber-700">{Number(v)} {r.unit_code}</span> },
    {
      header: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1.5">
          {rmViewMode === 'active' ? (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleOpenEditRM(row); }}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                title="Edit Child Part"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleDeleteRM(row); }}
                className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                title="Delete Child Part (Safe soft-delete: keeps backend history)"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleRestoreRM(row.id); }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200 transition-colors cursor-pointer shadow-2xs"
              title="Restore to Active Catalog"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restore</span>
            </button>
          )}
        </div>
      )
    }
  ];

  // FG Columns
  const fgColumns = [
    { header: 'SKU Code', key: 'fg_code', render: (c) => <span className="font-mono font-bold text-slate-900">{c}</span> },
    { header: 'Product Name', key: 'product_name', render: (n) => <span className="font-semibold text-slate-900">{n}</span> },
    { 
      header: 'OEM Client Brands (Sub-SKUs)', 
      key: 'id',
      render: (id, row) => {
        const linked = subSkus.filter((s) => s.parent_fg_id === row.id);
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            {linked.length > 0 ? (
              linked.map((s) => (
                <span 
                  key={s.id} 
                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200"
                  title={`${s.sub_sku_name} (${s.sub_sku_code})`}
                >
                  {s.brand_name}
                </span>
              ))
            ) : (
              <span className="text-slate-400 text-[11px] italic">No brands mapped</span>
            )}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleOpenAddSubSKU(row.id); }}
              className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 transition-colors cursor-pointer border border-slate-200 hover:border-indigo-200"
              title="Map new client brand for this SKU"
            >
              + Map Brand
            </button>
          </div>
        );
      }
    },
    { header: 'Selling Price (₹)', key: 'selling_price', align: 'right', render: (p) => <span className="font-mono font-bold text-slate-900">₹{Number(p).toFixed(2)}</span> },
    {
      header: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1.5">
          {fgViewMode === 'active' ? (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleOpenEditFG(row); }}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                title="Edit Finished Good SKU"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleDeleteFG(row); }}
                className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                title="Delete Finished Good SKU (Safe soft-delete: keeps backend history)"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleRestoreFG(row.id); }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200 transition-colors cursor-pointer shadow-2xs"
              title="Restore to Active Catalog"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restore</span>
            </button>
          )}
        </div>
      )
    }
  ];

  // Sub-SKU Columns
  const subSKUColumns = [
    { 
      header: 'Client / OEM Brand', 
      key: 'brand_name', 
      render: (b) => (
        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-2xs">
          {b}
        </span>
      ) 
    },
    { header: 'Sub-SKU Code', key: 'sub_sku_code', render: (c) => <span className="font-mono font-bold text-slate-900">{c}</span> },
    { 
      header: 'Billed Product Name (Sub-SKU)', 
      key: 'sub_sku_name', 
      render: (n, r) => (
        <div>
          <span className="font-bold text-slate-900">{n}</span>
          {r.description && <p className="text-[10px] text-slate-500 font-medium">{r.description}</p>}
        </div>
      ) 
    },
    { 
      header: 'Parent Manufacturing SKU (Physical)', 
      key: 'parent_fg_code', 
      render: (c, r) => (
        <div>
          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[11px] border border-blue-200">
            [{c}]
          </span>
          <span className="font-semibold text-slate-800 ml-1.5 text-xs">
            {r.parent_product_name}
          </span>
        </div>
      ) 
    },
    { 
      header: 'Parent Live Stock', 
      key: 'parent_stock', 
      align: 'right', 
      render: (stk, r) => (
        <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
          {Number(stk).toLocaleString()} {r.unit_code}
        </span>
      ) 
    },
    { 
      header: 'Brand Price (₹)', 
      key: 'selling_price', 
      align: 'right', 
      render: (p) => <span className="font-mono font-bold text-slate-900">₹{Number(p).toFixed(2)}</span> 
    },
    { header: 'Status', key: 'active', render: (a) => <StatusBadge status={a == 1 ? 'ACTIVE' : 'INACTIVE'} size="xs" /> },
    { 
      header: 'Actions', 
      key: 'id', 
      align: 'right',
      render: (id, row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => handleOpenEditSubSKU(row)}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 transition-colors cursor-pointer"
            title="Edit Sub-SKU mapping"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleDeleteSubSKU(id)}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 transition-colors cursor-pointer"
            title="Delete mapping"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ];

  // Audit Columns
  const auditColumns = [
    { header: 'Timestamp', key: 'created_at', render: (dt) => <span className="font-mono text-xs text-slate-500">{dt}</span> },
    { header: 'Action', key: 'action', render: (a) => <StatusBadge status={a} size="xs" /> },
    { header: 'Module', key: 'module', render: (m) => <span className="font-bold text-slate-900 text-xs">{m}</span> },
    { header: 'User', key: 'user_name', render: (u) => <span className="text-slate-700 font-medium">{u}</span> },
    { header: 'IP Address', key: 'ip_address', render: (ip) => <span className="font-mono text-[11px] text-slate-500">{ip}</span> },
  ];

  // Filtered Sub-SKUs
  const filteredSubSkus = subSkus.filter((s) => {
    const matchesBrand = brandFilter === 'ALL' || s.brand_name === brandFilter;
    const matchesSearch = !subSkuSearch || (
      s.sub_sku_name?.toLowerCase().includes(subSkuSearch.toLowerCase()) ||
      s.sub_sku_code?.toLowerCase().includes(subSkuSearch.toLowerCase()) ||
      s.brand_name?.toLowerCase().includes(subSkuSearch.toLowerCase()) ||
      s.parent_product_name?.toLowerCase().includes(subSkuSearch.toLowerCase()) ||
      s.parent_fg_code?.toLowerCase().includes(subSkuSearch.toLowerCase())
    );
    return matchesBrand && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* 1. Child Parts Master */}
      {subTab === 'raw_materials' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Icon name="package" size="lg" className="text-slate-900" ariaHidden={true} />
                <span>Child Parts Master</span>
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Manage metals, alloys, and assembly components with standard rates, minimum reorder levels, and max stock thresholds.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => downloadRawMaterialTemplate(rawMaterials)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                title="Download CSV format pre-filled with existing child parts"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export / Template</span>
              </button>
              <button
                type="button"
                onClick={() => setIsRMCSVModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold shadow-xs transition-colors cursor-pointer"
                title="Import Child Parts in bulk from CSV sheet"
              >
                <Upload className="w-3.5 h-3.5 text-blue-600" />
                <span>Import CSV</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenAddRM()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Icon name="plus" size="xs" ariaHidden={true} />
                <span>Add Child Part</span>
              </button>
            </div>
          </div>

          {/* Active vs Archived Filter Bar */}
          <div className="flex items-center justify-between bg-slate-50/80 p-2 rounded-xl border border-slate-200/80">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setRMViewMode('active')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  rmViewMode === 'active'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                }`}
              >
                Active Catalog ({rmViewMode === 'active' ? rawMaterials.length : '...'})
              </button>
              <button
                type="button"
                onClick={() => setRMViewMode('archived')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  rmViewMode === 'archived'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200/80'
                }`}
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Archived / Deleted ({rmViewMode === 'archived' ? rawMaterials.length : '...'})</span>
              </button>
            </div>
            <div className="text-[11px] text-slate-500 font-medium hidden sm:block">
              {rmViewMode === 'active' 
                ? 'Showing live items active in Stock & Inventory.'
                : 'Deleted items hidden from frontend; transaction history preserved in backend.'}
            </div>
          </div>

          {rmViewMode === 'archived' && (
            <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Archived Child Parts Storage:</span> These materials are soft-deleted and removed from live Stock & Inventory views and In/Out vouchers. All past transactions and database records remain 100% intact. Click <strong>Restore</strong> to bring any item back.
              </div>
            </div>
          )}

          <DataTable columns={rmColumns} data={rawMaterials} loading={loading} />
        </div>
      )}

      {/* 2. Finished Goods Master */}
      {subTab === 'finished_goods' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Icon name="packagecheck" size="lg" className="text-slate-900" ariaHidden={true} />
                <span>Finished Goods (SKUs) Master</span>
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Manage complete faucet, shower, and sanitary ware catalog with selling prices, BOM linkages, and OEM client brand mappings.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => downloadFinishedGoodsTemplate(finishedGoods)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                title="Download CSV format pre-filled with existing finished goods"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export / Template</span>
              </button>
              <button
                type="button"
                onClick={() => setIsFGCSVModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold shadow-xs transition-colors cursor-pointer"
                title="Import Finished Goods in bulk from CSV sheet"
              >
                <Upload className="w-3.5 h-3.5 text-blue-600" />
                <span>Import CSV</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenAddFG()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Icon name="plus" size="xs" ariaHidden={true} />
                <span>Add Finished Good SKU</span>
              </button>
            </div>
          </div>

          {/* Active vs Archived Filter Bar */}
          <div className="flex items-center justify-between bg-slate-50/80 p-2 rounded-xl border border-slate-200/80">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFGViewMode('active')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  fgViewMode === 'active'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                }`}
              >
                Active Catalog ({fgViewMode === 'active' ? finishedGoods.length : '...'})
              </button>
              <button
                type="button"
                onClick={() => setFGViewMode('archived')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  fgViewMode === 'archived'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200/80'
                }`}
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Archived / Deleted ({fgViewMode === 'archived' ? finishedGoods.length : '...'})</span>
              </button>
            </div>
            <div className="text-[11px] text-slate-500 font-medium hidden sm:block">
              {fgViewMode === 'active' 
                ? 'Showing live SKUs active in Stock & Inventory.'
                : 'Deleted SKUs hidden from frontend; transaction history preserved in backend.'}
            </div>
          </div>

          {fgViewMode === 'archived' && (
            <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Archived Finished Goods Storage:</span> These SKUs are soft-deleted and removed from live Stock & Inventory views and In/Out vouchers. All past transactions and database records remain 100% intact. Click <strong>Restore</strong> to bring any SKU back.
              </div>
            </div>
          )}

          <DataTable columns={fgColumns} data={finishedGoods} loading={loading} />
        </div>
      )}

      {/* Warehouse Master */}
      {subTab === 'warehouses' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-indigo-600" />
                <span>Warehouse & Stores Master</span>
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Manage child part stores, production staging areas, and finished goods dispatch hubs. New warehouses can be chosen during SKU production handoff.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleOpenAddWarehouse}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Warehouse</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Warehouses</span>
              <span className="text-xl font-black text-slate-900 font-mono mt-0.5 block">{warehouses.length}</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Active Stocked SKUs</span>
              <span className="text-xl font-black text-blue-600 font-mono mt-0.5 block">
                {warehouses.reduce((acc, w) => acc + Number(w.active_item_count || 0), 0)} SKUs
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Live Units In Storage</span>
              <span className="text-xl font-black text-emerald-600 font-mono mt-0.5 block">
                {warehouses.reduce((acc, w) => acc + Number(w.total_stock_qty || 0), 0).toLocaleString()} units
              </span>
            </div>
          </div>

          <DataTable columns={warehouseColumns} data={warehouses} loading={loading} />
        </div>
      )}

      {/* 3. Sub-SKU & OEM Brand Mapping Master */}
      {subTab === 'sub_skus' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Tags className="w-5 h-5 text-indigo-600" />
                <span>Sub-SKU & OEM Brand Mappings</span>
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Map customer brand names (e.g. Somany, Prince Pipe, Zen Bath) to your primary manufacturing SKUs. Any sale or dispatch of a Sub-SKU automatically deducts physical stock from the parent SKU.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => downloadSubSKUTemplate(subSkus, finishedGoods)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                title="Download CSV format pre-filled with Sub-SKUs"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export / Template</span>
              </button>
              <button
                type="button"
                onClick={() => setIsSubSKUCSVModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold shadow-xs transition-colors cursor-pointer"
                title="Import Sub-SKUs in bulk from CSV sheet"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                <span>Import CSV</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenAddSubSKU()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Sub-SKU Mapping</span>
              </button>
            </div>
          </div>

          {/* Quick Filter Bar by Brand */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
            {/* Brand Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Brand:</span>
              <button
                type="button"
                onClick={() => setBrandFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                  brandFilter === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All Brands ({subSkus.length})
              </button>
              {brands.map((b) => {
                const bCount = subSkus.filter((s) => s.brand_name === b).length;
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBrandFilter(b)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                      brandFilter === b
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {b} ({bCount})
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={subSkuSearch}
                onChange={(e) => setSubSkuSearch(e.target.value)}
                placeholder="Search Sub-SKU, brand, parent..."
                className="w-full bg-slate-50 focus:bg-white pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Sub-SKUs DataTable */}
          <DataTable 
            columns={subSKUColumns} 
            data={filteredSubSkus} 
            loading={loading} 
            searchPlaceholder="Filter Sub-SKUs table..."
          />
        </div>
      )}

      {/* 5. Users & Roles */}
      {subTab === 'users' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Icon name="users" size="lg" className="text-slate-900" ariaHidden={true} />
                <span>Users & Roles Management</span>
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Configure user credentials, login IDs, passwords, and permissions for system administrators and shopfloor operators.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddUser}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add User</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Full Name</th>
                  <th className="px-4 py-3">Login Username</th>
                  <th className="px-4 py-3">Email & Contact</th>
                  <th className="px-4 py-3">Assigned Role</th>
                  <th className="px-4 py-3">Last Login</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">{u.full_name}</td>
                    <td className="px-4 py-3 font-mono font-bold text-blue-700">
                      <span className="bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        {u.username}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{u.email}</div>
                      {u.phone && <div className="text-[10px] text-slate-400 font-mono">{u.phone}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        {u.role_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">{u.last_login_at || 'Never'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={u.active == 1 ? 'ACTIVE' : 'INACTIVE'} size="xs" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenEditUser(u)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-semibold text-xs border border-slate-200 hover:border-blue-200 transition-colors cursor-pointer"
                        title="Edit credentials and reset password"
                      >
                        <Edit2 className="w-3 h-3 text-slate-500" />
                        <span>Edit / Password</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Company Profile */}
      {subTab === 'company' && company && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Icon name="building2" size="lg" className="text-slate-900" ariaHidden={true} />
              <span>Bharat Impex Company Profile</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Manage registered company entity, GSTIN, factory address, and enterprise inventory rules.
            </p>
          </div>
          <div className="max-w-2xl bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
            <form onSubmit={handleCompanySave} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Company Registered Name</label>
                <input
                  type="text"
                  value={company.company_name}
                  onChange={(e) => setCompany({ ...company, company_name: e.target.value })}
                  className="w-full bg-white rounded-xl px-3 py-2 text-slate-900 border border-slate-300 font-bold focus:ring-2 focus:ring-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={company.gstin || ''}
                    onChange={(e) => setCompany({ ...company, gstin: e.target.value })}
                    className="w-full bg-white rounded-xl px-3 py-2 text-slate-900 border border-slate-300 font-mono font-bold focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Phone</label>
                  <input
                    type="text"
                    value={company.phone || ''}
                    onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                    className="w-full bg-white rounded-xl px-3 py-2 text-slate-900 border border-slate-300 focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Factory & Registered Address</label>
                <textarea
                  value={company.address || ''}
                  onChange={(e) => setCompany({ ...company, address: e.target.value })}
                  rows={2}
                  className="w-full bg-white rounded-xl px-3 py-2 text-slate-900 border border-slate-300 focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={company.allow_negative_stock == 1}
                    onChange={(e) => setCompany({ ...company, allow_negative_stock: e.target.checked ? 1 : 0 })}
                    className="w-4 h-4 rounded text-slate-900 border-slate-300 focus:ring-slate-900"
                  />
                  <span className="text-slate-700 font-medium">Allow Negative Inventory (Not Recommended)</span>
                </label>

                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm cursor-pointer"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Security Audit Logs */}
      {subTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Icon name="shieldcheck" size="lg" className="text-slate-900" ariaHidden={true} />
              <span>Security & Audit Trails</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Complete chronological audit logs of all user actions, logins, and system transactions.
            </p>
          </div>
          <DataTable
            columns={auditColumns}
            data={auditLogs}
            loading={loading}
            searchPlaceholder="Search audit logs by action, user or module..."
          />
        </div>
      )}

      {/* Add / Edit RM Modal */}
      <Modal
        isOpen={isRMModalOpen}
        onClose={() => setIsRMModalOpen(false)}
        title={rmForm.id ? `Edit Child Part — ${rmForm.rm_code}` : "Add Child Part Master"}
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsRMModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="rm-form"
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white shadow-sm cursor-pointer"
            >
              {rmForm.id ? "Update Child Part" : "Create Child Part"}
            </button>
          </>
        }
      >
        <form id="rm-form" onSubmit={handleRMSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1">Child Part Name</label>
            <input
              type="text"
              value={rmForm.material_name}
              onChange={(e) => setRMForm({ ...rmForm, material_name: e.target.value })}
              placeholder="e.g. Brass Rod 32MM"
              className="w-full bg-white rounded-xl px-3 py-2 text-slate-900 border border-slate-300 font-semibold focus:ring-2 focus:ring-slate-900"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Stock Unit</label>
              <select
                value={rmForm.unit_id}
                onChange={(e) => setRMForm({ ...rmForm, unit_id: Number(e.target.value) })}
                className="w-full bg-white rounded-xl px-3 py-2 text-slate-900 border border-slate-300 font-medium focus:ring-2 focus:ring-slate-900"
                required
              >
                {units.length > 0 ? (
                  units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.unit_code} ({u.unit_name})
                    </option>
                  ))
                ) : (
                  <>
                    <option value={1}>KG (Kilogram)</option>
                    <option value={3}>PCS (Pieces)</option>
                    <option value={4}>MTR (Meter)</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Standard Valuation Rate (₹)</label>
              <input
                type="number"
                step="0.01"
                value={rmForm.standard_rate}
                onChange={(e) => setRMForm({ ...rmForm, standard_rate: e.target.value })}
                className="w-full bg-white rounded-xl px-3 py-2 text-slate-900 border border-slate-300 focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Reorder Level Threshold</label>
              <input
                type="number"
                value={rmForm.reorder_level}
                onChange={(e) => setRMForm({ ...rmForm, reorder_level: e.target.value })}
                className="w-full bg-white rounded-xl px-3 py-2 text-slate-900 border border-slate-300 focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">HSN Code</label>
              <input
                type="text"
                value={rmForm.hsn_code}
                onChange={(e) => setRMForm({ ...rmForm, hsn_code: e.target.value })}
                className="w-full bg-white rounded-xl px-3 py-2 text-slate-900 border border-slate-300 font-mono focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Add / Edit FG Modal */}
      <Modal
        isOpen={isFGModalOpen}
        onClose={() => setIsFGModalOpen(false)}
        title={fgForm.id ? `Edit Finished Good SKU — ${fgForm.fg_code}` : "Add Finished Good (SKU) Master"}
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsFGModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="fg-form"
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white shadow-sm cursor-pointer"
            >
              {fgForm.id ? "Update Finished Good SKU" : "Create Finished Good"}
            </button>
          </>
        }
      >
        <form id="fg-form" onSubmit={handleFGSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1">Product Name</label>
            <input
              type="text"
              value={fgForm.product_name}
              onChange={(e) => setFGForm({ ...fgForm, product_name: e.target.value })}
              placeholder="e.g. Concealed Stop Valve 15MM"
              className="w-full bg-white rounded-xl px-3 py-2 text-slate-900 border border-slate-300 font-semibold focus:ring-2 focus:ring-slate-900"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Selling Price (₹)</label>
              <input
                type="number"
                step="0.01"
                value={fgForm.selling_price}
                onChange={(e) => setFGForm({ ...fgForm, selling_price: e.target.value })}
                className="w-full bg-white rounded-xl px-3 py-2 text-slate-900 border border-slate-300 focus:ring-2 focus:ring-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Reorder Level</label>
              <input
                type="number"
                value={fgForm.reorder_level}
                onChange={(e) => setFGForm({ ...fgForm, reorder_level: e.target.value })}
                className="w-full bg-white rounded-xl px-3 py-2 text-slate-900 border border-slate-300 focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Sub-SKU Modal (OEM Brand Mapping) */}
      <Modal
        isOpen={isSubSKUModalOpen}
        onClose={() => setIsSubSKUModalOpen(false)}
        title={subSKUForm.id ? `Edit Sub-SKU Mapping — ${subSKUForm.sub_sku_code}` : 'Map New Sub-SKU (Client / OEM Brand)'}
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsSubSKUModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="subsku-form"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-sm cursor-pointer"
            >
              {subSKUForm.id ? 'Save Mapping Changes' : 'Create & Link Sub-SKU'}
            </button>
          </>
        }
      >
        <form id="subsku-form" onSubmit={handleSubSKUSubmit} className="space-y-4 text-xs">
          {/* Parent SKU Selector */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Parent Manufacturing SKU (Physical Inventory Stocked) *
            </label>
            <SearchableSelect
              value={subSKUForm.parent_fg_id}
              onChange={(val) => {
                const pId = Number(val);
                const pFg = finishedGoods.find((f) => f.id === pId);
                setSubSKUForm({ 
                  ...subSKUForm, 
                  parent_fg_id: pId,
                  selling_price: subSKUForm.selling_price || (pFg ? Number(pFg.selling_price) : '')
                });
              }}
              placeholder="-- Choose Primary Finished Good --"
              searchPlaceholder="Search finished goods by model or code..."
              className="w-full"
              buttonClassName="bg-white rounded-xl px-3 py-2 text-slate-900 border border-slate-300 font-semibold text-xs"
              required
              options={finishedGoods.map((fg) => ({
                value: fg.id,
                label: `${fg.product_name} (₹${Number(fg.selling_price).toFixed(2)})`,
                sublabel: fg.fg_code
              }))}
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Physical factory stock & BOM will only be managed on this parent SKU. Billing the Sub-SKU deducts from this item.
            </p>
          </div>

          {/* Client Brand Presets & Name */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-slate-700 font-bold">Client / OEM Brand Name *</label>
              <div className="flex items-center gap-1">
                {['Somany', 'Prince Pipe', 'Zen Bath Fittings'].map((brandPreset) => (
                  <button
                    key={brandPreset}
                    type="button"
                    onClick={() => setSubSKUForm({ ...subSKUForm, brand_name: brandPreset })}
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer"
                  >
                    {brandPreset}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="text"
              value={subSKUForm.brand_name}
              onChange={(e) => setSubSKUForm({ ...subSKUForm, brand_name: e.target.value })}
              placeholder="e.g. Somany, Prince Pipe, Zen Bath Fittings"
              className="w-full bg-white rounded-xl px-3 py-2 text-slate-900 border border-slate-300 font-bold focus:ring-2 focus:ring-indigo-600"
              required
            />
          </div>

          {/* Billed Sub-SKU Product Name & Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Billed Product Name (Sub-SKU) *</label>
              <input
                type="text"
                value={subSKUForm.sub_sku_name}
                onChange={(e) => setSubSKUForm({ ...subSKUForm, sub_sku_name: e.target.value })}
                placeholder="e.g. Somany Brass Basin Tap Model A"
                className="w-full bg-white rounded-xl px-3 py-2 text-slate-900 border border-slate-300 font-bold focus:ring-2 focus:ring-indigo-600"
                required
              />
              <p className="text-[10px] text-slate-400 mt-0.5">This name will appear on sales invoices and Tally imports.</p>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Sub-SKU Code (Optional)</label>
              <input
                type="text"
                value={subSKUForm.sub_sku_code}
                onChange={(e) => setSubSKUForm({ ...subSKUForm, sub_sku_code: e.target.value.toUpperCase() })}
                placeholder="e.g. SOM-TAP-01"
                className="w-full bg-white rounded-xl px-3 py-2 text-slate-900 border border-slate-300 font-mono font-bold focus:ring-2 focus:ring-indigo-600"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Leave blank to auto-generate from brand name.</p>
            </div>
          </div>

          {/* Selling Price & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Brand Selling Rate (₹)</label>
              <input
                type="number"
                step="0.01"
                value={subSKUForm.selling_price}
                onChange={(e) => setSubSKUForm({ ...subSKUForm, selling_price: e.target.value })}
                placeholder="e.g. 1350.00"
                className="w-full bg-white rounded-xl px-3 py-2 text-slate-900 border border-slate-300 font-mono font-bold focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Status</label>
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={subSKUForm.active === 1}
                    onChange={(e) => setSubSKUForm({ ...subSKUForm, active: e.target.checked ? 1 : 0 })}
                    className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-600"
                  />
                  <span className="font-semibold text-slate-700">Active Sub-SKU (Enable for Billing)</span>
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Remarks / Branding Notes</label>
            <input
              type="text"
              value={subSKUForm.description}
              onChange={(e) => setSubSKUForm({ ...subSKUForm, description: e.target.value })}
              placeholder="e.g. Private label packaging with custom Somany laser etching"
              className="w-full bg-white rounded-xl px-3 py-2 text-slate-900 border border-slate-300 focus:ring-2 focus:ring-indigo-600"
            />
          </div>
        </form>
      </Modal>

      {/* User & Password Management Modal */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title={userForm.id ? `Edit User Credentials — ${userForm.username}` : 'Add New System User'}
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsUserModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="user-form"
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white shadow-sm cursor-pointer"
            >
              {userForm.id ? 'Save Changes & Password' : 'Create User'}
            </button>
          </>
        }
      >
        <form id="user-form" onSubmit={handleUserSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Full Name *</label>
              <input
                type="text"
                value={userForm.full_name}
                onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                placeholder="e.g. Bharat Impex Admin"
                className="w-full bg-white rounded-xl px-3 py-2 text-slate-900 border border-slate-300 font-semibold focus:ring-2 focus:ring-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Login Username (ID) *</label>
              <input
                type="text"
                value={userForm.username}
                onChange={(e) => setUserForm({ ...userForm, username: e.target.value.toLowerCase().trim() })}
                placeholder="e.g. admin"
                className="w-full bg-white rounded-xl px-3 py-2 text-slate-900 border border-slate-300 font-mono font-bold focus:ring-2 focus:ring-slate-900"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Email Address *</label>
              <input
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                placeholder="e.g. admin@bharatimpex.com"
                className="w-full bg-white rounded-xl px-3 py-2 text-slate-900 border border-slate-300 font-medium focus:ring-2 focus:ring-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Phone Number</label>
              <input
                type="text"
                value={userForm.phone}
                onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full bg-white rounded-xl px-3 py-2 text-slate-900 border border-slate-300 font-mono focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Assigned Role</label>
              <select
                value={userForm.role_id}
                onChange={(e) => setUserForm({ ...userForm, role_id: Number(e.target.value) })}
                className="w-full bg-white rounded-xl px-3 py-2 text-slate-900 border border-slate-300 font-semibold focus:ring-2 focus:ring-slate-900"
                required
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.role_name} ({r.role_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Account Status</label>
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={userForm.active === 1}
                    onChange={(e) => setUserForm({ ...userForm, active: e.target.checked ? 1 : 0 })}
                    className="w-4 h-4 rounded text-slate-900 border-slate-300 focus:ring-slate-900"
                  />
                  <span className="font-semibold text-slate-700">Active (Account Enabled)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Password / Credentials Setting */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-slate-800 font-bold">
                {userForm.id ? 'Change / Set Password' : 'Set Login Password'}
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPassword ? 'Hide' : 'Show'}</span>
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                placeholder={userForm.id ? 'Leave blank to keep current password' : 'Enter password (default: welcome123)'}
                className="w-full bg-white rounded-xl px-3 py-2 text-slate-900 border border-slate-300 font-mono focus:ring-2 focus:ring-slate-900"
                autoComplete="new-password"
              />
            </div>
            <p className="text-[10px] text-slate-500">
              {userForm.id
                ? 'Only enter a password if you want to update or reset this user\'s credentials.'
                : 'If left blank, default password "welcome123" will be assigned.'}
            </p>
          </div>
        </form>
      </Modal>

      {/* Warehouse Create / Edit Modal */}
      <Modal
        isOpen={isWarehouseModalOpen}
        onClose={() => setIsWarehouseModalOpen(false)}
        title={warehouseForm.id ? `Edit Warehouse — ${warehouseForm.warehouse_name}` : 'Create New Warehouse / Store'}
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsWarehouseModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="warehouse-form"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-sm cursor-pointer"
            >
              {warehouseForm.id ? 'Save Warehouse' : 'Create Warehouse'}
            </button>
          </>
        }
      >
        <form id="warehouse-form" onSubmit={handleWarehouseSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1">Warehouse / Store Name *</label>
            <input
              type="text"
              value={warehouseForm.warehouse_name}
              onChange={(e) => setWarehouseForm({ ...warehouseForm, warehouse_name: e.target.value })}
              placeholder="e.g. Unit 2 Finished Goods Depot"
              className="w-full bg-white rounded-xl px-3 py-2 text-slate-900 border border-slate-300 font-bold focus:ring-2 focus:ring-indigo-600"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Warehouse Code</label>
              <input
                type="text"
                value={warehouseForm.warehouse_code}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, warehouse_code: e.target.value.toUpperCase().trim() })}
                placeholder="e.g. WH-DEPOT2 (Auto if blank)"
                className="w-full bg-white rounded-xl px-3 py-2 text-slate-900 border border-slate-300 font-mono font-bold focus:ring-2 focus:ring-indigo-600"
              />
              <p className="text-[10px] text-slate-400 mt-1">Leave blank to auto-generate from name</p>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Physical Location / Address</label>
              <input
                type="text"
                value={warehouseForm.location}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, location: e.target.value })}
                placeholder="e.g. Shed 3, Ground Floor"
                className="w-full bg-white rounded-xl px-3 py-2 text-slate-900 border border-slate-300 focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={warehouseForm.is_active === 1}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, is_active: e.target.checked ? 1 : 0 })}
                className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
              />
              <span className="font-semibold text-slate-800">Active Storage Facility</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={warehouseForm.is_default === 1}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, is_default: e.target.checked ? 1 : 0 })}
                className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
              />
              <span className="font-semibold text-slate-800">Set as Primary Default Warehouse</span>
            </label>
          </div>
        </form>
      </Modal>

      {/* Bulk CSV Import Modal for Raw Materials */}
      <MasterCSVImportModal
        isOpen={isRMCSVModalOpen}
        onClose={() => setIsRMCSVModalOpen(false)}
        type="RM"
        existingItems={rawMaterials}
        categories={categories}
        units={units}
        onSuccess={loadData}
      />

      {/* Bulk CSV Import Modal for Finished Goods (SKUs) */}
      <MasterCSVImportModal
        isOpen={isFGCSVModalOpen}
        onClose={() => setIsFGCSVModalOpen(false)}
        type="FG"
        existingItems={finishedGoods}
        categories={categories}
        units={units}
        onSuccess={loadData}
      />

      {/* Bulk CSV Import Modal for Sub-SKUs */}
      <SubSKUCSVImportModal
        isOpen={isSubSKUCSVModalOpen}
        onClose={() => setIsSubSKUCSVModalOpen(false)}
        finishedGoods={finishedGoods}
        existingSubSkus={subSkus}
        onSuccess={loadData}
      />
    </div>
  );
}

export default Settings;
