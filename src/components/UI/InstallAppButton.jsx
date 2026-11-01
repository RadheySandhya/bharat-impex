import React, { useEffect, useState } from 'react';
import { Download, Share, PlusSquare, X } from 'lucide-react';

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/**
 * "Install app" button.
 * - Android / Chrome / Edge: uses the browser's install prompt (captured early in main.jsx).
 * - iPhone / iPad: Safari has no prompt, so show the two-step Share → Add to Home Screen hint.
 * Hidden once the app is already running installed.
 */
export function InstallAppButton({ className = '', compact = false }) {
  const [promptEvent, setPromptEvent] = useState(() => window.__biInstallPrompt || null);
  const [installed, setInstalled] = useState(isStandalone);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    const onReady = () => setPromptEvent(window.__biInstallPrompt || null);
    const onInstalled = () => { setInstalled(true); setPromptEvent(null); };
    window.addEventListener('bi:installable', onReady);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('bi:installable', onReady);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) return null;
  const ios = isIOS();
  if (!promptEvent && !ios) return null; // browser not offering install (yet)

  const handleClick = async () => {
    if (promptEvent) {
      promptEvent.prompt();
      const choice = await promptEvent.userChoice.catch(() => null);
      if (choice?.outcome === 'accepted') setInstalled(true);
      window.__biInstallPrompt = null;
      setPromptEvent(null);
    } else {
      setShowIosHelp(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title="Install Bharat Impex as an app"
        className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-xs active:scale-[0.97] transition-transform cursor-pointer ${className}`}
      >
        <Download className="w-4 h-4" aria-hidden="true" />
        {!compact && <span>Install App</span>}
      </button>

      {showIosHelp && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/40" onClick={() => setShowIosHelp(false)}>
          <div
            role="dialog"
            aria-label="Install on iPhone"
            className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-5 space-y-3"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 20px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-900">Install on iPhone / iPad</p>
              <button type="button" onClick={() => setShowIosHelp(false)} aria-label="Close" className="p-1 rounded-lg text-slate-400"><X className="w-4 h-4" /></button>
            </div>
            <ol className="space-y-2 text-sm text-slate-700">
              <li className="flex items-center gap-2">1. Tap <Share className="w-4 h-4 text-blue-600" aria-hidden="true" /> <strong>Share</strong> in Safari's toolbar</li>
              <li className="flex items-center gap-2">2. Choose <PlusSquare className="w-4 h-4 text-blue-600" aria-hidden="true" /> <strong>Add to Home Screen</strong></li>
            </ol>
            <p className="text-xs text-slate-500">Open this page in Safari first if you are in another browser.</p>
          </div>
        </div>
      )}
    </>
  );
}

export default InstallAppButton;
