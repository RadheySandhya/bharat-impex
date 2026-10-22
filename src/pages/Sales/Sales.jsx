import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  Plus, 
  Search,
  Package,
  Download
} from 'lucide-react';
import { downloadFGSalesTemplate } from '../../utils/csvTemplates';
import { DataTable } from '../../components/UI/DataTable';
import { StatusBadge } from '../../components/UI/StatusBadge';
import { Modal } from '../../components/UI/Modal';
import Icon from '../../components/UI/Icon';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export function Sales() {
  const [activeTab, setActiveTab] = useState('history'); // 'history', 'upload', 'batches'
  const [sales, setSales] = useState([]);
  const [batches, setBatches] = useState([]);
  const [finishedGoods, setFinishedGoods] = useState([]);
  const [subSkus, setSubSkus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProductOption, setSelectedProductOption] = useState('');

  // Upload states
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(3);

  // Direct manual sales modal
  const [isDirectModalOpen, setIsDirectModalOpen] = useState(false);
  const [directForm, setDirectForm] = useState({
    fg_id: '',
    sub_sku_id: null,
    warehouse_id: 3,
    quantity: '',
    rate: '',
    invoice_number: '',
    customer_name: '',
    sale_date: new Date().toISOString().split('T')[0],
    remarks: '',
  });

  const { success, error, warning } = useToast();

  const fetchSales = async () => {
    setLoading(true);
    try {
      const res = await api.sales.getAll();
      if (res?.data) setSales(res.data);
    } catch (err) {
      error('Failed to load sales: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchBatches = async () => {
    try {
      const res = await api.sales.getBatches();
      if (res?.data) setBatches(res.data);
    } catch (err) {
      console.warn(err);
    }
  };

  const fetchMasters = async () => {
    try {
      const [fgRes, subRes] = await Promise.all([
        api.finishedGoods.getAll(),
        api.subSkus.getAll().catch(() => ({ data: { sub_skus: [] } }))
      ]);
      if (fgRes?.data) setFinishedGoods(fgRes.data);
      if (subRes?.data?.sub_skus) setSubSkus(subRes.data.sub_skus);
    } catch (err) {
      console.warn(err);
    }
  };

  useEffect(() => {
    fetchSales();
    fetchBatches();
    fetchMasters();
  }, []);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsUploading(true);

    try {
      const res = await api.sales.uploadPreview(file);
      if (res?.data) {
        setPreviewData(res.data);
        if (res.data.is_duplicate) {
          warning(`Duplicate warning: File already imported as batch ${res.data.duplicate_batch.batch_code}`);
        } else {
          success(`Parsed ${res.data.total_rows} sales line items`);
        }
      }
    } catch (err) {
      error(err.message || 'Failed to parse sales CSV.');
      setPreviewData(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewData) return;
    setIsUploading(true);

    try {
      const res = await api.sales.confirmImport(previewData, selectedWarehouseId);
      success(`Imported ${res.data.successful_rows} sales items. FG stock decreased.`);
      setPreviewData(null);
      setSelectedFile(null);
      setActiveTab('history');
      fetchSales();
      fetchBatches();
    } catch (err) {
      error(err.message || 'Import failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReverseBatch = async (batchId) => {
    if (!window.confirm('Are you sure you want to reverse this sales batch? This will restore finished goods stock and create ledger cancellation entries.')) {
      return;
    }

    try {
      await api.sales.reverseBatch(batchId);
      success('Sales batch reversed successfully and stock restored.');
      fetchSales();
      fetchBatches();
    } catch (err) {
      error(err.message || 'Reversal failed.');
    }
  };

  const handleDirectSalesSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.sales.createDirect(directForm);
      success('Direct sale recorded and FG stock dispatched.');
      setIsDirectModalOpen(false);
      fetchSales();
    } catch (err) {
      error(err.message || 'Failed to record sale.');
    }
  };

  // Columns for Sales History
  const salesColumns = [
    {
      header: 'Sale Date',
      key: 'sale_date',
      render: (date) => <span className="font-mono text-xs text-slate-600">{date}</span>,
    },
    {
      header: 'Invoice No.',
      key: 'invoice_number',
      render: (inv, row) => (
        <div>
          <span className="font-mono font-bold text-slate-900">{inv || '—'}</span>
          {row.is_reversed == 1 && (
            <span className="ml-2 px-1.5 py-0.2 bg-rose-50 text-rose-700 text-[10px] font-bold rounded border border-rose-200">
              REVERSED
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Customer / Party',
      key: 'customer_name',
      render: (name) => <span className="text-slate-900 font-semibold">{name || '—'}</span>,
    },
    {
      header: 'Finished Good (SKU)',
      key: 'fg_code',
      render: (code, row) => (
        <div>
          <span className="font-mono font-bold text-blue-600">{code}</span>
          <p className="text-[11px] text-slate-500">{row.product_name}</p>
        </div>
      ),
    },
    {
      header: 'Dispatched Qty',
      key: 'quantity',
      align: 'right',
      render: (qty, row) => (
        <span className="font-mono font-bold text-rose-600 text-sm">
          -{Number(qty).toLocaleString()} {row.unit_code}
        </span>
      ),
    },
    {
      header: 'Selling Rate (₹)',
      key: 'rate',
      align: 'right',
      render: (rate) => <span className="font-mono text-slate-700">₹{Number(rate).toFixed(2)}</span>,
    },
    {
      header: 'Invoice Amount',
      key: 'amount',
      align: 'right',
      render: (amt) => <span className="font-mono font-bold text-slate-900">₹{Number(amt).toLocaleString()}</span>,
    },
  ];

  // Batch History Columns
  const batchColumns = [
    { header: 'Batch Code', key: 'batch_code', render: (code) => <span className="font-mono font-bold text-blue-600">{code}</span> },
    { header: 'File Name', key: 'file_name', render: (name) => <span className="text-slate-900 font-medium">{name}</span> },
    { header: 'Imported At', key: 'imported_at', render: (dt) => <span className="font-mono text-xs text-slate-500">{dt}</span> },
    { header: 'Total Rows', key: 'total_rows', align: 'center' },
    { header: 'Success Rows', key: 'successful_rows', align: 'center', render: (v) => <span className="text-emerald-700 font-bold">{v}</span> },
    { header: 'Status', key: 'status', render: (status) => <StatusBadge status={status} size="xs" /> },
    {
      header: 'Action',
      key: 'id',
      align: 'center',
      sortable: false,
      render: (id, row) => (
        row.status === 'IMPORTED' ? (
          <button
            onClick={() => handleReverseBatch(row.id)}
            className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" /> Reverse Batch
          </button>
        ) : (
          <span className="text-slate-500 text-xs italic">Reversed</span>
        )
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Icon name="receipt" size="lg" className="text-slate-900" ariaHidden={true} />
            <span>Tally Sales & Finished Goods Dispatch</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Tally Sales CSV upload, real-time FG stock decrease, and batch reversal audit trail.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsDirectModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-xs transition-colors cursor-pointer"
          >
            <Icon name="plus" size="xs" ariaHidden={true} />
            <span>Direct Sales Invoice</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Icon name="upload" size="xs" ariaHidden={true} />
            <span>Upload Sales CSV</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 border border-slate-200 rounded-xl p-1 text-xs w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
            activeTab === 'history' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Icon name="history" size="xs" ariaHidden={true} />
          <span>Sales History</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
            activeTab === 'upload' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Icon name="uploadcloud" size="xs" ariaHidden={true} />
          <span>CSV Upload Wizard</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('batches')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
            activeTab === 'batches' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Icon name="layers" size="xs" ariaHidden={true} />
          <span>Import Batches & Reversals</span>
        </button>
      </div>

      {/* Tab 1: CSV Upload Wizard */}
      {activeTab === 'upload' && (
        <div className="space-y-4">
          {/* Download Pre-Filled FG Template Banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-emerald-950 text-xs sm:text-sm">
                  Download Pre-Filled FG Sales CSV Format
                </h4>
                <p className="text-[11px] text-emerald-800 font-medium">
                  All Finished Goods & Faucets (Basin taps, sink mixers, angle valves, Seltos, Britney) are already pre-filled. Just enter dispatch quantities!
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => downloadFGSalesTemplate(finishedGoods)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download FG Template (.csv)</span>
            </button>
          </div>

          {!previewData && (
            <div className="bg-white p-10 rounded-2xl border-2 border-dashed border-slate-300 hover:border-slate-400 transition-colors text-center flex flex-col items-center justify-center shadow-xs">
              <div className="p-4 rounded-2xl bg-slate-100 text-slate-700 mb-4">
                <Upload className="w-10 h-10" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 mb-1">Select or Drop Tally Sales CSV</h3>
              <p className="text-xs text-slate-500 max-w-md mb-6 font-medium">
                Upload sales vouchers exported from Tally ERP. All line items will decrease Finished Goods stock automatically.
              </p>

              <label className="cursor-pointer px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors">
                {isUploading ? 'Parsing Sales CSV...' : 'Browse Sales CSV'}
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            </div>
          )}

          {previewData && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-slate-700" />
                    <h3 className="text-sm font-bold text-slate-900 font-mono">{previewData.file_name}</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    Total: <strong className="text-slate-900">{previewData.total_rows}</strong> • Valid & Mapped:{' '}
                    <strong className="text-emerald-700">{previewData.valid_rows}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setPreviewData(null);
                      setSelectedFile(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
                  >
                    Discard
                  </button>

                  <button
                    onClick={handleConfirmImport}
                    disabled={isUploading || previewData.valid_rows === 0}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                  >
                    {isUploading ? 'Processing...' : `Confirm & Dispatch ${previewData.valid_rows} Sales`}
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50/90 text-slate-600 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Tally Item Name</th>
                        <th className="px-4 py-3">System FG Mapping</th>
                        <th className="px-4 py-3 text-right">Quantity</th>
                        <th className="px-4 py-3 text-right">Rate</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewData.rows.map((row) => (
                        <tr key={row.row_number} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-mono text-slate-500">{row.row_number}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{row.tally_item_name}</td>
                          <td className="px-4 py-3 font-mono">
                            {row.mapping ? (
                              <span className="text-slate-900 font-bold">{row.mapping.internal_code}</span>
                            ) : (
                              <span className="text-rose-600 font-semibold italic">Unmapped</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-rose-600">
                            -{row.quantity} {row.unit}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-700">₹{row.rate}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">₹{row.amount}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={row.status} size="xs" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Sales Line History */}
      {activeTab === 'history' && (
        <DataTable
          columns={salesColumns}
          data={sales}
          loading={loading}
          searchPlaceholder="Search sales by invoice, customer, or SKU..."
        />
      )}

      {/* Tab 3: Batches & Reversals */}
      {activeTab === 'batches' && (
        <DataTable
          columns={batchColumns}
          data={batches}
          loading={loading}
          searchPlaceholder="Search sales import batches..."
        />
      )}

      {/* Direct Sales Modal */}
      <Modal
        isOpen={isDirectModalOpen}
        onClose={() => setIsDirectModalOpen(false)}
        title="Direct Finished Goods Sales Invoice"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsDirectModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="direct-sales-form"
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white shadow-xs"
            >
              Dispatch Sale
            </button>
          </>
        }
      >
        <form id="direct-sales-form" onSubmit={handleDirectSalesSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Select Finished Good (SKU)</label>
              <select
                value={selectedProductOption}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedProductOption(val);
                  if (val.startsWith('sub_')) {
                    const subId = parseInt(val.replace('sub_', ''), 10);
                    const sub = subSkus.find((s) => Number(s.id) === subId);
                    if (sub) {
                      setDirectForm({
                        ...directForm,
                        fg_id: sub.parent_fg_id,
                        sub_sku_id: sub.id,
                        rate: sub.selling_price || '',
                        remarks: `Billed as ${sub.sub_sku_name} (${sub.brand_name})`,
                      });
                    }
                  } else {
                    const fg = finishedGoods.find((f) => String(f.id) === String(val));
                    setDirectForm({
                      ...directForm,
                      fg_id: val,
                      sub_sku_id: null,
                      rate: fg ? fg.selling_price : '',
                    });
                  }
                }}
                className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                required
              >
                <option value="">-- Choose Product or Billing Sub-SKU --</option>
                {subSkus.length > 0 && (
                  <optgroup label="🏷️ Billing Sub-SKUs (A1, A2, Client Brands)">
                    {subSkus.map((sub) => (
                      <option key={`sub_${sub.id}`} value={`sub_${sub.id}`}>
                        [{sub.sub_sku_code}] {sub.sub_sku_name} ({sub.brand_name}) → Physical: [{sub.parent_fg_code || 'Parent'}]
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="🏭 Factory SKUs (Internal / Manufacturing)">
                  {finishedGoods.map((fg) => (
                    <option key={fg.id} value={fg.id}>
                      [{fg.fg_code}] {fg.product_name} (Avail: {fg.available_stock || 0})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Sales Date</label>
              <input
                type="date"
                value={directForm.sale_date}
                onChange={(e) => setDirectForm({ ...directForm, sale_date: e.target.value })}
                className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Quantity</label>
              <input
                type="number"
                step="0.001"
                value={directForm.quantity}
                onChange={(e) => setDirectForm({ ...directForm, quantity: e.target.value })}
                placeholder="Dispatch quantity"
                className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Selling Rate (₹)</label>
              <input
                type="number"
                step="0.01"
                value={directForm.rate}
                onChange={(e) => setDirectForm({ ...directForm, rate: e.target.value })}
                placeholder="Selling rate"
                className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Invoice / Challan No.</label>
              <input
                type="text"
                value={directForm.invoice_number}
                onChange={(e) => setDirectForm({ ...directForm, invoice_number: e.target.value })}
                placeholder="e.g. SL-2026-104"
                className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Customer / Party Name</label>
              <input
                type="text"
                value={directForm.customer_name}
                onChange={(e) => setDirectForm({ ...directForm, customer_name: e.target.value })}
                placeholder="Customer or dealer name"
                className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                required
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
