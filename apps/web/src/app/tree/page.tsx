"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useGenealogyTree } from "@/hooks/useGenealogy";
import { GedcomImporter } from "@/components/GedcomImporter";
import { AncestorNode, type AncestorNodeData } from "@/components/AncestorNode";
import { AncestorStoryLinker } from "@/components/AncestorStoryLinker";
import type { Ancestor } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// Tree Page — interactive genealogy constellation graph
// ─────────────────────────────────────────────────────────────────────────────

// Workaround: @xyflow/react ships types against a different @types/react
// version than this project, causing ReactPortal mismatch errors. Cast to any.
/* eslint-disable @typescript-eslint/no-explicit-any */
const RF   = ReactFlow  as any;
const BG   = Background as any;
const Ctrl = Controls   as any;
const MM   = MiniMap    as any;
/* eslint-enable @typescript-eslint/no-explicit-any */

const NODE_TYPES: Record<string, any> = { ancestor: AncestorNode }; // eslint-disable-line @typescript-eslint/no-explicit-any

export default function TreePage() {
  const {
    tree, confirmedLinks, suggestedLinks,
    isSuggesting, loadFromStorage,
  } = useGenealogyTree();

  const [selectedAncestor, setSelectedAncestor] = useState<Ancestor | null>(null);
  const [showImporter,     setShowImporter]      = useState(false);

  // Load from localStorage on mount
  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);

  // Build nodes + edges from tree
  const initNodes = useMemo<Node[]>(() => {
    if (!tree || tree.ancestors.length === 0) return [];

    const confirmedSet = new Set(confirmedLinks.map((l) => `${l.ancestorId}:${l.storyId}`));
    const suggestSet   = new Set(suggestedLinks.map((l) => l.ancestorId));
    const positions    = layoutAncestors(tree.ancestors);

    return tree.ancestors.map((a): Node => ({
      id:       a.id,
      type:     "ancestor",
      position: positions.get(a.id) ?? { x: 0, y: 0 },
      data: {
        givenName:   a.givenName,
        surname:     a.surname,
        birthYear:   a.birthYear,
        deathYear:   a.deathYear,
        linkedCount: a.linkedStoryIds.filter((sid) => confirmedSet.has(`${a.id}:${sid}`)).length
          + a.linkedStoryIds.length,
        suggested:   suggestSet.has(a.id),
      },
    }));
  }, [tree, confirmedLinks, suggestedLinks]);

  const initEdges = useMemo<Edge[]>(() => {
    if (!tree) return [];
    const result: Edge[] = [];
    for (const a of tree.ancestors) {
      for (const childId of a.childIds) {
        result.push({
          id:     `${a.id}->${childId}`,
          source: a.id,
          target: childId,
          type:   "smoothstep",
          style:  { stroke: "rgba(184,134,11,0.35)", strokeWidth: 1.5 },
        });
      }
      for (const spouseId of a.spouseIds) {
        const edgeId = [a.id, spouseId].sort().join("--spouse--");
        if (!result.find((e) => e.id === edgeId)) {
          result.push({
            id:           edgeId,
            source:       a.id,
            target:       spouseId,
            sourceHandle: "left",
            targetHandle: "right",
            type:         "straight",
            style:        { stroke: "rgba(184,134,11,0.15)", strokeWidth: 1, strokeDasharray: "4 4" },
          });
        }
      }
    }
    return result;
  }, [tree]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges);

  // Sync when tree changes
  useEffect(() => { setNodes(initNodes); }, [initNodes, setNodes]);
  useEffect(() => { setEdges(initEdges); }, [initEdges, setEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const ancestor = tree?.ancestors.find((a) => a.id === node.id) ?? null;
    setSelectedAncestor(ancestor);
  }, [tree]);

  // No tree yet — show importer
  if (!tree || tree.ancestors.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-brass/10">
          <h1 className="font-serif text-parchment text-xl">Ancestor Constellation</h1>
        </div>
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-lg space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <div className="text-5xl mb-4 opacity-30">🌌</div>
              <h2 className="font-serif text-parchment text-2xl mb-2">Build Your Family Constellation</h2>
              <p className="text-smoke font-mono text-sm">
                Import a GEDCOM file to visualize your ancestors as an interactive star map,
                then link them to vault stories.
              </p>
            </motion.div>
            <GedcomImporter />
          </div>
        </div>
      </div>
    );
  }

  // Tree loaded — show React Flow canvas
  return (
    <div className="fixed inset-0 flex flex-col" style={{ top: "60px" }}>

      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b border-brass/10 z-20 shrink-0"
        style={{ background: "rgba(13,11,14,0.9)", backdropFilter: "blur(4px)" }}
      >
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-parchment text-base">Ancestor Constellation</h1>
          <span className="text-xs font-mono text-smoke/50">
            {tree.ancestors.length} ancestors
          </span>
          {confirmedLinks.length > 0 && (
            <span className="text-xs font-mono text-brass/80">
              {confirmedLinks.length} story link{confirmedLinks.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {isSuggesting && (
            <span className="text-xs font-mono text-aged/60 animate-pulse mr-2">Suggesting links…</span>
          )}
          <button
            onClick={() => setShowImporter((p) => !p)}
            className="text-xs font-mono px-2.5 py-1 rounded-sm border border-brass/25 text-aged hover:border-brass/50 transition-colors"
          >
            Import GEDCOM
          </button>
          <button
            onClick={() => setSelectedAncestor(tree.ancestors[0] ?? null)}
            className="text-xs font-mono px-2.5 py-1 rounded-sm border border-brass/25 text-aged hover:border-brass/50 transition-colors"
          >
            Link Stories
          </button>
        </div>
      </div>

      {/* React Flow canvas */}
      <div className="flex-1 relative" style={{ background: "#0d0b0e" }}>
        <RF
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={NODE_TYPES}
          onNodeClick={onNodeClick}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={2}
          attributionPosition="bottom-left"
        >
          <BG color="rgba(184,134,11,0.04)" gap={32} size={1} />
          <Ctrl style={{ background: "rgba(13,11,14,0.8)", border: "1px solid rgba(184,134,11,0.2)" }} />
          <MM
            nodeColor={(n: Node) => {
              const d = n.data as unknown as AncestorNodeData;
              return d.linkedCount > 0 ? "#b8860b" : "rgba(100,90,80,0.6)";
            }}
            style={{ background: "rgba(13,11,14,0.8)", border: "1px solid rgba(184,134,11,0.15)" }}
          />
        </RF>

        {/* Legend */}
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-4 px-4 py-2 rounded-sm
            border border-brass/10 text-xs font-mono text-smoke/50"
          style={{ background: "rgba(13,11,14,0.85)" }}
        >
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full border-2 border-brass/60 inline-block" />
            Linked
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full border-2 border-smoke/30 inline-block" />
            Unlinked
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-px bg-brass/35 inline-block" />
            Parent-child
          </span>
        </div>
      </div>

      {/* GEDCOM re-import overlay */}
      <AnimatePresence>
        {showImporter && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(13,11,14,0.85)", backdropFilter: "blur(4px)" }}
            onClick={(e) => e.target === e.currentTarget && setShowImporter(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95 }}
              className="w-full max-w-lg vault-glass rounded-sm p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-serif text-parchment text-lg">Import GEDCOM</h2>
                <button onClick={() => setShowImporter(false)} className="text-smoke hover:text-aged text-lg">×</button>
              </div>
              <GedcomImporter />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right panel linker */}
      <AncestorStoryLinker
        ancestor={selectedAncestor}
        onClose={() => setSelectedAncestor(null)}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Simple generational layout
// ─────────────────────────────────────────────────────────────────────────────

function layoutAncestors(ancestors: Ancestor[]): Map<string, { x: number; y: number }> {
  const levels     = new Map<string, number>();
  const levelCount = new Map<number, number>();
  const levelIdx   = new Map<string, number>();

  const roots  = ancestors.filter((a) => a.parentIds.length === 0);
  const starts = roots.length > 0 ? roots : ancestors.slice(0, 1);
  const queue: Array<{ id: string; level: number }> = starts.map((a) => ({ id: a.id, level: 0 }));

  while (queue.length > 0) {
    const item = queue.shift()!;
    if (levels.has(item.id)) continue;
    levels.set(item.id, item.level);
    const a = ancestors.find((x) => x.id === item.id);
    if (a) {
      for (const childId of a.childIds) {
        if (!levels.has(childId)) queue.push({ id: childId, level: item.level + 1 });
      }
    }
  }

  const maxLevel = Math.max(0, ...[...levels.values()]);
  for (const a of ancestors) {
    if (!levels.has(a.id)) levels.set(a.id, maxLevel + 1);
  }

  for (const [id, level] of levels) {
    const idx = levelCount.get(level) ?? 0;
    levelIdx.set(id, idx);
    levelCount.set(level, idx + 1);
  }

  const W = 140, H = 130, GX = 30, GY = 40;
  const positions = new Map<string, { x: number; y: number }>();
  for (const [id, level] of levels) {
    const count  = levelCount.get(level) ?? 1;
    const idx    = levelIdx.get(id) ?? 0;
    const totalW = count * W + (count - 1) * GX;
    positions.set(id, {
      x: idx * (W + GX) - totalW / 2 + W / 2,
      y: level * (H + GY),
    });
  }
  return positions;
}
