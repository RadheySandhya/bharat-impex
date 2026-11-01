import React from 'react';
import Icon from '../UI/Icon';
import { useAuth } from '../../context/AuthContext';
import { canOpenTab } from '../../utils/access';

// iOS tab bar: most-used screens the role can open (max 4) + More
const CANDIDATES = [
  { id: 'sku_tracker', label: 'Tracking', icon: 'filespreadsheet' },
  { id: 'rejections', label: 'Rejections', icon: 'circlex' },
  { id: 'inventory', label: 'Stock', icon: 'boxes' },
  { id: 'in_out', label: 'In / Out', icon: 'in_out' },
  { id: 'planning', label: 'Planning', icon: 'calendar' },
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
];

function TabItem({ label, icon, onClick, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={`flex-1 min-w-0 h-[50px] flex flex-col items-center justify-center gap-[3px] cursor-pointer ${
        active ? 'text-[#007AFF]' : 'text-[#8E8E93]'
      }`}
    >
      <Icon name={icon} size="lg" strokeWidth={active ? 2.3 : 1.8} ariaHidden={true} />
      <span className="text-[10px] font-medium leading-none tracking-[0.01em] truncate max-w-full">{label}</span>
    </button>
  );
}

export function MobileBottomNav({ activeTab, setActiveTab, onMenuOpen }) {
  const { hasPermission } = useAuth();
  const items = CANDIDATES.filter((c) => canOpenTab(c.id, hasPermission)).slice(0, 4);

  return (
    <nav
      aria-label="Tab bar"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 material hairline-t"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch px-1">
        {items.map((it) => (
          <TabItem key={it.id} {...it} active={activeTab === it.id} onClick={() => setActiveTab(it.id)} />
        ))}
        <TabItem label="More" icon="menu" onClick={onMenuOpen} active={false} />
      </div>
    </nav>
  );
}

export default MobileBottomNav;
