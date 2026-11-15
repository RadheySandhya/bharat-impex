import React from 'react';
import Icon from '../UI/Icon';
import { useAuth } from '../../context/AuthContext';
import { useDateRange } from '../../context/DateRangeContext';
import { DateRangePicker } from '../UI/DateRangePicker';
import { Volume2, VolumeX, Search, LogOut, Keyboard, ChevronDown } from 'lucide-react';
import { MOD } from './KeyboardShortcuts';
import { isSoundOn, setSoundOn, playSound } from '../../utils/uiSounds';

function SoundToggle() {
  const [on, setOn] = React.useState(isSoundOn());
  React.useEffect(() => {
    const sync = () => setOn(isSoundOn());
    window.addEventListener('bi:sound', sync);
    return () => window.removeEventListener('bi:sound', sync);
  }, []);
  const toggle = () => {
    const next = !on;
    setSoundOn(next);
    setOn(next);
    if (next) playSound('save');
  };
  return (
    <button
      type="button"
      data-no-sound
      onClick={toggle}
      title={on ? 'Sound effects: ON (click to mute)' : 'Sound effects: OFF (click to unmute)'}
      aria-label={on ? 'Mute sound effects' : 'Unmute sound effects'}
      className="w-9 h-9 flex items-center justify-center rounded-full text-slate-600 hover:bg-black/5 cursor-pointer"
    >
      {on ? <Volume2 className="w-[18px] h-[18px]" /> : <VolumeX className="w-[18px] h-[18px]" />}
    </button>
  );
}

// Avatar → account menu (anchored to the avatar, materializes from its corner)
function AccountMenu({ user, initials, logout }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const away = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') { setOpen(false); document.activeElement?.blur?.(); } };
    document.addEventListener('pointerdown', away);
    window.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); window.removeEventListener('keydown', esc); };
  }, [open]);
  const item = 'w-full flex items-center gap-2.5 h-9 px-2.5 rounded-[8px] text-[13px] text-left cursor-pointer';
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={`${user?.full_name || ''} — ${user?.role_name || ''}`}
        className="flex items-center gap-2.5 pl-1 md:pl-3.5 pr-1.5 sm:pr-2.5 h-11 rounded-full hover:bg-black/5 cursor-pointer whitespace-nowrap"
      >
        <span className="hidden md:block text-right leading-tight">
          <span className="block text-[13px] font-medium text-slate-900 truncate max-w-[180px]">{user?.full_name || 'User'}</span>
          <span className="block text-[11px] text-slate-500 truncate max-w-[180px]">{user?.role_name || ''}</span>
        </span>
        <span className="w-8 h-8 rounded-full bg-gradient-to-b from-slate-400 to-slate-500 text-white text-[12px] font-semibold flex items-center justify-center shadow-xs">
          {initials}
        </span>
        <ChevronDown className={`hidden sm:block w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="menu" className="bi-palette bi-popover absolute right-0 top-[calc(100%+8px)] w-[248px] rounded-[14px] p-1.5 z-50">
          <div className="flex items-center gap-2.5 px-2.5 py-2">
            <span className="w-9 h-9 rounded-full bg-gradient-to-b from-slate-400 to-slate-500 text-white text-[13px] font-semibold flex items-center justify-center">{initials}</span>
            <span className="min-w-0 leading-tight">
              <span className="block text-[13px] font-semibold text-slate-900 truncate">{user?.full_name || 'User'}</span>
              <span className="block text-[11.5px] text-slate-500 truncate">{user?.role_name || user?.username || ''}</span>
            </span>
          </div>
          <div className="h-px bg-black/[0.08] my-1 mx-1" />
          <button type="button" role="menuitem" className={`${item} text-slate-800 hover:bg-[#007AFF] hover:text-white group`}
            onClick={() => { setOpen(false); window.dispatchEvent(new Event('bi:shortcuts')); }}>
            <Keyboard className="w-4 h-4 text-slate-500 group-hover:text-white" />
            <span className="flex-1">Keyboard Shortcuts</span>
            <kbd>?</kbd>
          </button>
          <button type="button" role="menuitem" className={`${item} text-[#FF3B30] hover:bg-[#FF3B30] hover:text-white group`}
            onClick={() => { setOpen(false); logout(); }}>
            <LogOut className="w-4 h-4" />
            <span className="flex-1">Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}

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
  const { user, logout } = useAuth();
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
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('bi:palette'))}
            title={`Search pages & actions (${MOD}+K)`}
            aria-label="Search pages and actions"
            className="hidden md:flex items-center gap-2 h-8 pl-2.5 pr-1.5 rounded-[9px] bg-black/[0.05] hover:bg-black/[0.08] text-[13px] text-slate-500 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="pr-6">Search</span>
            <kbd>{MOD} K</kbd>
          </button>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('bi:palette'))}
            aria-label="Search pages and actions"
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-full text-slate-600 hover:bg-black/5 cursor-pointer"
          >
            <Search className="w-[18px] h-[18px]" />
          </button>
          <SoundToggle />
          <div className="hidden sm:block">
            <DateRangePicker value={dateRange} onChange={(val) => setDateRange(val)} />
          </div>
          <AccountMenu user={user} initials={initials} logout={logout} />
        </div>
      </div>
    </header>
  );
}

export default Navbar;
