"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useMarketplaceStories } from "@/hooks/useIPLicense";
import { MarketplaceStoryCard } from "@/components/MarketplaceStoryCard";
import { DemoBanner, DemoBadge } from "@/components/DemoBanner";
import { DEMO_MARKETPLACE_ITEMS, DEMO_VAULT_NAME_MAP } from "@/lib/demoData";

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

  function applyFilters<T extends { story: { mediaType: string }; terms: { commercialUse: boolean; exclusiveAvailable: boolean; royaltyWei: bigint } }>(list: T[]): T[] {
    return list.filter(({ story, terms }) => {
      if (mediaFilter !== "all" && story.mediaType !== mediaFilter) return false;
      if (typeFilter !== "all") {
        if (typeFilter === "Commercial" && !terms.commercialUse)      return false;
        if (typeFilter === "Exclusive"  && !terms.exclusiveAvailable) return false;
      }
      if (priceFilter === "free" && terms.royaltyWei > 0n)  return false;
      if (priceFilter === "paid" && terms.royaltyWei === 0n) return false;
      return true;
    });
  }

  const filtered     = useMemo(() => applyFilters(items),                  [items, mediaFilter, typeFilter, priceFilter]); // eslint-disable-line react-hooks/exhaustive-deps
  const filteredDemo = useMemo(() => applyFilters(DEMO_MARKETPLACE_ITEMS), [mediaFilter, typeFilter, priceFilter]);        // eslint-disable-line react-hooks/exhaustive-deps

  const totalCount = filtered.length + filteredDemo.length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-parchment text-3xl">Story Marketplace</h1>
        <p className="text-smoke font-mono text-xs mt-1">
          License ancestral stories for personal, documentary, or commercial use.
        </p>
      </div>

      {/* Education CTA banner */}
      <div className="vault-glass border border-moss/20 rounded p-5 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1">
          <p className="font-serif text-parchment text-base">
            Educational Comics for Children
          </p>
          <p className="text-smoke/50 text-xs font-mono mt-1">
            Create age-appropriate comics from cultural stories — designed for young learners
            ages 5–14. Teach heritage, traditions, and history through storytelling.
          </p>
        </div>
        <a href="/lore" className="btn-brass text-xs px-5 py-2 shrink-0">
          Create Educational Comic
        </a>
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

        {totalCount > 0 && (
          <span className="ml-auto self-center text-xs font-mono text-smoke/60">
            {totalCount} {totalCount === 1 ? "story" : "stories"}
          </span>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <MarketplaceSkeleton />
      ) : totalCount === 0 ? (
        <MarketplaceEmpty hasItems={false} />
      ) : (
        <>
          {/* Real on-chain stories */}
          {filtered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
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

          {/* Demo / sample stories */}
          {filteredDemo.length > 0 && (
            <div>
              <DemoBanner />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDemo.map((item, i) => (
                  <div key={`demo-${item.story.id}`} className="relative">
                    <div className="absolute top-2 right-2 z-10">
                      <DemoBadge />
                    </div>
                    <MarketplaceStoryCard
                      item={item}
                      vaultName={DEMO_VAULT_NAME_MAP[item.story.vaultId.toString()] ?? "Demo Vault"}
                      index={filtered.length + i}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
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
