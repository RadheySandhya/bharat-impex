import React from 'react';
import Icon from '../UI/Icon';
import { useAuth } from '../../context/AuthContext';
import { canOpenTab } from '../../utils/access';

// Most useful screens first; each user sees only what their role opens (max 4 + Menu)
const CANDIDATES = [
  { id: 'sku_tracker', label: 'Tracking', icon: 'filespreadsheet' },
  { id: 'rejections', label: 'Rejection', icon: 'circlex' },
  { id: 'inventory', label: 'Stock', icon: 'boxes' },
  { id: 'in_out', label: 'In / Out', icon: 'in_out' },
  { id: 'planning', label: 'Planning', icon: 'calendar' },
  { id: 'dashboard', label: 'Home', icon: 'dashboard' },
];

export function MobileBottomNav({ activeTab, setActiveTab, onMenuOpen }) {
  const { hasPermission } = useAuth();
  const items = CANDIDATES.filter((c) => canOpenTab(c.id, hasPermission)).slice(0, 4);

  const Item = ({ id, label, icon, onClick, active }) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-2xl cursor-pointer transition-transform duration-100 active:scale-90 motion-reduce:active:scale-100 ${
        active ? 'text-blue-600' : 'text-slate-500'
      }`}
    >
      <Icon name={icon} size="lg" strokeWidth={active ? 2.4 : 1.9} ariaHidden={true} />
      <span className={`text-[10px] leading-none truncate max-w-full ${active ? 'font-semibold' : 'font-medium'}`}>{label}</span>
    </button>
  );

  return (
    <nav
      aria-label="Primary"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/60 bg-white/75 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.18)]"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 6px)' }}
    >
      <div className="flex items-stretch gap-1 px-2 pt-1.5">
        {items.map((it) => (
          <Item key={it.id} {...it} active={activeTab === it.id} onClick={() => setActiveTab(it.id)} />
        ))}
        <Item id="menu" label="Menu" icon="menu" onClick={onMenuOpen} active={false} />
      </div>
    </nav>
  );
}

export default MobileBottomNav;
