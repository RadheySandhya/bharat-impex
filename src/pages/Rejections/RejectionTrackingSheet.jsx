import React, { useMemo } from 'react';
import { ArrowRight, Check, CheckCircle2, XCircle } from 'lucide-react';

const PALETTE = [
  { head: 'bg-amber-50 text-amber-900', sub: 'bg-amber-50/70 text-amber-900' },
  { head: 'bg-orange-50 text-orange-900', sub: 'bg-orange-50/70 text-orange-900' },
  { head: 'bg-blue-50 text-blue-900', sub: 'bg-blue-50/70 text-blue-900' },
  { head: 'bg-cyan-50 text-cyan-900', sub: 'bg-cyan-50/70 text-cyan-900' },
  { head: 'bg-indigo-50 text-indigo-900', sub: 'bg-indigo-50/70 text-indigo-900' },
  { head: 'bg-purple-50 text-purple-900', sub: 'bg-purple-50/70 text-purple-900' },
  { head: 'bg-teal-50 text-teal-900', sub: 'bg-teal-50/70 text-teal-900' },
];

const fmtShort = (s) => {
  if (!s) return '';
  const d = new Date(String(s).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString('en-IN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
};

/**
 * Sheet view of rejection lots — same reading pattern as the SKU Tracking sheet:
 * one row per lot, one column group per step of the route, a Send Next action per row.
 */
export function RejectionTrackingSheet({ lots, route, disposition, canProcess, canCancel, onAdvance, onCancel }) {
  const steps = route?.steps || [];
  const isFurnace = disposition === 'FURNACE';

  const rows = useMemo(() => {
    const open = lots.filter((l) => l.status === 'OPEN');
    const closed = lots.filter((l) => l.status !== 'OPEN');
    return { open, closed };
  }, [lots]);

  // Where is this lot on the route columns? Match by step id, fall back to position.
  const positionOf = (lot) => {
    const cur = lot.steps?.[lot.current_step];
    const byId = cur ? steps.findIndex((s) => s.id === cur.id) : -1;
    return byId >= 0 ? byId : Math.min(lot.current_step, steps.length - 1);
  };

  const stepDate = (lot, colIdx) => {
    const stepId = steps[colIdx]?.id;
    const lotIdx = lot.steps?.findIndex((s) => s.id === stepId);
    const idx = lotIdx >= 0 ? lotIdx : colIdx;
    const h = (lot.history || []).filter((e) => e.step_index === idx && (e.action === 'CREATED' || e.action === 'MOVED')).pop();
    return h ? fmtShort(h.at) : '';
  };

  const renderRow = (lot) => {
    const pos = positionOf(lot);
    const done = lot.status === 'COMPLETED';
    const cancelled = lot.status === 'CANCELLED';
    return (
      <tr key={lot.id} className={`divide-x divide-slate-200 ${done ? 'bg-slate-50/40' : 'bg-white hover:bg-slate-50/60'}`}>
        <td className="p-2 text-[11px] text-slate-500 whitespace-nowrap">{fmtShort(lot.created_at)}</td>
        <td className="p-2 whitespace-nowrap">
          <div className="flex flex-col items-start gap-1">
            <span className="font-bold text-blue-700 font-mono text-[11px]">{lot.lot_number}</span>
            {lot.status === 'OPEN' ? (
              <div className="flex items-center gap-1">
                {canProcess && (
                  <button
                    type="button"
                    onClick={() => onAdvance(lot)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold text-white active:scale-95 transition-transform ${lot.is_last_step ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                  >
                    {lot.is_last_step ? <>Complete <Check className="w-3 h-3" /></> : <>Send Next <ArrowRight className="w-3 h-3" /></>}
                  </button>
                )}
                {canCancel && (
                  <button type="button" onClick={() => onCancel(lot)} title="Cancel lot" className="p-0.5 rounded text-slate-300 hover:text-rose-600">
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : cancelled ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-200">Cancelled</span>
            ) : (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-2.5 h-2.5" /> {isFurnace ? 'Scrap Booked' : 'Returned'}
              </span>
            )}
          </div>
        </td>
        <td className="p-2 min-w-[180px]">
          <div className="font-bold text-slate-900 text-[11px] uppercase leading-tight">{lot.item_name || '—'}</div>
          <div className="text-[10px] text-slate-500 font-mono">#{lot.batch_no}</div>
        </td>
        <td className="p-2 text-[11px] text-slate-700 whitespace-nowrap">{lot.source_stage_name || '—'}</td>
        <td className="p-2 text-[11px] text-slate-600 min-w-[120px]">{lot.defect_reason || '—'}</td>
        <td className="p-2 text-right font-semibold text-slate-900 tabular-nums">{lot.quantity}</td>
        <td className="p-2 text-right text-slate-600 tabular-nums">{isFurnace ? Number(lot.scrap_weight_kg).toFixed(2) : Number(lot.avg_weight || 0).toFixed(3)}</td>

        {steps.map((s, i) => {
          const passed = done || i < pos;
          const current = lot.status === 'OPEN' && i === pos;
          const reached = passed || current;
          const clickable = current && canProcess;
          return (
            <React.Fragment key={s.id}>
              <td className={`p-2 text-right tabular-nums ${reached ? 'text-slate-900 font-semibold' : 'text-slate-300'}`}>{reached && !cancelled ? lot.quantity : 0}</td>
              <td
                onClick={clickable ? () => onAdvance(lot) : undefined}
                title={clickable ? 'Click to send this lot to the next step' : undefined}
                className={`p-2 text-right tabular-nums ${current ? 'bg-amber-100 text-amber-900 font-bold cursor-pointer hover:bg-amber-200' : 'text-slate-300'}`}
              >
                {current ? lot.quantity : 0}
              </td>
              <td className="p-2 text-[10px] text-slate-500 whitespace-nowrap border-r-2 border-slate-300">{reached && !cancelled ? stepDate(lot, i) : ''}</td>
            </React.Fragment>
          );
        })}

        {/* Result */}
        {isFurnace ? (
          <>
            <td className={`p-2 text-right tabular-nums font-bold ${done ? 'bg-emerald-50 text-emerald-800' : 'text-slate-300'}`}>{done ? Number(lot.scrap_weight_kg).toFixed(2) : 0}</td>
            <td className="p-2 text-[11px] text-slate-600 whitespace-nowrap">{done ? (lot.warehouse_name || '—') : ''}</td>
          </>
        ) : (
          <>
            <td className={`p-2 text-right tabular-nums font-bold ${done ? 'bg-emerald-50 text-emerald-800' : 'text-slate-300'}`}>{done ? lot.quantity : 0}</td>
            <td className="p-2 text-[11px] text-slate-600 whitespace-nowrap">{lot.return_stage_name || '—'}</td>
          </>
        )}
      </tr>
    );
  };

  const masterCols = 7;
  const totalCols = masterCols + steps.length * 3 + 2;

  return (
    <div className="bg-white border border-slate-300 rounded-2xl shadow-xs overflow-hidden">
      <div className="overflow-x-auto max-h-[680px]">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="text-[11px] font-extrabold uppercase tracking-wide divide-x divide-slate-300 border-b border-slate-300">
              <th colSpan={masterCols} className="p-2.5 bg-slate-200 text-slate-800 text-center">Rejection Lot Details</th>
              {steps.map((s, i) => (
                <th key={s.id} colSpan={3} className={`p-2.5 text-center border-r-2 border-slate-300 ${PALETTE[i % PALETTE.length].head}`} title={s.note || ''}>
                  Step {i + 1}: {s.name}
                </th>
              ))}
              <th colSpan={2} className="p-2.5 bg-emerald-100 text-emerald-900 text-center">{isFurnace ? 'Furnace Result' : 'Rework Result'}</th>
            </tr>
            <tr className="text-[10px] font-bold uppercase text-slate-600 divide-x divide-slate-200 border-b border-slate-300">
              <th className="p-2 bg-slate-100 text-left">Date</th>
              <th className="p-2 bg-slate-100 text-left">Lot No.</th>
              <th className="p-2 bg-slate-100 text-left">Batch + Item</th>
              <th className="p-2 bg-slate-100 text-left">Rejected At</th>
              <th className="p-2 bg-slate-100 text-left">Reason</th>
              <th className="p-2 bg-slate-100 text-right">Qty</th>
              <th className="p-2 bg-slate-100 text-right">{isFurnace ? 'Wt (KG)' : 'Avg Wt'}</th>
              {steps.map((s, i) => (
                <React.Fragment key={s.id}>
                  <th className={`p-2 text-right ${PALETTE[i % PALETTE.length].sub}`}>In Qty</th>
                  <th className={`p-2 text-right text-amber-700 ${PALETTE[i % PALETTE.length].sub}`}>Pending</th>
                  <th className={`p-2 text-left border-r-2 border-slate-300 ${PALETTE[i % PALETTE.length].sub}`}>Date</th>
                </React.Fragment>
              ))}
              {isFurnace ? (
                <>
                  <th className="p-2 bg-emerald-50 text-emerald-900 text-right">Scrap KG</th>
                  <th className="p-2 bg-emerald-50 text-emerald-900 text-left">Godown</th>
                </>
              ) : (
                <>
                  <th className="p-2 bg-emerald-50 text-emerald-900 text-right">Returned</th>
                  <th className="p-2 bg-emerald-50 text-emerald-900 text-left">To Stage</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.open.length === 0 && rows.closed.length === 0 && (
              <tr>
                <td colSpan={totalCols} className="p-10 text-center text-slate-400">
                  No {isFurnace ? 'furnace' : 'minor rework'} lots. Rejections entered at a SKU Tracking stage handoff appear here.
                </td>
              </tr>
            )}
            {rows.open.map(renderRow)}
            {rows.closed.length > 0 && (
              <tr>
                <td colSpan={totalCols} className="px-3 py-2.5 bg-slate-100 border-y border-slate-300">
                  <div className="flex items-center gap-2 font-extrabold text-slate-800 text-[11px] uppercase tracking-wide">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Completed Rejection Lots ({isFurnace ? 'Booked to Scrap Stock' : 'Returned to Production'})</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 normal-case">{rows.closed.length} closed</span>
                  </div>
                </td>
              </tr>
            )}
            {rows.closed.map(renderRow)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default RejectionTrackingSheet;
