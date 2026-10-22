import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RotateCcw, 
  Plus, 
  RefreshCw, 
  Layers, 
  ArrowRight,
  ShieldAlert,
  Search,
  Download
} from 'lucide-react';
import { downloadRMPurchaseTemplate } from '../../utils/csvTemplates';
import { DataTable } from '../../components/UI/DataTable';
import { StatusBadge } from '../../components/UI/StatusBadge';
import { Modal } from '../../components/UI/Modal';
import Icon from '../../components/UI/Icon';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export function Purchase() {
  const [activeTab, setActiveTab] = useState('history'); // 'upload', 'history', 'batches'
  const [purchases, setPurchases] = useState([]);
  const [batches, setBatches] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  // Upload wizard states
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(1);

  // Inline Quick Mapping modal
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [mappingRow, setMappingRow] = useState(null);
  const [selectedInternalRMId, setSelectedInternalRMId] = useState('');

  // Direct manual purchase modal
  const [isDirectModalOpen, setIsDirectModalOpen] = useState(false);
  const [directForm, setDirectForm] = useState({
    rm_id: '',
    warehouse_id: 1,
    quantity: '',
    rate: '',
    invoice_number: '',
    supplier_name: '',
    purchase_date: new Date().toISOString().split('T')[0],
    remarks: '',
  });

  const { success, error, warning } = useToast();

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const res = await api.purchase.getAll();
      if (res?.data) setPurchases(res.data);
    } catch (err) {
      error('Failed to load purchases: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchBatches = async () => {
    try {
      const res = await api.purchase.getBatches();
      if (res?.data) setBatches(res.data);
    } catch (err) {
      console.warn(err);
    }
  };

  const fetchMasters = async () => {
    try {
      const res = await api.rawMaterials.getAll();
      if (res?.data) setRawMaterials(res.data);
    } catch (err) {
      console.warn(err);
    }
  };

  useEffect(() => {
    fetchPurchases();
    fetchBatches();
    fetchMasters();
  }, []);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsUploading(true);

    try {
      const res = await api.purchase.uploadPreview(file);
      if (res?.data) {
        setPreviewData(res.data);
        if (res.data.is_duplicate) {
          warning(`Duplicate warning: A file with this content was already imported as batch ${res.data.duplicate_batch.batch_code}`);
        } else {
          success(`Parsed ${res.data.total_rows} rows from ${file.name}`);
        }
      }
    } catch (err) {
      error(err.message || 'Failed to parse CSV file.');
      setPreviewData(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewData) return;
    setIsUploading(true);

    try {
      const res = await api.purchase.confirmImport(previewData, selectedWarehouseId);
      success(`Imported ${res.data.successful_rows} purchase line items into Child Part stock.`);
      setPreviewData(null);
      setSelectedFile(null);
      setActiveTab('history');
      fetchPurchases();
      fetchBatches();
    } catch (err) {
      error(err.message || 'Import failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleQuickMapSave = async (e) => {
    e.preventDefault();
    if (!mappingRow || !selectedInternalRMId) return;

    try {
      const res = await api.mappings.save({
        external_item_name: mappingRow.tally_item_name,
        material_type: 'RM',
        internal_item_id: Number(selectedInternalRMId),
      });

      success(`Mapped "${mappingRow.tally_item_name}" to ${res.data.internal_item_code}`);

      // Update in previewData in-memory
      const updatedRows = previewData.rows.map((r) => {
        if (r.tally_item_name.toUpperCase() === mappingRow.tally_item_name.toUpperCase()) {
          return {
            ...r,
            status: 'VALID',
            validation_msg: '',
            mapping: {
              internal_id: res.data.internal_item_id,
              internal_code: res.data.internal_item_code,
            },
          };
        }
        return r;
      });

      const validCount = updatedRows.filter((r) => r.status === 'VALID').length;
      const unmappedCount = updatedRows.filter((r) => r.status === 'UNMAPPED').length;

      setPreviewData({
        ...previewData,
        rows: updatedRows,
        valid_rows: validCount,
        unmapped_rows: unmappedCount,
      });

      setIsMapModalOpen(false);
    } catch (err) {
      error(err.message || 'Failed to save mapping.');
    }
  };

  const handleReverseBatch = async (batchId) => {
    if (!window.confirm('Are you sure you want to reverse this entire purchase batch? This will decrease child part stock and create cancellation ledger entries.')) {
      return;
    }

    try {
      await api.purchase.reverseBatch(batchId);
      success('Purchase batch reversed successfully.');
      fetchPurchases();
      fetchBatches();
    } catch (err) {
      error(err.message || 'Reversal failed.');
    }
  };

  const handleDirectPurchaseSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.purchase.createDirect(directForm);
      success('Manual purchase recorded and stock updated.');
      setIsDirectModalOpen(false);
      fetchPurchases();
    } catch (err) {
      error(err.message || 'Failed to create purchase.');
    }
  };

  // Purchase History Columns
  const purchaseColumns = [
    {
      header: 'Date',
      key: 'purchase_date',
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
      header: 'Supplier Name',
      key: 'supplier_name',
      render: (name) => <span className="text-slate-900 font-semibold">{name || '—'}</span>,
    },
    {
      header: 'Child Part',
      key: 'rm_code',
      render: (code, row) => (
        <div>
          <span className="font-mono font-bold text-blue-600">{code}</span>
          <p className="text-[11px] text-slate-500">{row.material_name}</p>
        </div>
      ),
    },
    {
      header: 'Tally Item Name',
      key: 'tally_item_name',
      render: (tName) => <span className="text-xs text-slate-600 italic">{tName}</span>,
    },
    {
      header: 'Quantity',
      key: 'quantity',
      align: 'right',
      render: (qty, row) => (
        <span className="font-mono font-bold text-emerald-700 text-sm">
          +{Number(qty).toLocaleString()} {row.unit_code}
        </span>
      ),
    },
    {
      header: 'Rate (₹)',
      key: 'rate',
      align: 'right',
      render: (rate) => <span className="font-mono text-slate-700">₹{Number(rate).toFixed(2)}</span>,
    },
    {
      header: 'Total Amount',
      key: 'amount',
      align: 'right',
      render: (amt) => <span className="font-mono font-bold text-slate-900">₹{Number(amt).toLocaleString()}</span>,
    },
    {
      header: 'Source Batch',
      key: 'batch_code',
      render: (batch) => <span className="text-[11px] font-mono text-slate-500">{batch || 'Direct'}</span>,
    },
  ];

  // Batch History Columns
  const batchColumns = [
    { header: 'Batch Code', key: 'batch_code', render: (code) => <span className="font-mono font-bold text-blue-600">{code}</span> },
    { header: 'File Name', key: 'file_name', render: (name) => <span className="text-slate-900 font-medium">{name}</span> },
    { header: 'Imported At', key: 'imported_at', render: (dt) => <span className="font-mono text-xs text-slate-500">{dt}</span> },
    { header: 'Total Rows', key: 'total_rows', align: 'center' },
    { header: 'Success Rows', key: 'successful_rows', align: 'center', render: (v) => <span className="text-emerald-400 font-bold">{v}</span> },
    { header: 'Status', key: 'status', render: (status) => <StatusBadge status={status} size="xs" /> },
    { header: 'Imported By', key: 'imported_by_name', render: (name) => <span className="text-xs text-slate-400">{name || 'System'}</span> },
    {
      header: 'Action',
      key: 'id',
      align: 'center',
      sortable: false,
      render: (id, row) => (
        row.status === 'IMPORTED' ? (
          <button
            onClick={() => handleReverseBatch(row.id)}
            className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-xs font-semibold transition-colors flex items-center gap-1"
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
            <Icon name="shopping-cart" size="lg" className="text-slate-900" ariaHidden={true} />
            <span>Tally Purchase Inward & RM Input</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Smart CSV upload with duplicate detection, Tally item mapping resolver, and stock ledger updates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsDirectModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-xs transition-colors cursor-pointer"
          >
            <Icon name="plus" size="xs" ariaHidden={true} />
            <span>Direct Purchase Entry</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Icon name="upload" size="xs" ariaHidden={true} />
            <span>Upload Tally CSV</span>
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
          <span>Purchase History</span>
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
          {/* Download Pre-Filled RM Template Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-amber-950 text-xs sm:text-sm">
                  Download Pre-Filled Child Part Purchase CSV Format
                </h4>
                <p className="text-[11px] text-amber-800 font-medium">
                  All active Child Parts (Brass rods, copper, ceramic cartridges, screws) are already pre-filled. Just enter quantities and upload!
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => downloadRMPurchaseTemplate(rawMaterials)}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download RM Template (.csv)</span>
            </button>
          </div>

          {/* File Upload Zone */}
          {!previewData && (
            <div className="bg-white p-10 rounded-2xl border-2 border-dashed border-slate-300 hover:border-slate-400 transition-colors text-center flex flex-col items-center justify-center shadow-xs">
              <div className="p-4 rounded-2xl bg-slate-100 text-slate-700 mb-4">
                <Upload className="w-10 h-10" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 mb-1">Select or Drop Tally Purchase CSV</h3>
              <p className="text-xs text-slate-500 max-w-md mb-6 font-medium">
                Upload daily export from Tally ERP / Prime containing Date, Item Name, Quantity, Rate and Supplier.
              </p>

              <label className="cursor-pointer px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors">
                {isUploading ? 'Parsing CSV...' : 'Browse CSV File'}
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

          {/* CSV Preview Section */}
          {previewData && (
            <div className="space-y-4">
              {/* Batch Summary Header */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-slate-700" />
                    <h3 className="text-sm font-bold text-slate-900 font-mono">{previewData.file_name}</h3>
                    {previewData.is_duplicate && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                        Duplicate File Hash
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    Total: <strong className="text-slate-900">{previewData.total_rows}</strong> • Valid & Mapped:{' '}
                    <strong className="text-emerald-700">{previewData.valid_rows}</strong> • Unmapped:{' '}
                    <strong className="text-rose-600">{previewData.unmapped_rows}</strong>
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
                    {isUploading ? 'Processing...' : `Confirm & Inward ${previewData.valid_rows} Items`}
                  </button>
                </div>
              </div>

              {/* Preview Rows Table */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50/90 text-slate-600 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Tally Item Name</th>
                        <th className="px-4 py-3">System Mapping</th>
                        <th className="px-4 py-3 text-right">Quantity</th>
                        <th className="px-4 py-3 text-right">Rate</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-center">Action</th>
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
                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                            {row.quantity} {row.unit}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-700">₹{row.rate}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">₹{row.amount}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={row.status} size="xs" />
                          </td>
                          <td className="px-4 py-3 text-center">
                            {row.status === 'UNMAPPED' && (
                              <button
                                onClick={() => {
                                  setMappingRow(row);
                                  setSelectedInternalRMId('');
                                  setIsMapModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-[11px] font-bold text-white shadow-xs transition-colors"
                              >
                                Map Now
                              </button>
                            )}
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

      {/* Tab 2: Purchase Line Items History */}
      {activeTab === 'history' && (
        <DataTable
          columns={purchaseColumns}
          data={purchases}
          loading={loading}
          searchPlaceholder="Search purchases by invoice, supplier, or material..."
        />
      )}

      {/* Tab 3: Batches & Reversals */}
      {activeTab === 'batches' && (
        <DataTable
          columns={batchColumns}
          data={batches}
          loading={loading}
          searchPlaceholder="Search import batches..."
        />
      )}

      {/* Quick Map Inline Modal */}
      <Modal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        title="Map Tally Item to Internal Child Part"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsMapModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="quick-map-form"
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white shadow-xs"
            >
              Save Mapping & Validate Row
            </button>
          </>
        }
      >
        <form id="quick-map-form" onSubmit={handleQuickMapSave} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Tally Item Name (From CSV)</label>
            <input
              type="text"
              value={mappingRow?.tally_item_name || ''}
              readOnly
              className="w-full rounded-xl px-3 py-2 bg-slate-50 border border-slate-300 text-slate-900 font-semibold text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Map to System Child Part</label>
            <select
              value={selectedInternalRMId}
              onChange={(e) => setSelectedInternalRMId(e.target.value)}
              className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
              required
            >
              <option value="">-- Choose Child Part --</option>
              {rawMaterials.map((rm) => (
                <option key={rm.id} value={rm.id}>
                  [{rm.rm_code}] {rm.material_name} ({rm.unit_code})
                </option>
              ))}
            </select>
          </div>
        </form>
      </Modal>

      {/* Direct Purchase Modal */}
      <Modal
        isOpen={isDirectModalOpen}
        onClose={() => setIsDirectModalOpen(false)}
        title="Direct Child Part Purchase Inward"
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
              form="direct-purchase-form"
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white shadow-xs"
            >
              Confirm Purchase
            </button>
          </>
        }
      >
        <form id="direct-purchase-form" onSubmit={handleDirectPurchaseSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Select Child Part</label>
              <select
                value={directForm.rm_id}
                onChange={(e) => setDirectForm({ ...directForm, rm_id: e.target.value })}
                className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                required
              >
                <option value="">-- Choose Material --</option>
                {rawMaterials.map((rm) => (
                  <option key={rm.id} value={rm.id}>
                    [{rm.rm_code}] {rm.material_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Purchase Date</label>
              <input
                type="date"
                value={directForm.purchase_date}
                onChange={(e) => setDirectForm({ ...directForm, purchase_date: e.target.value })}
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
                placeholder="Inward quantity"
                className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Unit Rate (₹)</label>
              <input
                type="number"
                step="0.01"
                value={directForm.rate}
                onChange={(e) => setDirectForm({ ...directForm, rate: e.target.value })}
                placeholder="Purchase rate"
                className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Invoice Number</label>
              <input
                type="text"
                value={directForm.invoice_number}
                onChange={(e) => setDirectForm({ ...directForm, invoice_number: e.target.value })}
                placeholder="e.g. INV-2026-089"
                className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Supplier Name</label>
              <input
                type="text"
                value={directForm.supplier_name}
                onChange={(e) => setDirectForm({ ...directForm, supplier_name: e.target.value })}
                placeholder="Supplier firm name"
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
