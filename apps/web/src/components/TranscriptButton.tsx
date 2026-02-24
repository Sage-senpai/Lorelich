"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { TranscriptEntry } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// TranscriptButton — transcribes an audio story via Groq Whisper.
//
// State is cached in localStorage keyed by rootHash so transcripts survive
// page reloads without re-calling the API.
//
// Usage:
//   <TranscriptButton rootHash={story.zgRootHash} />
// ─────────────────────────────────────────────────────────────────────────────

const LS_KEY = (rootHash: string) => `lorelich_transcript_${rootHash}`;

interface TranscriptButtonProps {
  rootHash: string;
}

export function TranscriptButton({ rootHash }: TranscriptButtonProps) {
  const [entry,      setEntry]      = useState<TranscriptEntry | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [expanded,   setExpanded]   = useState(false);

  // Load cached transcript from localStorage
  useEffect(() => {
    const raw = localStorage.getItem(LS_KEY(rootHash));
    if (raw) {
      try { setEntry(JSON.parse(raw) as TranscriptEntry); }
      catch { /* corrupt cache */ }
    }
  }, [rootHash]);

  async function transcribe() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/transcript", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ rootHash }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);

      const saved: TranscriptEntry = {
        rootHash,
        text:        data.text,
        language:    data.language,
        generatedAt: Date.now(),
      };
      localStorage.setItem(LS_KEY(rootHash), JSON.stringify(saved));
      setEntry(saved);
      setExpanded(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function clearTranscript() {
    localStorage.removeItem(LS_KEY(rootHash));
    setEntry(null);
    setError(null);
    setExpanded(false);
  }

  if (entry) {
    return (
      <div className="mt-2 space-y-2">
        {/* Transcript header row */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setExpanded((p) => !p)}
            className="text-xs font-mono text-aged hover:text-brass transition-colors flex items-center gap-1.5"
          >
            <span>📝 Transcript</span>
            <span className="opacity-50 text-smoke">{expanded ? "▲" : "▼"}</span>
          </button>
          <button
            onClick={clearTranscript}
            className="text-xs font-mono text-smoke/30 hover:text-smoke/60 transition-colors"
            aria-label="Clear transcript"
          >
            ✕
          </button>
        </div>

        {/* Expandable transcript text */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div
                className="vault-glass rounded-sm p-3 text-xs text-smoke/80 font-mono
                  leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto"
              >
                {entry.text}
              </div>
              <p className="text-xs text-smoke/30 font-mono mt-1">
                Transcribed {new Date(entry.generatedAt).toLocaleDateString()}
                {entry.language && ` · ${entry.language}`}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-1">
      <button
        onClick={transcribe}
        disabled={loading}
        className="text-xs font-mono px-2 py-0.5 rounded-sm border
          border-smoke/20 text-smoke/50 hover:border-aged/40 hover:text-aged
          transition-colors disabled:opacity-40 disabled:cursor-wait"
      >
        {loading ? (
          <span className="animate-pulse">Transcribing via Groq Whisper…</span>
        ) : (
          "📝 Transcribe Audio"
        )}
      </button>
      {error && (
        <p className="text-xs font-mono text-burgundy/80">{error}</p>
      )}
    </div>
  );
}
