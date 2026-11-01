import React from 'react';
import Icon from '../UI/Icon';
import { useAuth } from '../../context/AuthContext';
import { useDateRange } from '../../context/DateRangeContext';
import { DateRangePicker } from '../UI/DateRangePicker';

const TITLES = {
  dashboard: 'Dashboard',
  planning: 'Production Planning',
  sku_tracker: 'SKU Tracking',
  operator_queue: 'My Queue',
  inventory: 'Stock & Godowns',
  in_out: 'In / Out',
  purchase: 'In / Out',
  sales: 'In / Out',
  production: 'Production',
  sku_bom: 'SKU & BOM',
  production_process: 'Process Maps',
  processes: 'Process Maps',
  rejections: 'Rejections',
  reports: 'Reports',
  settings: 'Settings',
};

export function Navbar({ activeTab, toggleSidebar }) {
  const { user } = useAuth();
  const { dateRange, setDateRange } = useDateRange();
  const initials = (user?.full_name || user?.username || 'U')
    .split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  return (
    <header
      className="sticky top-0 z-30 material hairline-b"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="h-14 px-3 sm:px-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Open menu"
            className="lg:hidden w-9 h-9 -ml-1 flex items-center justify-center rounded-full text-[#007AFF] hover:bg-black/5 cursor-pointer"
          >
            <Icon name="menu" size="md" ariaHidden={true} />
          </button>
          <h1 className="text-[17px] sm:text-[19px] font-semibold tracking-[-0.022em] text-slate-900 truncate">
            {TITLES[activeTab] || 'Bharat Impex'}
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="hidden sm:block">
            <DateRangePicker value={dateRange} onChange={(val) => setDateRange(val)} />
          </div>
          <div className="flex items-center gap-2" title={`${user?.full_name || ''} — ${user?.role_name || ''}`}>
            <div className="hidden md:block text-right leading-tight">
              <p className="text-[13px] font-medium text-slate-900 truncate max-w-[180px]">{user?.full_name || 'User'}</p>
              <p className="text-[11px] text-slate-500 truncate max-w-[180px]">{user?.role_name || ''}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-b from-slate-400 to-slate-500 text-white text-[12px] font-semibold flex items-center justify-center shadow-xs">
              {initials}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
