import React, { useState, useEffect } from 'react';
import { 
  Boxes, 
  BookOpen, 
  SlidersHorizontal, 
  ArrowRightLeft, 
  Plus, 
  RefreshCw, 
  Filter, 
  AlertTriangle,
  CheckCircle2,
  Package,
  Layers,
  Download
} from 'lucide-react';
import { DataTable } from '../../components/UI/DataTable';
import { StatusBadge } from '../../components/UI/StatusBadge';
import { Modal } from '../../components/UI/Modal';
import Icon from '../../components/UI/Icon';
import { BulkStockUploadModal } from '../../components/UI/BulkStockUploadModal';
import { IMSTriNagarMaster } from './IMSTriNagarMaster';
import SearchableSelect from '../../components/UI/SearchableSelect';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

export function Inventory() {
  const [activeSubTab, setActiveSubTab] = useState('ims_master'); // 'ims_master', 'stock', 'ledger'
  const [materialTypeFilter, setMaterialTypeFilter] = useState('ALL'); // 'ALL', 'RM', 'FG', 'SCRAP'
  const [stockList, setStockList] = useState([]);
  const [ledgerList, setLedgerList] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [units, setUnits] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [finishedGoods, setFinishedGoods] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState(null);

  // Forms
  const [adjustForm, setAdjustForm] = useState({
    material_type: 'RM',
    material_id: '',
    material_code: '',
    material_name: '',
    warehouse_id: 1,
    physical_quantity: '',
    unit_id: 1,
    reason: 'Physical Stock Verification',
    remarks: '',
  });

  const newTransferLine = () => ({
    row_id: `tl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    key: '',
    quantity: '',
  });

  const [transferForm, setTransferForm] = useState({
    source_warehouse_id: '',
    destination_warehouse_id: '',
    type_filter: 'ALL',
    lines: [newTransferLine()],
    remarks: '',
  });
  const [transferSaving, setTransferSaving] = useState(false);
  const [recentTransfers, setRecentTransfers] = useState([]);
  const [imsRefreshKey, setImsRefreshKey] = useState(0);

  const [openingForm, setOpeningForm] = useState({
    material_type: 'RM',
    material_id: '',
    material_code: '',
    material_name: '',
    warehouse_id: 1,
    quantity: '',
    unit_id: 1,
    rate: '',
    remarks: 'Initial stock balance verification',
  });

  const { success, error } = useToast();
  const { hasPermission } = useAuth();

  // Stock rows of the selected source godown (only items that actually have stock there)
  const sourceStockOptions = React.useMemo(() => {
    if (!transferForm.source_warehouse_id) return [];
    return stockList
      .filter((s) => String(s.warehouse_id) === String(transferForm.source_warehouse_id) && Number(s.quantity) > 0)
      .map((s) => ({ ...s, key: `${s.material_type}:${s.material_id}` }));
  }, [stockList, transferForm.source_warehouse_id]);

  const openingItemOptions = React.useMemo(() => {
    if (openingForm.material_type === 'RM') {
      return rawMaterials.map((r) => ({ material_id: r.id, material_code: r.rm_code, material_name: r.material_name, unit_id: r.unit_id }));
    }
    if (openingForm.material_type === 'FG') {
      return finishedGoods.map((f) => ({ material_id: f.id, material_code: f.fg_code, material_name: f.product_name, unit_id: f.unit_id }));
    }
    const seen = new Set();
    return stockList
      .filter((s) => s.material_type === 'SCRAP' && !seen.has(s.material_id) && seen.add(s.material_id))
      .map((s) => ({ material_id: s.material_id, material_code: s.material_code, material_name: s.material_name, unit_id: s.unit_id }));
  }, [openingForm.material_type, rawMaterials, finishedGoods, stockList]);

  const updateTransferLine = (idx, patch) => {
    setTransferForm((prev) => ({
      ...prev,
      lines: prev.lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)),
    }));
  };

  const loadRecentTransfers = async () => {
    try {
      const res = await api.stock.getTransfers(20);
      setRecentTransfers(res?.data || []);
    } catch (e) {
      setRecentTransfers([]);
    }
  };

  const refreshAfterStockChange = () => {
    fetchStock();
    setImsRefreshKey((k) => k + 1);
  };

  const fetchStock = async () => {
    setLoading(true);
    try {
      const res = await api.stock.getAll({});
      if (res?.data) setStockList(res.data);
    } catch (err) {
      error('Failed to load stock: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const params = {};
      if (materialTypeFilter !== 'ALL') params.material_type = materialTypeFilter;
      const res = await api.stock.getLedger(params);
      if (res?.data) setLedgerList(res.data);
    } catch (err) {
      error('Failed to load stock ledger: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMasters = async () => {
    try {
      const [bundleRes, rmRes, fgRes] = await Promise.all([
        api.settings.getBundle(),
        api.rawMaterials.getAll(),
        api.finishedGoods.getAll()
      ]);
      if (bundleRes?.data) {
        const whs = (bundleRes.data.warehouses || []).filter((w) => w.active === undefined || Number(w.active) === 1);
        setWarehouses(whs);
        setUnits(bundleRes.data.units || []);
        setTransferForm((prev) => ({
          ...prev,
          source_warehouse_id: prev.source_warehouse_id || (whs[0] ? String(whs[0].id) : ''),
          destination_warehouse_id: prev.destination_warehouse_id || (whs[1] ? String(whs[1].id) : ''),
        }));
        setOpeningForm((prev) => ({ ...prev, warehouse_id: whs.some((w) => Number(w.id) === Number(prev.warehouse_id)) ? prev.warehouse_id : (whs[0] ? Number(whs[0].id) : '') }));
      }
      if (rmRes?.data) setRawMaterials(rmRes.data);
      if (fgRes?.data) setFinishedGoods(fgRes.data);
    } catch (err) {
      console.warn(err);
    }
  };

  useEffect(() => {
    fetchMasters();
    fetchStock();
  }, []);

  useEffect(() => {
    if (isTransferModalOpen) {
      fetchStock();
      loadRecentTransfers();
    }
  }, [isTransferModalOpen]);

  useEffect(() => {
    if (isAdjustModalOpen || isOpeningModalOpen) fetchStock();
  }, [isAdjustModalOpen, isOpeningModalOpen]);

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.stock.adjust(adjustForm);
      success('Stock adjustment executed and ledger updated.');
      setIsAdjustModalOpen(false);
      refreshAfterStockChange();
    } catch (err) {
      error(err.message || 'Adjustment failed.');
    }
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    const { source_warehouse_id: src, destination_warehouse_id: dst } = transferForm;
    if (!src || !dst) return error('Select both the source and destination godown.');
    if (String(src) === String(dst)) return error('Source and destination godown cannot be the same.');

    const items = [];
    for (let i = 0; i < transferForm.lines.length; i++) {
      const line = transferForm.lines[i];
      if (!line.key && !line.quantity) continue;
      const stk = sourceStockOptions.find((s) => s.key === line.key);
      if (!stk) return error(`Line #${i + 1}: choose an item available in the source godown.`);
      const qty = Number(line.quantity);
      if (!qty || qty <= 0) return error(`Line #${i + 1}: enter a quantity greater than zero.`);
      items.push({ material_type: stk.material_type, material_id: Number(stk.material_id), quantity: qty });
    }
    if (items.length === 0) return error('Add at least one item to transfer.');

    setTransferSaving(true);
    try {
      const res = await api.stock.transfer({
        source_warehouse_id: Number(src),
        destination_warehouse_id: Number(dst),
        remarks: transferForm.remarks,
        items,
      });
      const srcName = warehouses.find((w) => String(w.id) === String(src))?.warehouse_name || 'source';
      const dstName = warehouses.find((w) => String(w.id) === String(dst))?.warehouse_name || 'destination';
      success(`Transfer ${res?.data?.transfer_number || ''} done: ${items.length} item(s) moved ${srcName} → ${dstName}.`);
      setTransferForm((prev) => ({ ...prev, lines: [newTransferLine()], remarks: '' }));
      setIsTransferModalOpen(false);
      refreshAfterStockChange();
    } catch (err) {
      error(err.message || 'Transfer failed.');
    } finally {
      setTransferSaving(false);
    }
  };

  const handleOpeningSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!openingForm.material_id) throw new Error('Select an item.');
      if (!openingForm.warehouse_id) throw new Error('Select the godown.');
      await api.stock.opening(openingForm);
      success('Opening stock balance recorded into ledger.');
      setIsOpeningModalOpen(false);
      refreshAfterStockChange();
    } catch (err) {
      error(err.message || 'Opening stock failed.');
    }
  };

  const openAdjustFor = (row) => {
    setAdjustForm({
      material_type: row.material_type,
      material_id: row.material_id,
      material_code: row.material_code,
      material_name: row.material_name,
      warehouse_id: row.warehouse_id,
      physical_quantity: Number(row.quantity),
      unit_id: row.unit_id,
      reason: 'Physical Stock Reconciliation',
      remarks: '',
    });
    setIsAdjustModalOpen(true);
  };

  // Columns for Stock Table
  const stockColumns = [
    {
      header: 'Type',
      key: 'material_type',
      render: (type) => (
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
            type === 'RM'
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : type === 'FG'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}
        >
          {type === 'RM' ? 'Child Part' : type === 'FG' ? 'Finished Good' : 'Scrap'}
        </span>
      ),
    },
    {
      header: 'Code',
      key: 'material_code',
      render: (code) => <span className="font-mono font-bold text-blue-600">{code}</span>,
    },
    {
      header: 'Material / Product Name',
      key: 'material_name',
      render: (name, row) => (
        <div>
          <p className="font-semibold text-slate-900">{name}</p>
          <p className="text-[11px] text-slate-500">Warehouse: {row.warehouse_name}</p>
        </div>
      ),
    },
    {
      header: 'Total Quantity',
      key: 'quantity',
      align: 'right',
      render: (qty, row) => (
        <span className="font-bold text-slate-900 font-mono">
          {Number(qty).toLocaleString()} {row.unit_code}
        </span>
      ),
    },
    {
      header: 'Reserved (BOM)',
      key: 'reserved_quantity',
      align: 'right',
      render: (reserved, row) => (
        <span className="text-amber-700 font-mono font-semibold">
          {Number(reserved) > 0 ? `${Number(reserved).toLocaleString()} ${row.unit_code}` : '—'}
        </span>
      ),
    },
    {
      header: 'Available Stock',
      key: 'available_quantity',
      align: 'right',
      render: (avail, row) => {
        const qty = Number(avail || 0);
        const max = Number(row.maximum_stock || 0);
        const min = Number(row.minimum_stock || row.reorder_level || 0);
        
        let zone = 'GREEN';
        let zoneLabel = 'Sufficient';
        let badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-200';

        if (max > 0) {
          const ratio = Math.round((qty / max) * 100);
          if (ratio <= 30) {
            zone = 'RED';
            zoneLabel = `Red Zone (${ratio}%)`;
            badgeStyle = 'bg-red-50 text-red-700 border-red-200';
          } else if (ratio <= 60) {
            zone = 'YELLOW';
            zoneLabel = `Yellow Zone (${ratio}%)`;
            badgeStyle = 'bg-amber-50 text-amber-800 border-amber-200';
          } else if (ratio <= 100) {
            zone = 'GREEN';
            zoneLabel = `Green Zone (${ratio}%)`;
            badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-200';
          } else {
            zone = 'PURPLE';
            zoneLabel = `Purple Stock (${ratio}%)`;
            badgeStyle = 'bg-purple-50 text-purple-800 border-purple-200';
          }
        } else {
          if (qty <= 0) {
            zone = 'RED';
            zoneLabel = '0 Stock (Critical)';
            badgeStyle = 'bg-red-50 text-red-700 border-red-200';
          } else if (min > 0 && qty <= min) {
            zone = 'YELLOW';
            zoneLabel = 'Low Buffer';
            badgeStyle = 'bg-amber-50 text-amber-800 border-amber-200';
          }
        }

        return (
          <div className="text-right">
            <span
              className={`font-bold font-mono text-sm ${
                zone === 'RED'
                  ? 'text-rose-600'
                  : zone === 'YELLOW'
                  ? 'text-amber-700'
                  : zone === 'PURPLE'
                  ? 'text-purple-700'
                  : 'text-emerald-700'
              }`}
            >
              {Number(avail).toLocaleString()} {row.unit_code}
            </span>
            <span
              className={`block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold border w-fit ml-auto ${badgeStyle}`}
            >
              {zoneLabel}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Action',
      key: 'id',
      align: 'center',
      sortable: false,
      render: (_, row) => (
        <button
          onClick={() => openAdjustFor(row)}
          className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs text-[11px] font-semibold transition-colors cursor-pointer"
        >
          Reconcile
        </button>
      ),
    },
  ];

  // Columns for Stock Ledger Table
  const ledgerColumns = [
    {
      header: 'Tx Date',
      key: 'transaction_date',
      render: (date) => <span className="text-slate-600 font-mono text-xs">{date}</span>,
    },
    {
      header: 'Transaction Type',
      key: 'transaction_type',
      render: (type) => <StatusBadge status={type} size="xs" />,
    },
    {
      header: 'Material Code & Name',
      key: 'material_code',
      render: (code, row) => (
        <div>
          <span className="font-mono font-bold text-blue-600">{code}</span>
          <p className="text-[11px] text-slate-500">{row.resolved_material_name}</p>
        </div>
      ),
    },
    {
      header: 'Warehouse',
      key: 'warehouse_name',
    },
    {
      header: 'In (+)',
      key: 'quantity_in',
      align: 'right',
      render: (qty) => (
        <span className="text-emerald-700 font-mono font-bold">
          {Number(qty) > 0 ? `+${Number(qty).toLocaleString()}` : '—'}
        </span>
      ),
    },
    {
      header: 'Out (-)',
      key: 'quantity_out',
      align: 'right',
      render: (qty) => (
        <span className="text-rose-600 font-mono font-bold">
          {Number(qty) > 0 ? `-${Number(qty).toLocaleString()}` : '—'}
        </span>
      ),
    },
    {
      header: 'Balance After',
      key: 'balance_after',
      align: 'right',
      render: (bal, row) => (
        <span className="font-mono font-bold text-slate-900">
          {Number(bal).toLocaleString()} {row.unit_code}
        </span>
      ),
    },
    {
      header: 'Reference / Invoice',
      key: 'reference_number',
      render: (ref) => <span className="font-mono text-xs text-slate-600">{ref || '—'}</span>,
    },
    {
      header: 'Remarks & User',
      key: 'remarks',
      render: (remarks, row) => (
        <div>
          <p className="text-xs text-slate-700 truncate max-w-xs">{remarks || '—'}</p>
          <p className="text-[10px] text-slate-500">{row.created_by_name || 'System'}</p>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Master Action Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Icon name="boxes" size="lg" className="text-slate-900" ariaHidden={true} />
            <span>Inventory & Stock Engine</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Immutable transaction-driven stock ledger. No direct manual modifications permitted.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasPermission('inventory.bulk') && <button
            type="button"
            onClick={() => setIsBulkModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300 shadow-xs transition-colors cursor-pointer"
            title="Upload or update inventory stock in bulk with Auto-ID creation"
          >
            <Icon name="upload" size="xs" ariaHidden={true} />
            <span>Bulk Stock Setup (RM & FG)</span>
          </button>}

          {hasPermission('inventory.opening') && <button
            type="button"
            onClick={() => setIsOpeningModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-xs transition-colors cursor-pointer"
          >
            <Icon name="plus" size="xs" ariaHidden={true} />
            <span>Opening Stock</span>
          </button>}

          {hasPermission('inventory.transfer') && <button
            type="button"
            onClick={() => setIsTransferModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-xs transition-colors cursor-pointer"
          >
            <Icon name="transfer" size="xs" className="text-slate-700" ariaHidden={true} />
            <span>Warehouse Transfer</span>
          </button>}

          {hasPermission('inventory.adjust') && <button
            type="button"
            onClick={() => setIsAdjustModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Icon name="sliders" size="xs" ariaHidden={true} />
            <span>Stock Adjustment</span>
          </button>}
        </div>
      </div>


      {/* Main Table Display */}
      <IMSTriNagarMaster key={imsRefreshKey} />

      {/* Stock Adjustment Modal */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title="Stock Adjustment (Physical Count Reconciliation)"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsAdjustModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="adjust-form"
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white shadow-xs"
            >
              Apply Adjustment
            </button>
          </>
        }
      >
        <form id="adjust-form" onSubmit={handleAdjustSubmit} className="space-y-4 text-xs">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Stock adjustments create a permanent <strong>ADJUSTMENT_IN</strong> or <strong>ADJUSTMENT_OUT</strong> entry in the immutable stock ledger with your username.
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Material Type</label>
              <select
                value={adjustForm.material_type}
                onChange={(e) => setAdjustForm({ ...adjustForm, material_type: e.target.value })}
                className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
              >
                <option value="RM">Child Part</option>
                <option value="FG">Finished Good</option>
                <option value="SCRAP">Scrap</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Select Item from Stock</label>
              <SearchableSelect
                value={adjustForm.material_id ? `${adjustForm.material_id}:${adjustForm.warehouse_id}` : ''}
                onChange={(val) => {
                  const [mid, wid] = String(val).split(':');
                  const item = stockList.find(
                    (s) => s.material_type === adjustForm.material_type && String(s.material_id) === mid && String(s.warehouse_id) === wid
                  );
                  if (item) {
                    setAdjustForm({
                      ...adjustForm,
                      material_id: item.material_id,
                      material_code: item.material_code,
                      material_name: item.material_name,
                      warehouse_id: item.warehouse_id,
                      unit_id: item.unit_id,
                      physical_quantity: Number(item.quantity),
                    });
                  }
                }}
                placeholder="-- Choose Material --"
                searchPlaceholder="Search material by name or code..."
                className="w-full"
                buttonClassName="rounded-xl px-3 py-2 text-xs border-slate-300"
                required
                options={stockList
                  .filter((s) => s.material_type === adjustForm.material_type)
                  .map((s) => ({
                    value: `${s.material_id}:${s.warehouse_id}`,
                    label: s.material_name,
                    sublabel: `${s.material_code} • ${s.warehouse_name}`,
                    badge: `Qty: ${Number(s.quantity).toLocaleString('en-IN')}`
                  }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Physical Verified Quantity</label>
              <input
                type="number"
                step="0.001"
                value={adjustForm.physical_quantity}
                onChange={(e) => setAdjustForm({ ...adjustForm, physical_quantity: e.target.value })}
                placeholder="Actual physical count"
                className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Adjustment Reason</label>
              <select
                value={adjustForm.reason}
                onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
              >
                <option value="Physical Stock Reconciliation">Physical Stock Reconciliation</option>
                <option value="Process Loss / Evaporation">Process Loss / Evaporation</option>
                <option value="Damaged / Scrapped on Floor">Damaged / Scrapped on Floor</option>
                <option value="Supplier Count Discrepancy">Supplier Count Discrepancy</option>
                <option value="Found Unrecorded Stock">Found Unrecorded Stock</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Detailed Remarks</label>
            <textarea
              value={adjustForm.remarks}
              onChange={(e) => setAdjustForm({ ...adjustForm, remarks: e.target.value })}
              placeholder="Provide context for audit records..."
              rows={2}
              className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
            />
          </div>
        </form>
      </Modal>

      {/* Stock Transfer Modal (multi-line, godown to godown) */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Stock Transfer Between Godowns / Warehouses"
        maxWidth="max-w-4xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsTransferModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="transfer-form"
              disabled={transferSaving}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-xs font-bold text-white shadow-xs"
            >
              {transferSaving ? 'Transferring...' : 'Confirm Transfer'}
            </button>
          </>
        }
      >
        <form id="transfer-form" onSubmit={handleTransferSubmit} className="space-y-4 text-xs">
          {warehouses.length < 2 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>You need at least two active godowns. Add them in <strong>Masters &amp; Settings → Warehouse Master</strong>.</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-end">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">From Godown (Source)</label>
              <select
                value={transferForm.source_warehouse_id}
                onChange={(e) => setTransferForm({ ...transferForm, source_warehouse_id: e.target.value, lines: [newTransferLine()] })}
                className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-slate-900 text-xs font-semibold focus:ring-2 focus:ring-slate-900/10"
                required
              >
                <option value="">-- Select Source Godown --</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.warehouse_name} ({w.warehouse_code})</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => setTransferForm({
                ...transferForm,
                source_warehouse_id: transferForm.destination_warehouse_id,
                destination_warehouse_id: transferForm.source_warehouse_id,
                lines: [newTransferLine()],
              })}
              className="h-9 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold"
              title="Swap source and destination"
            >
              ⇄
            </button>
            <div>
              <label className="block text-slate-600 font-semibold mb-1">To Godown (Destination)</label>
              <select
                value={transferForm.destination_warehouse_id}
                onChange={(e) => setTransferForm({ ...transferForm, destination_warehouse_id: e.target.value })}
                className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-slate-900 text-xs font-semibold focus:ring-2 focus:ring-slate-900/10"
                required
              >
                <option value="">-- Select Destination Godown --</option>
                {warehouses
                  .filter((w) => String(w.id) !== String(transferForm.source_warehouse_id))
                  .map((w) => (
                    <option key={w.id} value={w.id}>{w.warehouse_name} ({w.warehouse_code})</option>
                  ))}
              </select>
            </div>
          </div>

          {/* Transfer lines */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between bg-slate-50 px-3 py-2 border-b border-slate-200">
              <span className="font-bold text-slate-700">Items to move ({transferForm.lines.length})</span>
              <div className="flex items-center gap-2">
                <select
                  value={transferForm.type_filter}
                  onChange={(e) => setTransferForm({ ...transferForm, type_filter: e.target.value })}
                  className="rounded-lg px-2 py-1 bg-white border border-slate-300 text-[11px] font-semibold"
                  title="Filter item list"
                >
                  <option value="ALL">All types</option>
                  <option value="RM">Child Parts (RM)</option>
                  <option value="FG">Finished Goods (FG)</option>
                  <option value="SCRAP">Scrap</option>
                </select>
                <button
                  type="button"
                  onClick={() => setTransferForm({ ...transferForm, lines: [...transferForm.lines, newTransferLine()] })}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 font-bold text-slate-700"
                >
                  + Add Item
                </button>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {transferForm.lines.map((line, idx) => {
                const src = sourceStockOptions.find((s) => s.key === line.key);
                const avail = src ? Number(src.available_quantity ?? src.quantity) : 0;
                const over = src && Number(line.quantity) > avail;
                return (
                  <div key={line.row_id} className="grid grid-cols-[1fr_130px_32px] gap-2 items-start p-2.5">
                    <div>
                      <SearchableSelect
                        value={line.key}
                        onChange={(val) => updateTransferLine(idx, { key: val })}
                        placeholder={transferForm.source_warehouse_id ? '-- Choose item in source godown --' : 'Select source godown first'}
                        searchPlaceholder="Search by name or code..."
                        className="w-full"
                        buttonClassName="rounded-xl px-3 py-2 text-xs border-slate-300"
                        options={sourceStockOptions
                          .filter((s) => transferForm.type_filter === 'ALL' || s.material_type === transferForm.type_filter)
                          .map((s) => ({
                            value: s.key,
                            label: s.material_name,
                            sublabel: `${s.material_code} • ${s.material_type === 'RM' ? 'Child Part' : s.material_type === 'FG' ? 'Finished Good' : 'Scrap'}`,
                            badge: `Avail: ${Number(s.available_quantity ?? s.quantity).toLocaleString('en-IN')} ${s.unit_code || ''}`,
                          }))}
                      />
                      {src && (
                        <p className={`text-[10px] mt-1 font-semibold ${over ? 'text-rose-600' : 'text-slate-500'}`}>
                          Available in source: {avail.toLocaleString('en-IN')} {src.unit_code}
                          {over ? ' — quantity exceeds available stock' : ''}
                        </p>
                      )}
                    </div>
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={line.quantity}
                      onChange={(e) => updateTransferLine(idx, { quantity: e.target.value })}
                      placeholder="Qty"
                      className={`w-full rounded-xl px-3 py-2 bg-white border text-slate-900 text-xs font-mono font-bold focus:ring-2 focus:ring-slate-900/10 ${over ? 'border-rose-400' : 'border-slate-300'}`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setTransferForm({
                        ...transferForm,
                        lines: transferForm.lines.length > 1 ? transferForm.lines.filter((_, i) => i !== idx) : [newTransferLine()],
                      })}
                      className="h-9 w-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 font-bold"
                      title="Remove line"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
              {transferForm.source_warehouse_id && sourceStockOptions.length === 0 && (
                <p className="p-3 text-slate-500">No stock available in this godown.</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Transfer Note / Vehicle / Challan Ref</label>
            <input
              type="text"
              value={transferForm.remarks}
              onChange={(e) => setTransferForm({ ...transferForm, remarks: e.target.value })}
              placeholder="e.g. Bhiwadi to Mayapuri, Challan #24, Vehicle HR-55-1234"
              className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
            />
          </div>

          {/* Recent transfers */}
          <div className="border-t border-slate-200 pt-3">
            <p className="font-bold text-slate-700 mb-2">Recent Transfers</p>
            {recentTransfers.length === 0 ? (
              <p className="text-slate-400">No transfers recorded yet.</p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5">
                {recentTransfers.map((t) => (
                  <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-bold text-blue-700">{t.transfer_number}</span>
                      <span className="text-slate-600 whitespace-nowrap">{t.source_warehouse_name} → {t.destination_warehouse_name}</span>
                    </div>
                    <div className="text-slate-500 text-[11px] truncate">
                      {(t.items || []).map((it) => `${it.material_name || it.material_code} × ${Number(it.quantity).toLocaleString('en-IN')} ${it.unit_code || ''}`).join(', ')}
                    </div>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">{t.transfer_date}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
      </Modal>

      {/* Opening Stock Modal */}
      <Modal
        isOpen={isOpeningModalOpen}
        onClose={() => setIsOpeningModalOpen(false)}
        title="Initialize Opening Stock Balance"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsOpeningModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="opening-form"
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white shadow-xs"
            >
              Record Opening Balance
            </button>
          </>
        }
      >
        <form id="opening-form" onSubmit={handleOpeningSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Material Type</label>
              <select
                value={openingForm.material_type}
                onChange={(e) => setOpeningForm({ ...openingForm, material_type: e.target.value, material_id: '', material_code: '', material_name: '' })}
                className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
              >
                <option value="RM">Child Part</option>
                <option value="FG">Finished Good</option>
                <option value="SCRAP">Scrap Material</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Warehouse</label>
              <SearchableSelect
                value={openingForm.warehouse_id}
                onChange={(val) => setOpeningForm({ ...openingForm, warehouse_id: Number(val) })}
                placeholder="-- Select Warehouse --"
                searchPlaceholder="Search warehouse..."
                className="w-full"
                buttonClassName="rounded-xl px-3 py-2 text-xs border-slate-300"
                options={warehouses.map((w) => ({
                  value: w.id,
                  label: w.warehouse_name,
                  sublabel: w.warehouse_code
                }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Select Item</label>
              <SearchableSelect
                value={openingForm.material_id}
                onChange={(val) => {
                  const sel = openingItemOptions.find((s) => String(s.material_id) === String(val));
                  if (sel) {
                    setOpeningForm({
                      ...openingForm,
                      material_id: sel.material_id,
                      material_code: sel.material_code,
                      material_name: sel.material_name,
                      unit_id: sel.unit_id,
                    });
                  }
                }}
                placeholder="-- Choose Item --"
                searchPlaceholder="Search item..."
                className="w-full"
                buttonClassName="rounded-xl px-3 py-2 text-xs border-slate-300"
                required
                options={openingItemOptions.map((s) => ({
                    value: s.material_id,
                    label: s.material_name,
                    sublabel: s.material_code
                  }))}
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Opening Quantity</label>
              <input
                type="number"
                step="0.001"
                value={openingForm.quantity}
                onChange={(e) => setOpeningForm({ ...openingForm, quantity: e.target.value })}
                placeholder="Opening balance qty"
                className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Unit Standard Valuation Rate (₹)</label>
            <input
              type="number"
              step="0.01"
              value={openingForm.rate}
              onChange={(e) => setOpeningForm({ ...openingForm, rate: e.target.value })}
              placeholder="e.g. 580.00"
              className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
            />
          </div>
        </form>
      </Modal>

      {/* Bulk Stock Setup & Master Update Modal */}
      <BulkStockUploadModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onStockUpdated={() => refreshAfterStockChange()}
        warehouses={warehouses}
        rawMaterials={rawMaterials}
        finishedGoods={finishedGoods}
      />
    </div>
  );
}
