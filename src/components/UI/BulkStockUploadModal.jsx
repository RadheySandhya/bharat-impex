import React, { useState } from 'react';
import Icon from './Icon';
import { api } from '../../services/api';
import { downloadBulkStockTemplate } from '../../utils/csvTemplates';
import { useToast } from '../../context/ToastContext';

export function BulkStockUploadModal({ isOpen, onClose, onStockUpdated, rawMaterials = [], finishedGoods = [] }) {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' or 'manual'
  const [file, setFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const { success, error } = useToast();

  if (!isOpen) return null;

  // Handle CSV file selection and client-side parse for instant preview
  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        if (typeof text !== 'string') return;

        const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          error('CSV file is empty or missing headers.');
          return;
        }

        const parseCSVLine = (line) => {
          const result = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
              } else {
                inQuotes = !inQuotes;
              }
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        };

        const headerLine = lines[0];
        const headers = parseCSVLine(headerLine).map((h) => h.replace(/['"]+/g, '').trim().toLowerCase());

        let idIdx = -1;
        let typeIdx = -1;
        let codeIdx = -1;
        let nameIdx = -1;
        let qtyIdx = -1;
        let unitIdx = -1;
        let rateIdx = -1;
        let minIdx = -1;
        let maxIdx = -1;

        headers.forEach((h, idx) => {
          if (['id', 'item_id', 'item id'].includes(h)) idIdx = idx;
          else if (['type', 'material_type', 'item type', 'material type'].includes(h)) typeIdx = idx;
          else if (['code', 'material_code', 'cat no', 'item code', 'sku code', 'rm code', 'fg code'].includes(h)) codeIdx = idx;
          else if (['name', 'material_name', 'item_name', 'product_name', 'item name'].includes(h)) nameIdx = idx;
          else if (['qty', 'quantity', 'stock', 'current_stock', 'current stock quantity'].includes(h)) qtyIdx = idx;
          else if (['unit', 'unit_code', 'uom'].includes(h)) unitIdx = idx;
          else if (['rate', 'price', 'standard_rate', 'selling_price', 'unit price'].includes(h)) rateIdx = idx;
          else if (['min level', 'min level (reorder)', 'min_level', 'minimum_stock', 'reorder_level', 'reorder level', 'min stock'].includes(h)) minIdx = idx;
          else if (['max level', 'max level (max stock)', 'max_level', 'maximum_stock', 'max stock', 'max stock quantity'].includes(h)) maxIdx = idx;
        });

        const rows = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line.trim()) continue;
          const cleanCols = parseCSVLine(line).map((c) => c.replace(/^"|"$/g, '').trim());

          const idVal = idIdx !== -1 ? cleanCols[idIdx] || '' : '';
          const codeVal = codeIdx !== -1 ? cleanCols[codeIdx] || '' : '';
          const nameVal = nameIdx !== -1 ? cleanCols[nameIdx] || '' : '';
          const typeVal = typeIdx !== -1 ? cleanCols[typeIdx] || '' : '';
          const qtyVal = qtyIdx !== -1 ? parseFloat(cleanCols[qtyIdx]?.replace(/,/g, '') || '0') : 0;
          const unitVal = unitIdx !== -1 ? cleanCols[unitIdx] || 'PCS' : 'PCS';
          const rateVal = rateIdx !== -1 ? parseFloat(cleanCols[rateIdx]?.replace(/,/g, '') || '0') : 0;
          const minVal = minIdx !== -1 ? parseFloat(cleanCols[minIdx]?.replace(/,/g, '') || '0') : 0;
          const maxVal = maxIdx !== -1 ? parseFloat(cleanCols[maxIdx]?.replace(/,/g, '') || '0') : 0;

          if (!nameVal && !codeVal) continue;

          rows.push({
            id: idVal,
            material_type: typeVal.toUpperCase().includes('RM') || typeVal.toUpperCase().includes('RAW') ? 'RM' : 'FG',
            material_code: codeVal,
            material_name: nameVal,
            quantity: isNaN(qtyVal) ? 0 : qtyVal,
            unit_code: unitVal.toUpperCase() || 'PCS',
            rate: isNaN(rateVal) ? 0 : rateVal,
            reorder_level: isNaN(minVal) ? 0 : minVal,
            maximum_stock: isNaN(maxVal) ? 0 : maxVal,
          });
        }

        setParsedRows(rows);
      } catch (err) {
        error('Failed to parse CSV: ' + err.message);
      }
    };
    reader.readAsText(selectedFile);
  };

  // Add new empty manual row
  const handleAddManualRow = () => {
    setParsedRows((prev) => [
      ...prev,
      {
        id: '',
        material_type: 'RM',
        material_code: '',
        material_name: '',
        quantity: 100,
        unit_code: 'PCS',
        rate: 500,
        reorder_level: 50,
        maximum_stock: 300,
      },
    ]);
  };

  const handleUpdateRow = (index, field, value) => {
    setParsedRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveRow = (index) => {
    setParsedRows((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Submit to Backend
  const handleSyncSubmit = async () => {
    if (parsedRows.length === 0) {
      error('Please upload a CSV or add at least one stock item.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.stock.bulkImport(parsedRows);
      if (res?.data) {
        success(res.message || `Successfully synced ${res.data.total} stock items!`);
        if (onStockUpdated) onStockUpdated(res.data);
        onClose();
      }
    } catch (err) {
      error(err.message || 'Failed to sync bulk stock.');
    } finally {
      setLoading(false);
    }
  };

  const existingCount = parsedRows.filter((r) => r.id && String(r.id).trim() !== '').length;
  const newCount = parsedRows.length - existingCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-6xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
              <Icon name="boxes" size="lg" ariaHidden={true} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <span>Bulk Stock Setup & Master Update</span>
                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Auto-ID Creation Active
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Initialize client inventory for Child Parts (RM) & Finished Goods (FG). Leave ID blank to auto-create new items!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Icon name="close" size="lg" ariaHidden={true} />
          </button>
        </div>

        {/* Step 1: Download Pre-filled Template & Upload Action Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Step 1: Download Pre-Filled CSV Format
            </span>
            <p className="text-xs text-slate-600 mb-2.5">
              Contains all existing Child Parts & Finished Goods with their fixed IDs. Includes sample blank rows for new items.
            </p>
            <button
              type="button"
              onClick={() => downloadBulkStockTemplate(rawMaterials, finishedGoods)}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-blue-700 border border-blue-200 text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Icon name="download" size="xs" ariaHidden={true} />
              <span>Download Pre-Filled Stock CSV Format</span>
            </button>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Step 2: Upload CSV or Add Manually
            </span>
            <p className="text-xs text-slate-600 mb-2.5">
              Select your completed spreadsheet to preview and verify quantities before syncing.
            </p>
            <div className="flex items-center gap-2">
              <label className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-300 hover:border-slate-400 text-xs font-semibold text-slate-700 flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs truncate">
                <Icon name="upload" size="xs" ariaHidden={true} />
                <span className="truncate">{file ? file.name : 'Choose CSV File...'}</span>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <button
                type="button"
                onClick={handleAddManualRow}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Icon name="plus" size="xs" ariaHidden={true} />
                <span>+ Row</span>
              </button>
            </div>
          </div>
        </div>

        {/* Info Banner about Auto-ID Engine */}
        <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-950 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon name="info" size="sm" className="text-blue-700 shrink-0" ariaHidden={true} />
            <span>
              <strong>Auto-ID Rule:</strong> Items with an existing ID will have their stock updated. Any item with a <strong>blank ID</strong> will be automatically assigned a permanent ID and Code (<code>RM-xxxxxx</code> / <code>FG-xxxxxx</code>) in the backend.
            </span>
          </div>
          {parsedRows.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md border border-blue-200">
                {existingCount} Update
              </span>
              <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200">
                {newCount} New (Auto-ID)
              </span>
            </div>
          )}
        </div>

        {/* Step 3: Interactive Table Preview */}
        <div className="flex-1 overflow-y-auto border border-slate-200 rounded-2xl min-h-[220px]">
          {parsedRows.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Icon name="filespreadsheet" size="2xl" className="mx-auto text-slate-300 mb-2" ariaHidden={true} />
              <p className="text-sm font-bold text-slate-700">No stock rows loaded yet</p>
              <p className="text-xs text-slate-500 mt-1">
                Upload a CSV file above or click <strong>"+ Row"</strong> to begin adding initial inventory.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-800 border-collapse">
              <thead className="bg-slate-100 text-slate-700 text-[11px] uppercase font-bold sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="p-2.5 w-10 text-center">#</th>
                  <th className="p-2.5 w-20">Item ID</th>
                  <th className="p-2.5 w-24">Type</th>
                  <th className="p-2.5 w-28">Code</th>
                  <th className="p-2.5">Material / Product Name</th>
                  <th className="p-2.5 w-28 text-right">Stock Qty</th>
                  <th className="p-2.5 w-24 text-right">Rate (₹)</th>
                  <th className="p-2.5 w-24 text-right text-amber-700 bg-amber-50/50">Min (Reorder)</th>
                  <th className="p-2.5 w-24 text-right text-blue-700 bg-blue-50/50">Max Level</th>
                  <th className="p-2.5 w-24 text-center">Status</th>
                  <th className="p-2.5 w-10 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {parsedRows.map((row, idx) => {
                  const isNew = !row.id || String(row.id).trim() === '';

                  return (
                    <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                      <td className="p-2 text-center font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                      <td className="p-2 font-mono">
                        {isNew ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            [Auto]
                          </span>
                        ) : (
                          <span className="font-bold text-slate-800">#{row.id}</span>
                        )}
                      </td>
                      <td className="p-2">
                        <select
                          value={row.material_type}
                          onChange={(e) => handleUpdateRow(idx, 'material_type', e.target.value)}
                          className="p-1 rounded border border-slate-200 bg-white font-bold text-[11px]"
                        >
                          <option value="RM">Child Part (RM)</option>
                          <option value="FG">Finished Good (FG)</option>
                        </select>
                      </td>
                      <td className="p-2 font-mono text-[11px] font-semibold text-blue-700">
                        {row.material_code || (isNew ? `[Auto ${row.material_type}-...]` : '—')}
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.material_name}
                          onChange={(e) => handleUpdateRow(idx, 'material_name', e.target.value)}
                          placeholder="Item Name..."
                          className="w-full p-1.5 rounded border border-slate-200 bg-white font-bold text-slate-900 text-xs focus:ring-1 focus:ring-blue-600"
                        />
                      </td>
                      <td className="p-2 text-right">
                        <input
                          type="number"
                          value={row.quantity}
                          onChange={(e) => handleUpdateRow(idx, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-20 p-1.5 rounded border border-slate-200 bg-white font-mono font-bold text-right text-xs text-slate-900 focus:ring-1 focus:ring-blue-600"
                        />
                      </td>
                      <td className="p-2 text-right">
                        <input
                          type="number"
                          value={row.rate}
                          onChange={(e) => handleUpdateRow(idx, 'rate', parseFloat(e.target.value) || 0)}
                          className="w-20 p-1.5 rounded border border-slate-200 bg-white font-mono text-right text-xs text-slate-700"
                        />
                      </td>
                      <td className="p-2 text-right bg-amber-50/30">
                        <input
                          type="number"
                          value={row.reorder_level || 0}
                          onChange={(e) => handleUpdateRow(idx, 'reorder_level', parseFloat(e.target.value) || 0)}
                          className="w-20 p-1.5 rounded border border-amber-200 bg-white font-mono text-right text-xs text-amber-900 focus:ring-1 focus:ring-amber-500"
                        />
                      </td>
                      <td className="p-2 text-right bg-blue-50/30">
                        <input
                          type="number"
                          value={row.maximum_stock || 0}
                          onChange={(e) => handleUpdateRow(idx, 'maximum_stock', parseFloat(e.target.value) || 0)}
                          className="w-20 p-1.5 rounded border border-blue-200 bg-white font-mono text-right text-xs text-blue-900 focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="p-2 text-center">
                        {isNew ? (
                          <span className="inline-block text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                            Auto Create
                          </span>
                        ) : (
                          <span className="inline-block text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200">
                            Update Stock
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Remove Row"
                        >
                          <Icon name="delete" size="xs" ariaHidden={true} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-3">
          <span className="text-xs text-slate-500 font-medium">
            Total Items to Sync: <strong>{parsedRows.length}</strong>
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSyncSubmit}
              disabled={loading || parsedRows.length === 0}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Icon name="loader" size="xs" spin={true} ariaHidden={true} />
                  <span>Processing Stock...</span>
                </>
              ) : (
                <>
                  <Icon name="check" size="xs" ariaHidden={true} />
                  <span>Confirm & Sync Stock to ERP</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BulkStockUploadModal;
