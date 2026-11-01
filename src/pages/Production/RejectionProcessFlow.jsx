import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Trash2, Save, RefreshCw, Sparkles, Flame, Wrench, ArrowRight } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

const CARD_W = 220;
const CARD_H = 96;

const ROUTE_META = {
  MINOR: {
    label: 'Minor Defect (Rework) Route',
    short: 'Minor Rework',
    icon: Wrench,
    accent: 'blue',
    border: 'border-blue-500',
    chip: 'bg-blue-100 text-blue-800',
    stroke: '#2563eb',
    hint: 'Pieces that can be repaired and returned to production.',
  },
  FURNACE: {
    label: 'Furnace (Melt & Recast) Route',
    short: 'Furnace',
    icon: Flame,
    accent: 'rose',
    border: 'border-rose-500',
    chip: 'bg-rose-100 text-rose-800',
    stroke: '#e11d48',
    hint: 'Unrecoverable pieces weighed as scrap and melted. The last step books scrap stock.',
  },
};

// Order steps along connections (left-to-right tie break) — mirrors the server's ordering
function orderSteps(nodes, edges) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const inDeg = new Map(nodes.map((n) => [n.id, 0]));
  const out = new Map(nodes.map((n) => [n.id, []]));
  edges.forEach((e) => {
    if (!byId.has(e.from) || !byId.has(e.to) || e.from === e.to) return;
    out.get(e.from).push(e.to);
    inDeg.set(e.to, inDeg.get(e.to) + 1);
  });
  const byX = (a, b) => (byId.get(a).x || 0) - (byId.get(b).x || 0);
  let queue = [...inDeg.entries()].filter(([, d]) => d === 0).map(([id]) => id).sort(byX);
  const seen = new Set();
  const ordered = [];
  while (queue.length) {
    const id = queue.shift();
    if (seen.has(id)) continue;
    seen.add(id);
    ordered.push(id);
    [...out.get(id)].sort(byX).forEach((t) => {
      inDeg.set(t, inDeg.get(t) - 1);
      if (inDeg.get(t) <= 0 && !seen.has(t)) queue.push(t);
    });
    queue.sort(byX);
  }
  nodes.filter((n) => !seen.has(n.id)).sort((a, b) => (a.x || 0) - (b.x || 0)).forEach((n) => ordered.push(n.id));
  return ordered.map((id) => byId.get(id));
}

export function RejectionProcessFlow() {
  const [routeType, setRouteType] = useState('MINOR');
  const [routes, setRoutes] = useState({});
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [routeName, setRouteName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [connectingFrom, setConnectingFrom] = useState(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });
  const canvasRef = useRef(null);
  const { success, error, warning } = useToast();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('production_process.edit');

  const meta = ROUTE_META[routeType];

  const applyRoute = (r) => {
    setNodes((r?.nodes || []).map((n) => ({ ...n, x: Number(n.x) || 0, y: Number(n.y) || 0 })));
    setEdges(r?.edges || []);
    setRouteName(r?.route_name || meta.label);
    setIsDirty(false);
    setConnectingFrom(null);
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.rejections.getRoutes();
      setRoutes(res?.data || {});
      applyRoute(res?.data?.[routeType]);
    } catch (err) {
      error('Failed to load rejection routes: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const switchRoute = (type) => {
    if (type === routeType) return;
    if (isDirty && !window.confirm('Discard unsaved changes to this route?')) return;
    setRouteType(type);
    applyRoute(routes[type]);
  };

  const toCanvas = (clientX, clientY) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: clientX, y: clientY };
    return { x: clientX - rect.left + canvasRef.current.scrollLeft, y: clientY - rect.top + canvasRef.current.scrollTop };
  };

  const onNodeMouseDown = (e, id) => {
    if (e.target.closest('input, button, .port')) return;
    const n = nodes.find((x) => x.id === id);
    const p = toCanvas(e.clientX, e.clientY);
    dragOffset.current = { x: p.x - n.x, y: p.y - n.y };
    setDragId(id);
  };

  const onMouseMove = (e) => {
    const p = toCanvas(e.clientX, e.clientY);
    if (connectingFrom) setMouse(p);
    if (dragId) {
      setNodes((prev) => prev.map((n) => (n.id === dragId
        ? { ...n, x: Math.max(0, p.x - dragOffset.current.x), y: Math.max(0, p.y - dragOffset.current.y) }
        : n)));
      setIsDirty(true);
    }
  };

  const startConnect = (e, id) => {
    e.stopPropagation();
    setConnectingFrom(id);
    setMouse(toCanvas(e.clientX, e.clientY));
  };

  const endConnect = (e, id) => {
    e.stopPropagation();
    if (!connectingFrom) return;
    if (connectingFrom === id) return setConnectingFrom(null);
    if (edges.some((x) => (x.from === connectingFrom && x.to === id) || (x.from === id && x.to === connectingFrom))) {
      warning('These steps are already connected.');
    } else {
      setEdges((prev) => [...prev, { id: `e-${connectingFrom}-${id}`, from: connectingFrom, to: id }]);
      setIsDirty(true);
    }
    setConnectingFrom(null);
  };

  const addStep = () => {
    const ordered = orderSteps(nodes, edges);
    const last = ordered[ordered.length - 1];
    const id = `n${Date.now().toString(36)}`;
    const newNode = { id, name: `New Step ${nodes.length + 1}`, note: '', x: last ? last.x + 270 : 60, y: last ? last.y : 160 };
    setNodes((prev) => [...prev, newNode]);
    if (last) setEdges((prev) => [...prev, { id: `e-${last.id}-${id}`, from: last.id, to: id }]);
    setIsDirty(true);
  };

  const deleteStep = (id) => {
    if (nodes.length <= 1) return warning('A route needs at least one step.');
    const incoming = edges.filter((e) => e.to === id).map((e) => e.from);
    const outgoing = edges.filter((e) => e.from === id).map((e) => e.to);
    const bridged = [];
    incoming.forEach((f) => outgoing.forEach((t) => {
      if (f !== t) bridged.push({ id: `e-${f}-${t}`, from: f, to: t });
    }));
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) => {
      const kept = prev.filter((e) => e.from !== id && e.to !== id);
      bridged.forEach((b) => { if (!kept.some((k) => k.from === b.from && k.to === b.to)) kept.push(b); });
      return kept;
    });
    setIsDirty(true);
  };

  const updateNode = (id, field, value) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, [field]: value } : n)));
    setIsDirty(true);
  };

  const autoLayout = () => {
    const ordered = orderSteps(nodes, edges);
    const pos = new Map(ordered.map((n, i) => [n.id, { x: 60 + i * 270, y: 160 + (i % 2) * 50 }]));
    setNodes((prev) => prev.map((n) => ({ ...n, ...pos.get(n.id) })));
    setIsDirty(true);
  };

  const save = async () => {
    if (nodes.some((n) => !String(n.name || '').trim())) return error('Every step needs a name.');
    setSaving(true);
    try {
      const res = await api.rejections.saveRoute({ route_type: routeType, route_name: routeName, nodes, edges });
      setRoutes((prev) => ({ ...prev, [routeType]: res?.data }));
      applyRoute(res?.data);
      success(`${meta.short} route saved. New rejection lots will follow these steps.`);
    } catch (err) {
      error('Failed to save route: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const ordered = useMemo(() => orderSteps(nodes, edges), [nodes, edges]);
  const canvasW = Math.max(1200, ...nodes.map((n) => n.x + CARD_W + 80));
  const canvasH = Math.max(460, ...nodes.map((n) => n.y + CARD_H + 80));
  const Icon = meta.icon;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${routeType === 'FURNACE' ? 'bg-rose-600' : 'bg-blue-600'}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-black text-slate-900">Rejection Process Map</h2>
              {isDirty && (
                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">Unsaved</span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Draw the steps a rejected lot passes through. Each rejection lot from SKU Tracking follows these steps in order.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            {Object.entries(ROUTE_META).map(([type, m]) => {
              const TIcon = m.icon;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => switchRoute(type)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    routeType === type
                      ? (type === 'FURNACE' ? 'bg-rose-600 text-white' : 'bg-blue-600 text-white')
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <TIcon className="w-3.5 h-3.5" />
                  <span>{m.short}</span>
                </button>
              );
            })}
          </div>
          <button type="button" onClick={addStep} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> Add Step
          </button>
          <button type="button" onClick={autoLayout} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 cursor-pointer">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Auto Layout
          </button>
          <button type="button" onClick={load} title="Reload saved route" className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-300 cursor-pointer">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || loading || !canEdit}
            title={canEdit ? 'Save route' : 'Your role can view but not edit process maps'}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold text-white cursor-pointer disabled:opacity-60 ${isDirty ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-900 hover:bg-slate-800'}`}
          >
            <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save Route'}
          </button>
        </div>
      </div>

      {/* Route name + ordered preview */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="rej-route-name" className="text-[11px] font-bold text-slate-500 uppercase">Route name</label>
          <input
            id="rej-route-name"
            value={routeName}
            onChange={(e) => { setRouteName(e.target.value); setIsDirty(true); }}
            className="flex-1 min-w-[200px] max-w-md text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-900"
          />
          <span className="text-[11px] text-slate-500">{meta.hint}</span>
        </div>
        <div className="flex items-center gap-1 flex-wrap text-[11px]">
          <span className="font-bold text-slate-500 mr-1">Lot path:</span>
          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold">Rejected at stage</span>
          {ordered.map((n, i) => (
            <React.Fragment key={n.id}>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span className={`px-2 py-0.5 rounded-md font-semibold ${meta.chip}`}>{i + 1}. {n.name}</span>
            </React.Fragment>
          ))}
          <ArrowRight className="w-3 h-3 text-slate-400" />
          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
            {routeType === 'FURNACE' ? 'Scrap stock booked' : 'Returned to production'}
          </span>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="relative bg-slate-50 border-2 border-slate-300 rounded-3xl shadow-inner overflow-auto select-none"
        style={{
          height: '520px',
          backgroundImage: 'radial-gradient(#94a3b8 1.2px, transparent 1.2px)',
          backgroundSize: '24px 24px',
          cursor: connectingFrom ? 'crosshair' : dragId ? 'grabbing' : 'default',
        }}
        onMouseMove={onMouseMove}
        onMouseUp={() => setDragId(null)}
        onMouseLeave={() => setDragId(null)}
        onMouseDown={() => connectingFrom && setConnectingFrom(null)}
      >
        <div className="relative" style={{ width: canvasW, height: canvasH }}>
          <svg className="absolute inset-0 overflow-visible" width={canvasW} height={canvasH} style={{ pointerEvents: 'none' }}>
            <defs>
              <marker id={`rej-arrow-${routeType}`} markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
                <path d="M0,0 L10,5 L0,10 z" fill={meta.stroke} />
              </marker>
            </defs>
            {edges.map((e) => {
              const a = nodes.find((n) => n.id === e.from);
              const b = nodes.find((n) => n.id === e.to);
              if (!a || !b) return null;
              const x1 = a.x + CARD_W, y1 = a.y + CARD_H / 2, x2 = b.x - 4, y2 = b.y + CARD_H / 2;
              const dx = Math.max(50, Math.abs(x2 - x1) * 0.45);
              const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
              const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
              return (
                <g key={e.id}>
                  <path d={d} stroke={meta.stroke} strokeWidth="3" fill="none" markerEnd={`url(#rej-arrow-${routeType})`} />
                  <g
                    transform={`translate(${mx}, ${my})`}
                    style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                    onClick={() => { setEdges((prev) => prev.filter((x) => x.id !== e.id)); setIsDirty(true); }}
                  >
                    <title>Remove connection</title>
                    <circle r="9" fill="#fff" stroke="#e11d48" strokeWidth="1.5" />
                    <text textAnchor="middle" dy="3.5" fontSize="10" fontWeight="bold" fill="#e11d48">✕</text>
                  </g>
                </g>
              );
            })}
            {connectingFrom && (() => {
              const a = nodes.find((n) => n.id === connectingFrom);
              if (!a) return null;
              const x1 = a.x + CARD_W, y1 = a.y + CARD_H / 2;
              return <path d={`M ${x1} ${y1} L ${mouse.x} ${mouse.y}`} stroke={meta.stroke} strokeWidth="2.5" strokeDasharray="5 4" fill="none" />;
            })()}
          </svg>

          {nodes.map((n) => {
            const stepNo = ordered.findIndex((o) => o.id === n.id) + 1;
            return (
              <div
                key={n.id}
                className={`absolute bg-white rounded-2xl border-2 shadow-md ${meta.border} ${dragId === n.id ? 'shadow-xl z-30' : 'z-20'}`}
                style={{ left: n.x, top: n.y, width: CARD_W, height: CARD_H, cursor: dragId === n.id ? 'grabbing' : 'grab' }}
                onMouseDown={(e) => onNodeMouseDown(e, n.id)}
              >
                <div
                  className={`port absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border-2 flex items-center justify-center cursor-pointer ${connectingFrom && connectingFrom !== n.id ? 'ring-4 ring-emerald-300 border-emerald-500' : 'border-slate-500'}`}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => endConnect(e, n.id)}
                  title="Connect here (input)"
                >
                  <div className="w-2 h-2 rounded-full bg-slate-600" />
                </div>
                <div
                  className={`port absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border-2 flex items-center justify-center cursor-pointer ${connectingFrom === n.id ? 'ring-4 ring-blue-300' : ''}`}
                  style={{ borderColor: meta.stroke }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => startConnect(e, n.id)}
                  title="Click, then click another step's left dot to connect (output)"
                >
                  <div className="w-2 h-2 rounded-full" style={{ background: meta.stroke }} />
                </div>

                <div className="p-2.5 h-full flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-extrabold font-mono px-1.5 py-0.5 rounded ${meta.chip}`}>#{stepNo}</span>
                    <input
                      value={n.name}
                      onChange={(e) => updateNode(n.id, 'name', e.target.value)}
                      className="flex-1 min-w-0 font-extrabold text-xs text-slate-900 bg-transparent hover:bg-slate-50 focus:bg-white px-1 py-0.5 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none"
                      aria-label="Step name"
                    />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); deleteStep(n.id); }}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="Delete step"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    value={n.note || ''}
                    onChange={(e) => updateNode(n.id, 'note', e.target.value)}
                    placeholder="Where / what happens here..."
                    className="w-full text-[11px] text-slate-600 bg-slate-50 hover:bg-white focus:bg-white px-1.5 py-1 rounded border border-slate-200 focus:border-blue-500 focus:outline-none"
                    aria-label="Step note"
                  />
                  <div className="text-[9px] font-bold text-slate-400 flex justify-between mt-auto">
                    <span>{stepNo === ordered.length ? (routeType === 'FURNACE' ? 'Final: books scrap' : 'Final: returns pcs') : 'Hold to drag'}</span>
                    <span style={{ color: meta.stroke }}>● ➔ connect</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default RejectionProcessFlow;
