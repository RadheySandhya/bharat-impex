import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeftRight,
  Plus, 
  Trash2, 
  Save, 
  Search, 
  Filter, 
  RefreshCw, 
  CheckCircle2, 
  Copy, 
  FileSpreadsheet, 
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  Users,
  Upload,
  Calendar,
  AlertTriangle,
  Building2,
  FileText,
  DollarSign,
  Package
} from 'lucide-react';
import Icon from '../../components/UI/Icon';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Purchase } from '../Purchase/Purchase';
import { Sales } from '../Sales/Sales';

export function InOut() {
  const [activeMainTab, setActiveMainTab] = useState('sheet'); // 'sheet', 'history', 'parties', 'tally_csv'
  const [csvSubTab, setCsvSubTab] = useState('purchase'); // 'purchase', 'sales'

  // Master Data
  const [parties, setParties] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [finishedGoods, setFinishedGoods] = useState([]);
  const [subSkus, setSubSkus] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Spreadsheet Rows State
  const [rows, setRows] = useState([]);

  // Filters for Sheet and History
  const [sheetSearch, setSheetSearch] = useState('');
  const [sheetTypeFilter, setSheetTypeFilter] = useState('ALL'); // 'ALL', 'IN', 'OUT'

  // History Tab States
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState('ALL');

  // Party Master Modal State
  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [newPartyForm, setNewPartyForm] = useState({
    party_name: '',
    party_type: 'BOTH',
    phone: '',
    email: '',
    gstin: '',
    address: ''
  });

  const { success, error, warning } = useToast();

  // Load all items & parties
  const loadMasterData = async () => {
    setLoading(true);
    try {
      const [itemsRes, partiesRes] = await Promise.all([
        api.inOut.getItems(),
        api.inOut.getParties('ALL')
      ]);

      const rms = itemsRes?.data?.raw_materials || [];
      const fgs = itemsRes?.data?.finished_goods || [];
      const sSkus = itemsRes?.data?.sub_skus || [];
      const all = itemsRes?.data?.all_items || [...rms, ...fgs];
      const pList = partiesRes?.data || [];

      setRawMaterials(rms);
      setFinishedGoods(fgs);
      setSubSkus(sSkus);
      setAllItems(all);
      setParties(pList);

      // Initialize with default 5 blank/sample rows if sheet is empty
      if (rows.length === 0) {
        const today = new Date().toISOString().split('T')[0];
        const defaultParty = pList[0]?.party_name || '';
        const initialRows = [
          createBlankRow('IN', defaultParty, rms[0] || null, today),
          createBlankRow('IN', defaultParty, rms[1] || null, today),
          createBlankRow('OUT', pList[1]?.party_name || defaultParty, fgs[0] || null, today),
          createBlankRow('OUT', pList[1]?.party_name || defaultParty, fgs[1] || null, today),
        ];
        setRows(initialRows);
      }
      setIsDirty(false);
    } catch (err) {
      error('Failed to load In/Out master data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMasterData();
  }, []);

  // Helper: create a new sheet row
  const createBlankRow = (type = 'IN', defaultParty = '', defaultItem = null, defaultDate = null) => {
    const today = defaultDate || new Date().toISOString().split('T')[0];
    const matType = type === 'IN' ? 'RM' : 'FG';
    const item = defaultItem || (matType === 'RM' ? rawMaterials[0] : finishedGoods[0]);

    return {
      row_id: `row_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: type, // 'IN' or 'OUT'
      party_name: defaultParty,
      material_type: matType, // 'RM' or 'FG'
      item_id: item ? item.id : '',
      item_name: item ? item.item_name : '',
      item_code: item ? item.item_code : '',
      unit_code: item ? item.unit_code : 'PCS',
      current_stock: item ? (parseFloat(item.current_stock) || 0) : 0,
      quantity: 1,
      rate: item ? (parseFloat(item.default_rate) || 0) : 0,
      date: today,
      invoice_number: '',
      remarks: ''
    };
  };

  // Add 1 Row
  const handleAddRow = (type = 'IN') => {
    const today = new Date().toISOString().split('T')[0];
    const defaultParty = parties[0]?.party_name || '';
    const newRow = createBlankRow(type, defaultParty, null, today);
    setRows(prev => [...prev, newRow]);
    setIsDirty(true);
  };

  // Add Multiple Rows
  const handleAddMultipleRows = (count = 5, type = 'IN') => {
    const today = new Date().toISOString().split('T')[0];
    const defaultParty = parties[0]?.party_name || '';
    const newItems = Array.from({ length: count }, () => createBlankRow(type, defaultParty, null, today));
    setRows(prev => [...prev, ...newItems]);
    setIsDirty(true);
  };

  // Duplicate Row
  const handleDuplicateRow = (index) => {
    const source = rows[index];
    const clone = {
      ...source,
      row_id: `row_dup_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      invoice_number: source.invoice_number ? `${source.invoice_number}-copy` : ''
    };
    const next = [...rows];
    next.splice(index + 1, 0, clone);
    setRows(next);
    setIsDirty(true);
    success('Row duplicated successfully.');
  };

  // Delete Row
  const handleDeleteRow = (index) => {
    if (rows.length <= 1) {
      warning('At least 1 row must remain in the spreadsheet.');
      return;
    }
    const next = rows.filter((_, idx) => idx !== index);
    setRows(next);
    setIsDirty(true);
  };

  // Update specific row cell
  const handleCellChange = (index, field, value) => {
    setRows(prev => {
      const next = [...prev];
      const row = { ...next[index] };

      if (field === 'type') {
        row.type = value;
        // Adjust default material type when transaction type toggles
        const newMatType = value === 'IN' ? 'RM' : 'FG';
        row.material_type = newMatType;
        const candidateItems = newMatType === 'RM' ? rawMaterials : finishedGoods;
        const def = candidateItems[0];
        if (def) {
          row.item_id = def.id;
          row.item_name = def.item_name;
          row.item_code = def.item_code;
          row.unit_code = def.unit_code;
          row.current_stock = parseFloat(def.current_stock) || 0;
          row.rate = parseFloat(def.default_rate) || 0;
        }
      } else if (field === 'material_type') {
        row.material_type = value;
        const candidateItems = value === 'RM' ? rawMaterials : finishedGoods;
        const def = candidateItems[0];
        if (def) {
          row.item_id = def.id;
          row.item_name = def.item_name;
          row.item_code = def.item_code;
          row.unit_code = def.unit_code;
          row.current_stock = parseFloat(def.current_stock) || 0;
          row.rate = parseFloat(def.default_rate) || 0;
        }
      } else if (field === 'item_id' || field === 'item_selection') {
        if (String(value).startsWith('sub_')) {
          const subId = parseInt(String(value).replace('sub_', ''), 10);
          const sub = subSkus.find(s => Number(s.sub_sku_id) === subId);
          if (sub) {
            row.item_id = sub.parent_fg_id; // Physical stock decreases from parent SKU!
            row.sub_sku_id = sub.sub_sku_id;
            row.item_name = sub.sub_sku_name;
            row.clean_name = sub.sub_sku_name;
            row.item_code = sub.sub_sku_code;
            row.unit_code = sub.unit_code || 'PCS';
            row.current_stock = parseFloat(sub.current_stock) || 0;
            if (!row.rate || row.rate === 0) {
              row.rate = parseFloat(sub.selling_price) || 0;
            }
          }
        } else {
          row.sub_sku_id = null;
          row.clean_name = '';
          const candidateItems = row.material_type === 'RM' ? rawMaterials : finishedGoods;
          const selected = candidateItems.find(it => String(it.id) === String(value));
          if (selected) {
            row.item_id = selected.id;
            row.item_name = selected.item_name;
            row.item_code = selected.item_code;
            row.unit_code = selected.unit_code;
            row.current_stock = parseFloat(selected.current_stock) || 0;
            if (!row.rate || row.rate === 0) {
              row.rate = parseFloat(selected.default_rate) || 0;
            }
          }
        }
      } else if (field === 'quantity') {
        row.quantity = Math.max(0, parseFloat(value) || 0);
      } else if (field === 'rate') {
        row.rate = Math.max(0, parseFloat(value) || 0);
      } else {
        row[field] = value;
      }

      next[index] = row;
      return next;
    });
    setIsDirty(true);
  };

  // Filtered rows for sheet display
  const displayedRows = useMemo(() => {
    return rows.map((r, originalIndex) => ({ ...r, originalIndex })).filter(item => {
      if (sheetTypeFilter !== 'ALL' && item.type !== sheetTypeFilter) {
        return false;
      }
      if (sheetSearch) {
        const q = sheetSearch.toLowerCase();
        const matchParty = (item.party_name || '').toLowerCase().includes(q);
        const matchItem = (item.item_name || '').toLowerCase().includes(q) || (item.item_code || '').toLowerCase().includes(q);
        const matchInv = (item.invoice_number || '').toLowerCase().includes(q);
        if (!matchParty && !matchItem && !matchInv) return false;
      }
      return true;
    });
  }, [rows, sheetTypeFilter, sheetSearch]);

  // Save All Spreadsheet Entries
  const handleSaveAll = async () => {
    // Validate rows
    const validRows = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      // Skip completely empty placeholder rows
      if (!r.party_name?.trim() && !r.item_id && (!r.quantity || r.quantity <= 0)) {
        continue;
      }

      if (!r.party_name?.trim()) {
        error(`Row #${i + 1}: Please enter or select a Party Name.`);
        return;
      }
      if (!r.item_id) {
        error(`Row #${i + 1}: Please select an Item.`);
        return;
      }
      if (!r.quantity || parseFloat(r.quantity) <= 0) {
        error(`Row #${i + 1}: Quantity must be greater than zero.`);
        return;
      }

      validRows.push({
        type: r.type,
        party_name: r.party_name.trim(),
        material_type: r.material_type,
        item_id: parseInt(r.item_id, 10),
        quantity: parseFloat(r.quantity),
        rate: parseFloat(r.rate || 0),
        date: r.date || new Date().toISOString().split('T')[0],
        invoice_number: r.invoice_number?.trim() || '',
        remarks: r.remarks?.trim() || ''
      });
    }

    if (validRows.length === 0) {
      warning('No valid rows found to save. Please enter transaction details.');
      return;
    }

    setSaving(true);
    try {
      const res = await api.inOut.batchSave(validRows);
      success(res?.message || `Successfully recorded ${validRows.length} transactions and updated stock!`);
      setIsDirty(false);

      // Refresh master data to update live stock numbers
      await loadMasterData();

      // Reset sheet with fresh blank rows
      const today = new Date().toISOString().split('T')[0];
      const defaultParty = parties[0]?.party_name || '';
      setRows([
        createBlankRow('IN', defaultParty, rawMaterials[0] || null, today),
        createBlankRow('OUT', parties[1]?.party_name || defaultParty, finishedGoods[0] || null, today),
      ]);
    } catch (err) {
      error('Failed to save In/Out transactions: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  // Load In/Out Transaction History
  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const params = {};
      if (historyTypeFilter !== 'ALL') params.type = historyTypeFilter;
      if (historySearch) params.search = historySearch;

      const res = await api.inOut.getAll(params);
      if (res?.data) {
        setHistoryRecords(res.data);
      }
    } catch (err) {
      error('Failed to load transaction history: ' + err.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeMainTab === 'history') {
      loadHistory();
    }
  }, [activeMainTab, historyTypeFilter]);

  // Handle Create Party Modal Submission
  const handleSaveParty = async (e) => {
    e.preventDefault();
    if (!newPartyForm.party_name.trim()) {
      error('Party name is required.');
      return;
    }

    try {
      const res = await api.inOut.saveParty(newPartyForm);
      success('Party saved successfully.');
      setIsPartyModalOpen(false);
      setNewPartyForm({
        party_name: '',
        party_type: 'BOTH',
        phone: '',
        email: '',
        gstin: '',
        address: ''
      });
      // Refresh parties
      const pRes = await api.inOut.getParties('ALL');
      if (pRes?.data) setParties(pRes.data);
    } catch (err) {
      error('Failed to create party: ' + err.message);
    }
  };

  // Total summary of current sheet rows
  const sheetSummary = useMemo(() => {
    let inCount = 0;
    let outCount = 0;
    let totalInQty = 0;
    let totalOutQty = 0;
    let totalAmount = 0;

    rows.forEach(r => {
      const qty = parseFloat(r.quantity) || 0;
      const rate = parseFloat(r.rate) || 0;
      if (r.type === 'IN') {
        inCount++;
        totalInQty += qty;
      } else {
        outCount++;
        totalOutQty += qty;
      }
      totalAmount += (qty * rate);
    });

    return { inCount, outCount, totalInQty, totalOutQty, totalAmount };
  }, [rows]);

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-xs">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-slate-900 tracking-tight">
                  In / Out Register & Direct Entry
                </h1>
                {isDirty && (
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300 animate-pulse">
                    Unsaved Entries
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Unified Purchase (IN) & Sales Dispatch (OUT) management with live stock ledger impact.
              </p>
            </div>
          </div>
        </div>

        {/* Global Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl border border-slate-200 self-stretch md:self-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveMainTab('sheet')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeMainTab === 'sheet'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Spreadsheet Entry</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('history')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeMainTab === 'history'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>In / Out History</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('parties')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeMainTab === 'parties'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Party Master ({parties.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('tally_csv')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeMainTab === 'tally_csv'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Tally CSV Import</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: SPREADSHEET DIRECT ENTRY (ACTIVE BY DEFAULT) */}
      {activeMainTab === 'sheet' && (
        <div className="space-y-3">
          {/* Controls & Action Bar */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Filter buttons & Search */}
            <div className="flex items-center gap-2 flex-wrap flex-1">
              {/* Type Filter Pills */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setSheetTypeFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    sheetTypeFilter === 'ALL' ? 'bg-white text-slate-800 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  All Rows ({rows.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSheetTypeFilter('IN')}
                  className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                    sheetTypeFilter === 'IN' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-500 hover:text-emerald-700'
                  }`}
                >
                  <ArrowDownLeft className="w-3 h-3" />
                  <span>IN ({sheetSummary.inCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSheetTypeFilter('OUT')}
                  className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                    sheetTypeFilter === 'OUT' ? 'bg-rose-600 text-white font-bold' : 'text-slate-500 hover:text-rose-700'
                  }`}
                >
                  <ArrowUpRight className="w-3 h-3" />
                  <span>OUT ({sheetSummary.outCount})</span>
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by Party, Item name, Code or Invoice..."
                  value={sheetSearch}
                  onChange={(e) => setSheetSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>

              {/* Add New Party Quick Button */}
              <button
                type="button"
                onClick={() => setIsPartyModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300 cursor-pointer"
                title="Create a new supplier/customer in party master"
              >
                <Plus className="w-3 h-3 text-blue-600" />
                <span>+ New Party</span>
              </button>
            </div>

            {/* Row Modifiers and Save Button */}
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <button
                type="button"
                onClick={() => handleAddRow('IN')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300 shadow-2xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add IN</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddRow('OUT')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold border border-rose-300 shadow-2xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add OUT</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddMultipleRows(5, 'IN')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 shadow-2xs transition-colors cursor-pointer"
                title="Append 5 rows"
              >
                <Plus className="w-3.5 h-3.5 text-slate-500" />
                <span>+ 5 Rows</span>
              </button>

              <button
                type="button"
                onClick={loadMasterData}
                title="Refresh master data & stock levels"
                className="p-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-300 shadow-2xs cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
              </button>

              <button
                type="button"
                onClick={handleSaveAll}
                disabled={saving}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold text-white shadow-xs transition-all cursor-pointer ${
                  isDirty 
                    ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-500/20 shadow-md' 
                    : 'bg-slate-900 hover:bg-slate-800'
                }`}
              >
                <Save className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
                <span>{saving ? 'Recording Stock...' : 'Save All Transactions'}</span>
              </button>
            </div>
          </div>

          {/* SPREADSHEET TABLE GRID */}
          <div className="bg-white border border-slate-300 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto max-h-[640px] scrollbar-thin">
              <table className="w-full text-left border-collapse text-xs">
                {/* Header Row */}
                <thead className="sticky top-0 z-20 shadow-xs select-none">
                  <tr className="text-[11px] font-bold border-b-2 border-slate-300 divide-x divide-slate-300">
                    {/* # Index */}
                    <th className="p-2.5 text-center bg-slate-200/90 text-slate-700 w-12 min-w-[48px]">
                      #
                    </th>

                    {/* Col A: Type (IN / OUT) */}
                    <th className="p-2.5 bg-[#e0e7ff] text-[#1e1b4b] min-w-[120px]">
                      <div className="flex items-center justify-between">
                        <span>Type (In / Out)</span>
                        <span className="text-[10px] opacity-70 font-mono">Col A</span>
                      </div>
                    </th>

                    {/* Col B: Party Name */}
                    <th className="p-2.5 bg-[#fef3c7] text-[#78350f] min-w-[230px]">
                      <div className="flex items-center justify-between">
                        <span>Party Name (Supplier / Customer)</span>
                        <span className="text-[10px] opacity-70 font-mono">Col B</span>
                      </div>
                    </th>

                    {/* Col C: Category (RM / FG) */}
                    <th className="p-2.5 bg-[#f1f5f9] text-[#1e293b] min-w-[110px]">
                      <div className="flex items-center justify-between">
                        <span>Category</span>
                        <span className="text-[10px] opacity-70 font-mono">Col C</span>
                      </div>
                    </th>

                    {/* Col D: Item Name */}
                    <th className="p-2.5 bg-[#dcfce7] text-[#14532d] min-w-[240px]">
                      <div className="flex items-center justify-between">
                        <span>Item Name</span>
                        <span className="text-[10px] opacity-70 font-mono">Col D</span>
                      </div>
                    </th>

                    {/* Col E: Item Code */}
                    <th className="p-2.5 bg-[#dcfce7] text-[#14532d] min-w-[120px]">
                      <div className="flex items-center justify-between">
                        <span>Code</span>
                        <span className="text-[10px] opacity-70 font-mono">Col E</span>
                      </div>
                    </th>

                    {/* Col F: Live Stock */}
                    <th className="p-2.5 bg-[#f8fafc] text-[#334155] min-w-[110px] text-right">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] opacity-70 font-mono">Col F</span>
                        <span>Current Stock</span>
                      </div>
                    </th>

                    {/* Col G: Quantity */}
                    <th className="p-2.5 bg-[#fef9c3] text-[#713f12] min-w-[120px] text-right">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] opacity-70 font-mono">Col G</span>
                        <span>Quantity</span>
                      </div>
                    </th>

                    {/* Col H: Rate (₹) */}
                    <th className="p-2.5 bg-[#fef9c3] text-[#713f12] min-w-[110px] text-right">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] opacity-70 font-mono">Col H</span>
                        <span>Rate (₹)</span>
                      </div>
                    </th>

                    {/* Col I: Total Amount (₹) */}
                    <th className="p-2.5 bg-[#f1f5f9] text-[#1e293b] min-w-[120px] text-right">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] opacity-70 font-mono">Col I</span>
                        <span>Amount (₹)</span>
                      </div>
                    </th>

                    {/* Col J: Date */}
                    <th className="p-2.5 bg-[#f1f5f9] text-[#1e293b] min-w-[130px]">
                      <div className="flex items-center justify-between">
                        <span>Date</span>
                        <span className="text-[10px] opacity-70 font-mono">Col J</span>
                      </div>
                    </th>

                    {/* Col K: Invoice / Ref No */}
                    <th className="p-2.5 bg-[#f1f5f9] text-[#1e293b] min-w-[140px]">
                      <div className="flex items-center justify-between">
                        <span>Invoice / Ref #</span>
                        <span className="text-[10px] opacity-70 font-mono">Col K</span>
                      </div>
                    </th>

                    {/* Col L: Remarks */}
                    <th className="p-2.5 bg-[#f1f5f9] text-[#1e293b] min-w-[150px]">
                      <span>Remarks</span>
                    </th>

                    {/* Actions */}
                    <th className="p-2.5 bg-slate-200/90 text-slate-700 text-center w-20 min-w-[80px]">
                      Action
                    </th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-slate-200">
                  {displayedRows.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="p-12 text-center text-slate-400">
                        <ArrowLeftRight className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="font-bold text-slate-700 text-xs">No entries match your search</p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Click "+ Add IN" or "+ Add OUT" above to add new transactions.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    displayedRows.map((row, dIdx) => {
                      const originalIdx = row.originalIndex;
                      const isOut = row.type === 'OUT';
                      const candidateItems = row.material_type === 'RM' ? rawMaterials : finishedGoods;
                      const amount = (parseFloat(row.quantity || 0) * parseFloat(row.rate || 0)).toFixed(2);
                      const isLowStock = isOut && row.current_stock < parseFloat(row.quantity || 0);

                      return (
                        <tr
                          key={row.row_id}
                          className={`transition-colors divide-x divide-slate-200 ${
                            isOut 
                              ? 'bg-rose-50/75 hover:bg-rose-100/60 border-l-4 border-l-rose-500' 
                              : 'bg-emerald-50/75 hover:bg-emerald-100/60 border-l-4 border-l-emerald-500'
                          }`}
                        >
                          {/* Row Number */}
                          <td className={`p-2 text-center font-mono font-bold select-none ${
                            isOut ? 'text-rose-700 bg-rose-100/50' : 'text-emerald-700 bg-emerald-100/50'
                          }`}>
                            {dIdx + 1}
                          </td>

                          {/* Col A: Type (IN / OUT) */}
                          <td className="p-1.5">
                            <select
                              value={row.type}
                              onChange={(e) => handleCellChange(originalIdx, 'type', e.target.value)}
                              className={`w-full text-xs font-bold rounded-lg px-2 py-1.5 border cursor-pointer focus:ring-2 shadow-2xs ${
                                row.type === 'IN'
                                  ? 'bg-emerald-100 text-emerald-900 border-emerald-400 focus:ring-emerald-500'
                                  : 'bg-rose-100 text-rose-900 border-rose-400 focus:ring-rose-500'
                              }`}
                            >
                              <option value="IN">↓ IN (Purchase Inward)</option>
                              <option value="OUT">↑ OUT (Sales Dispatch)</option>
                            </select>
                          </td>

                          {/* Col B: Party Name (Combobox / Free typing + Datalist) */}
                          <td className="p-1.5">
                            <div className="relative">
                              <input
                                list={`party-list-${row.row_id}`}
                                type="text"
                                placeholder="Select or type Party..."
                                value={row.party_name || ''}
                                onChange={(e) => handleCellChange(originalIdx, 'party_name', e.target.value)}
                                className={`w-full text-xs font-semibold bg-white rounded-lg px-2.5 py-1.5 text-slate-900 focus:outline-none focus:ring-2 border ${
                                  isOut
                                    ? 'border-rose-300 focus:ring-rose-500/30 focus:border-rose-500'
                                    : 'border-emerald-300 focus:ring-emerald-500/30 focus:border-emerald-500'
                                }`}
                              />
                              <datalist id={`party-list-${row.row_id}`}>
                                {parties.map((p) => (
                                  <option key={p.id} value={p.party_name}>
                                    {p.party_name} ({p.party_type})
                                  </option>
                                ))}
                              </datalist>
                            </div>
                          </td>

                          {/* Col C: Category (RM / FG) */}
                          <td className="p-1.5">
                            <select
                              value={row.material_type}
                              onChange={(e) => handleCellChange(originalIdx, 'material_type', e.target.value)}
                              className="w-full text-xs font-semibold rounded-lg px-2 py-1.5 bg-white border border-slate-300 text-slate-700 cursor-pointer focus:ring-2 focus:ring-slate-400"
                            >
                              <option value="RM">Child Part (RM)</option>
                              <option value="FG">Finished Good (FG)</option>
                            </select>
                          </td>

                          {/* Col D: Item Name */}
                          <td className="p-1.5">
                            <select
                              value={row.sub_sku_id ? `sub_${row.sub_sku_id}` : (row.item_id || '')}
                              onChange={(e) => handleCellChange(originalIdx, 'item_selection', e.target.value)}
                              className={`w-full text-xs font-medium rounded-lg px-2 py-1.5 bg-white text-slate-900 focus:outline-none focus:ring-2 cursor-pointer max-w-[340px] border ${
                                isOut
                                  ? 'border-rose-300 focus:ring-rose-500/30 focus:border-rose-500'
                                  : 'border-emerald-300 focus:ring-emerald-500/30 focus:border-emerald-500'
                              }`}
                            >
                              <option value="">-- Choose Item --</option>
                              {row.material_type === 'RM' ? (
                                rawMaterials.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    [{item.item_code}] {item.item_name}
                                  </option>
                                ))
                              ) : (
                                <>
                                  {subSkus.length > 0 && (
                                    <optgroup label="🏷️ Billing Sub-SKUs (Client / OEM / Brand)">
                                      {subSkus.map((sub) => (
                                        <option key={`sub_${sub.sub_sku_id}`} value={`sub_${sub.sub_sku_id}`}>
                                          [{sub.sub_sku_code}] {sub.sub_sku_name} ({sub.brand_name}) → Physical: [{sub.parent_fg_code}]
                                        </option>
                                      ))}
                                    </optgroup>
                                  )}
                                  <optgroup label="🏭 Factory SKUs (Internal / Manufacturing)">
                                    {finishedGoods.map((item) => (
                                      <option key={item.id} value={item.id}>
                                        [{item.item_code}] {item.item_name}
                                      </option>
                                    ))}
                                  </optgroup>
                                </>
                              )}
                            </select>
                          </td>

                          {/* Col E: Item Code (Read-only badge) */}
                          <td className={`p-2 text-center ${isOut ? 'bg-rose-100/30' : 'bg-emerald-100/30'}`}>
                            <div className="flex items-center justify-center gap-1 flex-wrap">
                              <span className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded border bg-white ${
                                isOut ? 'text-rose-800 border-rose-300' : 'text-emerald-800 border-emerald-300'
                              }`}>
                                {row.item_code || '-'}
                              </span>
                              {row.sub_sku_id && (
                                <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded border border-indigo-200" title={`Billing Sub-SKU mapped to parent SKU`}>
                                  Sub-SKU
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Col F: Live Stock */}
                          <td className="p-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <span className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded ${
                                isLowStock 
                                  ? 'bg-rose-200 text-rose-900 border border-rose-300' 
                                  : isOut
                                  ? 'text-rose-900 bg-rose-100/50'
                                  : 'text-emerald-900 bg-emerald-100/50'
                              }`}>
                                {row.current_stock.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                              </span>
                              <span className="text-[10px] text-slate-400 font-semibold">{row.unit_code}</span>
                            </div>
                            {isLowStock && (
                              <div className="text-[9px] text-rose-600 font-bold flex items-center justify-end gap-0.5 mt-0.5">
                                <AlertTriangle className="w-2.5 h-2.5" /> Low Stock
                              </div>
                            )}
                          </td>

                          {/* Col G: Quantity */}
                          <td className="p-1.5">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="any"
                                min="0.001"
                                value={row.quantity}
                                onChange={(e) => handleCellChange(originalIdx, 'quantity', e.target.value)}
                                className={`w-full text-right font-mono font-bold text-xs bg-white rounded-lg px-2 py-1.5 text-slate-900 focus:outline-none focus:ring-2 border ${
                                  isOut
                                    ? 'border-rose-400 focus:ring-rose-500'
                                    : 'border-emerald-400 focus:ring-emerald-500'
                                }`}
                              />
                              <span className="text-[10px] text-slate-500 font-semibold w-8 text-left">
                                {row.unit_code}
                              </span>
                            </div>
                          </td>

                          {/* Col H: Rate (₹) */}
                          <td className="p-1.5">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={row.rate}
                              onChange={(e) => handleCellChange(originalIdx, 'rate', e.target.value)}
                              className={`w-full text-right font-mono font-semibold text-xs bg-white rounded-lg px-2 py-1.5 text-slate-800 focus:outline-none focus:ring-2 border ${
                                isOut
                                  ? 'border-rose-200 focus:ring-rose-400'
                                  : 'border-emerald-200 focus:ring-emerald-400'
                              }`}
                            />
                          </td>

                          {/* Col I: Total Amount (₹) */}
                          <td className={`p-2 text-right font-mono font-bold ${
                            isOut ? 'text-rose-900 bg-rose-100/40' : 'text-emerald-900 bg-emerald-100/40'
                          }`}>
                            ₹{parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          {/* Col J: Date */}
                          <td className="p-1.5">
                            <input
                              type="date"
                              value={row.date}
                              onChange={(e) => handleCellChange(originalIdx, 'date', e.target.value)}
                              className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-700 focus:ring-2 focus:ring-blue-400"
                            />
                          </td>

                          {/* Col K: Invoice / Ref No */}
                          <td className="p-1.5">
                            <input
                              type="text"
                              placeholder="e.g. INV-2024"
                              value={row.invoice_number || ''}
                              onChange={(e) => handleCellChange(originalIdx, 'invoice_number', e.target.value)}
                              className="w-full text-xs font-mono bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-800 focus:ring-2 focus:ring-blue-400"
                            />
                          </td>

                          {/* Col L: Remarks */}
                          <td className="p-1.5">
                            <input
                              type="text"
                              placeholder="Notes..."
                              value={row.remarks || ''}
                              onChange={(e) => handleCellChange(originalIdx, 'remarks', e.target.value)}
                              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-600 focus:ring-2 focus:ring-blue-400"
                            />
                          </td>

                          {/* Col M: Actions (Duplicate & Delete) */}
                          <td className="p-1.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDuplicateRow(originalIdx)}
                                title="Duplicate Row"
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRow(originalIdx)}
                                title="Delete Row"
                                className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Spreadsheet Status Bar */}
            <div className="bg-slate-50 border-t border-slate-300 p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-slate-600">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  <strong className="text-emerald-800">IN Rows:</strong> {sheetSummary.inCount} ({sheetSummary.totalInQty.toLocaleString()} units)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                  <strong className="text-rose-800">OUT Rows:</strong> {sheetSummary.outCount} ({sheetSummary.totalOutQty.toLocaleString()} units)
                </span>
                <span className="flex items-center gap-1.5 text-slate-900">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  <strong>Estimated Total Value:</strong> ₹{sheetSummary.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAddRow('IN')}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  + Add Row
                </button>
                <button
                  type="button"
                  onClick={handleSaveAll}
                  disabled={saving}
                  className="px-3.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save All Entries'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: IN / OUT TRANSACTION HISTORY REGISTER */}
      {activeMainTab === 'history' && (
        <div className="space-y-3">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap flex-1">
              {/* Type Filter */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setHistoryTypeFilter('ALL')}
                  className={`px-3 py-1.5 rounded-md ${
                    historyTypeFilter === 'ALL' ? 'bg-white text-slate-800 shadow-2xs font-bold' : 'text-slate-500'
                  }`}
                >
                  All Transactions
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryTypeFilter('IN')}
                  className={`px-3 py-1.5 rounded-md flex items-center gap-1 ${
                    historyTypeFilter === 'IN' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-500'
                  }`}
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>IN (Purchases)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryTypeFilter('OUT')}
                  className={`px-3 py-1.5 rounded-md flex items-center gap-1 ${
                    historyTypeFilter === 'OUT' ? 'bg-rose-600 text-white font-bold' : 'text-slate-500 hover:text-rose-700'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>OUT (Dispatches)</span>
                </button>
              </div>

              {/* History Search */}
              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search party, item, invoice number..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadHistory()}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>

              <button
                type="button"
                onClick={loadHistory}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300 cursor-pointer"
              >
                Search
              </button>
            </div>

            <button
              type="button"
              onClick={loadHistory}
              title="Refresh History"
              className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-300 shadow-2xs cursor-pointer self-end md:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>

          {/* History Data Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    <th className="p-3">Date</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Party Name</th>
                    <th className="p-3">Item Details</th>
                    <th className="p-3">Invoice #</th>
                    <th className="p-3 text-right">Quantity</th>
                    <th className="p-3 text-right">Rate</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-center">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historyLoading ? (
                    <tr>
                      <td colSpan={9} className="p-10 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                        <p className="font-semibold text-xs">Loading In / Out transactions...</p>
                      </td>
                    </tr>
                  ) : historyRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-10 text-center text-slate-400">
                        <FileText className="w-6 h-6 mx-auto text-slate-300 mb-2" />
                        <p className="font-bold text-xs text-slate-600">No transactions recorded yet</p>
                        <p className="text-[11px] text-slate-400">
                          Use the Spreadsheet Entry tab to record your purchases or sales.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    historyRecords.map((item, idx) => {
                      const isIn = item.transaction_type === 'IN';
                      return (
                        <tr 
                          key={`${item.transaction_type}_${item.id}_${idx}`} 
                          className={`transition-colors ${
                            isIn ? 'hover:bg-emerald-50/70 bg-emerald-50/20' : 'hover:bg-rose-50/70 bg-rose-50/20'
                          }`}
                        >
                          <td className="p-3 font-medium text-slate-700 whitespace-nowrap">
                            {item.transaction_date}
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              isIn
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}>
                              {isIn ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                              <span>{isIn ? 'IN (Purchase)' : 'OUT (Sale)'}</span>
                            </span>
                          </td>
                          <td className="p-3 font-bold text-slate-900">
                            {item.party_name || '-'}
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-800">{item.item_name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">[{item.item_code}] • {item.material_type}</div>
                          </td>
                          <td className="p-3 font-mono text-slate-600">
                            {item.invoice_number || '-'}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">
                            {parseFloat(item.quantity).toLocaleString('en-IN', { maximumFractionDigits: 3 })} {item.unit_code}
                          </td>
                          <td className="p-3 text-right font-mono text-slate-600">
                            ₹{parseFloat(item.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">
                            ₹{parseFloat(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-center">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              {item.source || 'MANUAL'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: PARTY MASTER */}
      {activeMainTab === 'parties' && (
        <div className="space-y-3">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Party Master Directory</h2>
              <p className="text-xs text-slate-500">
                Manage all suppliers, customers, and trade partners for Bharat Impex.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsPartyModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add New Party</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  <th className="p-3 w-12 text-center">#</th>
                  <th className="p-3">Party Name</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">GSTIN</th>
                  <th className="p-3">Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parties.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No parties created yet. Click "+ Add New Party" above.
                    </td>
                  </tr>
                ) : (
                  parties.map((p, idx) => (
                    <tr key={p.id || idx} className="hover:bg-slate-50/70">
                      <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>{p.party_name}</span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          p.party_type === 'SUPPLIER'
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.party_type === 'CUSTOMER'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {p.party_type}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-600">{p.phone || '-'}</td>
                      <td className="p-3 font-mono text-slate-600">{p.gstin || '-'}</td>
                      <td className="p-3 text-slate-500 max-w-xs truncate">{p.address || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 4: TALLY CSV IMPORT (SUB-TABS FOR PURCHASE & SALES CSVs) */}
      {activeMainTab === 'tally_csv' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                <Upload className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Tally CSV Import Wizard</h2>
                <p className="text-xs text-slate-500">
                  Import Tally export CSV files for Purchase (Inward) or Sales (Outward) with smart item mapping.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setCsvSubTab('purchase')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  csvSubTab === 'purchase' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Purchase Inward CSV
              </button>
              <button
                type="button"
                onClick={() => setCsvSubTab('sales')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  csvSubTab === 'sales' ? 'bg-white text-blue-800 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Sales Dispatch CSV
              </button>
            </div>
          </div>

          {/* Render embedded Purchase or Sales component for full CSV wizard capabilities */}
          {csvSubTab === 'purchase' ? <Purchase /> : <Sales />}
        </div>
      )}

      {/* MODAL: ADD NEW PARTY */}
      {isPartyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>Create New Party</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsPartyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveParty} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Party Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shree Ram Brass Mills"
                  value={newPartyForm.party_name}
                  onChange={(e) => setNewPartyForm(prev => ({ ...prev, party_name: e.target.value }))}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Party Classification *</label>
                <select
                  value={newPartyForm.party_type}
                  onChange={(e) => setNewPartyForm(prev => ({ ...prev, party_type: e.target.value }))}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                >
                  <option value="BOTH">Both (Supplier & Customer)</option>
                  <option value="SUPPLIER">Supplier (Inward / Child Parts)</option>
                  <option value="CUSTOMER">Customer (Outward / Finished Goods)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 98250..."
                    value={newPartyForm.phone}
                    onChange={(e) => setNewPartyForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    placeholder="24AAAA..."
                    value={newPartyForm.gstin}
                    onChange={(e) => setNewPartyForm(prev => ({ ...prev, gstin: e.target.value }))}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Address / Location</label>
                <textarea
                  rows={2}
                  placeholder="Factory or shop address..."
                  value={newPartyForm.address}
                  onChange={(e) => setNewPartyForm(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPartyModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Save Party
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default InOut;
