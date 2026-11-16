import React, { useState, useEffect, useMemo } from 'react';
import { 
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
  ArrowRight,
  Clock,
  Package
} from 'lucide-react';
import Icon from '../../components/UI/Icon';
import SearchableSelect from '../../components/UI/SearchableSelect';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export function SKU_BOM() {
  const [rows, setRows] = useState([]);
  const [finishedGoods, setFinishedGoods] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [subChildParts, setSubChildParts] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedFGFilter, setSelectedFGFilter] = useState('ALL');
  // BOM status: products whose recipe is saved in the database vs still to do
  const [bomTab, setBomTab] = useState('pending'); // pending (default: create BOM) | done | all
  const [savedFgIds, setSavedFgIds] = useState(new Set());
  const [copyFrom, setCopyFrom] = useState({}); // pending fg id -> source fg id
  const [bomSearch, setBomSearch] = useState('');

  const { success, error, warning } = useToast();

  // Load all initial data (BOM items, FGs, RMs, Sub-Child Parts, Units)
  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [itemsRes, fgRes, rmRes, bundleRes, scpRes] = await Promise.all([
        api.bom.getAllItems(),
        api.finishedGoods.getAll(),
        api.rawMaterials.getAll(),
        api.settings.getBundle(),
        api.subChildParts.getAll().catch(() => ({ data: { sub_child_parts: [] } })),
      ]);

      const fgs = fgRes?.data || [];
      const rms = rmRes?.data || [];
      const scps = scpRes?.data?.sub_child_parts || [];
      const uList = bundleRes?.data?.units || [
        { id: 1, unit_code: 'PCS', unit_name: 'Pieces' },
        { id: 2, unit_code: 'KG', unit_name: 'Kilogram' },
        { id: 3, unit_code: 'METER', unit_name: 'Meter' },
      ];

      setFinishedGoods(fgs);
      setRawMaterials(rms);
      setSubChildParts(scps);
      setUnits(uList);

      const existingItems = itemsRes?.data || [];
      setSavedFgIds(new Set(existingItems.filter((it) => it.fg_id && it.rm_id).map((it) => String(it.fg_id))));
      if (existingItems.length > 0) {
        setRows(
          existingItems.map((item, idx) => ({
            row_id: `row_${item.id || idx}_${Date.now()}`,
            fg_id: item.fg_id,
            fg_name: item.fg_name,
            fg_code: item.fg_code,
            rm_id: item.rm_id,
            rm_name: item.rm_name,
            rm_code: item.rm_code,
            sub_child_part_id: item.sub_child_part_id || '',
            sub_part_name: item.sub_part_name || '',
            sub_part_brand: item.sub_part_brand || '',
            unit_id: item.unit_id,
            unit_code: item.unit_code,
            quantity: item.quantity,
          }))
        );
      } else {
        // Fallback default 5 empty rows if completely empty
        const initialFg = fgs[0] || null;
        setRows([
          createNewRow(initialFg, rms[0] || null, uList),
          createNewRow(initialFg, rms[1] || null, uList),
          createNewRow(initialFg, rms[2] || null, uList),
        ]);
      }
      setIsDirty(false);
    } catch (err) {
      error('Failed to load BOM Master Data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Helper to create a new row object
  const createNewRow = (defaultFg = null, defaultRm = null, unitsList = units) => {
    const fg = defaultFg || finishedGoods[0] || null;
    const rm = defaultRm || null;
    const unitId = rm ? (rm.unit_id || 3) : 3;
    const uObj = unitsList.find((u) => u.id === unitId) || unitsList[0];

    return {
      row_id: `row_new_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      fg_id: fg ? fg.id : '',
      fg_name: fg ? fg.product_name : '',
      fg_code: fg ? fg.fg_code : '',
      rm_id: rm ? rm.id : '',
      rm_name: rm ? rm.material_name : '',
      rm_code: rm ? rm.rm_code : '',
      sub_child_part_id: '',
      sub_part_name: '',
      sub_part_brand: '',
      unit_id: unitId,
      unit_code: uObj ? uObj.unit_code : 'PCS',
      quantity: 1,
    };
  };

  // Add 1 Row
  const handleAddRow = () => {
    // If filtered by FG, prefill that FG
    let prefillFg = null;
    if (selectedFGFilter !== 'ALL') {
      prefillFg = finishedGoods.find((f) => String(f.id) === String(selectedFGFilter));
    } else if (rows.length > 0 && rows[rows.length - 1].fg_id) {
      prefillFg = finishedGoods.find((f) => String(f.id) === String(rows[rows.length - 1].fg_id));
    }

    setRows((prev) => [...prev, createNewRow(prefillFg)]);
    setIsDirty(true);
  };

  // Add 5 Rows
  const handleAddMultipleRows = (count = 5) => {
    let prefillFg = null;
    if (selectedFGFilter !== 'ALL') {
      prefillFg = finishedGoods.find((f) => String(f.id) === String(selectedFGFilter));
    } else if (rows.length > 0 && rows[rows.length - 1].fg_id) {
      prefillFg = finishedGoods.find((f) => String(f.id) === String(rows[rows.length - 1].fg_id));
    }

    const newRows = Array.from({ length: count }, () => createNewRow(prefillFg));
    setRows((prev) => [...prev, ...newRows]);
    setIsDirty(true);
  };

  // Duplicate a row
  const handleDuplicateRow = (index) => {
    const target = rows[index];
    if (!target) return;
    const duplicate = {
      ...target,
      row_id: `row_dup_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };
    const updated = [...rows];
    updated.splice(index + 1, 0, duplicate);
    setRows(updated);
    setIsDirty(true);
  };

  // Delete a row
  const handleDeleteRow = (index) => {
    setRows((prev) => prev.filter((_, idx) => idx !== index));
    setIsDirty(true);
  };

  // Handle FG change on a row
  const handleFGChange = (index, fgId) => {
    const selectedFg = finishedGoods.find((f) => String(f.id) === String(fgId));
    setRows((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        fg_id: selectedFg ? selectedFg.id : '',
        fg_name: selectedFg ? selectedFg.product_name : '',
        fg_code: selectedFg ? selectedFg.fg_code : '',
      };
      return next;
    });
    setIsDirty(true);
  };

  // Handle RM change on a row
  const handleRMChange = (index, rmId) => {
    const selectedRm = rawMaterials.find((r) => String(r.id) === String(rmId));
    setRows((prev) => {
      const next = [...prev];
      const unitId = selectedRm ? (selectedRm.unit_id || next[index].unit_id || 3) : next[index].unit_id;
      const uObj = units.find((u) => u.id === unitId) || units[0];

      next[index] = {
        ...next[index],
        rm_id: selectedRm ? selectedRm.id : '',
        rm_name: selectedRm ? selectedRm.material_name : '',
        rm_code: selectedRm ? selectedRm.rm_code : '',
        sub_child_part_id: '',
        sub_part_name: '',
        sub_part_brand: '',
        unit_id: unitId,
        unit_code: uObj ? uObj.unit_code : 'PCS',
      };
      return next;
    });
    setIsDirty(true);
  };

  // Handle Sub-Child Part change on a row
  const handleSubChildChange = (index, scpId) => {
    const scp = subChildParts.find((s) => String(s.id) === String(scpId));
    setRows((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        sub_child_part_id: scp ? scp.id : '',
        sub_part_name: scp ? scp.sub_part_name : '',
        sub_part_brand: scp ? scp.brand_name : '',
      };
      return next;
    });
    setIsDirty(true);
  };

  // Handle Unit change on a row
  const handleUnitChange = (index, unitId) => {
    const uObj = units.find((u) => String(u.id) === String(unitId));
    setRows((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        unit_id: Number(unitId),
        unit_code: uObj ? uObj.unit_code : next[index].unit_code,
      };
      return next;
    });
    setIsDirty(true);
  };

  // Handle Quantity change on a row
  const handleQtyChange = (index, value) => {
    const num = Number(value);
    setRows((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        quantity: isNaN(num) ? 0 : num,
      };
      return next;
    });
    setIsDirty(true);
  };

  // Save all BOM Recipes
  const handleSaveAll = async () => {
    // Validate rows
    const validRows = rows.filter((r) => r.fg_id && r.rm_id && Number(r.quantity) > 0);
    if (validRows.length === 0) {
      warning('Please enter at least one valid row with Finished Good, Child Part, and Quantity > 0.');
      return;
    }

    setSaving(true);
    try {
      await api.bom.batchSaveGrid(validRows);
      success(`Successfully saved ${validRows.length} BOM recipe constituents to database!`);
      setIsDirty(false);
      loadInitialData();
    } catch (err) {
      error(err.message || 'Failed to save BOM recipes.');
    } finally {
      setSaving(false);
    }
  };

  // Filtered rows for display
  const displayedRows = useMemo(() => {
    return rows.map((r, originalIndex) => ({ ...r, originalIndex })).filter((item) => {
      // Finished Good dropdown filter
      if (selectedFGFilter !== 'ALL' && String(item.fg_id) !== String(selectedFGFilter)) {
        return false;
      }
      // BOM status tab (a picked product always shows, whatever the tab)
      if (selectedFGFilter === 'ALL') {
        const saved = savedFgIds.has(String(item.fg_id));
        if (bomTab === 'done' && !saved) return false;
        if (bomTab === 'pending' && saved) return false;
      }

      // Search matching
      if (search) {
        const q = search.toLowerCase();
        const matchFG = (item.fg_name || '').toLowerCase().includes(q) || (item.fg_code || '').toLowerCase().includes(q);
        const matchRM = (item.rm_name || '').toLowerCase().includes(q) || (item.rm_code || '').toLowerCase().includes(q);
        if (!matchFG && !matchRM) return false;
      }

      return true;
    });
  }, [rows, search, selectedFGFilter, bomTab, savedFgIds]);

  // Unique Finished Goods counted in active recipes
  const uniqueFGCount = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => {
      if (r.fg_id) set.add(r.fg_id);
    });
    return set.size;
  }, [rows]);

  // Parts count per product (rows in the grid that have a child part)
  const partsByFg = useMemo(() => {
    const m = {};
    rows.forEach((r) => { if (r.fg_id && r.rm_id) m[String(r.fg_id)] = (m[String(r.fg_id)] || 0) + 1; });
    return m;
  }, [rows]);
  const doneFgs = useMemo(() => finishedGoods.filter((f) => savedFgIds.has(String(f.id))), [finishedGoods, savedFgIds]);
  const pendingFgs = useMemo(() => finishedGoods.filter((f) => !savedFgIds.has(String(f.id))), [finishedGoods, savedFgIds]);
  // search inside the Done / Pending product strip
  const matchFg = (f) => { const q = bomSearch.trim().toLowerCase(); return !q || `${f.product_name} ${f.fg_code}`.toLowerCase().includes(q); };
  const shownDone = doneFgs.filter(matchFg);
  const shownPending = pendingFgs.filter(matchFg);

  // Start a BOM for a product: copy another product's recipe, or add blank rows
  const startBom = (fg, sourceFgId) => {
    let newRows;
    if (sourceFgId) {
      const src = rows.filter((r) => String(r.fg_id) === String(sourceFgId) && r.rm_id);
      newRows = src.map((r) => ({
        ...r,
        row_id: `row_new_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        fg_id: fg.id, fg_name: fg.product_name, fg_code: fg.fg_code,
      }));
      if (!newRows.length) { warning('That product has no recipe rows to copy.'); return; }
    } else {
      newRows = Array.from({ length: 5 }, () => createNewRow(fg));
    }
    setRows((prev) => [...prev, ...newRows]);
    setIsDirty(true);
    setSelectedFGFilter(fg.id);
    success(sourceFgId
      ? `Copied ${newRows.length} parts to ${fg.product_name}. Change what differs, then Save All BOM Recipes.`
      : `Added 5 rows for ${fg.product_name}. Pick the child parts, then Save All BOM Recipes.`);
  };

  return (
    <div className="space-y-4">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-2xs">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>SKU & Multi-BOM Recipe Sheet</span>
                {isDirty && (
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300 animate-pulse">
                    Unsaved Changes
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Google Sheet style recipe matrix: Select Finished Good, assign constituent Child Parts, and define consumption per unit.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={handleAddRow}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-slate-600" />
            <span>+ Add Row</span>
          </button>

          <button
            type="button"
            onClick={() => handleAddMultipleRows(5)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 shadow-xs transition-colors cursor-pointer"
            title="Append 5 blank recipe rows"
          >
            <Plus className="w-3.5 h-3.5 text-slate-600" />
            <span>+ Add 5 Rows</span>
          </button>

          <button
            type="button"
            onClick={loadInitialData}
            title="Reload from Database"
            className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-300 shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-all cursor-pointer ${
              isDirty 
                ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-500/20 shadow-md' 
                : 'bg-slate-900 hover:bg-slate-800'
            }`}
          >
            <Save className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
            <span>{saving ? 'Saving Recipes...' : 'Save All BOM Recipes'}</span>
          </button>
        </div>
      </div>

      {/* Spreadsheet Control & Filter Bar */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Finished Good, FG Code, or Child Part..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
          />
        </div>

        {/* Finished Good Selector Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-500" />
            <span>Filter Product:</span>
          </label>
          <SearchableSelect
            value={selectedFGFilter}
            onChange={(val) => setSelectedFGFilter(val || 'ALL')}
            placeholder={`All Finished Goods (${uniqueFGCount} configured)`}
            searchPlaceholder="Search product by name or FG code..."
            className="min-w-[240px]"
            buttonClassName="py-1.5 px-2.5 text-xs font-semibold rounded-lg bg-white border-slate-300"
            clearable={false}
            options={[
              { value: 'ALL', label: `All Finished Goods (${uniqueFGCount} configured)` },
              ...finishedGoods.map((fg) => ({
                value: fg.id,
                label: fg.product_name,
                sublabel: fg.fg_code
              }))
            ]}
          />
        </div>

        {/* Counter Pills */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
            <strong>{displayedRows.length}</strong> Recipe Rows
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
            <strong>{uniqueFGCount}</strong> Active Products
          </span>
        </div>
      </div>

      {/* BOM status: Done / Pending products */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            {[
              ['pending', `Create BOM (${pendingFgs.length} pending)`, Clock, 'text-amber-600'],
              ['done', `BOM Done (${doneFgs.length})`, CheckCircle2, 'text-emerald-600'],
              ['all', 'All', Layers, 'text-slate-500'],
            ].map(([v, l, I, c]) => (
              <button key={v} type="button" onClick={() => { setBomTab(v); setSelectedFGFilter('ALL'); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer ${bomTab === v ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}>
                <I className={`w-3.5 h-3.5 ${c}`} /> {l}
              </button>
            ))}
          </div>
          <span className="text-[11.5px] text-slate-500">
            {null}
          </span>
          {bomTab !== 'all' && (
            <div className="relative ml-auto w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input type="search" value={bomSearch} onChange={(e) => setBomSearch(e.target.value)}
                placeholder={`Search ${bomTab === 'pending' ? 'pending' : 'done'} products...`}
                className="w-full h-8 pl-8 pr-2 rounded-lg border border-slate-300 text-xs" aria-label="Search products" />
            </div>
          )}
          <span className="hidden">
            {bomTab === 'pending' ? 'Products without a saved recipe. Start one blank, or copy a similar product and change what differs.'
              : bomTab === 'done' ? 'Products with a saved recipe. Click one to open its recipe.' : 'Every recipe row.'}
          </span>
        </div>

        {bomTab === 'done' && (
          doneFgs.length === 0
            ? <p className="text-xs text-slate-400 px-1">No saved BOM yet.</p>
            : (
              <div className="bom-strip flex gap-2 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1" style={{ WebkitOverflowScrolling: 'touch' }}>
                {shownDone.length === 0 && <p className="text-xs text-slate-400 px-1 py-2">No product matches "{bomSearch}".</p>}
                {shownDone.map((fg) => (
                  <button key={fg.id} type="button" onClick={() => setSelectedFGFilter(String(selectedFGFilter) === String(fg.id) ? 'ALL' : fg.id)}
                    className={`shrink-0 snap-start w-[230px] text-left rounded-xl border px-3 py-2 cursor-pointer transition-colors ${String(selectedFGFilter) === String(fg.id) ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40'}`}>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="text-[12.5px] font-semibold text-slate-900 truncate">{fg.product_name}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 font-mono">{fg.fg_code} · {partsByFg[String(fg.id)] || 0} parts</div>
                  </button>
                ))}
              </div>
            )
        )}

        {bomTab === 'pending' && (
          pendingFgs.length === 0
            ? <p className="text-xs text-emerald-700 px-1 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Every finished good has a BOM.</p>
            : (
              <div className="bom-strip flex gap-2 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1" style={{ WebkitOverflowScrolling: 'touch' }}>
                {shownPending.length === 0 && <p className="text-xs text-slate-400 px-1 py-2">No product matches "{bomSearch}".</p>}
                {shownPending.map((fg) => {
                  const inProgress = partsByFg[String(fg.id)] || 0;
                  return (
                    <div key={fg.id} className={`shrink-0 snap-start w-[300px] sm:w-[320px] rounded-xl border px-3 py-2.5 ${String(selectedFGFilter) === String(fg.id) ? 'border-amber-400 bg-amber-50/60' : 'border-slate-200'}`}>
                      <div className="flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="text-[12.5px] font-semibold text-slate-900 truncate">{fg.product_name}</span>
                        <span className="ml-auto text-[10.5px] font-mono text-slate-500">{fg.fg_code}</span>
                      </div>
                      {inProgress > 0 ? (
                        <button type="button" onClick={() => setSelectedFGFilter(fg.id)} className="mt-2 text-[11.5px] font-semibold text-amber-700 hover:underline cursor-pointer">
                          {inProgress} parts added (not saved yet) · open
                        </button>
                      ) : (
                        <div className="mt-2 flex items-center gap-1.5">
                          <button type="button" onClick={() => startBom(fg)}
                            className="h-8 px-2.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-[11.5px] font-semibold flex items-center gap-1 cursor-pointer">
                            <Plus className="w-3.5 h-3.5" /> Blank BOM
                          </button>
                          <select value={copyFrom[fg.id] || ''} onChange={(e) => setCopyFrom((c) => ({ ...c, [fg.id]: e.target.value }))}
                            disabled={!doneFgs.length} className="flex-1 min-w-0 h-8 px-2 rounded-lg border border-slate-300 text-[11.5px]" aria-label="Copy recipe from">
                            <option value="">{doneFgs.length ? 'Copy from…' : 'No BOM to copy yet'}</option>
                            {doneFgs.map((d) => <option key={d.id} value={d.id}>{d.product_name} ({partsByFg[String(d.id)] || 0} parts)</option>)}
                          </select>
                          <button type="button" disabled={!copyFrom[fg.id]} onClick={() => startBom(fg, copyFrom[fg.id])}
                            className="h-8 px-2.5 rounded-lg bg-[#007AFF] hover:bg-[#0A6CF0] disabled:opacity-40 text-white text-[11.5px] font-semibold flex items-center gap-1 cursor-pointer">
                            <Copy className="w-3.5 h-3.5" /> Copy
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
        )}
      </div>

      {/* GOOGLE SHEET SPREADSHEET TABLE */}
      <div className="bg-white border border-slate-300 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[680px] scrollbar-thin">
          <table className="w-full text-left border-collapse text-xs">
            {/* Main Header with Exact Google Sheet Pastel Colors */}
            <thead className="sticky top-0 z-20 shadow-xs select-none">
              <tr className="text-[11px] font-bold border-b-2 border-slate-300 divide-x divide-slate-300">
                {/* Row Number Column */}
                <th className="p-2.5 text-center bg-slate-200/90 text-slate-700 w-12 min-w-[48px]">
                  #
                </th>

                {/* Col A & B: Pastel Green (#dcfce7) */}
                <th className="p-2.5 bg-[#dcfce7] text-[#14532d] min-w-[260px]">
                  <div className="flex items-center justify-between">
                    <span>Used In FG (Finished Good)</span>
                    <span className="text-[10px] opacity-70 font-mono">Col A</span>
                  </div>
                </th>
                <th className="p-2.5 bg-[#dcfce7] text-[#14532d] min-w-[130px]">
                  <div className="flex items-center justify-between">
                    <span>FG Code</span>
                    <span className="text-[10px] opacity-70 font-mono">Col B</span>
                  </div>
                </th>

                {/* Col C & D: Pastel Amber (#fef3c7) */}
                <th className="p-2.5 bg-[#fef3c7] text-[#78350f] min-w-[260px]">
                  <div className="flex items-center justify-between">
                    <span>Item Name (Child Part)</span>
                    <span className="text-[10px] opacity-70 font-mono">Col C</span>
                  </div>
                </th>
                <th className="p-2.5 bg-[#fef3c7] text-[#78350f] min-w-[130px]">
                  <div className="flex items-center justify-between">
                    <span>Item Code</span>
                    <span className="text-[10px] opacity-70 font-mono">Col D</span>
                  </div>
                </th>

                {/* Col E & F: Pastel Yellow (#fef9c3) */}
                <th className="p-2.5 bg-[#fef9c3] text-[#713f12] min-w-[110px]">
                  <div className="flex items-center justify-between">
                    <span>Unit</span>
                    <span className="text-[10px] opacity-70 font-mono">Col E</span>
                  </div>
                </th>
                <th className="p-2.5 bg-[#fef9c3] text-[#713f12] min-w-[130px] text-right">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] opacity-70 font-mono">Col F</span>
                    <span>Quantity</span>
                  </div>
                </th>

                {/* Actions Column */}
                <th className="p-2.5 bg-slate-200/90 text-slate-700 text-center w-20 min-w-[80px]">
                  Action
                </th>
              </tr>
            </thead>

            {/* Table Rows */}
            <tbody className="divide-y divide-slate-200">
              {displayedRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <Layers className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-700 text-xs">No BOM constituent rows found</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Click "+ Add Row" above to start mapping child parts to your finished goods.
                    </p>
                  </td>
                </tr>
              ) : (
                displayedRows.map((row, dIdx) => {
                  const originalIdx = row.originalIndex;
                  return (
                    <tr
                      key={row.row_id}
                      className="hover:bg-slate-50/80 transition-colors divide-x divide-slate-200"
                    >
                      {/* Row Index */}
                      <td className="p-2 text-center font-mono font-bold text-slate-500 bg-slate-100/60 select-none">
                        {dIdx + 1}
                      </td>

                      {/* Col A: Used In FG (Searchable Dropdown) */}
                      <td className="p-1.5 bg-[#dcfce7]/15">
                        <SearchableSelect
                          value={row.fg_id || ''}
                          onChange={(val) => handleFGChange(originalIdx, val)}
                          placeholder="-- Select FG --"
                          searchPlaceholder="Search FG..."
                          className="w-full min-w-[200px]"
                          buttonClassName="py-1 px-2 text-xs font-semibold rounded-lg bg-white border-slate-300"
                          options={finishedGoods.map((fg) => ({
                            value: fg.id,
                            label: fg.product_name,
                            sublabel: fg.fg_code
                          }))}
                        />
                      </td>

                      {/* Col B: FG Code (Auto-populated Read-Only Pill) */}
                      <td className="p-2 bg-[#dcfce7]/25 font-mono">
                        {row.fg_code ? (
                          <span className="inline-block px-2 py-0.5 rounded font-bold text-emerald-900 bg-emerald-100 border border-emerald-300 text-[11px]">
                            {row.fg_code}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">—</span>
                        )}
                      </td>

                      {/* Col C: Item Name - Child Part (Searchable Dropdown) */}
                      <td className="p-1.5 bg-[#fef3c7]/15">
                        <SearchableSelect
                          value={row.rm_id || ''}
                          onChange={(val) => handleRMChange(originalIdx, val)}
                          placeholder="-- Select Child Part --"
                          searchPlaceholder="Search child part..."
                          className="w-full min-w-[220px]"
                          buttonClassName="py-1 px-2 text-xs font-semibold rounded-lg bg-white border-slate-300"
                          options={rawMaterials.map((rm) => ({
                            value: rm.id,
                            label: rm.material_name,
                            sublabel: rm.rm_code || rm.code
                          }))}
                        />
                      </td>

                      {/* Col D: Item Code - RM Code (Auto-populated Read-Only Pill) */}
                      <td className="p-2 bg-[#fef3c7]/25 font-mono">
                        {row.rm_code ? (
                          <span className="inline-block px-2 py-0.5 rounded font-bold text-amber-900 bg-amber-100 border border-amber-300 text-[11px]">
                            {row.rm_code}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">—</span>
                        )}
                      </td>

                      {/* Col E: Unit (Dropdown) */}
                      <td className="p-1.5 bg-[#fef9c3]/15">
                        <select
                          value={row.unit_id || 3}
                          onChange={(e) => handleUnitChange(originalIdx, e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-yellow-500 cursor-pointer"
                        >
                          {units.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.unit_code}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Col F: Quantity (Number Input) */}
                      <td className="p-1.5 bg-[#fef9c3]/25 text-right">
                        <input
                          type="number"
                          step="0.0001"
                          min="0"
                          value={row.quantity === undefined ? '' : row.quantity}
                          onChange={(e) => handleQtyChange(originalIdx, e.target.value)}
                          placeholder="0.00"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-mono font-bold text-xs text-right focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        />
                      </td>

                      {/* Actions (Duplicate & Delete) */}
                      <td className="p-2 text-center whitespace-nowrap bg-slate-50/50">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDuplicateRow(originalIdx)}
                            title="Duplicate Row"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(originalIdx)}
                            title="Remove Row"
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
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

        {/* Footer Bar */}
        <div className="p-3 bg-slate-50 border-t border-slate-300 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>
              Changes remain in the spreadsheet grid until you click <strong>Save All BOM Recipes</strong>.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddRow}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
            >
              + Add Row
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={saving}
              className={`px-4 py-1.5 rounded-lg font-bold text-white transition-all cursor-pointer ${
                isDirty ? 'bg-emerald-600 hover:bg-emerald-700 shadow-xs' : 'bg-slate-900 hover:bg-slate-800'
              }`}
            >
              {saving ? 'Saving...' : 'Save All Recipes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SKU_BOM;
