import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  FileSpreadsheet, 
  Search, 
  CheckCircle2, 
  Layers, 
  Boxes, 
  TrendingUp, 
  ShieldCheck, 
  Printer, 
  Download,
  Flame,
  ArrowRight
} from 'lucide-react';
import { DataTable } from '../../components/UI/DataTable';
import { StatusBadge } from '../../components/UI/StatusBadge';
import Icon from '../../components/UI/Icon';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { triggerDownload } from '../../utils/csvTemplates';

export function Reports() {
  const [activeReport, setActiveReport] = useState('efficiency'); // 'efficiency', 'valuation', 'traceability'
  const [efficiencyData, setEfficiencyData] = useState([]);
  const [valuationData, setValuationData] = useState({ items: [], total_valuation: 0 });
  const [finishedGoods, setFinishedGoods] = useState([]);
  const [selectedFGId, setSelectedFGId] = useState('');
  const [traceabilityData, setTraceabilityData] = useState(null);
  const [loading, setLoading] = useState(false);

  const { error } = useToast();

  const fetchEfficiency = async () => {
    setLoading(true);
    try {
      const res = await api.reports.getStageEfficiency();
      if (res?.data) setEfficiencyData(res.data);
    } catch (err) {
      error('Failed to load stage efficiency: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchValuation = async () => {
    setLoading(true);
    try {
      const res = await api.reports.getStockValuation();
      if (res?.data) setValuationData(res.data);
    } catch (err) {
      error('Failed to load stock valuation: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTraceability = async (fgId) => {
    if (!fgId) return;
    setLoading(true);
    try {
      const res = await api.reports.getSKUTraceability(fgId);
      if (res?.data) setTraceabilityData(res.data);
    } catch (err) {
      error('Failed to load SKU traceability: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.finishedGoods.getAll().then((res) => {
      if (res?.data && res.data.length > 0) {
        setFinishedGoods(res.data);
        setSelectedFGId(res.data[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (activeReport === 'efficiency') fetchEfficiency();
    else if (activeReport === 'valuation') fetchValuation();
    else if (activeReport === 'traceability' && selectedFGId) fetchTraceability(selectedFGId);
  }, [activeReport, selectedFGId]);

  const exportCSV = (data, filename) => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map((row) => Object.values(row).map((val) => `"${val}"`).join(','));
    const csvContent = [headers, ...rows].join('\n');
    triggerDownload(csvContent, `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Efficiency Columns
  const efficiencyColumns = [
    { header: 'Process Code', key: 'process_code', render: (c) => <span className="font-mono font-bold text-slate-900">{c}</span> },
    { header: 'Manufacturing Stage', key: 'process_name', render: (n) => <span className="font-semibold text-slate-900">{n}</span> },
    { header: 'Batches Processed', key: 'total_batches', align: 'center', render: (b) => <span className="font-mono font-bold text-slate-900">{b}</span> },
    { header: 'Total Input', key: 'total_input', align: 'right', render: (v) => <span className="font-mono text-slate-700">{Number(v).toLocaleString()}</span> },
    { header: 'Good Output', key: 'total_good', align: 'right', render: (v) => <span className="font-mono font-bold text-emerald-700">{Number(v).toLocaleString()}</span> },
    { header: 'Rejected Defective', key: 'total_rejected', align: 'right', render: (v) => <span className="font-mono font-bold text-rose-700">{Number(v).toLocaleString()}</span> },
    {
      header: 'Stage Efficiency %',
      key: 'efficiency_pct',
      align: 'right',
      render: (pct) => (
        <span className={`font-mono font-bold text-sm ${Number(pct) >= 95 ? 'text-emerald-700' : 'text-amber-700'}`}>
          {pct}%
        </span>
      ),
    },
    {
      header: 'Rejection Rate %',
      key: 'rejection_pct',
      align: 'right',
      render: (pct) => (
        <span className="font-mono font-bold text-xs text-rose-700">
          {pct}%
        </span>
      ),
    },
  ];

  // Valuation Columns
  const valuationColumns = [
    {
      header: 'Type',
      key: 'material_type',
      render: (t) => (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
          {t}
        </span>
      ),
    },
    { header: 'Material Code', key: 'material_code', render: (c) => <span className="font-mono font-bold text-slate-900">{c}</span> },
    { header: 'Material / Product Name', key: 'material_name', render: (n) => <span className="font-semibold text-slate-900">{n}</span> },
    { header: 'Current Stock', key: 'quantity', align: 'right', render: (q, r) => <span className="font-mono font-bold text-slate-900">{Number(q).toLocaleString()} {r.unit_code}</span> },
    { header: 'Unit Rate (₹)', key: 'unit_rate', align: 'right', render: (r) => <span className="font-mono text-slate-700">₹{Number(r).toFixed(2)}</span> },
    { header: 'Valuation Total (₹)', key: 'total_valuation', align: 'right', render: (v) => <span className="font-mono font-bold text-emerald-700 text-sm">₹{Number(v).toLocaleString()}</span> },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-wide flex items-center gap-2">
            <Icon name="reports" size="lg" className="text-slate-900" ariaHidden={true} />
            <span>Analytical Reports & Manufacturing Audits</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Real-time stage efficiency yields, inventory valuation, and complete SKU lifecycle traceability.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (activeReport === 'efficiency') exportCSV(efficiencyData, 'Stage_Efficiency_Report');
              else if (activeReport === 'valuation') exportCSV(valuationData.items, 'Stock_Valuation_Report');
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-xs transition-colors cursor-pointer"
          >
            <Icon name="download" size="xs" ariaHidden={true} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 border border-slate-200 rounded-xl p-1 text-xs w-fit">
        <button
          type="button"
          onClick={() => setActiveReport('efficiency')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
            activeReport === 'efficiency' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Icon name="gauge" size="xs" ariaHidden={true} />
          <span>Stage Efficiency & Yields</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveReport('valuation')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
            activeReport === 'valuation' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Icon name="receipt" size="xs" ariaHidden={true} />
          <span>Inventory Valuation (₹)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveReport('traceability')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
            activeReport === 'traceability' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Icon name="workflow" size="xs" ariaHidden={true} />
          <span>SKU Lifecycle Traceability</span>
        </button>
      </div>

      {/* Report 1: Stage Efficiency */}
      {activeReport === 'efficiency' && (
        <DataTable
          columns={efficiencyColumns}
          data={efficiencyData}
          loading={loading}
          searchPlaceholder="Search stage efficiency by process name or code..."
        />
      )}

      {/* Report 2: Inventory Valuation */}
      {activeReport === 'valuation' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Total Company Inventory Valuation</span>
              <h2 className="text-2xl font-extrabold text-slate-900 mt-1">
                ₹{Number(valuationData.total_valuation || 0).toLocaleString()}
              </h2>
            </div>
            <Icon name="boxes" size="3xl" className="text-emerald-600 opacity-90" ariaHidden={true} />
          </div>

          <DataTable
            columns={valuationColumns}
            data={valuationData.items}
            loading={loading}
            searchPlaceholder="Search stock valuation items..."
          />
        </div>
      )}

      {/* Report 3: SKU Lifecycle Traceability */}
      {activeReport === 'traceability' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-4">
            <label className="text-xs font-bold uppercase text-slate-700">Select Finished Good (SKU):</label>
            <select
              value={selectedFGId}
              onChange={(e) => {
                setSelectedFGId(e.target.value);
                fetchTraceability(e.target.value);
              }}
              className="bg-white rounded-xl px-4 py-2 text-slate-900 border border-slate-300 text-xs font-semibold w-80 focus:ring-2 focus:ring-slate-900"
            >
              {finishedGoods.map((fg) => (
                <option key={fg.id} value={fg.id}>
                  [{fg.fg_code}] {fg.product_name}
                </option>
              ))}
            </select>
          </div>

          {traceabilityData && (
            <div className="space-y-5">
              {/* Product Info */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
                <h3 className="text-base font-bold text-slate-900">
                  [{traceabilityData.finished_good.fg_code}] {traceabilityData.finished_good.product_name}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Category: {traceabilityData.finished_good.category_name || 'General'} • Standard Selling Price: ₹{traceabilityData.finished_good.selling_price}
                </p>
              </div>

              {/* Associated Production Orders */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Historical Production Orders ({traceabilityData.productions.length} Orders)
                </h4>

                {traceabilityData.productions.map((po) => (
                  <div key={po.id} className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <span className="font-mono font-bold text-slate-900 text-sm">{po.production_number}</span>
                        <span className="text-xs text-slate-500 ml-3">Recipe: {po.bom_code} ({po.bom_version})</span>
                      </div>
                      <StatusBadge status={po.status} size="xs" />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase font-bold">Planned Output</span>
                        <p className="font-mono font-bold text-slate-900">{Number(po.planned_quantity)}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase font-bold">Good Produced</span>
                        <p className="font-mono font-bold text-emerald-700">{Number(po.produced_quantity)}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase font-bold">Total Rejection</span>
                        <p className="font-mono font-bold text-rose-700">{Number(po.rejected_quantity)}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase font-bold">Scrap Generated</span>
                        <p className="font-mono font-bold text-amber-700">{Number(po.scrap_quantity)} KG</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
