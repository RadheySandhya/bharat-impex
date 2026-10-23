import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import Icon from './Icon';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export function FullKittingModal({
  isOpen,
  onClose,
  batch, // { batch_no, fg_id, cat_no, item_name, quantity, release_id }
  onSuccess
}) {
  const { success, error, warning } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [kittingData, setKittingData] = useState(null);
  const [allowNegative, setAllowNegative] = useState(true);
  const [remarks, setRemarks] = useState('');
  const [customItems, setCustomItems] = useState([]);

  const batchNo = batch?.batch_no || batch?.release_number || '';
  const fgId = batch?.fg_id || 0;
  const catNo = batch?.cat_no || batch?.fg_code || '';
  const itemName = batch?.item_name || batch?.product_name || 'Finished Product';
  const qty = Number(batch?.quantity || batch?.release_quantity || batch?.qty_recd_casting || batch?.planned_quantity || 100);

  useEffect(() => {
    if (!isOpen || (!batchNo && !fgId && !catNo)) {
      setKittingData(null);
      return;
    }

    setLoading(true);
    api.production.getKittingPreview({
      fg_id: fgId,
      batch_no: batchNo,
      cat_no: catNo,
      quantity: qty,
      warehouse_id: 1 // Main RM Store
    })
      .then((res) => {
        if (res?.data) {
          setKittingData(res.data);
          setCustomItems(res.data.items ? JSON.parse(JSON.stringify(res.data.items)) : []);
        }
      })
      .catch((err) => {
        error(err.message || 'Failed to load kitting preview.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, batchNo, fgId, catNo, qty]);

  const handleQtyChange = (index, newQty) => {
    const next = [...customItems];
    next[index].total_required_qty = Number(newQty) || 0;
    setCustomItems(next);
  };

  const handleConfirmDeduction = async () => {
    if (!batchNo) {
      error('Batch number is missing.');
      return;
    }
    if (kittingData?.has_shortage && !allowNegative) {
      warning('One or more materials are in shortage. Please check "Shopfloor Override" to proceed.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.production.issueKitting({
        batch_no: batchNo,
        fg_id: fgId,
        quantity: qty,
        warehouse_id: 1, // Main RM Store
        items: customItems,
        custom_items: customItems,
        remarks: remarks || `Upfront Full Kitting RM deduction for Batch #${batchNo}`,
        allow_override: allowNegative,
        allow_shortage_override: allowNegative
      });

      if (res?.data?.already_issued) {
        warning(`Child parts for Batch #${batchNo} were already deducted.`);
      } else {
        success(`🎉 Full Kitting Completed! Child parts deducted upfront for Batch #${batchNo}.`);
      }

      if (onSuccess) {
        onSuccess(res?.data);
      }
      onClose();
    } catch (err) {
      error(err.message || 'Failed to deduct child parts.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Full Kitting (Upfront RM Deduction) — Batch #${batchNo || '—'}`}
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
          >
            Cancel / Close
          </button>
          {kittingData?.already_deducted ? (
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
              <Icon name="check" size="xs" ariaHidden={true} />
              <span>Already Deducted</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleConfirmDeduction}
              disabled={submitting || loading}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <Icon name="boxes" size="xs" ariaHidden={true} />
              <span>{submitting ? 'Deducting Stock...' : 'Confirm & Deduct RM Stock Now'}</span>
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {/* Batch Info Card */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-blue-700 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                Batch #{batchNo}
              </span>
              {catNo && (
                <span className="text-[10px] font-mono text-slate-500 font-bold">
                  CAT #{catNo}
                </span>
              )}
            </div>
            <h3 className="font-extrabold text-slate-900 text-sm mt-1">{itemName}</h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Source: <span className="font-semibold text-slate-700">WH-MAIN Main Child Part & RM Store</span>
            </p>
          </div>
          <div className="text-right sm:border-l sm:border-slate-200 sm:pl-4">
            <span className="text-[10px] text-slate-500 font-bold uppercase block">Production Lot</span>
            <span className="text-lg font-black font-mono text-slate-900">{qty.toLocaleString()} PCS</span>
          </div>
        </div>

        {/* Already Deducted Notice */}
        {kittingData?.already_deducted && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 flex items-start gap-2.5">
            <Icon name="check" size="sm" className="text-emerald-600 shrink-0 mt-0.5" ariaHidden={true} />
            <div>
              <h4 className="font-bold text-xs">Child Parts Already Issued & Deducted</h4>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                The child part stock for this batch was already deducted from the inventory ledger upon initial production release. No duplicate deduction is required.
              </p>
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="py-8 text-center text-slate-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mb-2" />
            <p className="text-xs font-semibold">Calculating BOM Child Part Requirements...</p>
          </div>
        )}

        {/* Requirements Table */}
        {!loading && kittingData && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Icon name="package" size="xs" className="text-indigo-600" ariaHidden={true} />
                <span>Required Child Parts & Consumption List</span>
              </h4>
              <span className="text-[11px] font-mono text-slate-500">
                Est. Material Value: <strong className="text-slate-900">₹{Number(kittingData.total_estimated_cost || 0).toFixed(2)}</strong>
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 border-b border-slate-200 text-[10px] font-black text-slate-600 uppercase tracking-wider">
                    <th className="py-2.5 px-3">RM Code</th>
                    <th className="py-2.5 px-3">Material Name</th>
                    <th className="py-2.5 px-3 text-right">Required Qty</th>
                    <th className="py-2.5 px-3 text-right">Available in Store</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap min-w-[130px]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {customItems.map((item, idx) => {
                    const reqQty = Number(item.total_required_qty || 0);
                    const availStock = Number(item.available_stock || 0);
                    const isSufficient = availStock >= reqQty;
                    const shortageDeficit = reqQty - availStock;

                    return (
                      <tr 
                        key={item.rm_id || idx} 
                        className={`transition-colors ${isSufficient ? 'hover:bg-slate-50/70' : 'bg-rose-50/30 hover:bg-rose-50/60'}`}
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          {item.rm_code}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-slate-900">{item.material_name}</span>
                          {item.sub_part_name && (
                            <div className="mt-0.5">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                <span>Variant:</span>
                                <strong>[{item.sub_part_brand || 'OEM'}]</strong>
                                <span>{item.sub_part_name}</span>
                              </span>
                            </div>
                          )}
                          {item.quantity_per_unit && (
                            <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                              ({Number(item.quantity_per_unit).toFixed(3)} {item.unit_code}/unit)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <input
                              type="number"
                              step="0.001"
                              value={item.total_required_qty}
                              onChange={(e) => handleQtyChange(idx, e.target.value)}
                              disabled={kittingData?.already_deducted}
                              className="w-24 text-right font-mono font-black bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 shadow-2xs"
                            />
                            <span className="font-bold text-slate-500 text-[11px]">{item.unit_code}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          <span className={`font-bold ${isSufficient ? 'text-slate-800' : 'text-rose-600 font-black'}`}>
                            {availStock.toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold ml-1">{item.unit_code}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {isSufficient ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs whitespace-nowrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>Available</span>
                            </span>
                          ) : (
                            <span 
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-300 shadow-2xs whitespace-nowrap" 
                              title={`Shortage of ${shortageDeficit.toFixed(2)} ${item.unit_code}`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              <span>Shortage (-{shortageDeficit.toLocaleString('en-IN', { maximumFractionDigits: 1 })})</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Shortage notice if any */}
            {kittingData.has_shortage && !kittingData.already_deducted && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-2">
                <Icon name="alert" size="xs" className="text-amber-600 shrink-0 mt-0.5" ariaHidden={true} />
                <div className="space-y-1">
                  <p className="text-[11px] font-bold">Store Notice: One or more child parts have insufficient recorded balance.</p>
                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={allowNegative}
                      onChange={(e) => setAllowNegative(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-blue-600 border-amber-300"
                    />
                    <span className="text-[11px] font-semibold text-slate-800">
                      Shopfloor Override: Allow stock deduction now (e.g. pending vendor GRN / inward entry)
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Remarks input */}
            {!kittingData.already_deducted && (
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[11px]">Kitting Issue Remarks (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Issued to Casting Furnace 1, shift A"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default FullKittingModal;
