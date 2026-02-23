"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { FilmPitchBrief, PitchGenerateResponse } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// PitchGenerateButton — triggers AI pitch brief generation
// ─────────────────────────────────────────────────────────────────────────────

interface PitchGenerateButtonProps {
  storyId:    string;
  title:      string;
  mediaType:  string;
  vaultName:  string;
  onGenerated: (brief: FilmPitchBrief) => void;
}

export function PitchGenerateButton({
  storyId, title, mediaType, vaultName, onGenerated,
}: PitchGenerateButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error,        setError]        = useState("");

  const generate = async () => {
    setError("");
    setIsGenerating(true);
    try {
      const res = await fetch("/api/pitch/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ storyId, title, mediaType, vaultName }),
      });

      const data: PitchGenerateResponse | { error: string } = await res.json();
      if ("error" in data) throw new Error(data.error);
      onGenerated(data.brief);
    } catch (err) {
      setError((err as Error).message ?? "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={generate}
        disabled={isGenerating}
        className="btn-brass w-full py-2.5 disabled:opacity-60"
      >
        {isGenerating ? (
          <span className="flex items-center justify-center gap-2">
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            >
              🕯
            </motion.span>
            LoreLich is weaving the treatment…
          </span>
        ) : (
          "Generate Pitch Brief"
        )}
      </button>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs font-mono text-red-400"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
