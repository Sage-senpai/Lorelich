"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

// ─────────────────────────────────────────────────────────────────────────────
// AncestorNode — React Flow custom node for the genealogy constellation
// ─────────────────────────────────────────────────────────────────────────────

export interface AncestorNodeData extends Record<string, unknown> {
  givenName:   string;
  surname:     string;
  birthYear?:  number;
  deathYear?:  number;
  linkedCount: number;
  suggested:   boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AncestorNodeProps = NodeProps & { data: AncestorNodeData; selected?: boolean };

export const AncestorNode = memo(function AncestorNode({ data, selected }: AncestorNodeProps) {
  const hasLinks     = data.linkedCount > 0;
  const hasSuggested = data.suggested && !hasLinks;
  const years        = [data.birthYear, data.deathYear].filter(Boolean).join("–");

  return (
    <div
      className={[
        "relative flex flex-col items-center justify-center",
        "rounded-full border-2 transition-all duration-200",
        "w-[120px] h-[120px] cursor-pointer",
        selected
          ? "border-brass bg-brass/15"
          : hasLinks
          ? "border-brass/60 bg-shadow/80 hover:border-brass"
          : hasSuggested
          ? "border-aged/50 bg-shadow/60 hover:border-aged"
          : "border-smoke/30 bg-shadow/60 hover:border-smoke/60",
      ].join(" ")}
    >
      <p className="font-serif text-parchment text-xs text-center leading-tight px-2 max-w-full truncate">
        {data.givenName}
      </p>
      <p className="font-serif text-aged text-xs font-medium text-center leading-tight px-2 max-w-full truncate">
        {data.surname}
      </p>
      {years && (
        <p className="font-mono text-smoke/60 text-[10px] mt-1">{years}</p>
      )}

      {/* Story link badge */}
      {hasLinks && (
        <div className="absolute -top-1 -right-1 flex items-center justify-center
          w-5 h-5 rounded-full bg-brass text-crypt text-[9px] font-mono font-bold z-10">
          {data.linkedCount}
        </div>
      )}

      {/* AI suggestion indicator */}
      {hasSuggested && (
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-aged/60 border border-aged/40
          flex items-center justify-center text-[8px] text-crypt font-bold z-10">
          ?
        </div>
      )}

      {/* Selected glow ring */}
      {selected && (
        <div className="absolute inset-0 rounded-full pointer-events-none"
          style={{ boxShadow: "0 0 20px 4px rgba(184,134,11,0.25)" }}
        />
      )}

      {/* React Flow connection handles */}
      <Handle type="target" position={Position.Top}    className="!opacity-0 !w-1 !h-1" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0 !w-1 !h-1" />
      <Handle type="source" position={Position.Left}   id="left"  className="!opacity-0 !w-1 !h-1" />
      <Handle type="target" position={Position.Right}  id="right" className="!opacity-0 !w-1 !h-1" />
    </div>
  );
});
