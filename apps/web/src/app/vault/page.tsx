"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, useWriteContract } from "wagmi";
import { useVaultStore } from "@/store";
import { useOwnerVaults, useVaultStories } from "@/hooks/useVault";
import { useVaultIncomingRequests } from "@/hooks/useIPLicense";
import { VaultCard, VaultCardEmpty } from "@/components/VaultCard";
import { StoryUpload } from "@/components/StoryUpload";
import { WaveformPreview } from "@/components/WaveformPreview";
import { LoreRichChat } from "@/components/LoreRichChat";
import { LicenseTermsForm } from "@/components/LicenseTermsForm";
import { LicenseRequestCard } from "@/components/LicenseRequestCard";
import { StoryViewer } from "@/components/StoryViewer";
import { StoryTags } from "@/components/StoryTags";
import { TranscriptButton } from "@/components/TranscriptButton";
import { AccessGrantModal } from "@/components/AccessGrantModal";
import { CertificateModal } from "@/components/CertificateModal";
import { SoulboundBadge } from "@/components/SoulboundBadge";
import { LORE_VAULT_ADDRESS, LORE_VAULT_ABI } from "@/lib/contracts";
import type { Vault, StoryMetadata, PendingStory, PublicLoreEntry } from "@/types";
import { DEMO_VAULTS, DEMO_STORY_MAP, DEMO_STORY_CONTENT, isDemoId } from "@/lib/demoData";
import { DemoBanner, DemoBadge } from "@/components/DemoBanner";

// ─────────────────────────────────────────────────────────────────────────────
// Vault Dashboard — lists vaults, shows stories, upload + LoreRich AI
// ─────────────────────────────────────────────────────────────────────────────

export default function VaultPage() {
  const { isConnected, address, status } = useAccount();
  const { vaultIds, isLoading, refetch: refetchVaults } = useOwnerVaults();
  const vaults                   = useVaultStore((s) => s.vaults);
  const selectedVaultId          = useVaultStore((s) => s.selectedVaultId);
  const stories                  = useVaultStore((s) => s.stories);
  const selectVault              = useVaultStore((s) => s.selectVault);
  const pendingStories           = useVaultStore((s) => s.pendingStories);
  const loadPendingStories       = useVaultStore((s) => s.loadPendingStories);
  const removePendingStory       = useVaultStore((s) => s.removePendingStory);

  // Load pending stories from localStorage when the wallet address is known
  useEffect(() => {
    if (address) loadPendingStories(address);
  }, [address, loadPendingStories]);

  // Load local UI overrides from localStorage on mount
  useEffect(() => {
    try {
      const n = localStorage.getItem("lorelich_vault_names");
      if (n) setLocalVaultNames(JSON.parse(n) as Record<string, string>);
      const a = localStorage.getItem("lorelich_archived_vaults");
      if (a) setArchivedVaultIds(new Set(JSON.parse(a) as string[]));
      const h = localStorage.getItem("lorelich_hidden_stories");
      if (h) setHiddenStoryIds(new Set(JSON.parse(h) as string[]));
    } catch { /* ignore corrupt data */ }
  }, []);

  function saveVaultName(id: string, name: string) {
    const next = { ...localVaultNames, [id]: name };
    setLocalVaultNames(next);
    localStorage.setItem("lorelich_vault_names", JSON.stringify(next));
  }
  function toggleArchiveVault(id: string) {
    const next = new Set(archivedVaultIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setArchivedVaultIds(next);
    localStorage.setItem("lorelich_archived_vaults", JSON.stringify([...next]));
  }
  function toggleHideStory(id: string) {
    const next = new Set(hiddenStoryIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setHiddenStoryIds(next);
    localStorage.setItem("lorelich_hidden_stories", JSON.stringify([...next]));
  }

  const { isLoading: storiesLoading, refetch: refetchStories } = useVaultStories(selectedVaultId);

  const [showCreateModal,  setShowCreateModal]  = useState(false);
  const [showUploadModal,  setShowUploadModal]  = useState(false);
  const [showChatPanel,    setShowChatPanel]    = useState(false);
  const [licenseStory,     setLicenseStory]     = useState<StoryMetadata | null>(null);
  const [viewStory,        setViewStory]        = useState<StoryMetadata | null>(null);
  const [certStory,        setCertStory]        = useState<StoryMetadata | null>(null);
  const [showAccessModal,  setShowAccessModal]  = useState(false);
  const [showIncoming,     setShowIncoming]     = useState(true);
  const [demoVaultId,      setDemoVaultId]      = useState<bigint | null>(null);
  const [nftStory,         setNftStory]         = useState<StoryMetadata | null>(null);
  const [isRenamingVault,  setIsRenamingVault]  = useState(false);
  const [renameInput,      setRenameInput]      = useState("");
  const [localVaultNames,  setLocalVaultNames]  = useState<Record<string, string>>({});
  const [archivedVaultIds, setArchivedVaultIds] = useState<Set<string>>(new Set());
  const [showArchived,     setShowArchived]     = useState(false);
  const [hiddenStoryIds,   setHiddenStoryIds]   = useState<Set<string>>(new Set());
  const [showHidden,       setShowHidden]       = useState(false);
  const [shareStory,       setShareStory]       = useState<StoryMetadata | null>(null);
  const [shareRegion,      setShareRegion]      = useState("");
  const [shareCulture,     setShareCulture]     = useState("");
  const [shareEdu,         setShareEdu]         = useState(false);

  function handleShareForLearning() {
    if (!shareStory || !selectedVault) return;
    const LS_KEY = "lorelich_public_lore";
    let existing: PublicLoreEntry[] = [];
    try { const raw = localStorage.getItem(LS_KEY); if (raw) existing = JSON.parse(raw); } catch {}
    // Remove if already shared (update)
    existing = existing.filter((e) => e.storyId !== shareStory.id.toString());
    existing.push({
      storyId:       shareStory.id.toString(),
      title:         shareStory.title,
      vaultName:     effectiveVaultName,
      mediaType:     shareStory.mediaType,
      region:        shareRegion || undefined,
      culture:       shareCulture || undefined,
      isEducational: shareEdu,
      sharedAt:      Date.now(),
    });
    localStorage.setItem(LS_KEY, JSON.stringify(existing));
    setShareStory(null);
    setShareRegion("");
    setShareCulture("");
    setShareEdu(false);
  }

  // When a demo vault is active, pull data locally; otherwise use on-chain store
  const isDemoActive    = demoVaultId !== null;
  const selectedVault   = isDemoActive
    ? (DEMO_VAULTS.find((v) => v.id === demoVaultId) ?? null)
    : (vaults.find((v) => v.id === selectedVaultId) ?? null);
  const selectedStories = isDemoActive
    ? (DEMO_STORY_MAP[demoVaultId!.toString()] ?? [])
    : (selectedVaultId !== null ? (stories[selectedVaultId.toString()] ?? []) : []);

  // Pending stories: 0G-stored but not yet registered on-chain
  const selectedPending: PendingStory[] = isDemoActive || selectedVaultId === null
    ? []
    : (pendingStories[selectedVaultId.toString()] ?? []);

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

  // Local-override derived values
  const visibleVaults      = vaults.filter((v) => showArchived || !archivedVaultIds.has(v.id.toString()));
  const archivedCount      = vaults.filter((v) =>  archivedVaultIds.has(v.id.toString())).length;
  const visibleStories     = showHidden ? selectedStories : selectedStories.filter((s) => !hiddenStoryIds.has(s.id.toString()));
  const hiddenCount        = selectedStories.filter((s) =>  hiddenStoryIds.has(s.id.toString())).length;
  const effectiveVaultName = selectedVault ? (localVaultNames[selectedVault.id.toString()] ?? selectedVault.name) : "";

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
            visibleVaults.map((v, i) => (
              <div key={v.id.toString()} className="relative group">
                <VaultCard
                  vault={{ ...v, name: localVaultNames[v.id.toString()] ?? v.name }}
                  index={i}
                  onClick={() => {
                    selectVault(v.id);
                    setDemoVaultId(null);
                    setShowChatPanel(false);
                  }}
                />
                <button
                  onClick={(e) => { e.stopPropagation(); toggleArchiveVault(v.id.toString()); }}
                  title="Archive vault (local only — hides from sidebar)"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity
                    text-[11px] text-smoke/30 hover:text-burgundy/60 leading-none z-10 px-1"
                >
                  ⊗
                </button>
              </div>
            ))
          )}

          {archivedCount > 0 && (
            <button
              onClick={() => setShowArchived((p) => !p)}
              className="text-[10px] font-mono text-smoke/30 hover:text-smoke/60 transition-colors mt-1 w-full text-center"
            >
              {showArchived ? "▲ Hide archived" : `▼ ${archivedCount} archived vault${archivedCount === 1 ? "" : "s"}`}
            </button>
          )}

          {/* Demo vaults — always visible */}
          <div className="pt-3 border-t border-brass/10">
            <p className="text-[9px] font-mono text-smoke/30 uppercase tracking-widest mb-2 px-1">
              Sample Vaults
            </p>
            {DEMO_VAULTS.map((dv) => (
              <button
                key={dv.id.toString()}
                onClick={() => {
                  setDemoVaultId(dv.id);
                  selectVault(null);
                  setShowChatPanel(false);
                }}
                className={[
                  "w-full text-left px-3 py-2.5 rounded-sm border mb-2",
                  "transition-all duration-200",
                  demoVaultId === dv.id
                    ? "border-brass/40 bg-brass/5 text-parchment"
                    : "border-brass/10 bg-shadow/20 text-smoke/60 hover:border-brass/25 hover:text-smoke",
                ].join(" ")}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-serif truncate">{dv.name}</p>
                  <DemoBadge />
                </div>
                <p className="text-[10px] font-mono text-smoke/30 mt-0.5">
                  {DEMO_STORY_MAP[dv.id.toString()]?.length ?? 0} stories
                </p>
              </button>
            ))}
          </div>
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
              {/* Demo disclaimer */}
              {isDemoActive && <DemoBanner />}

              {/* Vault header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  {isRenamingVault ? (
                    <div className="flex items-center gap-2 mb-0.5">
                      <input
                        type="text"
                        value={renameInput}
                        onChange={(e) => setRenameInput(e.target.value)}
                        maxLength={100}
                        className="input-dark text-base font-serif py-0.5 w-44"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter")  { saveVaultName(selectedVault.id.toString(), renameInput.trim() || selectedVault.name); setIsRenamingVault(false); }
                          if (e.key === "Escape") { setIsRenamingVault(false); }
                        }}
                      />
                      <button
                        onClick={() => { saveVaultName(selectedVault.id.toString(), renameInput.trim() || selectedVault.name); setIsRenamingVault(false); }}
                        className="text-xs font-mono text-moss hover:text-moss/70 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setIsRenamingVault(false)}
                        className="text-xs font-mono text-smoke/50 hover:text-smoke transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group/rename">
                      <h2 className="font-serif text-parchment text-2xl">{effectiveVaultName}</h2>
                      {!isDemoActive && selectedVault.owner.toLowerCase() === address?.toLowerCase() && (
                        <button
                          onClick={() => { setRenameInput(effectiveVaultName); setIsRenamingVault(true); }}
                          className="opacity-0 group-hover/rename:opacity-100 transition-opacity
                            text-smoke/30 hover:text-aged text-xs font-mono"
                          title="Rename vault (local only)"
                        >
                          ✏
                        </button>
                      )}
                    </div>
                  )}
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
                    🕯 LoreRich
                  </button>
                  {/* Only vault owner can upload — prevents NotVaultOwner revert */}
                  {!isDemoActive && selectedVault.owner.toLowerCase() === address?.toLowerCase() && (
                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="btn-brass text-xs"
                    >
                      + Upload Story
                    </button>
                  )}
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

                  {/* Pending stories — stored on 0G but not yet registered on-chain */}
                  {selectedPending.length > 0 && (
                    <div className="mb-4 space-y-2">
                      <p className="text-[9px] font-mono text-gold/50 uppercase tracking-widest px-1">
                        Pending On-Chain Registration
                      </p>
                      {selectedPending.map((p) => (
                        <PendingStoryCard
                          key={p.localId}
                          pending={p}
                          vaultId={selectedVaultId!}
                          onRegistered={() => {
                            removePendingStory(p.localId);
                            setTimeout(() => refetchStories(), 3000);
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {storiesLoading ? (
                    <StoryListSkeleton />
                  ) : selectedStories.length === 0 && selectedPending.length === 0 ? (
                    <div className="py-16 text-center">
                      <p className="font-serif text-aged">No stories yet</p>
                      <p className="text-smoke text-xs font-mono mt-1">
                        Upload the first story to this vault.
                      </p>
                    </div>
                  ) : selectedStories.length > 0 ? (
                    <div className="space-y-3">
                      {visibleStories.length === 0 && hiddenCount > 0 && (
                        <p className="text-sm font-serif text-smoke/40 text-center py-10">
                          {hiddenCount} {hiddenCount === 1 ? "story" : "stories"} hidden ·{" "}
                          <button
                            onClick={() => setShowHidden(true)}
                            className="text-aged hover:text-brass transition-colors"
                          >
                            Show
                          </button>
                        </p>
                      )}
                      {visibleStories.map((story) => (
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
                              {/* View story — always enabled for real stories; demo only if content override exists */}
                              {(!isDemoActive || DEMO_STORY_CONTENT[story.id.toString()]) && (
                                <button
                                  onClick={() => setViewStory(story)}
                                  className="text-xs font-mono px-2 py-0.5 rounded-sm border border-smoke/25 text-smoke/70
                                    hover:border-aged/60 hover:text-aged transition-colors"
                                >
                                  View
                                </button>
                              )}
                              {/* Share link — disabled for demo */}
                              {!isDemoActive && (
                                <a
                                  href={`/story/${story.id}`}
                                  className="text-xs font-mono px-2 py-0.5 rounded-sm border border-smoke/20 text-smoke/50
                                    hover:border-smoke/40 hover:text-aged transition-colors"
                                >
                                  Share
                                </a>
                              )}
                              {/* Soulbound NFT — disabled for demo */}
                              {!isDemoActive && (
                                <button
                                  onClick={() => setNftStory(story)}
                                  className="text-xs font-mono px-2 py-0.5 rounded-sm border border-brass/20 text-smoke/50
                                    hover:border-brass/40 hover:text-aged transition-colors"
                                >
                                  🪙 NFT
                                </button>
                              )}
                              {/* License terms button — disabled for demo */}
                              {!isDemoActive && (
                                <button
                                  onClick={() => setLicenseStory(story)}
                                  className="text-xs font-mono px-2 py-0.5 rounded-sm border border-brass/25 text-aged/80
                                    hover:border-brass/60 hover:text-brass transition-colors"
                                >
                                  🔑 License
                                </button>
                              )}
                              {/* Share for Learning — vault owner only, not demo */}
                              {!isDemoActive && selectedVault?.owner.toLowerCase() === address?.toLowerCase() && (
                                <button
                                  onClick={() => setShareStory(story)}
                                  className="text-xs font-mono px-2 py-0.5 rounded-sm border border-moss/25 text-moss/70
                                    hover:border-moss/60 hover:text-moss transition-colors"
                                >
                                  📚 Learn
                                </button>
                              )}
                              {/* Certificate of Preservation — works for demo too */}
                              <button
                                onClick={() => setCertStory(story)}
                                className="text-xs font-mono px-2 py-0.5 rounded-sm border border-smoke/20 text-smoke/40
                                  hover:border-aged/40 hover:text-aged transition-colors"
                              >
                                📜 Cert
                              </button>
                              {/* Storage badge */}
                              <span className={[
                                "text-xs font-mono px-2 py-0.5 rounded-sm border",
                                isDemoActive
                                  ? "text-brass/40 border-brass/20"
                                  : "text-moss border-moss/30",
                              ].join(" ")}>
                                {isDemoActive ? "DEMO" : "✓ 0G"}
                              </span>
                              {/* Hide story (local only) — disabled for demo */}
                              {!isDemoActive && (
                                <button
                                  onClick={() => toggleHideStory(story.id.toString())}
                                  title="Hide story from list (local only)"
                                  className="text-xs font-mono px-2 py-0.5 rounded-sm border border-smoke/10
                                    text-smoke/25 hover:border-burgundy/30 hover:text-burgundy/60 transition-colors"
                                >
                                  {hiddenStoryIds.has(story.id.toString()) ? "Show" : "Hide"}
                                </button>
                              )}
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
                      {!isDemoActive && hiddenCount > 0 && visibleStories.length > 0 && (
                        <div className="text-center mt-1">
                          <button
                            onClick={() => setShowHidden((p) => !p)}
                            className="text-[10px] font-mono text-smoke/30 hover:text-smoke/60 transition-colors"
                          >
                            {showHidden
                              ? `▲ Collapse ${hiddenCount} hidden`
                              : `▼ Show ${hiddenCount} hidden ${hiddenCount === 1 ? "story" : "stories"}`}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>

                {/* LoreRich chat panel */}
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
                      <LoreRichChat />
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
          <CreateVaultModal
            onClose={() => setShowCreateModal(false)}
            onCreated={() => setTimeout(() => refetchVaults(), 3000)}
          />
        )}
      </AnimatePresence>

      {/* Upload Story Modal */}
      <AnimatePresence>
        {showUploadModal && selectedVault && (
          <Modal onClose={() => setShowUploadModal(false)} title="Upload a Story">
            <StoryUpload
              vaultId={selectedVault.id}
              isPrivate={selectedVault.isPrivate}
              onComplete={() => {
                setShowUploadModal(false);
                // Refetch story list after the tx lands on-chain (~3s buffer)
                setTimeout(() => refetchStories(), 3000);
              }}
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

      {/* Story Viewer — fetches from 0G, decrypts private stories in-browser; demo stories use contentOverride */}
      <AnimatePresence>
        {viewStory && (
          <StoryViewer
            story={viewStory}
            onClose={() => setViewStory(null)}
            contentOverride={
              isDemoId(viewStory.id) && DEMO_STORY_CONTENT[viewStory.id.toString()]
                ? { kind: "text", text: DEMO_STORY_CONTENT[viewStory.id.toString()] }
                : undefined
            }
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

      {/* Soulbound NFT Badge */}
      <AnimatePresence>
        {nftStory && (
          <SoulboundBadge
            story={nftStory}
            onClose={() => setNftStory(null)}
          />
        )}
      </AnimatePresence>

      {/* Share for Learning Modal */}
      <AnimatePresence>
        {shareStory && (
          <Modal onClose={() => setShareStory(null)} title="Share for Learning">
            <div className="space-y-4">
              <p className="text-xs text-smoke/60 font-mono">
                Share &ldquo;{shareStory.title}&rdquo; on the public Learn page so others
                can discover cultural stories from this vault.
              </p>
              <div>
                <label className="text-[10px] font-mono text-smoke/50 uppercase tracking-wider block mb-1">Region</label>
                <select
                  value={shareRegion}
                  onChange={(e) => setShareRegion(e.target.value)}
                  className="input-dark text-xs w-full"
                >
                  <option value="">— Select region —</option>
                  {["West Africa","East Africa","South Asia","East Asia","Middle East","Caribbean","Latin America","Pacific Islands"].map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-mono text-smoke/50 uppercase tracking-wider block mb-1">Culture / Tradition</label>
                <input
                  type="text"
                  value={shareCulture}
                  onChange={(e) => setShareCulture(e.target.value)}
                  placeholder="e.g. Yoruba, Tamil, Quechua…"
                  maxLength={100}
                  className="input-dark text-xs w-full"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shareEdu}
                  onChange={(e) => setShareEdu(e.target.checked)}
                  className="accent-brass"
                />
                <span className="text-xs font-mono text-smoke/60">Mark as educational content</span>
              </label>
              <button onClick={handleShareForLearning} className="btn-brass w-full text-sm">
                Share for Learning
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pending Story Card — 0G-stored, awaiting on-chain registration
// ─────────────────────────────────────────────────────────────────────────────

function PendingStoryCard({
  pending,
  vaultId,
  onRegistered,
}: {
  pending:      PendingStory;
  vaultId:      bigint;
  onRegistered: () => void;
}) {
  const { writeContractAsync } = useWriteContract();
  const [state,    setState]    = useState<"idle" | "signing" | "error">("idle");
  const [errMsg,   setErrMsg]   = useState<string | null>(null);

  const handleRegister = async () => {
    setState("signing");
    setErrMsg(null);
    try {
      await writeContractAsync({
        address:      LORE_VAULT_ADDRESS,
        abi:          LORE_VAULT_ABI,
        functionName: "uploadStory",
        gas:          BigInt(600_000),
        args: [{
          vaultId,
          zgRootHash:       pending.zgRootHash,
          title:            pending.title,
          mediaType:        pending.mediaType,
          duration:         BigInt(pending.duration),
          encryptedKeyHash: pending.encryptedKeyHash,
          tokenURI:         pending.tokenURI,
        }],
      });
      onRegistered();
    } catch (err) {
      const msg = (err as Error).message ?? "";
      const low = msg.toLowerCase();
      const human =
        low.includes("user rejected") || low.includes("user denied")
          ? "Wallet rejected."
          : low.includes("notvaultowner") || low.includes("not vault owner")
          ? "Wrong wallet — you're not the owner of this vault. Connect the wallet that created it."
          : low.includes("vaultnotfound") || low.includes("vault not found")
          ? "Vault not found on-chain. It may not have been created yet."
          : low.includes("walletconnect") || low.includes("relay") || low.includes("websocket") ||
            low.includes("transaction failed")
          ? "Transaction failed. Try again."
          : low.includes("insufficient funds")
          ? "Insufficient OG tokens for gas."
          : msg.length > 120 ? msg.slice(0, 120) + "…" : msg;
      setErrMsg(human);
      setState("error");
    }
  };

  return (
    <div className="rounded-sm border border-gold/20 bg-gold/5 px-3 py-2.5 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-serif text-sm text-parchment/90 truncate">{pending.title}</p>
          <p className="text-[10px] font-mono text-smoke/50 mt-0.5">
            {pending.mediaType}
            {" · "}
            {new Date(pending.savedAt).toLocaleDateString()}
            {" · "}
            <span className="text-gold/60">✓ stored on 0G</span>
          </p>
        </div>
        <button
          onClick={handleRegister}
          disabled={state === "signing"}
          className="shrink-0 px-2.5 py-1 rounded-sm text-[11px] font-mono border border-brass/40 text-brass
            hover:border-brass hover:bg-brass/10 transition-all duration-200 disabled:opacity-40"
        >
          {state === "signing" ? "Signing…" : "Register on-chain"}
        </button>
      </div>
      {errMsg && (
        <p className="text-[10px] font-mono text-burgundy/70 leading-relaxed">{errMsg}</p>
      )}
      <p className="text-[10px] font-mono text-smoke/30 truncate">{pending.zgRootHash}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Vault Modal
// ─────────────────────────────────────────────────────────────────────────────

function CreateVaultModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated?: () => void;
}) {
  const [name,      setName]      = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [txState,   setTxState]   = useState<"idle" | "pending" | "sent" | "error">("idle");
  const [txError,   setTxError]   = useState<string | null>(null);
  const [txHash,    setTxHash]    = useState<string | null>(null);
  const { writeContractAsync } = useWriteContract();

  const handleCreate = async () => {
    if (!name.trim()) return;
    setTxError(null);
    setTxHash(null);
    setTxState("pending");
    try {
      const hash = await writeContractAsync({
        address:      LORE_VAULT_ADDRESS,
        abi:          LORE_VAULT_ABI,
        functionName: "createVault",
        // Manual gas limit — bypasses eth_estimateGas which is unreliable on 0G testnet
        gas:          BigInt(350_000),
        args:         [name.trim(), isPrivate],
      });
      setTxHash(hash);
      setTxState("sent");
      onCreated?.();
      // Auto-close after 4 s so user can see the success message + tx hash
      setTimeout(onClose, 4000);
    } catch (err) {
      const msg = (err as Error).message ?? "";
      const low = msg.toLowerCase();
      const isUserRejection =
        low.includes("user rejected") || low.includes("user denied") || low.includes("rejected the request");
      const isMaybeRelayDrop =
        low.includes("walletconnect") || low.includes("relay") || low.includes("websocket") ||
        low.includes("connection timeout") || low.includes("failed to publish") ||
        low.includes("transaction failed");

      setTxState("error");
      setTxError(
        isUserRejection
          ? "Transaction rejected in wallet."
          : isMaybeRelayDrop
          ? "Wallet connection issue. Your transaction may still have been submitted — check your vault list in a few seconds. If it doesn't appear, try again using your wallet's built-in browser (OKX → Browser tab)."
          : low.includes("insufficient funds") || low.includes("underpriced")
          ? "Insufficient OG tokens for gas. Make sure you have testnet OG on the 0G Galileo network (chain ID 16602)."
          : low.includes("execution reverted") || low.includes("revert")
          ? `Contract rejected: ${msg.match(/reason: (.+?)(?:\n|$)/)?.[1]?.slice(0, 100) ?? "check your inputs"}`
          : msg.length > 160 ? msg.slice(0, 160) + "…" : msg,
      );

      // If this was NOT a user rejection, the tx may have been broadcast despite the relay error.
      // Trigger a background vault list refresh — the vault may appear even though we got an error.
      if (!isUserRejection) {
        onCreated?.();
      }
    }
  };

  const explorerBase = "https://chainscan-galileo.0g.ai";

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
            disabled={txState === "pending" || txState === "sent"}
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
                disabled={txState === "pending" || txState === "sent"}
                className={[
                  "flex-1 p-3 rounded-sm border text-left transition-all duration-200",
                  isPrivate === opt.value
                    ? "border-brass bg-brass/5 text-parchment"
                    : "border-brass/20 text-smoke hover:border-brass/40",
                  txState === "pending" || txState === "sent" ? "opacity-50 pointer-events-none" : "",
                ].join(" ")}
              >
                <p className="text-sm font-mono">{opt.label}</p>
                <p className="text-xs mt-0.5 opacity-70">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Success */}
        {txState === "sent" && txHash && (
          <div className="rounded-sm border border-moss/30 bg-moss/5 px-3 py-2.5 space-y-1">
            <p className="text-xs font-mono text-moss">✓ Vault creation submitted</p>
            <p className="text-[10px] font-mono text-smoke/60">Your vault will appear shortly. Transaction:</p>
            <a
              href={`${explorerBase}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-mono text-brass/70 hover:text-brass underline break-all"
            >
              {txHash.slice(0, 20)}…{txHash.slice(-8)}
            </a>
          </div>
        )}

        {/* Error */}
        {txError && (
          <p className="text-xs font-mono text-burgundy/80 border border-burgundy/30 rounded-sm px-3 py-2 leading-relaxed">
            {txError}
          </p>
        )}

        <button
          onClick={handleCreate}
          disabled={!name.trim() || txState === "pending" || txState === "sent"}
          className="btn-brass w-full py-2.5"
        >
          {txState === "pending" ? "Open wallet to sign…" : txState === "sent" ? "Submitted ✓" : "Create Vault"}
        </button>

        {txState === "error" && (
          <button
            onClick={() => { setTxState("idle"); setTxError(null); }}
            className="w-full py-1.5 text-xs font-mono text-smoke/60 hover:text-aged transition-colors"
          >
            Try again
          </button>
        )}

        {/* Mobile wallet tip */}
        {txState === "idle" && (
          <p className="text-[10px] font-mono text-smoke/35 text-center leading-relaxed">
            On mobile? For best results open this page inside your wallet&apos;s browser
            (OKX → Browser tab · MetaMask → Browser).
          </p>
        )}
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
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ background: "rgba(13,11,14,0.75)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="flex min-h-full items-center justify-center p-3 sm:p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md vault-glass rounded-sm p-4 sm:p-6 shadow-vault"
        >
          <div className="flex items-center justify-between mb-4 sm:mb-5">
            <h2 className="font-serif text-parchment text-lg sm:text-xl">{title}</h2>
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
      </div>
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
