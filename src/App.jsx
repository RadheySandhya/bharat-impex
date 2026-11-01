import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { DateRangeProvider } from './context/DateRangeContext';
import { Layout } from './components/Layout/Layout';
import { Login } from './pages/Auth/Login';

// Pages
import { Dashboard } from './pages/Dashboard/Dashboard';
import { Inventory } from './pages/Inventory/Inventory';
import { InOut } from './pages/InOut/InOut';
import { Purchase } from './pages/Purchase/Purchase';
import { Sales } from './pages/Sales/Sales';
import { Production } from './pages/Production/Production';
import { SKUTrackingSheet } from './pages/Production/SKUTrackingSheet';
import { OperatorMobileQueue } from './pages/Production/OperatorMobileQueue';
import { SKU_BOM } from './pages/SKU_BOM/SKU_BOM';
import { Processes } from './pages/Processes/Processes';
import { ProductionProcessFlow } from './pages/Production/ProductionProcessFlow';
import { Rejections } from './pages/Rejections/Rejections';
import { Reports } from './pages/Reports/Reports';
import { Planning } from './pages/Planning/Planning';
import { Settings } from './pages/Settings/Settings';
import { InstallPromptSheet } from './components/UI/InstallPromptSheet';
import { canOpenTab, canSettingsSub, firstAllowedTab, firstAllowedSettingsSub } from './utils/access';

function AppContent() {
  const { isAuthenticated, loading, hasPermission, user } = useAuth();
  // The open screen lives in the address (#/rejections, #/settings/users) so refresh,
  // Back/Forward and bookmarks keep you where you were
  const readHash = () => {
    const [tab, sub] = window.location.hash.replace(/^#\/?/, '').split('/');
    return { tab: tab || null, sub: sub || null };
  };
  const [activeTab, setActiveTab] = useState(() => readHash().tab || 'sku_tracker');
  const [settingsSubTab, setSettingsSubTab] = useState(() => readHash().sub || 'raw_materials');

  React.useEffect(() => {
    const target = activeTab === 'settings' ? `#/settings/${settingsSubTab}` : `#/${activeTab}`;
    if (window.location.hash !== target) window.history.pushState(null, '', target);
  }, [activeTab, settingsSubTab]);

  React.useEffect(() => {
    const onNav = () => {
      const { tab, sub } = readHash();
      if (tab) setActiveTab(tab);
      if (sub) setSettingsSubTab(sub);
    };
    window.addEventListener('popstate', onNav);
    return () => window.removeEventListener('popstate', onNav);
  }, []);

  // Keep the user on screens their role allows
  React.useEffect(() => {
    if (!isAuthenticated || !user) return;
    if (!canOpenTab(activeTab, hasPermission)) {
      const next = firstAllowedTab(hasPermission);
      if (next && next !== activeTab) setActiveTab(next);
    }
    if (activeTab === 'settings' && !canSettingsSub(settingsSubTab, hasPermission)) {
      const sub = firstAllowedSettingsSub(hasPermission);
      if (sub) setSettingsSubTab(sub);
    }
  }, [activeTab, settingsSubTab, isAuthenticated, user]);

  // Flush legacy demo rework queue if present
  React.useEffect(() => {
    try {
      localStorage.removeItem('bharat_rework_queue');
    } catch (e) {}
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent mb-3" />
          <p className="text-xs font-semibold text-slate-500 tracking-wider uppercase">Loading Bharat Impex MES...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderActiveTab = () => {
    if (!canOpenTab(activeTab, hasPermission)) {
      return (
        <div className="max-w-md mx-auto mt-16 text-center bg-white border border-slate-200 rounded-2xl p-8">
          <p className="font-bold text-slate-900">No screens assigned</p>
          <p className="text-xs text-slate-500 mt-1">Your role has no access yet. Ask the admin to tick permissions for your role in Users &amp; Roles.</p>
        </div>
      );
    }
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} />;
      case 'planning':
        return <Planning />;
      case 'sku_tracker':
        return <SKUTrackingSheet />;
      case 'inventory':
        return <Inventory />;
      case 'in_out':
      case 'purchase':
      case 'sales':
        return <InOut />;
      case 'production':
        return <Production />;
      case 'operator_queue':
        return <OperatorMobileQueue />;
      case 'sku_bom':
        return <SKU_BOM />;
      case 'production_process':
      case 'processes':
        return <ProductionProcessFlow />;
      case 'rejections':
        return <Rejections />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings subTab={settingsSubTab} setSubTab={setSettingsSubTab} />;
      default:
        return <SKUTrackingSheet />;
    }
  };

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab}
      settingsSubTab={settingsSubTab}
      setSettingsSubTab={setSettingsSubTab}
    >
      {renderActiveTab()}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <DateRangeProvider>
          <AppContent />
          <InstallPromptSheet />
        </DateRangeProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
