"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PublicLoreEntry } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// /learn — Public educational lore discovery
// Vault owners can share stories for public learning. Entries stored in
// localStorage (lorelich_public_lore). In V3, backed by 0G KV or Upstash.
// ─────────────────────────────────────────────────────────────────────────────

const LS_KEY = "lorelich_public_lore";

const CULTURE_FILTERS = [
  "All", "West Africa", "East Africa", "South Asia", "East Asia",
  "Middle East", "Caribbean", "Latin America", "Pacific Islands",
];

function loadPublicLores(): PublicLoreEntry[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as PublicLoreEntry[]) : [];
  } catch { return []; }
}

export default function LearnPage() {
  const [lores,      setLores]      = useState<PublicLoreEntry[]>([]);
  const [filter,     setFilter]     = useState("All");
  const [eduOnly,    setEduOnly]    = useState(false);

  useEffect(() => {
    setLores(loadPublicLores());
  }, []);

  const filtered = lores.filter((l) => {
    if (filter !== "All" && l.region !== filter) return false;
    if (eduOnly && !l.isEducational) return false;
    return true;
  });

  return (
    <main className="min-h-screen bg-shadow text-smoke pt-20 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-serif text-3xl text-parchment">Learn</h1>
          <p className="text-smoke/50 text-sm mt-1 font-mono">
            Discover public ancestral stories shared for learning — cultural history,
            traditions, and heritage from around the world.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-brass/10">
          {CULTURE_FILTERS.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`text-xs font-mono px-3 py-1.5 rounded border transition-colors ${
                filter === c
                  ? "border-moss/60 text-moss bg-moss/10"
                  : "border-smoke/20 text-smoke/50 hover:border-smoke/40"
              }`}
            >
              {c}
            </button>
          ))}
          <button
            onClick={() => setEduOnly(!eduOnly)}
            className={`text-xs font-mono px-3 py-1.5 rounded border transition-colors ml-auto ${
              eduOnly
                ? "border-brass/60 text-brass bg-brass/10"
                : "border-smoke/20 text-smoke/50 hover:border-smoke/40"
            }`}
          >
            Educational Only
          </button>
        </div>

        {/* Results */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <p className="text-5xl opacity-30">📚</p>
            <p className="font-serif text-aged text-lg">
              {lores.length === 0
                ? "No public lore shared yet"
                : "No stories match these filters"}
            </p>
            <p className="text-smoke/40 text-xs font-mono max-w-md mx-auto">
              Vault owners can share their stories for public learning from the
              Vault dashboard. Shared lore appears here for everyone to explore.
            </p>
            <a href="/lore" className="inline-block text-xs font-mono text-moss/60 hover:text-moss transition-colors mt-4">
              Create an educational comic instead →
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filtered.map((lore) => (
                <motion.div
                  key={lore.storyId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="vault-glass border border-brass/15 rounded p-4 space-y-2 hover:border-brass/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-serif text-parchment/90 text-sm leading-snug">
                      {lore.title}
                    </h3>
                    <span className="text-[10px] font-mono text-smoke/40 border border-smoke/15 rounded px-1.5 py-0.5 shrink-0">
                      {lore.mediaType}
                    </span>
                  </div>
                  <p className="text-xs text-smoke/50 font-mono">
                    {lore.vaultName}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {lore.region && (
                      <span className="text-[10px] font-mono text-moss/60 border border-moss/20 rounded px-1.5 py-0.5">
                        {lore.region}
                      </span>
                    )}
                    {lore.culture && (
                      <span className="text-[10px] font-mono text-dusk/60 border border-dusk/20 rounded px-1.5 py-0.5">
                        {lore.culture}
                      </span>
                    )}
                    {lore.isEducational && (
                      <span className="text-[10px] font-mono text-brass/60 border border-brass/20 rounded px-1.5 py-0.5">
                        Educational
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-smoke/30 font-mono">
                    Shared {new Date(lore.sharedAt).toLocaleDateString()}
                  </p>
                  <a
                    href={`/story/${lore.storyId}`}
                    className="text-xs font-mono text-brass/60 hover:text-brass transition-colors block pt-1"
                  >
                    View Story →
                  </a>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </main>
  );
}
