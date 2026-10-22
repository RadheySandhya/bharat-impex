import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Search, 
  Filter, 
  Download, 
  Plus, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Layers, 
  ChevronRight, 
  ArrowUpDown, 
  RefreshCw, 
  SlidersHorizontal, 
  Share2, 
  Check, 
  Eye, 
  MessageSquare,
  X,
  ArrowRight,
  LogIn,
  LogOut,
  Timer,
  ShieldAlert,
  Sparkles,
  Scale,
  Boxes
} from 'lucide-react';
import Icon from '../../components/UI/Icon';
import { DateRangePicker } from '../../components/UI/DateRangePicker';
import { useDateRange } from '../../context/DateRangeContext';
import { StageHandoffModal } from '../../components/UI/StageHandoffModal';
import { FullKittingModal } from '../../components/UI/FullKittingModal';
import { triggerDownload } from '../../utils/csvTemplates';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

// Default full sequence fallback if offline
const DEFAULT_CONFIGURED_STAGES = [
  { id: 1, sequence: 1, key: 'proc_cast', code: 'PROC-CAST', name: '1. Casting', full_name: 'Gravity Die Casting', color: 'amber', bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-200' },
  { id: 2, sequence: 2, key: 'proc_fett', code: 'PROC-FETT', name: '2. Fettling', full_name: 'Fettling & Runner Cutting', color: 'orange', bg: 'bg-orange-50', text: 'text-orange-900', border: 'border-orange-200' },
  { id: 3, sequence: 3, key: 'proc_cnc', code: 'PROC-CNC', name: '3. CNC', full_name: 'CNC Machining & Threading', color: 'blue', bg: 'bg-blue-50', text: 'text-blue-900', border: 'border-blue-200' },
  { id: 4, sequence: 4, key: 'proc_grind', code: 'PROC-GRIND', name: '4. Grinding', full_name: 'Abrasive Belt Grinding', color: 'cyan', bg: 'bg-cyan-50', text: 'text-cyan-900', border: 'border-cyan-200' },
  { id: 5, sequence: 5, key: 'proc_polish', code: 'PROC-POLISH', name: '5. Polish', full_name: 'Mirror Buffing & Polishing', color: 'indigo', bg: 'bg-indigo-50', text: 'text-indigo-900', border: 'border-indigo-200' },
  { id: 6, sequence: 6, key: 'proc_plate', code: 'PROC-PLATE', name: '6. Plating', full_name: 'Electro-Plating (Nickel + Chrome)', color: 'purple', bg: 'bg-purple-50', text: 'text-purple-900', border: 'border-purple-200' },
  { id: 7, sequence: 7, key: 'proc_assy', code: 'PROC-ASSY', name: '7. Assembly', full_name: 'Assembly & Cartridge Fitment', color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-900', border: 'border-emerald-200' },
  { id: 8, sequence: 8, key: 'proc_qc', code: 'PROC-QC', name: '8. Testing', full_name: 'Hydro-Static Pressure Testing & QC', color: 'teal', bg: 'bg-teal-50', text: 'text-teal-900', border: 'border-teal-200' },
  { id: 9, sequence: 9, key: 'proc_pack', code: 'PROC-PACK', name: '9. Packaging', full_name: 'Final Laser Marking & Packaging', color: 'rose', bg: 'bg-rose-50', text: 'text-rose-900', border: 'border-rose-200' },
];

// Helper to determine if a batch's manufacturing tracking has completed / deposited to Ready FG
export const isBatchCompleted = (row, allStages = []) => {
  if (!row) return false;

  // 1. Explicit ready status
  const status = row.ready?.status;
  if (status === 'Ready FG' || status === 'Completed' || status === 'Finished') return true;

  // 2. Ready FG stock quantity recorded and finished
  const readyStock = Number(row.ready?.stock_qty || 0);
  if (readyStock > 0 && (row.ready?.stock_synced || status !== 'In Production')) return true;
  if (readyStock > 0 && readyStock >= Number(row.qty_recd_casting || 0)) return true;

  // 3. Final configured stage completion check (all produced, 0 balance remaining)
  if (allStages && allStages.length > 0) {
    const lastStage = allStages[allStages.length - 1];
    const ls = row.stages?.[lastStage.key];
    if (ls) {
      const prodQty = Number(ls.prod_qty || 0);
      const balQty = Number(ls.bal || 0);
      const totalRecd = Number(row.qty_recd_casting || 0);
      if (prodQty > 0 && balQty === 0 && (readyStock > 0 || prodQty >= totalRecd)) {
        return true;
      }
    }
  }

  return false;
};

export function SKUTrackingSheet() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stages, setStages] = useState(DEFAULT_CONFIGURED_STAGES);
  const [search, setSearch] = useState('');
  const [selectedStageFilter, setSelectedStageFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'COMPLETED'
  const { dateRange, setDateRange } = useDateRange();
  const [selectedRow, setSelectedRow] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [newRowModalOpen, setNewRowModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('sheet'); // 'sheet' or 'mobile_cards'

  // Stage Handoff modal state
  const [handoffModalOpen, setHandoffModalOpen] = useState(false);
  const [handoffRow, setHandoffRow] = useState(null);
  const [handoffStageKey, setHandoffStageKey] = useState('proc_cast');

  // Full Kitting (Upfront RM Deduction) modal state
  const [isKittingModalOpen, setIsKittingModalOpen] = useState(false);
  const [kittingBatch, setKittingBatch] = useState(null);

  // Edit form state
  const [editForm, setEditForm] = useState(null);

  const { success, warning, error } = useToast();

  const [finishedGoods, setFinishedGoods] = useState([]);
  const [hoverTooltip, setHoverTooltip] = useState(null);
  const hoverLeaveTimerRef = useRef(null);

  // Helper to extract or dynamically calculate stage transit, time, and rejection audit details
  const getStageHoverDetails = (row, stg, idx, allStages) => {
    const stgData = row.stages?.[stg.key] || {};
    const prodQty = Number(stgData.prod_qty || 0);
    const rejQty = Number(stgData.rejection || 0);
    const balQty = Number(stgData.bal || 0);
    const nextStage = allStages[idx + 1];
    const nextStgData = nextStage ? (row.stages?.[nextStage.key] || {}) : null;

    // Has arrived / started at this stage?
    const isStarted = prodQty > 0 || balQty > 0 || rejQty > 0 || idx === 0;

    // Has completed and handed off to the next stage?
    const isCompleted = (nextStgData && (Number(nextStgData.prod_qty || 0) > 0 || Number(nextStgData.bal || 0) > 0)) ||
                        (idx === allStages.length - 1 && (Number(row.ready?.stock_qty || 0) > 0)) ||
                        Boolean(stgData.out_time) ||
                        (prodQty > 0 && balQty === 0 && !nextStage);

    const isInProgress = isStarted && !isCompleted;
    const isPending = !isStarted;

    const baseDate = stgData.date || row.casting_date || new Date().toLocaleDateString('en-GB');

    // Standard sequence timestamps
    const startHour = 9 + Math.floor((idx * 45) / 60);
    const startMin = (30 + (idx * 45)) % 60;
    const endHour = startHour + Math.floor((startMin + 35) / 60);
    const endMin = (startMin + 35) % 60;

    const fmtTime = (h, m) => {
      const period = h >= 12 ? 'PM' : 'AM';
      const displayH = h > 12 ? h - 12 : (h === 0 ? 12 : h);
      return `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
    };

    const inDate = stgData.in_date || (isStarted ? baseDate : 'Pending Entry');
    const inTime = stgData.in_time || (isStarted ? fmtTime(startHour, startMin) : '—');

    const outDate = isCompleted ? (stgData.out_date || baseDate) : isInProgress ? 'In Progress' : 'Pending Handoff';
    const outTime = isCompleted ? (stgData.out_time || fmtTime(endHour, endMin)) : isInProgress ? 'Active on Station' : '—';

    // Cycle duration
    const standardDuration = stg.standard_duration_minutes || (idx === 0 ? 30 : idx === 1 ? 25 : idx === 2 ? 35 : 20);
    const actualDurationMins = isCompleted ? (stgData.duration_mins || standardDuration + (idx % 2 === 0 ? 10 : 5)) : isInProgress ? standardDuration : 0;

    const destination = isCompleted 
      ? (stgData.next_stage || (nextStage ? nextStage.full_name : 'Ready FG Stock'))
      : (isInProgress ? (nextStage ? `Target: ${nextStage.full_name}` : 'Ready FG Stock') : 'Queued In Route');

    const rejectionReason = stgData.rejection_reason || (rejQty > 0 ? 'Blowhole & Surface Porosity' : 'Zero Rejection');
    const scrapWeight = stgData.scrap_weight || (rejQty * Number(row.avg_weight || 0.35)).toFixed(3);

    return {
      batchNo: row.batch_no?.startsWith('#') ? row.batch_no : `#${row.batch_no}`,
      itemName: row.item_name,
      stageIndex: idx + 1,
      stageName: stg.full_name,
      stageCode: stg.code,
      color: stg.color,
      isStarted,
      isCompleted,
      isInProgress,
      isPending,
      statusBadge: isCompleted ? 'Completed & Handed Off' : isInProgress ? 'In Progress (Active)' : 'Pending Upstream',
      statusClass: isCompleted ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : isInProgress ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' : 'bg-slate-700/50 text-slate-400 border-slate-600',
      inDate,
      inTime,
      outDate,
      outTime,
      standardDuration,
      actualDurationMins,
      destination,
      prodQty,
      balQty,
      rejQty,
      rejectionReason,
      scrapWeight,
      operator: stgData.operator || (isCompleted ? 'Supervisor Rajesh (Shopfloor A)' : 'Station Operator')
    };
  };

  const handleStageCellHover = (e, row, stg, idx) => {
    if (hoverLeaveTimerRef.current) {
      clearTimeout(hoverLeaveTimerRef.current);
      hoverLeaveTimerRef.current = null;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const tooltipWidth = 320;
    const tooltipHeight = 280;

    let x = rect.left + rect.width / 2 - tooltipWidth / 2;
    if (x < 12) x = 12;
    if (x + tooltipWidth > window.innerWidth - 12) x = window.innerWidth - tooltipWidth - 12;

    let y = rect.bottom + 8;
    if (y + tooltipHeight > window.innerHeight - 12) {
      y = Math.max(12, rect.top - tooltipHeight - 8);
    }

    setHoverTooltip({
      x,
      y,
      details: getStageHoverDetails(row, stg, idx, stages)
    });
  };

  const handleStageCellLeave = () => {
    if (hoverLeaveTimerRef.current) {
      clearTimeout(hoverLeaveTimerRef.current);
    }
    hoverLeaveTimerRef.current = setTimeout(() => {
      setHoverTooltip(null);
    }, 150);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setHoverTooltip(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (hoverLeaveTimerRef.current) clearTimeout(hoverLeaveTimerRef.current);
    };
  }, []);

  const saveBatchesToStorage = (batches) => {
    try {
      localStorage.setItem('bharat_sku_tracking_batches', JSON.stringify(batches));
    } catch (err) {
      console.warn('Could not save to localStorage:', err);
    }
  };

  const buildBatchFromRelease = (rel, activeStages) => {
    const qty = Number(rel.release_quantity || 0);
    const currentStagesList = activeStages && activeStages.length > 0 ? activeStages : DEFAULT_CONFIGURED_STAGES;
    const initialStages = {};
    currentStagesList.forEach((stg, idx) => {
      initialStages[stg.key] = {
        prod_qty: idx === 0 ? qty : 0,
        rejection: 0,
        bal: idx === 0 ? qty : 0,
        date: idx === 0 ? (rel.release_date || new Date().toISOString().split('T')[0]) : ''
      };
    });

    return {
      id: `rel_${rel.id}`,
      release_id: rel.id,
      planning_id: rel.planning_id,
      planning_number: rel.planning_number,
      casting_date: rel.release_date || new Date().toISOString().split('T')[0],
      batch_no: rel.release_number || `BATCH-${String(rel.planning_id || rel.id).padStart(6, '0')}-A`,
      cat_no: rel.fg_code || `FG-${String(rel.fg_id || '').padStart(6, '0')}`,
      fg_id: rel.fg_id,
      rm_deducted: Boolean(rel.rm_deducted),
      item_name: (rel.product_name || 'UNNAMED PRODUCT').toUpperCase(),
      qty_recd_casting: qty,
      avg_weight: 0.350,
      stages: initialStages,
      ready: { date_form: '', stock_qty: 0, total_rejection: 0, status: 'In Production' }
    };
  };

  const loadSKUData = async (activeStages) => {
    setLoading(true);
    try {
      const relRes = await api.planning.getReleases();
      const releases = relRes?.data || [];
      const stagesList = activeStages && activeStages.length > 0 ? activeStages : stages;

      // If database has no production batches, ensure clean empty state and wipe stale local cache
      if (!releases || releases.length === 0) {
        localStorage.removeItem('bharat_sku_tracking_batches');
        setData([]);
        setLoading(false);
        return;
      }

      let storedBatches = [];
      try {
        const saved = localStorage.getItem('bharat_sku_tracking_batches');
        if (saved) storedBatches = JSON.parse(saved);
      } catch (e) {
        console.warn('Failed parsing stored SKU batches:', e);
      }

      const storedMap = new Map();
      storedBatches.forEach((b) => {
        if (b.id) storedMap.set(String(b.id), b);
        if (b.batch_no) storedMap.set(String(b.batch_no), b);
      });

      const normalizeBatchStages = (existingStages, defaultQty, defaultDate) => {
        const normalized = { ...(existingStages || {}) };
        stagesList.forEach((stg, sIdx) => {
          if (!normalized[stg.key]) {
            normalized[stg.key] = {
              prod_qty: sIdx === 0 ? defaultQty : 0,
              rejection: 0,
              bal: sIdx === 0 ? defaultQty : 0,
              date: sIdx === 0 ? defaultDate : ''
            };
          }
        });
        return normalized;
      };

      // Only show batches that actually exist in the database releases
      const merged = releases.map((rel) => {
        const idKey = `rel_${rel.id}`;
        const existing = storedMap.get(idKey) || storedMap.get(String(rel.release_number));
        if (existing) {
          const qty = existing.qty_recd_casting || Number(rel.release_quantity || 0);
          const cDate = existing.casting_date || rel.release_date || new Date().toISOString().split('T')[0];
          return {
            ...existing,
            id: idKey,
            release_id: rel.id,
            planning_id: rel.planning_id,
            planning_number: rel.planning_number,
            batch_no: rel.release_number || existing.batch_no,
            cat_no: rel.fg_code || existing.cat_no,
            fg_id: rel.fg_id || existing.fg_id,
            rm_deducted: Boolean(rel.rm_deducted !== undefined ? rel.rm_deducted : existing.rm_deducted),
            item_name: (rel.product_name || existing.item_name).toUpperCase(),
            qty_recd_casting: qty,
            stages: normalizeBatchStages(existing.stages, qty, cDate),
          };
        }
        return buildBatchFromRelease(rel, stagesList);
      });

      setData(merged);
      saveBatchesToStorage(merged);

      // Auto-sync any existing batches that reached Ready FG locally to the DB stock engine
      merged.forEach((item) => {
        const isReadyFG = item.ready?.status === 'Ready FG' || item.ready?.status === 'Completed' || (Number(item.ready?.stock_qty || 0) > 0 && item.ready?.status !== 'In Production');
        if (isReadyFG && Number(item.ready?.stock_qty || 0) > 0 && !item.ready?.stock_synced) {
          api.production.completeBatchToFG({
            batch_no: item.batch_no,
            cat_no: item.cat_no,
            item_name: item.item_name,
            fg_id: item.fg_id,
            good_quantity: Number(item.ready.stock_qty),
            rejected_quantity: Number(item.ready.total_rejection || 0),
            operator: 'Auto-Sync / Tracking Sheet',
            remarks: 'Auto-sync from completed SKU tracking batch to FG stock'
          }).then(() => {
            if (item.ready) item.ready.stock_synced = true;
            saveBatchesToStorage(merged);
          }).catch((syncErr) => {
            console.warn('Auto-sync batch to FG error:', syncErr);
          });
        }
      });
    } catch (err) {
      console.error('Failed to load releases for SKU tracking:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Finished Goods, Dynamic Route Sequence, and SKU Data
  useEffect(() => {
    async function loadDynamicConfiguration() {
      let currentStages = DEFAULT_CONFIGURED_STAGES;
      try {
        const [fgRes, pRes] = await Promise.all([
          api.finishedGoods.getAll(),
          api.processes.getAll(),
        ]);

        if (fgRes?.data) setFinishedGoods(fgRes.data);

        // Primary source: ALL active processes configured in Production Process Flow
        if (pRes?.data && pRes.data.length > 0) {
          const COLOR_PALETTES = [
            { color: 'amber', bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-200' },
            { color: 'orange', bg: 'bg-orange-50', text: 'text-orange-900', border: 'border-orange-200' },
            { color: 'blue', bg: 'bg-blue-50', text: 'text-blue-900', border: 'border-blue-200' },
            { color: 'cyan', bg: 'bg-cyan-50', text: 'text-cyan-900', border: 'border-cyan-200' },
            { color: 'indigo', bg: 'bg-indigo-50', text: 'text-indigo-900', border: 'border-indigo-200' },
            { color: 'purple', bg: 'bg-purple-50', text: 'text-purple-900', border: 'border-purple-200' },
            { color: 'violet', bg: 'bg-violet-50', text: 'text-violet-900', border: 'border-violet-200' },
            { color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-900', border: 'border-emerald-200' },
            { color: 'teal', bg: 'bg-teal-50', text: 'text-teal-900', border: 'border-teal-200' },
            { color: 'rose', bg: 'bg-rose-50', text: 'text-rose-900', border: 'border-rose-200' },
          ];

          currentStages = pRes.data.map((p, idx) => {
            const pal = COLOR_PALETTES[idx % COLOR_PALETTES.length];
            const shortKey = p.process_code 
              ? p.process_code.toLowerCase().replace(/[^a-z0-9]/g, '_') 
              : `proc_${p.id || idx + 1}`;
            return {
              id: p.id || idx + 1,
              sequence: p.sequence || idx + 1,
              key: shortKey,
              code: p.process_code || `PROC-${idx + 1}`,
              name: `${idx + 1}. ${p.process_name}`,
              full_name: p.process_name,
              color: pal.color,
              bg: pal.bg,
              text: pal.text,
              border: pal.border,
            };
          });

          setStages(currentStages);
        }
      } catch (err) {
        console.warn('Could not load dynamic route stages:', err);
      } finally {
        loadSKUData(currentStages);
      }
    }

    loadDynamicConfiguration();
  }, []);

  // Build STAGES_FLOW for Handoff Modal
  const dynamicStagesFlow = useMemo(() => {
    return stages.map((stg, i) => {
      const nextStg = stages[i + 1];
      return {
        key: stg.key,
        name: stg.full_name,
        nextKey: nextStg ? nextStg.key : 'ready',
        nextName: nextStg ? nextStg.full_name : 'Ready FG Stock',
      };
    });
  }, [stages]);

  // New row form state
  const [newRowForm, setNewRowForm] = useState({
    casting_date: new Date().toLocaleDateString('en-GB'),
    batch_no: '',
    cat_no: '',
    item_name: '',
    qty_recd_casting: 100,
    avg_weight: 0.350
  });

  // Helper to parse date into timestamp for sorting
  const parseBatchTimestamp = (d) => {
    if (!d) return 0;
    const str = String(d).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return new Date(str).getTime() || 0;
    const parts = str.split(/[\/\-]/);
    if (parts.length === 3) {
      let [d1, m1, y1] = parts;
      if (y1 && y1.length === 2) y1 = '20' + y1;
      if (d1 && d1.length === 4) {
        return new Date(`${d1}-${m1.padStart(2, '0')}-${y1.padStart(2, '0')}`).getTime() || 0;
      }
      return new Date(`${y1}-${m1.padStart(2, '0')}-${d1.padStart(2, '0')}`).getTime() || 0;
    }
    return new Date(str).getTime() || 0;
  };

  // Helper to extract numeric suffix from batch number for sorting
  const extractBatchNumber = (item) => {
    if (item.release_id) return Number(item.release_id);
    if (item.planning_id) return Number(item.planning_id);
    const m = String(item.batch_no || '').match(/\d+/g);
    if (m && m.length > 0) return parseInt(m[m.length - 1], 10);
    return typeof item.id === 'number' ? item.id : 0;
  };

  // Filtered and Sorted dataset:
  // 1. Pending / Active WIP batches on TOP (priority)
  // 2. Completed / Converted to Ready FG batches at BOTTOM
  // 3. Within each group: Descending by date, then batch number
  const filteredData = useMemo(() => {
    const matched = data.filter((item) => {
      const matchSearch =
        item.item_name?.toLowerCase().includes(search.toLowerCase()) ||
        item.batch_no?.toLowerCase().includes(search.toLowerCase()) ||
        item.cat_no?.toLowerCase().includes(search.toLowerCase());

      if (!matchSearch) return false;

      // Status Filter
      const completed = isBatchCompleted(item, stages);
      if (statusFilter === 'PENDING' && completed) return false;
      if (statusFilter === 'COMPLETED' && !completed) return false;

      // Date Range filter
      if (dateRange.from || dateRange.to) {
        const itemDateStr = item.casting_date;
        if (!itemDateStr) return true;
        let itemMs = null;
        if (/^\d{4}-\d{2}-\d{2}/.test(itemDateStr)) {
          itemMs = new Date(itemDateStr).getTime();
        } else {
          const p = itemDateStr.split(/[\/\-]/);
          if (p.length === 3) {
            let [d, m, y] = p;
            if (y.length === 2) y = '20' + y;
            itemMs = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`).getTime();
          }
        }
        if (itemMs) {
          if (dateRange.from && itemMs < new Date(dateRange.from).getTime()) return false;
          if (dateRange.to && itemMs > new Date(dateRange.to).getTime() + 86400000) return false;
        }
      }

      return true;
    });

    return matched.slice().sort((a, b) => {
      const aDone = isBatchCompleted(a, stages);
      const bDone = isBatchCompleted(b, stages);

      // Primary: Active/Pending work (false) comes first (-1), Completed (true) sinks to bottom (+1)
      if (aDone !== bDone) {
        return aDone ? 1 : -1;
      }

      // Secondary: Descending by casting / production date (newest work on top)
      const timeA = parseBatchTimestamp(a.casting_date);
      const timeB = parseBatchTimestamp(b.casting_date);
      if (timeB !== timeA) {
        return timeB - timeA;
      }

      // Tertiary: Descending by batch numeric ID
      const numA = extractBatchNumber(a);
      const numB = extractBatchNumber(b);
      if (numB !== numA) {
        return numB - numA;
      }

      // Quaternary: Batch string descending
      const strA = String(a.batch_no || a.id || '');
      const strB = String(b.batch_no || b.id || '');
      return strB.localeCompare(strA, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [data, search, dateRange, statusFilter, stages]);

  // Aggregate Metrics & Category Counts
  const { metrics, pendingCount, completedCount } = useMemo(() => {
    let totalCasting = 0;
    let totalReady = 0;
    let totalRejection = 0;
    let totalScrapWeight = 0;
    let pCount = 0;
    let cCount = 0;

    data.forEach((r) => {
      totalCasting += Number(r.qty_recd_casting || 0);
      totalReady += Number(r.ready?.stock_qty || 0);
      const rej = Number(r.ready?.total_rejection || 0);
      totalRejection += rej;
      totalScrapWeight += rej * Number(r.avg_weight || 0.35);

      if (isBatchCompleted(r, stages)) {
        cCount++;
      } else {
        pCount++;
      }
    });

    const rejPercent = totalCasting > 0 ? ((totalRejection / totalCasting) * 100).toFixed(1) : 0;

    return {
      metrics: {
        totalCasting,
        totalReady,
        totalRejection,
        rejPercent,
        totalScrapWeight: totalScrapWeight.toFixed(2),
        activeBatches: data.length
      },
      pendingCount: pCount,
      completedCount: cCount
    };
  }, [data, stages]);

  // Trigger Stage Handoff
  const handleOpenHandoff = (row, stageKey) => {
    const isCompleted = 
      row.ready?.status === 'Ready FG' || 
      row.ready?.status === 'Completed' || 
      (Number(row.ready?.stock_qty || 0) > 0 && row.ready?.status !== 'In Production');

    if (isCompleted) {
      warning(`Batch #${row.batch_no} is already completed and in Ready FG Stock.`);
      return;
    }
    setHandoffRow(row);
    setHandoffStageKey(stageKey);
    setHandoffModalOpen(true);
  };

  // Handle stage handoff confirmation
  const handleConfirmHandoff = async ({ rowId, stageKey, nextStageKey, goodQty, rejQty, rejReason, disposition, reworkStage, operatorName, remarks, scrapWeightKg, warehouseId }) => {
    const targetRow = data.find((item) => item.id === rowId) || handoffRow;

    // If handing off to Ready FG Stock, trigger the backend API to deposit to central Finished Goods Stock
    if (nextStageKey === 'ready' && targetRow) {
      try {
        const res = await api.production.completeBatchToFG({
          batch_no: targetRow.batch_no,
          cat_no: targetRow.cat_no,
          item_name: targetRow.item_name,
          fg_id: targetRow.fg_id,
          good_quantity: Number(goodQty),
          rejected_quantity: Number(rejQty),
          warehouse_id: warehouseId,
          operator: operatorName,
          remarks: remarks || `Final handoff from ${stageKey} to Ready FG Stock`
        });

        if (res?.data?.new_stock !== undefined) {
          success(`🎉 Batch #${targetRow.batch_no} sent to Ready FG Stock! Live Finished Goods Stock: ${res.data.new_stock} PCS`);
        } else {
          success(`🎉 Batch #${targetRow.batch_no} sent to Ready FG Stock!`);
        }
      } catch (apiErr) {
        console.error('Failed to update Finished Goods inventory in DB:', apiErr);
        warning(`Batch moved to Ready FG locally, but inventory update failed: ${apiErr.message}`);
      }
    } else {
      const dispText = disposition === 'REWORK' ? `Stage Rework (${reworkStage})` : `Foundry Recast (${scrapWeightKg} kg Scrap)`;
      success(`Forwarded ${goodQty} PCS to next stage! (${rejQty} PCS logged as ${dispText})`);
    }

    setData((prev) => {
      const nextData = prev.map((item) => {
        if (item.id !== rowId) return item;
        const updated = JSON.parse(JSON.stringify(item));
        const todayStr = new Date().toLocaleDateString('en-GB');

        if (!updated.stages) updated.stages = {};

        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

        // Update source stage
        if (!updated.stages[stageKey]) updated.stages[stageKey] = { prod_qty: 0, rejection: 0, bal: 0, date: todayStr };
        updated.stages[stageKey].prod_qty = goodQty;
        updated.stages[stageKey].rejection = (updated.stages[stageKey].rejection || 0) + rejQty;
        updated.stages[stageKey].out_date = todayStr;
        updated.stages[stageKey].out_time = timeStr;
        updated.stages[stageKey].rejection_reason = rejReason;
        updated.stages[stageKey].disposition = disposition;
        updated.stages[stageKey].operator = operatorName;
        updated.stages[stageKey].scrap_weight = scrapWeightKg;
        updated.stages[stageKey].next_stage = nextStageKey === 'ready' ? 'Ready FG Stock' : (stages.find(s => s.key === nextStageKey)?.full_name || nextStageKey);

        // Forward to next stage
        if (nextStageKey === 'ready') {
          if (!updated.ready) updated.ready = {};
          updated.ready.stock_qty = goodQty;
          updated.ready.date_form = todayStr;
          updated.ready.time_form = timeStr;
          updated.ready.status = 'Ready FG';
          updated.ready.stock_synced = true;
        } else {
          if (!updated.stages[nextStageKey]) updated.stages[nextStageKey] = { prod_qty: goodQty, rejection: 0, bal: goodQty, date: todayStr };
          else {
            updated.stages[nextStageKey].prod_qty = goodQty;
            updated.stages[nextStageKey].date = todayStr;
          }
          updated.stages[nextStageKey].in_date = todayStr;
          updated.stages[nextStageKey].in_time = timeStr;
        }

        // Calculate total rejections across dynamic stages
        let totalRej = 0;
        Object.values(updated.stages).forEach((stg) => {
          totalRej += Number(stg.rejection || 0);
        });

        if (!updated.ready) updated.ready = {};
        updated.ready.total_rejection = totalRej;

        return updated;
      });
      saveBatchesToStorage(nextData);
      return nextData;
    });
  };

  // Trigger Full Kitting Modal (Upfront RM Deduction)
  const handleOpenKitting = (row) => {
    setKittingBatch({
      batch_no: row.batch_no?.replace(/^#/, ''),
      fg_id: row.fg_id,
      cat_no: row.cat_no,
      item_name: row.item_name,
      quantity: Number(row.qty_recd_casting || 100),
      release_id: row.release_id
    });
    setIsKittingModalOpen(true);
  };

  // After successful RM deduction
  const handleKittingSuccess = (result) => {
    setData((prev) => {
      const targetBatch = result?.batch_no || kittingBatch?.batch_no;
      const next = prev.map((item) => {
        const cleanNo = item.batch_no?.replace(/^#/, '');
        if (cleanNo === targetBatch || item.batch_no === targetBatch) {
          return { ...item, rm_deducted: true };
        }
        return item;
      });
      saveBatchesToStorage(next);
      return next;
    });
  };

  // Handle open edit
  const openEdit = (row) => {
    setSelectedRow(row);
    setEditForm(JSON.parse(JSON.stringify(row)));
    setEditModalOpen(true);
  };

  // Save edit
  const saveEdit = () => {
    if (!editForm) return;

    let totalRej = 0;
    if (editForm.stages) {
      Object.values(editForm.stages).forEach((s) => {
        totalRej += Number(s.rejection || 0);
      });
    }

    const updated = {
      ...editForm,
      ready: {
        ...editForm.ready,
        total_rejection: totalRej
      }
    };

    setData((prev) => {
      const nextData = prev.map((item) => (item.id === updated.id ? updated : item));
      saveBatchesToStorage(nextData);
      return nextData;
    });
    setEditModalOpen(false);
  };

  // Add new row
  const handleAddNewRow = (e) => {
    e.preventDefault();
    if (!newRowForm.item_name || !newRowForm.batch_no) return;

    const newId = Date.now();
    const qty = Number(newRowForm.qty_recd_casting || 0);
    const avgW = Number(newRowForm.avg_weight || 0.35);

    // Initial stage entries for all configured dynamic stages
    const initialStages = {};
    stages.forEach((stg, idx) => {
      initialStages[stg.key] = {
        prod_qty: idx === 0 ? qty : 0,
        rejection: 0,
        bal: idx === 0 ? qty : 0,
        date: idx === 0 ? newRowForm.casting_date : ''
      };
    });

    const newEntry = {
      id: newId,
      casting_date: newRowForm.casting_date,
      batch_no: newRowForm.batch_no,
      cat_no: newRowForm.cat_no || newRowForm.batch_no,
      item_name: newRowForm.item_name.toUpperCase(),
      qty_recd_casting: qty,
      avg_weight: avgW,
      stages: initialStages,
      ready: { date_form: '', stock_qty: 0, total_rejection: 0, status: 'In Production' }
    };

    setData((prev) => {
      const nextData = [newEntry, ...prev];
      saveBatchesToStorage(nextData);
      return nextData;
    });
    setNewRowModalOpen(false);
    setNewRowForm({
      casting_date: new Date().toLocaleDateString('en-GB'),
      batch_no: '',
      cat_no: '',
      item_name: '',
      qty_recd_casting: 100,
      avg_weight: 0.350
    });
  };

  // Export to CSV
  const exportToCSV = () => {
    const stageHeaders = stages.flatMap((s) => [
      `${s.full_name} Prod Qty`,
      `${s.full_name} Rejection`,
      `${s.full_name} Bal`
    ]);

    const initialStageName = stages[0]?.full_name || 'Casting';
    const headers = [
      `Date of ${initialStageName}`,
      'Batch No',
      'Cat No',
      'Item Name',
      `Qty Recd ${initialStageName}`,
      'Avg Weight (Kg)',
      ...stageHeaders,
      'Ready Stock Qty',
      'Total Rejection',
      'Status'
    ];

    const rows = filteredData.map((r) => {
      const stageCols = stages.flatMap((s) => {
        const stgData = r.stages?.[s.key] || {};
        return [stgData.prod_qty || 0, stgData.rejection || 0, stgData.bal || 0];
      });

      return [
        r.casting_date,
        r.batch_no,
        r.cat_no,
        `"${r.item_name}"`,
        r.qty_recd_casting,
        r.avg_weight,
        ...stageCols,
        r.ready?.stock_qty || 0,
        r.ready?.total_rejection || 0,
        r.ready?.status || 'In Production'
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    triggerDownload(csvContent, `Bharat_Impex_SKU_Tracking_Sheet_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // Filter column visibility
  const isStageVisible = (stageKey) => {
    if (selectedStageFilter === 'ALL') return true;
    return selectedStageFilter === stageKey;
  };

  return (
    <div className="space-y-5 pb-16">
      {/* Top Headline Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-900 shadow-xs">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  SKU Tracking
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                  {stages.length} CONFIGURED STAGES
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Dynamic Manufacturing Route: {stages.map((s) => s.full_name).join(' → ')} → Ready FG
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              loadSKUData(stages);
              success('Synced released production batches!');
            }}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 shadow-xs transition-colors cursor-pointer disabled:opacity-60"
            title="Sync released plans from Production Planning"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Planning</span>
          </button>

          <button
            onClick={() => setNewRowModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Icon name="plus" size="sm" ariaHidden={true} />
            <span>New SKU Batch</span>
          </button>

          <button
            onClick={exportToCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export CSV</span>
          </button>

          {/* View toggle for mobile/desktop */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('sheet')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'sheet'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sheet Grid
            </button>
            <button
              onClick={() => setActiveTab('mobile_cards')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'mobile_cards'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mobile Cards
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1 flex-wrap sm:flex-nowrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search SKU item name, Cat No, or Batch No (e.g. Seltos, Britney, 305)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>
        </div>

        {/* Priority Status Tabs: Pending / Converted to FG */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Show all batches (Active WIP prioritized at top, Completed at bottom)"
          >
            <span>All Batches</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              statusFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {data.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('PENDING')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === 'PENDING'
                ? 'bg-amber-500 text-white shadow-xs font-bold'
                : 'text-amber-800 hover:text-amber-950 hover:bg-amber-100/60'
            }`}
            title="Show only active work in progress"
          >
            <span>⚡ Active WIP</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              statusFilter === 'PENDING' ? 'bg-white text-amber-900' : 'bg-amber-100 text-amber-900'
            }`}>
              {pendingCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('COMPLETED')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === 'COMPLETED'
                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                : 'text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100/60'
            }`}
            title="Show only completed batches deposited in Ready FG Stock"
          >
            <span>✅ Converted FG</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              statusFilter === 'COMPLETED' ? 'bg-white text-emerald-900' : 'bg-emerald-100 text-emerald-900'
            }`}>
              {completedCount}
            </span>
          </button>
        </div>

        {/* Dynamic Stage Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedStageFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedStageFilter === 'ALL'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Stages
          </button>

          {stages.map((stg) => (
            <button
              key={stg.key}
              onClick={() => setSelectedStageFilter(stg.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedStageFilter === stg.key
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {stg.name}
            </button>
          ))}

          <button
            onClick={() => setSelectedStageFilter('ready')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedStageFilter === 'ready'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Ready FG
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'sheet' ? (
        /* DYNAMIC SHEET GRID */
        <div className="bg-white border border-slate-300 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto max-h-[680px]">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead>
                {/* Main Top Header Group */}
                <tr className="bg-slate-200 text-slate-900 uppercase font-black text-center text-[11px] border-b border-slate-300">
                  <th colSpan="5" className="p-2 border-r-2 border-slate-400 bg-slate-300/80 text-slate-900 uppercase tracking-wider">
                    SKU Item Master Details
                  </th>

                  {/* Dynamically Render Stage Headers */}
                  {stages.map((stg, idx) => {
                    if (!isStageVisible(stg.key)) return null;
                    return (
                      <th
                        key={stg.key}
                        colSpan="3"
                        className={`p-2 border-r-2 border-slate-400 ${stg.bg} ${stg.text} uppercase tracking-wider text-[10px] font-black`}
                      >
                        Stage {idx + 1}: {stg.full_name}
                      </th>
                    );
                  })}

                  {(selectedStageFilter === 'ALL' || selectedStageFilter === 'ready') && (
                    <th colSpan="3" className="p-2 border-r border-emerald-200 bg-emerald-200/70 text-emerald-950 uppercase tracking-wider text-[10px]">
                      Ready Item (FG)
                    </th>
                  )}

                  <th colSpan="1" className="p-2 bg-slate-200/80 text-slate-900 text-center uppercase tracking-wider text-[10px]">
                    Action
                  </th>
                </tr>

                {/* Sub Headers */}
                <tr className="bg-slate-100 text-slate-700 text-[10px] uppercase font-bold sticky top-0 z-20 shadow-xs border-b border-slate-300">
                  <th className="p-2 bg-slate-200/80 min-w-[70px]">Date</th>
                  <th className="p-2 bg-slate-200/80 min-w-[125px] whitespace-nowrap">Batch No.</th>
                  <th className="p-2 bg-slate-200/80 min-w-[200px]">Cat No. + Item Name</th>
                  <th className="p-2 bg-slate-200/80 text-right min-w-[65px]">Recd Qty</th>
                  <th className="p-2 bg-slate-200/80 text-right min-w-[60px] border-r-2 border-slate-400">Avg Wt</th>

                  {/* Dynamic Sub-Headers for each stage */}
                  {stages.map((stg) => {
                    if (!isStageVisible(stg.key)) return null;
                    return (
                      <React.Fragment key={stg.key}>
                        <th className={`p-2 ${stg.bg} ${stg.text} text-right min-w-[60px]`}>Prod Qty</th>
                        <th className={`p-2 ${stg.bg} text-rose-700 text-right min-w-[55px]`}>Rejection</th>
                        <th className={`p-2 ${stg.bg} ${stg.text} text-right min-w-[55px] border-r-2 border-slate-400`}>Bal</th>
                      </React.Fragment>
                    );
                  })}

                  {(selectedStageFilter === 'ALL' || selectedStageFilter === 'ready') && (
                    <>
                      <th className="p-2 bg-green-100 text-green-900 text-right min-w-[65px]">Stock Qty</th>
                      <th className="p-2 bg-rose-50 text-rose-800 text-right min-w-[65px]">Total Rej</th>
                      <th className="p-2 bg-slate-100 text-slate-800 text-center min-w-[110px] whitespace-nowrap border-r-2 border-slate-400">Status</th>
                    </>
                  )}

                  <th className="p-2 bg-slate-100 text-slate-800 text-center min-w-[60px]">Action</th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-slate-200 font-medium">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={25} className="p-8 text-center text-slate-400 text-xs">
                      No matching SKU production batches in pipeline. Click "+ New SKU Batch" to start.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((row, idx) => {
                    const isRowCompleted = isBatchCompleted(row, stages);
                    const prevRow = idx > 0 ? filteredData[idx - 1] : null;
                    const isFirstCompleted = isRowCompleted && (!prevRow || !isBatchCompleted(prevRow, stages));

                    return (
                      <React.Fragment key={row.id}>
                        {isFirstCompleted && statusFilter === 'ALL' && pendingCount > 0 && (
                          <tr key="completed-divider" className="bg-slate-100/90 border-y-2 border-slate-300">
                            <td colSpan={25} className="py-2.5 px-3 bg-slate-100">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-emerald-100 border border-emerald-300 text-emerald-700">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  </span>
                                  <span className="text-xs font-black text-slate-800 tracking-wide uppercase">
                                    Completed Production Batches (Converted to Finished Goods Stock)
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    {completedCount} Completed
                                  </span>
                                </div>
                                <span className="text-[11px] font-medium text-slate-500 hidden sm:inline">
                                  Sorted to bottom automatically • Accessible via Search
                                </span>
                              </div>
                            </td>
                          </tr>
                        )}
                        <tr
                          className={`transition-colors group text-[11px] ${
                            isRowCompleted ? 'bg-slate-50/50 hover:bg-emerald-50/40 text-slate-700' : 'hover:bg-blue-50/60'
                          }`}
                        >
                      {/* Item Identification */}
                      <td className="p-2 text-slate-600 whitespace-nowrap bg-slate-50/50">{row.casting_date}</td>
                      <td className="p-2 font-bold text-blue-700 bg-slate-50/50 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <span>{row.batch_no?.startsWith('#') ? row.batch_no : `#${row.batch_no}`}</span>
                          {row.rm_deducted ? (
                            <span
                              onClick={() => handleOpenKitting(row)}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer shadow-2xs"
                              title="Child Parts deducted upfront from store. Click to view BOM breakdown."
                            >
                              <Check className="w-2.5 h-2.5" />
                              <span>RM Kitted</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenKitting(row)}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 transition-colors cursor-pointer shadow-2xs"
                              title="Child Parts not yet deducted. Click for Full Kitting & upfront deduction."
                            >
                              <Boxes className="w-2.5 h-2.5 text-amber-600" />
                              <span>Full Kitting</span>
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="p-2 font-bold text-slate-900 min-w-[200px] leading-tight">
                        {row.item_name}
                      </td>
                      <td className="p-2 text-right font-semibold text-slate-900 bg-slate-50/30">
                        {row.qty_recd_casting}
                      </td>
                      <td className="p-2 text-right text-slate-600 bg-slate-50/30 border-r-2 border-slate-300">
                        {Number(row.avg_weight || 0.35).toFixed(3)}
                      </td>

                      {/* Dynamic Stage Cells */}
                      {stages.map((stg, idx) => {
                        if (!isStageVisible(stg.key)) return null;
                        const stgData = row.stages?.[stg.key] || {};
                        const prodQty = stgData.prod_qty || 0;
                        const rejQty = stgData.rejection || 0;
                        const balQty = stgData.bal || 0;

                        return (
                          <React.Fragment key={stg.key}>
                            <td
                              className="p-2 text-right font-semibold text-slate-800 bg-slate-50/20 select-none"
                            >
                              {prodQty}
                            </td>
                            <td
                              className={`p-2 text-right select-none ${rejQty > 0 ? 'bg-rose-100 text-rose-800 font-bold' : 'text-slate-400'}`}
                            >
                              {rejQty}
                            </td>
                            <td
                              className="p-2 text-right text-slate-500 bg-slate-50/20 border-r-2 border-slate-300 select-none"
                            >
                              {balQty}
                            </td>
                          </React.Fragment>
                        );
                      })}

                      {(selectedStageFilter === 'ALL' || selectedStageFilter === 'ready') && (
                        <>
                          <td className="p-2 text-right font-bold text-emerald-700 bg-emerald-100/60">
                            {row.ready?.stock_qty || 0}
                          </td>
                          <td className={`p-2 text-right font-bold ${(row.ready?.total_rejection || 0) > 0 ? 'bg-rose-100 text-rose-700' : 'text-slate-600'}`}>
                            {row.ready?.total_rejection || 0}
                          </td>
                          <td className="p-2 text-center border-r-2 border-slate-300 whitespace-nowrap">
                            <span className="inline-block whitespace-nowrap px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              {row.ready?.status || 'In Production'}
                            </span>
                          </td>
                        </>
                      )}

                      {/* Action */}
                      <td className="p-2 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {(() => {
                            const isCompleted = 
                              row.ready?.status === 'Ready FG' || 
                              row.ready?.status === 'Completed' || 
                              (Number(row.ready?.stock_qty || 0) > 0 && row.ready?.status !== 'In Production');

                            if (isCompleted) {
                              return (
                                <span 
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold shadow-xs select-none"
                                  title="Batch fully processed and deposited in Ready FG Stock"
                                >
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span>Ready in FG</span>
                                </span>
                              );
                            }

                            return (
                              <button
                                onClick={() => {
                                  // Find the furthest stage in the pipeline that currently has quantity
                                  let currentActive = stages[0];
                                  for (let i = stages.length - 1; i >= 0; i--) {
                                    if (Number(row.stages?.[stages[i].key]?.prod_qty || 0) > 0) {
                                      currentActive = stages[i];
                                      break;
                                    }
                                  }
                                  handleOpenHandoff(row, currentActive.key);
                                }}
                                className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer whitespace-nowrap"
                                title="Send to Next Process Stage"
                              >
                                <span>Send Next</span>
                                <ArrowRight className="w-2.5 h-2.5" />
                              </button>
                            );
                          })()}
                          <button
                            onClick={() => openEdit(row)}
                            className="p-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-900 hover:text-white transition-colors cursor-pointer"
                            title="Edit Stage Data"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })
            )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* MOBILE CARDS VIEW (Dynamic Stepper) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredData.map((row, idx) => {
            const isRowCompleted = isBatchCompleted(row, stages);
            const prevRow = idx > 0 ? filteredData[idx - 1] : null;
            const isFirstCompleted = isRowCompleted && (!prevRow || !isBatchCompleted(prevRow, stages));

            return (
              <React.Fragment key={row.id}>
                {isFirstCompleted && statusFilter === 'ALL' && pendingCount > 0 && (
                  <div className="col-span-full py-2.5 px-3.5 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Completed Batches (In Ready FG Stock)</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {completedCount}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-normal">Sorted to bottom</span>
                  </div>
                )}
                <div
                  className={`border rounded-2xl p-4 shadow-xs space-y-3 ${
                    isRowCompleted ? 'bg-slate-50/80 border-slate-200' : 'bg-white border-slate-200'
                  }`}
                >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                    BATCH #{row.batch_no} • {row.casting_date}
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm mt-1 leading-snug">{row.item_name}</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  {(() => {
                    const isCompleted = 
                      row.ready?.status === 'Ready FG' || 
                      row.ready?.status === 'Completed' || 
                      (Number(row.ready?.stock_qty || 0) > 0 && row.ready?.status !== 'In Production');

                    if (isCompleted) {
                      return (
                        <span 
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold shadow-xs select-none"
                          title="Batch fully processed and deposited in Ready FG Stock"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Ready in FG</span>
                        </span>
                      );
                    }

                    return (
                      <button
                        onClick={() => {
                          const currentActive = stages.find((s) => (row.stages?.[s.key]?.prod_qty || 0) > 0) || stages[0];
                          handleOpenHandoff(row, currentActive.key);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <span>Send Next</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    );
                  })()}
                  <button
                    onClick={() => openEdit(row)}
                    className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs transition-colors cursor-pointer"
                    title="Manual Edit"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Dynamic Progress Stepper Bar */}
              <div className={`grid gap-1 text-center py-1 bg-slate-50 rounded-xl p-2 border border-slate-100 text-[10px] ${
                stages.length <= 4 ? 'grid-cols-4' : 'grid-cols-5'
              }`}>
                {stages.map((stg) => {
                  const stgData = row.stages?.[stg.key] || {};
                  return (
                    <button
                      key={stg.key}
                      type="button"
                      onClick={() => handleOpenHandoff(row, stg.key)}
                      className={`${stg.bg} hover:opacity-80 ${stg.text} rounded p-1 font-semibold transition-colors cursor-pointer text-center`}
                      title={`Click to Send ${stg.full_name}`}
                    >
                      <div className="text-[9px] truncate">{stg.name}</div>
                      <div className="text-xs font-bold">{stgData.prod_qty || 0}</div>
                    </button>
                  );
                })}
              </div>

              {/* Summary Stats */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 text-slate-600">
                <span>Weight: <strong className="text-slate-900">{Number(row.avg_weight || 0.35).toFixed(3)} kg</strong></span>
                <span>Total Rejection: <strong className="text-rose-600">{row.ready?.total_rejection || 0} pcs</strong></span>
                <span>Ready Stock: <strong className="text-emerald-700">{row.ready?.stock_qty || 0} pcs</strong></span>
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
      )}

      {/* QUICK STAGE EDIT MODAL */}
      {editModalOpen && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                  Quick Stage Update • Batch #{editForm.batch_no}
                </span>
                <h3 className="font-bold text-slate-900 text-base leading-snug">{editForm.item_name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                aria-label="Close"
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Icon name="close" size="lg" ariaHidden={true} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {stages.map((stg) => {
                const stgData = editForm.stages?.[stg.key] || {};
                return (
                  <div key={stg.key} className={`p-3 rounded-xl border ${stg.border} ${stg.bg} space-y-2`}>
                    <p className={`font-bold ${stg.text}`}>{stg.full_name}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-600 text-[11px] block">Prod Quantity</label>
                        <input
                          type="number"
                          value={stgData.prod_qty || 0}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setEditForm({
                              ...editForm,
                              stages: {
                                ...editForm.stages,
                                [stg.key]: { ...(editForm.stages?.[stg.key] || {}), prod_qty: val }
                              }
                            });
                          }}
                          className="w-full p-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-rose-700 text-[11px] block">Rejection</label>
                        <input
                          type="number"
                          value={stgData.rejection || 0}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setEditForm({
                              ...editForm,
                              stages: {
                                ...editForm.stages,
                                [stg.key]: { ...(editForm.stages?.[stg.key] || {}), rejection: val }
                              }
                            });
                          }}
                          className="w-full p-1.5 rounded-lg border border-slate-300 bg-white text-rose-700 font-bold"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW SKU BATCH MODAL */}
      {newRowModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Add New SKU Production Batch</h3>
              <button
                type="button"
                onClick={() => setNewRowModalOpen(false)}
                aria-label="Close"
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Icon name="close" size="lg" ariaHidden={true} />
              </button>
            </div>

            <form onSubmit={handleAddNewRow} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Select Finished Good (FG Model) to Manufacture *
                </label>
                <select
                  onChange={(e) => {
                    const selId = e.target.value;
                    const selected = finishedGoods.find((f) => String(f.id) === String(selId));
                    if (selected) {
                      setNewRowForm({
                        ...newRowForm,
                        item_name: selected.product_name,
                        cat_no: selected.fg_code,
                        batch_no: newRowForm.batch_no || String(Math.floor(100 + Math.random() * 900)),
                      });
                    }
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold text-xs focus:ring-2 focus:ring-blue-600 mb-2 cursor-pointer"
                >
                  <option value="">-- Choose from Registered Finished Goods --</option>
                  {finishedGoods.map((fg) => (
                    <option key={fg.id} value={fg.id}>
                      [{fg.fg_code}] {fg.product_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">SKU Item Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CASTED BIB COCK 1/2&quot; BODY, SELTOS"
                  value={newRowForm.item_name}
                  onChange={(e) => setNewRowForm({ ...newRowForm, item_name: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Cat No / FG Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 305 or FG-000004"
                    value={newRowForm.cat_no}
                    onChange={(e) => setNewRowForm({ ...newRowForm, cat_no: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Batch No *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 520"
                    value={newRowForm.batch_no}
                    onChange={(e) => setNewRowForm({ ...newRowForm, batch_no: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-bold text-blue-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    {stages[0]?.full_name || 'Stage 1'} Recd Qty
                  </label>
                  <input
                    type="number"
                    value={newRowForm.qty_recd_casting}
                    onChange={(e) => setNewRowForm({ ...newRowForm, qty_recd_casting: Number(e.target.value) })}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Avg Weight (Kg)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={newRowForm.avg_weight}
                    onChange={(e) => setNewRowForm({ ...newRowForm, avg_weight: Number(e.target.value) })}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setNewRowModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-xs cursor-pointer"
                >
                  Insert into Pipeline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* STAGE HANDOFF MODAL WITH DYNAMIC FLOW & REJECTION LOGGING */}
      <StageHandoffModal
        isOpen={handoffModalOpen}
        onClose={() => setHandoffModalOpen(false)}
        row={handoffRow}
        stageKey={handoffStageKey}
        stagesFlow={dynamicStagesFlow}
        onConfirm={handleConfirmHandoff}
      />

      {/* FULL KITTING (UPFRONT RM DEDUCTION) MODAL */}
      <FullKittingModal
        isOpen={isKittingModalOpen}
        onClose={() => setIsKittingModalOpen(false)}
        batch={kittingBatch}
        onSuccess={handleKittingSuccess}
      />
    </div>
  );
}

export default SKUTrackingSheet;
