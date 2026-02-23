"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useMarketplaceStories } from "@/hooks/useIPLicense";
import { MarketplaceStoryCard } from "@/components/MarketplaceStoryCard";

// ─────────────────────────────────────────────────────────────────────────────
// Marketplace — browse all public, licensable stories
// ─────────────────────────────────────────────────────────────────────────────

type MediaFilter   = "all" | "audio" | "video" | "text" | "image";
type TypeFilter    = "all" | "Personal" | "Documentary" | "Commercial" | "Exclusive";
type PriceFilter   = "all" | "free" | "paid";

export default function MarketplacePage() {
  const { items, vaultNameMap, isLoading } = useMarketplaceStories();

  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("all");
  const [typeFilter,  setTypeFilter]  = useState<TypeFilter>("all");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");

  const filtered = useMemo(() => items.filter(({ story, terms }) => {
    if (mediaFilter !== "all" && story.mediaType !== mediaFilter) return false;
    if (typeFilter  !== "all") {
      if (typeFilter === "Commercial"  && !terms.commercialUse)      return false;
      if (typeFilter === "Exclusive"   && !terms.exclusiveAvailable) return false;
    }
    if (priceFilter === "free" && terms.royaltyWei > 0n) return false;
    if (priceFilter === "paid" && terms.royaltyWei === 0n) return false;
    return true;
  }), [items, mediaFilter, typeFilter, priceFilter]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-parchment text-3xl">Story Marketplace</h1>
        <p className="text-smoke font-mono text-xs mt-1">
          License ancestral stories for personal, documentary, or commercial use.
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-4 mb-8 pb-5 border-b border-brass/10">
        <FilterGroup
          label="Media"
          value={mediaFilter}
          options={[
            { value: "all",   label: "All Media" },
            { value: "audio", label: "Audio" },
            { value: "video", label: "Video" },
            { value: "text",  label: "Text" },
            { value: "image", label: "Image" },
          ]}
          onChange={(v) => setMediaFilter(v as MediaFilter)}
        />
        <FilterGroup
          label="License type"
          value={typeFilter}
          options={[
            { value: "all",          label: "All Types" },
            { value: "Personal",     label: "Personal" },
            { value: "Documentary",  label: "Documentary" },
            { value: "Commercial",   label: "Commercial" },
            { value: "Exclusive",    label: "Exclusive" },
          ]}
          onChange={(v) => setTypeFilter(v as TypeFilter)}
        />
        <FilterGroup
          label="Price"
          value={priceFilter}
          options={[
            { value: "all",  label: "Any Price" },
            { value: "free", label: "Free" },
            { value: "paid", label: "Paid" },
          ]}
          onChange={(v) => setPriceFilter(v as PriceFilter)}
        />

        {filtered.length > 0 && (
          <span className="ml-auto self-center text-xs font-mono text-smoke/60">
            {filtered.length} {filtered.length === 1 ? "story" : "stories"}
          </span>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <MarketplaceSkeleton />
      ) : filtered.length === 0 ? (
        <MarketplaceEmpty hasItems={items.length > 0} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item, i) => (
            <MarketplaceStoryCard
              key={item.story.id.toString()}
              item={item}
              vaultName={vaultNameMap[item.story.vaultId.toString()] ?? "Unknown Vault"}
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter Group
// ─────────────────────────────────────────────────────────────────────────────

function FilterGroup({
  label, value, options, onChange,
}: {
  label:   string;
  value:   string;
  options: Array<{ value: string; label: string }>;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-mono text-smoke/60 mr-1">{label}:</span>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={[
            "text-xs font-mono px-2.5 py-1 rounded-sm border transition-all duration-150",
            value === opt.value
              ? "border-brass text-brass bg-brass/10"
              : "border-brass/20 text-smoke/70 hover:border-brass/40 hover:text-aged",
          ].join(" ")}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty + Skeleton states
// ─────────────────────────────────────────────────────────────────────────────

function MarketplaceEmpty({ hasItems }: { hasItems: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      <div className="text-5xl mb-4 opacity-30">📜</div>
      {hasItems ? (
        <>
          <p className="font-serif text-aged text-xl mb-2">No stories match these filters</p>
          <p className="text-smoke text-sm font-mono">Try adjusting your filter criteria.</p>
        </>
      ) : (
        <>
          <p className="font-serif text-aged text-xl mb-2">No licensable stories yet</p>
          <p className="text-smoke text-sm font-mono">
            Story owners can open their vaults for licensing from the Vault page.
          </p>
        </>
      )}
    </motion.div>
  );
}

function MarketplaceSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="h-48 rounded-sm bg-shadow/40 border border-brass/10 animate-pulse"
          style={{ animationDelay: `${i * 0.08}s` }}
        />
      ))}
    </div>
  );
}
