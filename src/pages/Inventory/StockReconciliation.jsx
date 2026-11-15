import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Download, Loader2, Search } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useDateRange } from '../../context/DateRangeContext';
import { DateRangePicker } from '../../components/UI/DateRangePicker';

const fmt = (v) => Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });
const TYPE = { FG: 'Finished Good', RM: 'Child Part', SCRAP: 'Scrap' };
const TX_LABEL = {
  OPENING: 'Opening stock', PURCHASE: 'Purchase / In', PURCHASE_REVERSAL: 'Purchase reversed', PRODUCTION_RESERVE: 'Reserved',
  PRODUCTION_RELEASE: 'Reservation released', PRODUCTION_CONSUMPTION: 'Kitting / consumed', PRODUCTION_OUTPUT: 'Produced',
  SALE: 'Sale / Out', SALE_REVERSAL: 'Sale reversed', REJECTION: 'Rejection', SCRAP_GENERATED: 'Scrap booked', SCRAP_SALE: 'Scrap sold',
  ADJUSTMENT_IN: 'Adjustment +', ADJUSTMENT_OUT: 'Adjustment −', TRANSFER_IN: 'Transfer in', TRANSFER_OUT: 'Transfer out',
};

/** Item-wise stock reconciliation between two dates: Opening + In − Out = Closing, with the ledger log per item. */
export function StockReconciliation({ warehouses = [] }) {
  const { dateRange: globalRange } = useDateRange();
  const { error } = useToast();
  const [range, setRange] = useState(globalRange);
  const [type, setType] = useState('ALL');
  const [wh, setWh] = useState('');
  const [q, setQ] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(null); // `${type}-${id}`
  const [log, setLog] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.stock.getReconciliation({ from_date: range.from, to_date: range.to, material_type: type, warehouse_id: wh || undefined });
      setData(res?.data || null);
      setOpen(null); setLog({});
    } catch (err) {
      error('Could not load reconciliation: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [range.from, range.to, type, wh]); // eslint-disable-line react-hooks/exhaustive-deps

  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data?.items || []).filter((r) => !s || `${r.material_code} ${r.material_name}`.toLowerCase().includes(s));
  }, [data, q]);
  const totals = useMemo(() => items.reduce((t, r) => ({ opening: t.opening + r.opening, qty_in: t.qty_in + r.qty_in, qty_out: t.qty_out + r.qty_out, closing: t.closing + r.closing }), { opening: 0, qty_in: 0, qty_out: 0, closing: 0 }), [items]);

  const toggle = async (r) => {
    const k = `${r.material_type}-${r.material_id}`;
    if (open === k) { setOpen(null); return; }
    setOpen(k);
    if (log[k]) return;
    try {
      const params = { material_type: r.material_type, material_id: r.material_id, from_date: data.from_date, to_date: data.to_date, limit: 500 };
      if (wh) params.warehouse_id = wh;
      const res = await api.stock.getLedger(params);
      const rows = (res?.data?.items || res?.data || []).slice().sort((a, b) => String(a.transaction_date + a.id).localeCompare(String(b.transaction_date + b.id)));
      setLog((p) => ({ ...p, [k]: rows }));
    } catch (err) {
      error('Could not load the item log: ' + err.message);
    }
  };

  const exportCsv = () => {
    const head = ['Code', 'Item', 'Type', 'Unit', 'Opening', 'In', 'Out', 'Closing', 'Entries'];
    const lines = items.map((r) => [r.material_code, `"${String(r.material_name).replace(/"/g, '""')}"`, TYPE[r.material_type] || r.material_type, r.unit_code, r.opening, r.qty_in, r.qty_out, r.closing, r.entries].join(','));
    const blob = new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Stock_Reconciliation_${data?.from_date}_to_${data?.to_date}.csv`;
    a.click();
  };

  return (
    <div className="space-y-3">
      <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-wrap items-center gap-2">
        <DateRangePicker value={range} onChange={setRange} />
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
          {[['ALL', 'All'], ['FG', 'Finished Goods'], ['RM', 'Child Parts'], ['SCRAP', 'Scrap']].map(([v, l]) => (
            <button key={v} type="button" onClick={() => setType(v)}
              className={`px-2.5 py-1 rounded-md cursor-pointer ${type === v ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'}`}>{l}</button>
          ))}
        </div>
        <select value={wh} onChange={(e) => setWh(e.target.value)} className="h-8 px-2 rounded-lg border border-slate-300 text-xs font-semibold" aria-label="Godown">
          <option value="">All godowns</option>
          {warehouses.map((w) => <option key={w.id} value={w.id}>{w.warehouse_name}</option>)}
        </select>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search item or code..." className="w-full h-8 pl-8 pr-2 rounded-lg border border-slate-300 text-xs" />
        </div>
        <button type="button" onClick={exportCsv} disabled={!items.length} className="h-8 px-3 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-4 py-2.5 text-[11.5px] text-slate-500 border-b border-slate-100">
          {data ? <>Period <b className="text-slate-800">{data.from_date}</b> to <b className="text-slate-800">{data.to_date}</b> · Opening + In − Out = Closing · click an item to see every entry</> : 'Loading…'}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10.5px] font-semibold uppercase text-slate-500 bg-slate-50 border-b border-slate-200">
                <th className="p-2.5 w-6" />
                <th className="p-2.5 text-left">Code</th>
                <th className="p-2.5 text-left">Item</th>
                <th className="p-2.5 text-left">Type</th>
                <th className="p-2.5 text-right">Opening</th>
                <th className="p-2.5 text-right text-emerald-700">In</th>
                <th className="p-2.5 text-right text-rose-700">Out</th>
                <th className="p-2.5 text-right">Closing</th>
                <th className="p-2.5 text-right">Entries</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && <tr><td colSpan={9} className="p-8 text-center text-slate-400"><Loader2 className="w-4 h-4 animate-spin inline" /> Loading…</td></tr>}
              {!loading && items.length === 0 && <tr><td colSpan={9} className="p-10 text-center text-slate-400">No stock movement for this period.</td></tr>}
              {!loading && items.map((r) => {
                const k = `${r.material_type}-${r.material_id}`;
                const isOpen = open === k;
                return (
                  <React.Fragment key={k}>
                    <tr onClick={() => toggle(r)} className={`cursor-pointer ${isOpen ? 'bg-blue-50/60' : 'hover:bg-slate-50'}`}>
                      <td className="p-2.5 text-slate-400"><ChevronRight className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-90 text-blue-600' : ''}`} /></td>
                      <td className="p-2.5 font-mono font-semibold text-slate-700">{r.material_code}</td>
                      <td className="p-2.5 font-semibold text-slate-900">{r.material_name}</td>
                      <td className="p-2.5 text-slate-500">{TYPE[r.material_type] || r.material_type}</td>
                      <td className="p-2.5 text-right tabular-nums">{fmt(r.opening)}</td>
                      <td className="p-2.5 text-right tabular-nums text-emerald-700 font-semibold">{r.qty_in ? `+${fmt(r.qty_in)}` : '0'}</td>
                      <td className="p-2.5 text-right tabular-nums text-rose-700 font-semibold">{r.qty_out ? `−${fmt(r.qty_out)}` : '0'}</td>
                      <td className={`p-2.5 text-right tabular-nums font-bold ${r.closing < 0 ? 'text-rose-600' : 'text-slate-900'}`}>{fmt(r.closing)} <span className="text-[10px] text-slate-400 font-semibold">{r.unit_code}</span></td>
                      <td className="p-2.5 text-right tabular-nums text-slate-500">{r.entries}</td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-slate-50/70">
                        <td />
                        <td colSpan={8} className="p-3">
                          {!log[k] ? <div className="text-slate-400 py-2"><Loader2 className="w-3.5 h-3.5 animate-spin inline" /> Loading log…</div> : log[k].length === 0 ? (
                            <div className="text-slate-400 py-2">No entries in this period. Opening {fmt(r.opening)} = Closing.</div>
                          ) : (
                            <table className="w-full text-[11.5px] bg-white rounded-lg border border-slate-200 overflow-hidden">
                              <thead>
                                <tr className="text-[10px] uppercase font-semibold text-slate-500 bg-slate-50">
                                  <th className="p-2 text-left">Date</th><th className="p-2 text-left">Entry</th><th className="p-2 text-left">Reference</th>
                                  <th className="p-2 text-left">Godown</th><th className="p-2 text-right">In</th><th className="p-2 text-right">Out</th>
                                  <th className="p-2 text-right">Balance</th><th className="p-2 text-left">By / Remarks</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                <tr className="text-slate-500"><td className="p-2">{data.from_date}</td><td className="p-2 font-semibold" colSpan={5}>Opening balance</td><td className="p-2 text-right tabular-nums font-semibold">{fmt(r.opening)}</td><td /></tr>
                                {(() => {
                                  let bal = r.opening;
                                  return log[k].map((e) => {
                                    bal += Number(e.quantity_in || 0) - Number(e.quantity_out || 0);
                                    return (
                                      <tr key={e.id}>
                                        <td className="p-2 whitespace-nowrap text-slate-600">{e.transaction_date}</td>
                                        <td className="p-2 font-semibold text-slate-800">{TX_LABEL[e.transaction_type] || e.transaction_type}</td>
                                        <td className="p-2 font-mono text-slate-600">{e.reference_number || e.transaction_id}</td>
                                        <td className="p-2 text-slate-600">{e.warehouse_name || ''}</td>
                                        <td className="p-2 text-right tabular-nums text-emerald-700">{Number(e.quantity_in) ? `+${fmt(e.quantity_in)}` : ''}</td>
                                        <td className="p-2 text-right tabular-nums text-rose-700">{Number(e.quantity_out) ? `−${fmt(e.quantity_out)}` : ''}</td>
                                        <td className="p-2 text-right tabular-nums font-semibold">{fmt(bal)}</td>
                                        <td className="p-2 text-slate-500 max-w-[320px] truncate" title={e.remarks || ''}>{e.created_by_name || ''}{e.remarks ? ` · ${e.remarks}` : ''}</td>
                                      </tr>
                                    );
                                  });
                                })()}
                                <tr className="text-slate-700 bg-slate-50"><td className="p-2">{data.to_date}</td><td className="p-2 font-bold" colSpan={5}>Closing balance</td><td className="p-2 text-right tabular-nums font-bold">{fmt(r.closing)}</td><td /></tr>
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
            {!loading && items.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-200 font-bold text-slate-900">
                  <td /><td className="p-2.5" colSpan={3}>Total ({items.length} items)</td>
                  <td className="p-2.5 text-right tabular-nums">{fmt(totals.opening)}</td>
                  <td className="p-2.5 text-right tabular-nums text-emerald-700">+{fmt(totals.qty_in)}</td>
                  <td className="p-2.5 text-right tabular-nums text-rose-700">−{fmt(totals.qty_out)}</td>
                  <td className="p-2.5 text-right tabular-nums">{fmt(totals.closing)}</td><td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

export default StockReconciliation;
