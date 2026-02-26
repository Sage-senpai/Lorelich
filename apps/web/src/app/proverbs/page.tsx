"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";
import { useVaultStore } from "@/store";
import { useOwnerVaults, useVaultStories } from "@/hooks/useVault";
import type { StoryProverb } from "@/types";
import { DEMO_PROVERBS } from "@/lib/demoData";
import { DemoBadge } from "@/components/DemoBanner";

// ─────────────────────────────────────────────────────────────────────────────
// /proverbs — V2 Proverb-of-the-Day Engine
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "lorelich_proverbs";

function loadProverbs(): StoryProverb[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveProverbs(proverbs: StoryProverb[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(proverbs));
}

export default function ProverbsPage() {
  const { isConnected } = useAccount();
  const [proverbs,    setProverbs]    = useState<StoryProverb[]>([]);
  const [showExtract, setShowExtract] = useState(false);

  useEffect(() => {
    const existing = loadProverbs();
    if (existing.length > 0) {
      setProverbs(existing);
    } else {
      // Seed with demo proverbs on first visit so the page isn't empty
      saveProverbs(DEMO_PROVERBS);
      setProverbs(DEMO_PROVERBS);
    }
  }, []);

  const onExtracted = useCallback((p: StoryProverb) => {
    setProverbs((prev) => {
      const next = [p, ...prev];
      saveProverbs(next);
      return next;
    });
    setShowExtract(false);
  }, []);

  const deleteProverb = useCallback((id: string) => {
    setProverbs((prev) => {
      const next = prev.filter((p) => p.id !== id);
      saveProverbs(next);
      return next;
    });
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">

      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="font-serif text-parchment text-3xl mb-1">Vault Proverbs</h1>
          <p className="text-smoke font-mono text-xs">
            Wisdom distilled from ancestral stories by LoreLich AI
          </p>
        </div>
        {isConnected && (
          <button
            onClick={() => setShowExtract((p) => !p)}
            className="btn-brass text-sm px-4 py-2"
          >
            + Extract Proverb
          </button>
        )}
      </div>

      {/* Extractor panel */}
      <AnimatePresence>
        {showExtract && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-10"
          >
            <ExtractorPanel onExtracted={onExtracted} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Proverbs wall */}
      {proverbs.length === 0 ? (
        <EmptyState isConnected={isConnected} onOpen={() => setShowExtract(true)} />
      ) : (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.08 } }, hidden: {} }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-5"
        >
          {proverbs.map((p) => (
            <ProverbCard key={p.id} proverb={p} onDelete={deleteProverb} />
          ))}
        </motion.div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Extractor Panel
// ─────────────────────────────────────────────────────────────────────────────

function ExtractorPanel({ onExtracted }: { onExtracted: (p: StoryProverb) => void }) {
  const { vaultIds } = useOwnerVaults();
  const vaults       = useVaultStore((s) => s.vaults);
  const allStories   = useVaultStore((s) => s.stories);

  // Load stories for first vault by default; user can pick
  const [selectedVaultId, setSelectedVaultId] = useState<bigint | null>(null);
  const [selectedStoryId, setSelectedStoryId] = useState<string>("");
  const [storyText,       setStoryText]        = useState("");
  const [isGenerating,    setIsGenerating]     = useState(false);
  const [error,           setError]            = useState<string | null>(null);

  useEffect(() => {
    if (vaultIds && vaultIds.length > 0 && !selectedVaultId) {
      setSelectedVaultId(vaultIds[0] ?? null);
    }
  }, [vaultIds, selectedVaultId]);

  // Load stories for selected vault
  useVaultStories(selectedVaultId);
  const stories = selectedVaultId !== null
    ? (allStories[selectedVaultId.toString()] ?? [])
    : [];

  const selectedStory = stories.find((s) => s.id.toString() === selectedStoryId);

  async function extract() {
    if (!selectedStory || !storyText.trim()) return;

    // Find vault name
    const vault = vaults.find((v) => v.id === selectedVaultId);

    setIsGenerating(true);
    setError(null);
    try {
      const res  = await fetch("/api/proverb/extract", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          storyId:   selectedStory.id.toString(),
          storyText: storyText.trim().slice(0, 2000),
          title:     selectedStory.title,
          vaultName: vault?.name ?? "Unknown Vault",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Extraction failed.");

      const proverb: StoryProverb = {
        id:              crypto.randomUUID(),
        storyId:         selectedStory.id.toString(),
        storyTitle:      selectedStory.title,
        vaultName:       vault?.name ?? "Unknown Vault",
        proverb:         data.proverb,
        culturalContext: data.culturalContext,
        culture:         data.culture,
        extractedAt:     Date.now(),
      };
      onExtracted(proverb);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="vault-glass rounded-sm p-6 border-brass/30">
      <h2 className="font-serif text-parchment mb-5">Extract from Story</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* Vault selector */}
        <div>
          <label className="block text-xs font-mono text-smoke/60 mb-1.5">Vault</label>
          <select
            value={selectedVaultId?.toString() ?? ""}
            onChange={(e) => {
              setSelectedVaultId(e.target.value ? BigInt(e.target.value) : null);
              setSelectedStoryId("");
            }}
            className="w-full bg-crypt border border-brass/20 rounded-sm px-3 py-2 text-sm text-parchment
                       font-mono focus:outline-none focus:border-brass/50"
          >
            <option value="">Select vault…</option>
            {vaults.map((v) => (
              <option key={v.id.toString()} value={v.id.toString()}>{v.name}</option>
            ))}
          </select>
        </div>

        {/* Story selector */}
        <div>
          <label className="block text-xs font-mono text-smoke/60 mb-1.5">Story</label>
          <select
            value={selectedStoryId}
            onChange={(e) => setSelectedStoryId(e.target.value)}
            disabled={stories.length === 0}
            className="w-full bg-crypt border border-brass/20 rounded-sm px-3 py-2 text-sm text-parchment
                       font-mono focus:outline-none focus:border-brass/50 disabled:opacity-40"
          >
            <option value="">Select story…</option>
            {stories.map((s) => (
              <option key={s.id.toString()} value={s.id.toString()}>{s.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Text passage */}
      <div className="mb-4">
        <label className="block text-xs font-mono text-smoke/60 mb-1.5">
          Story passage or excerpt
          <span className="text-smoke/40 ml-2">(paste text from the story — max 2000 chars)</span>
        </label>
        <textarea
          value={storyText}
          onChange={(e) => setStoryText(e.target.value.slice(0, 2000))}
          placeholder="Paste a meaningful passage from your story here…"
          rows={5}
          className="w-full bg-crypt border border-brass/20 rounded-sm px-3 py-2 text-sm text-parchment
                     font-mono resize-none focus:outline-none focus:border-brass/50 placeholder:text-smoke/30"
        />
        <div className="text-right text-[10px] font-mono text-smoke/30 mt-0.5">
          {storyText.length}/2000
        </div>
      </div>

      {error && (
        <p className="text-xs font-mono text-red-400/80 mb-4">{error}</p>
      )}

      <button
        onClick={extract}
        disabled={!selectedStoryId || !storyText.trim() || isGenerating}
        className="btn-brass px-5 py-2 text-sm disabled:opacity-40"
      >
        {isGenerating ? (
          <span className="animate-pulse">LoreLich is listening…</span>
        ) : (
          "Extract Proverb"
        )}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Proverb Card
// ─────────────────────────────────────────────────────────────────────────────

function ProverbCard({ proverb: p, onDelete }: { proverb: StoryProverb; onDelete: (id: string) => void }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(`"${p.proverb}"\n— ${p.storyTitle}, ${p.vaultName} Vault`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <motion.div
      variants={{
        hidden:  { opacity: 0, y: 16 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
      }}
      className="vault-glass rounded-sm p-5 group flex flex-col gap-3"
    >
      {/* Proverb text */}
      <div className="flex items-start justify-between gap-2">
        <blockquote className="font-serif text-parchment text-base leading-snug italic flex-1">
          "{p.proverb}"
        </blockquote>
        {p.id.startsWith("demo-") && <DemoBadge className="shrink-0 mt-1" />}
      </div>

      {/* Cultural context */}
      <p className="text-xs text-smoke leading-relaxed">{p.culturalContext}</p>

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-brass/10">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-mono text-aged/70 truncate max-w-[180px]">{p.storyTitle}</span>
          {p.culture && (
            <span className="text-[10px] font-mono text-smoke/40">{p.culture}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copy}
            className="text-[10px] font-mono text-smoke/40 hover:text-brass/70 transition-colors"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            onClick={() => onDelete(p.id)}
            className="text-[10px] font-mono text-smoke/30 hover:text-red-400/60 transition-colors opacity-0 group-hover:opacity-100"
          >
            ✕
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty State
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState({ isConnected, onOpen }: { isConnected: boolean; onOpen: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-20"
    >
      <div className="text-5xl mb-5 opacity-30">🕯</div>
      <h2 className="font-serif text-parchment text-xl mb-3">No proverbs yet</h2>
      <p className="text-smoke font-mono text-sm max-w-md mx-auto mb-8 leading-relaxed">
        LoreLich can distill timeless wisdom from your ancestral stories.
        Paste a passage from any story and the guardian will extract the proverb hidden within it.
      </p>
      {isConnected ? (
        <button onClick={onOpen} className="btn-brass px-6 py-2.5 text-sm">
          Extract Your First Proverb
        </button>
      ) : (
        <p className="text-xs font-mono text-smoke/40">
          Connect your wallet to begin
        </p>
      )}
    </motion.div>
  );
}
