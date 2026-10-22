import React from 'react';
import Icon from '../UI/Icon';

export function MobileBottomNav({ activeTab, setActiveTab, onQuickActionOpen }) {
  return (
    <>
      {/* Modern Docked Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-2xl px-3 py-1.5 flex items-center justify-around">
        {/* Left Item 1: Home */}
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          aria-label="Dashboard Home"
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-colors cursor-pointer ${
            activeTab === 'dashboard'
              ? 'text-blue-600 font-bold'
              : 'text-slate-500 hover:text-slate-900 font-medium'
          }`}
        >
          <Icon name="dashboard" size="lg" strokeWidth={activeTab === 'dashboard' ? 2.5 : 2} ariaHidden={true} />
          <span className="text-[10px] mt-0.5">Home</span>
        </button>

        {/* Left Item 2: Planning */}
        <button
          type="button"
          onClick={() => setActiveTab('planning')}
          aria-label="Production Planning"
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-colors cursor-pointer ${
            activeTab === 'planning'
              ? 'text-blue-600 font-bold'
              : 'text-slate-500 hover:text-slate-900 font-medium'
          }`}
        >
          <Icon name="calendar" size="lg" strokeWidth={activeTab === 'planning' ? 2.5 : 2} ariaHidden={true} />
          <span className="text-[10px] mt-0.5">Planning</span>
        </button>

        {/* CENTER FLOATING ACTION BUTTON (FAB) */}
        <div className="relative -top-4">
          <button
            type="button"
            onClick={onQuickActionOpen}
            aria-label="Quick Action"
            className="w-13 h-13 rounded-full bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-900/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95 border-4 border-white cursor-pointer"
            title="Quick Action"
          >
            <Icon name="plus" size="xl" strokeWidth={2.5} ariaHidden={true} />
          </button>
        </div>

        {/* Right Item 1: SKU Sheet */}
        <button
          type="button"
          onClick={() => setActiveTab('sku_tracker')}
          aria-label="SKU Live Sheet"
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-colors cursor-pointer ${
            activeTab === 'sku_tracker'
              ? 'text-blue-600 font-bold'
              : 'text-slate-500 hover:text-slate-900 font-medium'
          }`}
        >
          <Icon name="filespreadsheet" size="lg" strokeWidth={activeTab === 'sku_tracker' ? 2.5 : 2} ariaHidden={true} />
          <span className="text-[10px] mt-0.5">SKU Sheet</span>
        </button>

        {/* Right Item 2: Stock */}
        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          aria-label="Inventory Stock"
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-colors cursor-pointer ${
            activeTab === 'inventory'
              ? 'text-blue-600 font-bold'
              : 'text-slate-500 hover:text-slate-900 font-medium'
          }`}
        >
          <Icon name="boxes" size="lg" strokeWidth={activeTab === 'inventory' ? 2.5 : 2} ariaHidden={true} />
          <span className="text-[10px] mt-0.5">Stock</span>
        </button>
      </div>
    </>
  );
}


export default MobileBottomNav;
