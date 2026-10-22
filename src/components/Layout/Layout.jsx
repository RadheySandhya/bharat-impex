import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { MobileBottomNav } from './MobileBottomNav';
import { QuickActionModal } from '../UI/QuickActionModal';

export function Layout({ children, activeTab, setActiveTab, settingsSubTab, setSettingsSubTab }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickActionOpen, setQuickActionOpen] = useState(false);

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
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 lg:pl-72 pb-16 lg:pb-0">
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
        onQuickActionOpen={() => setQuickActionOpen(true)}
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

