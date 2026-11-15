import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, CornerDownLeft, Keyboard } from 'lucide-react';
import { SECTIONS } from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import { canOpenTab, canSettingsSub } from '../../utils/access';
import { isSoundOn, setSoundOn, playSound } from '../../utils/uiSounds';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '');
export const MOD = isMac ? '⌘' : 'Ctrl';
const ALT = isMac ? '⌥' : 'Alt';

// Shortcut reference shown in the help sheet
const HELP = [
  { group: 'General', rows: [
    [[MOD, 'K'], 'Search pages & actions'],
    [['?'], 'Show keyboard shortcuts'],
    [['/'], 'Focus search box'],
    [['Esc'], 'Close dialog / menu'],
  ] },
  { group: 'Go to', rows: [
    [[ALT, '1'], 'SKU Tracking'],
    [[ALT, '2'], 'Planning'],
    [[ALT, '3'], 'Rejections'],
    [[ALT, '4'], 'Process Maps'],
    [[ALT, '5'], 'Stock & Godowns'],
    [[ALT, '6'], 'In / Out'],
    [[ALT, '7'], 'SKU & BOM'],
    [[ALT, '8'], 'Dashboard'],
    [[ALT, '9'], 'Settings'],
  ] },
  { group: 'Actions', rows: [
    [[MOD, 'S'], 'Save'],
    [[ALT, 'N'], 'New / Add'],
    [[ALT, 'R'], 'Refresh / Sync'],
    [[MOD, 'B'], 'Show / hide sidebar'],
    [[ALT, 'M'], 'Sound effects on / off'],
    [[ALT, 'Q'], 'Sign out'],
  ] },
];

const NAV_ORDER = ['sku_tracker', 'planning', 'rejections', 'production_process', 'inventory', 'in_out', 'sku_bom', 'dashboard', 'settings'];

const visible = (el) => el && el.offsetParent !== null && !el.disabled && el.getAttribute('aria-disabled') !== 'true';
// Where actions apply: the top-most open dialog, otherwise the page
function scope() {
  const dialogs = [...document.querySelectorAll('[role="dialog"], .bi-dialog, .fixed.inset-0.z-50')].filter(visible);
  return dialogs[dialogs.length - 1] || document.querySelector('main') || document.body;
}
function clickFirst(re, attr = false) {
  const btn = [...scope().querySelectorAll('button')].find((b) => {
    if (!visible(b)) return false;
    const label = attr ? `${b.title || ''} ${b.getAttribute('aria-label') || ''} ${b.textContent || ''}` : (b.textContent || '');
    return re.test(label.trim());
  });
  if (btn) { btn.click(); return true; }
  return false;
}
const typing = (t) => t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

export function Kbd({ keys }) {
  return (
    <span className="inline-flex items-center gap-1">
      {keys.map((k) => <kbd key={k}>{k}</kbd>)}
    </span>
  );
}

export function KeyboardShortcuts({ setActiveTab, setSettingsSubTab, toggleCollapsed }) {
  const { hasPermission, logout } = useAuth();
  const [palette, setPalette] = useState(false);
  const [help, setHelp] = useState(false);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const go = (tab, sub) => {
    setActiveTab(tab);
    if (sub && setSettingsSubTab) setSettingsSubTab(sub);
  };

  const commands = useMemo(() => {
    const out = [];
    SECTIONS.forEach((s) => s.items.forEach((it) => {
      if (it.hasSubmenu) {
        if (!canOpenTab('settings', hasPermission)) return;
        it.subItems.filter((sub) => canSettingsSub(sub.id, hasPermission)).forEach((sub) =>
          out.push({ id: `set-${sub.id}`, label: sub.label, hint: 'Settings', run: () => go('settings', sub.id) }));
      } else if (canOpenTab(it.id, hasPermission)) {
        const n = NAV_ORDER.indexOf(it.id) + 1;
        out.push({ id: it.id, label: it.label, hint: s.title, keys: n ? [ALT, String(n)] : null, run: () => go(it.id) });
      }
    }));
    out.push({ id: 'a-save', label: 'Save', hint: 'Action', keys: [MOD, 'S'], run: () => setTimeout(() => clickFirst(/^(save|update)\b/i), 60) });
    out.push({ id: 'a-new', label: 'New / Add', hint: 'Action', keys: [ALT, 'N'], run: () => setTimeout(() => clickFirst(/^(\+\s*)?(new|add|create)\b/i), 60) });
    out.push({ id: 'a-refresh', label: 'Refresh / Sync', hint: 'Action', keys: [ALT, 'R'], run: () => setTimeout(() => clickFirst(/(refresh|sync|reload)/i, true), 60) });
    out.push({ id: 'a-sidebar', label: 'Show / hide sidebar', hint: 'Action', keys: [MOD, 'B'], run: toggleCollapsed });
    out.push({ id: 'a-sound', label: 'Sound effects on / off', hint: 'Action', keys: [ALT, 'M'], run: () => setSoundOn(!isSoundOn()) });
    out.push({ id: 'a-help', label: 'Keyboard shortcuts', hint: 'Help', keys: ['?'], run: () => setHelp(true) });
    out.push({ id: 'a-logout', label: 'Sign out', hint: 'Account', keys: [ALT, 'Q'], run: logout });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPermission]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return commands;
    return commands
      .map((c) => {
        const t = `${c.label} ${c.hint}`.toLowerCase();
        const at = t.indexOf(s);
        if (at >= 0) return { c, score: at === 0 ? 0 : 1 };
        // loose subsequence match ("stk" → "Stock")
        let i = 0;
        for (const ch of t) if (ch === s[i]) i++;
        return i === s.length ? { c, score: 2 } : null;
      })
      .filter(Boolean).sort((a, b) => a.score - b.score).map((r) => r.c);
  }, [q, commands]);

  useEffect(() => { setSel(0); }, [q]);
  useEffect(() => {
    if (palette) { setQ(''); setTimeout(() => inputRef.current?.focus(), 10); }
  }, [palette]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-i="${sel}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  useEffect(() => {
    const open = () => setPalette(true);
    const openHelp = () => setHelp(true);
    window.addEventListener('bi:palette', open);
    window.addEventListener('bi:shortcuts', openHelp);
    return () => { window.removeEventListener('bi:palette', open); window.removeEventListener('bi:shortcuts', openHelp); };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      const key = (e.key || '').toLowerCase();

      if (mod && !e.shiftKey && !e.altKey && key === 'k') { e.preventDefault(); setHelp(false); setPalette((v) => !v); return; }
      if (e.key === 'Escape' && (palette || help)) { e.preventDefault(); e.stopPropagation(); setPalette(false); setHelp(false); return; }
      if (palette || help) return;

      if (mod && !e.shiftKey && key === 's') { e.preventDefault(); if (clickFirst(/^(save|update)\b/i)) playSound('save'); return; }
      if (mod && !e.shiftKey && !e.altKey && key === 'b' && !typing(e.target)) { e.preventDefault(); toggleCollapsed(); return; }

      if (e.altKey && !mod) {
        const m = /^Digit([1-9])$/.exec(e.code || '');
        if (m) {
          const id = NAV_ORDER[Number(m[1]) - 1];
          if (canOpenTab(id, hasPermission)) { e.preventDefault(); go(id); playSound('menu'); }
          return;
        }
        if (e.code === 'KeyN') { e.preventDefault(); clickFirst(/^(\+\s*)?(new|add|create)\b/i) && playSound('click'); return; }
        if (e.code === 'KeyR') { e.preventDefault(); clickFirst(/(refresh|sync|reload)/i, true) && playSound('click'); return; }
        if (e.code === 'KeyM') { e.preventDefault(); const on = !isSoundOn(); setSoundOn(on); if (on) playSound('save'); return; }
        if (e.code === 'KeyQ') { e.preventDefault(); logout(); return; }
      }

      if (typing(e.target) || mod || e.altKey) return;
      if (e.key === '?') { e.preventDefault(); setHelp(true); return; }
      if (e.key === '/') {
        const box = [...scope().querySelectorAll('input[type="search"], input[placeholder*="earch"]')].find(visible);
        if (box) { e.preventDefault(); box.focus(); box.select?.(); }
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [palette, help, hasPermission, toggleCollapsed]);

  const runAt = (i) => {
    const c = results[i];
    if (!c) return;
    setPalette(false);
    playSound(c.hint === 'Action' || c.hint === 'Help' || c.hint === 'Account' ? 'click' : 'menu');
    c.run();
  };

  return (
    <>
      {palette && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] px-4" role="presentation">
          <div className="fixed inset-0 bg-black/20 bi-scrim" onMouseDown={() => setPalette(false)} aria-hidden="true" />
          <div role="dialog" aria-label="Search pages and actions"
            className="bi-palette relative w-full max-w-[560px] rounded-[18px] overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 h-14 hairline-b">
              <Search className="w-[18px] h-[18px] text-[#86868B] shrink-0" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(results.length - 1, s + 1)); }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
                  else if (e.key === 'Enter') { e.preventDefault(); runAt(sel); }
                }}
                placeholder="Search pages, settings and actions…"
                className="bi-palette-input flex-1 bg-transparent text-[17px] tracking-[-0.02em] text-[#1D1D1F] placeholder:text-[#A1A1A6]"
                aria-label="Search"
              />
              <kbd>Esc</kbd>
            </div>
            <ul ref={listRef} className="max-h-[52vh] overflow-y-auto p-1.5" role="listbox">
              {results.length === 0 && <li className="px-3 py-6 text-center text-[13px] text-[#86868B]">No results for “{q}”</li>}
              {results.map((c, i) => (
                <li key={c.id} data-i={i} role="option" aria-selected={i === sel}
                  onMouseMove={() => setSel(i)}
                  onClick={() => runAt(i)}
                  className={`flex items-center gap-3 h-10 px-3 rounded-[10px] cursor-pointer ${i === sel ? 'bg-[#007AFF] text-white' : 'text-[#1D1D1F]'}`}>
                  <span className="flex-1 truncate text-[14px] font-medium tracking-[-0.01em]">{c.label}</span>
                  <span className={`text-[12px] ${i === sel ? 'text-white/75' : 'text-[#86868B]'}`}>{c.hint}</span>
                  {i === sel ? <CornerDownLeft className="w-3.5 h-3.5 text-white/85" /> : (c.keys && <Kbd keys={c.keys} />)}
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between px-4 h-9 hairline-t text-[11.5px] text-[#86868B]">
              <span>↑ ↓ to move · Enter to open</span>
              <button type="button" className="flex items-center gap-1 hover:text-[#007AFF] cursor-pointer" onClick={() => { setPalette(false); setHelp(true); }}>
                <Keyboard className="w-3.5 h-3.5" /> All shortcuts <kbd>?</kbd>
              </button>
            </div>
          </div>
        </div>
      )}

      {help && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="presentation">
          <div className="fixed inset-0 bg-black/25 bi-scrim" onMouseDown={() => setHelp(false)} aria-hidden="true" />
          <div role="dialog" aria-label="Keyboard shortcuts" className="bi-palette relative w-full max-w-[720px] rounded-[22px] overflow-hidden">
            <div className="flex items-center justify-between px-6 h-14 hairline-b">
              <h3 className="text-[17px] font-semibold tracking-[-0.022em] text-[#1D1D1F]">Keyboard Shortcuts</h3>
              <kbd>Esc</kbd>
            </div>
            <div className="grid sm:grid-cols-3 gap-6 p-6 max-h-[70vh] overflow-y-auto">
              {HELP.map((g) => (
                <div key={g.group}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#86868B] mb-2">{g.group}</p>
                  <ul className="space-y-2">
                    {g.rows.map(([keys, label]) => (
                      <li key={label} className="flex items-center justify-between gap-3 text-[13px] text-[#1D1D1F]">
                        <span className="truncate">{label}</span>
                        <Kbd keys={keys} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default KeyboardShortcuts;
