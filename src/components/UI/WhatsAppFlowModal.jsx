import React, { useState } from 'react';
import Icon from './Icon';

export function WhatsAppFlowModal({ isOpen, onClose }) {
  const [phoneNumber, setPhoneNumber] = useState('+91 ');
  const [flowType, setFlowType] = useState('daily_dispatch');
  const [sentSuccess, setSentSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSendFlow = (e) => {
    e.preventDefault();
    setLoading(true);

    // Simulate WhatsApp Cloud API & Flows API trigger
    setTimeout(() => {
      setLoading(false);
      setSentSuccess(true);
      setTimeout(() => {
        setSentSuccess(false);
        onClose();
      }, 2500);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20">
              <Icon name="whatsapp" size="lg" ariaHidden={true} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">WhatsApp Flows MES</h3>
              <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                <Icon name="qc" size="xs" ariaHidden={true} /> Meta WhatsApp Business API
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Icon name="close" size="lg" ariaHidden={true} />
          </button>
        </div>

        {/* Info notice about developer flows API */}
        <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl text-[11px] text-emerald-950 space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <span>Official WhatsApp Flows API Integration</span>
          </p>
          <p className="text-emerald-800">
            Send interactive WhatsApp Flows directly to plant supervisors, dispatch drivers, or clients for real-time SKU approvals & dispatch notes.
          </p>
        </div>

        {sentSuccess ? (
          <div className="py-6 text-center space-y-2">
            <div className="text-emerald-600 flex justify-center">
              <Icon name="success" size="3xl" ariaHidden={true} />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Interactive Flow Dispatched!</h4>
            <p className="text-xs text-slate-500">
              Encrypted payload delivered via WhatsApp Flows API to {phoneNumber}.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSendFlow} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Recipient WhatsApp Number (E.164 format)
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Icon name="chat" size="sm" ariaHidden={true} />
                </div>
                <input
                  type="text"
                  required
                  placeholder="+91 98250 12345"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Select Interactive WhatsApp Flow</label>
              <select
                value={flowType}
                onChange={(e) => setFlowType(e.target.value)}
                className="w-full p-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500"
              >
                <option value="daily_dispatch">Daily SKU Dispatch & Ready Stock Summary</option>
                <option value="stage_alert">Shopfloor Stage Rejection Alert (&gt;5% Threshold)</option>
                <option value="batch_approval">New Faucet Casting Batch Approval</option>
                <option value="rm_reorder">Brass Ingot RM Reorder Alert to Purchase Officer</option>
              </select>
            </div>

            {/* Direct Open WhatsApp Link option */}
            <div className="pt-2 flex items-center justify-between">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  'Bharat Impex Live Production Status: 18 Active Batches in Casting, M/C, LP, CP, Assembly. Check real-time tracking sheet.'
                )}`}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-600 hover:text-emerald-700 font-semibold text-[11px] underline"
              >
                Open Direct WhatsApp Chat
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Icon name="share" size="xs" ariaHidden={true} />
                  <span>{loading ? 'Sending...' : 'Trigger Flow'}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default WhatsAppFlowModal;
