"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { useVaultStore } from "@/store";
import { useOwnerVaults } from "@/hooks/useVault";
import { StoryUpload } from "@/components/StoryUpload";
import Link from "next/link";

// ─────────────────────────────────────────────────────────────────────────────
// Upload Page — standalone story upload view with vault selector
// ─────────────────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const { isConnected } = useAccount();
  const vaults          = useVaultStore((s) => s.vaults);
  const [selectedId, setSelectedId] = useState<bigint | null>(null);

  const { isLoading } = useOwnerVaults();

  const selectedVault = vaults.find((v) => v.id === selectedId) ?? null;

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-32 text-center">
        <p className="font-serif text-aged text-xl mb-4">
          Connect your wallet to upload a story.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h1 className="font-serif text-parchment text-3xl mb-2">Preserve a Story</h1>
        <p className="text-smoke font-mono text-sm">
          Upload audio, video, or text to a vault on 0G decentralized storage.
          Private vaults encrypt your file before it leaves your device.
        </p>
      </motion.div>

      {/* Vault selector */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="vault-glass rounded-sm p-5 mb-5"
      >
        <label className="text-xs text-smoke font-mono block mb-3">
          Select Vault
        </label>

        {isLoading ? (
          <div className="h-10 bg-dusk/50 rounded-sm animate-pulse" />
        ) : vaults.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-aged font-serif italic mb-2">
              You have no vaults yet.
            </p>
            <Link href="/vault" className="text-xs text-brass hover:text-gold font-mono transition-colors">
              Create a vault first →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {vaults.map((v) => (
              <button
                key={v.id.toString()}
                onClick={() => setSelectedId(v.id)}
                className={[
                  "w-full text-left px-3 py-2.5 rounded-sm border transition-all duration-200",
                  "flex items-center justify-between",
                  selectedId === v.id
                    ? "border-brass bg-brass/5 text-parchment"
                    : "border-brass/20 text-aged hover:border-brass/40",
                ].join(" ")}
              >
                <span className="font-mono text-sm">{v.name}</span>
                <span className="text-xs text-smoke">
                  {v.isPrivate ? "🔒" : "🌐"}
                  {" "}
                  {v.storyCount.toString()} {v.storyCount === 1n ? "story" : "stories"}
                </span>
              </button>
            ))}
          </div>
        )}
      </motion.div>

      {/* Upload form — shown once a vault is selected */}
      {selectedVault && (
        <motion.div
          key={selectedVault.id.toString()}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="vault-glass rounded-sm p-5"
        >
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-brass/15">
            <span className="text-brass font-mono text-sm">→</span>
            <span className="font-serif text-parchment">{selectedVault.name}</span>
            {selectedVault.isPrivate && (
              <span className="ml-auto text-xs text-aged font-mono border border-aged/30 px-2 py-0.5 rounded-sm">
                🔒 Encrypted upload
              </span>
            )}
          </div>

          <StoryUpload
            vaultId={selectedVault.id}
            isPrivate={selectedVault.isPrivate}
            onComplete={() => {
              // Stay on page — user may want to upload more
            }}
          />
        </motion.div>
      )}

      {/* DA proof explanation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-6 p-4 rounded-sm border border-moss/20 bg-moss/5"
      >
        <p className="text-xs text-smoke font-mono leading-relaxed">
          <span className="text-moss">✓ Verifiable DA Proof</span>
          {" "}— Every upload stores a 0G merkle root hash on-chain.
          Anyone can verify your story exists on the network at any time.
        </p>
      </motion.div>
    </div>
  );
}
