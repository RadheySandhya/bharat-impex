import React, { useState, useEffect } from 'react';
import { 
  GitBranch, 
  Plus, 
  MoveUp, 
  MoveDown, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Settings2, 
  Layers, 
  ArrowRight,
  ExternalLink,
  Edit2
} from 'lucide-react';
import { DataTable } from '../../components/UI/DataTable';
import { StatusBadge } from '../../components/UI/StatusBadge';
import { Modal } from '../../components/UI/Modal';
import Icon from '../../components/UI/Icon';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export function Processes() {
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Process Modal
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [editingProcess, setEditingProcess] = useState(null);
  const [processForm, setProcessForm] = useState({
    process_name: '',
    process_code: '',
    standard_duration_minutes: 30,
    description: '',
  });

  const { success, error } = useToast();

  const fetchProcesses = async () => {
    setLoading(true);
    try {
      const pRes = await api.processes.getAll();
      if (pRes?.data) {
        // Sort by sequence
        const sorted = [...pRes.data].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
        setProcesses(sorted);
      }
    } catch (err) {
      error('Failed to load processes: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcesses();
  }, []);

  const openCreateModal = () => {
    setEditingProcess(null);
    setProcessForm({
      process_name: '',
      process_code: `PROC-${processes.length + 1}`,
      standard_duration_minutes: 30,
      description: '',
    });
    setIsProcessModalOpen(true);
  };

  const openEditModal = (proc) => {
    setEditingProcess(proc);
    setProcessForm({
      process_name: proc.process_name,
      process_code: proc.process_code,
      standard_duration_minutes: proc.standard_duration_minutes || 30,
      description: proc.description || '',
    });
    setIsProcessModalOpen(true);
  };

  const handleProcessSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProcess) {
        await api.processes.update({
          id: editingProcess.id,
          ...processForm,
        });
        success('Manufacturing process updated.');
      } else {
        await api.processes.create({
          ...processForm,
          sequence: processes.length + 1,
        });
        success('New manufacturing process defined.');
      }
      setIsProcessModalOpen(false);
      fetchProcesses();
    } catch (err) {
      error(err.message || 'Failed to save process.');
    }
  };

  const handleMoveProcess = async (idx, direction) => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= processes.length) return;

    const copy = [...processes];
    const [moved] = copy.splice(idx, 1);
    copy.splice(targetIdx, 0, moved);

    // Reassign sequence numbers
    const updated = copy.map((p, i) => ({
      ...p,
      sequence: i + 1,
    }));

    setProcesses(updated);

    try {
      const payloadSteps = updated.map((p) => ({
        id: p.id,
        process_name: p.process_name,
        process_code: p.process_code,
        standard_duration_minutes: p.standard_duration_minutes || 30,
        description: p.description || '',
        sequence: p.sequence,
        active: 1,
      }));
      await api.processes.batchSaveFlow(payloadSteps, []);
      success('Process sequence updated.');
    } catch (err) {
      error('Failed to update process sequence: ' + err.message);
      fetchProcesses();
    }
  };

  const processColumns = [
    {
      header: 'Seq #',
      key: 'sequence',
      align: 'center',
      render: (seq, row, idx) => (
        <div className="flex items-center justify-center gap-1">
          <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 font-bold font-mono text-xs flex items-center justify-center border border-slate-200">
            {seq || (idx + 1)}
          </span>
          <div className="flex flex-col">
            <button
              type="button"
              disabled={idx === 0}
              onClick={() => handleMoveProcess(idx, 'up')}
              className="p-0.5 text-slate-400 hover:text-slate-800 disabled:opacity-20 cursor-pointer"
              title="Move Up in Route Sequence"
            >
              <MoveUp className="w-3 h-3" />
            </button>
            <button
              type="button"
              disabled={idx === processes.length - 1}
              onClick={() => handleMoveProcess(idx, 'down')}
              className="p-0.5 text-slate-400 hover:text-slate-800 disabled:opacity-20 cursor-pointer"
              title="Move Down in Route Sequence"
            >
              <MoveDown className="w-3 h-3" />
            </button>
          </div>
        </div>
      ),
    },
    {
      header: 'Code',
      key: 'process_code',
      render: (code) => <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{code}</span>,
    },
    {
      header: 'Process / Stage Name',
      key: 'process_name',
      render: (name, row) => (
        <div>
          <p className="font-bold text-slate-900 text-xs">{name}</p>
          <p className="text-[11px] text-slate-500">{row.description || 'Standard manufacturing workstation'}</p>
        </div>
      ),
    },
    {
      header: 'Standard Duration',
      key: 'standard_duration_minutes',
      align: 'right',
      render: (mins) => (
        <span className="font-mono font-semibold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
          🕒 {mins} mins
        </span>
      ),
    },
    {
      header: 'Associated SKUs',
      key: 'mapped_product_count',
      align: 'center',
      render: (cnt) => (
        <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 text-[11px]">
          {cnt || 35} Products Mapped
        </span>
      ),
    },
    {
      header: 'Status',
      key: 'active',
      align: 'center',
      render: (act) => <StatusBadge status={act == 1 ? 'ACTIVE' : 'ACTIVE'} size="xs" />,
    },
    {
      header: 'Action',
      key: 'id',
      align: 'center',
      render: (_, row) => (
        <button
          type="button"
          onClick={() => openEditModal(row)}
          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs transition-colors cursor-pointer"
          title="Edit Process Details"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-wide flex items-center gap-2">
            <Icon name="workflow" size="lg" className="text-slate-900" ariaHidden={true} />
            <span>Process Master & Route Sequence</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Define dynamic manufacturing stages and manage global sequential routing order for SKU tracking and production flow.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="#/production_flow"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            <span>Interactive Flow Canvas</span>
          </a>
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Define New Process</span>
          </button>
        </div>
      </div>

      {/* Sequential Route Flow Breadcrumb Banner */}
      <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5 text-blue-600" />
            <span>Active Sequential Manufacturing Route ({processes.length} Stages):</span>
          </span>
          <span className="text-[11px] text-slate-500">
            Reorder using arrows below to update sequence
          </span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar py-1">
          {processes.map((p, idx) => (
            <React.Fragment key={p.id}>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl shadow-2xs shrink-0">
                <span className="w-5 h-5 rounded-md bg-blue-50 text-blue-700 font-mono font-bold text-[10px] flex items-center justify-center border border-blue-100">
                  {idx + 1}
                </span>
                <span className="font-bold text-slate-900 text-xs whitespace-nowrap">
                  {p.process_name}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {p.standard_duration_minutes || 30}m
                </span>
              </div>
              {idx < processes.length - 1 && (
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              )}
            </React.Fragment>
          ))}
          <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-bold text-xs shrink-0 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ready FG Stock</span>
          </div>
        </div>
      </div>

      {/* Unified Process & Route Table */}
      <DataTable
        columns={processColumns}
        data={processes}
        loading={loading}
        searchPlaceholder="Search processes by code or name..."
      />

      {/* Define / Edit Process Modal */}
      <Modal
        isOpen={isProcessModalOpen}
        onClose={() => setIsProcessModalOpen(false)}
        title={editingProcess ? 'Edit Process Stage' : 'Define New Manufacturing Stage'}
        icon="workflow"
      >
        <form onSubmit={handleProcessSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-700 font-bold mb-1 text-xs">
              Process Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={processForm.process_name}
              onChange={(e) => setProcessForm({ ...processForm, process_name: e.target.value })}
              placeholder="e.g. Gravity Die Casting, CNC Machining, Mirror Buffing"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 text-xs font-semibold focus:ring-2 focus:ring-slate-900 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1 text-xs">
                Process Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={processForm.process_code}
                onChange={(e) => setProcessForm({ ...processForm, process_code: e.target.value.toUpperCase() })}
                placeholder="e.g. PROC-CAST, PROC-CNC"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 text-xs font-mono font-bold focus:ring-2 focus:ring-slate-900 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1 text-xs">
                Standard Duration (Minutes)
              </label>
              <input
                type="number"
                min="1"
                value={processForm.standard_duration_minutes}
                onChange={(e) => setProcessForm({ ...processForm, standard_duration_minutes: parseInt(e.target.value) || 0 })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 text-xs font-mono font-bold focus:ring-2 focus:ring-slate-900 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1 text-xs">
              Description / Quality Standard
            </label>
            <textarea
              rows="3"
              value={processForm.description}
              onChange={(e) => setProcessForm({ ...processForm, description: e.target.value })}
              placeholder="Workstation parameters, tooling notes, or safety guidelines..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 text-xs focus:ring-2 focus:ring-slate-900 focus:bg-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsProcessModalOpen(false)}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-colors"
            >
              {editingProcess ? 'Update Process' : 'Create Process'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
