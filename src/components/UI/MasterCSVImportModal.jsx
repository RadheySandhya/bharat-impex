import React, { useState } from 'react';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Trash2, 
  X,
  Package,
  PackageCheck,
  RefreshCw
} from 'lucide-react';
import Icon from './Icon';
import { api } from '../../services/api';
import { downloadRawMaterialTemplate, downloadFinishedGoodsTemplate } from '../../utils/csvTemplates';
import { useToast } from '../../context/ToastContext';

export function MasterCSVImportModal({ 
  isOpen, 
  onClose, 
  type = 'RM', // 'RM' or 'FG'
  existingItems = [], 
  categories = [], 
  units = [], 
  onSuccess 
}) {
  const [file, setFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const { success, error } = useToast();

  if (!isOpen) return null;

  const isRM = type === 'RM';
  const entityTitle = isRM ? 'Child Parts Master' : 'Finished Goods (SKUs) Master';
  const codeLabel = isRM ? 'Child Part Code' : 'SKU Code';
  const nameLabel = isRM ? 'Child Part Name' : 'Product Name';
  const priceLabel = isRM ? 'Standard Rate (₹)' : 'Selling Price (₹)';

  const handleDownloadTemplate = () => {
    if (isRM) {
      downloadRawMaterialTemplate(existingItems);
    } else {
      downloadFinishedGoodsTemplate(existingItems);
    }
  };

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
          error('CSV file is empty or missing header line.');
          return;
        }

        const headers = parseCSVLine(lines[0]).map((h) => h.replace(/['"]+/g, '').trim().toLowerCase());

        let codeIdx = -1;
        let nameIdx = -1;
        let catIdx = -1;
        let unitIdx = -1;
        let priceIdx = -1;
        let minIdx = -1;
        let maxIdx = -1;
        let descIdx = -1;

        headers.forEach((h, idx) => {
          if (['code', 'rm code', 'rm_code', 'sku code', 'fg code', 'fg_code', 'item code', 'child part code', 'part code'].includes(h)) codeIdx = idx;
          else if (['name', 'material name', 'material_name', 'product name', 'product_name', 'item name', 'item_name', 'child part name', 'part name'].includes(h)) nameIdx = idx;
          else if (['category', 'category name', 'category_name', 'cat'].includes(h)) catIdx = idx;
          else if (['unit', 'unit code', 'unit_code', 'uom'].includes(h)) unitIdx = idx;
          else if (['rate', 'price', 'standard rate', 'standard_rate', 'selling price', 'selling_price', 'unit price'].includes(h)) priceIdx = idx;
          else if (['min level', 'min level (reorder)', 'min_level', 'minimum_stock', 'reorder_level', 'reorder level', 'min stock'].includes(h)) minIdx = idx;
          else if (['max level', 'max level (max stock)', 'max_level', 'maximum_stock', 'max stock', 'max stock quantity'].includes(h)) maxIdx = idx;
          else if (['description', 'desc', 'remarks', 'specification'].includes(h)) descIdx = idx;
        });

        const rows = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line.trim()) continue;
          const cleanCols = parseCSVLine(line).map((c) => c.replace(/^"|"$/g, '').trim());

          const codeVal = codeIdx !== -1 ? cleanCols[codeIdx] || '' : '';
          const nameVal = nameIdx !== -1 ? cleanCols[nameIdx] || '' : '';
          const catVal = catIdx !== -1 ? cleanCols[catIdx] || '' : (isRM ? 'Metals & Brass Alloys' : 'Faucets & Sanitary Ware');
          const unitVal = unitIdx !== -1 ? cleanCols[unitIdx] || (isRM ? 'KG' : 'PCS') : (isRM ? 'KG' : 'PCS');
          const priceVal = priceIdx !== -1 ? parseFloat(cleanCols[priceIdx]?.replace(/,/g, '') || '0') : 0;
          const minVal = minIdx !== -1 ? parseFloat(cleanCols[minIdx]?.replace(/,/g, '') || '0') : (isRM ? 100 : 50);
          const maxVal = maxIdx !== -1 ? parseFloat(cleanCols[maxIdx]?.replace(/,/g, '') || '0') : (minVal * 3);
          const descVal = descIdx !== -1 ? cleanCols[descIdx] || '' : '';

          if (!nameVal && !codeVal) continue;

          // Check if already in existing items
          const exists = existingItems.some((ex) => 
            (codeVal && (ex.rm_code === codeVal || ex.fg_code === codeVal || ex.code === codeVal)) ||
            (nameVal && (ex.material_name === nameVal || ex.product_name === nameVal))
          );

          rows.push({
            code: codeVal,
            name: nameVal,
            category: catVal,
            unit: unitVal.toUpperCase(),
            price: isNaN(priceVal) ? 0 : priceVal,
            reorder_level: isNaN(minVal) ? 0 : minVal,
            maximum_stock: isNaN(maxVal) ? 0 : maxVal,
            description: descVal,
            isExisting: exists,
          });
        }

        setParsedRows(rows);
      } catch (err) {
        error('Failed to parse CSV file: ' + err.message);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleAddManualRow = () => {
    setParsedRows((prev) => [
      ...prev,
      {
        code: '',
        name: '',
        category: isRM ? 'Metals & Brass Alloys' : 'Premium Basin Taps',
        unit: isRM ? 'KG' : 'PCS',
        price: isRM ? 500 : 1200,
        reorder_level: isRM ? 100 : 50,
        maximum_stock: isRM ? 500 : 250,
        description: '',
        isExisting: false,
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

  const handleSyncSubmit = async () => {
    if (parsedRows.length === 0) {
      error('Please select a CSV file or add at least one row.');
      return;
    }

    setLoading(true);
    try {
      const formattedItems = parsedRows.map((r) => {
        if (isRM) {
          return {
            rm_code: r.code,
            material_name: r.name,
            category_name: r.category,
            unit_code: r.unit,
            standard_rate: r.price,
            reorder_level: r.reorder_level,
            minimum_stock: r.reorder_level,
            maximum_stock: r.maximum_stock,
            description: r.description,
          };
        } else {
          return {
            fg_code: r.code,
            product_name: r.name,
            category_name: r.category,
            unit_code: r.unit,
            selling_price: r.price,
            reorder_level: r.reorder_level,
            minimum_stock: r.reorder_level,
            maximum_stock: r.maximum_stock,
            description: r.description,
          };
        }
      });

      const res = isRM
        ? await api.rawMaterials.bulkImport(formattedItems)
        : await api.finishedGoods.bulkImport(formattedItems);

      if (res?.data) {
        success(res.message || `Successfully synced ${res.data.total} ${entityTitle} items!`);
        if (onSuccess) onSuccess(res.data);
        onClose();
      }
    } catch (err) {
      error(err.message || `Failed to sync bulk ${entityTitle}.`);
    } finally {
      setLoading(false);
    }
  };

  const newCount = parsedRows.filter((r) => !r.isExisting).length;
  const updateCount = parsedRows.length - newCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-5xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-3.5">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs border ${
              isRM ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}>
              {isRM ? <Package className="w-5 h-5" /> : <PackageCheck className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <span>Bulk CSV Import: {entityTitle}</span>
                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Auto-Code Support
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Upload Excel / CSV sheet to create and update multiple {isRM ? 'child parts' : 'finished goods SKUs'} with Min & Max stock levels in one go.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1 & 2 Action Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-2 flex-wrap">
            <label className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              <span>Choose CSV File</span>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Download CSV Format</span>
            </button>
            <button
              type="button"
              onClick={handleAddManualRow}
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Row</span>
            </button>
          </div>

          {parsedRows.length > 0 && (
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="font-bold text-slate-700">{parsedRows.length} Rows</span>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                {newCount} New
              </span>
              <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                {updateCount} Update
              </span>
            </div>
          )}
        </div>

        {/* Interactive Preview Table */}
        <div className="flex-1 overflow-y-auto border border-slate-200 rounded-2xl min-h-[220px]">
          {parsedRows.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <FileSpreadsheet className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-700">No rows imported yet</p>
              <p className="text-xs text-slate-500 mt-1">
                Upload your CSV file above or download the pre-formatted template to begin bulk setup.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-800 border-collapse">
              <thead className="bg-slate-100 text-slate-700 text-[11px] uppercase font-bold sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="p-2.5 w-10 text-center">#</th>
                  <th className="p-2.5 w-28">{codeLabel}</th>
                  <th className="p-2.5">{nameLabel}</th>
                  <th className="p-2.5 w-36">Category</th>
                  <th className="p-2.5 w-20 text-center">Unit</th>
                  <th className="p-2.5 w-24 text-right">{priceLabel}</th>
                  <th className="p-2.5 w-24 text-right text-amber-700 bg-amber-50/50">Min (Reorder)</th>
                  <th className="p-2.5 w-24 text-right text-blue-700 bg-blue-50/50">Max Level</th>
                  <th className="p-2.5 w-24 text-center">Status</th>
                  <th className="p-2.5 w-10 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {parsedRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                    <td className="p-2 text-center font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                    <td className="p-2 font-mono text-blue-700 font-bold">
                      <input
                        type="text"
                        value={row.code}
                        onChange={(e) => handleUpdateRow(idx, 'code', e.target.value)}
                        placeholder="[Auto Assign]"
                        className="w-full p-1 rounded border border-slate-200 bg-white font-mono text-xs text-blue-700 focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => handleUpdateRow(idx, 'name', e.target.value)}
                        placeholder="Name..."
                        className="w-full p-1 rounded border border-slate-200 bg-white font-bold text-slate-900 text-xs focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={row.category}
                        onChange={(e) => handleUpdateRow(idx, 'category', e.target.value)}
                        placeholder="Category..."
                        className="w-full p-1 rounded border border-slate-200 bg-white text-xs text-slate-700"
                      />
                    </td>
                    <td className="p-2 text-center font-mono">
                      <input
                        type="text"
                        value={row.unit}
                        onChange={(e) => handleUpdateRow(idx, 'unit', e.target.value)}
                        className="w-14 p-1 rounded border border-slate-200 bg-white text-center font-mono text-xs uppercase"
                      />
                    </td>
                    <td className="p-2 text-right">
                      <input
                        type="number"
                        value={row.price}
                        onChange={(e) => handleUpdateRow(idx, 'price', parseFloat(e.target.value) || 0)}
                        className="w-20 p-1 rounded border border-slate-200 bg-white text-right font-mono text-xs text-slate-800"
                      />
                    </td>
                    <td className="p-2 text-right bg-amber-50/20">
                      <input
                        type="number"
                        value={row.reorder_level}
                        onChange={(e) => handleUpdateRow(idx, 'reorder_level', parseFloat(e.target.value) || 0)}
                        className="w-20 p-1 rounded border border-amber-200 bg-white text-right font-mono text-xs text-amber-900"
                      />
                    </td>
                    <td className="p-2 text-right bg-blue-50/20">
                      <input
                        type="number"
                        value={row.maximum_stock}
                        onChange={(e) => handleUpdateRow(idx, 'maximum_stock', parseFloat(e.target.value) || 0)}
                        className="w-20 p-1 rounded border border-blue-200 bg-white text-right font-mono text-xs text-blue-900"
                      />
                    </td>
                    <td className="p-2 text-center">
                      {row.isExisting ? (
                        <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200">
                          Update
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                          New Item
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Remove Row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-3">
          <p className="text-xs text-slate-500 font-medium">
            Items will be created in {entityTitle} with default units, pricing & min/max levels.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSyncSubmit}
              disabled={loading || parsedRows.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-colors"
            >
              {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Sync {parsedRows.length} Items to {entityTitle}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
