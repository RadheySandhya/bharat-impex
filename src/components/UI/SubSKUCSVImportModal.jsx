import React, { useState } from 'react';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  X,
  Tags,
  RefreshCw
} from 'lucide-react';
import Icon from './Icon';
import { api } from '../../services/api';
import { downloadSubSKUTemplate } from '../../utils/csvTemplates';
import { useToast } from '../../context/ToastContext';

export function SubSKUCSVImportModal({ 
  isOpen, 
  onClose, 
  finishedGoods = [], 
  existingSubSkus = [],
  onSuccess 
}) {
  const [file, setFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const { success, error } = useToast();

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    downloadSubSKUTemplate(existingSubSkus, finishedGoods);
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

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        if (!text) return;

        const lines = text
          .split(/\r\n|\n|\r/)
          .map((l) => l.trim())
          .filter((l) => l.length > 0);

        if (lines.length < 2) {
          error('CSV must contain a header row and at least one data row.');
          return;
        }

        const headerCols = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

        // Match column indices
        const parentCodeIdx = headerCols.findIndex((h) => h.includes('parentsku') || h.includes('parentcode') || h.includes('fgcode'));
        const parentNameIdx = headerCols.findIndex((h) => h.includes('parentproduct') || h.includes('parentname'));
        const brandIdx = headerCols.findIndex((h) => h.includes('brand') || h.includes('client') || h.includes('oem'));
        const subCodeIdx = headerCols.findIndex((h) => h.includes('subskucode') || h.includes('subcode') || (h.includes('code') && !h.includes('parent')));
        const subNameIdx = headerCols.findIndex((h) => h.includes('billed') || h.includes('subskuname') || h.includes('productname') || (h.includes('name') && !h.includes('parent') && !h.includes('brand')));
        const priceIdx = headerCols.findIndex((h) => h.includes('price') || h.includes('rate'));
        const descIdx = headerCols.findIndex((h) => h.includes('desc') || h.includes('remark'));

        // Build lookup map for finished goods
        const fgByCode = {};
        const fgByName = {};
        finishedGoods.forEach((fg) => {
          if (fg.fg_code) fgByCode[fg.fg_code.toUpperCase()] = fg;
          if (fg.product_name) fgByName[fg.product_name.toUpperCase()] = fg;
        });

        const rows = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = parseCSVLine(lines[i]);
          if (cols.length === 0 || cols.every((c) => c === '')) continue;

          const rawParentCode = (parentCodeIdx >= 0 ? cols[parentCodeIdx] : '').trim();
          const rawParentName = (parentNameIdx >= 0 ? cols[parentNameIdx] : '').trim();
          const brand = (brandIdx >= 0 ? cols[brandIdx] : 'General Brand').trim() || 'General Brand';
          const subName = (subNameIdx >= 0 ? cols[subNameIdx] : cols[1] || '').trim();
          const subCode = (subCodeIdx >= 0 ? cols[subCodeIdx] : '').trim();
          const price = priceIdx >= 0 ? parseFloat(cols[priceIdx]) || 0 : 0;
          const desc = descIdx >= 0 ? cols[descIdx] : '';

          // Resolve parent FG
          let parentFg = fgByCode[rawParentCode.toUpperCase()] || fgByName[rawParentName.toUpperCase()] || null;

          const validationErrors = [];
          if (!subName) validationErrors.push('Missing Sub-SKU name');
          if (!parentFg) validationErrors.push(`Parent SKU "${rawParentCode || rawParentName}" not found`);

          rows.push({
            id: i,
            parent_sku: rawParentCode || (parentFg?.fg_code || ''),
            parent_fg_id: parentFg?.id || null,
            parent_fg_code: parentFg?.fg_code || rawParentCode,
            parent_product_name: parentFg?.product_name || rawParentName,
            brand_name: brand,
            sub_sku_name: subName,
            sub_sku_code: subCode || `SUB-${brand.substring(0, 3).toUpperCase()}-${String(i).padStart(3, '0')}`,
            selling_price: price > 0 ? price : (parentFg ? Number(parentFg.selling_price) : 0),
            description: desc,
            status: validationErrors.length === 0 ? 'VALID' : 'INVALID',
            error: validationErrors.join(', ')
          });
        }

        setParsedRows(rows);
      } catch (err) {
        error('Failed to parse CSV file: ' + err.message);
      }
    };

    reader.readAsText(uploadedFile);
  };

  const handleConfirmImport = async () => {
    const validRows = parsedRows.filter((r) => r.status === 'VALID');
    if (validRows.length === 0) {
      error('No valid rows to import.');
      return;
    }

    setLoading(true);
    try {
      const payload = validRows.map((r) => ({
        parent_fg_id: r.parent_fg_id,
        parent_sku: r.parent_sku,
        brand_name: r.brand_name,
        sub_sku_name: r.sub_sku_name,
        sub_sku_code: r.sub_sku_code,
        selling_price: r.selling_price,
        description: r.description
      }));

      const res = await api.subSkus.bulkImport(payload);
      success(res?.message || `Successfully mapped ${validRows.length} Sub-SKUs.`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      error(err.message || 'Failed to import Sub-SKU mappings.');
    } finally {
      setLoading(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.status === 'VALID').length;
  const invalidCount = parsedRows.filter((r) => r.status === 'INVALID').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
              <Tags className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Bulk Import Sub-SKU & OEM Brand Mappings
              </h2>
              <p className="text-xs text-slate-500">
                Upload CSV sheet to map client-specific brand products (Somany, Prince Pipe, Zen Bath) to primary SKUs.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {/* Top Actions: Template Download & File Select */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div>
              <p className="text-xs font-bold text-slate-800">Pre-formatted Sub-SKU Template</p>
              <p className="text-[11px] text-slate-500">
                Download sheet with existing finished goods and sample Somany / Prince Pipe mappings.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer shrink-0"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Download CSV Template</span>
            </button>
          </div>

          {/* Upload Dropzone */}
          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-indigo-500 transition-colors bg-white">
            <input
              type="file"
              id="sub-sku-csv-upload"
              accept=".csv,text/csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <label
              htmlFor="sub-sku-csv-upload"
              className="cursor-pointer flex flex-col items-center justify-center gap-2"
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shadow-2xs">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-800">
                {file ? file.name : 'Click to select CSV file from your computer'}
              </p>
              <p className="text-[11px] text-slate-500">
                Supports .csv files with columns: Parent SKU Code, Brand Name, Sub-SKU Name, Selling Price
              </p>
            </label>
          </div>

          {/* Parsed Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">Preview: {parsedRows.length} items parsed</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {validCount} Ready
                  </span>
                  {invalidCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                      {invalidCount} Invalid
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { setFile(null); setParsedRows([]); }}
                  className="text-rose-600 hover:text-rose-800 text-xs font-semibold cursor-pointer"
                >
                  Clear Sheet
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2">Brand</th>
                      <th className="px-3 py-2">Sub-SKU Code</th>
                      <th className="px-3 py-2">Billed Sub-SKU Name</th>
                      <th className="px-3 py-2">Parent Manufacturing SKU</th>
                      <th className="px-3 py-2 text-right">Price (₹)</th>
                      <th className="px-3 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {parsedRows.map((r) => (
                      <tr key={r.id} className={r.status === 'INVALID' ? 'bg-rose-50/50' : 'hover:bg-slate-50'}>
                        <td className="px-3 py-2 font-bold text-indigo-700">{r.brand_name}</td>
                        <td className="px-3 py-2 font-mono font-bold text-slate-900">{r.sub_sku_code}</td>
                        <td className="px-3 py-2 font-semibold text-slate-900">{r.sub_sku_name}</td>
                        <td className="px-3 py-2 text-slate-600">
                          {r.parent_fg_code ? (
                            <span className="font-mono text-blue-700 font-bold">[{r.parent_fg_code}] {r.parent_product_name}</span>
                          ) : (
                            <span className="text-rose-600 font-bold">{r.error}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                          ₹{Number(r.selling_price).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {r.status === 'VALID' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                              <CheckCircle2 className="w-3 h-3" /> Ready
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded" title={r.error}>
                              <AlertCircle className="w-3 h-3" /> {r.error}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading || validCount === 0}
            onClick={handleConfirmImport}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition-colors cursor-pointer ${
              loading || validCount === 0
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Importing Mappings...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirm & Import ({validCount} Sub-SKUs)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SubSKUCSVImportModal;
