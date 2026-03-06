"use client";

import type { LorePanel as LorePanelType } from "@/types";

interface Props {
  panel: LorePanelType;
}

const MOOD_COLORS: Record<string, string> = {
  tense:       "text-burgundy/70",
  joyful:      "text-moss/70",
  mysterious:  "text-dusk/70",
  triumphant:  "text-brass/70",
  melancholic: "text-smoke/50",
  haunting:    "text-aged/60",
};

export function LorePanel({ panel }: Props) {
  const moodColor = MOOD_COLORS[panel.mood.toLowerCase()] ?? "text-smoke/50";

  return (
    <div className="vault-glass rounded-sm overflow-hidden border border-brass/15 flex flex-col">
      {/* Panel header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-brass/10">
        <span className="font-mono text-xs text-smoke/60 tracking-widest uppercase">
          Panel {panel.number}
        </span>
        <span className={`font-mono text-xs uppercase tracking-widest ${moodColor}`}>
          {panel.mood}
        </span>
      </div>

      {/* Scene */}
      <div className="px-3 pt-3 pb-2 border-b border-brass/10">
        <p className="font-mono text-xs text-smoke/70 italic leading-relaxed">
          {panel.scene}
        </p>
      </div>

      {/* Dialogue */}
      {panel.dialogue.length > 0 && (
        <div className="px-3 py-2 flex-1 space-y-1.5">
          {panel.dialogue.map((d, i) => (
            <div key={i} className="flex gap-2">
              <span className="font-mono text-xs text-brass/70 uppercase shrink-0 pt-px">
                {d.character}:
              </span>
              <span className="font-serif text-xs text-parchment/80 leading-relaxed">
                &ldquo;{d.line}&rdquo;
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Caption */}
      {panel.caption && (
        <div className="px-3 py-2 border-t border-brass/10">
          <p className="font-mono text-xs text-smoke/50 italic leading-relaxed">
            [ {panel.caption} ]
          </p>
        </div>
      )}
    </div>
  );
}
