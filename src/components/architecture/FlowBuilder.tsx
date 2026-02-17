import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "reactflow";
import "reactflow/dist/style.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ProjectInfo } from "@/lib/githubProjects";

export type FlowDirection = "LR" | "TB" | "RL" | "BT";

export type FlowDiagram = {
  version: 1;
  direction: FlowDirection;
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
};

type FlowNodeRole =
  | "service"
  | "database"
  | "queue"
  | "api"
  | "ui"
  | "external"
  | "storage";

type FlowNodeData = {
  label: string;
  role: FlowNodeRole;
  project?: string;
};

const NODE_ROLES: FlowNodeRole[] = ["service", "database", "queue", "api", "ui", "external", "storage"];

const ROLE_STYLES: Record<FlowNodeRole, { bg: string; border: string; text: string }> = {
  service: { bg: "bg-blue-500/15", border: "border-blue-500/30", text: "text-blue-100" },
  database: { bg: "bg-emerald-500/15", border: "border-emerald-500/30", text: "text-emerald-100" },
  queue: { bg: "bg-amber-500/15", border: "border-amber-500/30", text: "text-amber-100" },
  api: { bg: "bg-purple-500/15", border: "border-purple-500/30", text: "text-purple-100" },
  ui: { bg: "bg-pink-500/15", border: "border-pink-500/30", text: "text-pink-100" },
  external: { bg: "bg-slate-500/15", border: "border-slate-400/30", text: "text-slate-100" },
  storage: { bg: "bg-cyan-500/15", border: "border-cyan-500/30", text: "text-cyan-100" },
};

export function createDefaultFlowDiagram(): FlowDiagram {
  const client = createNode("Client", "ui", { x: 60, y: 80 }, "node-1");
  const api = createNode("API", "api", { x: 300, y: 80 }, "node-2");
  const service = createNode("Service", "service", { x: 540, y: 80 }, "node-3");
  const database = createNode("Database", "database", { x: 780, y: 80 }, "node-4");
  return {
    version: 1,
    direction: "LR",
    nodes: [
      client,
      api,
      service,
      database,
    ],
    edges: [
      { id: "e1", source: client.id, target: api.id },
      { id: "e2", source: api.id, target: service.id },
      { id: "e3", source: service.id, target: database.id },
    ],
  };
}

export function parseFlowDiagram(raw: string): { diagram: FlowDiagram; error?: string } {
  if (!raw.trim()) {
    return { diagram: createDefaultFlowDiagram() };
  }
  try {
    const parsed = JSON.parse(raw) as FlowDiagram;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
      throw new Error("Invalid flow diagram format.");
    }
    const normalizedNodes = parsed.nodes.map((node, index) => {
      const data = node.data ?? { label: node.id ?? `Node ${index + 1}`, role: "service" };
      return {
        ...node,
        data: {
          label: data.label ?? node.id ?? `Node ${index + 1}`,
          role: (data.role as FlowNodeRole) ?? "service",
          project: (data as FlowNodeData).project,
        },
      } satisfies Node<FlowNodeData>;
    });
    return {
      diagram: {
        version: 1,
        direction: parsed.direction ?? "LR",
        nodes: normalizedNodes,
        edges: parsed.edges,
      },
    };
  } catch (error) {
    return {
      diagram: createDefaultFlowDiagram(),
      error: error instanceof Error ? error.message : "Invalid flow diagram JSON.",
    };
  }
}

export function serializeFlowDiagram(diagram: FlowDiagram): string {
  return `${JSON.stringify(diagram, null, 2)}\n`;
}

export function flowDiagramToMermaid(diagram: FlowDiagram): string {
  const idMap = new Map<string, string>();
  diagram.nodes.forEach((node, index) => {
    idMap.set(node.id, `N${index + 1}`);
  });

  const lines: string[] = [`flowchart ${diagram.direction ?? "LR"}`];
  diagram.nodes.forEach((node, index) => {
    const id = idMap.get(node.id) ?? `N${index + 1}`;
    const label = escapeMermaidLabel(node.data?.label ?? node.id);
    lines.push(`  ${id}["${label}"]`);
  });

  diagram.edges.forEach((edge, index) => {
    const source = idMap.get(edge.source) ?? `N${index + 1}`;
    const target = idMap.get(edge.target) ?? `N${index + 1}`;
    const label = typeof edge.label === "string" && edge.label.trim()
      ? `|${escapeMermaidLabel(edge.label)}|`
      : "";
    lines.push(`  ${source} ${label}--> ${target}`);
  });

  const classDefs = buildClassDefs();
  if (classDefs.length) {
    lines.push("", ...classDefs);
  }

  diagram.nodes.forEach((node, index) => {
    const role = node.data?.role ?? "service";
    const id = idMap.get(node.id) ?? `N${index + 1}`;
    lines.push(`  class ${id} ${role}`);
  });

  return lines.join("\n");
}

export function FlowBuilder({
  diagram,
  onChange,
  readOnly,
  projects,
  canvasClassName,
  fullHeight = false,
}: {
  diagram: FlowDiagram;
  onChange: (diagram: FlowDiagram) => void;
  readOnly: boolean;
  projects: ProjectInfo[];
  canvasClassName?: string;
  fullHeight?: boolean;
}) {
  const [nodes, setNodes] = useState<Node<FlowNodeData>[]>(diagram.nodes);
  const [edges, setEdges] = useState<Edge[]>(diagram.edges);
  const [direction, setDirection] = useState<FlowDirection>(diagram.direction ?? "LR");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [newNodeRole, setNewNodeRole] = useState<FlowNodeRole>("service");
  const [newNodeLabel, setNewNodeLabel] = useState("");

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  useEffect(() => {
    setNodes(diagram.nodes);
    setEdges(diagram.edges);
    setDirection(diagram.direction ?? "LR");
  }, [diagram]);

  const emitChange = useCallback(
    (nextNodes: Node<FlowNodeData>[], nextEdges: Edge[], nextDirection = direction) => {
      onChange({
        version: 1,
        direction: nextDirection,
        nodes: nextNodes,
        edges: nextEdges,
      });
    },
    [onChange, direction],
  );

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => {
        const next = applyNodeChanges(changes, nds);
        emitChange(next, edgesRef.current, direction);
        return next;
      });
    },
    [emitChange, direction],
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => {
        const next = applyEdgeChanges(changes, eds);
        emitChange(nodesRef.current, next, direction);
        return next;
      });
    },
    [emitChange, direction],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => {
        const next = addEdge(connection, eds);
        emitChange(nodesRef.current, next, direction);
        return next;
      });
    },
    [emitChange, direction],
  );

  const handleAddNode = () => {
    if (readOnly) return;
    const label = newNodeLabel.trim() || `${newNodeRole} node`;
    const position = {
      x: 120 + nodesRef.current.length * 40,
      y: 120 + nodesRef.current.length * 30,
    };
    const node = createNode(label, newNodeRole, position);
    const nextNodes = [...nodesRef.current, node];
    setNodes(nextNodes);
    emitChange(nextNodes, edgesRef.current, direction);
    setNewNodeLabel("");
  };

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );

  const updateSelectedNode = (patch: Partial<FlowNodeData>) => {
    if (!selectedNode) return;
    const nextNodes = nodes.map((node) =>
      node.id === selectedNode.id
        ? { ...node, data: { ...node.data, ...patch } }
        : node,
    );
    setNodes(nextNodes);
    emitChange(nextNodes, edgesRef.current, direction);
  };

  return (
    <div className={cn(fullHeight ? "flex h-full flex-col gap-4" : "space-y-4")}>
      <div className={cn("flex flex-wrap items-end gap-3", fullHeight && "shrink-0")}>
        <div className="min-w-[160px]">
          <p className="text-xs uppercase text-muted-foreground">Node type</p>
          <Select value={newNodeRole} onValueChange={(value) => setNewNodeRole(value as FlowNodeRole)}>
            <SelectTrigger className="bg-white/5 border-glass-border/30">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {NODE_ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <p className="text-xs uppercase text-muted-foreground">Label</p>
          <Input
            value={newNodeLabel}
            onChange={(event) => setNewNodeLabel(event.target.value)}
            placeholder="New node label"
            className="bg-white/5 border-glass-border/30"
          />
        </div>
        <Button onClick={handleAddNode} disabled={readOnly}>
          Add node
        </Button>
        <div className="min-w-[120px]">
          <p className="text-xs uppercase text-muted-foreground">Direction</p>
          <Select
            value={direction}
            onValueChange={(value) => {
              const nextDirection = value as FlowDirection;
              setDirection(nextDirection);
              emitChange(nodesRef.current, edgesRef.current, nextDirection);
            }}
          >
            <SelectTrigger className="bg-white/5 border-glass-border/30">
              <SelectValue placeholder="Direction" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LR">Left → Right</SelectItem>
              <SelectItem value="TB">Top → Bottom</SelectItem>
              <SelectItem value="RL">Right → Left</SelectItem>
              <SelectItem value="BT">Bottom → Top</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div
        className={cn(
          "rounded-xl border border-glass-border/30 bg-black/10 h-[420px]",
          canvasClassName,
          fullHeight && "flex-1 min-h-0",
        )}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={handleConnect}
          nodeTypes={{ architecture: ArchitectureNode }}
          fitView
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          onNodeClick={(_, node) => setSelectedNodeId(node.id)}
        >
          <Background gap={18} size={1} color="rgba(148, 163, 184, 0.2)" />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              const role = (node.data as FlowNodeData | undefined)?.role ?? "service";
              return roleToMiniMapColor(role);
            }}
          />
        </ReactFlow>
      </div>

      <div className={cn("rounded-xl border border-glass-border/30 bg-white/5 p-4 space-y-3", fullHeight && "shrink-0")}>
        <p className="text-xs uppercase text-muted-foreground">Selected node</p>
        {selectedNode ? (
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Label</p>
              <Input
                value={selectedNode.data.label}
                onChange={(event) => updateSelectedNode({ label: event.target.value })}
                className="bg-white/5 border-glass-border/30"
                disabled={readOnly}
              />
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Role</p>
              <Select
                value={selectedNode.data.role}
                onValueChange={(value) => updateSelectedNode({ role: value as FlowNodeRole })}
                disabled={readOnly}
              >
                <SelectTrigger className="bg-white/5 border-glass-border/30">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  {NODE_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs uppercase text-muted-foreground">Linked project</p>
              <Select
                value={selectedNode.data.project ?? "none"}
                onValueChange={(value) => updateSelectedNode({ project: value === "none" ? undefined : value })}
                disabled={readOnly}
              >
                <SelectTrigger className="bg-white/5 border-glass-border/30">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects.slice(0, 80).map((project) => (
                    <SelectItem key={project.fullName} value={project.fullName}>
                      {project.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Select a node to edit its properties.
          </div>
        )}
      </div>
    </div>
  );
}

function ArchitectureNode({ data }: { data: FlowNodeData }) {
  const style = ROLE_STYLES[data.role] ?? ROLE_STYLES.service;
  return (
    <div className={cn("rounded-lg border px-3 py-2 text-xs font-medium shadow-sm", style.bg, style.border, style.text)}>
      <div className="text-sm font-semibold">{data.label}</div>
      <div className="text-[10px] uppercase tracking-wide opacity-70">{data.role}</div>
      {data.project && <div className="text-[10px] opacity-60">{data.project}</div>}
    </div>
  );
}

function createNode(
  label: string,
  role: FlowNodeRole,
  position: { x: number; y: number },
  id?: string,
): Node<FlowNodeData> {
  return {
    id: id ?? `node-${Math.random().toString(36).slice(2, 9)}`,
    type: "architecture",
    position,
    data: {
      label,
      role,
    },
  };
}

function buildClassDefs(): string[] {
  const defs = Object.entries(ROLE_STYLES).map(([role, style]) => {
    const fill = colorFromUtility(style.bg);
    const stroke = colorFromUtility(style.border);
    return `  classDef ${role} fill:${fill},stroke:${stroke},color:#e2e8f0,stroke-width:1px;`;
  });
  return defs.length ? ["%% Node styles", ...defs] : [];
}

function roleToMiniMapColor(role: FlowNodeRole): string {
  const style = ROLE_STYLES[role] ?? ROLE_STYLES.service;
  return colorFromUtility(style.bg);
}

function colorFromUtility(utility: string): string {
  if (utility.includes("blue")) return "#3b82f6";
  if (utility.includes("emerald")) return "#10b981";
  if (utility.includes("amber")) return "#f59e0b";
  if (utility.includes("purple")) return "#a855f7";
  if (utility.includes("pink")) return "#ec4899";
  if (utility.includes("cyan")) return "#22d3ee";
  if (utility.includes("slate")) return "#94a3b8";
  return "#94a3b8";
}

function escapeMermaidLabel(label: string): string {
  return label.replace(/\"/g, '\\"');
}
