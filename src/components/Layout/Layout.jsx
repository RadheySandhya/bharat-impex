import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { MobileBottomNav } from './MobileBottomNav';
import { QuickActionModal } from '../UI/QuickActionModal';

export function Layout({ children, activeTab, setActiveTab, settingsSubTab, setSettingsSubTab }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const [collapsed, setCollapsedState] = useState(() => {
    try { return localStorage.getItem('bharat_sidebar_collapsed') === '1'; } catch (e) { return false; }
  });
  const setCollapsed = (v) => {
    setCollapsedState(v);
    try { localStorage.setItem('bharat_sidebar_collapsed', v ? '1' : '0'); } catch (e) {}
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <div className="flex-1 flex min-h-0">
        {/* Sidebar for Desktop */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          settingsSubTab={settingsSubTab}
          setSettingsSubTab={setSettingsSubTab}
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
        />

        {/* Main Content Area */}
        <div className={`flex-1 flex flex-col min-w-0 ${collapsed ? 'lg:pl-[76px]' : 'lg:pl-72'} transition-[padding] duration-200 pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0`}>
          <Navbar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            toggleSidebar={() => setSidebarOpen((prev) => !prev)}
          />

          <main className="flex-1 p-3.5 sm:p-5 lg:p-6 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Floating Bottom Navigation Dock */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onMenuOpen={() => setSidebarOpen(true)}
      />

      {/* Quick Action Modal (FAB) */}
      <QuickActionModal
        isOpen={quickActionOpen}
        onClose={() => setQuickActionOpen(false)}
        setActiveTab={setActiveTab}
      />
    </div>
  );
}

