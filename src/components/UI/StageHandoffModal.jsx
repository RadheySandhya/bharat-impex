import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from './Modal';
import Icon from './Icon';
import SearchableSelect from './SearchableSelect';
import { api } from '../../services/api';

// Default Fallback Stages definition
const DEFAULT_STAGES_FLOW = [
  { key: 'casting', name: 'Gravity Casting', nextKey: 'machining', nextName: 'CNC Machining (M/C)' },
  { key: 'machining', name: 'CNC Machining (M/C)', nextKey: 'lp', nextName: 'Lathe & Polish (LP)' },
  { key: 'lp', name: 'Lathe & Polish (LP)', nextKey: 'cp', nextName: 'Chrome Plating (CP)' },
  { key: 'cp', name: 'Chrome Plating (CP)', nextKey: 'assembly', nextName: 'Assembly & Testing' },
  { key: 'assembly', name: 'Assembly & Testing', nextKey: 'ready', nextName: 'Ready FG Stock' },
];

const DEFECT_REASONS = [
  'Blow Hole / Porosity',
  'Crack / Shrinkage',
  'Tool Break / Undercut',
  'Thread Slip / Burr',
  'Dimension Out of Tolerance',
  'Buffing Dent / Scratches',
  'Plating Blister / Color Peel',
  'Assembly Leak / Pressure Drop',
];

export function StageHandoffModal({
  isOpen,
  onClose,
  row,
  stageKey, // stage identifier or dynamic process code
  stagesFlow, // optional dynamic route sequence
  onConfirm
}) {
  const effectiveFlow = (stagesFlow && stagesFlow.length > 0) ? stagesFlow : DEFAULT_STAGES_FLOW;
  const currentStageInfo = effectiveFlow.find((s) => s.key === stageKey) || effectiveFlow[0];
  const isFinalToReady = currentStageInfo?.nextKey === 'ready';

  // Current stage stats: pieces still waiting at this stage
  const stageData = row ? (row.stages ? (row.stages[stageKey] || {}) : (row[stageKey] || {})) : {};
  const balance = Number(stageData.bal);
  const currentAvailable = Number(
    (Number.isFinite(balance) && balance > 0 ? balance : null) ??
    (stageData.prod_qty || stageData.recd_store || row?.qty_recd_casting || 0)
  );
  const avgWeight = Number(row?.avg_weight) || 0.35;

  // Form State
  const [goodQty, setGoodQty] = useState(currentAvailable);
  const [rejQty, setRejQty] = useState(0);
  const [minorQty, setMinorQty] = useState(0);
  const [rejReason, setRejReason] = useState(DEFECT_REASONS[0]);
  const [returnStage, setReturnStage] = useState(stageKey);
  const [operatorName, setOperatorName] = useState('Supervisor / Operator');
  const [remarks, setRemarks] = useState('');
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');

  const furnaceQty = Math.max(0, rejQty - minorQty);

  useEffect(() => {
    setGoodQty(currentAvailable);
    setRejQty(0);
    setMinorQty(0);
    setReturnStage(stageKey);
    setRemarks('');
  }, [currentAvailable, stageKey, row?.id]);

  useEffect(() => {
    if (isOpen && isFinalToReady) {
      api.settings.getWarehouses()
        .then((res) => {
          const list = (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []))
            .filter((w) => w.active === undefined || Number(w.active) === 1);
          setWarehouses(list);
          let saved = '';
          try { saved = localStorage.getItem('bharat_fg_output_godown') || ''; } catch (e) {}
          const pick = list.find((w) => String(w.id) === saved)
            || list.find((w) => w.warehouse_code === 'WH-FG' || (w.warehouse_name || '').toLowerCase().includes('finish'))
            || list.find((w) => Number(w.is_default) === 1)
            || list[0];
          if (pick) setSelectedWarehouseId(String(pick.id));
        })
        .catch((err) => console.warn('Could not fetch warehouses:', err));
    }
  }, [isOpen, isFinalToReady]);

  const returnStageOptions = useMemo(
    () => effectiveFlow.map((s) => ({ key: s.key, name: s.name })),
    [effectiveFlow]
  );

  if (!isOpen || !row) return null;

  const handleGoodChange = (val) => {
    const g = Math.max(0, Number(val) || 0);
    setGoodQty(g);
    if (g + rejQty > currentAvailable) {
      const r = Math.max(0, currentAvailable - g);
      setRejQty(r);
      setMinorQty((m) => Math.min(m, r));
    }
  };

  const handleRejChange = (val) => {
    const r = Math.max(0, Number(val) || 0);
    setRejQty(r);
    setMinorQty((m) => Math.min(m, r));
    if (goodQty + r > currentAvailable) {
      setGoodQty(Math.max(0, currentAvailable - r));
    }
  };

  const handleMinorChange = (val) => {
    const m = Math.max(0, Math.min(rejQty, Number(val) || 0));
    setMinorQty(m);
  };

  const handleFurnaceChange = (val) => {
    const f = Math.max(0, Math.min(rejQty, Number(val) || 0));
    setMinorQty(rejQty - f);
  };

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    if (goodQty + rejQty <= 0) return;
    if (isFinalToReady && goodQty > 0 && !selectedWarehouseId && warehouses.length > 0) return;

    const returnStageName = returnStageOptions.find((s) => s.key === returnStage)?.name || currentStageInfo.name;
    const rejectionSplits = [];
    if (minorQty > 0) {
      rejectionSplits.push({
        disposition: 'MINOR',
        quantity: Number(minorQty),
        return_stage_key: returnStage,
        return_stage_name: returnStageName,
      });
    }
    if (furnaceQty > 0) {
      rejectionSplits.push({ disposition: 'FURNACE', quantity: Number(furnaceQty) });
    }

    if (isFinalToReady && selectedWarehouseId) {
      try { localStorage.setItem('bharat_fg_output_godown', String(selectedWarehouseId)); } catch (err) {}
    }

    if (onConfirm) {
      onConfirm({
        rowId: row.id,
        stageKey,
        stageName: currentStageInfo.name,
        nextStageKey: currentStageInfo.nextKey,
        goodQty: Number(goodQty),
        rejQty: Number(rejQty),
        minorQty: Number(minorQty),
        furnaceQty: Number(furnaceQty),
        rejectionSplits,
        rejReason,
        // legacy single disposition flag (kept for callers that still read it)
        disposition: minorQty > 0 && furnaceQty > 0 ? 'MIXED' : (minorQty > 0 ? 'REWORK' : 'RECAST_SCRAP'),
        reworkStage: minorQty > 0 ? returnStage : null,
        operatorName,
        remarks,
        warehouseId: isFinalToReady ? Number(selectedWarehouseId) || null : null,
        scrapWeightKg: (Number(furnaceQty) * avgWeight).toFixed(3)
      });
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Stage Handoff: ${currentStageInfo.name} → ${currentStageInfo.nextName}`}
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={goodQty + rejQty <= 0}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <Icon name="check" size="xs" ariaHidden={true} />
            <span>Confirm & Send to {currentStageInfo.nextName}</span>
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Batch & SKU Banner */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
              Batch #{row.batch_no} • Cat #{row.cat_no || '—'}
            </span>
            <h4 className="font-extrabold text-slate-900 text-sm mt-0.5">{row.item_name}</h4>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-500 font-bold uppercase block">Pending at stage</span>
            <span className="text-base font-black font-mono text-slate-900">{currentAvailable} PCS</span>
          </div>
        </div>

        {/* Good Qty vs Rejection Qty Inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3">
            <label className="block text-[11px] font-bold text-emerald-900 mb-1">
              ✓ Good Quantity (Passed)
            </label>
            <input
              type="number"
              min="0"
              max={currentAvailable}
              value={goodQty}
              onChange={(e) => handleGoodChange(e.target.value)}
              className="w-full bg-white border border-emerald-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-black text-base focus:ring-2 focus:ring-emerald-500"
              required
            />
            <p className="text-[10px] text-emerald-700 font-medium mt-1">Moves to {currentStageInfo.nextName}</p>
          </div>

          <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3">
            <label className="block text-[11px] font-bold text-rose-900 mb-1">
              ✗ Total Rejection Qty
            </label>
            <input
              type="number"
              min="0"
              max={currentAvailable}
              value={rejQty}
              onChange={(e) => handleRejChange(e.target.value)}
              className="w-full bg-white border border-rose-300 rounded-lg px-3 py-2 text-rose-900 font-mono font-black text-base focus:ring-2 focus:ring-rose-500"
            />
            <p className="text-[10px] text-rose-700 font-medium mt-1">Split below: minor rework / furnace</p>
          </div>
        </div>

        {/* Rejection split: minor defect vs furnace */}
        {rejQty > 0 && (
          <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
              <span className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                <Icon name="alert" size="xs" className="text-amber-600" ariaHidden={true} />
                What happens to the {rejQty} rejected PCS?
              </span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setMinorQty(rejQty)} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white border border-blue-300 text-blue-700 hover:bg-blue-50 cursor-pointer">
                  All Minor
                </button>
                <button type="button" onClick={() => setMinorQty(0)} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 cursor-pointer">
                  All Furnace
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Defect Reason</label>
              <select
                value={rejReason}
                onChange={(e) => setRejReason(e.target.value)}
                className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-amber-500"
              >
                {DEFECT_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className={`p-2.5 rounded-xl border ${minorQty > 0 ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500/20' : 'bg-white border-slate-200'}`}>
                <label className="block font-bold text-blue-900 text-xs mb-1">1. Minor Defect (Rework)</label>
                <input
                  type="number"
                  min="0"
                  max={rejQty}
                  value={minorQty}
                  onChange={(e) => handleMinorChange(e.target.value)}
                  className="w-full bg-white border border-blue-300 rounded-lg px-2.5 py-1.5 font-mono font-black text-sm text-blue-900"
                  aria-label="Minor defect quantity"
                />
                <p className="text-[10px] mt-1 text-slate-500 font-medium">Repaired, then returned to production.</p>
              </div>
              <div className={`p-2.5 rounded-xl border ${furnaceQty > 0 ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-500/20' : 'bg-white border-slate-200'}`}>
                <label className="block font-bold text-rose-900 text-xs mb-1">2. Furnace (Melt & Recast)</label>
                <input
                  type="number"
                  min="0"
                  max={rejQty}
                  value={furnaceQty}
                  onChange={(e) => handleFurnaceChange(e.target.value)}
                  className="w-full bg-white border border-rose-300 rounded-lg px-2.5 py-1.5 font-mono font-black text-sm text-rose-900"
                  aria-label="Furnace quantity"
                />
                <p className="text-[10px] mt-1 text-slate-500 font-medium">
                  ≈ {(furnaceQty * avgWeight).toFixed(2)} kg scrap to furnace.
                </p>
              </div>
            </div>

            {minorQty > 0 && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">After rework, return the {minorQty} PCS to stage</label>
                <select
                  value={returnStage}
                  onChange={(e) => setReturnStage(e.target.value)}
                  className="w-full bg-white border border-blue-300 rounded-xl px-3 py-1.5 text-slate-900 font-semibold"
                >
                  {returnStageOptions.map((s) => (
                    <option key={s.key} value={s.key}>{s.name}{s.key === stageKey ? ' (this stage)' : ''}</option>
                  ))}
                </select>
              </div>
            )}

            <p className="text-[10px] text-amber-800 font-medium">
              Each part is tracked as a rejection lot in <strong>Rejection & Scrap Stock</strong> and moves through the steps of its rejection process.
            </p>
          </div>
        )}

        {/* Destination FG Warehouse Selection (When transferring to Ready FG Stock) */}
        {isFinalToReady && (
          <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <Icon name="warehouse" size="xs" className="text-indigo-600" ariaHidden={true} />
                <span>Store finished goods in godown</span>
              </label>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-md">
                Stores {goodQty} PCS
              </span>
            </div>
            <SearchableSelect
              value={selectedWarehouseId}
              onChange={(val) => setSelectedWarehouseId(String(val))}
              placeholder="-- Choose Godown --"
              searchPlaceholder="Search godown by name or code..."
              className="w-full"
              buttonClassName="bg-white border border-indigo-300 rounded-xl px-3 py-2 text-slate-900 font-bold text-xs"
              options={warehouses.map((wh) => ({
                value: String(wh.id),
                label: `${wh.warehouse_name}${Number(wh.is_default) === 1 ? ' ★ Default' : ''}`,
                sublabel: wh.warehouse_code
              }))}
            />
          </div>
        )}

        {/* Supervisor / Remarks */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Supervisor / Operator</label>
            <input
              type="text"
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Handoff Remarks (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Cleared for M/C line 2"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default StageHandoffModal;
