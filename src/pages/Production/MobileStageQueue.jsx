import React, { useMemo, useState } from 'react';
import { Search, ArrowRight, RefreshCw, Inbox } from 'lucide-react';

/**
 * Minimal supervisor view: what is waiting at MY stages, and one action — hand it off.
 * Each card = one batch waiting at one stage the user is allowed to work on.
 */
export function MobileStageQueue({ data, stages, canHandoff, onHandoff, onRefresh, loading }) {
  const [stageFilter, setStageFilter] = useState('ALL');
  const [q, setQ] = useState('');

  const queue = useMemo(() => {
    const items = [];
    data.forEach((row) => {
      if (row.ready?.status === 'Ready FG' || row.ready?.status === 'Completed') return;
      stages.forEach((stg, idx) => {
        const s = row.stages?.[stg.key];
        const pending = Number(s?.bal || 0);
        if (pending <= 0) return;
        items.push({ row, stg, idx, pending, received: Number(s?.prod_qty || 0), rejected: Number(s?.rejection || 0) });
      });
    });
    const term = q.trim().toLowerCase();
    return items
      .filter((it) => stageFilter === 'ALL' || it.stg.key === stageFilter)
      .filter((it) => !term || [it.row.item_name, it.row.batch_no, it.row.cat_no].some((v) => String(v || '').toLowerCase().includes(term)));
  }, [data, stages, stageFilter, q]);

  const countByStage = useMemo(() => {
    const m = {};
    data.forEach((row) => stages.forEach((stg) => {
      if (Number(row.stages?.[stg.key]?.bal || 0) > 0 && row.ready?.status !== 'Ready FG') m[stg.key] = (m[stg.key] || 0) + 1;
    }));
    return m;
  }, [data, stages]);

  const totalPcs = queue.reduce((s, it) => s + it.pending, 0);

  return (
    <div className="space-y-3 -mx-1">
      {/* Floating translucent controls */}
      <div className="sticky top-0 z-20 -mx-2 px-3 pt-1 pb-2 bg-slate-50/80 backdrop-blur-xl supports-[backdrop-filter]:bg-slate-50/65">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search item or batch"
              aria-label="Search item or batch"
              className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-white border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
          <button
            type="button"
            onClick={onRefresh}
            aria-label="Refresh"
            className="w-11 h-11 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 active:scale-95 transition-transform"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin motion-reduce:animate-none' : ''}`} />
          </button>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pt-2 no-scrollbar" role="tablist" aria-label="Stages">
          {[{ key: 'ALL', full_name: 'All my stages' }, ...stages].map((s) => {
            const active = stageFilter === s.key;
            const n = s.key === 'ALL' ? null : countByStage[s.key] || 0;
            return (
              <button
                key={s.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setStageFilter(s.key)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap active:scale-95 transition-transform ${
                  active ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 border border-slate-200'
                }`}
              >
                {s.full_name}{n !== null && n > 0 ? <span className={`ml-1.5 ${active ? 'text-white/70' : 'text-slate-400'}`}>{n}</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      <p className="px-2 text-[13px] text-slate-500">
        <span className="font-semibold text-slate-900">{queue.length}</span> batch{queue.length === 1 ? '' : 'es'} waiting
        {queue.length > 0 && <> · <span className="font-semibold text-slate-900">{totalPcs.toLocaleString('en-IN')}</span> pcs</>}
      </p>

      {queue.length === 0 ? (
        <div className="text-center py-16 px-6">
          <Inbox className="w-10 h-10 mx-auto text-slate-300" aria-hidden="true" />
          <p className="mt-3 font-semibold text-slate-800">Nothing waiting</p>
          <p className="text-sm text-slate-500 mt-1">No batch is pending at {stageFilter === 'ALL' ? 'your stages' : 'this stage'} right now.</p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {queue.map((it) => (
            <li key={`${it.row.id}_${it.stg.key}`} className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="inline-block text-[11px] font-semibold text-blue-700 bg-blue-50 rounded-full px-2 py-0.5">
                    {it.stg.full_name}
                  </span>
                  <h3 className="mt-1.5 text-[15px] font-semibold leading-snug text-slate-900 tracking-[-0.01em] break-words">{it.row.item_name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">{String(it.row.batch_no || '').replace(/^#?/, '#')} · {it.row.cat_no}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[28px] leading-none font-bold text-slate-900 tracking-[-0.02em] tabular-nums">{it.pending.toLocaleString('en-IN')}</div>
                  <div className="text-[11px] text-slate-500 mt-1">pcs waiting</div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 mt-3">
                <p className="text-xs text-slate-500 tabular-nums">
                  In {it.received.toLocaleString('en-IN')}{it.rejected > 0 && <span className="text-rose-600"> · Rej {it.rejected}</span>}
                </p>
                {canHandoff && (
                  <button
                    type="button"
                    onClick={() => onHandoff(it.row, it.stg.key)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-blue-600 text-white text-sm font-semibold active:scale-[0.97] active:bg-blue-700 transition-transform"
                  >
                    Hand off <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default MobileStageQueue;
