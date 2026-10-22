import React, { useState, useEffect, useCallback } from 'react';
import Icon from '../../components/UI/Icon';
import { StatusBadge } from '../../components/UI/StatusBadge';
import { Modal } from '../../components/UI/Modal';
import { DateRangePicker } from '../../components/UI/DateRangePicker';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { FullKittingModal } from '../../components/UI/FullKittingModal';

// ── Helpers ──────────────────────────────────────────────────
const fmt = (n, d = 0) =>
  Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: d });

const pctBar = (val, total, color = 'bg-blue-500') => {
  const pct = total > 0 ? Math.min((val / total) * 100, 100) : 0;
  return (
    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
};

const PRIORITY_COLORS = {
  LOW:      'bg-slate-100 text-slate-600 border-slate-200',
  NORMAL:   'bg-blue-50  text-blue-700  border-blue-200',
  HIGH:     'bg-amber-50 text-amber-700 border-amber-200',
  CRITICAL: 'bg-red-50   text-red-700   border-red-200',
};

const STATUS_META = {
  DRAFT:              { label: 'Draft',            color: 'bg-slate-100 text-slate-600' },
  PLANNED:            { label: 'Planned',          color: 'bg-blue-50   text-blue-700' },
  APPROVED:           { label: 'Approved',         color: 'bg-emerald-50 text-emerald-700' },
  PARTIALLY_RELEASED: { label: 'Partial Release',  color: 'bg-amber-50  text-amber-700' },
  FULLY_RELEASED:     { label: 'Fully Released',   color: 'bg-teal-50   text-teal-700' },
  CANCELLED:          { label: 'Cancelled',        color: 'bg-red-50    text-red-700' },
  COMPLETED:          { label: 'Completed',        color: 'bg-violet-50 text-violet-700' },
};

function StatusPill({ status, size = 'xs' }) {
  const m = STATUS_META[status] || { label: status, color: 'bg-slate-100 text-slate-600' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold border text-${size} ${m.color} border-current/20`}>
      {m.label}
    </span>
  );
}

// ── KPI Card ─────────────────────────────────────────────────
function KpiCard({ label, value, unit = 'PCS', icon, color = 'blue', sub }) {
  const colors = {
    blue:   'bg-blue-50   text-blue-600   border-blue-100',
    amber:  'bg-amber-50  text-amber-600  border-amber-100',
    emerald:'bg-emerald-50 text-emerald-600 border-emerald-100',
    violet: 'bg-violet-50 text-violet-600 border-violet-100',
    slate:  'bg-slate-50  text-slate-600  border-slate-100',
    red:    'bg-red-50    text-red-600    border-red-100',
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${colors[color]}`}>
          <Icon name={icon} size="sm" ariaHidden />
        </div>
        {sub && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{sub}</span>}
      </div>
      <p className="text-2xl font-black text-slate-900 leading-none mb-0.5">
        {fmt(value)} <span className="text-sm font-semibold text-slate-400">{unit}</span>
      </p>
      <p className="text-[11px] text-slate-500 font-semibold">{label}</p>
    </div>
  );
}

// ── Planning Row Card ─────────────────────────────────────────
function PlanningCard({ plan, onView, onRelease, onApprove }) {
  const pending    = plan.planned_quantity - plan.released_quantity;
  const relPct     = plan.planned_quantity > 0 ? (plan.released_quantity / plan.planned_quantity) * 100 : 0;
  const prodPct    = plan.released_quantity > 0 ? (plan.produced_quantity / plan.released_quantity) * 100 : 0;
  const canApprove = plan.status === 'PLANNED' || plan.status === 'DRAFT';
  const canRelease = plan.status === 'APPROVED' || plan.status === 'PARTIALLY_RELEASED';

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-slate-300 transition-all p-4 group">
      {/* Header */}
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-mono font-black text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
              {plan.planning_number}
            </span>
            <StatusPill status={plan.status} />
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold border ${PRIORITY_COLORS[plan.priority] || PRIORITY_COLORS.NORMAL}`}>
              {plan.priority}
            </span>
          </div>
          <p className="font-bold text-slate-900 text-sm leading-tight truncate">{plan.product_name}</p>
          <p className="text-[11px] text-slate-400 font-mono">{plan.fg_code}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xl font-black text-slate-900 leading-none">{fmt(plan.planned_quantity)}</p>
          <p className="text-[10px] text-slate-400 font-semibold">{plan.unit_code} planned</p>
        </div>
      </div>

      {/* Quantity breakdown */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        <div className="bg-slate-50 rounded-xl p-2 border border-slate-100">
          <p className="text-sm font-black text-amber-600">{fmt(pending)}</p>
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wide">Pending Planning</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-2 border border-slate-100">
          <p className="text-sm font-black text-blue-600">{fmt(plan.released_quantity)}</p>
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wide">Released</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-2 border border-slate-100">
          <p className="text-sm font-black text-emerald-600">{fmt(plan.produced_quantity)}</p>
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wide">Produced</p>
        </div>
      </div>

      {/* Progress bars */}
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-slate-500 font-semibold">Planning Release</span>
          <span className="font-bold text-slate-700">{relPct.toFixed(0)}% released</span>
        </div>
        {pctBar(plan.released_quantity, plan.planned_quantity, 'bg-blue-500')}
        {plan.released_quantity > 0 && (
          <>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-500 font-semibold">Production Progress</span>
              <span className="font-bold text-slate-700">{prodPct.toFixed(0)}% produced</span>
            </div>
            {pctBar(plan.produced_quantity, plan.released_quantity, 'bg-emerald-500')}
          </>
        )}
      </div>

      {/* Meta */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-3">
        <span>Planning Date: <strong className="text-slate-600">{plan.planning_date}</strong></span>
        {plan.required_date && <span>Required: <strong className="text-red-600">{plan.required_date}</strong></span>}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={() => onView(plan)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer"
        >
          <Icon name="eye" size="xs" ariaHidden /> View
        </button>

        {canApprove && (
          <button
            onClick={() => onApprove(plan)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[11px] font-semibold text-emerald-700 transition-colors cursor-pointer"
          >
            <Icon name="check" size="xs" ariaHidden /> Approve
          </button>
        )}

        {canRelease && pending > 0 && (
          <button
            onClick={() => onRelease(plan)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 border border-blue-700 text-[11px] font-bold text-white transition-colors cursor-pointer"
          >
            <Icon name="play" size="xs" ariaHidden /> Release to SKU Tracking
          </button>
        )}
      </div>
    </div>
  );
}

// ── New Planning Form ─────────────────────────────────────────
function NewPlanningModal({ isOpen, onClose, finishedGoods, units, warehouses, onCreated }) {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fg_id: '', planned_quantity: '', unit_id: 3, warehouse_id: 3,
    priority: 'NORMAL', required_date: '', remarks: '',
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fg_id || !form.planned_quantity) { error('Finished Good and Quantity are required'); return; }
    setLoading(true);
    try {
      const res = await api.planning.create({
        ...form,
        fg_id: Number(form.fg_id),
        planned_quantity: Number(form.planned_quantity),
        unit_id: Number(form.unit_id),
        warehouse_id: Number(form.warehouse_id),
        planning_date: new Date().toISOString().slice(0,10),
      });
      success(`Planning ${res.data?.planning_number} created!`);
      onCreated(res.data);
      onClose();
      setForm({ fg_id:'', planned_quantity:'', unit_id:3, warehouse_id:3, priority:'NORMAL', required_date:'', remarks:'' });
    } catch (err) {
      error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="+ New Production Planning" maxWidth="max-w-2xl"
      footer={
        <>
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer">Cancel</button>
          <button type="submit" form="new-planning-form" disabled={loading} className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-sm disabled:opacity-50 cursor-pointer">
            {loading ? 'Creating...' : 'Create Planning'}
          </button>
        </>
      }
    >
      <form id="new-planning-form" onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Workflow hint */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-blue-800 text-[11px] font-medium">
          <div className="flex items-center gap-2 font-bold mb-1">
            <Icon name="info" size="xs" ariaHidden /> Planning-First Workflow
          </div>
          Creating a planning record does NOT start production. You must Approve → Release to send quantity to SKU Tracking.
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block font-bold text-slate-700 mb-1">Finished Good <span className="text-red-500">*</span></label>
            <select value={form.fg_id} onChange={e => set('fg_id', e.target.value)} required
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option value="">— Select Finished Good —</option>
              {finishedGoods.map(fg => (
                <option key={fg.id} value={fg.id}>[{fg.fg_code}] {fg.product_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Planned Quantity <span className="text-red-500">*</span></label>
            <input type="number" min="1" step="1" value={form.planned_quantity} onChange={e => set('planned_quantity', e.target.value)} required
              placeholder="e.g. 1000"
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Unit</label>
            <select value={form.unit_id} onChange={e => set('unit_id', e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500">
              {units.map(u => <option key={u.id} value={u.id}>{u.unit_code} — {u.unit_name}</option>)}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Required By Date</label>
            <input type="date" value={form.required_date} onChange={e => set('required_date', e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Priority</label>
            <select value={form.priority} onChange={e => set('priority', e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500">
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Output Warehouse</label>
            <select value={form.warehouse_id} onChange={e => set('warehouse_id', e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500">
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.warehouse_name}</option>)}
            </select>
          </div>

          <div className="col-span-2">
            <label className="block font-bold text-slate-700 mb-1">Remarks / Notes</label>
            <textarea value={form.remarks} onChange={e => set('remarks', e.target.value)} rows={2}
              placeholder="Optional planning notes..."
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ── Release Modal with Upfront BOM & Stock Check ───────────────
function ReleaseModal({ isOpen, onClose, plan, onReleased }) {
  const { success, error, warning } = useToast();
  const [qty, setQty]                 = useState('');
  const [remarks, setRemarks]         = useState('');
  const [loading, setLoading]         = useState(false);
  const [kittingLoading, setKittingLoading] = useState(false);
  const [kittingData, setKittingData] = useState(null);
  const [autoKitting, setAutoKitting] = useState(true);
  const [allowOverride, setAllowOverride] = useState(true);

  const pending = plan ? Math.max(0, Number(plan.planned_quantity || 0) - Number(plan.released_quantity || 0)) : 0;

  useEffect(() => {
    if (isOpen && plan) {
      const initialQty = pending > 0 ? String(pending) : '100';
      setQty(initialQty);
      setRemarks('');
      setAllowOverride(true);
      setAutoKitting(true);
      fetchKittingPreview(initialQty);
    } else {
      setKittingData(null);
    }
  }, [isOpen, plan?.id]);

  const fetchKittingPreview = async (targetQty) => {
    if (!plan || !targetQty || Number(targetQty) <= 0) {
      setKittingData(null);
      return;
    }
    setKittingLoading(true);
    try {
      const res = await api.production.getKittingPreview({
        fg_id: plan.fg_id,
        cat_no: plan.fg_code,
        quantity: Number(targetQty),
        warehouse_id: 1, // WH-MAIN
      });
      if (res?.data) {
        setKittingData(res.data);
      }
    } catch (err) {
      console.warn('Failed to fetch kitting preview:', err);
    } finally {
      setKittingLoading(false);
    }
  };

  const handleQtyChange = (val) => {
    setQty(val);
    const num = Number(val);
    if (num > 0) {
      fetchKittingPreview(num);
    } else {
      setKittingData(null);
    }
  };

  if (!plan) return null;

  const hasShortage = Boolean(kittingData?.has_shortage);
  const canSubmit = !hasShortage || allowOverride;

  const handleRelease = async (e) => {
    e.preventDefault();
    const q = Number(qty);
    if (!q || q <= 0) { error('Enter a valid release quantity'); return; }
    if (q > pending)  { error(`Only ${fmt(pending)} units available for release`); return; }
    if (hasShortage && !allowOverride) {
      warning('One or more materials are in shortage. Please check Owner Override to proceed.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.planning.release(plan.id, q, remarks, {
        auto_kitting: autoKitting,
        allow_shortage_override: allowOverride,
        kitting_items: kittingData?.items || []
      });

      const relNum = res.data?.release?.release_number || 'Batch';
      if (res.data?.kitting_results?.length > 0) {
        success(`🎉 ${relNum} — ${q} units released to SKU Tracking with Full Kitting completed!`);
      } else {
        success(`${relNum} — ${q} units released to SKU Tracking!`);
      }

      onReleased(res.data);
      onClose();
    } catch (err) {
      error(err.message || 'Release failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Release Quantity & Material Kitting to SKU Tracking" maxWidth="max-w-2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer">
            Cancel
          </button>
          <button
            type="submit"
            form="release-form"
            disabled={loading || !canSubmit}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-all disabled:opacity-50 ${
              hasShortage
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Releasing & Deducting...</span>
              </>
            ) : hasShortage ? (
              <>
                <Icon name="alert-triangle" size="xs" ariaHidden />
                <span>Proceed & Release to SKU Tracking (Shortage Override)</span>
              </>
            ) : (
              <>
                <Icon name="check" size="xs" ariaHidden />
                <span>Confirm Release & Full Kitting to SKU Tracking</span>
              </>
            )}
          </button>
        </div>
      }
    >
      <form id="release-form" onSubmit={handleRelease} className="space-y-4 text-xs">
        {/* Planning summary */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-xs">{plan.planning_number}</span>
              <StatusPill status={plan.status} />
            </div>
            <span className="text-[10px] text-slate-500 font-bold">Target WH: WH-FG</span>
          </div>
          <p className="font-bold text-slate-900 text-sm">[{plan.fg_code}] {plan.product_name}</p>
          <div className="grid grid-cols-3 gap-2 mt-2 text-center">
            <div className="bg-white rounded-lg p-2 border border-slate-200">
              <p className="font-black text-slate-900">{fmt(plan.planned_quantity)}</p>
              <p className="text-[9px] text-slate-500 font-bold uppercase">Total Planned</p>
            </div>
            <div className="bg-white rounded-lg p-2 border border-slate-200">
              <p className="font-black text-blue-600">{fmt(plan.released_quantity)}</p>
              <p className="text-[9px] text-slate-500 font-bold uppercase">Released</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-2 border border-amber-200">
              <p className="font-black text-amber-700">{fmt(pending)}</p>
              <p className="text-[9px] text-amber-600 font-bold uppercase">Available to Release</p>
            </div>
          </div>
        </div>

        {/* Release quantity */}
        <div>
          <label className="block font-bold text-slate-700 mb-1">
            Release Quantity to SKU Tracking <span className="text-red-500">*</span>
            <span className="text-slate-400 font-normal ml-2">(max: {fmt(pending)} {plan.unit_code})</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number" min="0.001" step="0.001" max={pending}
              value={qty} onChange={e => handleQtyChange(e.target.value)}
              placeholder={`Enter qty (max ${pending})`} required
              className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-black text-base focus:ring-2 focus:ring-blue-500"
            />
            <span className="font-bold text-slate-600 text-sm w-12 text-center">{plan.unit_code}</span>
            <button type="button" onClick={() => handleQtyChange(String(pending))}
              className="px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl text-amber-700 font-bold text-[11px] cursor-pointer whitespace-nowrap">
              All {fmt(pending)}
            </button>
          </div>
        </div>

        {/* ── BOM Raw Material Stock Availability Check ── */}
        <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon name="layers" size="xs" className="text-blue-600" ariaHidden />
              <span className="font-black text-slate-800 uppercase tracking-wider text-[11px]">
                BOM Child Part Stock Check (Full Kitting Preview)
              </span>
            </div>
            {kittingLoading && (
              <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping inline-block" /> Checking store stock...
              </span>
            )}
          </div>

          {kittingData?.items?.length > 0 ? (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2">Part Code</th>
                    <th className="p-2">Child Part Name</th>
                    <th className="p-2 text-right">Required Qty</th>
                    <th className="p-2 text-right">In Store (WH-MAIN)</th>
                    <th className="p-2 text-center whitespace-nowrap min-w-[130px]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {kittingData.items.map((item, idx) => {
                    const reqQty = Number(item.total_required_qty || 0);
                    const availStock = Number(item.available_stock ?? item.current_stock ?? 0);
                    const isShortage = availStock < reqQty;
                    const deficit = reqQty - availStock;
                    return (
                      <tr key={item.rm_id || idx} className={isShortage ? 'bg-red-50/40 hover:bg-red-50/60' : 'hover:bg-slate-50/50'}>
                        <td className="p-2 font-mono font-bold text-slate-700">{item.rm_code}</td>
                        <td className="p-2 text-slate-800">
                          <p className="font-medium">{item.material_name}</p>
                          {item.quantity_per_unit && (
                            <p className="text-[9px] text-slate-400">({item.quantity_per_unit} {item.unit_code}/unit)</p>
                          )}
                        </td>
                        <td className="p-2 font-mono font-black text-right text-slate-900">
                          {fmt(item.total_required_qty, 3)} {item.unit_code}
                        </td>
                        <td className="p-2 font-mono text-right">
                          <span className={isShortage ? 'text-rose-600 font-black' : 'text-slate-800 font-bold'}>
                            {fmt(availStock, 3)}
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold ml-1">{item.unit_code}</span>
                        </td>
                        <td className="p-2 text-center whitespace-nowrap">
                          {isShortage ? (
                            <span 
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-300 shadow-2xs whitespace-nowrap"
                              title={`Shortage of ${fmt(deficit, 2)} ${item.unit_code}`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              <span>Shortage (-{fmt(deficit, 1)})</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs whitespace-nowrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>Available</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : !kittingLoading ? (
            <p className="text-[11px] text-slate-500 italic p-2 bg-slate-50 rounded-lg">
              No custom BOM found. System will calculate fallback child part requirements upon release.
            </p>
          ) : null}

          {/* Shortage Alert & Owner Override */}
          {hasShortage && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 space-y-2 mt-2">
              <div className="flex items-start gap-2 text-amber-900 font-bold text-xs">
                <Icon name="alert-triangle" size="xs" className="text-amber-600 mt-0.5 shrink-0" ariaHidden />
                <div>
                  <p>Store Alert: One or more child parts have insufficient recorded balance.</p>
                  <p className="font-normal text-[11px] text-amber-800 mt-0.5">
                    As the Owner/Manager, you have the choice to proceed and release this batch to SKU Tracking anyway (e.g. if physical stock is already present on the shopfloor pending inward entry).
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer font-bold text-amber-900 text-xs bg-white/80 p-2 rounded-lg border border-amber-200">
                <input
                  type="checkbox"
                  checked={allowOverride}
                  onChange={e => setAllowOverride(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                />
                <span>Owner Override: Allow release to SKU Tracking with Material Shortage</span>
              </label>
            </div>
          )}

          {/* Full Kitting Checkbox */}
          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 text-xs">
              <input
                type="checkbox"
                checked={autoKitting}
                onChange={e => setAutoKitting(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
              />
              <span>Deduct Child Parts upfront from Store (Full Kitting) upon Release</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Release Remarks (Optional)</label>
          <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)}
            placeholder="e.g. Released to Casting furnace 1, shift A..."
            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500" />
        </div>
      </form>
    </Modal>
  );
}

// ── Planning Detail Slide-over ────────────────────────────────
function PlanningDetail({ plan, onClose, onRelease, onApprove, onCancel, onRefresh, onOpenKitting }) {
  if (!plan) return null;
  const pending    = plan.planned_quantity - plan.released_quantity;
  const relPct     = plan.planned_quantity > 0 ? (plan.released_quantity / plan.planned_quantity) * 100 : 0;
  const canApprove = plan.status === 'PLANNED' || plan.status === 'DRAFT';
  const canRelease = (plan.status === 'APPROVED' || plan.status === 'PARTIALLY_RELEASED') && pending > 0;
  const canCancel  = !['CANCELLED','COMPLETED','FULLY_RELEASED'].includes(plan.status);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white border-l border-slate-200 shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-white">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-mono font-black text-sm text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                {plan.planning_number}
              </span>
              <StatusPill status={plan.status} />
              <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${PRIORITY_COLORS[plan.priority]}`}>
                {plan.priority}
              </span>
            </div>
            <h2 className="font-black text-slate-900 text-base leading-tight">{plan.product_name}</h2>
            <p className="text-[11px] text-slate-400 font-mono">{plan.fg_code}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer">
            <Icon name="close" size="sm" ariaHidden />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* Quantity breakdown */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-2xl border border-slate-200 p-4">
            <p className="font-black text-slate-700 uppercase tracking-wider text-[10px] mb-3">Quantity Breakdown</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 flex items-center justify-between bg-white rounded-xl p-3 border border-slate-200">
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Total Planned</p>
                  <p className="text-xl font-black text-slate-900">{fmt(plan.planned_quantity)} <span className="text-xs font-semibold text-slate-400">{plan.unit_code}</span></p>
                </div>
                <Icon name="listordered" size="lg" className="text-slate-300" ariaHidden />
              </div>
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
                <p className="text-[9px] text-amber-600 font-bold uppercase mb-1">Pending Planning</p>
                <p className="text-lg font-black text-amber-700">{fmt(pending)}</p>
                <p className="text-[9px] text-amber-500">{plan.unit_code}</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                <p className="text-[9px] text-blue-600 font-bold uppercase mb-1">Released</p>
                <p className="text-lg font-black text-blue-700">{fmt(plan.released_quantity)}</p>
                <p className="text-[9px] text-blue-500">{plan.unit_code}</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200">
                <p className="text-[9px] text-emerald-600 font-bold uppercase mb-1">Produced</p>
                <p className="text-lg font-black text-emerald-700">{fmt(plan.produced_quantity)}</p>
                <p className="text-[9px] text-emerald-500">{plan.unit_code}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <p className="text-[9px] text-slate-600 font-bold uppercase mb-1">Rejected</p>
                <p className="text-lg font-black text-slate-700">{fmt(plan.rejected_quantity)}</p>
                <p className="text-[9px] text-slate-500">{plan.unit_code}</p>
              </div>
            </div>

            {/* Progress */}
            <div className="mt-4 space-y-2">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Release Progress</span>
                <span className="font-black text-slate-700">{relPct.toFixed(1)}%</span>
              </div>
              {pctBar(plan.released_quantity, plan.planned_quantity, 'bg-blue-500')}
              {plan.released_quantity > 0 && (
                <>
                  <div className="flex justify-between mt-1">
                    <span className="font-semibold text-slate-500">Production Progress</span>
                    <span className="font-black text-slate-700">{plan.released_quantity > 0 ? ((plan.produced_quantity / plan.released_quantity) * 100).toFixed(1) : 0}%</span>
                  </div>
                  {pctBar(plan.produced_quantity, plan.released_quantity, 'bg-emerald-500')}
                </>
              )}
            </div>
          </div>

          {/* Meta details */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
              <p className="text-[9px] text-slate-400 font-bold uppercase">Planning Date</p>
              <p className="font-bold text-slate-800">{plan.planning_date}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
              <p className="text-[9px] text-slate-400 font-bold uppercase">Required By</p>
              <p className={`font-bold ${plan.required_date ? 'text-red-600' : 'text-slate-400'}`}>{plan.required_date || '—'}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
              <p className="text-[9px] text-slate-400 font-bold uppercase">Created By</p>
              <p className="font-bold text-slate-800">{plan.created_by_name || '—'}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
              <p className="text-[9px] text-slate-400 font-bold uppercase">Approved By</p>
              <p className={`font-bold ${plan.approved_by_name ? 'text-emerald-700' : 'text-slate-400'}`}>{plan.approved_by_name || 'Not approved'}</p>
            </div>
          </div>

          {plan.remarks && (
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Remarks</p>
              <p className="text-slate-700 font-medium">{plan.remarks}</p>
            </div>
          )}

          {/* Release History */}
          {plan.releases?.length > 0 && (
            <div>
              <p className="font-black text-slate-700 uppercase tracking-wider text-[10px] mb-2">
                Release History ({plan.releases.length})
              </p>
              <div className="space-y-2">
                {plan.releases.map((r, i) => (
                  <div key={r.id} className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono font-black text-blue-700 text-[10px] bg-white px-1.5 py-0.5 rounded border border-blue-200">
                          #{i + 1} {r.release_number}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${r.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {r.status}
                        </span>
                        {r.rm_deducted ? (
                          <span 
                            onClick={() => onOpenKitting && onOpenKitting(r, plan)}
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 cursor-pointer shadow-2xs"
                            title="Child Part stock deducted upfront. Click to view breakdown."
                          >
                            ✓ RM Kitted
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onOpenKitting && onOpenKitting(r, plan)}
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 cursor-pointer shadow-2xs"
                            title="Deduct child part inventory upfront for this batch"
                          >
                            ⚡ Deduct RM Kitting
                          </button>
                        )}
                      </div>
                      <p className="font-medium text-slate-600">{r.release_date} · by {r.released_by_name}</p>
                      {r.remarks && <p className="text-slate-500 italic mt-0.5">{r.remarks}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-blue-700 text-base leading-none">{fmt(r.release_quantity)}</p>
                      <p className="text-[9px] text-blue-500">{plan.unit_code}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Revision History */}
          {plan.revisions?.length > 0 && (
            <div>
              <p className="font-black text-slate-700 uppercase tracking-wider text-[10px] mb-2">
                Quantity Revisions ({plan.revisions.length})
              </p>
              <div className="space-y-1.5">
                {plan.revisions.map(r => (
                  <div key={r.id} className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex justify-between items-start gap-2">
                    <div>
                      <span className={`font-bold text-[10px] px-1.5 py-0.5 rounded ${r.change_type === 'INCREASE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {r.change_type}
                      </span>
                      <p className="text-slate-600 mt-1">{r.reason}</p>
                      <p className="text-slate-400 text-[10px]">{r.revised_by_name} · {r.created_at}</p>
                    </div>
                    <div className="text-right shrink-0 font-mono">
                      <p className="text-[10px] text-slate-500 line-through">{fmt(r.old_quantity)}</p>
                      <p className="font-black text-slate-900">{fmt(r.new_quantity)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center gap-2 flex-wrap">
          {canApprove && (
            <button onClick={() => onApprove(plan)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer shadow-sm">
              <Icon name="check" size="xs" ariaHidden /> Approve
            </button>
          )}
          {canRelease && (
            <button onClick={() => onRelease(plan)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer shadow-sm">
              <Icon name="play" size="xs" ariaHidden /> Release to SKU Tracking
            </button>
          )}
          {canCancel && (
            <button onClick={() => onCancel(plan)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 border border-slate-200 text-xs font-semibold cursor-pointer ml-auto">
              <Icon name="close" size="xs" ariaHidden /> Cancel Planning
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Planning Page ────────────────────────────────────────
export function Planning() {
  const { success, error, warning } = useToast();

  const [plans,         setPlans]         = useState([]);
  const [stats,         setStats]         = useState({});
  const [finishedGoods, setFinishedGoods] = useState([]);
  const [units,         setUnits]         = useState([]);
  const [warehouses,    setWarehouses]    = useState([]);
  const [loading,       setLoading]       = useState(true);

  // UI state — Default is 'pending' so completed plans don't clutter the view
  const [view,          setView]          = useState('pending'); // pending (default) | released | completed | all
  const [search,        setSearch]        = useState('');
  const [filterStatus,  setFilterStatus]  = useState('');
  const [filterPriority,setFilterPriority]= useState('');
  const [dateRange,     setDateRange]     = useState({ from: '', to: '', preset: 'ALL_TIME' });

  const [isNewOpen,     setIsNewOpen]     = useState(false);
  const [selectedPlan,  setSelectedPlan]  = useState(null);
  const [releasePlan,   setReleasePlan]   = useState(null);
  const [isDetailOpen,  setIsDetailOpen]  = useState(false);
  const [isReleaseOpen, setIsReleaseOpen] = useState(false);
  const [isKittingOpen, setIsKittingOpen] = useState(false);
  const [kittingBatch,  setKittingBatch]  = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, statsRes, fgRes, bundleRes] = await Promise.all([
        api.planning.getAll(),
        api.planning.getStats(),
        api.finishedGoods.getAll(),
        api.settings.getBundle(),
      ]);
      if (plansRes?.data)          setPlans(plansRes.data);
      if (statsRes?.data)          setStats(statsRes.data);
      if (fgRes?.data)             setFinishedGoods(fgRes.data);
      if (bundleRes?.data?.units)  setUnits(bundleRes.data.units);
      if (bundleRes?.data?.warehouses) setWarehouses(bundleRes.data.warehouses);
    } catch (err) {
      error('Failed to load planning data: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const refreshDetail = async (planId) => {
    try {
      const res = await api.planning.get(planId);
      if (res?.data) setSelectedPlan(res.data);
    } catch {}
  };

  const handleView = async (plan) => {
    try {
      const res = await api.planning.get(plan.id);
      setSelectedPlan(res.data);
      setIsDetailOpen(true);
    } catch (err) {
      error(err.message);
    }
  };

  const handleApprove = async (plan) => {
    try {
      await api.planning.approve(plan.id);
      success(`${plan.planning_number} approved!`);
      fetchAll();
      if (selectedPlan?.id === plan.id) refreshDetail(plan.id);
    } catch (err) {
      error(err.message);
    }
  };

  const handleRelease = (plan) => {
    setReleasePlan(plan);
    setIsReleaseOpen(true);
  };

  const handleReleased = async (data) => {
    fetchAll();
    if (selectedPlan?.id === data?.planning?.id) {
      refreshDetail(data.planning.id);
    }
    if (data?.release && !data?.release?.rm_deducted && !data?.kitting_results?.length) {
      setKittingBatch({
        batch_no: data.release.release_number,
        fg_id: data.planning?.fg_id || selectedPlan?.fg_id || releasePlan?.fg_id,
        cat_no: data.planning?.fg_code || selectedPlan?.fg_code || releasePlan?.fg_code,
        item_name: data.planning?.product_name || selectedPlan?.product_name || releasePlan?.product_name,
        quantity: Number(data.release.release_quantity || 100),
        release_id: data.release.id
      });
      setIsKittingOpen(true);
    }
  };

  const handleOpenKittingFromDetail = (release, plan) => {
    setKittingBatch({
      batch_no: release.release_number,
      fg_id: plan.fg_id,
      cat_no: plan.fg_code,
      item_name: plan.product_name,
      quantity: Number(release.release_quantity || 100),
      release_id: release.id
    });
    setIsKittingOpen(true);
  };

  const handleCancel = async (plan) => {
    if (!window.confirm(`Cancel planning ${plan.planning_number}?\nPending quantity (${fmt(plan.planned_quantity - plan.released_quantity)}) will be cancelled.`)) return;
    try {
      await api.planning.cancel(plan.id, 'Cancelled by user');
      success(`Planning ${plan.planning_number} cancelled`);
      fetchAll();
      if (selectedPlan?.id === plan.id) refreshDetail(plan.id);
    } catch (err) {
      error(err.message);
    }
  };

  // Groupings for Tab Badges
  const pendingList   = plans.filter(p => Number(p.pending_quantity || 0) > 0 && !['CANCELLED', 'FULLY_RELEASED', 'COMPLETED'].includes(p.status));
  const releasedList  = plans.filter(p => Number(p.released_quantity || 0) > 0 && p.status !== 'COMPLETED');
  const completedList = plans.filter(p => p.status === 'COMPLETED');

  // Filter logic across tabs and secondary controls
  const filtered = plans.filter(p => {
    // 1. Tab View Filter
    if (view === 'pending') {
      if (['CANCELLED', 'FULLY_RELEASED', 'COMPLETED'].includes(p.status) || Number(p.pending_quantity || 0) <= 0) {
        return false;
      }
    } else if (view === 'released') {
      if (Number(p.released_quantity || 0) <= 0 || p.status === 'COMPLETED') {
        return false;
      }
    } else if (view === 'completed') {
      if (p.status !== 'COMPLETED') {
        return false;
      }
    }
    // 'all' shows everything

    // 2. Secondary Dropdown Filters
    if (filterStatus && p.status !== filterStatus) return false;
    if (filterPriority && p.priority !== filterPriority) return false;
    
    // 3. Date Range Filter
    if (dateRange.from || dateRange.to) {
      const planDateStr = p.planning_date || p.required_date || p.created_at;
      if (planDateStr) {
        const pDate = new Date(planDateStr).getTime();
        if (dateRange.from && pDate < new Date(dateRange.from).getTime()) return false;
        if (dateRange.to && pDate > new Date(dateRange.to).getTime() + 86400000) return false;
      }
    }

    // 4. Text Search
    if (search) {
      const q = search.toLowerCase();
      return (
        p.planning_number?.toLowerCase().includes(q) ||
        p.product_name?.toLowerCase().includes(q)    ||
        p.fg_code?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-wide flex items-center gap-2">
            <Icon name="clipboardlist" size="lg" className="text-blue-600" ariaHidden />
            Production Planning
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manage product plans and release batches to the factory shop floor.
          </p>
        </div>
        <button
          onClick={() => setIsNewOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
        >
          <Icon name="plus" size="xs" ariaHidden /> New Plan
        </button>
      </div>

      {/* Simple workflow banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-700 font-semibold">
          <span className="font-bold text-slate-900">Workflow:</span>
          <span>1. Create Plan</span>
          <span className="text-slate-400">→</span>
          <span>2. Approve</span>
          <span className="text-slate-400">→</span>
          <span>3. Release</span>
          <span className="text-slate-400">→</span>
          <span>4. SKU Tracking</span>
        </div>
        <div className="text-[11px] text-slate-500 font-medium flex items-center gap-2 flex-wrap">
          <span>Pending: <strong className="text-amber-600 font-black">{fmt(pendingList.length)}</strong></span>
          <span>·</span>
          <span>In Production: <strong className="text-blue-600 font-black">{fmt(releasedList.length)}</strong></span>
          <span>·</span>
          <span>Completed: <strong className="text-emerald-700 font-black">{fmt(completedList.length)}</strong></span>
          <span>·</span>
          <span>Total: <strong className="text-slate-900 font-black">{fmt(plans.length)}</strong></span>
        </div>
      </div>

      {/* View tabs + filters */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Main Category Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl p-1 flex-wrap">
            {[
              { id: 'pending',   label: 'Pending Release',        count: pendingList.length,   activeColor: 'bg-white text-slate-900 shadow-xs border border-slate-200', badgeColor: 'bg-amber-500 text-white' },
              { id: 'released',  label: 'Released to Production', count: releasedList.length,  activeColor: 'bg-white text-slate-900 shadow-xs border border-slate-200', badgeColor: 'bg-blue-600 text-white' },
              { id: 'completed', label: 'Completed Plans',        count: completedList.length, activeColor: 'bg-white text-slate-900 shadow-xs border border-slate-200', badgeColor: 'bg-emerald-600 text-white' },
              { id: 'all',       label: 'All Plans',              count: plans.length,          activeColor: 'bg-white text-slate-900 shadow-xs border border-slate-200', badgeColor: 'bg-slate-600 text-white' },
            ].map(tab => (
              <button 
                key={tab.id} 
                onClick={() => setView(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  view === tab.id ? tab.activeColor : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                  view === tab.id ? tab.badgeColor : 'bg-slate-200 text-slate-700'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Icon name="search" size="xs" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" ariaHidden />
              <input type="text" placeholder="Search planning..." value={search} onChange={e => setSearch(e.target.value)}
                className="pl-7 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 w-44" />
            </div>

            {/* Date Range Picker */}
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
            />

            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:ring-2 focus:ring-blue-500">
              <option value="">All Status</option>
              {Object.entries(STATUS_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
            </select>
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:ring-2 focus:ring-blue-500">
              <option value="">All Priority</option>
              {['LOW','NORMAL','HIGH','CRITICAL'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Planning cards grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center">
          <Icon name="clipboardlist" size="xl" className="text-slate-200 mx-auto mb-3" ariaHidden />
          <p className="font-bold text-slate-700 text-sm">No plans found in this view</p>
          <p className="text-xs text-slate-400 mt-1">
            {view === 'pending'
              ? 'No plans currently pending release. All planned quantities have been released to shop floor.'
              : view === 'completed'
              ? 'No completed planning records found.'
              : view === 'released'
              ? 'No plans currently active in production.'
              : 'Create your first production planning record.'}
          </p>
          {(view === 'pending' || view === 'all') && (
            <button onClick={() => setIsNewOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 cursor-pointer shadow-sm">
              <Icon name="plus" size="xs" ariaHidden /> Create New Plan
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(plan => (
            <PlanningCard key={plan.id} plan={plan}
              onView={handleView}
              onApprove={handleApprove}
              onRelease={handleRelease}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <NewPlanningModal
        isOpen={isNewOpen} onClose={() => setIsNewOpen(false)}
        finishedGoods={finishedGoods} units={units} warehouses={warehouses}
        onCreated={(plan) => { fetchAll(); }}
      />

      <ReleaseModal
        isOpen={isReleaseOpen} onClose={() => setIsReleaseOpen(false)}
        plan={releasePlan}
        onReleased={handleReleased}
      />

      {isDetailOpen && selectedPlan && (
        <PlanningDetail
          plan={selectedPlan}
          onClose={() => setIsDetailOpen(false)}
          onRelease={(p) => { handleRelease(p); }}
          onApprove={handleApprove}
          onCancel={handleCancel}
          onRefresh={() => refreshDetail(selectedPlan.id)}
          onOpenKitting={handleOpenKittingFromDetail}
        />
      )}

      {/* Full Kitting (Upfront RM Deduction) Modal */}
      <FullKittingModal
        isOpen={isKittingOpen}
        onClose={() => setIsKittingOpen(false)}
        batch={kittingBatch}
        onSuccess={() => {
          fetchAll();
          if (selectedPlan) refreshDetail(selectedPlan.id);
        }}
      />
    </div>
  );
}
