"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, useWriteContract } from "wagmi";
import { useVaultStore } from "@/store";
import { useOwnerVaults, useVaultStories } from "@/hooks/useVault";
import { useVaultIncomingRequests } from "@/hooks/useIPLicense";
import { VaultCard, VaultCardEmpty } from "@/components/VaultCard";
import { StoryUpload } from "@/components/StoryUpload";
import { WaveformPreview } from "@/components/WaveformPreview";
import { LoreLichChat } from "@/components/LoreLichChat";
import { LicenseTermsForm } from "@/components/LicenseTermsForm";
import { LicenseRequestCard } from "@/components/LicenseRequestCard";
import { StoryViewer } from "@/components/StoryViewer";
import { StoryTags } from "@/components/StoryTags";
import { TranscriptButton } from "@/components/TranscriptButton";
import { AccessGrantModal } from "@/components/AccessGrantModal";
import { CertificateModal } from "@/components/CertificateModal";
import { LORE_VAULT_ADDRESS, LORE_VAULT_ABI } from "@/lib/contracts";
import type { Vault, StoryMetadata } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// Vault Dashboard — lists vaults, shows stories, upload + LoreLich AI
// ─────────────────────────────────────────────────────────────────────────────

export default function VaultPage() {
  const { isConnected, address, status } = useAccount();
  const { vaultIds, isLoading }  = useOwnerVaults();
  const vaults                   = useVaultStore((s) => s.vaults);
  const selectedVaultId          = useVaultStore((s) => s.selectedVaultId);
  const stories                  = useVaultStore((s) => s.stories);
  const selectVault              = useVaultStore((s) => s.selectVault);

  const { isLoading: storiesLoading } = useVaultStories(selectedVaultId);

  const [showCreateModal,  setShowCreateModal]  = useState(false);
  const [showUploadModal,  setShowUploadModal]  = useState(false);
  const [showChatPanel,    setShowChatPanel]    = useState(false);
  const [licenseStory,     setLicenseStory]     = useState<StoryMetadata | null>(null);
  const [viewStory,        setViewStory]        = useState<StoryMetadata | null>(null);
  const [certStory,        setCertStory]        = useState<StoryMetadata | null>(null);
  const [showAccessModal,  setShowAccessModal]  = useState(false);
  const [showIncoming,     setShowIncoming]     = useState(true);

  const selectedVault = vaults.find((v) => v.id === selectedVaultId) ?? null;
  const selectedStories = selectedVaultId !== null
    ? (stories[selectedVaultId.toString()] ?? [])
    : [];

  // Incoming license requests for selected vault's stories
  const selectedStoryIds = useMemo(
    () => selectedStories.map((s) => s.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedStories.map((s) => s.id.toString()).join(",")],
  );
  const { requests: incomingReqs } = useVaultIncomingRequests(selectedStoryIds);
  const pendingReqs = incomingReqs.filter((r) => r.status === "PENDING");

  const storyTitleMap = useMemo(
    () => Object.fromEntries(selectedStories.map((s) => [s.id.toString(), s.title])),
    [selectedStories],
  );

  // Wagmi rehydrates from localStorage on page load — wait before showing gate
  if (status === "reconnecting" || status === "connecting") {
    return (
      <div className="max-w-4xl mx-auto px-4 py-32 text-center">
        <p className="font-serif text-aged/60 text-sm animate-pulse">Restoring connection…</p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-32 text-center">
        <p className="font-serif text-aged text-xl">Connect your wallet to enter the vault.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">

      {/* Header row */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-parchment text-3xl">Your Vaults</h1>
          <p className="text-smoke font-mono text-xs mt-1">
            {address?.slice(0, 6)}…{address?.slice(-4)}
            {" · "}
            {vaultIds.length} {vaultIds.length === 1 ? "vault" : "vaults"}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-brass"
        >
          + New Vault
        </button>
      </div>

      <div className="flex gap-6">

        {/* Left — vault list */}
        <div className="w-72 shrink-0 space-y-3">
          {isLoading ? (
            <VaultListSkeleton />
          ) : vaults.length === 0 ? (
            <VaultCardEmpty />
          ) : (
            vaults.map((v, i) => (
              <VaultCard
                key={v.id.toString()}
                vault={v}
                index={i}
                onClick={() => {
                  selectVault(v.id);
                  setShowChatPanel(false);
                }}
              />
            ))
          )}
        </div>

        {/* Right — story list or chat */}
        <div className="flex-1 min-w-0">
          {selectedVault ? (
            <motion.div
              key={selectedVaultId?.toString()}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Vault header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-serif text-parchment text-2xl">{selectedVault.name}</h2>
                  <p className="text-smoke text-xs font-mono mt-0.5">
                    {selectedVault.storyCount.toString()} {selectedVault.storyCount === 1n ? "story" : "stories"}
                    {" · "}
                    {selectedVault.isPrivate ? "🔒 Private" : "🌐 Public"}
                  </p>
                </div>
                <div className="flex gap-2">
                  {/* Access grants — only for private vault owner */}
                  {selectedVault.isPrivate && selectedVault.owner.toLowerCase() === address?.toLowerCase() && (
                    <button
                      onClick={() => setShowAccessModal(true)}
                      className="px-3 py-1.5 rounded-sm text-xs font-mono border border-smoke/20
                        text-smoke/60 hover:border-smoke/40 hover:text-aged transition-all duration-200"
                    >
                      🔑 Access
                    </button>
                  )}
                  <button
                    onClick={() => setShowChatPanel((p) => !p)}
                    className={[
                      "px-3 py-1.5 rounded-sm text-xs font-mono border transition-all duration-200",
                      showChatPanel
                        ? "border-brass text-brass bg-brass/10"
                        : "border-brass/30 text-smoke hover:border-brass/60 hover:text-aged",
                    ].join(" ")}
                  >
                    🕯 LoreLich
                  </button>
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="btn-brass text-xs"
                  >
                    + Upload Story
                  </button>
                </div>
              </div>

              {/* Incoming License Requests — only shown when pending exist */}
              <AnimatePresence>
                {pendingReqs.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-5 overflow-hidden"
                  >
                    <button
                      onClick={() => setShowIncoming((p) => !p)}
                      className="flex items-center gap-2 text-xs font-mono text-aged hover:text-brass transition-colors mb-3 w-full"
                    >
                      <span className="text-brass">●</span>
                      Incoming Requests
                      <span className="border border-brass/30 text-brass bg-brass/10 px-1.5 py-0.5 rounded-sm">
                        {pendingReqs.length} pending
                      </span>
                      <span className="ml-auto opacity-50">{showIncoming ? "▲" : "▼"}</span>
                    </button>
                    <AnimatePresence>
                      {showIncoming && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="space-y-2"
                        >
                          {incomingReqs.map((req, i) => (
                            <LicenseRequestCard
                              key={req.requestId.toString()}
                              request={req}
                              mode="incoming"
                              storyTitle={storyTitleMap[req.storyId.toString()]}
                              index={i}
                            />
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-4">
                {/* Stories */}
                <div className={showChatPanel ? "flex-1 min-w-0" : "w-full"}>
                  {storiesLoading ? (
                    <StoryListSkeleton />
                  ) : selectedStories.length === 0 ? (
                    <div className="py-16 text-center">
                      <p className="font-serif text-aged">No stories yet</p>
                      <p className="text-smoke text-xs font-mono mt-1">
                        Upload the first story to this vault.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedStories.map((story) => (
                        <div
                          key={story.id.toString()}
                          className="vault-glass rounded-sm p-4 space-y-3"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-serif text-parchment">{story.title}</p>
                              <p className="text-xs text-smoke font-mono mt-0.5">
                                {story.mediaType}
                                {story.duration > 0n && ` · ${fmtDuration(Number(story.duration))}`}
                                {" · "}
                                {new Date(Number(story.timestamp) * 1000).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                              {/* View story from 0G */}
                              <button
                                onClick={() => setViewStory(story)}
                                className="text-xs font-mono px-2 py-0.5 rounded-sm border border-smoke/25 text-smoke/70
                                  hover:border-aged/60 hover:text-aged transition-colors"
                              >
                                View
                              </button>
                              {/* Share link */}
                              <a
                                href={`/story/${story.id}`}
                                className="text-xs font-mono px-2 py-0.5 rounded-sm border border-smoke/20 text-smoke/50
                                  hover:border-smoke/40 hover:text-aged transition-colors"
                              >
                                Share
                              </a>
                              {/* License terms button */}
                              <button
                                onClick={() => setLicenseStory(story)}
                                className="text-xs font-mono px-2 py-0.5 rounded-sm border border-brass/25 text-aged/80
                                  hover:border-brass/60 hover:text-brass transition-colors"
                              >
                                🔑 License
                              </button>
                              {/* Certificate of Preservation */}
                              <button
                                onClick={() => setCertStory(story)}
                                className="text-xs font-mono px-2 py-0.5 rounded-sm border border-smoke/20 text-smoke/40
                                  hover:border-aged/40 hover:text-aged transition-colors"
                              >
                                📜 Cert
                              </button>
                              {/* DA Proof badge */}
                              <span className="text-xs font-mono text-moss border border-moss/30 px-2 py-0.5 rounded-sm">
                                ✓ 0G
                              </span>
                            </div>
                          </div>

                          {story.mediaType === "audio" && (
                            <WaveformPreview
                              duration={Number(story.duration)}
                              title={story.title}
                            />
                          )}

                          {/* Tags — localStorage + 0G KV read */}
                          <StoryTags rootHash={story.zgRootHash} />

                          {/* Transcript — audio only */}
                          {story.mediaType === "audio" && (
                            <TranscriptButton rootHash={story.zgRootHash} />
                          )}

                          <p className="text-xs text-smoke/60 font-mono truncate">
                            {story.zgRootHash}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* LoreLich chat panel */}
                <AnimatePresence>
                  {showChatPanel && (
                    <motion.div
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 320 }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.3 }}
                      className="shrink-0 overflow-hidden"
                      style={{ height: "calc(100vh - 200px)" }}
                    >
                      <LoreLichChat />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-smoke font-serif italic text-sm">
                Select a vault to view its stories
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Vault Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateVaultModal onClose={() => setShowCreateModal(false)} />
        )}
      </AnimatePresence>

      {/* Upload Story Modal */}
      <AnimatePresence>
        {showUploadModal && selectedVault && (
          <Modal onClose={() => setShowUploadModal(false)} title="Upload a Story">
            <StoryUpload
              vaultId={selectedVault.id}
              isPrivate={selectedVault.isPrivate}
              onComplete={() => setShowUploadModal(false)}
            />
          </Modal>
        )}
      </AnimatePresence>

      {/* License Terms Modal */}
      <AnimatePresence>
        {licenseStory && (
          <Modal onClose={() => setLicenseStory(null)} title="License Terms">
            <LicenseTermsForm
              story={licenseStory}
              onSuccess={() => setLicenseStory(null)}
            />
          </Modal>
        )}
      </AnimatePresence>

      {/* Story Viewer — fetches from 0G, decrypts private stories in-browser */}
      <AnimatePresence>
        {viewStory && (
          <StoryViewer
            story={viewStory}
            onClose={() => setViewStory(null)}
          />
        )}
      </AnimatePresence>

      {/* Certificate of Preservation */}
      <AnimatePresence>
        {certStory && selectedVault && (
          <CertificateModal
            story={certStory}
            vault={selectedVault}
            onClose={() => setCertStory(null)}
          />
        )}
      </AnimatePresence>

      {/* Access Grant Modal — private vault owner only */}
      <AnimatePresence>
        {showAccessModal && selectedVault && (
          <AccessGrantModal
            vault={selectedVault}
            onClose={() => setShowAccessModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Vault Modal
// ─────────────────────────────────────────────────────────────────────────────

function CreateVaultModal({ onClose }: { onClose: () => void }) {
  const [name,      setName]      = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const { writeContractAsync, isPending } = useWriteContract();

  const handleCreate = async () => {
    if (!name.trim()) return;
    await writeContractAsync({
      address:      LORE_VAULT_ADDRESS,
      abi:          LORE_VAULT_ABI,
      functionName: "createVault",
      // Manual gas limit bypasses eth_estimateGas which is unreliable on 0G testnet
      gas:          BigInt(200_000),
      args:         [name.trim(), isPrivate],
    });
    onClose();
  };

  return (
    <Modal onClose={onClose} title="Create a Vault">
      <div className="space-y-4">
        <div>
          <label className="text-xs text-smoke font-mono block mb-1.5">
            Vault Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Okafor Family Stories"
            maxLength={100}
            className="input-dark"
            autoFocus
          />
        </div>

        <div>
          <label className="text-xs text-smoke font-mono block mb-2">Visibility</label>
          <div className="flex gap-3">
            {[
              { value: false, label: "🌐 Public", desc: "Anyone can view stories" },
              { value: true,  label: "🔒 Private", desc: "Only you and granted addresses" },
            ].map((opt) => (
              <button
                key={String(opt.value)}
                onClick={() => setIsPrivate(opt.value)}
                className={[
                  "flex-1 p-3 rounded-sm border text-left transition-all duration-200",
                  isPrivate === opt.value
                    ? "border-brass bg-brass/5 text-parchment"
                    : "border-brass/20 text-smoke hover:border-brass/40",
                ].join(" ")}
              >
                <p className="text-sm font-mono">{opt.label}</p>
                <p className="text-xs mt-0.5 opacity-70">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleCreate}
          disabled={!name.trim() || isPending}
          className="btn-brass w-full py-2.5"
        >
          {isPending ? "Creating..." : "Create Vault"}
        </button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic Modal wrapper
// ─────────────────────────────────────────────────────────────────────────────

function Modal({
  onClose,
  title,
  children,
}: {
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(13,11,14,0.75)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md vault-glass rounded-sm p-6 shadow-vault"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-serif text-parchment text-xl">{title}</h2>
          <button
            onClick={onClose}
            className="text-smoke hover:text-aged transition-colors text-lg"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeletons
// ─────────────────────────────────────────────────────────────────────────────

function VaultListSkeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-24 rounded-sm bg-shadow/40 border border-brass/10 animate-pulse"
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </>
  );
}

function StoryListSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="h-28 rounded-sm bg-shadow/40 border border-brass/10 animate-pulse"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

function fmtDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = String(s % 60).padStart(2, "0");
  return `${m}:${sec}`;
}
