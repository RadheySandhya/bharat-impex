import React, { useState, useEffect } from 'react';
import Icon from '../UI/Icon';
import { useAuth } from '../../context/AuthContext';

export function Sidebar({ activeTab, setActiveTab, settingsSubTab, setSettingsSubTab, isOpen, setIsOpen }) {
  const { user, logout } = useAuth();
  const [settingsExpanded, setSettingsExpanded] = useState(activeTab === 'settings');

  useEffect(() => {
    if (activeTab === 'settings') {
      setSettingsExpanded(true);
    }
  }, [activeTab]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', iconKey: 'dashboard' },
    { 
      id: 'planning', 
      label: 'Production Planning', 
      iconKey: 'calendar', 
    },
    { 
      id: 'sku_tracker', 
      label: 'SKU Tracking', 
      iconKey: 'filespreadsheet', 
    },
    {
      id: 'inventory',
      label: 'Stock & Inventory',
      iconKey: 'boxes',
    },
    { id: 'in_out', label: 'In / Out', iconKey: 'in_out' },
    { id: 'sku_bom', label: 'SKU & Multi-BOM', iconKey: 'tags' },
    { id: 'rejections', label: 'Rejection & Scrap Stock', iconKey: 'circlex' },
    { 
      id: 'settings', 
      label: 'Masters & Settings', 
      iconKey: 'settings',
      hasSubmenu: true,
      subItems: [
        { id: 'raw_materials', label: 'Child Parts Master', iconKey: 'package' },
        { id: 'finished_goods', label: 'Finished Goods (SKUs)', iconKey: 'packagecheck' },
        { id: 'warehouses', label: 'Warehouse Master', iconKey: 'warehouse' },
        { id: 'sub_skus', label: 'Sub-SKUs (Brand Mapping)', iconKey: 'tags' },
        { id: 'users', label: 'Users & Roles', iconKey: 'users' },
        { id: 'company', label: 'Company Profile', iconKey: 'building2' },
        { id: 'audit', label: 'Security Audit Logs', iconKey: 'shieldcheck' },
      ]
    },
    { id: 'production_process', label: 'Production Process', iconKey: 'production_process' },
  ];

  const handleNavClick = (item) => {
    if (item.hasSubmenu) {
      if (activeTab === 'settings') {
        setSettingsExpanded(!settingsExpanded);
      } else {
        setActiveTab('settings');
        setSettingsExpanded(true);
        if (window.innerWidth < 1024) setIsOpen(false);
      }
    } else {
      setActiveTab(item.id);
      if (window.innerWidth < 1024) setIsOpen(false);
    }
  };

  const handleSubItemClick = (subId, e) => {
    e.stopPropagation();
    setActiveTab('settings');
    if (setSettingsSubTab) setSettingsSubTab(subId);
    if (window.innerWidth < 1024) setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 w-72 bg-white border-r border-slate-200/90 shadow-xs flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-xs font-black text-white tracking-wider text-sm">
              BI
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-tight text-slate-900 leading-tight">BHARAT IMPEX</h1>
              <p className="text-[11px] text-slate-500 font-semibold flex items-center gap-1.5">
                <Icon name="qc" size="xs" className="text-emerald-600" ariaHidden={true} /> Manufacturing Suite
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pb-1.5">
            Enterprise Modules
          </div>

          {navItems.map((item) => {
            const isActive = activeTab === item.id;

            if (item.hasSubmenu) {
              return (
                <div key={item.id} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => handleNavClick(item)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group cursor-pointer ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200/80 shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        name={item.iconKey}
                        size="sm"
                        className={`transition-colors ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-700'}`}
                        ariaHidden={true}
                      />
                      <span>{item.label}</span>
                    </div>

                    <Icon
                      name={settingsExpanded ? "chevrondown" : "chevronright"}
                      size="xs"
                      className={`transition-transform duration-200 ${isActive ? 'text-blue-600' : 'text-slate-400'}`}
                      ariaHidden={true}
                    />
                  </button>

                  {/* Submenu Accordion */}
                  {settingsExpanded && (
                    <div className="pl-4 pr-1 py-1 space-y-0.5 border-l-2 border-slate-200 ml-5 my-1">
                      {item.subItems.map((sub) => {
                        const isSubActive = isActive && settingsSubTab === sub.id;
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={(e) => handleSubItemClick(sub.id, e)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                              isSubActive
                                ? 'bg-blue-100/80 text-blue-800 font-bold shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                            }`}
                          >
                            <Icon
                              name={sub.iconKey}
                              size="xs"
                              className={isSubActive ? 'text-blue-700' : 'text-slate-400'}
                              ariaHidden={true}
                            />
                            <span className="truncate">{sub.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200/80 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    name={item.iconKey}
                    size="sm"
                    className={`transition-colors ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-700'}`}
                    ariaHidden={true}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && !isActive && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <Icon name="chevronright" size="xs" className="text-blue-600" ariaHidden={true} />
                )}
              </button>
            );
          })}
        </div>

        {/* User Profile & Logout */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-black text-slate-700 shrink-0">
                {user?.username?.substring(0, 2).toUpperCase() || 'AD'}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-900 truncate leading-tight">{user?.full_name || 'Bharat Impex Admin'}</p>
                <p className="text-[10px] text-slate-500 font-medium truncate">{user?.role_name || user?.role_code || 'Administrator'}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              title="Logout"
              aria-label="Logout"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <Icon name="logout" size="sm" ariaHidden={true} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
