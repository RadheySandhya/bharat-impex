import React, { useState, useEffect, useMemo } from 'react';
import Icon from '../../components/UI/Icon';
import { DataTable } from '../../components/UI/DataTable';
import { StatusBadge } from '../../components/UI/StatusBadge';
import { DateRangePicker } from '../../components/UI/DateRangePicker';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export function Rejections() {
  const [activeTab, setActiveTab] = useState('rework_queue'); // 'rework_queue' | 'foundry_scrap' | 'defect_catalog'
  const [dateRange, setDateRange] = useState({ from: '', to: '', preset: 'ALL_TIME' });
  const [scrapStock, setScrapStock] = useState([]);
  const [reasons, setReasons] = useState([]);
  const [reworkQueue, setReworkQueue] = useState(() => {
    try {
      const saved = localStorage.getItem('bharat_rework_queue');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [processes, setProcesses] = useState([]);
  const [selectedStageFilter, setSelectedStageFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const { success, error } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [stockRes, bundleRes] = await Promise.all([
        api.stock.getAll({ material_type: 'SCRAP' }),
        api.settings.getBundle(),
      ]);

      if (stockRes?.data) setScrapStock(stockRes.data);
      if (bundleRes?.data?.rejection_reasons) setReasons(bundleRes.data.rejection_reasons);
      if (bundleRes?.data?.processes) {
        setProcesses(bundleRes.data.processes);
      }
    } catch (err) {
      error('Failed to load rejection & scrap records: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle Mark Rework Completed
  const handleCompleteRework = (item) => {
    setReworkQueue((prev) => {
      const updated = prev.map((r) => (r.id === item.id ? { ...r, status: 'FIXED_RETURNED' } : r));
      try {
        localStorage.setItem('bharat_rework_queue', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    success(`Rework completed for Batch #${item.batch_no} (${item.qty} PCS returned to production pipeline)`);
  };

  // KPI Calculations
  const metrics = useMemo(() => {
    const activeReworks = reworkQueue.filter((r) => r.status === 'IN_REWORK');
    const totalReworkQty = activeReworks.reduce((sum, r) => sum + Number(r.qty || 0), 0);
    const totalScrapKg = scrapStock.reduce((sum, s) => sum + Number(s.quantity || 0), 0);
    const totalScrapVal = scrapStock.reduce((sum, s) => sum + Number(s.quantity || 0) * Number(s.unit_price || 0), 0);

    return {
      activeReworkCount: activeReworks.length,
      totalReworkQty,
      totalScrapKg: totalScrapKg.toFixed(2),
      totalScrapVal: totalScrapVal.toLocaleString('en-IN', { maximumFractionDigits: 2 }),
      defectReasonsCount: reasons.length
    };
  }, [reworkQueue, scrapStock, reasons]);

  const filteredReworkQueue = useMemo(() => {
    if (selectedStageFilter === 'ALL') return reworkQueue;
    return reworkQueue.filter(
      (r) => r.detected_stage === selectedStageFilter || r.rework_stage === selectedStageFilter
    );
  }, [reworkQueue, selectedStageFilter]);

  // Table columns for Active Stage Rework Queue
  const reworkColumns = [
    {
      header: 'Date',
      key: 'date_logged',
      render: (d) => <span className="text-slate-600 text-xs font-mono">{d}</span>,
    },
    {
      header: 'Batch No',
      key: 'batch_no',
      render: (b) => <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">#{b}</span>,
    },
    {
      header: 'SKU Item Name',
      key: 'item_name',
      render: (name) => <span className="font-bold text-slate-900 text-xs">{name}</span>,
    },
    {
      header: 'Defect Stage',
      key: 'detected_stage',
      render: (stg) => (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
          {stg}
        </span>
      ),
    },
    {
      header: 'Defect Reason & Root Cause',
      key: 'defect_reason',
      render: (r) => <span className="text-slate-700 text-xs font-medium">{r}</span>,
    },
    {
      header: 'Assigned Rework Stage',
      key: 'rework_stage',
      render: (rs) => (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
          {rs}
        </span>
      ),
    },
    {
      header: 'Rework Qty',
      key: 'qty',
      align: 'right',
      render: (q) => <span className="font-mono font-bold text-slate-900">{q} PCS</span>,
    },
    {
      header: 'Status',
      key: 'status',
      render: (s) => (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
            s === 'FIXED_RETURNED'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}
        >
          {s === 'FIXED_RETURNED' ? 'Returned to Pipeline' : 'In Rework Repair'}
        </span>
      ),
    },
    {
      header: 'Action',
      key: 'id',
      align: 'center',
      render: (_, row) =>
        row.status === 'IN_REWORK' ? (
          <button
            onClick={() => handleCompleteRework(row)}
            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
          >
            <Icon name="check" size="xs" ariaHidden={true} />
            <span>Mark Fixed</span>
          </button>
        ) : (
          <span className="text-slate-400 text-xs">—</span>
        ),
    },
  ];

  // Table columns for Scrap Stock
  const scrapColumns = [
    {
      header: 'Scrap Code',
      key: 'material_code',
      render: (code) => <span className="font-mono font-bold text-slate-900">{code}</span>,
    },
    {
      header: 'Scrap Material Category',
      key: 'material_name',
      render: (name) => <span className="font-semibold text-slate-900">{name}</span>,
    },
    {
      header: 'Warehouse Store',
      key: 'warehouse_name',
    },
    {
      header: 'Accumulated Stock (KG)',
      key: 'quantity',
      align: 'right',
      render: (qty, row) => (
        <span className="font-mono font-bold text-emerald-700 text-sm">
          {Number(qty).toLocaleString()} {row.unit_code || 'KG'}
        </span>
      ),
    },
    {
      header: 'Scrap Valuation Rate (₹)',
      key: 'unit_price',
      align: 'right',
      render: (p) => <span className="font-mono text-slate-700">₹{Number(p).toFixed(2)}</span>,
    },
    {
      header: 'Total Scrap Value (₹)',
      key: 'id',
      align: 'right',
      render: (_, row) => (
        <span className="font-mono font-bold text-slate-900">
          ₹{(Number(row.quantity) * Number(row.unit_price || 0)).toLocaleString()}
        </span>
      ),
    },
  ];

  const reasonColumns = [
    {
      header: 'Defect Code',
      key: 'reason_code',
      render: (code) => <span className="font-mono font-bold text-slate-900">{code}</span>,
    },
    {
      header: 'Defect Name',
      key: 'reason_name',
      render: (name) => <span className="font-semibold text-slate-900">{name}</span>,
    },
    {
      header: 'Manufacturing Stage Category',
      key: 'category',
      render: (cat) => <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">{cat}</span>,
    },
    {
      header: 'Description',
      key: 'description',
      render: (desc) => <span className="text-slate-500 text-xs">{desc || '—'}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-wide flex items-center gap-2">
            <Icon name="shieldalert" size="lg" className="text-rose-600" ariaHidden={true} />
            <span>Rejections & Rework Management Hub</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Real-time stage reworks (minor repairs) • Foundry scrap for furnace remelt • Defect root cause analytics
          </p>
        </div>

        {/* Date Range Picker */}
        <div className="flex items-center gap-2 flex-wrap">
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
          />
        </div>
      </div>

      {/* KPI Cards Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Active Stage Reworks</span>
            <Icon name="refresh" size="sm" ariaHidden={true} />
          </div>
          <p className="text-2xl font-black text-slate-900">{metrics.totalReworkQty} <span className="text-xs text-slate-400 font-semibold">PCS</span></p>
          <p className="text-[11px] text-amber-600 font-semibold mt-0.5">{metrics.activeReworkCount} batches in minor repair</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-rose-600 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Foundry Scrap Stock</span>
            <Icon name="recycle" size="sm" ariaHidden={true} />
          </div>
          <p className="text-2xl font-black text-slate-900">{metrics.totalScrapKg} <span className="text-xs text-slate-400 font-semibold">KG</span></p>
          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Ready for furnace remelting</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Scrap Brass Value</span>
            <Icon name="calculator" size="sm" ariaHidden={true} />
          </div>
          <p className="text-2xl font-black text-emerald-700">₹{metrics.totalScrapVal}</p>
          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Recoverable material asset</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-blue-600 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Defect Reasons Catalog</span>
            <Icon name="layers" size="sm" ariaHidden={true} />
          </div>
          <p className="text-2xl font-black text-slate-900">{metrics.defectReasonsCount}</p>
          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Standardized failure modes</p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 max-w-fit">
        <button
          onClick={() => setActiveTab('rework_queue')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'rework_queue'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Icon name="refresh" size="xs" ariaHidden={true} />
          <span>1. Stage Rework Queue (Minor Defects)</span>
          {metrics.activeReworkCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold">
              {metrics.activeReworkCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('foundry_scrap')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'foundry_scrap'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Icon name="recycle" size="xs" ariaHidden={true} />
          <span>2. Foundry Scrap & Recast (Furnace Remelt)</span>
        </button>

        <button
          onClick={() => setActiveTab('defect_catalog')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'defect_catalog'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Icon name="shieldalert" size="xs" ariaHidden={true} />
          <span>3. Defect Reasons Master</span>
        </button>
      </div>

      {/* Tab 1: Stage Rework Queue */}
      {activeTab === 'rework_queue' && (
        <div className="space-y-3">
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex items-center justify-between text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <Icon name="info" size="sm" className="text-amber-700" ariaHidden={true} />
              <span>
                <strong>Stage Rework Policy:</strong> Items with recoverable flaws (e.g. minor buffing patch, plating spot, re-threading) are directed to the designated supervisor. Once corrected, mark them fixed to restore them to the active production batch.
              </span>
            </div>
          </div>

          {processes.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">Filter Stage:</span>
              <button
                onClick={() => setSelectedStageFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedStageFilter === 'ALL'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Stages
              </button>
              {processes.map((proc, idx) => (
                <button
                  key={proc.id}
                  onClick={() => setSelectedStageFilter(proc.process_name)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    selectedStageFilter === proc.process_name
                      ? 'bg-blue-600 text-white shadow-xs font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  #{idx + 1} {proc.process_name}
                </button>
              ))}
            </div>
          )}

          <DataTable
            columns={reworkColumns}
            data={filteredReworkQueue}
            loading={false}
            searchPlaceholder="Search rework queue by batch, SKU or reason..."
          />
        </div>
      )}

      {/* Tab 2: Foundry Scrap & Recast Inventory */}
      {activeTab === 'foundry_scrap' && (
        <div className="space-y-3">
          <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 flex items-center justify-between text-xs text-blue-900">
            <div className="flex items-center gap-2">
              <Icon name="info" size="sm" className="text-blue-700" ariaHidden={true} />
              <span>
                <strong>Foundry Recast Policy:</strong> Unrecoverable castings or heavily defective parts are weighed and logged as scrap metal. Scrap is transferred directly to the furnace yard for remelting back into raw brass ingots.
              </span>
            </div>
          </div>

          <DataTable
            columns={scrapColumns}
            data={scrapStock}
            loading={loading}
            searchPlaceholder="Search scrap metal stock..."
          />
        </div>
      )}

      {/* Tab 3: Defect Reasons Master */}
      {activeTab === 'defect_catalog' && (
        <div className="space-y-3">
          <DataTable
            columns={reasonColumns}
            data={reasons}
            loading={loading}
            searchPlaceholder="Search defect catalog..."
          />
        </div>
      )}
    </div>
  );
}

export default Rejections;
