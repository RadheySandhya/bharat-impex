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

  const [transferForm, setTransferForm] = useState({
    source_warehouse_id: 1,
    destination_warehouse_id: 2,
    material_type: 'RM',
    material_id: '',
    quantity: '',
    remarks: '',
  });

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

  const fetchStock = async () => {
    setLoading(true);
    try {
      const params = {};
      if (materialTypeFilter !== 'ALL') params.material_type = materialTypeFilter;
      const res = await api.stock.getAll(params);
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
        setWarehouses(bundleRes.data.warehouses || []);
        setUnits(bundleRes.data.units || []);
      }
      if (rmRes?.data) setRawMaterials(rmRes.data);
      if (fgRes?.data) setFinishedGoods(fgRes.data);
    } catch (err) {
      console.warn(err);
    }
  };

  useEffect(() => {
    fetchMasters();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'stock') {
      fetchStock();
    } else {
      fetchLedger();
    }
  }, [activeSubTab, materialTypeFilter]);

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.stock.adjust(adjustForm);
      success('Stock adjustment executed and ledger updated.');
      setIsAdjustModalOpen(false);
      fetchStock();
    } catch (err) {
      error(err.message || 'Adjustment failed.');
    }
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    try {
      const selected = stockList.find(
        (s) => s.material_type === transferForm.material_type && s.material_id == transferForm.material_id
      );
      if (!selected) throw new Error('Selected item not found.');

      await api.stock.transfer({
        source_warehouse_id: Number(transferForm.source_warehouse_id),
        destination_warehouse_id: Number(transferForm.destination_warehouse_id),
        remarks: transferForm.remarks,
        items: [
          {
            material_type: selected.material_type,
            material_id: selected.material_id,
            material_code: selected.material_code,
            material_name: selected.material_name,
            quantity: Number(transferForm.quantity),
            unit_id: selected.unit_id,
          },
        ],
      });

      success('Stock transfer between warehouses recorded successfully.');
      setIsTransferModalOpen(false);
      fetchStock();
    } catch (err) {
      error(err.message || 'Transfer failed.');
    }
  };

  const handleOpeningSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.stock.opening(openingForm);
      success('Opening stock balance recorded into ledger.');
      setIsOpeningModalOpen(false);
      fetchStock();
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
          <button
            type="button"
            onClick={() => setIsBulkModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300 shadow-xs transition-colors cursor-pointer"
            title="Upload or update inventory stock in bulk with Auto-ID creation"
          >
            <Icon name="upload" size="xs" ariaHidden={true} />
            <span>Bulk Stock Setup (RM & FG)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsOpeningModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-xs transition-colors cursor-pointer"
          >
            <Icon name="plus" size="xs" ariaHidden={true} />
            <span>Opening Stock</span>
          </button>

          <button
            type="button"
            onClick={() => setIsTransferModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-xs transition-colors cursor-pointer"
          >
            <Icon name="transfer" size="xs" className="text-slate-700" ariaHidden={true} />
            <span>Warehouse Transfer</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAdjustModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Icon name="sliders" size="xs" ariaHidden={true} />
            <span>Stock Adjustment</span>
          </button>
        </div>
      </div>


      {/* Main Table Display */}
      <IMSTriNagarMaster />

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
                value={adjustForm.material_id}
                onChange={(val) => {
                  const item = stockList.find(
                    (s) => s.material_type === adjustForm.material_type && String(s.material_id) === String(val)
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
                    value: s.material_id,
                    label: s.material_name,
                    sublabel: s.material_code,
                    badge: `Qty: ${s.quantity}`
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

      {/* Stock Transfer Modal */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Stock Transfer Between Warehouses / Godowns"
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
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white shadow-xs"
            >
              Confirm Transfer
            </button>
          </>
        }
      >
        <form id="transfer-form" onSubmit={handleTransferSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Source Warehouse (From)</label>
              <SearchableSelect
                value={transferForm.source_warehouse_id}
                onChange={(val) => setTransferForm({ ...transferForm, source_warehouse_id: val })}
                placeholder="-- Select Source Warehouse --"
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

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Destination Warehouse (To)</label>
              <SearchableSelect
                value={transferForm.destination_warehouse_id}
                onChange={(val) => setTransferForm({ ...transferForm, destination_warehouse_id: val })}
                placeholder="-- Select Destination Warehouse --"
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
              <label className="block text-slate-600 font-semibold mb-1">Select Material to Transfer</label>
              <SearchableSelect
                value={transferForm.material_id}
                onChange={(val) => setTransferForm({ ...transferForm, material_id: val })}
                placeholder="-- Choose Material --"
                searchPlaceholder="Search material by name..."
                className="w-full"
                buttonClassName="rounded-xl px-3 py-2 text-xs border-slate-300"
                required
                options={stockList
                  .filter((s) => s.warehouse_id == transferForm.source_warehouse_id)
                  .map((s) => ({
                    value: s.material_id,
                    label: s.material_name,
                    sublabel: s.material_type,
                    badge: `Avail: ${s.available_quantity}`
                  }))}
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Transfer Quantity</label>
              <input
                type="number"
                step="0.001"
                value={transferForm.quantity}
                onChange={(e) => setTransferForm({ ...transferForm, quantity: e.target.value })}
                placeholder="Quantity to move"
                className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Transfer Note / Dispatch Ref</label>
            <input
              type="text"
              value={transferForm.remarks}
              onChange={(e) => setTransferForm({ ...transferForm, remarks: e.target.value })}
              placeholder="e.g. Shopfloor replenishment batch #24"
              className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
            />
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
                onChange={(e) => setOpeningForm({ ...openingForm, material_type: e.target.value })}
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
                  const sel = stockList.find(
                    (s) => s.material_type === openingForm.material_type && String(s.material_id) === String(val)
                  );
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
                options={stockList
                  .filter((s) => s.material_type === openingForm.material_type)
                  .map((s) => ({
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
        onStockUpdated={() => fetchStock()}
        rawMaterials={rawMaterials}
        finishedGoods={finishedGoods}
      />
    </div>
  );
}
