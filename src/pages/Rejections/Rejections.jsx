import React, { useState, useEffect, useMemo } from 'react';
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
const num = (v) => Number(Number(v || 0).toFixed(3));

/**
 * Rejections: every rejection from SKU Tracking, grouped by batch + stage where it was rejected.
 * No fixed rejection route — click a row to open the tracker and send pieces anywhere.
 */
export function Rejections() {
  const { dateRange: globalRange } = useDateRange();
  const [dateRange, setDateRange] = useState(globalRange);
  const [lots, setLots] = useState([]);
  const [lotsLoading, setLotsLoading] = useState(true);
  const [show, setShow] = useState('OPEN'); // OPEN | DONE | ALL
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

  const fetchLots = async () => {
    setLotsLoading(true);
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
        map.set(k, { key: k, batch_no: l.batch_no, item_name: l.item_name, source_stage_key: l.source_stage_key, source_stage_name: l.source_stage_name,
          reasons: new Set(), first_at: l.created_at, last_at: l.updated_at || l.created_at, total: 0, bin: 0, working: 0, returned: 0, furnace: 0, furnace_kg: 0, places: new Set() });
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

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groups.filter((g) => (show === 'ALL' || (show === 'OPEN' ? g.open > 0 : g.open === 0)))
      .filter((g) => !q || [g.batch_no, g.item_name, g.source_stage_name, g.reasons, g.places].some((v) => String(v || '').toLowerCase().includes(q)));
  }, [groups, search, show]);

  const metrics = useMemo(() => {
    const sum = (k) => groups.reduce((s, g) => s + g[k], 0);
    return {
      bin: sum('bin'), working: sum('working'), returned: sum('returned'), furnace: sum('furnace'),
      furnaceKg: groups.reduce((s, g) => s + g.furnace_kg, 0),
      scrapKg: scrapStock.reduce((s, x) => s + Number(x.quantity || 0), 0),
      openRows: groups.filter((g) => g.open > 0).length,
    };
  }, [groups, scrapStock]);


  const kpi = (label, value, unit, note, color) => (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <p className={`text-2xl font-black ${color}`}>{value} <span className="text-xs text-slate-400 font-semibold">{unit}</span></p>
      <p className="text-[11px] text-slate-500 font-semibold mt-0.5">{note}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-wide flex items-center gap-2">
            <Icon name="shieldalert" size="lg" className="text-rose-600" ariaHidden={true} />
            <span>Rejection Tracking & Scrap</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Rejected pieces wait in the Rejection Bin until you decide. Send them to any stage, back into production, or to the furnace.
          </p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpi('In Rejection Bin', metrics.bin, 'PCS', 'Waiting for a decision', 'text-amber-600')}
        {kpi('At Work (Stages)', metrics.working, 'PCS', 'Being reworked at a stage', 'text-blue-700')}
        {kpi('Back in Production', metrics.returned, 'PCS', 'Rejoined the batch flow', 'text-emerald-700')}
        {kpi('Furnace', metrics.furnace, 'PCS', `${metrics.furnaceKg.toFixed(2)} kg scrap booked · scrap stock ${metrics.scrapKg.toFixed(2)} kg`, 'text-rose-700')}
      </div>

      {(
        <div className="space-y-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
              {[['OPEN', 'Open'], ['DONE', 'Finished'], ['ALL', 'All']].map(([v, l]) => (
                <button key={v} type="button" onClick={() => setShow(v)}
                  className={`px-2.5 py-1 rounded-md cursor-pointer ${show === v ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'}`}>{l}</button>
              ))}
            </div>
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search batch, item, stage, reason..."
              className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg border border-slate-300 text-xs" />
            <button type="button" onClick={fetchLots} className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-xs font-semibold cursor-pointer">Refresh</button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
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
        </div>
      )}

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
