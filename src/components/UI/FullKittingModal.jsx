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
  const [subChildParts, setSubChildParts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [sourceWarehouseId, setSourceWarehouseId] = useState(() => {
    try { return localStorage.getItem('bharat_kitting_godown') || ''; } catch (e) { return ''; }
  });

  useEffect(() => {
    if (!isOpen) return;
    api.settings.getWarehouses()
      .then((res) => {
        const list = (Array.isArray(res?.data) ? res.data : []).filter((w) => w.active === undefined || Number(w.active) === 1);
        setWarehouses(list);
        setSourceWarehouseId((prev) => (list.some((w) => String(w.id) === String(prev)) ? prev : (list[0] ? String(list[0].id) : '1')));
      })
      .catch(() => setSourceWarehouseId((prev) => prev || '1'));
  }, [isOpen]);

  const changeSourceWarehouse = (val) => {
    setSourceWarehouseId(val);
    try { localStorage.setItem('bharat_kitting_godown', val); } catch (e) {}
  };
  const sourceWarehouse = warehouses.find((w) => String(w.id) === String(sourceWarehouseId));

  const batchNo = batch?.batch_no || batch?.release_number || '';
  const fgId = batch?.fg_id || 0;
  const catNo = batch?.cat_no || batch?.fg_code || '';
  const itemName = batch?.item_name || batch?.product_name || 'Finished Product';
  const qty = Number(batch?.quantity || batch?.release_quantity || batch?.qty_recd_casting || batch?.planned_quantity || 100);

  useEffect(() => {
    if (isOpen) {
      api.subChildParts.getAll()
        .then(res => setSubChildParts(res.data?.sub_child_parts || []))
        .catch(err => console.warn('Failed to load sub-child parts in FullKittingModal:', err));
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || (!batchNo && !fgId && !catNo)) {
      setKittingData(null);
      return;
    }
    if (!sourceWarehouseId) return;

    setLoading(true);
    api.production.getKittingPreview({
      fg_id: fgId,
      batch_no: batchNo,
      cat_no: catNo,
      quantity: qty,
      warehouse_id: Number(sourceWarehouseId)
    })
      .then((res) => {
        if (res?.data) {
          setKittingData(res.data);
          let itemsToSet = res.data.items ? JSON.parse(JSON.stringify(res.data.items)) : [];
          if (res.data?.kitting_details && Array.isArray(res.data.kitting_details)) {
            itemsToSet = itemsToSet.map(it => {
              const saved = res.data.kitting_details.find(d => Number(d.rm_id) === Number(it.rm_id));
              if (saved) {
                return {
                  ...it,
                  sub_child_part_id: saved.sub_child_part_id ?? it.sub_child_part_id,
                  sub_part_name: saved.sub_part_name ?? it.sub_part_name,
                  sub_part_brand: saved.sub_part_brand ?? it.sub_part_brand,
                };
              }
              return it;
            });
          }
          setCustomItems(itemsToSet);
        }
      })
      .catch((err) => {
        error(err.message || 'Failed to load kitting preview.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, batchNo, fgId, catNo, qty, sourceWarehouseId]);

  const handleQtyChange = (index, newQty) => {
    const next = [...customItems];
    next[index].total_required_qty = Number(newQty) || 0;
    setCustomItems(next);
  };

  // Sub-child parts (types) mapped under a child part — from the preview (with godown stock), else master list
  const variantsFor = (item) => {
    if (Array.isArray(item?.variants) && item.variants.length > 0) return item.variants;
    return subChildParts.filter((s) => Number(s.parent_rm_id) === Number(item?.rm_id));
  };

  const handleVariantChange = (index, subChildPartId) => {
    const next = [...customItems];
    const scp = variantsFor(next[index]).find(s => String(s.id) === String(subChildPartId));
    next[index] = {
      ...next[index],
      sub_child_part_id: subChildPartId ? Number(subChildPartId) : null,
      sub_part_name: scp ? scp.sub_part_name : null,
      sub_part_brand: scp ? scp.brand_name : null,
    };
    setCustomItems(next);
  };

  // Use two (or more) types for one child part, e.g. 60 of Handle A + 40 of Handle B
  const handleSplitRow = (index) => {
    const next = [...customItems];
    const row = next[index];
    const total = Number(row.total_required_qty || 0);
    const first = Math.ceil(total / 2);
    next[index] = { ...row, total_required_qty: first };
    next.splice(index + 1, 0, {
      ...row,
      total_required_qty: Math.max(0, total - first),
      sub_child_part_id: null,
      sub_part_name: null,
      sub_part_brand: null,
      is_split: true,
    });
    setCustomItems(next);
  };

  const handleRemoveSplitRow = (index) => {
    const next = [...customItems];
    const removed = next[index];
    next.splice(index, 1);
    // give the quantity back to the previous line of the same child part
    for (let i = index - 1; i >= 0; i--) {
      if (Number(next[i].rm_id) === Number(removed.rm_id)) {
        next[i] = { ...next[i], total_required_qty: Number(next[i].total_required_qty || 0) + Number(removed.total_required_qty || 0) };
        break;
      }
    }
    setCustomItems(next);
  };

  // After kitting, show exactly what was issued (including split lines) from the saved details
  const displayItems = (kittingData?.already_deducted && Array.isArray(kittingData?.kitting_details) && kittingData.kitting_details.length > 0)
    ? kittingData.kitting_details.map((d) => {
        const base = customItems.find((c) => Number(c.rm_id) === Number(d.rm_id)) || {};
        return { ...base, ...d, total_required_qty: Number(d.qty_deducted ?? base.total_required_qty ?? 0), unit_code: d.unit_code || base.unit_code };
      })
    : customItems;

  const missingVariantRows = customItems.filter(
    (it) => variantsFor(it).length > 0 && !it.sub_child_part_id && Number(it.total_required_qty || 0) > 0
  );

  const handleConfirmDeduction = async () => {
    if (!batchNo) {
      error('Batch number is missing.');
      return;
    }
    if (missingVariantRows.length > 0) {
      error(`Please choose which type to use for: ${[...new Set(missingVariantRows.map((r) => r.material_name))].join(', ')}`);
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
        warehouse_id: Number(sourceWarehouseId) || 1,
        items: customItems,
        custom_items: customItems,
        remarks: remarks || `Upfront Full Kitting RM deduction for Batch #${batchNo}`,
        allow_override: allowNegative,
        allow_shortage_override: allowNegative
      });

      if (res?.data?.already_issued) {
        warning(`Child parts for Batch #${batchNo} were already deducted.`);
      } else {
        success(`Full Kitting completed. Child parts deducted upfront for Batch #${batchNo}.`);
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
      maxWidth="max-w-4xl"
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
              title={missingVariantRows.length > 0 ? 'Choose the sub-child part type for every highlighted line first' : undefined}
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
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 font-medium">
              <span>Issue child parts from godown:</span>
              {warehouses.length > 0 ? (
                <select
                  value={sourceWarehouseId}
                  onChange={(e) => changeSourceWarehouse(e.target.value)}
                  disabled={kittingData?.already_deducted}
                  className="text-[11px] font-bold bg-white border border-slate-300 rounded-md px-1.5 py-0.5 text-slate-800 cursor-pointer"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.warehouse_name}</option>
                  ))}
                </select>
              ) : (
                <span className="font-semibold text-slate-700">{sourceWarehouse?.warehouse_name || 'Main Store'}</span>
              )}
            </div>
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
                    <th className="py-2.5 px-3 min-w-[200px]">Child Part Variety / Brand</th>
                    <th className="py-2.5 px-3 text-right">Required Qty</th>
                    <th className="py-2.5 px-3 text-right">Available in Store</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap min-w-[130px]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {displayItems.map((item, idx) => {
                    const reqQty = Number(item.total_required_qty ?? item.qty_deducted ?? 0);
                    const matchingVariants = variantsFor(item);
                    const chosenVariant = item.sub_child_part_id
                      ? matchingVariants.find((v) => String(v.id) === String(item.sub_child_part_id))
                      : null;
                    // When a type is chosen, its own godown balance is what gets issued
                    const variantAvail = chosenVariant && chosenVariant.available_in_warehouse !== undefined
                      ? Number(chosenVariant.available_in_warehouse || 0)
                      : null;
                    const availStock = variantAvail !== null ? variantAvail : Number(item.available_stock || 0);
                    const isSufficient = availStock >= reqQty;
                    const shortageDeficit = reqQty - availStock;
                    const needsChoice = !kittingData?.already_deducted && matchingVariants.length > 0 && !item.sub_child_part_id;
                    const sameRmCount = customItems.filter((c) => Number(c.rm_id) === Number(item.rm_id)).length;

                    return (
                      <tr
                        key={`${item.rm_id || 'x'}-${idx}`}
                        className={`transition-colors ${needsChoice ? 'bg-amber-50/60' : isSufficient ? 'hover:bg-slate-50/70' : 'bg-rose-50/30 hover:bg-rose-50/60'}`}
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          {item.rm_code}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-slate-900">{item.material_name}</span>
                          {item.quantity_per_unit && (
                            <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                              ({Number(item.quantity_per_unit).toFixed(3)} {item.unit_code}/unit)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {kittingData?.already_deducted ? (
                            item.sub_part_name ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                                <strong>[{item.sub_part_brand || 'Brand'}]</strong>
                                <span>{item.sub_part_name}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 font-medium italic text-[11px]">Standard / Universal</span>
                            )
                          ) : matchingVariants.length > 0 ? (
                            <div className="space-y-1">
                              <select
                                value={item.sub_child_part_id || ''}
                                onChange={(e) => handleVariantChange(idx, e.target.value)}
                                aria-invalid={needsChoice}
                                className={`w-full bg-white rounded-lg px-2 py-1 text-xs font-bold focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer ${
                                  needsChoice ? 'border-2 border-amber-500 text-amber-900' : 'border border-blue-300 text-blue-900'
                                }`}
                              >
                                <option value="">-- Choose which type to use ({matchingVariants.length}) --</option>
                                {matchingVariants.map(v => (
                                  <option key={v.id} value={v.id}>
                                    [{v.brand_name || 'Type'}] {v.sub_part_name}
                                    {v.available_in_warehouse !== undefined ? ` — ${Number(v.available_in_warehouse).toLocaleString('en-IN', { maximumFractionDigits: 3 })} in godown` : ''}
                                  </option>
                                ))}
                              </select>
                              <div className="flex items-center gap-2">
                                {needsChoice && (
                                  <span className="text-[10px] font-bold text-amber-700">Required: pick a type</span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleSplitRow(idx)}
                                  className="text-[10px] font-bold text-blue-700 hover:underline cursor-pointer"
                                  title="Issue this child part from two different types (e.g. 60 of one handle + 40 of another)"
                                >
                                  + Split into another type
                                </button>
                                {item.is_split && sameRmCount > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveSplitRow(idx)}
                                    className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-medium italic text-[11px]">
                              Standard / Universal
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
                          {variantAvail !== null && (
                            <span className="block text-[10px] text-slate-400 font-sans font-semibold">
                              of this type · all types: {Number(item.available_stock || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                            </span>
                          )}
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
