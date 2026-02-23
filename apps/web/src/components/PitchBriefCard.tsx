"use client";

import { motion } from "framer-motion";
import type { FilmPitchBrief } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// PitchBriefCard — compact list card or full treatment display
// ─────────────────────────────────────────────────────────────────────────────

interface PitchBriefCardProps {
  brief:       FilmPitchBrief;
  storyTitle?: string;
  full?:       boolean;
}

export function PitchBriefCard({ brief, storyTitle, full = false }: PitchBriefCardProps) {
  if (!full) {
    // Compact mode: logline + theme chips + timestamp
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="vault-glass rounded-sm p-4 space-y-3 border border-brass/15"
      >
        {storyTitle && (
          <p className="font-serif text-parchment text-sm leading-snug">{storyTitle}</p>
        )}
        {brief.logline && (
          <p className="text-xs text-aged font-serif italic leading-relaxed">
            &ldquo;{brief.logline}&rdquo;
          </p>
        )}
        {brief.themes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {brief.themes.slice(0, 4).map((theme) => (
              <span
                key={theme}
                className="text-xs font-mono px-2 py-0.5 rounded-sm border border-brass/20 text-smoke/70"
              >
                {theme}
              </span>
            ))}
          </div>
        )}
        <p className="text-xs font-mono text-smoke/40">
          Generated {new Date(brief.generatedAt).toLocaleDateString()}
        </p>
      </motion.div>
    );
  }

  // Full mode: complete treatment with sections
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Logline */}
      {brief.logline && (
        <div>
          <p className="text-xs font-mono text-smoke/50 uppercase tracking-widest mb-2">Logline</p>
          <p className="font-serif text-aged text-base italic leading-relaxed border-l-2 border-brass/30 pl-4">
            &ldquo;{brief.logline}&rdquo;
          </p>
        </div>
      )}

      <BrassDivider />

      {/* Synopsis */}
      {brief.synopsis && (
        <div>
          <p className="text-xs font-mono text-smoke/50 uppercase tracking-widest mb-2">Synopsis</p>
          <div className="space-y-2">
            {brief.synopsis.split("\n\n").filter(Boolean).map((para, i) => (
              <p key={i} className="text-sm text-smoke font-serif leading-relaxed">
                {para}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Themes */}
      {brief.themes.length > 0 && (
        <div>
          <p className="text-xs font-mono text-smoke/50 uppercase tracking-widest mb-2">Themes</p>
          <div className="flex flex-wrap gap-2">
            {brief.themes.map((theme) => (
              <span
                key={theme}
                className="text-xs font-mono px-2.5 py-1 rounded-sm border border-brass/25 text-aged bg-shadow/40"
              >
                {theme}
              </span>
            ))}
          </div>
        </div>
      )}

      <BrassDivider />

      {/* Visual Approach */}
      {brief.visualApproach && (
        <div>
          <p className="text-xs font-mono text-smoke/50 uppercase tracking-widest mb-2">Visual Approach</p>
          <p className="text-sm text-smoke font-serif leading-relaxed">{brief.visualApproach}</p>
        </div>
      )}

      {/* Comparables */}
      {brief.comparables.length > 0 && (
        <div>
          <p className="text-xs font-mono text-smoke/50 uppercase tracking-widest mb-2">Comparable Films</p>
          <ul className="space-y-1">
            {brief.comparables.map((comp) => (
              <li key={comp} className="text-sm font-mono text-aged flex items-center gap-2">
                <span className="text-brass/60">▸</span>
                {comp}
              </li>
            ))}
          </ul>
        </div>
      )}

      <BrassDivider />

      {/* Target Audience */}
      {brief.targetAudience && (
        <div>
          <p className="text-xs font-mono text-smoke/50 uppercase tracking-widest mb-2">Target Audience</p>
          <p className="text-sm text-smoke font-serif leading-relaxed">{brief.targetAudience}</p>
        </div>
      )}

      <p className="text-xs font-mono text-smoke/30">
        Treatment generated {new Date(brief.generatedAt).toLocaleString()}
      </p>
    </motion.div>
  );
}

function BrassDivider() {
  return (
    <div className="h-px bg-gradient-to-r from-transparent via-brass/20 to-transparent" />
  );
}
