import React from 'react';
import Icon from '../UI/Icon';
import { useAuth } from '../../context/AuthContext';
import { useDateRange } from '../../context/DateRangeContext';
import { DateRangePicker } from '../UI/DateRangePicker';

export function Navbar({ activeTab, toggleSidebar }) {
  const { user } = useAuth();
  const { dateRange, setDateRange } = useDateRange();

  const titles = {
    dashboard: 'Dashboard',
    planning: 'Production Planning',
    sku_tracker: 'SKU Tracking',
    inventory: 'Stock & Inventory',
    purchase: 'Purchase & Tally CSV',
    sales: 'Sales & Dispatch',
    sku_bom: 'SKU & Multi-BOM',
    rejections: 'Rejection & Scrap Stock',
    settings: 'Masters & Settings',
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-3 sm:px-6 flex items-center justify-between shadow-xs gap-3">
      {/* Left section: Toggle & Title */}
      <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Toggle navigation menu"
          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 lg:hidden transition-colors cursor-pointer shrink-0"
        >
          <Icon name="menu" size="md" ariaHidden={true} />
        </button>

        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-extrabold text-slate-900 capitalize tracking-tight truncate flex items-center gap-2">
            {titles[activeTab] || 'Bharat Impex ERP'}
          </h2>
          <p className="text-[11px] text-slate-500 hidden md:block font-medium truncate">
            Bharat Impex Manufacturing & Stock Suite
          </p>
        </div>
      </div>

      {/* Right section: Global Date Filter + Clean User Badge */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Global Date Range Selector across all menus */}
        <div className="flex items-center">
          <DateRangePicker
            value={dateRange}
            onChange={(val) => setDateRange(val)}
          />
        </div>

        <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span className="text-xs font-semibold text-slate-700 truncate max-w-[100px] sm:max-w-none">{user?.full_name || 'Admin'}</span>
        </div>
      </div>
    </header>
  );
}

export default Navbar;

