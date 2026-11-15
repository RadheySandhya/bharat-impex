import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, ShieldAlert, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

/** Settings → Defect Reasons: the list shown in "Defect Reason" when rejecting pieces at a stage handoff. */
export function DefectReasons() {
  const { success, error } = useToast();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('masters.edit');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.settings.getReasons();
      setRows((res?.data || []).filter((r) => Number(r.active) === 1));
    } catch (err) {
      error('Could not load defect reasons: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (payload, msg) => {
    setBusy(true);
    try {
      await api.settings.saveReason(payload);
      success(msg);
      await load();
      return true;
    } catch (err) {
      error(err.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const add = async (e) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    if (rows.some((r) => r.reason_name.toLowerCase() === n.toLowerCase())) { error(`"${n}" is already in the list.`); return; }
    if (await save({ reason_name: n }, `Added "${n}".`)) setName('');
  };
  const rename = async (r) => {
    const n = editName.trim();
    if (!n || n === r.reason_name) { setEditId(null); return; }
    if (await save({ id: r.id, reason_name: n, category: r.category, description: r.description }, 'Reason updated.')) setEditId(null);
  };
  const remove = async (r) => {
    if (!window.confirm(`Remove "${r.reason_name}" from the list? Old rejections keep their reason.`)) return;
    await save({ id: r.id, reason_name: r.reason_name, active: 0 }, 'Reason removed.');
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-600" /> Defect Reasons
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          These reasons appear in "Defect Reason" when you reject pieces while sending a batch to the next stage.
        </p>
      </div>

      {canEdit && (
        <form onSubmit={add} className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New reason, e.g. Sand Inclusion"
            className="flex-1 h-9 px-3 rounded-lg border border-slate-300 text-sm" aria-label="New defect reason" />
          <button type="submit" disabled={busy || !name.trim()}
            className="h-9 px-4 rounded-lg bg-[#007AFF] hover:bg-[#0A6CF0] disabled:opacity-50 text-white text-sm font-semibold flex items-center gap-1.5 cursor-pointer">
            <Plus className="w-4 h-4" /> Add Reason
          </button>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm"><Loader2 className="w-4 h-4 animate-spin inline" /> Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No reasons yet. Add the first one above.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((r, i) => (
              <li key={r.id} className="flex items-center gap-3 px-4 h-12">
                <span className="w-6 text-[12px] text-slate-400 tabular-nums">{i + 1}</span>
                {editId === r.id ? (
                  <>
                    <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') rename(r); if (e.key === 'Escape') setEditId(null); }}
                      className="flex-1 h-8 px-2 rounded-lg border border-slate-300 text-sm" aria-label="Reason name" />
                    <button type="button" onClick={() => rename(r)} className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 cursor-pointer" aria-label="Save"><Check className="w-4 h-4" /></button>
                    <button type="button" onClick={() => setEditId(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer" aria-label="Cancel"><X className="w-4 h-4" /></button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium text-slate-900">{r.reason_name}</span>
                    {canEdit && (
                      <>
                        <button type="button" onClick={() => { setEditId(r.id); setEditName(r.reason_name); }} title="Rename"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#007AFF] hover:bg-blue-50 cursor-pointer"><Pencil className="w-4 h-4" /></button>
                        <button type="button" onClick={() => remove(r)} title="Remove"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                      </>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default DefectReasons;
