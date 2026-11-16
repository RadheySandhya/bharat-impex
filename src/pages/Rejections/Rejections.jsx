import React, { useState, useEffect, useMemo } from 'react';
import { useLiveRefresh } from '../../utils/liveRefresh';
import {
  ShieldAlert,
  Search,
  RefreshCw,
  Flame,
  Inbox,
  Wrench,
  Undo2,
  CheckCircle2,
  LayoutGrid,
  List,
  AlertCircle,
  ChevronRight,
  MapPin
} from 'lucide-react';
import Icon from '../../components/UI/Icon';
import { DateRangePicker } from '../../components/UI/DateRangePicker';
import { RejectionTrackerModal } from '../../components/UI/RejectionTrackerModal';
import { DEFAULT_CONFIGURED_STAGES } from '../Production/SKUTrackingSheet';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useDateRange } from '../../context/DateRangeContext';

const fmtDate = (s) => {
  if (!s) return '—';
  const d = new Date(String(s).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const fmtDateShort = (s) => {
  if (!s) return '—';
  const d = new Date(String(s).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString('en-IN', { day: '2-digit', month: 'short' });
};

const num = (v) => Number(Number(v || 0).toFixed(3));

export const getRejectionStatusStyles = (g) => {
  if (g.open === 0) {
    if (g.furnace > 0 && g.returned === 0) {
      return {
        color: '#e11d48', // rose-600
        bg: 'bg-rose-50',
        badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
        label: `Furnace (${g.furnace})`,
        status: 'FURNACE',
        dot: 'bg-rose-500'
      };
    }
    return {
      color: '#059669', // emerald-600
      bg: 'bg-emerald-50',
      badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      label: 'Finished',
      status: 'FINISHED',
      dot: 'bg-emerald-500'
    };
  }
  if (g.bin > 0 && g.working === 0) {
    return {
      color: '#d97706', // amber-600
      bg: 'bg-amber-50',
      badgeBg: 'bg-amber-100 text-amber-900 border-amber-200',
      label: `In Bin: ${g.bin}`,
      status: 'BIN',
      dot: 'bg-amber-500'
    };
  }
  if (g.working > 0 && g.bin === 0) {
    return {
      color: '#2563eb', // blue-600
      bg: 'bg-blue-50',
      badgeBg: 'bg-blue-100 text-blue-900 border-blue-200',
      label: `At Work: ${g.working}`,
      status: 'STAGE',
      dot: 'bg-blue-500'
    };
  }
  return {
    color: '#d97706',
    bg: 'bg-amber-50',
    badgeBg: 'bg-amber-100 text-amber-900 border-amber-200',
    label: `${g.open} pcs open`,
    status: 'SPLIT',
    dot: 'bg-amber-500'
  };
};

/**
 * Rejections: every rejection from SKU Tracking, grouped by batch + stage where it was rejected.
 * Sleek mobile-first design matching Stock UI (2-column compact grid, live status colors, tap-to-track).
 */
export function Rejections() {
  const { dateRange: globalRange } = useDateRange();
  const [dateRange, setDateRange] = useState(globalRange);
  const [lots, setLots] = useState([]);
  const [lotsLoading, setLotsLoading] = useState(true);
  const [show, setShow] = useState('OPEN'); // OPEN | DONE | ALL
  const [dispositionFilter, setDispositionFilter] = useState('ALL'); // ALL | BIN | WORKING | RETURNED | FURNACE
  const [mobileView, setMobileView] = useState('grid'); // 'grid' (2 per row like stock) | 'list'
  const [search, setSearch] = useState('');
  const [processes, setProcesses] = useState([]);
  const [scrapStock, setScrapStock] = useState([]);
  const [, setLoading] = useState(true);
  const [tracker, setTracker] = useState(null);
  const { error } = useToast();

  const fetchMasters = async () => {
    setLoading(true);
    try {
      const [stockRes, bundleRes] = await Promise.all([
        api.stock.getAll({ material_type: 'SCRAP' }),
        api.settings.getBundle(),
      ]);
      if (stockRes?.data) setScrapStock(stockRes.data);
      if (bundleRes?.data?.processes) setProcesses(bundleRes.data.processes);
    } catch (err) {
      error('Failed to load rejection & scrap records: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLots = async (silent = false) => {
    if (!silent) setLotsLoading(true);
    try {
      const res = await api.rejections.getLots({ status: 'ALL', from_date: dateRange.from, to_date: dateRange.to });
      setLots((res?.data || []).filter((l) => l.status !== 'CANCELLED'));
    } catch (err) {
      error('Failed to load rejections: ' + err.message);
    } finally {
      setLotsLoading(false);
    }
  };

  useEffect(() => { fetchMasters(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { fetchLots(); }, [dateRange.from, dateRange.to]); // eslint-disable-line react-hooks/exhaustive-deps
  useLiveRefresh((silent) => fetchLots(silent));

  // Same stage keys as the SKU Tracking sheet
  const stages = useMemo(() => {
    if (processes.length) {
      return processes.map((p, i) => ({
        key: p.process_code ? String(p.process_code).toLowerCase().replace(/[^a-z0-9]/g, '_') : `proc_${p.id || i + 1}`,
        name: p.process_name,
      }));
    }
    return DEFAULT_CONFIGURED_STAGES.map((s) => ({ key: s.key, name: s.full_name }));
  }, [processes]);

  // One row per rejection (batch + stage where rejected); lots/splits are summed
  const groups = useMemo(() => {
    const map = new Map();
    lots.forEach((l) => {
      const k = `${l.batch_no}|${l.source_stage_key}`;
      if (!map.has(k)) {
        map.set(k, {
          key: k, batch_no: l.batch_no, item_name: l.item_name, source_stage_key: l.source_stage_key, source_stage_name: l.source_stage_name,
          reasons: new Set(), first_at: l.created_at, last_at: l.updated_at || l.created_at, total: 0, bin: 0, working: 0, returned: 0, furnace: 0, furnace_kg: 0, places: new Set()
        });
      }
      const g = map.get(k); const q = num(l.quantity);
      g.total += q;
      if (l.defect_reason) g.reasons.add(l.defect_reason);
      if (String(l.created_at) < String(g.first_at)) g.first_at = l.created_at;
      if (String(l.updated_at) > String(g.last_at)) g.last_at = l.updated_at;
      if (l.location_type === 'BIN') g.bin += q;
      else if (l.location_type === 'STAGE') { g.working += q; g.places.add(l.location_name); }
      else if (l.location_type === 'FURNACE') { g.furnace += q; g.furnace_kg += Number(l.scrap_weight_kg || 0); }
      else g.returned += q;
    });
    return [...map.values()].map((g) => ({ ...g, open: g.bin + g.working, reasons: [...g.reasons].join(', '), places: [...g.places].join(', ') }))
      .sort((a, b) => (b.open > 0) - (a.open > 0) || String(b.last_at).localeCompare(String(a.last_at)));
  }, [lots]);

  const metrics = useMemo(() => {
    const sum = (k) => groups.reduce((s, g) => s + g[k], 0);
    return {
      bin: sum('bin'),
      working: sum('working'),
      returned: sum('returned'),
      furnace: sum('furnace'),
      furnaceKg: groups.reduce((s, g) => s + g.furnace_kg, 0),
      scrapKg: scrapStock.reduce((s, x) => s + Number(x.quantity || 0), 0),
      openRows: groups.filter((g) => g.open > 0).length,
      totalRows: groups.length,
    };
  }, [groups, scrapStock]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groups
      .filter((g) => (show === 'ALL' || (show === 'OPEN' ? g.open > 0 : g.open === 0)))
      .filter((g) => {
        if (dispositionFilter === 'BIN') return g.bin > 0;
        if (dispositionFilter === 'WORKING') return g.working > 0;
        if (dispositionFilter === 'RETURNED') return g.returned > 0;
        if (dispositionFilter === 'FURNACE') return g.furnace > 0;
        return true;
      })
      .filter((g) => !q || [g.batch_no, g.item_name, g.source_stage_name, g.reasons, g.places].some((v) => String(v || '').toLowerCase().includes(q)));
  }, [groups, search, show, dispositionFilter]);

  const toggleDisposition = (filterKey) => {
    setDispositionFilter((prev) => (prev === filterKey ? 'ALL' : filterKey));
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-wide flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            <span>Rejection Tracking & Scrap</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Rejected pieces wait in the Rejection Bin until you decide. Send them to any stage, back into production, or to the furnace.
          </p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* KPI Cards: Tap to Quick Filter (Matching Stock Science Zone Card Style) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {/* In Rejection Bin */}
        <div
          onClick={() => toggleDisposition('BIN')}
          className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border cursor-pointer transition-all ${dispositionFilter === 'BIN'
              ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-50'
              : 'bg-amber-50/40 border-amber-200/80 hover:bg-amber-50/80'
            }`}
          title="Click to filter rejections waiting in Bin"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1">
              <Inbox className="w-3.5 h-3.5 text-amber-600" />
              <span>In Rejection Bin</span>
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-amber-700 leading-none">{metrics.bin}</span>
              <span className="text-[10px] text-amber-600 font-bold">PCS</span>
            </div>
            <span className="text-[9px] text-amber-700 font-medium">Waiting</span>
          </div>
        </div>

        {/* At Work (Stages) */}
        <div
          onClick={() => toggleDisposition('WORKING')}
          className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border cursor-pointer transition-all ${dispositionFilter === 'WORKING'
              ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50'
              : 'bg-blue-50/40 border-blue-200/80 hover:bg-blue-50/80'
            }`}
          title="Click to filter rejections being reworked at stages"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1">
              <Wrench className="w-3.5 h-3.5 text-blue-600" />
              <span>At Work (Stages)</span>
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-blue-700 leading-none">{metrics.working}</span>
              <span className="text-[10px] text-blue-600 font-bold">PCS</span>
            </div>
            <span className="text-[9px] text-blue-700 font-medium">Reworking</span>
          </div>
        </div>

        {/* Back in Production */}
        <div
          onClick={() => toggleDisposition('RETURNED')}
          className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border cursor-pointer transition-all ${dispositionFilter === 'RETURNED'
              ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50'
              : 'bg-emerald-50/40 border-emerald-200/80 hover:bg-emerald-50/80'
            }`}
          title="Click to filter rejections that rejoined production"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
              <Undo2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>In Production</span>
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-emerald-700 leading-none">{metrics.returned}</span>
              <span className="text-[10px] text-emerald-600 font-bold">PCS</span>
            </div>
            <span className="text-[9px] text-emerald-700 font-medium">Rejoined</span>
          </div>
        </div>

        {/* Furnace / Scrap */}
        <div
          onClick={() => toggleDisposition('FURNACE')}
          className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border cursor-pointer transition-all ${dispositionFilter === 'FURNACE'
              ? 'ring-2 ring-rose-500 border-rose-500 bg-rose-50'
              : 'bg-rose-50/40 border-rose-200/80 hover:bg-rose-50/80'
            }`}
          title="Click to filter furnace scrap rejections"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-rose-600" />
              <span>Furnace (Scrap)</span>
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-rose-700 leading-none">{metrics.furnace}</span>
              <span className="text-[10px] text-rose-600 font-bold">PCS</span>
            </div>
            <span className="text-[9px] text-rose-700 font-medium">
              {metrics.furnaceKg > 0 ? `${metrics.furnaceKg.toFixed(1)} kg` : 'Melted'}
            </span>
          </div>
        </div>
      </div>

      {/* Control Bar: Filters, Search, Mobile View Switcher */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Status Tabs */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
            {[
              ['OPEN', `Open (${metrics.openRows})`],
              ['DONE', 'Finished'],
              ['ALL', `All (${metrics.totalRows})`]
            ].map(([v, l]) => (
              <button
                key={v}
                type="button"
                onClick={() => setShow(v)}
                className={`px-2.5 py-1 rounded-md cursor-pointer transition-all ${show === v ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search batch, item, stage, reason..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {/* Mobile View Toggle: 2-Col Grid vs 1-Col List */}
            <div className="md:hidden flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setMobileView('grid')}
                className={`p-1 rounded cursor-pointer ${mobileView === 'grid' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-400 hover:text-slate-600'}`}
                title="Stock Grid View (2 per row)"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setMobileView('list')}
                className={`p-1 rounded cursor-pointer ${mobileView === 'list' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-400 hover:text-slate-600'}`}
                title="Detailed Card List"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={fetchLots}
              className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-xs font-semibold cursor-pointer flex items-center gap-1 text-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${lotsLoading ? 'animate-spin text-blue-600' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Quick Filter Active Bar Indicator if filtered */}
        {dispositionFilter !== 'ALL' && (
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 text-slate-600">
            <span className="flex items-center gap-1 text-[11px] font-semibold">
              <span>Filter:</span>
              <strong className="text-slate-900 uppercase">{dispositionFilter}</strong>
              <span>({visible.length} results)</span>
            </span>
            <button
              type="button"
              onClick={() => setDispositionFilter('ALL')}
              className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
            >
              Clear filter
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MOBILE VIEW (md:hidden) — 2-Col Grid like Stock UI or 1-Col Detailed List */}
      {/* ========================================================================= */}
      <div className="md:hidden">
        {lotsLoading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-sm">
            <div className="flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
              <span>Loading rejections…</span>
            </div>
          </div>
        ) : visible.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-sm">
            No matching rejections found.
          </div>
        ) : mobileView === 'grid' ? (
          /* 2 per row boxes — EXACTLY matching Stock UI (IMSTriNagarMaster.jsx) */
          <div className="grid grid-cols-2 gap-2">
            {visible.map((g) => {
              const z = getRejectionStatusStyles(g);
              return (
                <button
                  key={`m-grid-${g.key}`}
                  type="button"
                  onClick={() => setTracker(g)}
                  className="text-left bg-white rounded-xl border border-slate-200 p-2.5 active:scale-[0.98] transition-all shadow-2xs flex flex-col justify-between"
                  style={{ borderLeft: `4px solid ${z.color}` }}
                >
                  <div>
                    {/* Item Name */}
                    <div className="text-[12px] font-semibold text-slate-900 leading-tight line-clamp-2 min-h-[30px]" title={g.item_name}>
                      {g.item_name || 'Item'}
                    </div>
                    {/* Batch Number */}
                    <div className="text-[10px] font-mono text-slate-500 mt-0.5 truncate">
                      #{g.batch_no}
                    </div>
                    {/* Stage where rejected */}
                    <div className="text-[9.5px] text-slate-400 font-sans truncate mt-0.5" title={g.source_stage_name}>
                      <MapPin className="w-3 h-3 inline -mt-0.5 mr-0.5" />{g.source_stage_name || '—'}
                    </div>
                  </div>

                  <div className="mt-2 pt-1 border-t border-slate-100">
                    {/* Quantity & Reason */}
                    <div className="flex items-baseline justify-between">
                      <div className="flex items-baseline gap-1">
                        <span className="text-[20px] font-bold tabular-nums" style={{ color: z.color }}>
                          {g.total}
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold">PCS</span>
                      </div>
                      {g.reasons && (
                        <span className="text-[9px] text-slate-400 truncate max-w-[55px]" title={g.reasons}>
                          {g.reasons}
                        </span>
                      )}
                    </div>

                    {/* Status Pill & Date */}
                    <div className="flex items-center justify-between mt-1 text-[10px]">
                      <span className={`px-1.5 py-0.5 rounded-md font-bold text-[9px] border ${z.badgeBg} truncate max-w-[85px]`}>
                        {z.label}
                      </span>
                      <span className="text-[8.5px] text-slate-400 font-medium">
                        {fmtDateShort(g.first_at)}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          /* 1 per row detailed card view */
          <div className="space-y-2">
            {visible.map((g) => {
              const z = getRejectionStatusStyles(g);
              return (
                <button
                  key={`m-list-${g.key}`}
                  type="button"
                  onClick={() => setTracker(g)}
                  className="w-full text-left bg-white rounded-xl border border-slate-200 p-3 active:scale-[0.99] transition-all shadow-2xs hover:shadow-xs"
                  style={{ borderLeft: `4px solid ${z.color}` }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold text-slate-900 leading-tight truncate">
                        {g.item_name || 'Item'}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10.5px]">
                        <span className="font-mono text-slate-500 font-semibold">#{g.batch_no}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-slate-500 truncate"><MapPin className="w-3 h-3 inline -mt-0.5 mr-0.5" />{g.source_stage_name}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium shrink-0">
                      {fmtDate(g.first_at)}
                    </span>
                  </div>

                  {g.reasons && (
                    <div className="mt-1.5 text-[11px] text-slate-600 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 flex items-center gap-1.5">
                      <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                      <span className="truncate">{g.reasons}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        Total: {g.total}
                      </span>
                      {g.bin > 0 && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          In Bin: {g.bin}
                        </span>
                      )}
                      {g.working > 0 && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200" title={g.places}>
                          At Work: {g.working}
                        </span>
                      )}
                      {g.returned > 0 && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Returned: {g.returned}
                        </span>
                      )}
                      {g.furnace > 0 && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                          Furnace: {g.furnace}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-blue-600 flex items-center gap-0.5 shrink-0">
                      Track <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP TABLE VIEW (hidden md:block) — with data-no-cards opt-out */}
      {/* ========================================================================= */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs" data-no-cards>
            <thead>
              <tr className="text-[10.5px] font-semibold uppercase text-slate-500 bg-slate-50 border-b border-slate-200">
                <th className="p-2.5 text-left">Rejected On</th>
                <th className="p-2.5 text-left">Batch + Item</th>
                <th className="p-2.5 text-left">Rejected At</th>
                <th className="p-2.5 text-left">Reason</th>
                <th className="p-2.5 text-right">Total</th>
                <th className="p-2.5 text-right text-amber-700">In Bin</th>
                <th className="p-2.5 text-right text-blue-700">At Work</th>
                <th className="p-2.5 text-right text-emerald-700">Returned</th>
                <th className="p-2.5 text-right text-rose-700">Furnace</th>
                <th className="p-2.5 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lotsLoading && <tr><td colSpan={10} className="p-8 text-center text-slate-400">Loading…</td></tr>}
              {!lotsLoading && visible.length === 0 && (
                <tr><td colSpan={10} className="p-10 text-center text-slate-400">No rejections here. Rejected pieces from a SKU Tracking handoff appear in this list.</td></tr>
              )}
              {!lotsLoading && visible.map((g) => (
                <tr key={g.key} onClick={() => setTracker(g)} className="cursor-pointer hover:bg-blue-50/50" title="Open rejection tracking">
                  <td className="p-2.5 text-slate-500 whitespace-nowrap">{fmtDate(g.first_at)}</td>
                  <td className="p-2.5 min-w-[180px]">
                    <div className="font-semibold text-slate-900 uppercase text-[11px]">{g.item_name || '—'}</div>
                    <div className="text-[10.5px] text-slate-500 font-mono">#{g.batch_no}</div>
                  </td>
                  <td className="p-2.5 whitespace-nowrap text-slate-700">{g.source_stage_name || '—'}</td>
                  <td className="p-2.5 text-slate-600 min-w-[120px]">{g.reasons || '—'}</td>
                  <td className="p-2.5 text-right font-bold tabular-nums">{g.total}</td>
                  <td className={`p-2.5 text-right tabular-nums ${g.bin ? 'font-bold text-amber-700 bg-amber-50' : 'text-slate-300'}`}>{g.bin}</td>
                  <td className={`p-2.5 text-right tabular-nums ${g.working ? 'font-bold text-blue-700 bg-blue-50' : 'text-slate-300'}`} title={g.places}>{g.working}</td>
                  <td className={`p-2.5 text-right tabular-nums ${g.returned ? 'font-bold text-emerald-700' : 'text-slate-300'}`}>{g.returned}</td>
                  <td className={`p-2.5 text-right tabular-nums ${g.furnace ? 'font-bold text-rose-700' : 'text-slate-300'}`}>{g.furnace}</td>
                  <td className="p-2.5 whitespace-nowrap">
                    {g.open > 0
                      ? <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">{g.open} pcs open{g.places ? ` · ${g.places}` : ''}</span>
                      : <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">Finished</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <RejectionTrackerModal
        isOpen={!!tracker}
        onClose={() => setTracker(null)}
        batchNo={tracker?.batch_no}
        sourceStageKey={tracker?.source_stage_key}
        sourceStageName={tracker?.source_stage_name}
        itemName={tracker?.item_name}
        stages={stages}
        onChanged={() => { fetchLots(); fetchMasters(); }}
      />
    </div>
  );
}

export default Rejections;
