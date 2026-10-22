import React, { useState, useEffect } from 'react';
import Icon from '../../components/UI/Icon';
import { KPICard } from '../../components/UI/KPICard';
import { StatusBadge } from '../../components/UI/StatusBadge';
import { useDateRange } from '../../context/DateRangeContext';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export function Dashboard({ setActiveTab }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { dateRange } = useDateRange();
  const { error } = useToast();

  const [processes, setProcesses] = useState([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const rangeParam = dateRange.preset || 'THIS_MONTH';
      const [res, pRes] = await Promise.all([
        api.dashboard.get(rangeParam),
        api.processes.getAll().catch(() => ({ data: [] }))
      ]);
      if (res?.data) {
        setStats(res.data);
      }
      if (pRes?.data && pRes.data.length > 0) {
        setProcesses([...pRes.data].sort((a, b) => (a.sequence || 0) - (b.sequence || 0)));
      }
    } catch (err) {
      error('Failed to load dashboard metrics: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  const stockSummary = stats?.stock_summary || {};
  const planningSummary = stats?.planning_summary || {};
  const rawOpenSkus = stats?.open_skus || [];
  const todayKpis = stats?.today_kpis || {};

  // Compute live Open SKU tracking batches (merging live shop floor data with API releases)
  const openSkus = React.useMemo(() => {
    let localBatches = [];
    try {
      const saved = localStorage.getItem('bharat_sku_tracking_batches');
      if (saved) localBatches = JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse local SKU batches', e);
    }

    const effectiveProcesses = processes.length > 0 ? processes : [];
    const totalStageCount = effectiveProcesses.length > 0 ? effectiveProcesses.length : 6;

    if (!localBatches || localBatches.length === 0) {
      return (rawOpenSkus || []).filter((s) => {
        const totalStg = Number(s.total_stages || totalStageCount);
        const compStg = Number(s.completed_stages || 0);
        const progPct = Math.round((compStg / (totalStg || 1)) * 100);
        const isFinished = ['completed', 'ready fg', 'finished'].includes(String(s.status || '').toLowerCase());
        return progPct < 100 && !isFinished;
      });
    }

    const activeFromLocal = [];
    const localHandledKeys = new Set();

    localBatches.forEach((b) => {
      const status = b.ready?.status || b.status || 'In Production';
      const bKey = String(b.batch_no || b.id);
      localHandledKeys.add(bKey);
      if (b.batch_no) localHandledKeys.add(String(b.batch_no));
      if (b.id) localHandledKeys.add(String(b.id));

      const isCompletedStatus = 
        status === 'Completed' || 
        status === 'COMPLETED' || 
        status === 'Ready FG' || 
        status === 'Finished' ||
        (Number(b.ready?.stock_qty || 0) > 0 && b.ready?.status !== 'In Production');

      if (isCompletedStatus) {
        // Finished & converted to FG or ready - do not show on main dashboard
        return;
      }

      const stagesObj = b.stages || {};
      const stageKeys = Object.keys(stagesObj);

      let currentStage = effectiveProcesses.length > 0 
        ? `Stage 1: ${effectiveProcesses[0].process_name}` 
        : 'Stage 1: Production';
      let compCount = 0;

      if (effectiveProcesses.length > 0) {
        // Check backwards from last stage to first stage
        for (let i = effectiveProcesses.length - 1; i >= 0; i--) {
          const proc = effectiveProcesses[i];
          const codeKey = proc.process_code ? proc.process_code.toLowerCase().replace(/[^a-z0-9]/g, '_') : `proc_${proc.id}`;
          const isLegacy = 
            (proc.process_code === 'PROC-CAST' ? (stagesObj['casting'] || stagesObj['proc_cast']) : null) ||
            (proc.process_code === 'PROC-CNC' ? (stagesObj['machining'] || stagesObj['proc_cnc']) : null) ||
            (proc.process_code === 'PROC-POLISH' ? (stagesObj['buffing'] || stagesObj['proc_polish']) : null) ||
            (proc.process_code === 'PROC-ASSY' ? (stagesObj['assembly'] || stagesObj['proc_assy']) : null);
          const stgData = stagesObj[codeKey] || isLegacy || stagesObj[stageKeys[i]];
          if (stgData && Number(stgData.prod_qty || 0) > 0) {
            currentStage = `Stage ${i + 1}: ${proc.process_name}`;
            compCount = i + 1;
            break;
          }
        }
      } else {
        const getQty = (testKey, fallbackIdx) => {
          if (stagesObj[testKey] && Number(stagesObj[testKey].prod_qty) > 0) return Number(stagesObj[testKey].prod_qty);
          if (stageKeys[fallbackIdx] && Number(stagesObj[stageKeys[fallbackIdx]]?.prod_qty) > 0) {
            return Number(stagesObj[stageKeys[fallbackIdx]].prod_qty);
          }
          return 0;
        };

        if (getQty('proc_pack', 5) > 0) {
          currentStage = 'Stage 6: Packing';
          compCount = 6;
        } else if (getQty('proc_qc', 4) > 0 || getQty('proc_assy', 4) > 0) {
          currentStage = 'Stage 5: Assembly';
          compCount = 5;
        } else if (getQty('proc_assy', 3) > 0 || getQty('proc_polish', 3) > 0) {
          currentStage = 'Stage 4: Polishing';
          compCount = 4;
        } else if (getQty('proc_polish', 2) > 0 || getQty('proc_plate', 2) > 0) {
          currentStage = 'Stage 3: Grinding';
          compCount = 3;
        } else if (getQty('proc_6', 1) > 0 || getQty('proc_cnc', 1) > 0 || getQty('machining', 1) > 0) {
          currentStage = 'Stage 2: Machining';
          compCount = 2;
        } else if (getQty('proc_cast', 0) > 0 || getQty('casting', 0) > 0) {
          currentStage = 'Stage 1: Casting';
          compCount = 1;
        }
      }

      // If progress has reached 100% of all stages, do not display on main dashboard
      const progPct = Math.round((compCount / (totalStageCount || 1)) * 100);
      if (progPct >= 100 || compCount >= totalStageCount) {
        return;
      }

      const targetQty = Number(b.qty_recd_casting || 0);
      const producedQty = Number(b.ready?.stock_qty || 0);
      const pendingToFg = Math.max(0, targetQty - producedQty);

      activeFromLocal.push({
        id: b.id || b.batch_no,
        production_number: b.batch_no,
        batch_no: b.batch_no,
        product_name: b.item_name || 'FINISHED GOOD',
        fg_code: b.cat_no || 'FG',
        current_stage_name: currentStage,
        planned_quantity: targetQty,
        produced_quantity: producedQty,
        pending_to_fg: pendingToFg,
        completed_stages: compCount,
        total_stages: totalStageCount,
        status: status,
      });
    });

    // Also include any active releases from backend not yet in localStorage
    rawOpenSkus.forEach((s) => {
      const key = String(s.batch_no || s.production_number);
      if (!localHandledKeys.has(key)) {
        activeFromLocal.push(s);
      }
    });

    // Guarantee that no 100% completed or Ready FG batches are displayed on the main dashboard
    return activeFromLocal.filter((sku) => {
      const totalStg = Number(sku.total_stages || totalStageCount);
      const compStg = Number(sku.completed_stages || 0);
      const progPct = Math.round((compStg / (totalStg || 1)) * 100);
      const isFinished = ['completed', 'ready fg', 'finished'].includes(String(sku.status || '').toLowerCase());
      return progPct < 100 && !isFinished;
    });
  }, [stats, rawOpenSkus, processes]);

  // Filter only pending plans awaiting release
  const pendingPlans = React.useMemo(() => {
    return (planningSummary.recent_plans || []).filter(
      (p) => Number(p.pending_quantity) > 0 && p.status !== 'FULLY_RELEASED' && p.status !== 'COMPLETED'
    );
  }, [planningSummary]);

  const totalStockQty = Number(stockSummary.total_rm_qty || 0) + Number(stockSummary.total_fg_qty || 0);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <Icon name="loader" size="2xl" spin={true} className="text-slate-900" ariaHidden={true} />
          </div>
          <p className="text-sm font-semibold text-slate-500">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-xs text-slate-500 font-medium">Factory overview: live stock, pending planning, and open SKU tracking</p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('sku_tracker')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold transition-colors shadow-xs cursor-pointer"
          >
            <Icon name="filespreadsheet" size="xs" className="text-white" ariaHidden={true} />
            <span>Open SKU Tracking</span>
          </button>

          <button
            type="button"
            onClick={fetchDashboardData}
            title="Refresh Data"
            aria-label="Refresh Data"
            className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 transition-colors border border-slate-200 shadow-xs cursor-pointer"
          >
            <Icon name="refresh" size="xs" spin={loading} className={loading ? 'text-blue-600' : ''} ariaHidden={true} />
          </button>
        </div>
      </div>

      {/* 1. CURRENT STOCK & KEY KPIS */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Icon name="boxes" size="sm" className="text-blue-600" ariaHidden={true} />
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">Current Stock & Inventory</h2>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
          >
            View Stock Register →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <KPICard
            title="Total Current Stock"
            value={`${totalStockQty.toLocaleString()} PCS`}
            subtitle="Combined warehouse on-hand stock"
            icon="boxes"
            color="blue"
            onClick={() => setActiveTab('inventory')}
          />

          <KPICard
            title="Finished Goods Stock"
            value={`${Number(stockSummary.total_fg_qty || 0).toLocaleString()} PCS`}
            subtitle="Ready for dispatch & sales"
            icon="packagecheck"
            color="emerald"
            onClick={() => setActiveTab('inventory')}
          />

          <KPICard
            title="Child Part Stock"
            value={`${Number(stockSummary.total_rm_qty || 0).toLocaleString()} PCS`}
            subtitle="Brass, ingots & components"
            icon="factory"
            color="purple"
            onClick={() => setActiveTab('inventory')}
          />

          <KPICard
            title="Today's Sales"
            value={`${Number(todayKpis.today_sale_qty || 0).toLocaleString()} PCS`}
            subtitle={`Billing: ₹${Number(todayKpis.today_sale_val || 0).toLocaleString()}`}
            icon="trendingup"
            color="indigo"
            onClick={() => setActiveTab('in_out')}
          />
        </div>
      </div>

      {/* 2. PENDING PRODUCTION PLANNING */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Icon name="calendar" size="md" className="text-blue-600" ariaHidden={true} />
              <h2 className="text-sm font-black text-slate-900 tracking-tight">Pending Production Planning</h2>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Approved production plans with pending quantities awaiting release to the shop floor
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
              Pending Release: {Number(planningSummary.pending_release_qty || 0).toLocaleString()} PCS
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('planning')}
              className="text-xs font-bold text-slate-700 hover:text-slate-900 px-3 py-1 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer"
            >
              Manage Planning →
            </button>
          </div>
        </div>

        {/* Quick summary cards for planning */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Planned Quantity</p>
            <p className="text-xl font-black text-slate-900 mt-0.5">{Number(planningSummary.total_planned_qty || 0).toLocaleString()} <span className="text-xs font-semibold text-slate-500">PCS</span></p>
            <p className="text-[10px] text-slate-400 font-medium">Across all approved plans</p>
          </div>
          <div className="bg-blue-50/60 rounded-xl p-3 border border-blue-200/80">
            <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Released to Factory</p>
            <p className="text-xl font-black text-blue-700 mt-0.5">{Number(planningSummary.total_released_qty || 0).toLocaleString()} <span className="text-xs font-semibold text-blue-500">PCS</span></p>
            <p className="text-[10px] text-blue-500 font-medium">Currently in production stages</p>
          </div>
          <div className="bg-amber-50/60 rounded-xl p-3 border border-amber-200/80">
            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Pending Release</p>
            <p className="text-xl font-black text-amber-700 mt-0.5">{Number(planningSummary.pending_release_qty || 0).toLocaleString()} <span className="text-xs font-semibold text-amber-500">PCS</span></p>
            <p className="text-[10px] text-amber-600 font-medium">Awaiting release to shop floor</p>
          </div>
        </div>

        {/* Pending Planning List / Table */}
        {pendingPlans.length > 0 ? (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold uppercase text-[10px] border-b border-slate-200">
                    <th className="p-2.5">Plan Number</th>
                    <th className="p-2.5">Product Name</th>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5 text-right">Planned Qty</th>
                    <th className="p-2.5 text-right">Released Qty</th>
                    <th className="p-2.5 text-right">Pending Qty</th>
                    <th className="p-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingPlans.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors font-medium">
                      <td className="p-2.5 font-mono font-bold text-blue-600">{p.planning_number}</td>
                      <td className="p-2.5 font-bold text-slate-900">
                        <span>{p.product_name}</span>
                        <span className="block text-[10px] text-slate-400 font-mono">{p.fg_code}</span>
                      </td>
                      <td className="p-2.5 text-slate-600">{p.planning_date}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">{Number(p.planned_quantity).toLocaleString()}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-blue-600">{Number(p.released_quantity).toLocaleString()}</td>
                      <td className="p-2.5 text-right font-mono font-black text-amber-600">{Number(p.pending_quantity).toLocaleString()}</td>
                      <td className="p-2.5 text-center">
                        <StatusBadge status={p.status} size="xs" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200/80 text-slate-500 text-xs font-semibold">
            <Icon name="check" size="md" className="mx-auto text-emerald-500 mb-1.5" ariaHidden={true} />
            <p className="font-bold text-slate-700">No Pending Plans Awaiting Release</p>
            <p className="text-[11px] text-slate-400 mt-0.5">All planned production orders have been released to the shop floor as active batches.</p>
          </div>
        )}
      </div>

      {/* 3. OPEN SKU TRACKING (NOT YET CONVERTED TO FG) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Icon name="filespreadsheet" size="md" className="text-emerald-600" ariaHidden={true} />
              <h2 className="text-sm font-black text-slate-900 tracking-tight">Open SKU Tracking (Not Converted to Finished Goods)</h2>
              <span className="text-[11px] font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                {openSkus.length} Active Batches
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Live in-progress batches currently being processed through factory stages{' '}
              <span className="font-semibold text-slate-700">
                ({processes.length > 0 ? processes.map((p) => p.process_name).join(' → ') : 'Casting → Machining → Grinding → Polishing → Assembly → Packing'})
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('sku_tracker')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer"
          >
            <span>View Full SKU Tracking</span>
            <Icon name="next" size="xs" ariaHidden={true} />
          </button>
        </div>

        {openSkus.length > 0 ? (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold uppercase text-[10px] border-b border-slate-200">
                    <th className="p-2.5 whitespace-nowrap">Batch / Order</th>
                    <th className="p-2.5">SKU & Item Name</th>
                    <th className="p-2.5 whitespace-nowrap">Current Stage</th>
                    <th className="p-2.5 text-right whitespace-nowrap">Target Qty</th>
                    <th className="p-2.5 text-right whitespace-nowrap">Produced Qty</th>
                    <th className="p-2.5 text-right whitespace-nowrap">Pending to FG</th>
                    <th className="p-2.5 text-center whitespace-nowrap">Stage Progress</th>
                    <th className="p-2.5 text-center whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {openSkus.map((sku) => {
                    const totalStg = Number(sku.total_stages || 4);
                    const compStg = Number(sku.completed_stages || 0);
                    const progPct = Math.round((compStg / (totalStg || 1)) * 100);

                    return (
                      <tr key={sku.id} className="hover:bg-slate-50 transition-colors font-medium">
                        <td className="p-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {sku.batch_no || sku.production_number}
                          </span>
                        </td>
                        <td className="p-2.5">
                          <span className="font-bold text-slate-900">{sku.product_name}</span>
                          <span className="block text-[10px] text-blue-600 font-mono font-bold">Cat No: {sku.fg_code}</span>
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 font-bold text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                            {sku.current_stage_name || 'In Production'}
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {Number(sku.planned_quantity).toLocaleString()} PCS
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-600 whitespace-nowrap">
                          {Number(sku.produced_quantity || 0).toLocaleString()} PCS
                        </td>
                        <td className="p-2.5 text-right font-mono font-black text-amber-600 whitespace-nowrap">
                          {Number(sku.pending_to_fg).toLocaleString()} PCS
                        </td>
                        <td className="p-2.5 text-center min-w-[120px]">
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-0.5">
                            <span>Stage {compStg}/{totalStg}</span>
                            <span>{progPct}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${progPct}%` }} />
                          </div>
                        </td>
                        <td className="p-2.5 text-center whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
                            {sku.status || 'In Production'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs font-semibold">
            <Icon name="check" size="lg" className="mx-auto text-emerald-500 mb-2" ariaHidden={true} />
            <p>All production batches have been completed and converted into Finished Goods!</p>
            <p className="text-[11px] text-slate-400 mt-1">To start a new batch, release an order from Production Planning.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
