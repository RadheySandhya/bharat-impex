import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { MobileBottomNav } from './MobileBottomNav';

export function Layout({ children, activeTab, setActiveTab, settingsSubTab, setSettingsSubTab }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsedState] = useState(() => {
    try { return localStorage.getItem('bharat_sidebar_collapsed') === '1'; } catch (e) { return false; }
  });
  const setCollapsed = (v) => {
    setCollapsedState(v);
    try { localStorage.setItem('bharat_sidebar_collapsed', v ? '1' : '0'); } catch (e) {}
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-slate-900 flex flex-col">
      <div className="flex-1 flex min-h-0">
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

        <div
          className={`flex-1 flex flex-col min-w-0 transition-[padding] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            collapsed ? 'lg:pl-[72px]' : 'lg:pl-[272px]'
          } pb-[calc(4.25rem+env(safe-area-inset-bottom))] lg:pb-0`}
        >
          <Navbar activeTab={activeTab} setActiveTab={setActiveTab} toggleSidebar={() => setSidebarOpen((prev) => !prev)} />
          <main className="flex-1 px-3 py-4 sm:px-6 sm:py-6 lg:px-8 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1680px]">{children}</div>
          </main>
        </div>
      </div>

      <MobileBottomNav activeTab={activeTab} setActiveTab={setActiveTab} onMenuOpen={() => setSidebarOpen(true)} />
    </div>
  );
}
