"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { formatEther } from "viem";
import type { LicensableStory } from "@/types";
import { LicenseRequestModal } from "./LicenseRequestModal";

// ─────────────────────────────────────────────────────────────────────────────
// MarketplaceStoryCard — story card for the public license marketplace
// ─────────────────────────────────────────────────────────────────────────────

interface MarketplaceStoryCardProps {
  item:      LicensableStory;
  vaultName: string;
  index?:    number;
}

export function MarketplaceStoryCard({ item, vaultName, index = 0 }: MarketplaceStoryCardProps) {
  const [showModal, setShowModal] = useState(false);
  const { story, terms } = item;

  const availableTypes: string[] = ["Personal", "Documentary"];
  if (terms.commercialUse) availableTypes.push("Commercial");
  if (terms.exclusiveAvailable) availableTypes.push("Exclusive");

  const feeDisplay = terms.royaltyWei > 0n
    ? `${formatEther(terms.royaltyWei)} OG`
    : "Free";

  const exclusiveFeeDisplay = terms.exclusiveAvailable && terms.exclusiveRoyaltyWei > 0n
    ? `${formatEther(terms.exclusiveRoyaltyWei)} OG exclusive`
    : null;

  const maxDisplay = terms.maxLicenses > 0n
    ? `Max ${terms.maxLicenses.toString()} licenses`
    : null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.06, duration: 0.35 }}
        className="group relative vault-glass rounded-sm p-5 space-y-4 cursor-pointer
          border border-brass/10 hover:border-brass/40 transition-all duration-300"
        onClick={() => setShowModal(true)}
      >
        {/* Brass glow */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none rounded-sm"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(184,134,11,0.06) 0%, transparent 60%)" }}
        />

        {/* Title + price row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-serif text-parchment text-base leading-snug group-hover:text-gold transition-colors truncate">
              {story.title}
            </h3>
            <p className="text-xs text-smoke font-mono mt-0.5">
              {vaultName} · {story.mediaType}
              {story.duration > 0n && ` · ${fmtDuration(Number(story.duration))}`}
            </p>
          </div>
          <div className="text-right shrink-0 pt-0.5">
            <p className="text-sm font-mono text-brass">{feeDisplay}</p>
            {exclusiveFeeDisplay && (
              <p className="text-xs font-mono text-aged/70 mt-0.5">{exclusiveFeeDisplay}</p>
            )}
          </div>
        </div>

        {/* Available license type badges */}
        <div className="flex flex-wrap gap-1.5">
          {availableTypes.map((t) => (
            <span
              key={t}
              className="text-xs font-mono px-2 py-0.5 rounded-sm border border-brass/25 text-aged bg-shadow/30"
            >
              {t}
            </span>
          ))}
          {maxDisplay && (
            <span className="text-xs font-mono px-2 py-0.5 rounded-sm border border-smoke/20 text-smoke/60">
              {maxDisplay}
            </span>
          )}
          {terms.jurisdictionNote && (
            <span className="text-xs font-mono px-2 py-0.5 rounded-sm border border-smoke/20 text-smoke/50 truncate max-w-[180px]">
              {terms.jurisdictionNote}
            </span>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={(e) => { e.stopPropagation(); setShowModal(true); }}
          className="w-full py-2 text-xs font-mono rounded-sm border border-brass/35 text-aged
            hover:bg-brass/10 hover:text-brass hover:border-brass/60 transition-all duration-200"
        >
          Request License →
        </button>

        {/* Bottom brass rule */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brass/25 to-transparent
          opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
      </motion.div>

      {showModal && (
        <LicenseRequestModal
          story={story}
          terms={terms}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

function fmtDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = String(s % 60).padStart(2, "0");
  return `${m}:${sec}`;
}
