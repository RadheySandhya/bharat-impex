import React, { useState, useEffect, useMemo } from 'react';
import Icon from '../../components/UI/Icon';
import { DataTable } from '../../components/UI/DataTable';
import { DateRangePicker } from '../../components/UI/DateRangePicker';
import { Modal } from '../../components/UI/Modal';
import { RejectionProcessFlow } from '../Production/RejectionProcessFlow';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { RejectionTrackingSheet } from './RejectionTrackingSheet';

const DISP = {
  MINOR: { label: 'Minor Rework', cls: 'bg-blue-50 text-blue-800 border-blue-200', dot: 'bg-blue-600' },
  FURNACE: { label: 'Furnace', cls: 'bg-rose-50 text-rose-800 border-rose-200', dot: 'bg-rose-600' },
};

const STATUS = {
  OPEN: { label: 'In Process', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  COMPLETED: { label: 'Completed', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const fmtDate = (s) => {
  if (!s) return '—';
  const d = new Date(String(s).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export function Rejections() {
  const [activeTab, setActiveTab] = useState('tracking'); // tracking | map | foundry_scrap | defect_catalog
  const [dateRange, setDateRange] = useState({ from: '', to: '', preset: 'ALL_TIME' });
  const [lots, setLots] = useState([]);
  const [lotsLoading, setLotsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dispFilter, setDispFilter] = useState('PENDING');
  const [processes, setProcesses] = useState([]);
  const [decideLot, setDecideLot] = useState(null);
  const [decideForm, setDecideForm] = useState({ minor: '0', return_stage_key: '', remarks: '', operator: '', furnace_kg: '' });
  const [deciding, setDeciding] = useState(false);
  const [routes, setRoutes] = useState({});
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [scrapStock, setScrapStock] = useState([]);
  const [reasons, setReasons] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [advanceLot, setAdvanceLot] = useState(null);
  const [advanceForm, setAdvanceForm] = useState({ remarks: '', operator: '', scrap_weight_kg: '', warehouse_id: '' });
  const [advancing, setAdvancing] = useState(false);
  const { success, error } = useToast();
  const { hasPermission } = useAuth();

  const fetchMasters = async () => {
    setLoading(true);
    try {
      const [stockRes, bundleRes, routeRes] = await Promise.all([
        api.stock.getAll({ material_type: 'SCRAP' }),
        api.settings.getBundle(),
        api.rejections.getRoutes(),
      ]);
      if (routeRes?.data) setRoutes(routeRes.data);
      if (stockRes?.data) setScrapStock(stockRes.data);
      if (bundleRes?.data?.rejection_reasons) setReasons(bundleRes.data.rejection_reasons);
      if (bundleRes?.data?.warehouses) setWarehouses(bundleRes.data.warehouses);
      if (bundleRes?.data?.processes) setProcesses(bundleRes.data.processes);
    } catch (err) {
      error('Failed to load rejection & scrap records: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLots = async () => {
    setLotsLoading(true);
    try {
      const res = await api.rejections.getLots({
        status: statusFilter,
        from_date: dateRange.from,
        to_date: dateRange.to,
      });
      setLots(res?.data || []);
    } catch (err) {
      error('Failed to load rejection lots: ' + err.message);
    } finally {
      setLotsLoading(false);
    }
  };

  useEffect(() => { fetchMasters(); }, []);
  useEffect(() => { fetchLots(); }, [statusFilter, dateRange.from, dateRange.to]);

  const visibleLots = useMemo(() => {
    const q = search.trim().toLowerCase();
    const byRoute = lots.filter((l) => l.disposition === dispFilter);
    if (!q) return byRoute;
    return byRoute.filter((l) =>
      [l.lot_number, l.batch_no, l.item_name, l.defect_reason, l.source_stage_name, l.current_step_name]
        .some((v) => String(v || '').toLowerCase().includes(q))
    );
  }, [lots, search, dispFilter]);

  const metrics = useMemo(() => {
    const open = lots.filter((l) => l.status === 'OPEN');
    const pendingOpen = open.filter((l) => l.disposition === 'PENDING');
    const minorOpen = open.filter((l) => l.disposition === 'MINOR');
    const furnaceOpen = open.filter((l) => l.disposition === 'FURNACE');
    const totalScrapKg = scrapStock.reduce((sum, s) => sum + Number(s.quantity || 0), 0);
    const totalScrapVal = scrapStock.reduce((sum, s) => sum + Number(s.quantity || 0) * Number(s.unit_price || 0), 0);
    return {
      pendingQty: pendingOpen.reduce((s, l) => s + l.quantity, 0),
      pendingLots: pendingOpen.length,
      minorQty: minorOpen.reduce((s, l) => s + l.quantity, 0),
      minorLots: minorOpen.length,
      furnaceQty: furnaceOpen.reduce((s, l) => s + l.quantity, 0),
      furnaceKg: furnaceOpen.reduce((s, l) => s + l.scrap_weight_kg, 0),
      furnaceLots: furnaceOpen.length,
      totalScrapKg,
      totalScrapVal,
    };
  }, [lots, scrapStock]);

  // SKU-tracking stage keys (same rule as the sheet): process_code lowercased, non-alphanumerics -> "_"
  const stageOptions = useMemo(() => processes.map((p, i) => ({
    key: p.process_code ? String(p.process_code).toLowerCase().replace(/[^a-z0-9]/g, '_') : `proc_${p.id || i + 1}`,
    name: p.process_name,
  })), [processes]);

  const openDecide = (lot) => {
    setDecideLot(lot);
    setDecideForm({ minor: '0', return_stage_key: lot.source_stage_key || stageOptions[0]?.key || '', remarks: '', operator: '', furnace_kg: '' });
  };

  const submitDecide = async (e) => {
    e?.preventDefault?.();
    if (!decideLot) return;
    const total = Number(decideLot.quantity);
    const minor = Number(decideForm.minor) || 0;
    const furnace = +(total - minor).toFixed(3);
    if (minor < 0 || furnace < 0) return error('Rework + Furnace must equal the lot quantity.');
    const stage = stageOptions.find((s) => s.key === decideForm.return_stage_key);
    setDeciding(true);
    try {
      const res = await api.rejections.decideLot({
        id: decideLot.id,
        minor_qty: minor,
        furnace_qty: furnace,
        return_stage_key: minor > 0 ? decideForm.return_stage_key : '',
        return_stage_name: minor > 0 ? (stage?.name || '') : '',
        remarks: decideForm.remarks,
        operator: decideForm.operator,
        furnace_weight_kg: furnace > 0 && Number(decideForm.furnace_kg) > 0 ? Number(decideForm.furnace_kg) : undefined,
      });
      success(res?.message || 'Decision saved.');
      setDecideLot(null);
      fetchLots();
    } catch (err) {
      error(err.message || 'Could not save the decision.');
    } finally {
      setDeciding(false);
    }
  };

  const openAdvance = (lot) => {
    if (lot.disposition === 'PENDING' && lot.is_last_step) {
      openDecide(lot);
      return;
    }
    setAdvanceLot(lot);
    setAdvanceForm({
      remarks: '',
      operator: '',
      scrap_weight_kg: lot.scrap_weight_kg ? String(lot.scrap_weight_kg) : '',
      warehouse_id: warehouses[0] ? String(warehouses[0].id) : '',
    });
  };

  const submitAdvance = async (e) => {
    e?.preventDefault?.();
    if (!advanceLot) return;
    const finishingFurnace = advanceLot.is_last_step && advanceLot.disposition === 'FURNACE';
    if (finishingFurnace && !(Number(advanceForm.scrap_weight_kg) > 0)) {
      error('Enter the scrap weight in kg.');
      return;
    }
    setAdvancing(true);
    try {
      const res = await api.rejections.advanceLot({
        id: advanceLot.id,
        remarks: advanceForm.remarks,
        operator: advanceForm.operator,
        scrap_weight_kg: advanceLot.disposition === 'FURNACE' && advanceForm.scrap_weight_kg ? Number(advanceForm.scrap_weight_kg) : undefined,
        warehouse_id: finishingFurnace && advanceForm.warehouse_id ? Number(advanceForm.warehouse_id) : undefined,
      });
      success(res?.message || 'Lot updated.');
      setAdvanceLot(null);
      fetchLots();
      if (finishingFurnace) fetchMasters();
    } catch (err) {
      error(err.message || 'Could not move the lot.');
    } finally {
      setAdvancing(false);
    }
  };

  const cancelLot = async (lot) => {
    const reason = window.prompt(`Cancel rejection lot ${lot.lot_number}? Enter a reason:`);
    if (reason === null) return;
    try {
      await api.rejections.cancelLot({ id: lot.id, remarks: reason });
      success(`Lot ${lot.lot_number} cancelled.`);
      fetchLots();
    } catch (err) {
      error(err.message || 'Could not cancel the lot.');
    }
  };

  // Table columns for Scrap Stock
  const scrapColumns = [
    { header: 'Scrap Code', key: 'material_code', render: (code) => <span className="font-mono font-bold text-slate-900">{code}</span> },
    { header: 'Scrap Material', key: 'material_name', render: (name) => <span className="font-semibold text-slate-900">{name}</span> },
    { header: 'Godown', key: 'warehouse_name' },
    {
      header: 'Stock', key: 'quantity', align: 'right',
      render: (qty, row) => <span className="font-mono font-bold text-emerald-700 text-sm">{Number(qty).toLocaleString()} {row.unit_code || 'KG'}</span>,
    },
    { header: 'Rate (₹)', key: 'unit_price', align: 'right', render: (p) => <span className="font-mono text-slate-700">₹{Number(p).toFixed(2)}</span> },
    {
      header: 'Value (₹)', key: 'id', align: 'right',
      render: (_, row) => <span className="font-mono font-bold text-slate-900">₹{(Number(row.quantity) * Number(row.unit_price || 0)).toLocaleString()}</span>,
    },
  ];

  const reasonColumns = [
    { header: 'Defect Code', key: 'reason_code', render: (code) => <span className="font-mono font-bold text-slate-900">{code}</span> },
    { header: 'Defect Name', key: 'reason_name', render: (name) => <span className="font-semibold text-slate-900">{name}</span> },
    {
      header: 'Stage Category', key: 'category',
      render: (cat) => <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">{cat}</span>,
    },
    { header: 'Description', key: 'description', render: (desc) => <span className="text-slate-500 text-xs">{desc || '—'}</span> },
  ];

  const tabBtn = (key, label, icon, badge) => (
    <button
      type="button"
      onClick={() => setActiveTab(key)}
      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
        activeTab === key ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80' : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      <Icon name={icon} size="xs" ariaHidden={true} />
      <span>{label}</span>
      {badge > 0 && <span className="px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">{badge}</span>}
    </button>
  );

  const finishingFurnace = advanceLot && advanceLot.is_last_step && advanceLot.disposition === 'FURNACE';
  const nextStepName = advanceLot && !advanceLot.is_last_step ? advanceLot.steps[advanceLot.current_step + 1]?.name : null;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-wide flex items-center gap-2">
            <Icon name="shieldalert" size="lg" className="text-rose-600" ariaHidden={true} />
            <span>Rejection Tracking & Scrap Hub</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Every rejection from SKU Tracking is split into Minor Rework and Furnace lots and tracked step by step.
          </p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">In Pipeline</span>
          <p className="text-2xl font-black text-amber-600">{metrics.pendingQty} <span className="text-xs text-slate-400 font-semibold">PCS</span></p>
          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">{metrics.pendingLots} lots awaiting decision</p>
        </div>
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Rework (open)</span>
          <p className="text-2xl font-black text-blue-700">{metrics.minorQty} <span className="text-xs text-slate-400 font-semibold">PCS</span></p>
          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">{metrics.minorLots} lots being repaired</p>
        </div>
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Furnace (open)</span>
          <p className="text-2xl font-black text-rose-700">{metrics.furnaceQty} <span className="text-xs text-slate-400 font-semibold">PCS</span></p>
          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">{metrics.furnaceLots} lots • ≈ {metrics.furnaceKg.toFixed(2)} kg</p>
        </div>
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Scrap Stock</span>
          <p className="text-2xl font-black text-slate-900">{metrics.totalScrapKg.toFixed(2)} <span className="text-xs text-slate-400 font-semibold">KG</span></p>
          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Worth ₹{metrics.totalScrapVal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 max-w-full overflow-x-auto w-fit">
        {tabBtn('tracking', '1. Rejection Tracking', 'refresh', metrics.pendingLots + metrics.minorLots + metrics.furnaceLots)}
        {tabBtn('map', '2. Rejection Process Map', 'layers', 0)}
        {tabBtn('foundry_scrap', '3. Scrap Stock', 'recycle', 0)}
        {tabBtn('defect_catalog', '4. Defect Reasons', 'shieldalert', 0)}
      </div>

      {/* Tab 1: Rejection lot tracking */}
      {activeTab === 'tracking' && (
        <div className="space-y-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
              {[['OPEN', 'In Process'], ['COMPLETED', 'Completed'], ['CANCELLED', 'Cancelled'], ['ALL', 'All']].map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setStatusFilter(v)}
                  className={`px-2.5 py-1 rounded-md cursor-pointer ${statusFilter === v ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
              {[
                ['PENDING', `Pipeline (${lots.filter((x) => x.disposition === 'PENDING' && x.status === 'OPEN').length} awaiting)`],
                ['MINOR', `Rework (${lots.filter((x) => x.disposition === 'MINOR' && x.status === 'OPEN').length} open)`],
                ['FURNACE', `Furnace (${lots.filter((x) => x.disposition === 'FURNACE' && x.status === 'OPEN').length} open)`],
              ].map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setDispFilter(v)}
                  className={`px-2.5 py-1 rounded-md cursor-pointer ${
                    dispFilter === v
                      ? (v === 'FURNACE' ? 'bg-rose-600 text-white font-bold' : v === 'MINOR' ? 'bg-blue-600 text-white font-bold' : 'bg-amber-500 text-white font-bold')
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search lot, batch, item, reason, step..."
              className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
            />
            <button type="button" onClick={fetchLots} className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-xs font-semibold cursor-pointer">
              Refresh
            </button>
          </div>

          <RejectionTrackingSheet
            lots={visibleLots}
            route={routes[dispFilter === 'PENDING' ? 'COMMON' : dispFilter]}
            disposition={dispFilter}
            canProcess={hasPermission('rejections.process')}
            canCancel={hasPermission('rejections.cancel')}
            onAdvance={openAdvance}
            onCancel={cancelLot}
          />
        </div>
      )}

      {/* Tab 2: Rejection process map */}
      {activeTab === 'map' && <RejectionProcessFlow />}

      {/* Tab 3: Scrap stock */}
      {activeTab === 'foundry_scrap' && (
        <div className="space-y-3">
          <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 text-xs text-blue-900">
            Completing a <strong>Furnace</strong> lot books its weighed scrap here, in the godown chosen at completion.
          </div>
          <DataTable columns={scrapColumns} data={scrapStock} loading={loading} searchPlaceholder="Search scrap stock..." />
        </div>
      )}

      {/* Tab 4: Defect reasons */}
      {activeTab === 'defect_catalog' && (
        <DataTable columns={reasonColumns} data={reasons} loading={loading} searchPlaceholder="Search defect catalog..." />
      )}


      {/* Decision at the end of the pipeline: split into Rework and Furnace */}
      <Modal
        isOpen={!!decideLot}
        onClose={() => setDecideLot(null)}
        title={decideLot ? `Decide: ${decideLot.lot_number}` : ''}
        footer={
          <>
            <button type="button" onClick={() => setDecideLot(null)} className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700">Cancel</button>
            <button type="submit" form="decide-form" disabled={deciding} className="px-4 py-2 rounded-xl bg-[#007AFF] hover:bg-[#0A6CF0] disabled:opacity-60 text-xs font-semibold text-white">
              {deciding ? 'Saving...' : 'Save Decision'}
            </button>
          </>
        }
      >
        {decideLot && (() => {
          const total = Number(decideLot.quantity);
          const minor = Number(decideForm.minor) || 0;
          const furnace = Math.max(0, +(total - minor).toFixed(3));
          return (
            <form id="decide-form" onSubmit={submitDecide} className="space-y-4 text-sm">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="font-semibold text-slate-900">{decideLot.item_name}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  #{decideLot.batch_no} • rejected at {decideLot.source_stage_name || '—'} • {decideLot.defect_reason || 'No reason'}
                </div>
                <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">{total} <span className="text-sm font-medium text-slate-500">pcs to decide</span></div>
              </div>

              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setDecideForm({ ...decideForm, minor: String(total) })} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 cursor-pointer">All Rework</button>
                <button type="button" onClick={() => setDecideForm({ ...decideForm, minor: '0' })} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 cursor-pointer">All Furnace</button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-3">
                  <label htmlFor="dec-minor" className="block text-xs font-semibold text-blue-900 mb-1">Rework (repairable)</label>
                  <input
                    id="dec-minor"
                    type="number"
                    min="0"
                    max={total}
                    step="any"
                    value={decideForm.minor}
                    onChange={(e) => {
                      const v = Math.max(0, Math.min(total, Number(e.target.value) || 0));
                      setDecideForm({ ...decideForm, minor: e.target.value === '' ? '' : String(v) });
                    }}
                    className="w-full rounded-xl px-3 py-2 border border-blue-300 text-lg font-bold tabular-nums"
                  />
                </div>
                <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-3">
                  <label htmlFor="dec-furnace" className="block text-xs font-semibold text-rose-900 mb-1">Furnace (melt)</label>
                  <input
                    id="dec-furnace"
                    type="number"
                    min="0"
                    max={total}
                    step="any"
                    value={furnace}
                    onChange={(e) => {
                      const f = Math.max(0, Math.min(total, Number(e.target.value) || 0));
                      setDecideForm({ ...decideForm, minor: String(+(total - f).toFixed(3)) });
                    }}
                    className="w-full rounded-xl px-3 py-2 border border-rose-300 text-lg font-bold tabular-nums"
                  />
                  <label htmlFor="dec-kg" className="block text-[11px] font-semibold text-rose-900 mt-2 mb-0.5">Furnace weight (kg)</label>
                  <input
                    id="dec-kg"
                    type="number"
                    min="0"
                    step="0.001"
                    disabled={furnace <= 0}
                    value={decideForm.furnace_kg}
                    onChange={(e) => setDecideForm({ ...decideForm, furnace_kg: e.target.value })}
                    placeholder={`≈ ${(furnace * Number(decideLot.avg_weight || 0)).toFixed(3)}`}
                    className="w-full rounded-lg px-2.5 py-1.5 border border-rose-300 text-sm font-semibold disabled:opacity-50"
                  />
                </div>
              </div>

              {minor > 0 && (
                <div>
                  <label htmlFor="dec-stage" className="block text-xs font-semibold text-slate-700 mb-1">After rework, return the {minor} pcs to stage</label>
                  <select
                    id="dec-stage"
                    value={decideForm.return_stage_key}
                    onChange={(e) => setDecideForm({ ...decideForm, return_stage_key: e.target.value })}
                    className="w-full rounded-xl px-3 py-2 border border-slate-300"
                  >
                    {stageOptions.map((s) => (
                      <option key={s.key} value={s.key}>{s.name}{s.key === decideLot.source_stage_key ? ' (where rejected)' : ''}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="dec-op" className="block text-xs font-semibold text-slate-700 mb-1">Decided by</label>
                  <input id="dec-op" value={decideForm.operator} onChange={(e) => setDecideForm({ ...decideForm, operator: e.target.value })} placeholder="Supervisor" className="w-full rounded-xl px-3 py-2 border border-slate-300" />
                </div>
                <div>
                  <label htmlFor="dec-rem" className="block text-xs font-semibold text-slate-700 mb-1">Remarks</label>
                  <input id="dec-rem" value={decideForm.remarks} onChange={(e) => setDecideForm({ ...decideForm, remarks: e.target.value })} placeholder="Optional" className="w-full rounded-xl px-3 py-2 border border-slate-300" />
                </div>
              </div>
            </form>
          );
        })()}
      </Modal>

      {/* Advance / complete lot */}
      <Modal
        isOpen={!!advanceLot}
        onClose={() => setAdvanceLot(null)}
        title={advanceLot ? `${advanceLot.is_last_step ? 'Complete' : 'Move'} Lot ${advanceLot.lot_number}` : ''}
        footer={
          <>
            <button type="button" onClick={() => setAdvanceLot(null)} className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700">
              Cancel
            </button>
            <button
              type="submit"
              form="advance-lot-form"
              disabled={advancing}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-xs font-bold text-white"
            >
              {advancing ? 'Saving...' : advanceLot?.is_last_step ? 'Complete Lot' : `Move to ${nextStepName || 'next step'}`}
            </button>
          </>
        }
      >
        {advanceLot && (
          <form id="advance-lot-form" onSubmit={submitAdvance} className="space-y-3 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="font-bold text-slate-900">{advanceLot.item_name} • {advanceLot.quantity} PCS</div>
              <div className="text-slate-500 mt-0.5">
                Now at <strong>{advanceLot.current_step_name}</strong>
                {nextStepName ? <> → next: <strong>{nextStepName}</strong></> : null}
              </div>
              {advanceLot.is_last_step && (
                <div className="mt-1.5 font-semibold text-emerald-700">
                  {advanceLot.disposition === 'FURNACE'
                    ? 'Completing books the scrap weight into Scrap stock.'
                    : `Completing returns ${advanceLot.quantity} PCS to ${advanceLot.return_stage_name || 'the production stage'} in SKU Tracking.`}
                </div>
              )}
            </div>

            {advanceLot.disposition === 'FURNACE' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1" htmlFor="adv-kg">Scrap weight (kg)</label>
                  <input
                    id="adv-kg"
                    type="number"
                    step="0.001"
                    min="0"
                    value={advanceForm.scrap_weight_kg}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, scrap_weight_kg: e.target.value })}
                    className="w-full rounded-xl px-3 py-2 border border-slate-300 font-mono font-bold"
                    required={finishingFurnace}
                  />
                </div>
                {finishingFurnace && (
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1" htmlFor="adv-wh">Store scrap in godown</label>
                    <select
                      id="adv-wh"
                      value={advanceForm.warehouse_id}
                      onChange={(e) => setAdvanceForm({ ...advanceForm, warehouse_id: e.target.value })}
                      className="w-full rounded-xl px-3 py-2 border border-slate-300 font-semibold"
                    >
                      {warehouses.map((w) => <option key={w.id} value={w.id}>{w.warehouse_name}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-600 mb-1" htmlFor="adv-op">Done by</label>
                <input
                  id="adv-op"
                  value={advanceForm.operator}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, operator: e.target.value })}
                  placeholder="Supervisor / operator"
                  className="w-full rounded-xl px-3 py-2 border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1" htmlFor="adv-rem">Remarks</label>
                <input
                  id="adv-rem"
                  value={advanceForm.remarks}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, remarks: e.target.value })}
                  placeholder="Optional"
                  className="w-full rounded-xl px-3 py-2 border border-slate-300"
                />
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

export default Rejections;
