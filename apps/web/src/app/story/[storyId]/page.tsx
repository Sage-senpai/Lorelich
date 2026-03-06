"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useReadContract } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import { formatEther } from "viem";
import { LORE_VAULT_ADDRESS, LORE_VAULT_ABI, LORE_IP_MODULE_ADDRESS, LORE_IP_MODULE_ABI } from "@/lib/contracts";
import { StoryViewer } from "@/components/StoryViewer";
import type { StoryMetadata, LicenseTerms } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// /story/[storyId] — Public story share page
//
// Shareable URL for any story. Public stories show title, vault, media type,
// timestamp, 0G root hash, IP terms, and a "View" button opening StoryViewer.
// Private stories show a locked state — wallet must be connected and have access.
// ─────────────────────────────────────────────────────────────────────────────

export default function StorySharePage() {
  const params  = useParams<{ storyId: string }>();
  const storyId = (() => {
    try { return params?.storyId ? BigInt(params.storyId) : null; }
    catch { return null; }
  })();

  const [showViewer, setShowViewer] = useState(false);

  // Fetch story metadata
  const { data: storyRaw, isLoading: storyLoading } = useReadContract({
    address:      LORE_VAULT_ADDRESS,
    abi:          LORE_VAULT_ABI,
    functionName: "stories",
    args:         storyId !== null ? [storyId] : undefined,
    query:        { enabled: storyId !== null },
  });

  // Parse story
  const story: StoryMetadata | null = storyRaw && storyId !== null
    ? (() => {
        const [uploader, vaultId, zgRootHash, mediaType, duration, isPrivate, timestamp, title, encryptedKeyHash] =
          storyRaw as [`0x${string}`, bigint, string, string, bigint, boolean, bigint, string, string];
        return { id: storyId, uploader, vaultId, zgRootHash, mediaType, duration, isPrivate, timestamp, title, encryptedKeyHash };
      })()
    : null;

  // Fetch vault name
  const { data: vaultRaw } = useReadContract({
    address:      LORE_VAULT_ADDRESS,
    abi:          LORE_VAULT_ABI,
    functionName: "vaults",
    args:         story ? [story.vaultId] : undefined,
    query:        { enabled: !!story },
  });
  const vaultName = vaultRaw ? (vaultRaw as [`0x${string}`, string, boolean, bigint, bigint])[1] : "";

  // Fetch license terms
  const { data: termsRaw } = useReadContract({
    address:      LORE_IP_MODULE_ADDRESS,
    abi:          LORE_IP_MODULE_ABI,
    functionName: "terms",
    args:         storyId !== null ? [storyId] : undefined,
    query:        { enabled: storyId !== null && !!LORE_IP_MODULE_ADDRESS && LORE_IP_MODULE_ADDRESS !== "0x" },
  });
  const terms: LicenseTerms | null = termsRaw
    ? (() => {
        const [isLicensable, commercialUse, exclusiveAvailable, royaltyWei, exclusiveRoyaltyWei, maxLicenses, jurisdictionNote, setAt] =
          termsRaw as [boolean, boolean, boolean, bigint, bigint, bigint, string, bigint];
        return { isLicensable, commercialUse, exclusiveAvailable, royaltyWei, exclusiveRoyaltyWei, maxLicenses, jurisdictionNote, setAt };
      })()
    : null;

  if (storyId === null) {
    return <ErrorView message="Invalid story ID." />;
  }

  if (storyLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-32 text-center">
        <p className="font-serif text-aged/60 text-sm animate-pulse">
          Consulting the vault records…
        </p>
      </div>
    );
  }

  if (!story) {
    return <ErrorView message="Story not found in the vault records." />;
  }

  const date = new Date(Number(story.timestamp) * 1000).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const mediaIcons: Record<string, string> = {
    audio: "🎵", video: "🎬", text: "📜", image: "🖼",
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">

      {/* Breadcrumb */}
      <p className="text-xs font-mono text-smoke/40 mb-6">
        <a href="/" className="hover:text-aged transition-colors">LoreRich Vault</a>
        <span className="mx-2">·</span>
        {vaultName ? (
          <span>{vaultName}</span>
        ) : (
          <span className="opacity-50">Loading vault…</span>
        )}
      </p>

      {/* Story card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="vault-glass rounded-sm p-8 shadow-vault"
      >
        {/* Media badge + private flag */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">{mediaIcons[story.mediaType] ?? "📄"}</span>
          <span className="text-xs font-mono text-smoke/60 uppercase tracking-widest">
            {story.mediaType}
          </span>
          {story.isPrivate && (
            <span className="text-xs font-mono text-smoke/50 border border-smoke/20 px-2 py-0.5 rounded-sm ml-auto">
              🔒 Private
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="font-serif text-parchment text-3xl leading-snug mb-2">
          {story.title}
        </h1>

        {/* Meta row */}
        <p className="text-sm font-mono text-smoke/60 mb-6">
          {vaultName && <span>{vaultName} · </span>}
          {date}
          {story.duration > 0n && ` · ${fmtDuration(Number(story.duration))}`}
        </p>

        {/* DA proof */}
        <div className="flex items-center gap-2 mb-6">
          <span className="text-xs font-mono text-moss border border-moss/30 px-2 py-0.5 rounded-sm">
            ✓ 0G Storage
          </span>
          <span className="text-xs font-mono text-smoke/30 truncate">
            {story.zgRootHash.slice(0, 22)}…
          </span>
        </div>

        {/* IP Terms badge */}
        {terms?.isLicensable && (
          <div className="flex flex-wrap gap-2 mb-6">
            <span className="text-xs font-mono text-brass border border-brass/30 px-2 py-0.5 rounded-sm">
              🔑 Licensable
            </span>
            {terms.commercialUse && (
              <span className="text-xs font-mono text-aged border border-aged/30 px-2 py-0.5 rounded-sm">
                Commercial Use
              </span>
            )}
            {terms.royaltyWei > 0n && (
              <span className="text-xs font-mono text-smoke/60 border border-smoke/20 px-2 py-0.5 rounded-sm">
                {formatEther(terms.royaltyWei)} OG / license
              </span>
            )}
          </div>
        )}

        {/* Private vault note */}
        {story.isPrivate ? (
          <div className="py-8 text-center border border-brass/10 rounded-sm">
            <p className="text-4xl opacity-30 mb-3">🔒</p>
            <p className="font-serif text-aged text-sm">
              This story is held in a private vault.
            </p>
            <p className="text-xs text-smoke/50 font-mono mt-1">
              Connect your wallet and request access from the vault owner.
            </p>
          </div>
        ) : (
          <button
            onClick={() => setShowViewer(true)}
            className="btn-brass w-full py-3"
          >
            View Story
          </button>
        )}

        {/* Share / CTA */}
        <div className="mt-6 pt-5 border-t border-brass/10 flex items-center justify-between">
          <p className="text-xs font-mono text-smoke/40">
            Story #{storyId.toString()}
          </p>
          <div className="flex gap-3">
            {terms?.isLicensable && (
              <a
                href={`/pitch/${storyId}`}
                className="text-xs font-mono text-aged hover:text-brass transition-colors"
              >
                📽 Film Pitch →
              </a>
            )}
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href).catch(() => {});
              }}
              className="text-xs font-mono text-smoke/50 hover:text-aged transition-colors"
            >
              Copy Link
            </button>
          </div>
        </div>
      </motion.div>

      {/* Full details */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="mt-4 px-2 space-y-2"
      >
        <DetailRow label="Uploader" value={story.uploader} mono />
        <DetailRow label="Root Hash" value={story.zgRootHash} mono />
        <DetailRow label="Vault ID"  value={story.vaultId.toString()} mono />
      </motion.div>

      {/* Story viewer modal */}
      <AnimatePresence>
        {showViewer && (
          <StoryViewer story={story} onClose={() => setShowViewer(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3 text-xs">
      <span className="text-smoke/40 font-mono w-20 shrink-0">{label}</span>
      <span className={["text-smoke/60 break-all", mono ? "font-mono" : ""].join(" ")}>
        {value}
      </span>
    </div>
  );
}

function ErrorView({ message }: { message: string }) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-32 text-center">
      <p className="font-serif text-aged text-xl mb-2">{message}</p>
      <a href="/vault" className="text-sm font-mono text-smoke hover:text-aged transition-colors">
        ← Enter the Vault
      </a>
    </div>
  );
}

function fmtDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = String(s % 60).padStart(2, "0");
  return `${m}:${sec}`;
}
