import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import Icon from './Icon';
import { api } from '../../services/api';

export function StageHandoffModal({ 
  isOpen, 
  onClose, 
  row, 
  stageKey, // stage identifier or dynamic process code
  stagesFlow, // optional dynamic route sequence
  onConfirm 
}) {
  if (!isOpen || !row) return null;

  // Default Fallback Stages definition
  const DEFAULT_STAGES_FLOW = [
    { key: 'casting', name: 'Gravity Casting', nextKey: 'machining', nextName: 'CNC Machining (M/C)' },
    { key: 'machining', name: 'CNC Machining (M/C)', nextKey: 'lp', nextName: 'Lathe & Polish (LP)' },
    { key: 'lp', name: 'Lathe & Polish (LP)', nextKey: 'cp', nextName: 'Chrome Plating (CP)' },
    { key: 'cp', name: 'Chrome Plating (CP)', nextKey: 'assembly', nextName: 'Assembly & Testing' },
    { key: 'assembly', name: 'Assembly & Testing', nextKey: 'ready', nextName: 'Ready FG Stock' },
  ];

  const effectiveFlow = (stagesFlow && stagesFlow.length > 0) ? stagesFlow : DEFAULT_STAGES_FLOW;
  const currentStageInfo = effectiveFlow.find(s => s.key === stageKey) || effectiveFlow[0];
  const isFinalToReady = currentStageInfo.nextKey === 'ready';

  // Current stage stats
  const stageData = row.stages ? (row.stages[stageKey] || {}) : (row[stageKey] || {});
  const currentAvailable = Number(
    stageData.prod_qty || stageData.recd_store || row.qty_recd_casting || 100
  );

  // Form State
  const [goodQty, setGoodQty] = useState(currentAvailable);
  const [rejQty, setRejQty] = useState(0);
  const [rejReason, setRejReason] = useState('Blow Hole / Porosity');
  const [disposition, setDisposition] = useState('REWORK'); // 'REWORK' or 'RECAST_SCRAP'
  const [reworkStage, setReworkStage] = useState(stageKey);
  const [operatorName, setOperatorName] = useState('Supervisor / Operator');
  const [remarks, setRemarks] = useState('');
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(3); // Default WH-FG

  useEffect(() => {
    setGoodQty(currentAvailable);
    setRejQty(0);
  }, [currentAvailable, stageKey]);

  useEffect(() => {
    if (isOpen && isFinalToReady) {
      api.settings.getWarehouses()
        .then((res) => {
          const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
          if (list.length > 0) {
            setWarehouses(list);
            const fgWh = list.find((w) => w.warehouse_code === 'WH-FG' || w.warehouse_name.toLowerCase().includes('finish') || w.is_default);
            if (fgWh) {
              setSelectedWarehouseId(fgWh.id);
            } else {
              setSelectedWarehouseId(list[0].id);
            }
          }
        })
        .catch((err) => {
          console.warn('Could not fetch warehouses:', err);
        });
    }
  }, [isOpen, isFinalToReady]);

  const handleGoodChange = (val) => {
    const g = Number(val) || 0;
    setGoodQty(g);
    if (g + rejQty > currentAvailable) {
      setRejQty(Math.max(0, currentAvailable - g));
    }
  };

  const handleRejChange = (val) => {
    const r = Number(val) || 0;
    setRejQty(r);
    if (goodQty + r > currentAvailable) {
      setGoodQty(Math.max(0, currentAvailable - r));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onConfirm) {
      onConfirm({
        rowId: row.id,
        stageKey,
        nextStageKey: currentStageInfo.nextKey,
        goodQty: Number(goodQty),
        rejQty: Number(rejQty),
        rejReason,
        disposition, // 'REWORK' or 'RECAST_SCRAP'
        reworkStage: disposition === 'REWORK' ? reworkStage : null,
        operatorName,
        remarks,
        warehouseId: isFinalToReady ? Number(selectedWarehouseId) : null,
        scrapWeightKg: (Number(rejQty) * (Number(row.avg_weight) || 0.35)).toFixed(3)
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
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
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
            <span className="text-[10px] text-slate-500 font-bold uppercase block">Current Qty</span>
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
            <p className="text-[10px] text-emerald-700 font-medium mt-1">Moves to next stage queue</p>
          </div>

          <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3">
            <label className="block text-[11px] font-bold text-rose-900 mb-1">
              ✗ Defect / Rejection Qty
            </label>
            <input
              type="number"
              min="0"
              max={currentAvailable}
              value={rejQty}
              onChange={(e) => handleRejChange(e.target.value)}
              className="w-full bg-white border border-rose-300 rounded-lg px-3 py-2 text-rose-900 font-mono font-black text-base focus:ring-2 focus:ring-rose-500"
            />
            <p className="text-[10px] text-rose-700 font-medium mt-1">Logged to Scrap / Rework Hub</p>
          </div>
        </div>

        {/* Rejection Details & Dual Rework Disposition (Visible when rejQty > 0) */}
        {rejQty > 0 && (
          <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
              <span className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                <Icon name="alert" size="xs" className="text-amber-600" ariaHidden={true} />
                Rejection Disposition Plan ({rejQty} PCS)
              </span>
              <span className="text-[10px] font-mono text-amber-800 font-bold">
                ≈ {(rejQty * (Number(row.avg_weight) || 0.35)).toFixed(2)} KG Scrap
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Defect Reason</label>
              <select
                value={rejReason}
                onChange={(e) => setRejReason(e.target.value)}
                className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-amber-500"
              >
                <option value="Blow Hole / Porosity">Blow Hole / Porosity (Casting)</option>
                <option value="Tool Break / Undercut">Tool Break / Undercut (Machining)</option>
                <option value="Thread Slip / Burr">Thread Slip / Burr (Machining)</option>
                <option value="Buffing Dent / Scratches">Buffing Dent / Scratches (Polish)</option>
                <option value="Plating Blister / Color Peel">Plating Blister / Color Peel (CP)</option>
                <option value="Assembly Leak / Pressure Drop">Assembly Leak / Pressure Drop (QC)</option>
              </select>
            </div>

            {/* Disposition Selector: Stage Rework vs Foundry Recast */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">How will this rejected lot be handled?</label>
              <div className="grid grid-cols-2 gap-2">
                <label
                  className={`p-2.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                    disposition === 'REWORK'
                      ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-xs ring-2 ring-blue-500/20'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <input
                      type="radio"
                      name="disposition"
                      value="REWORK"
                      checked={disposition === 'REWORK'}
                      onChange={() => setDisposition('REWORK')}
                      className="text-blue-600"
                    />
                    <span>1. Stage Rework (Minor)</span>
                  </div>
                  <p className="text-[10px] mt-1 text-slate-500 font-medium">
                    Fix by re-buffing, re-plating or re-machining. Returns to batch.
                  </p>
                </label>

                <label
                  className={`p-2.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                    disposition === 'RECAST_SCRAP'
                      ? 'bg-rose-50 border-rose-400 text-rose-900 shadow-xs ring-2 ring-rose-500/20'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <input
                      type="radio"
                      name="disposition"
                      value="RECAST_SCRAP"
                      checked={disposition === 'RECAST_SCRAP'}
                      onChange={() => setDisposition('RECAST_SCRAP')}
                      className="text-rose-600"
                    />
                    <span>2. Melt & Recast (Furnace)</span>
                  </div>
                  <p className="text-[10px] mt-1 text-slate-500 font-medium">
                    Unrecoverable defect. Melt back into raw brass furnace stock.
                  </p>
                </label>
              </div>
            </div>

            {disposition === 'REWORK' && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Rework Stage</label>
                <select
                  value={reworkStage}
                  onChange={(e) => setReworkStage(e.target.value)}
                  className="w-full bg-white border border-blue-300 rounded-xl px-3 py-1.5 text-slate-900 font-semibold"
                >
                  <option value="casting">Gravity Casting (Touch-up)</option>
                  <option value="machining">CNC Machining (Re-threading / Trim)</option>
                  <option value="lp">Lathe & Buffing (Re-polish)</option>
                  <option value="cp">Chrome Plating (Stripping & Re-plating)</option>
                </select>
              </div>
            )}
          </div>
        )}

        {/* Destination FG Warehouse Selection (When transferring to Ready FG Stock) */}
        {isFinalToReady && (
          <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-3.5 space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <Icon name="warehouse" size="xs" className="text-indigo-600" ariaHidden={true} />
                <span>Destination Finished Goods Warehouse / Store</span>
              </label>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-md">
                Stores {goodQty} PCS
              </span>
            </div>
            <p className="text-[11px] text-indigo-800">
              Select which warehouse or storage location will receive this finished lot into live inventory.
            </p>
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(Number(e.target.value))}
              className="w-full bg-white border border-indigo-300 rounded-xl px-3 py-2 text-slate-900 font-bold text-xs focus:ring-2 focus:ring-indigo-500"
            >
              {warehouses.length > 0 ? (
                warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.warehouse_name} ({wh.warehouse_code}) {wh.is_default ? '★ Default' : ''}
                  </option>
                ))
              ) : (
                <option value={3}>WH-FG Finished Goods Dispatch Hub (Default)</option>
              )}
            </select>
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
