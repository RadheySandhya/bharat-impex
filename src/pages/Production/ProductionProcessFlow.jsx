import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Workflow,
  Plus,
  Trash2,
  Save,
  ArrowRight,
  X,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Maximize2,
  Clock,
  Flag,
  Play,
  RotateCcw,
  Zap,
  Layers,
  HelpCircle
} from 'lucide-react';
import Icon from '../../components/UI/Icon';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

// Default initial production pipeline stages
const INITIAL_STAGES = [
  {
    id: 1,
    process_code: 'PROC-GRIND',
    process_name: 'Abrasive Belt Grinding',
    duration: 25,
    x: 60,
    y: 180,
  },
  {
    id: 2,
    process_code: 'PROC-CNC',
    process_name: 'CNC Machining & Threading',
    duration: 35,
    x: 350,
    y: 180,
  },
  {
    id: 3,
    process_code: 'PROC-POLISH',
    process_name: 'Buffing & Mirror Polishing',
    duration: 30,
    x: 640,
    y: 180,
  },
  {
    id: 4,
    process_code: 'PROC-PLATE',
    process_name: 'Electro-Plating (Chrome)',
    duration: 45,
    x: 930,
    y: 180,
  },
  {
    id: 5,
    process_code: 'PROC-ASSY',
    process_name: 'Assembly & Cartridge Fitment',
    duration: 20,
    x: 1220,
    y: 180,
  },
  {
    id: 6,
    process_code: 'PROC-PACK',
    process_name: 'Final Packaging & Marking',
    duration: 15,
    x: 1510,
    y: 180,
  },
];

const INITIAL_EDGES = [
  { id: 'edge-1-2', from: 1, to: 2 },
  { id: 'edge-2-3', from: 2, to: 3 },
  { id: 'edge-3-4', from: 3, to: 4 },
  { id: 'edge-4-5', from: 4, to: 5 },
  { id: 'edge-5-6', from: 5, to: 6 },
];

// Template stages are not in the DB yet: give them non-numeric ids so they are
// treated as new (inserted on save, removed locally on delete).
const templateNodes = () => INITIAL_STAGES.map((s) => ({ ...s, id: `tpl_${s.id}` }));
const templateEdges = () =>
  INITIAL_EDGES.map((e) => ({ id: `edge-tpl_${e.from}-tpl_${e.to}`, from: `tpl_${e.from}`, to: `tpl_${e.to}` }));

const CARD_WIDTH = 220;
const CARD_HEIGHT = 96;

function ProductionRouteFlow() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [deletedNodeIds, setDeletedNodeIds] = useState([]);
  const [nodeToDelete, setNodeToDelete] = useState(null);
  const [deletingProcess, setDeletingProcess] = useState(false);

  // Active dragging state for cards
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Interactive line connecting state (Click or drag from port to port)
  const [connectingFrom, setConnectingFrom] = useState(null); // nodeId
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Canvas panning & zooming
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  const canvasRef = useRef(null);
  const { success, error, warning } = useToast();
  const canEditFlow = useAuth().hasPermission('production_process.edit');

  // Load backend processes
  const loadProcesses = async () => {
    setLoading(true);
    try {
      const pRes = await api.processes.getAll();
      const dbProcs = pRes?.data || [];

      if (dbProcs.length > 0) {
        // Arrange sequentially
        const loadedNodes = dbProcs.map((p, idx) => ({
          id: p.id,
          process_code: p.process_code || `PROC-${idx + 1}`,
          process_name: p.process_name,
          duration: p.standard_duration_minutes || 30,
          x: 60 + idx * 290,
          y: 180 + (idx % 2 === 1 ? 40 : 0),
        }));

        // Link in order 0 -> 1 -> 2 ...
        const loadedEdges = [];
        for (let i = 0; i < loadedNodes.length - 1; i++) {
          loadedEdges.push({
            id: `edge-${loadedNodes[i].id}-${loadedNodes[i + 1].id}`,
            from: loadedNodes[i].id,
            to: loadedNodes[i + 1].id,
          });
        }

        setNodes(loadedNodes);
        setEdges(loadedEdges);
        setIsDirty(false);
      } else {
        // Nothing saved in the database yet: show the template as UNSAVED stages
        // (string ids) so rename/delete work locally and "Save" inserts them.
        setNodes(templateNodes());
        setEdges(templateEdges());
        setIsDirty(true);
      }
    } catch (err) {
      error('Failed to load processes: ' + err.message);
      setNodes(templateNodes());
      setEdges(templateEdges());
      setIsDirty(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProcesses();
  }, []);

  // Convert client mouse coordinates to canvas virtual space
  const getCanvasCoords = (clientX, clientY) => {
    if (!canvasRef.current) return { x: clientX, y: clientY };
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (clientX - rect.left - pan.x) / zoom;
    const y = (clientY - rect.top - pan.y) / zoom;
    return { x, y };
  };

  // Node Drag Handlers
  const handleNodeMouseDown = (e, nodeId) => {
    e.stopPropagation();
    // Don't drag if clicking buttons, inputs, or ports
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('.port-dot')) return;

    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const coords = getCanvasCoords(e.clientX, e.clientY);
    dragOffsetRef.current = {
      x: coords.x - node.x,
      y: coords.y - node.y,
    };
    setDraggingNodeId(nodeId);
  };

  // Port Click/Drag Handlers for Connection
  const handleStartConnection = (e, nodeId) => {
    e.stopPropagation();
    setConnectingFrom(nodeId);
    const coords = getCanvasCoords(e.clientX, e.clientY);
    setMousePos(coords);
  };

  const handleEndConnection = (e, targetNodeId) => {
    e.stopPropagation();
    if (!connectingFrom) return;

    if (connectingFrom === targetNodeId) {
      warning('Cannot connect a process stage to itself.');
      setConnectingFrom(null);
      return;
    }

    // Check if edge already exists
    const exists = edges.some(
      (edge) =>
        (edge.from === connectingFrom && edge.to === targetNodeId) ||
        (edge.from === targetNodeId && edge.to === connectingFrom)
    );

    if (exists) {
      warning('These process stages are already connected.');
      setConnectingFrom(null);
      return;
    }

    const newEdge = {
      id: `edge-${connectingFrom}-${targetNodeId}`,
      from: connectingFrom,
      to: targetNodeId,
    };

    setEdges((prev) => [...prev, newEdge]);
    setIsDirty(true);
    setConnectingFrom(null);

    const fromNode = nodes.find((n) => n.id === connectingFrom);
    const toNode = nodes.find((n) => n.id === targetNodeId);
    success(`Connected: "${fromNode?.process_name}" → "${toNode?.process_name}"`);
  };

  // Delete Edge
  const handleDeleteEdge = (edgeId) => {
    setEdges((prev) => prev.filter((e) => e.id !== edgeId));
    setIsDirty(true);
    success('Connection removed.');
  };

  // Global Canvas Mouse Handlers
  const handleCanvasMouseDown = (e) => {
    // If clicking outside while connecting, cancel wire
    if (connectingFrom) {
      setConnectingFrom(null);
      return;
    }

    // Start canvas pan
    setIsPanning(true);
    panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleCanvasMouseMove = (e) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);

    // Update live wire if connecting
    if (connectingFrom) {
      setMousePos(coords);
    }

    // Update dragged node position
    if (draggingNodeId) {
      setNodes((prev) =>
        prev.map((n) => {
          if (n.id === draggingNodeId) {
            return {
              ...n,
              x: Math.round(coords.x - dragOffsetRef.current.x),
              y: Math.round(coords.y - dragOffsetRef.current.y),
            };
          }
          return n;
        })
      );
      setIsDirty(true);
    }

    // Update canvas pan
    if (isPanning && !draggingNodeId) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
    }
  };

  const handleCanvasMouseUp = () => {
    setDraggingNodeId(null);
    setIsPanning(false);
  };

  // Add a new Process Stage Card
  const handleAddNode = () => {
    const newId = `proc_${Date.now()}`;
    const count = nodes.length + 1;
    // Position after last node or center
    const lastNode = nodes[nodes.length - 1];
    const newX = lastNode ? lastNode.x + 290 : 100;
    const newY = lastNode ? lastNode.y : 180;

    const newNode = {
      id: newId,
      process_code: `PROC-${count}`,
      process_name: `New Process Step ${count}`,
      duration: 30,
      x: newX,
      y: newY,
    };

    setNodes((prev) => [...prev, newNode]);

    // Automatically connect from last node if available
    if (lastNode) {
      setEdges((prev) => [
        ...prev,
        { id: `edge-${lastNode.id}-${newId}`, from: lastNode.id, to: newId },
      ]);
    }

    setIsDirty(true);
    success(`Added new process stage #${count}. Drag dots to connect!`);
  };

  // Delete a Node: Trigger Confirmation Modal
  const handleDeleteNode = (nodeId) => {
    if (nodes.length <= 1) {
      warning('A manufacturing flow requires at least 1 process stage.');
      return;
    }
    const target = nodes.find((n) => n.id === nodeId);
    if (target) {
      setNodeToDelete(target);
    }
  };

  // Confirm and Execute Permanent Deletion (Both Frontend Canvas and MySQL Database)
  const handleConfirmDeleteNode = async () => {
    if (!nodeToDelete) return;
    if (nodes.length <= 1) {
      warning('A manufacturing flow requires at least 1 process stage.');
      setNodeToDelete(null);
      return;
    }

    setDeletingProcess(true);
    try {
      const targetId = nodeToDelete.id;
      const targetName = nodeToDelete.process_name;

      // 1. If it's a persisted process in the database, delete via API
      if (typeof targetId === 'number') {
        await api.processes.delete(targetId);
      }

      // 2. Automatically bridge connections between incoming and outgoing nodes
      const incomingEdges = edges.filter((e) => e.to === targetId);
      const outgoingEdges = edges.filter((e) => e.from === targetId);

      const newBridgedEdges = [];
      incomingEdges.forEach((inEdge) => {
        outgoingEdges.forEach((outEdge) => {
          if (inEdge.from !== outEdge.to) {
            newBridgedEdges.push({
              id: `edge-${inEdge.from}-${outEdge.to}`,
              from: inEdge.from,
              to: outEdge.to,
            });
          }
        });
      });

      // Update edges: remove edges touching targetId, and add bridged edges
      setEdges((prev) => [
        ...prev.filter((e) => e.from !== targetId && e.to !== targetId),
        ...newBridgedEdges,
      ]);

      // Remove node from canvas state
      setNodes((prev) => prev.filter((n) => n.id !== targetId));

      if (typeof targetId === 'number') {
        setDeletedNodeIds((prev) => [...prev, targetId]);
      }

      success(`Process stage "${targetName}" deleted successfully.`);
      setNodeToDelete(null);
      // Keep the canvas as-is (no reload) so other unsaved renames/moves are not lost.
      if (typeof targetId !== 'number') setIsDirty(true);
    } catch (err) {
      error('Failed to delete process stage: ' + (err.message || err));
    } finally {
      setDeletingProcess(false);
    }
  };

  // Edit Node Title / Duration inline
  const handleUpdateNode = (nodeId, field, value) => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id === nodeId) {
          return { ...n, [field]: value };
        }
        return n;
      })
    );
    setIsDirty(true);
  };

  // Topological / Sequential Pipeline Ordering based on connected edges
  const getOrderedPipeline = (nodeList, edgeList) => {
    if (!nodeList || nodeList.length <= 1) return nodeList;

    const inDegree = {};
    const adj = {};
    nodeList.forEach((n) => {
      inDegree[n.id] = 0;
      adj[n.id] = [];
    });

    edgeList.forEach((e) => {
      if (adj[e.from] && inDegree[e.to] !== undefined) {
        adj[e.from].push(e.to);
        inDegree[e.to] = (inDegree[e.to] || 0) + 1;
      }
    });

    // Start with nodes that have in-degree 0 (roots), ordered by horizontal x position
    const queue = nodeList
      .filter((n) => inDegree[n.id] === 0)
      .sort((a, b) => a.x - b.x);

    const ordered = [];
    const visited = new Set();

    while (queue.length > 0) {
      const curr = queue.shift();
      if (visited.has(curr.id)) continue;
      visited.add(curr.id);
      ordered.push(curr);

      const neighbors = adj[curr.id] || [];
      for (const nextId of neighbors) {
        inDegree[nextId]--;
        if (inDegree[nextId] <= 0) {
          const nextNode = nodeList.find((n) => n.id === nextId);
          if (nextNode && !visited.has(nextNode.id)) {
            queue.push(nextNode);
          }
        }
      }
    }

    // Append any remaining or disconnected nodes sorted by x position
    const remaining = nodeList.filter((n) => !visited.has(n.id)).sort((a, b) => a.x - b.x);
    return [...ordered, ...remaining];
  };

  // Auto Layout: Order sequentially along connected pipeline
  const handleAutoLayout = () => {
    const ordered = getOrderedPipeline(nodes, edges);
    const updated = ordered.map((n, idx) => ({
      ...n,
      x: 60 + idx * 290,
      y: 180 + (idx % 2 === 1 ? 30 : 0),
    }));
    setNodes(updated);
    setPan({ x: 0, y: 0 });
    setZoom(1);
    setIsDirty(true);
    success('Auto Layout aligned process stages neatly in pipeline sequence.');
  };

  // Zoom controls
  const handleZoom = (delta) => {
    setZoom((prev) => Math.min(1.8, Math.max(0.5, parseFloat((prev + delta).toFixed(2)))));
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Save Flow
  const handleSaveFlow = async () => {
    if (nodes.length === 0) {
      warning('Cannot save an empty flow.');
      return;
    }

    setSaving(true);
    try {
      const orderedNodes = getOrderedPipeline(nodes, edges);

      const payloadSteps = orderedNodes.map((n) => ({
        id: typeof n.id === 'number' ? n.id : 0,
        process_code: n.process_code,
        process_name: n.process_name,
        standard_duration_minutes: parseInt(n.duration || 0, 10),
        description: `Stage: ${n.process_name}`,
      }));

      await api.processes.batchSaveFlow(payloadSteps, deletedNodeIds);
      setDeletedNodeIds([]);
      setIsDirty(false);
      success('Production Process Pipeline saved successfully!');
      await loadProcesses();
    } catch (err) {
      error('Failed to save route: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const orderedNodes = useMemo(() => getOrderedPipeline(nodes, edges), [nodes, edges]);

  // Total lead time
  const totalDuration = useMemo(() => {
    return nodes.reduce((sum, n) => sum + (parseInt(n.duration || 0, 10)), 0);
  }, [nodes]);

  return (
    <div className="space-y-4">
      {/* Header (same layout as the Rejection Process Map) */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white bg-blue-600 shrink-0">
            <Workflow className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-black text-slate-900">Production Process Map</h2>
              {isDirty && (
                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">Unsaved</span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Draw the stages every SKU batch passes through. Click a step's right dot, then the next step's left dot to connect.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap xl:flex-nowrap shrink-0">
          <button type="button" onClick={handleAddNode} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> Add Step
          </button>
          <button type="button" onClick={handleAutoLayout} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 cursor-pointer">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Auto Layout
          </button>
          <button type="button" onClick={loadProcesses} title="Reload saved route" className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-300 cursor-pointer">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleSaveFlow}
            disabled={saving || loading || !canEditFlow}
            title={canEditFlow ? 'Save route' : 'Your role can view but not edit process maps'}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold text-white cursor-pointer disabled:opacity-60 ${isDirty ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-900 hover:bg-slate-800'}`}
          >
            <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save Route'}
          </button>
        </div>
      </div>

      {/* Flow summary + ordered path (same card as the rejection map's route card) */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px]">
          <span className="font-bold text-slate-500 uppercase">Route summary</span>
          <span className="text-slate-600"><b className="text-slate-900">{nodes.length}</b> stages</span>
          <span className="text-slate-600"><b className="text-slate-900">{edges.length}</b> connections</span>
        </div>
        <div className="flex items-center gap-1 flex-wrap text-[11px]">
          <span className="font-bold text-slate-500 mr-1">Batch path:</span>
          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold">New SKU batch</span>
          {orderedNodes.map((n, i) => (
            <React.Fragment key={n.id}>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span className="px-2 py-0.5 rounded-md font-semibold bg-blue-50 text-blue-800">{i + 1}. {n.process_name}</span>
            </React.Fragment>
          ))}
          <ArrowRight className="w-3 h-3 text-slate-400" />
          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">Ready FG</span>
        </div>
      </div>

      {/* INTERACTIVE WORKFLOW PLAYGROUND CANVAS */}
      <div
        ref={canvasRef}
        className="pm-canvas relative overflow-hidden select-none"
        style={{
          '--pm-accent': '#007AFF',
          height: '560px',
          cursor: isPanning ? 'grabbing' : connectingFrom ? 'crosshair' : 'default',
        }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
      >
        {/* Transformed Stage / Canvas Wrapper */}
        <div
          className="absolute inset-0 origin-top-left"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            minWidth: '2800px',
            minHeight: '1400px',
          }}
        >
          {/* SVG LAYER: CONNECTING BEZIER CURVES & LIVE WIRE */}
          <svg
            className="absolute inset-0 w-full h-full overflow-visible"
            style={{ pointerEvents: 'none' }}
          >
            <defs>
              <marker id="prod-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="userSpaceOnUse">
                <path d="M1,1 L9,5 L1,9 z" fill="#007AFF" />
              </marker>
            </defs>

            {/* Permanent Connected Edges */}
            {edges.map((edge) => {
              const fromNode = nodes.find((n) => n.id === edge.from);
              const toNode = nodes.find((n) => n.id === edge.to);
              if (!fromNode || !toNode) return null;

              // Output port coords (Right side of fromNode)
              const x1 = fromNode.x + CARD_WIDTH + 11;
              const y1 = fromNode.y + CARD_HEIGHT / 2;

              // Input port coords (Left side of toNode)
              const x2 = toNode.x - 13;
              const y2 = toNode.y + CARD_HEIGHT / 2;

              // Control points for smooth bezier curve
              const dx = Math.max(50, Math.abs(x2 - x1) * 0.45);
              const pathD = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2;

              return (
                <g key={edge.id}>
                  <path d={pathD} stroke="#007AFF" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.9" markerEnd="url(#prod-arrow)" />

                  {/* Disconnect / Delete Edge Button on Midpoint (clickable) */}
                  <g
                    transform={`translate(${midX}, ${midY})`}
                    style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                    onClick={() => handleDeleteEdge(edge.id)}
                  >
                    <title>Remove connection</title>
                    <circle r="9" fill="#fff" stroke="rgba(60,60,67,0.25)" strokeWidth="1" />
                    <path d="M -3.5 -3.5 L 3.5 3.5 M 3.5 -3.5 L -3.5 3.5" stroke="#FF3B30" strokeWidth="1.8" strokeLinecap="round" />
                  </g>
                </g>
              );
            })}

            {/* Live Wire when currently dragging/connecting */}
            {connectingFrom && (() => {
              const fromNode = nodes.find((n) => n.id === connectingFrom);
              if (!fromNode) return null;
              const x1 = fromNode.x + CARD_WIDTH + 11;
              const y1 = fromNode.y + CARD_HEIGHT / 2;
              const x2 = mousePos.x;
              const y2 = mousePos.y;
              const dx = Math.max(40, Math.abs(x2 - x1) * 0.45);
              const livePath = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

              return (
                <g>
                  <path
                    d={livePath}
                    stroke="#007AFF"
                    strokeWidth="2.5"
                    strokeDasharray="5 4"
                    fill="none"
                  />
                </g>
              );
            })()}
          </svg>

          {/* PROCESS STAGE NODE CARDS — COMPACT, SLEEK, DRAGGABLE */}
          {nodes.map((node, idx) => {
            const isDragging = draggingNodeId === node.id;
            const isConnectingThis = connectingFrom === node.id;

            return (
              <div
                key={node.id}
                className={`pm-card absolute select-none ${isDragging ? 'is-dragging z-40' : 'z-20'}`}
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  width: `${CARD_WIDTH}px`,
                  height: `${CARD_HEIGHT}px`,
                  cursor: isDragging ? 'grabbing' : 'grab',
                }}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              >
                <div
                  className={`pm-port in port-dot ${connectingFrom && connectingFrom !== node.id ? 'target' : ''}`}
                  onClick={(e) => handleEndConnection(e, node.id)}
                  title="Connect here (input)"
                />
                <div
                  className={`pm-port out port-dot ${isConnectingThis ? 'active' : ''}`}
                  onClick={(e) => handleStartConnection(e, node.id)}
                  title="Click, then click another stage's left dot to connect (output)"
                />

                {/* CARD CONTENT — COMPACT & CLEAN */}
                <div className="p-2.5 h-full flex flex-col gap-1">
                  {/* Top: Step Index & Title & Delete */}
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <span className="pm-chip">#{idx + 1}</span>
                      <input
                        type="text"
                        value={node.process_name}
                        onChange={(e) => handleUpdateNode(node.id, 'process_name', e.target.value)}
                        className="pm-name truncate"
                        title="Click to rename process"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNode(node.id);
                      }}
                      className="pm-del"
                      title="Delete this process stage"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Middle: process code */}
                  <div className="flex items-center text-[11px] text-slate-600">
                    <span className="pm-chip">{node.process_code}</span>
                  </div>

                  <div className="pm-foot mt-auto">
                    <span>{idx === nodes.length - 1 ? 'Final stage' : 'Drag to move'}</span>
                    <span className="pm-connect" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => handleStartConnection(e, node.id)}>
                      {isConnectingThis ? 'Connecting…' : 'Connect →'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* DELETE STAGE CONFIRMATION MODAL */}
      {nodeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0 shadow-2xs">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-extrabold text-slate-900">
                  Delete Process Stage?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  This stage will be removed from the manufacturing pipeline and SKU tracking.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNodeToDelete(null)}
                disabled={deletingProcess}
                aria-label="Close"
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stage Info Card */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono">
                  {nodeToDelete.process_code || 'PROCESS STAGE'}
                </span>
              </div>
              <div className="text-sm font-bold text-slate-900">
                {nodeToDelete.process_name}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1 border-t border-slate-200/60">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span>Connected lines will be automatically bridged.</span>
              </div>
            </div>

            {/* Select different stage to delete if desired */}
            {nodes.length > 1 && (
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Select stage to delete:
                </label>
                <select
                  value={nodeToDelete.id}
                  onChange={(e) => {
                    const sel = nodes.find((n) => String(n.id) === String(e.target.value));
                    if (sel) setNodeToDelete(sel);
                  }}
                  disabled={deletingProcess}
                  className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg p-2 text-slate-800 focus:ring-2 focus:ring-rose-500 cursor-pointer"
                >
                  {nodes.map((n, i) => (
                    <option key={n.id} value={n.id}>
                      #{i + 1} - {n.process_name} ({n.process_code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setNodeToDelete(null)}
                disabled={deletingProcess}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteNode}
                disabled={deletingProcess}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-60"
              >
                <Trash2 className={`w-3.5 h-3.5 ${deletingProcess ? 'animate-spin' : ''}`} />
                <span>{deletingProcess ? 'Deleting...' : 'Delete Stage'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// Production Process page: the production route map (rejections have no fixed route; they are tracked freely)
export function ProductionProcessFlow() {
  return <ProductionRouteFlow />;
}

export default ProductionProcessFlow;
