import React, { useState, useEffect } from 'react';
import Icon from '../../components/UI/Icon';
import { StatusBadge } from '../../components/UI/StatusBadge';
import { Modal } from '../../components/UI/Modal';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export function OperatorMobileQueue() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [reasons, setReasons] = useState([]);

  // Modal states
  const [isRejectionOpen, setIsRejectionOpen] = useState(false);
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);

  const [rejQty, setRejQty] = useState('');
  const [rejReasonId, setRejReasonId] = useState('');
  const [goodQty, setGoodQty] = useState('');

  const { success, error } = useToast();

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const [qRes, bRes] = await Promise.all([
        api.production.getQueue(),
        api.settings.getBundle(),
      ]);

      if (qRes?.data) setQueue(qRes.data);
      if (bRes?.data) {
        setReasons(bRes.data.rejection_reasons || []);
        if (bRes.data.rejection_reasons?.[0]) {
          setRejReasonId(bRes.data.rejection_reasons[0].id);
        }
      }
    } catch (err) {
      error('Failed to load operator queue: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 15000); // Auto-refresh queue every 15s
    return () => clearInterval(interval);
  }, []);

  const handleStart = async (task) => {
    try {
      await api.production.startStage(task.id);
      success(`Started: ${task.process_name} (${task.production_number})`);
      fetchQueue();
      if (selectedTask?.id === task.id) {
        setSelectedTask({ ...selectedTask, status: 'IN_PROGRESS' });
      }
    } catch (err) {
      error(err.message || 'Failed to start stage');
    }
  };

  const handlePause = async (task) => {
    try {
      await api.production.pauseStage(task.id, 'Operator pause');
      success(`Paused: ${task.process_name}`);
      fetchQueue();
      if (selectedTask?.id === task.id) {
        setSelectedTask({ ...selectedTask, status: 'PAUSED' });
      }
    } catch (err) {
      error(err.message || 'Failed to pause stage');
    }
  };

  const handleResume = async (task) => {
    try {
      await api.production.resumeStage(task.id);
      success(`Resumed: ${task.process_name}`);
      fetchQueue();
      if (selectedTask?.id === task.id) {
        setSelectedTask({ ...selectedTask, status: 'IN_PROGRESS' });
      }
    } catch (err) {
      error(err.message || 'Failed to resume stage');
    }
  };

  const handleRejectionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTask || !rejQty) return;

    try {
      await api.production.logRejection({
        stage_id: selectedTask.id,
        rejection_reason_id: Number(rejReasonId),
        quantity: Number(rejQty),
        scrap_recoverable_quantity: Number(rejQty) * 0.9, // Default scrap estimate
        scrap_material_id: 1,
        remarks: 'Shopfloor quick mobile log',
      });

      success(`Defect logged (${rejQty} units).`);
      setIsRejectionOpen(false);
      setRejQty('');
      fetchQueue();
    } catch (err) {
      error(err.message || 'Failed to log rejection.');
    }
  };

  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTask || !goodQty) return;

    try {
      await api.production.completeStage({
        stage_id: selectedTask.id,
        good_quantity: Number(goodQty),
        rejected_quantity: Number(selectedTask.rejected_quantity || 0),
        remarks: 'Completed via operator shopfloor console',
      });

      success(`Stage "${selectedTask.process_name}" passed.`);
      setIsCompleteOpen(false);
      setSelectedTask(null);
      fetchQueue();
    } catch (err) {
      error(err.message || 'Failed to complete stage.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header Banner */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-slate-100 text-slate-900">
            <Icon name="activity" size="xl" ariaHidden={true} />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-wide">
              Shopfloor Tactile Operator Console
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Live Stage Queue • Big Touch Controls • Instant Rejection Logging
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchQueue}
          className="p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs transition-colors cursor-pointer"
          title="Refresh Queue"
          aria-label="Refresh Queue"
        >
          <Icon name="refresh" size="sm" spin={loading} className={loading ? 'text-slate-900' : ''} ariaHidden={true} />
        </button>
      </div>

      {/* Main Queue List */}
      <div className="space-y-3">
        {queue.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200/90 text-center text-slate-500 shadow-xs">
            <div className="flex justify-center mb-3">
              <Icon name="circlecheck" size="3xl" className="text-emerald-600 opacity-90" ariaHidden={true} />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">No Pending Stages in Queue</h3>
            <p className="text-xs text-slate-500">All assigned production stages are up to date.</p>
          </div>
        ) : (
          queue.map((task) => {
            const isInProgress = task.status === 'IN_PROGRESS';
            const isPaused = task.status === 'PAUSED';
            const isReady = task.status === 'READY';
            const processIcon = task.icon_key || task.process_code?.toLowerCase() || 'factory';

            return (
              <div
                key={task.id}
                className={`bg-white rounded-2xl border transition-all duration-200 p-5 shadow-xs ${
                  isInProgress
                    ? 'border-slate-900 ring-2 ring-slate-900/10'
                    : isPaused
                    ? 'border-amber-300 bg-amber-50/20'
                    : 'border-slate-200/90 hover:border-slate-300'
                }`}
              >
                {/* Stage Info Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-extrabold text-slate-900 text-sm">{task.production_number}</span>
                      <StatusBadge status={task.priority} size="xs" />
                      <StatusBadge status={task.status} size="xs" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{task.product_name}</h3>
                  </div>

                  <div className="text-right sm:self-auto self-end flex items-center gap-2">
                    <Icon name={processIcon} size="md" className="text-slate-400" ariaHidden={true} />
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Stage {task.sequence}
                      </span>
                      <span className="text-sm font-bold text-emerald-700">{task.process_name}</span>
                    </div>
                  </div>
                </div>

                {/* Quantitative Metrics */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center mb-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500">Input</span>
                    <p className="text-sm font-extrabold text-slate-900 font-mono">{Number(task.input_quantity)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-700">Good Output</span>
                    <p className="text-sm font-extrabold text-emerald-700 font-mono">{Number(task.good_quantity)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-rose-700">Rejected</span>
                    <p className="text-sm font-extrabold text-rose-700 font-mono">{Number(task.rejected_quantity)}</p>
                  </div>
                </div>

                {/* Big Tactile Action Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {isReady && (
                    <button
                      type="button"
                      onClick={() => handleStart(task)}
                      className="col-span-2 sm:col-span-4 py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Icon name="play" size="sm" ariaHidden={true} />
                      <span>START STAGE NOW</span>
                    </button>
                  )}

                  {isInProgress && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTask(task);
                          setRejQty('');
                          setIsRejectionOpen(true);
                        }}
                        className="py-3 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Icon name="circlex" size="sm" ariaHidden={true} />
                        <span>LOG DEFECT</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePause(task)}
                        className="py-3 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Icon name="pause" size="sm" ariaHidden={true} />
                        <span>PAUSE</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTask(task);
                          setGoodQty(Number(task.input_quantity) - Number(task.rejected_quantity || 0));
                          setIsCompleteOpen(true);
                        }}
                        className="col-span-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Icon name="circlecheck" size="sm" ariaHidden={true} />
                        <span>COMPLETE STAGE</span>
                      </button>
                    </>
                  )}

                  {isPaused && (
                    <button
                      type="button"
                      onClick={() => handleResume(task)}
                      className="col-span-2 sm:col-span-4 py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Icon name="play" size="sm" ariaHidden={true} />
                      <span>RESUME STAGE</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Mobile Log Defect Modal */}
      <Modal
        isOpen={isRejectionOpen}
        onClose={() => setIsRejectionOpen(false)}
        title="Log Defective / Rejected Parts"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsRejectionOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="operator-rej-form"
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-sm cursor-pointer"
            >
              Record Defect
            </button>
          </>
        }
      >
        <form id="operator-rej-form" onSubmit={handleRejectionSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1 text-sm">Defect / Rejection Reason</label>
            <select
              value={rejReasonId}
              onChange={(e) => setRejReasonId(e.target.value)}
              className="w-full bg-white rounded-xl px-3 py-2.5 text-slate-900 border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-slate-900"
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
            <label className="block text-slate-700 font-bold mb-1 text-sm">Defective Quantity (PCS)</label>
            <input
              type="number"
              min="1"
              required
              value={rejQty}
              onChange={(e) => setRejQty(e.target.value)}
              placeholder="e.g. 5"
              className="w-full bg-white rounded-xl px-3 py-2.5 text-slate-900 border border-slate-300 text-lg font-mono font-bold focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </form>
      </Modal>

      {/* Complete Stage Modal */}
      <Modal
        isOpen={isCompleteOpen}
        onClose={() => setIsCompleteOpen(false)}
        title="Complete Production Stage"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsCompleteOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="operator-complete-form"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-sm cursor-pointer"
            >
              Confirm Stage Handover
            </button>
          </>
        }
      >
        <form id="operator-complete-form" onSubmit={handleCompleteSubmit} className="space-y-4 text-xs">
          <p className="text-slate-600">
            Confirming output for <span className="font-bold text-slate-900">{selectedTask?.process_name}</span>.
            Good output pieces will transfer to the next stage buffer or Finished Goods inventory.
          </p>

          <div>
            <label className="block text-slate-700 font-bold mb-1 text-sm">Good Output Quantity (PCS)</label>
            <input
              type="number"
              min="0"
              required
              value={goodQty}
              onChange={(e) => setGoodQty(e.target.value)}
              className="w-full bg-white rounded-xl px-3 py-2.5 text-slate-900 border border-slate-300 text-lg font-mono font-bold focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default OperatorMobileQueue;
