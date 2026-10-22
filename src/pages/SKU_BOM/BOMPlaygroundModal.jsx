import React, { useState, useEffect, useMemo } from 'react';
import Icon from '../../components/UI/Icon';
import { StatusBadge } from '../../components/UI/StatusBadge';

export function BOMPlaygroundModal({
  isOpen,
  onClose,
  bom,
  finishedGoods = [],
  rawMaterials = [],
  units = [],
  onSave,
  onForkVersion,
}) {
  const [activeRecipe, setActiveRecipe] = useState(null);
  const [searchRM, setSearchRM] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isSaving, setIsSaving] = useState(false);
  const [highlightedItemId, setHighlightedItemId] = useState(null);

  // Initialize or update active recipe state when bom prop changes
  useEffect(() => {
    if (!isOpen) {
      setActiveRecipe(null);
      return;
    }

    if (bom) {
      // Existing BOM
      const enrichedItems = (bom.items || []).map((item, idx) => {
        const rmRef = rawMaterials.find((r) => r.id === item.rm_id || r.id === item.material_id);
        return {
          id: item.id || `temp-${idx}`,
          rm_id: item.rm_id || item.material_id,
          rm_code: item.rm_code || rmRef?.rm_code || 'RM',
          material_name: item.material_name || rmRef?.material_name || 'Material',
          unit_id: item.unit_id || rmRef?.unit_id || 1,
          unit_code: item.unit_code || rmRef?.unit_code || 'PCS',
          quantity_per_unit: Number(item.quantity_per_unit ?? 1),
          wastage_percentage: Number(item.wastage_percentage ?? 0),
          scrap_factor: Number(item.scrap_factor ?? 0),
          standard_rate: Number(item.standard_rate || rmRef?.standard_rate || 0),
          current_stock: Number(rmRef?.current_stock ?? rmRef?.available_stock ?? 0),
          mandatory: item.mandatory !== undefined ? Number(item.mandatory) : 1,
          sequence: item.sequence || idx + 1,
        };
      });

      setActiveRecipe({
        id: bom.id,
        bom_code: bom.bom_code || 'BOM-AUTO',
        fg_id: bom.fg_id,
        product_name: bom.product_name,
        fg_code: bom.fg_code,
        bom_name: bom.bom_name || 'Standard Production Recipe',
        version: bom.version || 'V1',
        remarks: bom.remarks || '',
        status: bom.status || 'active',
        items: enrichedItems,
      });
    } else {
      // New BOM template
      const defaultFG = finishedGoods[0] || null;
      setActiveRecipe({
        id: null,
        bom_code: 'NEW RECIPE',
        fg_id: defaultFG?.id || '',
        product_name: defaultFG?.product_name || '',
        fg_code: defaultFG?.fg_code || '',
        bom_name: 'Standard Production Recipe',
        version: 'V1',
        remarks: '',
        status: 'active',
        items: [],
      });
    }
  }, [isOpen, bom, rawMaterials, finishedGoods]);

  // Extract unique categories from raw materials
  const rmCategories = useMemo(() => {
    const cats = new Set();
    rawMaterials.forEach((rm) => {
      if (rm.category_name) cats.add(rm.category_name);
    });
    return ['ALL', ...Array.from(cats)];
  }, [rawMaterials]);

  // Filter raw materials catalog
  const filteredRawMaterials = useMemo(() => {
    const q = searchRM.toLowerCase().trim();
    return rawMaterials.filter((rm) => {
      const matchCat = selectedCategory === 'ALL' || rm.category_name === selectedCategory;
      if (!matchCat) return false;
      if (!q) return true;
      const code = (rm.rm_code || '').toLowerCase();
      const name = (rm.material_name || '').toLowerCase();
      const desc = (rm.description || '').toLowerCase();
      return code.includes(q) || name.includes(q) || desc.includes(q);
    });
  }, [rawMaterials, searchRM, selectedCategory]);

  // Calculation summaries
  const calculations = useMemo(() => {
    if (!activeRecipe?.items?.length) {
      return { totalRMCount: 0, baseCost: 0, wastageCost: 0, totalRMCost: 0 };
    }

    let baseCost = 0;
    let wastageCost = 0;

    activeRecipe.items.forEach((item) => {
      const qty = Number(item.quantity_per_unit) || 0;
      const rate = Number(item.standard_rate) || 0;
      const wastePct = Number(item.wastage_percentage) || 0;

      const lineBase = qty * rate;
      const lineWaste = lineBase * (wastePct / 100);

      baseCost += lineBase;
      wastageCost += lineWaste;
    });

    return {
      totalRMCount: activeRecipe.items.length,
      baseCost: Math.round(baseCost * 100) / 100,
      wastageCost: Math.round(wastageCost * 100) / 100,
      totalRMCost: Math.round((baseCost + wastageCost) * 100) / 100,
    };
  }, [activeRecipe]);

  // Add a raw material to the active recipe canvas
  const handleAddRMToRecipe = (rm) => {
    if (!activeRecipe) return;

    // Check if already in recipe
    const existingIndex = activeRecipe.items.findIndex((i) => i.rm_id === rm.id);
    if (existingIndex >= 0) {
      // Increment quantity slightly and highlight
      const updated = [...activeRecipe.items];
      updated[existingIndex].quantity_per_unit = Number((Number(updated[existingIndex].quantity_per_unit) + 1).toFixed(3));
      setActiveRecipe({ ...activeRecipe, items: updated });
      setHighlightedItemId(rm.id);
      setTimeout(() => setHighlightedItemId(null), 1500);
      return;
    }

    const newItem = {
      id: `new-${Date.now()}-${rm.id}`,
      rm_id: rm.id,
      rm_code: rm.rm_code,
      material_name: rm.material_name,
      unit_id: rm.unit_id || 1,
      unit_code: rm.unit_code || 'PCS',
      quantity_per_unit: 1,
      wastage_percentage: 2,
      scrap_factor: 0,
      standard_rate: Number(rm.standard_rate || 0),
      current_stock: Number(rm.current_stock ?? rm.available_stock ?? 0),
      mandatory: 1,
      sequence: activeRecipe.items.length + 1,
    };

    setActiveRecipe((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));

    setHighlightedItemId(rm.id);
    setTimeout(() => setHighlightedItemId(null), 1500);
  };

  const handleUpdateItem = (index, field, value) => {
    if (!activeRecipe) return;
    const updated = [...activeRecipe.items];
    updated[index] = { ...updated[index], [field]: value };
    setActiveRecipe({ ...activeRecipe, items: updated });
  };

  const handleRemoveItem = (index) => {
    if (!activeRecipe) return;
    const updated = activeRecipe.items.filter((_, i) => i !== index);
    // re-sequence
    const resequenced = updated.map((it, i) => ({ ...it, sequence: i + 1 }));
    setActiveRecipe({ ...activeRecipe, items: resequenced });
  };

  const handleSave = async () => {
    if (!activeRecipe) return;
    if (!activeRecipe.fg_id) {
      alert('Please select a Finished Good product.');
      return;
    }
    if (activeRecipe.items.length === 0) {
      alert('Recipe must contain at least one constituent Child Part.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        id: activeRecipe.id,
        fg_id: activeRecipe.fg_id,
        bom_name: activeRecipe.bom_name,
        version: activeRecipe.version,
        remarks: activeRecipe.remarks,
        items: activeRecipe.items.map((it, idx) => ({
          rm_id: it.rm_id,
          quantity_per_unit: Number(it.quantity_per_unit),
          unit_id: it.unit_id,
          wastage_percentage: Number(it.wastage_percentage || 0),
          scrap_factor: Number(it.scrap_factor || 0),
          mandatory: Number(it.mandatory ?? 1),
          sequence: idx + 1,
          remarks: it.remarks || '',
        })),
      });
      onClose();
    } catch (err) {
      // Toast handles error in parent
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !activeRecipe) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="relative w-full max-w-7xl bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* ========================================================= */}
        {/* TOP BAR / PLAYGROUND HEADER */}
        {/* ========================================================= */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
              <Icon name="layers" size="md" ariaHidden={true} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {activeRecipe.bom_code}
                </span>
                <span className="font-mono text-xs font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded border border-slate-300">
                  {activeRecipe.version}
                </span>
                <StatusBadge status={activeRecipe.status} size="xs" />
              </div>
              <h2 className="text-base font-bold text-slate-900 mt-1 flex items-center gap-2">
                {activeRecipe.id ? (
                  <span>
                    <span className="font-mono text-slate-500 font-semibold mr-1">[{activeRecipe.fg_code}]</span>
                    {activeRecipe.product_name}
                  </span>
                ) : (
                  <span>New BOM Recipe Playground</span>
                )}
              </h2>
            </div>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-4 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-600 block">Constituents</span>
                <span className="text-sm font-bold text-slate-900 font-mono">
                  {calculations.totalRMCount} Items
                </span>
              </div>
              <div className="h-7 w-[1px] bg-slate-200" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-600 block">Est. RM Cost / Unit</span>
                <span className="text-sm font-bold text-emerald-600 font-mono">
                  ₹{calculations.totalRMCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {activeRecipe.id && onForkVersion && (
              <button
                type="button"
                onClick={() => {
                  onForkVersion(activeRecipe.id);
                  onClose();
                }}
                className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Create a new version (e.g. V2) based on this recipe"
              >
                <Icon name="gitbranch" size="xs" ariaHidden={true} />
                <span>+ Fork Version</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Icon name="check" size="xs" ariaHidden={true} />
              <span>{isSaving ? 'Saving...' : 'Save Recipe'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <Icon name="close" size="sm" ariaHidden={true} />
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RECIPE METADATA SUB-BAR */}
        {/* ========================================================= */}
        <div className="px-6 py-3 bg-white border-b border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {!activeRecipe.id && (
            <div>
              <label className="block text-slate-700 font-bold mb-1">Target Finished Good (SKU) *</label>
              <select
                value={activeRecipe.fg_id}
                onChange={(e) => {
                  const selFG = finishedGoods.find((f) => f.id == e.target.value);
                  setActiveRecipe({
                    ...activeRecipe,
                    fg_id: e.target.value,
                    product_name: selFG?.product_name || '',
                    fg_code: selFG?.fg_code || '',
                  });
                }}
                className="w-full bg-slate-50 rounded-lg px-2.5 py-1.5 text-slate-900 border border-slate-300 font-medium"
              >
                <option value="">-- Select Finished Good --</option>
                {finishedGoods.map((fg) => (
                  <option key={fg.id} value={fg.id}>
                    [{fg.fg_code}] {fg.product_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className={activeRecipe.id ? 'col-span-1' : ''}>
            <label className="block text-slate-700 font-bold mb-1">Recipe Name *</label>
            <input
              type="text"
              value={activeRecipe.bom_name}
              onChange={(e) => setActiveRecipe({ ...activeRecipe, bom_name: e.target.value })}
              placeholder="e.g. Standard Casting & Machining Recipe"
              className="w-full bg-slate-50 rounded-lg px-2.5 py-1.5 text-slate-900 border border-slate-300 font-medium"
            />
          </div>

          <div className={activeRecipe.id ? 'col-span-2' : ''}>
            <label className="block text-slate-700 font-bold mb-1">Recipe Remarks / Specifications</label>
            <input
              type="text"
              value={activeRecipe.remarks}
              onChange={(e) => setActiveRecipe({ ...activeRecipe, remarks: e.target.value })}
              placeholder="e.g. Heat treatment and shot blasting required before CNC machining"
              className="w-full bg-slate-50 rounded-lg px-2.5 py-1.5 text-slate-900 border border-slate-300 font-medium"
            />
          </div>
        </div>

        {/* ========================================================= */}
        {/* MAIN PLAYGROUND WORKSPACE: 2-COLUMN SPLIT */}
        {/* ========================================================= */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          
          {/* ------------------------------------------------------- */}
          {/* LEFT COLUMN: RAW MATERIAL PALETTE (5 Cols)             */}
          {/* ------------------------------------------------------- */}
          <div className="lg:col-span-5 border-r border-slate-200 flex flex-col bg-slate-50/60 overflow-hidden">
            {/* Header & Search */}
            <div className="p-4 border-b border-slate-200 bg-white space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Icon name="boxes" size="xs" className="text-blue-600" ariaHidden={true} />
                  <span>Child Parts Palette</span>
                </span>
                <span className="text-[11px] text-slate-500 font-semibold">
                  {filteredRawMaterials.length} available
                </span>
              </div>

              {/* Search Box */}
              <div className="relative">
                <input
                  type="text"
                  value={searchRM}
                  onChange={(e) => setSearchRM(e.target.value)}
                  placeholder="Search material by name or code..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                />
                <span className="absolute left-2.5 top-2 text-slate-400">
                  <Icon name="search" size="xs" ariaHidden={true} />
                </span>
              </div>

              {/* Categories Pills */}
              {rmCategories.length > 2 && (
                <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
                  {rmCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2 py-0.5 rounded-md font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Scrollable Materials List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredRawMaterials.map((rm) => {
                const inRecipeItem = activeRecipe.items.find((i) => i.rm_id === rm.id);
                const isHighlighted = highlightedItemId === rm.id;

                return (
                  <div
                    key={rm.id}
                    className={`p-3 rounded-xl border transition-all bg-white hover:border-blue-300 hover:shadow-xs flex items-center justify-between gap-3 ${
                      isHighlighted ? 'ring-2 ring-blue-500 border-blue-400 bg-blue-50/30' : 'border-slate-200'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                          {rm.rm_code}
                        </span>
                        {inRecipeItem && (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                            In Recipe: {inRecipeItem.quantity_per_unit} {rm.unit_code}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-slate-900 mt-1 truncate" title={rm.material_name}>
                        {rm.material_name}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 font-medium">
                        <span>Stock: <strong className="text-slate-800 font-mono">{rm.current_stock ?? rm.available_stock ?? 0} {rm.unit_code}</strong></span>
                        <span>•</span>
                        <span>Rate: <strong className="text-slate-800 font-mono">₹{rm.standard_rate}</strong></span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddRMToRecipe(rm)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                        inRecipeItem
                          ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                          : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                      }`}
                      title={inRecipeItem ? 'Increase quantity in recipe' : 'Add to BOM Recipe'}
                    >
                      <Icon name="plus" size="xs" ariaHidden={true} />
                      <span>{inRecipeItem ? '+ Add More' : '+ Add'}</span>
                    </button>
                  </div>
                );
              })}

              {filteredRawMaterials.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <Icon name="search" size="lg" className="mx-auto mb-2 opacity-50" ariaHidden={true} />
                  <p>No child parts match your search.</p>
                </div>
              )}
            </div>
          </div>

          {/* ------------------------------------------------------- */}
          {/* RIGHT COLUMN: ACTIVE RECIPE CONSTITUENTS (7 Cols)       */}
          {/* ------------------------------------------------------- */}
          <div className="lg:col-span-7 flex flex-col bg-white overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Icon name="gitbranch" size="xs" className="text-emerald-600" ariaHidden={true} />
                  <span>Recipe Constituents (Per 1 Finished Good Unit)</span>
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Specify exact required quantities and expected wastage percentages.
                </p>
              </div>

              {activeRecipe.items.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveRecipe({ ...activeRecipe, items: [] })}
                  className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Constituents Table / Canvas */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {activeRecipe.items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-400 mb-3">
                    <Icon name="layers" size="lg" ariaHidden={true} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Recipe Canvas is Empty</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    Select child parts from the left palette to pick and assemble the recipe required to produce this Finished Good.
                  </p>
                </div>
              ) : (
                activeRecipe.items.map((item, idx) => {
                  const qty = Number(item.quantity_per_unit) || 0;
                  const rate = Number(item.standard_rate) || 0;
                  const waste = Number(item.wastage_percentage) || 0;
                  const grossQty = qty * (1 + waste / 100);
                  const lineCost = grossQty * rate;

                  return (
                    <div
                      key={item.id || idx}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 shadow-xs transition-all space-y-2.5"
                    >
                      {/* Item Top: Seq + RM Info + Delete */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-mono font-bold flex items-center justify-center border border-slate-200 shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                            {item.rm_code}
                          </span>
                          <span className="font-bold text-slate-900 text-xs truncate" title={item.material_name}>
                            {item.material_name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-mono font-bold text-emerald-700">
                            ₹{lineCost.toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Remove constituent from recipe"
                          >
                            <Icon name="trash" size="xs" ariaHidden={true} />
                          </button>
                        </div>
                      </div>

                      {/* Inputs Row: Qty, Unit, Waste %, Rate */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        {/* Required Qty */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                            Req. Qty *
                          </label>
                          <div className="flex items-center rounded-lg border border-slate-300 bg-slate-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500 overflow-hidden">
                            <input
                              type="number"
                              step="0.001"
                              min="0.001"
                              value={item.quantity_per_unit}
                              onChange={(e) => handleUpdateItem(idx, 'quantity_per_unit', e.target.value)}
                              className="w-full px-2 py-1 text-xs font-mono font-bold text-slate-900 bg-transparent border-none outline-none"
                            />
                            <span className="px-2 py-1 text-[11px] font-mono font-bold text-slate-500 bg-slate-100 border-l border-slate-200">
                              {item.unit_code}
                            </span>
                          </div>
                        </div>

                        {/* Wastage % */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                            Wastage %
                          </label>
                          <div className="flex items-center rounded-lg border border-slate-300 bg-slate-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500 overflow-hidden">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              value={item.wastage_percentage}
                              onChange={(e) => handleUpdateItem(idx, 'wastage_percentage', e.target.value)}
                              className="w-full px-2 py-1 text-xs font-mono font-semibold text-slate-900 bg-transparent border-none outline-none"
                            />
                            <span className="px-2 py-1 text-[11px] font-mono font-bold text-slate-500 bg-slate-100 border-l border-slate-200">
                              %
                            </span>
                          </div>
                        </div>

                        {/* Standard Rate (Read-only reference) */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                            Rate / Unit
                          </label>
                          <div className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-100/70 text-xs font-mono text-slate-700 flex items-center justify-between">
                            <span>₹{rate}</span>
                            <span className="text-[10px] text-slate-500 font-normal">/{item.unit_code}</span>
                          </div>
                        </div>

                        {/* Gross Qty needed */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                            Gross Needed
                          </label>
                          <div className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-100/70 text-xs font-mono font-bold text-slate-900">
                            {grossQty.toFixed(3)} {item.unit_code}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Footer with Summary and Action */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-600 block">Base RM Cost</span>
                  <span className="font-mono font-bold text-slate-800">
                    ₹{calculations.baseCost.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-600 block">Wastage Buffer</span>
                  <span className="font-mono font-bold text-amber-600">
                    +₹{calculations.wastageCost.toFixed(2)}
                  </span>
                </div>
                <div className="pl-3 border-l border-slate-300">
                  <span className="text-[10px] uppercase font-bold text-slate-600 block">Total Est. RM Cost / Unit</span>
                  <span className="font-mono font-bold text-base text-emerald-700">
                    ₹{calculations.totalRMCost.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Icon name="check" size="xs" ariaHidden={true} />
                  <span>{isSaving ? 'Saving Changes...' : 'Save BOM Recipe'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
