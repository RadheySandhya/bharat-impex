import React, { useEffect, useMemo, useState } from 'react';
import { X, Flame, Undo2, Wrench, Inbox, Scissors, CircleDot, Send, Loader2, Plus } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

/**
 * Rejection tracker popup. Rejected pieces have no fixed route: from wherever they are,
 * any quantity can be sent to any production stage (for work), back into the production
 * flow at any stage, or to the furnace. Shows where every piece is now and each lot's journey.
 *
 * props: isOpen, onClose, batchNo, sourceStageKey (optional), title info {itemName, sourceStageName},
 *        stages: [{key, name}], onChanged()
 */
const fmt = (s) => {
  if (!s) return '';
  const d = new Date(String(s).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};
const num = (v) => Number(Number(v || 0).toFixed(3));

const EVENT = {
  CREATED: { icon: CircleDot, color: '#FF3B30', label: (h) => `Rejected${h.step_name ? ' → ' + h.step_name : ''}` },
  REJECTED: { icon: CircleDot, color: '#FF3B30', label: (h) => `Rejected at ${h.from} → ${h.to}` },
  SPLIT: { icon: Scissors, color: '#8E8E93', label: (h) => `Split ${h.qty} pcs off` },
  SPLIT_OUT: { icon: Scissors, color: '#8E8E93', label: (h) => `${h.qty} pcs moved out (lot ${h.child || ''})` },
  STAGE: { icon: Wrench, color: '#007AFF', label: (h) => `Sent to ${h.to} for work` },
  BIN: { icon: Inbox, color: '#FF9500', label: () => 'Back to Rejection Bin' },
  RETURN: { icon: Undo2, color: '#34C759', label: (h) => `Returned to production at ${h.to}` },
  STOCK: { icon: Undo2, color: '#34C759', label: (h) => `Repaired – added to ${h.stock || 'Ready'} stock` },
  FURNACE: { icon: Flame, color: '#FF3B30', label: (h) => `Furnace — ${h.scrap_weight_kg ?? ''} kg scrap booked` },
  MOVED: { icon: CircleDot, color: '#8E8E93', label: (h) => `Moved to ${h.step_name}` },
  DECIDED: { icon: CircleDot, color: '#8E8E93', label: () => 'Decision made (old flow)' },
  COMPLETED: { icon: CircleDot, color: '#34C759', label: () => 'Completed' },
  CANCELLED: { icon: X, color: '#8E8E93', label: () => 'Cancelled' },
};

const LOC_STYLE = {
  BIN: 'bg-amber-50 text-amber-800 border-amber-200',
  STAGE: 'bg-blue-50 text-blue-800 border-blue-200',
  RETURNED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  STOCK: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  FURNACE: 'bg-rose-50 text-rose-800 border-rose-200',
};

function DestSelect({ value, onChange, stages, lot }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 min-w-[200px] h-9 px-2 rounded-lg border text-sm" aria-label="Send to">
      <option value="">Send to…</option>
      <optgroup label="Send to a stage for work (keep tracking)">
        {stages.map((s) => <option key={`S${s.key}`} value={`STAGE|${s.key}`}>Work at {s.name}</option>)}
      </optgroup>
      <optgroup label="Repaired — OK">
        <option value="STOCK|">OK – add to Ready stock (same qty)</option>
      </optgroup>
      <optgroup label="OK now — rejoin production flow at">
        {stages.map((s) => <option key={`R${s.key}`} value={`RETURN|${s.key}`}>Return to production at {s.name}</option>)}
      </optgroup>
      <optgroup label="Total reject">
        <option value="FURNACE|">Furnace (book scrap kg)</option>
      </optgroup>
      {lot.location_type !== 'BIN' && (
        <optgroup label="Hold">
          <option value="BIN|">Back to Rejection Bin</option>
        </optgroup>
      )}
    </select>
  );
}

// One lot can be split to several places in one go, e.g. 3 pcs to Furnace + 2 pcs to Machining.
function MoveForm({ lot, stages, onMoved }) {
  const { success, error } = useToast();
  const total = num(lot.quantity);
  const newLine = (q) => ({ id: Math.random().toString(36).slice(2), qty: String(q), dest: '', kg: '' });
  const [lines, setLines] = useState([newLine(total)]);
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);
  // After a move the lot comes back with its new quantity/location: start the form again from that
  useEffect(() => { setLines([newLine(total)]); }, [total, lot.location_name]); // eslint-disable-line react-hooks/exhaustive-deps

  const used = lines.reduce((s, l) => s + (Number(l.qty) || 0), 0);
  const left = Number((total - used).toFixed(3));
  const set = (id, patch) => setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const addSplit = () => {
    setLines((ls) => {
      // take pieces from the last line so the total stays the same
      const last = ls[ls.length - 1];
      const lastQ = Number(last.qty) || 0;
      const give = left > 0 ? left : Math.max(0, Math.floor(lastQ / 2));
      const trimmed = left > 0 ? ls : ls.map((l) => (l.id === last.id ? { ...l, qty: String(lastQ - give) } : l));
      return [...trimmed, newLine(give)];
    });
  };
  const stageName = (key) => stages.find((s) => s.key === key)?.name || key;

  const submit = async () => {
    const valid = lines.filter((l) => Number(l.qty) > 0);
    if (!valid.length) return error('Enter a quantity.');
    if (valid.some((l) => !l.dest)) return error('Choose where each quantity goes.');
    if (used - total > 0.0005) return error(`Total ${used} pcs is more than the ${total} pcs in this lot.`);
    setBusy(true);
    let done = 0;
    try {
      // Same lot id each time: a part move splits the moved pieces off and the rest stay in this lot
      for (const l of valid) {
        const [action, stageKey] = l.dest.split('|');
        await api.rejections.moveLot({
          id: lot.id, quantity: Number(l.qty), action, stage_key: stageKey || '', stage_name: stageKey ? stageName(stageKey) : '',
          scrap_weight_kg: action === 'FURNACE' && Number(l.kg) > 0 ? Number(l.kg) : undefined, remarks,
        });
        done += 1;
      }
      success(valid.length > 1 ? `Sent ${used} pcs to ${valid.length} places.` : 'Saved.');
      setRemarks('');
      onMoved();
    } catch (err) {
      error(done ? `${done} of ${valid.length} moves saved, then: ${err.message}` : err.message);
      if (done) onMoved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 rounded-xl bg-[#F5F5F7] p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold text-slate-500">Send these pieces next</div>
        <div className={`text-[11px] font-semibold ${left < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
          {left > 0 ? `${left} pcs stay here` : left < 0 ? `${-left} pcs too many` : 'All pieces assigned'}
        </div>
      </div>
      {lines.map((l, idx) => {
        const action = l.dest.split('|')[0];
        const q = Number(l.qty) || 0;
        return (
          <div key={l.id} className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <input type="number" min="1" max={total} value={l.qty} onChange={(e) => set(l.id, { qty: e.target.value })}
                className="w-20 h-9 px-2 rounded-lg border text-sm font-semibold text-right" aria-label="Quantity" />
              <span className="text-xs text-slate-500">pcs</span>
              <DestSelect value={l.dest} onChange={(v) => set(l.id, { dest: v })} stages={stages} lot={lot} />
              {lines.length > 1 && (
                <button type="button" onClick={() => setLines((ls) => ls.filter((x) => x.id !== l.id))} aria-label="Remove split"
                  className="w-8 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {action === 'FURNACE' && (
              <div className="flex items-center gap-2 pl-[104px]">
                <input type="number" step="0.001" min="0" value={l.kg} onChange={(e) => set(l.id, { kg: e.target.value })}
                  placeholder={`≈ ${(q * Number(lot.avg_weight || 0)).toFixed(3)}`} className="w-32 h-9 px-2 rounded-lg border text-sm text-right" aria-label="Scrap kg" />
                <span className="text-xs text-slate-500">kg scrap{idx === 0 ? ` (blank = ${Number(lot.avg_weight || 0).toFixed(3)} kg/pc)` : ''}</span>
              </div>
            )}
          </div>
        );
      })}
      <button type="button" onClick={addSplit} className="text-[12px] font-semibold text-[#007AFF] hover:underline cursor-pointer flex items-center gap-1">
        <Plus className="w-3.5 h-3.5" /> Split to another place
      </button>
      <div className="flex items-center gap-2">
        <input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Remarks (optional)" className="flex-1 h-9 px-2 rounded-lg border text-sm" />
        <button type="button" onClick={submit} disabled={busy || used <= 0 || left < 0}
          className="h-9 px-4 rounded-lg bg-[#007AFF] hover:bg-[#0A6CF0] disabled:opacity-50 text-white text-sm font-semibold flex items-center gap-1.5 cursor-pointer">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {`Send ${used} pcs`}
        </button>
      </div>
    </div>
  );
}

function Journey({ lot }) {
  const events = (lot.history || []).filter((h) => h.action !== 'SPLIT_OUT' || true);
  return (
    <ol className="relative ml-2 mt-2 border-l border-slate-200 space-y-2.5">
      {events.map((h, i) => {
        const meta = EVENT[h.action] || { icon: CircleDot, color: '#8E8E93', label: () => h.action };
        const I = meta.icon;
        return (
          <li key={i} className="ml-4">
            <span className="absolute -left-[9px] mt-0.5 w-[18px] h-[18px] rounded-full bg-white flex items-center justify-center ring-1 ring-slate-200">
              <I className="w-3 h-3" style={{ color: meta.color }} />
            </span>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-[13px] font-semibold text-slate-900">{meta.label(h)}</span>
              {h.qty ? <span className="text-[12px] font-semibold text-slate-600">{num(h.qty)} pcs</span> : null}
            </div>
            <div className="text-[11.5px] text-slate-500">
              {fmt(h.at)}{h.by ? ` · ${h.by}` : ''}{h.remarks ? ` · ${h.remarks}` : ''}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function RejectionTrackerModal({ isOpen, onClose, batchNo, sourceStageKey, itemName, sourceStageName, stages = [], onChanged }) {
  const { error } = useToast();
  const { hasPermission } = useAuth();
  const canMove = hasPermission('rejections.process');
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!batchNo) return;
    setLoading(true);
    try {
      const res = await api.rejections.getLots({ batch_no: batchNo, source_stage_key: sourceStageKey || undefined, status: 'ALL' });
      setLots(res?.data || []);
    } catch (err) {
      error('Could not load rejection lots: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isOpen) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [isOpen, batchNo, sourceStageKey]);
  useEffect(() => {
    if (!isOpen) return;
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [isOpen, onClose]);

  const live = lots.filter((l) => l.status !== 'CANCELLED');
  const total = live.reduce((s, l) => s + num(l.quantity), 0);
  const summary = useMemo(() => {
    const at = {}; let bin = 0, furnace = 0, furnaceKg = 0, stocked = 0; const returned = {};
    live.forEach((l) => {
      const q = num(l.quantity);
      if (l.location_type === 'BIN') bin += q;
      else if (l.location_type === 'STAGE') at[l.location_key || l.location_name] = (at[l.location_key || l.location_name] || 0) + q;
      else if (l.location_type === 'FURNACE') { furnace += q; furnaceKg += Number(l.scrap_weight_kg || 0); }
      else if (l.location_type === 'STOCK') stocked += q;
      else if (l.location_type === 'RETURNED') returned[l.location_key || l.location_name] = (returned[l.location_key || l.location_name] || 0) + q;
    });
    return { at, bin, furnace, furnaceKg, stocked, returned };
  }, [lots]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;
  const srcKeys = new Set(live.map((l) => l.source_stage_key));
  const openLots = live.filter((l) => l.status === 'OPEN');
  const closedLots = live.filter((l) => l.status !== 'OPEN');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6" role="presentation">
      <div className="fixed inset-0 bg-black/30 bi-scrim" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-label="Rejection tracking" className="bi-dialog relative w-full max-w-4xl bg-white sm:rounded-[22px] rounded-t-[22px] shadow-2xl overflow-hidden z-10 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-4 pb-3 hairline-b">
          <div className="min-w-0">
            <h3 className="text-[17px] font-semibold tracking-[-0.022em] text-slate-900">Rejection Tracking</h3>
            <p className="text-[12.5px] text-slate-500 truncate">
              {itemName || live[0]?.item_name || 'Item'} · Batch #{batchNo}{sourceStageName ? ` · rejected at ${sourceStageName}` : ''} · <b className="text-slate-800">{total} pcs</b>
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-[30px] h-[30px] shrink-0 rounded-full bg-black/[0.06] hover:bg-black/[0.1] text-slate-500 flex items-center justify-center cursor-pointer">
            <X className="w-4 h-4" strokeWidth={2.4} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 sm:px-6 py-4 space-y-4">
          {/* Where are the pieces now — over the production stages */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500 mb-2">Where the pieces are now</div>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))' }}>
              <div className={`min-w-0 rounded-xl border px-2.5 py-2 ${summary.bin ? LOC_STYLE.BIN : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                <div className="flex items-center gap-1 text-[10.5px] font-semibold"><Inbox className="w-3 h-3" /> Rejection Bin</div>
                <div className="text-[18px] font-bold tabular-nums">{summary.bin}</div>
              </div>
              {stages.map((s) => {
                const working = summary.at[s.key] || 0;
                const back = summary.returned[s.key] || 0;
                const isSrc = srcKeys.has(s.key);
                const cls = working ? LOC_STYLE.STAGE : back ? LOC_STYLE.RETURNED : 'bg-slate-50 text-slate-400 border-slate-200';
                return (
                  <div key={s.key} className={`min-w-0 rounded-xl border px-2.5 py-2 ${cls} ${isSrc ? 'ring-2 ring-rose-300' : ''}`} title={s.name}>
                    <div className="text-[10.5px] font-semibold truncate">{s.name}</div>
                    <div className="text-[18px] font-bold tabular-nums">{working || back || 0}</div>
                    <div className="text-[10px] font-medium">{isSrc ? 'rejected here' : working ? 'at work' : back ? 'returned' : '—'}</div>
                  </div>
                );
              })}
              <div className={`min-w-0 rounded-xl border px-2.5 py-2 ${summary.stocked ? LOC_STYLE.STOCK : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                <div className="text-[10.5px] font-semibold">Added to stock</div>
                <div className="text-[18px] font-bold tabular-nums">{summary.stocked}</div>
                <div className="text-[10px] font-medium">{summary.stocked ? 'repaired, OK' : '—'}</div>
              </div>
              <div className={`min-w-0 rounded-xl border px-2.5 py-2 ${summary.furnace ? LOC_STYLE.FURNACE : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                <div className="flex items-center gap-1 text-[10.5px] font-semibold"><Flame className="w-3 h-3" /> Furnace</div>
                <div className="text-[18px] font-bold tabular-nums">{summary.furnace}</div>
                <div className="text-[10px] font-medium">{summary.furnace ? `${summary.furnaceKg.toFixed(2)} kg` : '—'}</div>
              </div>
            </div>
          </div>

          {loading && <div className="py-8 text-center text-sm text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline" /> Loading…</div>}
          {!loading && live.length === 0 && (
            <div className="py-8 text-center text-sm text-slate-500">No rejection lots found for this batch and stage.</div>
          )}

          {/* Open lots: journey + send */}
          {openLots.map((lot) => (
            <div key={lot.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[12px] font-bold text-[#007AFF]">{lot.lot_number}</span>
                <span className="text-[13px] font-semibold text-slate-900">{num(lot.quantity)} pcs</span>
                <span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${LOC_STYLE[lot.location_type] || LOC_STYLE.BIN}`}>Now: {lot.location_name}</span>
                {lot.defect_reason && <span className="text-[11.5px] text-slate-500">· {lot.defect_reason}</span>}
                {lot.parent_lot_number && <span className="text-[11.5px] text-slate-400">· split from {lot.parent_lot_number}</span>}
              </div>
              <Journey lot={lot} />
              {canMove ? <MoveForm lot={lot} stages={stages} onMoved={() => { load(); onChanged && onChanged(); }} />
                : <p className="mt-2 text-[11.5px] text-slate-400">Your role can view but not move rejected pieces.</p>}
            </div>
          ))}

          {/* Closed lots */}
          {closedLots.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500 mb-2">Finished ({closedLots.length})</div>
              <div className="space-y-2">
                {closedLots.map((lot) => (
                  <details key={lot.id} className="rounded-xl border border-slate-200 px-4 py-2.5">
                    <summary className="flex flex-wrap items-center gap-2 cursor-pointer">
                      <span className="font-mono text-[12px] font-bold text-slate-500">{lot.lot_number}</span>
                      <span className="text-[13px] font-semibold text-slate-900">{num(lot.quantity)} pcs</span>
                      <span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${LOC_STYLE[lot.location_type] || LOC_STYLE.RETURNED}`}>
                        {lot.location_type === 'FURNACE' ? `Furnace · ${Number(lot.scrap_weight_kg).toFixed(2)} kg` : lot.location_type === 'STOCK' ? 'Repaired · added to stock' : `Returned · ${lot.location_name}`}
                      </span>
                    </summary>
                    <Journey lot={lot} />
                  </details>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RejectionTrackerModal;
