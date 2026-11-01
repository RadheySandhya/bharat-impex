import React, { useEffect, useState } from 'react';
import { Share, PlusSquare, X } from 'lucide-react';

const SNOOZE_KEY = 'bharat_install_prompt_snoozed_until';
const SNOOZE_DAYS = 7;

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isPhone = () => window.matchMedia?.('(max-width: 1023px)').matches && (('ontouchstart' in window) || navigator.maxTouchPoints > 0);
const snoozed = () => {
  try { return Number(localStorage.getItem(SNOOZE_KEY) || 0) > Date.now(); } catch (e) { return false; }
};

/**
 * Phone-only bottom sheet inviting the user to install the app.
 * Android/Chrome: uses the browser's install prompt. iPhone: shows Share → Add to Home Screen.
 */
export function InstallPromptSheet() {
  const [open, setOpen] = useState(false);
  const [promptEvent, setPromptEvent] = useState(() => window.__biInstallPrompt || null);
  const ios = isIOS();

  useEffect(() => {
    if (isStandalone() || !isPhone() || snoozed()) return undefined;

    const show = () => setOpen(true);
    let timer = null;
    const onReady = () => {
      setPromptEvent(window.__biInstallPrompt || null);
      clearTimeout(timer);
      timer = setTimeout(show, 2500);
    };
    const onInstalled = () => setOpen(false);

    window.addEventListener('bi:installable', onReady);
    window.addEventListener('appinstalled', onInstalled);
    // iPhone never fires an install event; Android may already have it captured
    if (ios || window.__biInstallPrompt) timer = setTimeout(show, 2500);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('bi:installable', onReady);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!open) return null;

  const later = () => {
    try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 86400000)); } catch (e) {}
    setOpen(false);
  };

  const install = async () => {
    if (!promptEvent) return;
    promptEvent.prompt();
    const choice = await promptEvent.userChoice.catch(() => null);
    window.__biInstallPrompt = null;
    setPromptEvent(null);
    if (choice?.outcome === 'accepted') setOpen(false);
    else later();
  };

  return (
    <div className="fixed inset-0 z-[65] flex items-end justify-center" role="presentation">
      <div className="absolute inset-0 bg-black/30 bi-scrim" onClick={later} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Install Bharat Impex"
        className="bi-dialog relative w-full max-w-md bg-white rounded-t-[22px] shadow-2xl px-5 pt-2"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 20px)' }}
      >
        <div className="flex justify-center pb-3" aria-hidden="true">
          <div className="w-9 h-[5px] rounded-full bg-black/15" />
        </div>
        <button
          type="button"
          onClick={later}
          aria-label="Close"
          className="absolute right-4 top-4 w-[30px] h-[30px] rounded-full bg-black/[0.06] text-slate-500 flex items-center justify-center"
        >
          <X className="w-4 h-4" strokeWidth={2.4} />
        </button>

        <div className="flex items-center gap-4">
          <img src="./icons/icon-192.png" alt="" className="w-16 h-16 rounded-[16px] shadow-md shrink-0" />
          <div className="min-w-0 pr-8">
            <h2 className="text-[19px] font-semibold tracking-[-0.022em] text-slate-900 leading-tight">Install Bharat Impex</h2>
            <p className="text-[14px] text-slate-500 mt-0.5 leading-snug">Open it from your home screen like an app — full screen and faster.</p>
          </div>
        </div>

        {ios && !promptEvent ? (
          <ol className="mt-5 space-y-3 text-[15px] text-slate-800">
            <li className="flex items-center gap-3 bg-[#F5F5F7] rounded-2xl px-4 py-3">
              <span className="w-6 h-6 rounded-full bg-white text-[13px] font-semibold flex items-center justify-center shadow-xs">1</span>
              <span className="flex items-center gap-1.5">Tap <Share className="w-[18px] h-[18px] text-[#007AFF]" aria-hidden="true" /> <strong className="font-semibold">Share</strong> in Safari</span>
            </li>
            <li className="flex items-center gap-3 bg-[#F5F5F7] rounded-2xl px-4 py-3">
              <span className="w-6 h-6 rounded-full bg-white text-[13px] font-semibold flex items-center justify-center shadow-xs">2</span>
              <span className="flex items-center gap-1.5">Choose <PlusSquare className="w-[18px] h-[18px] text-[#007AFF]" aria-hidden="true" /> <strong className="font-semibold">Add to Home Screen</strong></span>
            </li>
          </ol>
        ) : null}

        <div className="mt-5 space-y-2">
          {promptEvent && (
            <button
              type="button"
              onClick={install}
              className="w-full h-[50px] rounded-[14px] bg-[#007AFF] active:bg-[#0062D6] text-white text-[17px] font-semibold tracking-[-0.02em]"
            >
              Install App
            </button>
          )}
          <button
            type="button"
            onClick={later}
            className="w-full h-[46px] rounded-[14px] text-[#007AFF] text-[17px] font-medium"
          >
            {ios && !promptEvent ? 'Got it' : 'Not now'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default InstallPromptSheet;
