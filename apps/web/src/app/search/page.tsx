"use client";

import { useState, useMemo, useEffect, useRef, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useReadContract, useReadContracts } from "wagmi";
import { LORE_VAULT_ADDRESS, LORE_VAULT_ABI } from "@/lib/contracts";
import type { StoryMetadata, SearchResult } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// /search — V2 Semantic Story Search
// ─────────────────────────────────────────────────────────────────────────────

export default function SearchPage() {
  const [query,     setQuery]     = useState("");
  const [results,   setResults]   = useState<SearchResult[]>([]);
  const [searched,  setSearched]  = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch total story count
  const { data: total } = useReadContract({
    address:      LORE_VAULT_ADDRESS,
    abi:          LORE_VAULT_ABI,
    functionName: "totalStories",
  });

  // Build batch calls for all stories
  const storyIds = useMemo(
    () => total ? Array.from({ length: Math.min(Number(total), 300) }, (_, i) => BigInt(i + 1)) : [],
    [total],
  );

  const storyCalls = useMemo(
    () => storyIds.map((id) => ({
      address:      LORE_VAULT_ADDRESS,
      abi:          LORE_VAULT_ABI,
      functionName: "stories" as const,
      args:         [id] as const,
    })),
    [storyIds],
  );

  const { data: storyData } = useReadContracts({
    contracts: storyCalls,
    query:     { enabled: storyCalls.length > 0 },
  });

  // Parse public stories + fetch vault names
  const publicStories = useMemo<StoryMetadata[]>(() => {
    if (!storyData) return [];
    return storyData
      .map((r, i) => {
        if (r.status !== "success" || !r.result) return null;
        const s = r.result as unknown as StoryMetadata;
        return { ...s, id: storyIds[i] ?? BigInt(i + 1) };
      })
      .filter((s): s is StoryMetadata => !!s && !s.isPrivate);
  }, [storyData, storyIds]);

  // Fetch vault names for public stories
  const vaultCalls = useMemo(
    () => publicStories.map((s) => ({
      address:      LORE_VAULT_ADDRESS,
      abi:          LORE_VAULT_ABI,
      functionName: "vaults" as const,
      args:         [s.vaultId] as const,
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [publicStories.map((s) => s.id.toString()).join(",")],
  );

  const { data: vaultData } = useReadContracts({
    contracts: vaultCalls,
    query:     { enabled: vaultCalls.length > 0 },
  });

  const vaultNameMap = useMemo(() => {
    const m: Record<string, string> = {};
    vaultData?.forEach((r, i) => {
      if (r.status === "success" && r.result) {
        const v = r.result as unknown as { id: bigint; name: string };
        const storyId = publicStories[i]?.id.toString();
        if (storyId) m[storyId] = v.name ?? "Unknown Vault";
      }
    });
    return m;
  }, [vaultData, publicStories]);

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  async function handleSearch(e?: FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (!q || publicStories.length === 0) return;

    setIsLoading(true);
    setError(null);
    setSearched(true);

    try {
      const stories = publicStories.map((s) => ({
        id:        s.id.toString(),
        title:     s.title,
        mediaType: s.mediaType,
        vaultName: vaultNameMap[s.id.toString()] ?? "Unknown Vault",
        timestamp: Number(s.timestamp),
      }));

      const res  = await fetch("/api/search", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ query: q, stories }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed.");

      setResults(data.results ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed.");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }

  // Build result cards from story data
  const resultStories = useMemo(() => {
    return results
      .map((r) => {
        const story = publicStories.find((s) => s.id.toString() === r.storyId);
        return story ? { story, result: r } : null;
      })
      .filter((x): x is { story: StoryMetadata; result: SearchResult } => !!x);
  }, [results, publicStories]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <h1 className="font-serif text-parchment text-3xl mb-2">Search the Archive</h1>
        <p className="text-smoke font-mono text-xs">
          Natural-language search across all public ancestral stories
        </p>
      </motion.div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="relative mb-10">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='e.g. "stories about migration from West Africa" or "grandmother recipes"'
          className="w-full bg-crypt border border-brass/20 rounded-sm px-4 py-3.5 pr-28
                     text-parchment font-mono text-sm focus:outline-none focus:border-brass/50
                     placeholder:text-smoke/30"
        />
        <button
          type="submit"
          disabled={!query.trim() || isLoading || publicStories.length === 0}
          className="absolute right-2 top-1/2 -translate-y-1/2 btn-brass px-4 py-1.5 text-xs
                     disabled:opacity-40"
        >
          {isLoading ? <span className="animate-pulse">Searching…</span> : "Search"}
        </button>
      </form>

      {/* Corpus info */}
      {publicStories.length > 0 && !searched && (
        <p className="text-center text-xs font-mono text-smoke/30 mb-8">
          {publicStories.length} public {publicStories.length === 1 ? "story" : "stories"} indexed
        </p>
      )}

      {/* Error */}
      {error && (
        <p className="text-center text-xs font-mono text-red-400/70 mb-8">{error}</p>
      )}

      {/* Results */}
      <AnimatePresence mode="wait">
        {isLoading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-16 font-serif text-aged/60 italic text-sm animate-pulse"
          >
            The guardian searches the vaults…
          </motion.div>
        )}

        {!isLoading && searched && resultStories.length === 0 && (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="text-4xl mb-4 opacity-20">🌑</div>
            <p className="font-serif text-parchment text-lg mb-2">No stories found</p>
            <p className="text-smoke font-mono text-xs">
              Try different words — the archive grows with every upload.
            </p>
          </motion.div>
        )}

        {!isLoading && resultStories.length > 0 && (
          <motion.div
            key="results"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.07 } }, hidden: {} }}
            className="space-y-3"
          >
            <p className="text-xs font-mono text-smoke/40 mb-5">
              {resultStories.length} result{resultStories.length !== 1 ? "s" : ""} for "{query}"
            </p>
            {resultStories.map(({ story, result }) => (
              <SearchResultCard
                key={story.id.toString()}
                story={story}
                result={result}
                vaultName={vaultNameMap[story.id.toString()] ?? ""}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Search Result Card
// ─────────────────────────────────────────────────────────────────────────────

const MEDIA_ICONS: Record<string, string> = {
  audio: "🎙",
  video: "🎬",
  text:  "📜",
  image: "🖼",
};

function SearchResultCard({
  story,
  result,
  vaultName,
}: {
  story:     StoryMetadata;
  result:    SearchResult;
  vaultName: string;
}) {
  const scoreColor =
    result.relevanceScore >= 80 ? "text-brass"
    : result.relevanceScore >= 50 ? "text-aged/80"
    : "text-smoke/50";

  return (
    <motion.div
      variants={{
        hidden:  { opacity: 0, x: -10 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.35 } },
      }}
      className="vault-glass rounded-sm p-4 flex items-start gap-4 group
                 hover:border-brass/30 transition-all duration-300"
    >
      {/* Score */}
      <div className="flex flex-col items-center shrink-0 w-10 pt-0.5">
        <span className={`font-mono text-lg font-bold leading-none ${scoreColor}`}>
          {result.relevanceScore}
        </span>
        <span className="text-[9px] font-mono text-smoke/30 mt-0.5">score</span>
      </div>

      {/* Story info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm">{MEDIA_ICONS[story.mediaType] ?? "📄"}</span>
          <h3 className="font-serif text-parchment text-sm truncate group-hover:text-gold
                         transition-colors duration-200">
            {story.title}
          </h3>
        </div>
        <p className="text-xs font-mono text-smoke/50 mb-2">{vaultName} Vault</p>
        <p className="text-xs text-smoke/70 leading-relaxed italic">"{result.reason}"</p>
      </div>

      {/* Relevance bar */}
      <div className="shrink-0 w-1 self-stretch rounded-full bg-brass/10 overflow-hidden">
        <div
          className="w-full rounded-full bg-brass/50 transition-all duration-700"
          style={{ height: `${result.relevanceScore}%` }}
        />
      </div>
    </motion.div>
  );
}
