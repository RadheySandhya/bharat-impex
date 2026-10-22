import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Search, 
  Filter, 
  Download, 
  Camera, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpDown,
  TrendingDown,
  TrendingUp,
  SlidersHorizontal
} from 'lucide-react';
import Icon from '../../components/UI/Icon';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useDateRange } from '../../context/DateRangeContext';
import { triggerDownload } from '../../utils/csvTemplates';

/**
 * Stock Science Zone Calculation:
 * - Red Zone: 0 to 30% of Max Level (Critical / Immediate Action)
 * - Yellow Zone: 31 to 60% of Max Level (Buffer / Low Stock)
 * - Green Zone: 61 to 100% of Max Level (Sufficient Stock / Optimum)
 * - Purple Stock: > 100% of Max Level (Surplus / Above Max Level)
 */
export const getStockZone = (stock, maxLevel, minLevel = 0) => {
  const s = Number(stock || 0);
  const max = Number(maxLevel || 0);
  const min = Number(minLevel || 0);

  if (max > 0) {
    const ratio = (s / max) * 100;
    if (ratio <= 30) return 'RED';
    if (ratio <= 60) return 'YELLOW';
    if (ratio <= 100) return 'GREEN';
    return 'PURPLE';
  }

  // Fallback when maxLevel is 0
  if (s <= 0) return 'RED';
  if (min > 0 && s <= min) return 'YELLOW';
  return 'GREEN';
};

export const getZoneStyles = (zone) => {
  switch (zone) {
    case 'RED':
      return {
        bg: 'bg-rose-500',
        text: 'text-rose-900',
        border: 'border-rose-200',
        badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
        cellClass: 'bg-rose-50 text-rose-900 font-bold border-r border-rose-200/60 hover:bg-rose-100/80',
        style: { backgroundColor: '#fff1f2', color: '#9f1239' },
        label: 'Red Zone (0–30%)',
        desc: '0 to 30% of Max Level (Critical)',
        dot: 'bg-rose-500'
      };
    case 'YELLOW':
      return {
        bg: 'bg-amber-400',
        text: 'text-amber-950',
        border: 'border-amber-200',
        badgeBg: 'bg-amber-100 text-amber-900 border-amber-200',
        cellClass: 'bg-amber-50 text-amber-900 font-bold border-r border-amber-200/60 hover:bg-amber-100/80',
        style: { backgroundColor: '#fffbeb', color: '#92400e' },
        label: 'Yellow Zone (31–60%)',
        desc: '31 to 60% of Max Level (Buffer)',
        dot: 'bg-amber-500'
      };
    case 'GREEN':
      return {
        bg: 'bg-emerald-500',
        text: 'text-emerald-950',
        border: 'border-emerald-200',
        badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-200',
        cellClass: 'bg-emerald-50 text-emerald-900 font-bold border-r border-emerald-200/60 hover:bg-emerald-100/80',
        style: { backgroundColor: '#ecfdf5', color: '#065f46' },
        label: 'Green Zone (61–100%)',
        desc: '61 to 100% of Max Level (Sufficient)',
        dot: 'bg-emerald-500'
      };
    case 'PURPLE':
      return {
        bg: 'bg-purple-500',
        text: 'text-purple-950',
        border: 'border-purple-200',
        badgeBg: 'bg-purple-100 text-purple-900 border-purple-200',
        cellClass: 'bg-purple-50 text-purple-900 font-bold border-r border-purple-200/60 hover:bg-purple-100/80',
        style: { backgroundColor: '#faf5ff', color: '#6b21a8' },
        label: 'Purple Stock (>100%)',
        desc: 'Above 100% of Max Level (Surplus)',
        dot: 'bg-purple-600'
      };
    default:
      return {
        bg: 'bg-slate-200',
        text: 'text-slate-800',
        border: 'border-slate-300',
        badgeBg: 'bg-slate-100 text-slate-800 border-slate-200',
        cellClass: 'bg-slate-50 text-slate-700 font-semibold border-r border-slate-200/60 hover:bg-slate-100/80',
        style: { backgroundColor: '#f8fafc', color: '#334155' },
        label: 'Normal',
        desc: '',
        dot: 'bg-slate-400'
      };
  }
};

export function IMSTriNagarMaster() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStockType, setSelectedStockType] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const { dateRange } = useDateRange();
  const [takingSnapshot, setTakingSnapshot] = useState(false);

  const { success, error } = useToast();

  const fetchMasterData = async () => {
    setLoading(true);
    try {
      const res = await api.stock.getImsMaster({
        start_date: dateRange.from,
        end_date: dateRange.to,
        material_type: selectedStockType !== 'ALL' ? selectedStockType : undefined,
      });
      if (res?.data) {
        setData(res.data);
      }
    } catch (err) {
      error('Failed to load IMS Master Sheet: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, [dateRange.from, dateRange.to, selectedStockType]);

  // Capture Today's Snapshot
  const handleCaptureSnapshot = async () => {
    setTakingSnapshot(true);
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      await api.stock.recordSnapshot(todayStr);
      success(`EOD Daily stock snapshot recorded successfully for ${todayStr}!`);
      fetchMasterData();
    } catch (err) {
      error('Snapshot capture failed: ' + err.message);
    } finally {
      setTakingSnapshot(false);
    }
  };

  // Filtered rows
  const filteredItems = useMemo(() => {
    if (!data?.items) return [];

    return data.items.filter((item) => {
      // Search matching
      const matchSearch =
        item.cat_no.toLowerCase().includes(search.toLowerCase()) ||
        item.item_name.toLowerCase().includes(search.toLowerCase()) ||
        (item.item_type || '').toLowerCase().includes(search.toLowerCase()) ||
        (item.material_type || '').toLowerCase().includes(search.toLowerCase()) ||
        (item.group_name || '').toLowerCase().includes(search.toLowerCase());

      if (!matchSearch) return false;

      // Stock Type Filter
      if (selectedStockType !== 'ALL') {
        if (selectedStockType === 'FG' && item.material_type !== 'FG') return false;
        if (selectedStockType === 'RM' && item.material_type !== 'RM') return false;
      }

      // Stock Zone Science Filter
      if (statusFilter !== 'ALL') {
        const itemZone = getStockZone(item.current_stock, item.max_level, item.min_level);
        if (statusFilter === 'RED' && itemZone !== 'RED') return false;
        if (statusFilter === 'YELLOW' && itemZone !== 'YELLOW') return false;
        if (statusFilter === 'GREEN' && itemZone !== 'GREEN') return false;
        if (statusFilter === 'PURPLE' && itemZone !== 'PURPLE') return false;
        // Backwards compatibility with previous filter IDs
        if (statusFilter === 'ZERO' && itemZone !== 'RED') return false;
        if (statusFilter === 'LOW' && itemZone !== 'YELLOW') return false;
        if (statusFilter === 'HEALTHY' && itemZone !== 'GREEN') return false;
        if (statusFilter === 'SURPLUS' && itemZone !== 'PURPLE') return false;
      }

      return true;
    });
  }, [data, search, statusFilter, selectedStockType]);

  // KPI Metrics by 4 Stock Science Zones (Red 0-30%, Yellow 31-60%, Green 61-100%, Purple >100%)
  const kpis = useMemo(() => {
    if (!data?.items) return { total: 0, red: 0, yellow: 0, green: 0, purple: 0 };
    let red = 0;
    let yellow = 0;
    let green = 0;
    let purple = 0;

    data.items.forEach((item) => {
      const zone = getStockZone(item.current_stock, item.max_level, item.min_level);
      if (zone === 'RED') red++;
      else if (zone === 'YELLOW') yellow++;
      else if (zone === 'GREEN') green++;
      else if (zone === 'PURPLE') purple++;
    });

    return {
      total: data.items.length,
      red,
      yellow,
      green,
      purple,
    };
  }, [data]);

  // Export to CSV
  const handleExportCSV = () => {
    if (!data?.items) return;

    const dateCols = data.date_columns || (data.day_columns || []).map(d => ({ date: d, day_num: d, label: `Day ${d}`, formatted: d }));
    const headers = [
      'S.No.',
      'Cat No',
      'Item Name',
      'Stock Type',
      'MAX Level',
      'Min Level',
      'Current Live Stock',
      'Stock Science Zone',
      '% of Max Level',
      ...dateCols.map((c) => c.formatted || c.label),
    ];

    const rows = filteredItems.map((item, idx) => {
      const zone = getStockZone(item.current_stock, item.max_level, item.min_level);
      const ratio = item.max_level > 0 ? `${Math.round((item.current_stock / item.max_level) * 100)}%` : 'N/A';
      return [
        idx + 1,
        `"${item.cat_no}"`,
        `"${item.item_name}"`,
        `"${item.item_type || (item.material_type === 'RM' ? 'Child Part' : 'Finished Good')}"`,
        item.max_level,
        item.min_level,
        item.current_stock,
        zone,
        ratio,
        ...dateCols.map((c) => (item.day_stock?.[c.date] || item.day_stock?.[c.day_num])?.quantity ?? item.current_stock),
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    triggerDownload(
      csvContent,
      `IMS_Tri_Nagar_Master_Working_${dateRange.from || 'start'}_to_${dateRange.to || 'end'}_${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  const getCellBg = (cellData, maxLevel = 0, minLevel = 0) => {
    if (!cellData) return 'bg-slate-50 text-slate-700';
    const zone = cellData.zone || getStockZone(cellData.quantity, maxLevel, minLevel);
    return getZoneStyles(zone).cellClass;
  };

  const dateColumns = (data?.date_columns && data.date_columns.length > 0)
    ? data.date_columns
    : (data?.day_columns || []).map((d) => ({
        date: d,
        day_num: d,
        label: `Day ${d}`,
        formatted: d,
        is_today: Boolean(data?.is_current_month && d === data?.today_day),
      }));

  return (
    <div className="space-y-5">

      {/* Unified Compact Control Panel: Cards on Left, Rules & Filters on Right */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-center">
          
          {/* Column 1 (Left): Compact 4-Zone Cards + Total Catalog Badge */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-1.5 px-0.5">
              <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                Live Zone Breakdown
              </span>
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                title="View All Tracked SKUs"
              >
                Tracked Catalog: <strong className="font-mono">{kpis.total}</strong>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-1.5">
              {/* Red Zone Card */}
              <div
                onClick={() => setStatusFilter(statusFilter === 'RED' ? 'ALL' : 'RED')}
                className={`p-2 rounded-xl border cursor-pointer transition-all ${
                  statusFilter === 'RED'
                    ? 'ring-2 ring-rose-500 border-rose-500 bg-rose-50'
                    : 'bg-rose-50/40 border-rose-200/80 hover:bg-rose-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-rose-700">Red (0–30%)</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                </div>
                <div className="flex items-baseline justify-between mt-0.5">
                  <span className="text-lg font-black text-rose-700 leading-none">{kpis.red}</span>
                  <span className="text-[9px] text-rose-600 font-medium">Critical</span>
                </div>
              </div>

              {/* Yellow Zone Card */}
              <div
                onClick={() => setStatusFilter(statusFilter === 'YELLOW' ? 'ALL' : 'YELLOW')}
                className={`p-2 rounded-xl border cursor-pointer transition-all ${
                  statusFilter === 'YELLOW'
                    ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-50'
                    : 'bg-amber-50/40 border-amber-200/80 hover:bg-amber-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-amber-800">Yellow (31–60%)</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                </div>
                <div className="flex items-baseline justify-between mt-0.5">
                  <span className="text-lg font-black text-amber-800 leading-none">{kpis.yellow}</span>
                  <span className="text-[9px] text-amber-700 font-medium">Buffer</span>
                </div>
              </div>

              {/* Green Zone Card */}
              <div
                onClick={() => setStatusFilter(statusFilter === 'GREEN' ? 'ALL' : 'GREEN')}
                className={`p-2 rounded-xl border cursor-pointer transition-all ${
                  statusFilter === 'GREEN'
                    ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50'
                    : 'bg-emerald-50/40 border-emerald-200/80 hover:bg-emerald-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-800">Green (61–100%)</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </div>
                <div className="flex items-baseline justify-between mt-0.5">
                  <span className="text-lg font-black text-emerald-800 leading-none">{kpis.green}</span>
                  <span className="text-[9px] text-emerald-700 font-medium">Optimum</span>
                </div>
              </div>

              {/* Purple Zone Card */}
              <div
                onClick={() => setStatusFilter(statusFilter === 'PURPLE' ? 'ALL' : 'PURPLE')}
                className={`p-2 rounded-xl border cursor-pointer transition-all ${
                  statusFilter === 'PURPLE'
                    ? 'ring-2 ring-purple-500 border-purple-500 bg-purple-50'
                    : 'bg-purple-50/40 border-purple-200/80 hover:bg-purple-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-purple-800">Purple (&gt;100%)</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                </div>
                <div className="flex items-baseline justify-between mt-0.5">
                  <span className="text-lg font-black text-purple-800 leading-none">{kpis.purple}</span>
                  <span className="text-[9px] text-purple-700 font-medium">Surplus</span>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2 (Right): Stock Science Rules + Search & Filters */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-2.5">
            {/* Stock Science Rules Legend */}
            <div className="flex items-center justify-between flex-wrap gap-1.5 pb-2 border-b border-slate-100">
              <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                Stock Science Rule:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-semibold">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-50 text-red-800 border border-red-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block" />
                  0–30% Red (Critical)
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block" />
                  31–60% Yellow (Buffer)
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" />
                  61–100% Green (Optimum)
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600 inline-block" />
                  &gt;100% Purple (Surplus)
                </span>
              </div>
            </div>

            {/* Search Input & Stock Type Dropdown */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search Cat No, Item Name, or Stock Type..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>

              <select
                value={selectedStockType}
                onChange={(e) => setSelectedStockType(e.target.value)}
                className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700 focus:ring-2 focus:ring-blue-600 cursor-pointer"
              >
                <option value="ALL">All Stock Types (FG & RM)</option>
                <option value="FG">Finished Goods (FG)</option>
                <option value="RM">Child Parts (RM)</option>
              </select>
            </div>

            {/* Quick Status Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs pt-0.5">
              {[
                { id: 'ALL', label: `All Items (${kpis.total})` },
                { id: 'RED', label: `🔴 Red (${kpis.red})` },
                { id: 'YELLOW', label: `🟡 Yellow (${kpis.yellow})` },
                { id: 'GREEN', label: `🟢 Green (${kpis.green})` },
                { id: 'PURPLE', label: `🟣 Purple (${kpis.purple})` },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    statusFilter === st.id
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Spreadsheet Matrix Grid */}
      <div className="bg-white border border-slate-300 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[680px]">
          <table className="w-full text-left text-xs border-collapse font-sans">
            {/* Header */}
            <thead>
              <tr className="bg-slate-100 text-slate-900 uppercase font-black text-[11px] border-b-2 border-slate-400 sticky top-0 z-30 shadow-xs">
                <th className="p-2.5 border-r border-slate-300 bg-slate-200 text-center w-12 sticky left-0 z-40">
                  S.No.
                </th>
                <th className="p-2.5 border-r border-slate-300 bg-slate-200 min-w-[120px] sticky left-12 z-40 text-center">
                  Cat No
                </th>
                <th className="p-2.5 border-r border-slate-300 bg-slate-200 min-w-[280px]">
                  Item Name
                </th>
                <th className="p-2.5 border-r border-slate-300 bg-slate-200 min-w-[140px] text-center">
                  Stock Type
                </th>
                <th className="p-2.5 border-r border-slate-300 bg-slate-200 text-center min-w-[80px]">
                  MAX Level
                </th>
                <th className="p-2.5 border-r-2 border-slate-400 bg-blue-50 text-center min-w-[105px]">
                  Current Live Stock
                </th>

                {/* Date-Wise Dynamic Columns */}
                {dateColumns.map((col) => {
                  const isTodayCol = Boolean(col.is_today);
                  return (
                    <th
                      key={col.date || col.day_num}
                      className={`p-2 border-r text-center min-w-[70px] font-mono transition-all ${
                        isTodayCol
                          ? 'bg-blue-600 text-white font-black border-blue-700 shadow-inner'
                          : 'bg-slate-100 border-slate-300 font-bold text-slate-800'
                      }`}
                      title={isTodayCol ? 'Current day live real-time stock' : `Closing snapshot for ${col.formatted || col.label || col.date}`}
                    >
                      <div className="text-[11px] leading-tight font-bold">{col.label || col.date}</div>
                      {isTodayCol ? (
                        <div className="text-[8px] font-black tracking-wider uppercase text-blue-100 flex items-center justify-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                          <span>Live</span>
                        </div>
                      ) : (
                        <div className="text-[9px] font-medium opacity-50 mt-0.5">
                          {col.day_num ? `Day ${col.day_num}` : ''}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-y divide-slate-200 text-[11px]">
              {loading ? (
                <tr>
                  <td
                    colSpan={6 + (dateColumns.length || 4)}
                    className="p-12 text-center text-slate-500 font-semibold"
                  >
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                      <span>Loading IMS Master Working Matrix from Database...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={6 + (dateColumns.length || 4)}
                    className="p-12 text-center text-slate-400 font-semibold"
                  >
                    No matching items found for "{search}".
                  </td>
                </tr>
              ) : (
                filteredItems.map((row, idx) => (
                  <tr
                    key={row.id}
                    className="hover:bg-blue-50/50 transition-colors group font-medium"
                  >
                    {/* S.No */}
                    <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-600 bg-slate-50 sticky left-0 z-20 group-hover:bg-blue-100/60">
                      {idx + 1}
                    </td>

                    {/* Cat No */}
                    <td className="p-2 border-r border-slate-200 font-mono font-bold text-slate-900 bg-slate-50 sticky left-12 z-20 group-hover:bg-blue-100/60 whitespace-nowrap text-center">
                      {row.cat_no}
                    </td>

                    {/* Item Name */}
                    <td className="p-2 border-r border-slate-200 font-bold text-slate-900 leading-tight">
                      {row.item_name}
                    </td>

                    {/* Stock Type */}
                    <td className="p-2 border-r border-slate-200 text-center font-semibold">
                      {row.material_type === 'RM' || row.item_type?.toLowerCase()?.includes('raw') || row.item_type?.toLowerCase()?.includes('child') ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold inline-flex items-center gap-1 shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Child Part
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold inline-flex items-center gap-1 shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          Finished Good
                        </span>
                      )}
                    </td>

                    {/* MAX Level - Center Aligned */}
                    <td className="p-2 border-r border-slate-200 text-center font-mono font-semibold text-slate-700">
                      {row.max_level}
                    </td>

                    {/* Current Stock with Dynamic Stock Science Zone Color - Center Aligned */}
                    {(() => {
                      const zone = getStockZone(row.current_stock, row.max_level, row.min_level);
                      const zoneStyle = getZoneStyles(zone);
                      const ratio = row.max_level > 0 ? Math.round((Number(row.current_stock) / Number(row.max_level)) * 100) : null;
                      return (
                        <td
                          className={`p-2 border-r-2 border-slate-300 text-center font-mono text-xs transition-colors ${zoneStyle.cellClass}`}
                          style={zoneStyle.style}
                          title={`Current Live Stock: ${row.current_stock} ${row.unit_code}\nMAX Level: ${row.max_level}\nZone: ${zoneStyle.label}${ratio !== null ? ` (${ratio}% of Max Level)` : ''}`}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="font-extrabold text-xs">{row.current_stock}</span>
                            {ratio !== null && (
                              <span className={`text-[9px] font-sans font-bold px-1.5 py-0.2 rounded border shadow-2xs ${zoneStyle.badgeBg}`}>
                                {ratio}%
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })()}

                    {/* Date-Wise Dynamic Columns with Stock Science Color */}
                    {dateColumns.map((col) => {
                      const cell = row.day_stock?.[col.date] || row.day_stock?.[col.day_num] || row.day_stock?.[col];
                      const val = cell ? cell.quantity : row.current_stock;
                      const dayZone = cell?.zone || getStockZone(val, row.max_level, row.min_level);
                      const zoneStyle = getZoneStyles(dayZone);
                      const bgClass = zoneStyle.cellClass;
                      const isToday = Boolean(col.is_today || cell?.is_today);
                      const ratio = row.max_level > 0 ? Math.round((Number(val) / Number(row.max_level)) * 100) : null;

                      const tooltipText = isToday
                        ? `${col.label || col.date} (TODAY LIVE): ${val} ${row.unit_code}\n• Zone: ${zoneStyle.label}${ratio !== null ? ` (${ratio}% of Max)` : ''}\n• Opening: ${cell?.opening_stock ?? 0}\n• Total Inward: +${cell?.today_in ?? 0}\n• Total Outward: -${cell?.today_out ?? 0}`
                        : `${col.label || col.date} (Closing Snapshot): ${val} ${row.unit_code}\n• Zone: ${zoneStyle.label}${ratio !== null ? ` (${ratio}% of Max)` : ''}`;

                      return (
                        <td
                          key={col.date || col.day_num}
                          className={`p-2 border-r border-slate-200 text-center font-mono text-[11px] relative transition-colors ${bgClass} ${
                            isToday ? 'ring-2 ring-inset ring-blue-500 font-extrabold' : ''
                          }`}
                          style={zoneStyle.style}
                          title={tooltipText}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span>{val}</span>
                            {isToday && (
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block animate-pulse" title="Live calculated today" />
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default IMSTriNagarMaster;
