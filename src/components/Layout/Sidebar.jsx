import React, { useState, useEffect } from 'react';
import Icon from '../UI/Icon';
import { useAuth } from '../../context/AuthContext';
import { canOpenTab, canSettingsSub } from '../../utils/access';
import { PanelLeftClose, PanelLeftOpen, ChevronRight, LogOut } from 'lucide-react';
import { InstallAppButton } from '../UI/InstallAppButton';

// Source list, grouped the way people think about the factory
const SECTIONS = [
  {
    title: 'Production',
    items: [
      { id: 'sku_tracker', label: 'SKU Tracking', iconKey: 'filespreadsheet' },
      { id: 'planning', label: 'Planning', iconKey: 'calendar' },
      { id: 'rejections', label: 'Rejections', iconKey: 'circlex' },
      { id: 'production_process', label: 'Process Maps', iconKey: 'production_process' },
    ],
  },
  {
    title: 'Stock',
    items: [
      { id: 'inventory', label: 'Stock & Godowns', iconKey: 'boxes' },
      { id: 'in_out', label: 'In / Out', iconKey: 'in_out' },
      { id: 'sku_bom', label: 'SKU & BOM', iconKey: 'tags' },
    ],
  },
  {
    title: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', iconKey: 'dashboard' },
      {
        id: 'settings',
        label: 'Settings',
        iconKey: 'settings',
        hasSubmenu: true,
        subItems: [
          { id: 'raw_materials', label: 'Child Parts' },
          { id: 'sub_child_parts', label: 'Part Varieties' },
          { id: 'finished_goods', label: 'Finished Goods' },
          { id: 'warehouses', label: 'Godowns' },
          { id: 'sub_skus', label: 'Brand Sub-SKUs' },
          { id: 'users', label: 'Users & Roles' },
          { id: 'company', label: 'Company' },
          { id: 'audit', label: 'Audit Log' },
        ],
      },
    ],
  },
];

export function Sidebar({ activeTab, setActiveTab, settingsSubTab, setSettingsSubTab, isOpen, setIsOpen, collapsed = false, setCollapsed }) {
  const { user, logout, hasPermission } = useAuth();
  const [settingsExpanded, setSettingsExpanded] = useState(activeTab === 'settings');
  const rail = collapsed; // desktop icon rail; the phone drawer always shows labels
  const hideLg = rail ? 'lg:hidden' : '';

  useEffect(() => {
    if (activeTab === 'settings') setSettingsExpanded(true);
  }, [activeTab]);

  const closeOnPhone = () => { if (window.innerWidth < 1024) setIsOpen(false); };

  const openItem = (item) => {
    if (item.hasSubmenu) {
      if (rail && setCollapsed && window.innerWidth >= 1024) setCollapsed(false);
      if (activeTab === 'settings') {
        setSettingsExpanded((v) => !v);
      } else {
        setActiveTab('settings');
        setSettingsExpanded(true);
      }
      return;
    }
    setActiveTab(item.id);
    closeOnPhone();
  };

  const openSub = (subId) => {
    setActiveTab('settings');
    if (setSettingsSubTab) setSettingsSubTab(subId);
    closeOnPhone();
  };

  const visibleSections = SECTIONS
    .map((s) => ({ ...s, items: s.items.filter((it) => canOpenTab(it.hasSubmenu ? 'settings' : it.id, hasPermission)) }))
    .filter((s) => s.items.length > 0);

  const initials = (user?.full_name || user?.username || 'U')
    .split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  return (
    <>
      {/* Phone: dim to focus */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/25 z-40 lg:hidden bi-scrim" onClick={() => setIsOpen(false)} aria-hidden="true" />
      )}

      <aside
        aria-label="Main navigation"
        className={`fixed top-0 left-0 bottom-0 z-40 w-[272px] flex flex-col sidebar-dark transition-[translate,width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] lg:translate-x-0 ${
          rail ? 'lg:w-[72px]' : ''
        } ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        {/* App identity */}
        <div className={`h-14 px-4 flex items-center justify-between shrink-0 ${rail ? 'lg:px-0 lg:justify-center' : ''}`}>
          <div className={`flex items-center gap-2.5 min-w-0 ${rail ? 'lg:hidden' : ''}`}>
            <img src="./icons/icon-192.png" alt="" className="w-7 h-7 rounded-[8px] shadow-xs" />
            <div className="min-w-0 leading-tight">
              <p className="text-[14px] font-semibold tracking-[-0.016em] text-white truncate">Bharat Impex</p>
              <p className="text-[11px] text-white/50 truncate">Manufacturing</p>
            </div>
          </div>
          {setCollapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(!rail)}
              title={rail ? 'Show sidebar' : 'Hide sidebar'}
              aria-label={rail ? 'Show sidebar' : 'Hide sidebar'}
              aria-expanded={!rail}
              className="hidden lg:flex w-8 h-8 items-center justify-center rounded-lg text-white/55 hover:text-white hover:bg-white/10 cursor-pointer"
            >
              {rail ? <PanelLeftOpen className="w-[18px] h-[18px]" /> : <PanelLeftClose className="w-[18px] h-[18px]" />}
            </button>
          )}
        </div>

        {/* Source list */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 pb-3 no-scrollbar">
          {visibleSections.map((section) => (
            <div key={section.title} className="mt-3 first:mt-1">
              <p className={`px-2.5 pb-1 text-[11px] font-semibold text-white/40 ${hideLg}`}>{section.title}</p>
              <ul className="space-y-px">
                {section.items.map((item) => {
                  const active = activeTab === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => openItem(item)}
                        title={rail ? item.label : undefined}
                        aria-current={active ? 'page' : undefined}
                        className={`w-full h-8 flex items-center gap-2.5 px-2.5 rounded-[8px] text-[13px] cursor-pointer ${
                          rail ? 'lg:justify-center lg:px-0 lg:h-10' : ''
                        } ${active ? 'bg-[#0A84FF] text-white font-medium shadow-sm' : 'text-white/85 hover:bg-white/[0.08]'}`}
                      >
                        <Icon
                          name={item.iconKey}
                          size="sm"
                          strokeWidth={active ? 2.2 : 1.8}
                          className={active ? 'text-white' : 'text-[#64D2FF]'}
                          ariaHidden={true}
                        />
                        <span className={`flex-1 text-left truncate ${hideLg}`}>{item.label}</span>
                        {item.hasSubmenu && (
                          <ChevronRight
                            className={`w-3.5 h-3.5 transition-transform duration-200 ${settingsExpanded ? 'rotate-90' : ''} ${active ? 'text-white/80' : 'text-white/35'} ${hideLg}`}
                            aria-hidden="true"
                          />
                        )}
                      </button>

                      {item.hasSubmenu && settingsExpanded && !rail && (
                        <ul className="mt-px mb-1 space-y-px">
                          {item.subItems.filter((sub) => canSettingsSub(sub.id, hasPermission)).map((sub) => {
                            const subActive = active && settingsSubTab === sub.id;
                            return (
                              <li key={sub.id}>
                                <button
                                  type="button"
                                  onClick={() => openSub(sub.id)}
                                  className={`w-full h-7 pl-9 pr-2.5 flex items-center rounded-[7px] text-[12.5px] text-left cursor-pointer ${
                                    subActive ? 'bg-white/[0.14] text-white font-medium' : 'text-white/60 hover:bg-white/[0.06] hover:text-white/85'
                                  }`}
                                >
                                  <span className="truncate">{sub.label}</span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Account */}
        <div className={`p-2.5 space-y-2 border-t border-white/10 ${rail ? 'lg:px-2' : ''}`} style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 10px)' }}>
          <InstallAppButton
            compact={rail}
            className="w-full h-8 bg-white/[0.08] text-[#64D2FF] hover:bg-white/[0.14] text-[12.5px]"
          />
          <div className={`flex items-center gap-2.5 px-1.5 ${rail ? 'lg:flex-col lg:px-0' : ''}`}>
            <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-b from-[#636366] to-[#48484A] text-white text-[12px] font-semibold flex items-center justify-center" title={user?.full_name}>
              {initials}
            </div>
            <div className={`flex-1 min-w-0 leading-tight ${hideLg}`}>
              <p className="text-[13px] font-medium text-white truncate">{user?.full_name || 'User'}</p>
              <p className="text-[11px] text-white/50 truncate">{user?.role_name || ''}</p>
            </div>
            <button
              type="button"
              onClick={logout}
              title="Sign out"
              aria-label="Sign out"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-white/55 hover:text-[#FF453A] hover:bg-white/10 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
