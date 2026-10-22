import React from 'react';
import Icon from './Icon';

export function QuickActionModal({ isOpen, onClose, setActiveTab }) {
  if (!isOpen) return null;

  const actions = [
    {
      id: 'planning',
      title: 'New Production Plan',
      subtitle: 'Plan FG requirement & perform controlled releases',
      icon: 'calendar',
      color: 'bg-blue-50 text-blue-700 border-blue-200'
    },
    {
      id: 'sku_tracker',
      title: 'Update SKU Tracking',
      subtitle: 'Log production stages, outputs & WIP balances',
      icon: 'filespreadsheet',
      color: 'bg-slate-100 text-slate-800 border-slate-200'
    },
    {
      id: 'inventory',
      title: 'Inventory & Stock Reconciliation',
      subtitle: 'Bulk setup stock, transfers and physical reconciliations',
      icon: 'boxes',
      color: 'bg-slate-100 text-slate-800 border-slate-200'
    },
    {
      id: 'purchase',
      title: 'Import Tally Purchase CSV',
      subtitle: 'Add incoming brass rods, ingots & components',
      icon: 'upload',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    {
      id: 'rejections',
      title: 'Log Shopfloor Rejection & Scrap',
      subtitle: 'Record blow holes, tool breaks or plating defects',
      icon: 'circlex',
      color: 'bg-rose-50 text-rose-700 border-rose-200'
    },
  ];

  const handleSelect = (act) => {
    setActiveTab(act.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">Quick Shopfloor Actions</h3>
            <p className="text-xs text-slate-500 font-medium">Tap any action to execute immediately</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Icon name="close" size="lg" ariaHidden={true} />
          </button>
        </div>

        <div className="space-y-2">
          {actions.map((act) => (
            <button
              key={act.id}
              onClick={() => handleSelect(act)}
              className="w-full p-3 rounded-2xl border border-slate-200 hover:border-slate-400 hover:bg-slate-50 flex items-center justify-between text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shadow-xs ${act.color}`}>
                  <Icon name={act.icon} size="lg" ariaHidden={true} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs group-hover:text-slate-950">
                    {act.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">{act.subtitle}</p>
                </div>
              </div>
              <Icon name="chevronright" size="sm" className="text-slate-400 group-hover:text-slate-700" ariaHidden={true} />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default QuickActionModal;
