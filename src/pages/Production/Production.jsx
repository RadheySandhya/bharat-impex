import React, { useState, useEffect } from 'react';
import { 
  Factory, 
  Plus, 
  Play, 
  Pause, 
  CheckCircle2, 
  AlertOctagon, 
  Clock, 
  ArrowRight, 
  Layers, 
  Boxes, 
  Calendar, 
  User, 
  ShieldCheck,
  Flame,
  Check,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { DataTable } from '../../components/UI/DataTable';
import { StatusBadge } from '../../components/UI/StatusBadge';
import { Modal } from '../../components/UI/Modal';
import Icon from '../../components/UI/Icon';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export function Production() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // Planning wizard states
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [finishedGoods, setFinishedGoods] = useState([]);
  const [bomList, setBomList] = useState([]);
  const [reasons, setReasons] = useState([]);
  const [scrapMaterials, setScrapMaterials] = useState([]);

  const [planForm, setPlanForm] = useState({
    fg_id: '',
    bom_id: '',
    planned_quantity: 100,
    warehouse_id: 1,
    planned_start_date: new Date().toISOString().split('T')[0],
    priority: 'NORMAL',
    remarks: '',
  });
  const [bomCalc, setBomCalc] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Stage action modals
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [isCompleteStageModalOpen, setIsCompleteStageModalOpen] = useState(false);
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const [activeStage, setActiveStage] = useState(null);

  const [rejectionForm, setRejectionForm] = useState({
    rejection_reason_id: '',
    quantity: '',
    scrap_recoverable_quantity: '',
    scrap_material_id: '',
    remarks: '',
  });

  const [completeForm, setCompleteForm] = useState({
    good_quantity: '',
    rejected_quantity: 0,
    scrap_quantity: 0,
    loss_quantity: 0,
    remarks: '',
  });

  const [pauseReason, setPauseReason] = useState('Machine maintenance');

  const { success, error, warning } = useToast();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.production.getOrders();
      if (res?.data) {
        setOrders(res.data);
        if (selectedOrder) {
          // Re-fetch selected order details
          const updated = await api.production.getOrder(selectedOrder.id);
          if (updated?.data) setSelectedOrder(updated.data);
        }
      }
    } catch (err) {
      error('Failed to load production orders: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMasters = async () => {
    try {
      const [fgRes, bundleRes] = await Promise.all([
        api.finishedGoods.getAll(),
        api.settings.getBundle(),
      ]);

      if (fgRes?.data) setFinishedGoods(fgRes.data);
      if (bundleRes?.data) {
        setReasons(bundleRes.data.rejection_reasons || []);
        setScrapMaterials(bundleRes.data.scrap_materials || []);
      }
    } catch (err) {
      console.warn(err);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchMasters();
  }, []);

  // When FG changes in planning form, load its active BOM and calculate requirements
  const handleFGChange = async (fgId) => {
    setPlanForm((prev) => ({ ...prev, fg_id: fgId, bom_id: '' }));
    setBomCalc(null);

    if (!fgId) return;

    try {
      const res = await api.bom.getAll(fgId);
      if (res?.data && res.data.length > 0) {
        const activeBom = res.data.find((b) => b.is_active == 1) || res.data[0];
        setBomList(res.data);
        setPlanForm((prev) => ({ ...prev, bom_id: activeBom.id }));
        calculateRequirements(activeBom.id, planForm.planned_quantity);
      } else {
        setBomList([]);
        warning('No BOM found for this product. Please create a BOM first.');
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const calculateRequirements = async (bomId, qty) => {
    if (!bomId || !qty) return;
    setIsCalculating(true);
    try {
      const res = await api.production.calculate(bomId, qty, planForm.warehouse_id);
      if (res?.data) setBomCalc(res.data);
    } catch (err) {
      console.warn(err);
    } finally {
      setIsCalculating(false);
    }
  };

  const handlePlanSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.production.createOrder(planForm);
      success(`Production order ${res.data.production_number} created with dynamic manufacturing stages.`);
      setIsPlanModalOpen(false);
      fetchOrders();
    } catch (err) {
      error(err.message || 'Failed to create production order.');
    }
  };

  const handleApproveOrder = async (orderId) => {
    try {
      await api.production.approve(orderId);
      success('Order approved and Child Parts reserved in stock.');
      fetchOrders();
    } catch (err) {
      error(err.message || 'Approval failed.');
    }
  };

  const handleViewOrder = async (orderId) => {
    try {
      const res = await api.production.getOrder(orderId);
      if (res?.data) {
        setSelectedOrder(res.data);
      }
    } catch (err) {
      error('Failed to load order details: ' + err.message);
    }
  };

  // Stage execution actions
  const handleStartStage = async (stage) => {
    try {
      await api.production.startStage(stage.id);
      success(`Started stage: ${stage.process_name}`);
      fetchOrders();
    } catch (err) {
      error(err.message || 'Failed to start stage.');
    }
  };

  const handlePauseStageSubmit = async (e) => {
    e.preventDefault();
    if (!activeStage) return;
    try {
      await api.production.pauseStage(activeStage.id, pauseReason);
      success(`Paused stage: ${activeStage.process_name}`);
      setIsPauseModalOpen(false);
      fetchOrders();
    } catch (err) {
      error(err.message || 'Failed to pause stage.');
    }
  };

  const handleResumeStage = async (stage) => {
    try {
      await api.production.resumeStage(stage.id);
      success(`Resumed stage: ${stage.process_name}`);
      fetchOrders();
    } catch (err) {
      error(err.message || 'Failed to resume stage.');
    }
  };

  const handleLogRejectionSubmit = async (e) => {
    e.preventDefault();
    if (!activeStage) return;

    try {
      await api.production.logRejection({
        stage_id: activeStage.id,
        rejection_reason_id: Number(rejectionForm.rejection_reason_id),
        quantity: Number(rejectionForm.quantity),
        scrap_recoverable_quantity: Number(rejectionForm.scrap_recoverable_quantity || 0),
        scrap_material_id: rejectionForm.scrap_material_id ? Number(rejectionForm.scrap_material_id) : null,
        remarks: rejectionForm.remarks,
      });

      success('Rejection recorded and scrap inventory updated.');
      setIsRejectionModalOpen(false);
      fetchOrders();
    } catch (err) {
      error(err.message || 'Failed to log rejection.');
    }
  };

  const handleCompleteStageSubmit = async (e) => {
    e.preventDefault();
    if (!activeStage) return;

    try {
      await api.production.completeStage({
        stage_id: activeStage.id,
        good_quantity: Number(completeForm.good_quantity),
        rejected_quantity: Number(completeForm.rejected_quantity || 0),
        scrap_quantity: Number(completeForm.scrap_quantity || 0),
        loss_quantity: Number(completeForm.loss_quantity || 0),
        remarks: completeForm.remarks,
      });

      success(`Stage "${activeStage.process_name}" marked COMPLETED.`);
      setIsCompleteStageModalOpen(false);
      fetchOrders();
    } catch (err) {
      error(err.message || 'Failed to complete stage.');
    }
  };

  // Orders Table Columns
  const orderColumns = [
    {
      header: 'Order No.',
      key: 'production_number',
      render: (num) => <span className="font-mono font-bold text-slate-900">{num}</span>,
    },
    {
      header: 'Product (Finished Good)',
      key: 'product_name',
      render: (name, row) => (
        <div>
          <p className="font-bold text-slate-900">{name}</p>
          <p className="text-[11px] text-slate-500 font-medium">
            {row.fg_code} • Recipe: {row.bom_code} ({row.bom_version})
          </p>
        </div>
      ),
    },
    {
      header: 'Target Qty',
      key: 'planned_quantity',
      align: 'right',
      render: (qty, row) => (
        <span className="font-mono font-bold text-slate-900">
          {Number(qty).toLocaleString()} {row.unit_code}
        </span>
      ),
    },
    {
      header: 'Priority',
      key: 'priority',
      align: 'center',
      render: (p) => <StatusBadge status={p} size="xs" />,
    },
    {
      header: 'Status',
      key: 'status',
      align: 'center',
      render: (st) => <StatusBadge status={st} size="xs" />,
    },
    {
      header: 'Stage Progress',
      key: 'completed_stages',
      align: 'center',
      render: (comp, row) => (
        <div className="text-center">
          <span className="text-xs font-bold text-emerald-700 font-mono">
            {comp} / {row.total_stages}
          </span>
          <div className="w-16 bg-slate-100 rounded-full h-1.5 mx-auto mt-1 overflow-hidden border border-slate-200">
            <div
              className="bg-emerald-600 h-full rounded-full"
              style={{ width: `${row.total_stages > 0 ? (comp / row.total_stages) * 100 : 0}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      header: 'Active Stage',
      key: 'current_active_stage',
      render: (stage) => (
        <span className="text-xs font-semibold text-slate-700">
          {stage || '—'}
        </span>
      ),
    },
    {
      header: 'Action',
      key: 'id',
      align: 'center',
      sortable: false,
      render: (id, row) => (
        <div className="flex items-center gap-1.5 justify-center">
          {row.status === 'PLANNED' && (
            <button
              onClick={() => handleApproveOrder(row.id)}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs"
            >
              Approve & Reserve
            </button>
          )}

          <button
            type="button"
            onClick={() => handleViewOrder(row.id)}
            className="px-3 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <span>Track Stages</span>
            <Icon name="next" size="xs" ariaHidden={true} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Factory className="w-6 h-6 text-slate-800" />
            Production Planning & Multi-Stage Execution
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Dynamic product routes, automated BOM child part reservations, and stage-wise defect tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setPlanForm({
                fg_id: '',
                bom_id: '',
                planned_quantity: 100,
                warehouse_id: 1,
                planned_start_date: new Date().toISOString().split('T')[0],
                priority: 'NORMAL',
                remarks: '',
              });
              setBomCalc(null);
              setIsPlanModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Icon name="plus" size="xs" ariaHidden={true} />
            <span>Plan New Production Batch</span>
          </button>
        </div>
      </div>

      {/* Main Content: Orders Table OR Detailed Order Inspector */}
      {!selectedOrder ? (
        <DataTable
          columns={orderColumns}
          data={orders}
          loading={loading}
          searchPlaceholder="Search production orders by number, product name or code..."
        />
      ) : (
        /* Detailed Order Stage Execution Inspector */
        <div className="space-y-6">
          {/* Order Header Summary Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold mb-2 flex items-center gap-1 cursor-pointer"
                >
                  <Icon name="back" size="xs" ariaHidden={true} />
                  <span>Back to Orders List</span>
                </button>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-black text-slate-900 font-mono">{selectedOrder.production_number}</h2>
                  <StatusBadge status={selectedOrder.priority} size="xs" />
                  <StatusBadge status={selectedOrder.status} size="xs" />
                </div>
                <p className="text-sm font-semibold text-slate-700 mt-1">
                  Product: {selectedOrder.product_name} ({selectedOrder.fg_code})
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="text-right">
                  <span className="text-[11px] text-slate-500 font-medium">Target Output</span>
                  <p className="text-base font-bold text-slate-900 font-mono">
                    {Number(selectedOrder.planned_quantity)} {selectedOrder.unit_code}
                  </p>
                </div>

                <div className="text-right border-l border-slate-200 pl-4">
                  <span className="text-[11px] text-slate-500 font-medium">Produced Good</span>
                  <p className="text-base font-bold text-emerald-700 font-mono">
                    {Number(selectedOrder.produced_quantity || 0)} {selectedOrder.unit_code}
                  </p>
                </div>

                <div className="text-right border-l border-slate-200 pl-4">
                  <span className="text-[11px] text-slate-500 font-medium">Total Rejected</span>
                  <p className="text-base font-bold text-rose-600 font-mono">
                    {Number(selectedOrder.rejected_quantity || 0)} {selectedOrder.unit_code}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Stages Stepper & Execution Cards */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-700" />
              Dynamic Manufacturing Route Stages
            </h3>

            <div className="space-y-3">
              {selectedOrder.stages?.map((stage, idx) => {
                const isPending = stage.status === 'PENDING';
                const isReady = stage.status === 'READY';
                const isInProgress = stage.status === 'IN_PROGRESS';
                const isPaused = stage.status === 'PAUSED';
                const isCompleted = stage.status === 'COMPLETED';

                return (
                  <div
                    key={stage.id}
                    className={`p-5 rounded-2xl border transition-all duration-200 ${
                      isInProgress
                        ? 'border-slate-400 bg-white shadow-md'
                        : isCompleted
                        ? 'border-emerald-200 bg-emerald-50/30'
                        : isReady
                        ? 'border-slate-300 bg-white shadow-xs'
                        : 'border-slate-200 bg-slate-50/60'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                      {/* Left: Stage Title & Metrics */}
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                            isCompleted
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : isInProgress
                              ? 'bg-blue-600 text-white shadow-xs'
                              : isReady
                              ? 'bg-slate-100 text-slate-800 border border-slate-300'
                              : 'bg-slate-100 text-slate-400 border border-slate-200'
                          }`}
                        >
                          {isCompleted ? <Check className="w-5 h-5" /> : idx + 1}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-bold text-slate-900">{stage.process_name}</h4>
                            <span className="text-[11px] font-mono text-slate-500 font-semibold">({stage.process_code})</span>
                            <StatusBadge status={stage.status} size="xs" />
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                            <span>
                              Input:{' '}
                              <strong className="text-slate-900 font-mono">{Number(stage.input_quantity)}</strong>
                            </span>
                            <span>
                              Good Output:{' '}
                              <strong className="text-emerald-700 font-mono">{Number(stage.good_quantity)}</strong>
                            </span>
                            <span>
                              Rejected:{' '}
                              <strong className="text-rose-600 font-mono">{Number(stage.rejected_quantity)}</strong>
                            </span>
                            {Number(stage.scrap_quantity) > 0 && (
                              <span>
                                Recovered Scrap:{' '}
                                <strong className="text-amber-700 font-mono">{Number(stage.scrap_quantity)} KG</strong>
                              </span>
                            )}
                            {stage.total_duration_minutes > 0 && (
                              <span>
                                Duration:{' '}
                                <strong className="text-slate-700 font-medium">{stage.total_duration_minutes} mins</strong>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Tactile Action Controls */}
                      <div className="flex items-center gap-2 self-end lg:self-auto">
                        {(isReady || (isPending && idx === 0)) && (
                          <button
                            onClick={() => handleStartStage(stage)}
                            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5" /> Start Stage
                          </button>
                        )}

                        {isInProgress && (
                          <>
                            <button
                              onClick={() => {
                                setActiveStage(stage);
                                setRejectionForm({
                                  rejection_reason_id: reasons[0]?.id || '',
                                  quantity: '',
                                  scrap_recoverable_quantity: '',
                                  scrap_material_id: scrapMaterials[0]?.id || '',
                                  remarks: '',
                                });
                                setIsRejectionModalOpen(true);
                              }}
                              className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition-colors flex items-center gap-1 shadow-xs"
                            >
                              <AlertOctagon className="w-3.5 h-3.5" /> Log Rejection
                            </button>

                            <button
                              onClick={() => {
                                setActiveStage(stage);
                                setPauseReason('Break / Operator Shift Change');
                                setIsPauseModalOpen(true);
                              }}
                              className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold transition-colors flex items-center gap-1 shadow-xs"
                            >
                              <Pause className="w-3.5 h-3.5" /> Pause
                            </button>

                            <button
                              onClick={() => {
                                setActiveStage(stage);
                                setCompleteForm({
                                  good_quantity: Number(stage.input_quantity) - Number(stage.rejected_quantity || 0),
                                  rejected_quantity: Number(stage.rejected_quantity || 0),
                                  scrap_quantity: Number(stage.scrap_quantity || 0),
                                  loss_quantity: 0,
                                  remarks: '',
                                });
                                setIsCompleteStageModalOpen(true);
                              }}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-4 h-4" /> Complete Stage
                            </button>
                          </>
                        )}

                        {isPaused && (
                          <button
                            onClick={() => handleResumeStage(stage)}
                            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5" /> Resume Stage
                          </button>
                        )}

                        {isCompleted && (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-bold px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200">
                            <CheckCircle2 className="w-4 h-4" /> Stage Passed
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Consumed Child Parts Breakdown */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Boxes className="w-4 h-4 text-slate-700" />
              Child Part Consumption & Inventory Reservation
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50/90 text-slate-600 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Part Code</th>
                    <th className="px-4 py-3">Child Part Name</th>
                    <th className="px-4 py-3 text-right">Planned Qty (BOM)</th>
                    <th className="px-4 py-3 text-right">Reserved in Store</th>
                    <th className="px-4 py-3 text-right">Consumed on Floor</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedOrder.consumption?.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{c.rm_code}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{c.material_name}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                        {Number(c.planned_quantity)} {c.unit_code}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-amber-800 font-semibold">
                        {Number(c.reserved_quantity)} {c.unit_code}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-700 font-bold">
                        {Number(c.consumed_quantity)} {c.unit_code}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          RESERVED / ACTIVE
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Production Planning Wizard Modal */}
      <Modal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        title="Production Planning & BOM Material Requirement"
        maxWidth="max-w-3xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsPlanModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="plan-form"
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white shadow-xs"
            >
              Confirm Plan & Create Stages
            </button>
          </>
        }
      >
        <form id="plan-form" onSubmit={handlePlanSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Select Finished Good (SKU)</label>
              <select
                value={planForm.fg_id}
                onChange={(e) => handleFGChange(e.target.value)}
                className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                required
              >
                <option value="">-- Choose Finished Product --</option>
                {finishedGoods.map((fg) => (
                  <option key={fg.id} value={fg.id}>
                    [{fg.fg_code}] {fg.product_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Target Production Quantity</label>
              <input
                type="number"
                step="1"
                min="1"
                value={planForm.planned_quantity}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setPlanForm({ ...planForm, planned_quantity: val });
                  if (planForm.bom_id) calculateRequirements(planForm.bom_id, val);
                }}
                className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-slate-900 text-xs font-bold focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">BOM Recipe Version</label>
              <select
                value={planForm.bom_id}
                onChange={(e) => {
                  setPlanForm({ ...planForm, bom_id: e.target.value });
                  calculateRequirements(e.target.value, planForm.planned_quantity);
                }}
                className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                required
              >
                {bomList.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bom_code} ({b.version})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Priority</label>
              <select
                value={planForm.priority}
                onChange={(e) => setPlanForm({ ...planForm, priority: e.target.value })}
                className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-slate-900 text-xs font-semibold focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
              >
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High Priority</option>
                <option value="URGENT">Urgent (Express)</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Target Start Date</label>
              <input
                type="date"
                value={planForm.planned_start_date}
                onChange={(e) => setPlanForm({ ...planForm, planned_start_date: e.target.value })}
                className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                required
              />
            </div>
          </div>

          {/* BOM Material Availability Simulation Table */}
          {bomCalc && (
            <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Child Part Requirement & Availability Check
                </span>
                <span className="text-xs text-slate-500">
                  Est. Material Cost: <strong className="text-emerald-700">₹{bomCalc.total_estimated_cost?.toLocaleString()}</strong>
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-[11px] text-slate-700">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2">Child Part</th>
                      <th className="px-3 py-2 text-right">Per Unit</th>
                      <th className="px-3 py-2 text-right">Total Req.</th>
                      <th className="px-3 py-2 text-right">Available in Stock</th>
                      <th className="px-3 py-2 text-center">Sufficiency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bomCalc.items?.map((item) => (
                      <tr key={item.rm_id}>
                        <td className="px-3 py-2 font-semibold text-slate-900">
                          [{item.rm_code}] {item.material_name}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">{item.quantity_per_unit} {item.unit_code}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                          {item.total_required_qty} {item.unit_code}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          {item.available_stock} {item.unit_code}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {item.is_sufficient ? (
                            <span className="text-emerald-700 font-bold inline-flex items-center gap-1">
                              <Icon name="check" size="xs" ariaHidden={true} />
                              <span>Sufficient</span>
                            </span>
                          ) : (
                            <span className="text-rose-600 font-bold inline-flex items-center gap-1">
                              <Icon name="warning" size="xs" ariaHidden={true} />
                              <span>Short by {item.shortage_quantity}</span>
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
        </form>
      </Modal>

      {/* Log Stage Rejection Modal */}
      <Modal
        isOpen={isRejectionModalOpen}
        onClose={() => setIsRejectionModalOpen(false)}
        title={`Log Rejection for Stage: ${activeStage?.process_name}`}
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsRejectionModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="rejection-form"
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-xs"
            >
              Save Rejection Record
            </button>
          </>
        }
      >
        <form id="rejection-form" onSubmit={handleLogRejectionSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Rejection Reason</label>
              <select
                value={rejectionForm.rejection_reason_id}
                onChange={(e) => setRejectionForm({ ...rejectionForm, rejection_reason_id: e.target.value })}
                className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                required
              >
                {reasons.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.reason_name} ({r.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Rejected Quantity (Units)</label>
              <input
                type="number"
                step="0.001"
                value={rejectionForm.quantity}
                onChange={(e) => setRejectionForm({ ...rejectionForm, quantity: e.target.value })}
                placeholder="Number of defective parts"
                className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-slate-900 text-xs font-bold focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Recoverable Scrap (KG / Units)</label>
              <input
                type="number"
                step="0.001"
                value={rejectionForm.scrap_recoverable_quantity}
                onChange={(e) => setRejectionForm({ ...rejectionForm, scrap_recoverable_quantity: e.target.value })}
                placeholder="Recoverable scrap weight"
                className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Scrap Material Category</label>
              <select
                value={rejectionForm.scrap_material_id}
                onChange={(e) => setRejectionForm({ ...rejectionForm, scrap_material_id: e.target.value })}
                className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
              >
                <option value="">-- No Scrap Recovery --</option>
                {scrapMaterials.map((sm) => (
                  <option key={sm.id} value={sm.id}>
                    {sm.scrap_name} ({sm.unit_code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Defect Remarks & Notes</label>
            <input
              type="text"
              value={rejectionForm.remarks}
              onChange={(e) => setRejectionForm({ ...rejectionForm, remarks: e.target.value })}
              placeholder="e.g. Porosity on front facing tap spout"
              className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
            />
          </div>
        </form>
      </Modal>

      {/* Complete Stage Modal */}
      <Modal
        isOpen={isCompleteStageModalOpen}
        onClose={() => setIsCompleteStageModalOpen(false)}
        title={`Complete Stage: ${activeStage?.process_name}`}
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsCompleteStageModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="complete-stage-form"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-xs"
            >
              Finalize Stage & Advance Next
            </button>
          </>
        }
      >
        <form id="complete-stage-form" onSubmit={handleCompleteStageSubmit} className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium">
            Input Quantity for this stage: <strong className="text-slate-900">{Number(activeStage?.input_quantity)}</strong> units.
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Good Output (Passed)</label>
              <input
                type="number"
                step="0.001"
                value={completeForm.good_quantity}
                onChange={(e) => setCompleteForm({ ...completeForm, good_quantity: e.target.value })}
                className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-slate-900 text-xs font-bold focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Process Loss / Burnout</label>
              <input
                type="number"
                step="0.001"
                value={completeForm.loss_quantity}
                onChange={(e) => setCompleteForm({ ...completeForm, loss_quantity: e.target.value })}
                placeholder="Unaccounted / process loss"
                className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Stage Completion Remarks</label>
            <input
              type="text"
              value={completeForm.remarks}
              onChange={(e) => setCompleteForm({ ...completeForm, remarks: e.target.value })}
              placeholder="e.g. 100% leak testing passed at 6 bar"
              className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
            />
          </div>
        </form>
      </Modal>

      {/* Pause Modal */}
      <Modal
        isOpen={isPauseModalOpen}
        onClose={() => setIsPauseModalOpen(false)}
        title="Pause Production Stage"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsPauseModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="pause-form"
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-xs font-bold text-white shadow-xs"
            >
              Pause Stage
            </button>
          </>
        }
      >
        <form id="pause-form" onSubmit={handlePauseStageSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Reason for Pausing</label>
            <input
              type="text"
              value={pauseReason}
              onChange={(e) => setPauseReason(e.target.value)}
              className="w-full rounded-xl px-3 py-2 bg-white border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
              required
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
