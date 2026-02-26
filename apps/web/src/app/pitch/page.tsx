"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { formatEther } from "viem";
import { useMarketplaceStories } from "@/hooks/useIPLicense";
import { DemoBanner, DemoBadge } from "@/components/DemoBanner";
import { DEMO_MARKETPLACE_ITEMS, DEMO_VAULT_NAME_MAP } from "@/lib/demoData";

// ─────────────────────────────────────────────────────────────────────────────
// Pitch Portal — list of commercial stories available for documentary licensing
// ─────────────────────────────────────────────────────────────────────────────

export default function PitchPage() {
  const { items, vaultNameMap, isLoading } = useMarketplaceStories();

  // Only commercial stories are relevant for documentary pitching
  const commercial     = useMemo(() => items.filter(({ terms }) => terms.commercialUse), [items]);
  const demoCommercial = useMemo(() => DEMO_MARKETPLACE_ITEMS.filter(({ terms }) => terms.commercialUse), []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-parchment text-3xl mb-1">Pitch Portal</h1>
        <p className="text-smoke font-mono text-xs">
          Ancestral stories available for documentary and commercial licensing.
          Generate an AI treatment brief to pitch to commissioning editors.
        </p>
      </div>

      {isLoading ? (
        <PitchSkeleton />
      ) : commercial.length === 0 && demoCommercial.length === 0 ? (
        <PitchEmpty />
      ) : (
        <div className="space-y-3">
          {/* Real on-chain commercial stories */}
          {commercial.map((item, i) => {
            const vaultName = vaultNameMap[item.story.vaultId.toString()] ?? "Unknown Vault";
            const feeEth    = item.terms.royaltyWei > 0n
              ? `${formatEther(item.terms.royaltyWei)} OG`
              : "Free";

            return (
              <PitchCard
                key={item.story.id.toString()}
                item={item}
                vaultName={vaultName}
                feeEth={feeEth}
                index={i}
                isDemo={false}
              />
            );
          })}

          {/* Demo commercial stories */}
          {demoCommercial.length > 0 && (
            <>
              <div className="pt-2">
                <DemoBanner />
              </div>
              {demoCommercial.map((item, i) => {
                const vaultName = DEMO_VAULT_NAME_MAP[item.story.vaultId.toString()] ?? "Demo Vault";
                const feeEth    = item.terms.royaltyWei > 0n
                  ? `${formatEther(item.terms.royaltyWei)} OG`
                  : "Free";
                return (
                  <PitchCard
                    key={`demo-${item.story.id}`}
                    item={item}
                    vaultName={vaultName}
                    feeEth={feeEth}
                    index={commercial.length + i}
                    isDemo
                  />
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pitch Card
// ─────────────────────────────────────────────────────────────────────────────

import type { LicensableStory } from "@/types";

function PitchCard({
  item, vaultName, feeEth, index, isDemo,
}: {
  item:      LicensableStory;
  vaultName: string;
  feeEth:    string;
  index:     number;
  isDemo:    boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="vault-glass rounded-sm p-5 border border-brass/10 hover:border-brass/30 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h2 className="font-serif text-parchment text-base truncate">{item.story.title}</h2>
            {isDemo && <DemoBadge className="shrink-0" />}
          </div>
          <p className="text-xs text-smoke font-mono">
            {vaultName} · {item.story.mediaType}
            {item.story.duration > 0n && ` · ${fmtDuration(Number(item.story.duration))}`}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded-sm border border-brass/20 text-aged">
              Documentary
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-sm border border-brass/20 text-aged">
              Commercial
            </span>
            {item.terms.exclusiveAvailable && (
              <span className="text-xs font-mono px-2 py-0.5 rounded-sm border border-aged/30 text-aged/80">
                Exclusive
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0 text-right space-y-2">
          <p className="text-sm font-mono text-brass">{feeEth}</p>
          {isDemo ? (
            <span
              className="block text-xs font-mono px-3 py-1.5 rounded-sm border border-smoke/20
                         text-smoke/40 cursor-not-allowed"
              title="Not available for demo stories"
            >
              Generate Pitch →
            </span>
          ) : (
            <Link
              href={`/pitch/${item.story.id.toString()}`}
              className="block text-xs font-mono px-3 py-1.5 rounded-sm border border-brass/40 text-aged
                hover:bg-brass/10 hover:text-brass hover:border-brass/70 transition-all duration-200"
            >
              Generate Pitch →
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function fmtDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = String(s % 60).padStart(2, "0");
  return `${m}:${sec}`;
}

function PitchEmpty() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      <div className="text-5xl mb-4 opacity-30">🎬</div>
      <p className="font-serif text-aged text-xl mb-2">No pitchable stories yet</p>
      <p className="text-smoke text-sm font-mono">
        Story owners can enable commercial licensing from their Vault dashboard.
      </p>
    </motion.div>
  );
}

function PitchSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-28 rounded-sm bg-shadow/40 border border-brass/10 animate-pulse"
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  );
}
