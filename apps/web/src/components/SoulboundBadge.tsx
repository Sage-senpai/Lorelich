"use client";

import { useReadContract } from "wagmi";
import { motion } from "framer-motion";
import { SOULBOUND_ADDRESS, SOULBOUND_ABI } from "@/lib/contracts";
import type { StoryMetadata } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// SoulboundBadge — modal showing ERC-5192 soulbound NFT details for a story.
//
// Token ID mirrors Story ID (both minted sequentially from 0 via uploadStory).
// Reads: ownerOf, tokenURI, locked, tokenToStory from SoulboundStory contract.
// ─────────────────────────────────────────────────────────────────────────────

const EXPLORER = "https://chainscan-galileo.0g.ai";

interface SoulboundBadgeProps {
  story:   StoryMetadata;
  onClose: () => void;
}

export function SoulboundBadge({ story, onClose }: SoulboundBadgeProps) {
  const tokenId = story.id;

  const { data: owner,    isError: ownerError } = useReadContract({
    address:      SOULBOUND_ADDRESS,
    abi:          SOULBOUND_ABI,
    functionName: "ownerOf",
    args:         [tokenId],
  });
  const { data: uri } = useReadContract({
    address:      SOULBOUND_ADDRESS,
    abi:          SOULBOUND_ABI,
    functionName: "tokenURI",
    args:         [tokenId],
  });
  const { data: isLocked } = useReadContract({
    address:      SOULBOUND_ADDRESS,
    abi:          SOULBOUND_ABI,
    functionName: "locked",
    args:         [tokenId],
  });

  const tokenMinted = !ownerError && owner !== undefined;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ background: "rgba(13,11,14,0.80)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="flex min-h-full items-center justify-center p-3 sm:p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md vault-glass rounded-sm p-4 sm:p-6 shadow-vault"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4 sm:mb-5">
            <div>
              <h2 className="font-serif text-parchment text-lg sm:text-xl">Soulbound NFT</h2>
              <p className="text-xs font-mono text-smoke/50 mt-0.5">ERC-5192 · Permanently Locked</p>
            </div>
            <button
              onClick={onClose}
              className="text-smoke hover:text-aged transition-colors text-lg"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Story info */}
          <div className="mb-4 pb-4 border-b border-brass/10">
            <p className="font-serif text-parchment">{story.title}</p>
            <p className="text-xs text-smoke/50 font-mono mt-0.5">{story.mediaType}</p>
          </div>

          {!tokenMinted ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-4xl opacity-20">🪙</p>
              <p className="text-sm font-mono text-smoke/50">Token not found on-chain.</p>
              <p className="text-xs font-mono text-smoke/35">
                The story may still be pending confirmation on the network.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <NFTField label="Token ID"  value={tokenId.toString()} mono />
              <NFTField label="Owner"     value={owner as string}    mono />
              <NFTField label="Contract"  value={SOULBOUND_ADDRESS}  mono />
              <NFTField
                label="Status"
                value={isLocked !== false ? "✓ Permanently soulbound (non-transferable)" : "Unlocked"}
              />
              {uri && <NFTField label="Token URI" value={uri as string} mono />}

              <div className="pt-3 flex gap-2 flex-wrap">
                <a
                  href={`${EXPLORER}/token/${SOULBOUND_ADDRESS}?a=${tokenId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-brass/70 hover:text-brass transition-colors
                    border border-brass/30 px-3 py-1.5 rounded-sm"
                >
                  View on Explorer ↗
                </a>
                {uri && (
                  <a
                    href={uri as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono text-smoke/50 hover:text-aged transition-colors
                      border border-smoke/20 px-3 py-1.5 rounded-sm"
                  >
                    Token Metadata ↗
                  </a>
                )}
              </div>
            </div>
          )}

          <p className="text-xs font-mono text-smoke/30 mt-4 leading-relaxed">
            This Soulbound Story token is non-transferable and permanently bound to the
            uploader&apos;s wallet — irrefutable proof of preservation on LoreRich.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function NFTField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-mono text-smoke/40 uppercase tracking-widest mb-0.5">
        {label}
      </p>
      <p
        className={[
          "text-xs break-all leading-relaxed",
          mono ? "font-mono text-smoke/80" : "font-serif text-parchment/80",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}
