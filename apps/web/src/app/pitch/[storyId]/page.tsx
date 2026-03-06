"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useReadContract, useReadContracts } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import { formatEther } from "viem";
import { LORE_VAULT_ADDRESS, LORE_VAULT_ABI, LORE_IP_MODULE_ADDRESS, LORE_IP_MODULE_ABI } from "@/lib/contracts";
import { PitchGenerateButton } from "@/components/PitchGenerateButton";
import { PitchBriefCard } from "@/components/PitchBriefCard";
import { LicenseRequestModal } from "@/components/LicenseRequestModal";
import type { FilmPitchBrief, StoryMetadata, LicenseTerms } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// Pitch Detail Page — generate and view a documentary treatment brief
// ─────────────────────────────────────────────────────────────────────────────

export default function PitchDetailPage() {
  const params  = useParams<{ storyId: string }>();
  const storyId = (() => {
    try { return params?.storyId ? BigInt(params.storyId) : null; }
    catch { return null; }
  })();

  const [brief,      setBrief]      = useState<FilmPitchBrief | null>(null);
  const [showModal,  setShowModal]  = useState(false);

  // Fetch story metadata
  const { data: storyRaw, isLoading: storyLoading } = useReadContract({
    address:      LORE_VAULT_ADDRESS,
    abi:          LORE_VAULT_ABI,
    functionName: "stories",
    args:         storyId !== null ? [storyId] : undefined,
    query:        { enabled: storyId !== null },
  });

  // Fetch license terms
  const { data: termsRaw, isLoading: termsLoading } = useReadContract({
    address:      LORE_IP_MODULE_ADDRESS,
    abi:          LORE_IP_MODULE_ABI,
    functionName: "terms",
    args:         storyId !== null ? [storyId] : undefined,
    query:        { enabled: storyId !== null },
  });

  // Parse story
  const story: StoryMetadata | null = storyRaw
    ? (() => {
        const [uploader, vaultId, zgRootHash, mediaType, duration, isPrivate, timestamp, title, encryptedKeyHash] =
          storyRaw as [`0x${string}`, bigint, string, string, bigint, boolean, bigint, string, string];
        return { id: storyId!, uploader, vaultId, zgRootHash, mediaType, duration, isPrivate, timestamp, title, encryptedKeyHash };
      })()
    : null;

  // Fetch vault name (needs story.vaultId)
  const { data: vaultRaw } = useReadContract({
    address:      LORE_VAULT_ADDRESS,
    abi:          LORE_VAULT_ABI,
    functionName: "vaults",
    args:         story ? [story.vaultId] : undefined,
    query:        { enabled: !!story },
  });
  const vaultName = vaultRaw ? (vaultRaw as [`0x${string}`, string, boolean, bigint, bigint])[1] : "";

  // Parse terms
  const terms: LicenseTerms | null = termsRaw
    ? (() => {
        const [isLicensable, commercialUse, exclusiveAvailable, royaltyWei, exclusiveRoyaltyWei, maxLicenses, jurisdictionNote, setAt] =
          termsRaw as [boolean, boolean, boolean, bigint, bigint, bigint, string, bigint];
        return { isLicensable, commercialUse, exclusiveAvailable, royaltyWei, exclusiveRoyaltyWei, maxLicenses, jurisdictionNote, setAt };
      })()
    : null;

  const isLoading = storyLoading || termsLoading;

  if (storyId === null) {
    return <NotFound />;
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-32 text-center">
        <p className="font-serif text-aged/60 text-sm animate-pulse">Loading story…</p>
      </div>
    );
  }

  if (!story) {
    return <NotFound />;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 pb-32">

      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-mono text-smoke/50 mb-2">
          <a href="/pitch" className="hover:text-aged transition-colors">Pitch Portal</a>
          <span className="mx-2">·</span>
          {story.mediaType}
        </p>
        <h1 className="font-serif text-parchment text-3xl leading-snug mb-1">
          {story.title}
        </h1>
        <p className="text-smoke font-mono text-xs">
          {vaultName || "Vault"}
          {story.duration > 0n && ` · ${fmtDuration(Number(story.duration))}`}
          {terms && terms.royaltyWei > 0n && ` · ${formatEther(terms.royaltyWei)} OG`}
        </p>
      </div>

      {/* Generate button */}
      {!brief && (
        <div className="mb-8">
          <p className="text-sm text-smoke font-serif italic mb-4">
            Let the LoreRich AI weave a documentary treatment brief for this story.
          </p>
          <PitchGenerateButton
            storyId={storyId.toString()}
            title={story.title}
            mediaType={story.mediaType}
            vaultName={vaultName || "Unknown Vault"}
            onGenerated={setBrief}
          />
        </div>
      )}

      {/* Brief reveal */}
      <AnimatePresence>
        {brief && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-mono text-brass uppercase tracking-widest">
                Documentary Treatment
              </p>
              <button
                onClick={() => setBrief(null)}
                className="text-xs font-mono text-smoke/50 hover:text-aged transition-colors"
              >
                ↺ Regenerate
              </button>
            </div>
            <PitchBriefCard brief={brief} full storyTitle={story.title} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky "Request License" bar — shown once brief is generated */}
      <AnimatePresence>
        {brief && terms?.isLicensable && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-center gap-4
              px-6 py-4 border-t border-brass/20"
            style={{ background: "rgba(13,11,14,0.92)", backdropFilter: "blur(8px)" }}
          >
            <p className="text-sm font-serif text-aged hidden sm:block">
              Ready to license <span className="text-parchment">{story.title}</span>?
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="btn-brass px-6 py-2"
            >
              Request License →
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* License Request Modal */}
      {showModal && story && terms && (
        <LicenseRequestModal
          story={story}
          terms={terms}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

function fmtDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = String(s % 60).padStart(2, "0");
  return `${m}:${sec}`;
}

function NotFound() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-32 text-center">
      <p className="font-serif text-aged text-xl mb-2">Story not found</p>
      <a href="/pitch" className="text-sm font-mono text-smoke hover:text-aged transition-colors">
        ← Back to Pitch Portal
      </a>
    </div>
  );
}
