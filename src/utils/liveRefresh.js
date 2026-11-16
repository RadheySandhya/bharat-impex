import { useEffect, useRef } from 'react';

export const LIVE_INTERVAL_MS = 10000;

/** Do not refresh while the user is busy: tab hidden, a dialog/popup open, or typing in a field. */
function userIsBusy() {
  if (typeof document === 'undefined' || document.hidden) return true;
  if (document.querySelector('[role="dialog"], .bi-dialog, .bi-select-menu, .bi-palette')) return true;
  const a = document.activeElement;
  if (a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) return true;
  return false;
}

/**
 * Live sync: call `reload(true)` (silent) every 10 s with fresh server data, and right away when
 * the tab becomes visible again. Skips a tick while the user is busy so nothing they do is disturbed.
 */
export function useLiveRefresh(reload, enabled = true) {
  const ref = useRef(reload);
  ref.current = reload;
  useEffect(() => {
    if (!enabled) return undefined;
    let running = false;
    const tick = async () => {
      if (running || userIsBusy()) return;
      running = true;
      try { await ref.current(true); } catch (e) { /* next tick retries */ } finally { running = false; }
    };
    const id = setInterval(tick, LIVE_INTERVAL_MS);
    const onVis = () => { if (!document.hidden) tick(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onVis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('focus', onVis); };
  }, [enabled]);
}
