import React, { useState } from 'react';
import { AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const PHRASE = 'DELETE ALL DATA';

/** Admin-only, irreversible: empty every table except this admin, company profile, roles and units. */
export function ResetDataPanel() {
  const { isAdmin } = useAuth();
  const { success, error } = useToast();
  const [open, setOpen] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!isAdmin) return null;

  const ready = phrase === PHRASE && password.length > 0 && !busy;

  const run = async (e) => {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    try {
      const res = await api.settings.factoryReset({ confirm: phrase, password });
      success(res?.message || 'All data cleared.');
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      error(err.message || 'Reset failed.');
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl bg-white rounded-2xl border border-rose-200 shadow-xs p-5 space-y-3">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-[#FF3B30] shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <h2 className="text-[15px] font-semibold text-slate-900">Reset all data</h2>
          <p className="text-[13px] text-slate-600 mt-0.5">
            Permanently deletes every batch, stock figure, item, godown, BOM, process, party, rejection, report history and
            all other users. Keeps only your admin account, the company profile, roles and units. This cannot be undone.
          </p>
        </div>
      </div>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="h-9 px-4 rounded-xl border border-rose-300 text-[#D70015] text-[13px] font-semibold hover:bg-rose-50 cursor-pointer"
        >
          Reset all data…
        </button>
      ) : (
        <form onSubmit={run} className="space-y-3">
          <div>
            <label htmlFor="reset-phrase" className="block text-[13px] text-slate-700 mb-1">
              Type <span className="font-mono font-semibold text-slate-900">{PHRASE}</span> to confirm
            </label>
            <input
              id="reset-phrase"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-xl px-3 py-2 border border-slate-300 font-mono text-sm"
            />
          </div>
          <div>
            <label htmlFor="reset-pass" className="block text-[13px] text-slate-700 mb-1">Your admin password</label>
            <div className="relative">
              <input
                id="reset-pass"
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full rounded-xl pl-3 pr-10 py-2 border border-slate-300 text-sm"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? 'Hide password' : 'Show password'}
                className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={!ready}
              className="h-9 px-4 rounded-xl bg-[#FF3B30] hover:bg-[#E0352B] disabled:opacity-40 text-white text-[13px] font-semibold cursor-pointer"
            >
              {busy ? 'Clearing…' : 'Delete everything'}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setPhrase(''); setPassword(''); }}
              className="h-9 px-4 rounded-xl bg-black/[0.05] text-slate-700 text-[13px] font-medium cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default ResetDataPanel;
