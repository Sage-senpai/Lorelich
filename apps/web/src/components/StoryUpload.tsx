"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWriteContract, useAccount } from "wagmi";
import { useUploadStore, useVaultStore } from "@/store";
import { validateFile, uploadToZeroG } from "@/lib/zerog";
import { encryptBlob, packEncryptedBlob, sha256Hex } from "@/lib/encryption";
import { LORE_VAULT_ADDRESS, LORE_VAULT_ABI } from "@/lib/contracts";
import type { MediaType, UploadStep } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// StoryUpload — two-phase upload:
//   Phase 1 (0G Storage): encrypt → upload to 0G → save locally as pending
//   Phase 2 (On-chain):   sign contract tx → register story + mint proof NFT
// Phase 2 is optional — if signing fails the story is still preserved on 0G
// ─────────────────────────────────────────────────────────────────────────────

interface StoryUploadProps {
  vaultId:    bigint;
  isPrivate:  boolean;
  onComplete?: (storyId: bigint) => void;
}

type UploadMode = "file" | "write";

/** Params carried between Phase 1 and Phase 2 (or stored for later retry). */
interface PhaseOneResult {
  localId:          string;
  rootHash:         string;
  tokenURI:         string;
  title:            string;
  mediaType:        MediaType;
  duration:         number;
  encryptedKeyHash: string;
}

const STEP_LABELS: Record<UploadStep, string> = {
  idle:          "Ready to upload",
  encrypting:    "Encrypting your story...",
  uploading_0g:  "Storing on 0G network...",
  stored_0g:     "Stored on 0G — open your wallet to register on-chain",
  confirming_tx: "Open your wallet to sign the transaction...",
  minting:       "Minting proof of ownership...",
  complete:      "Story preserved forever",
  error:         "Something went wrong",
};

/** Human-readable message for contract / wallet signing failures. */
function classifyContractError(msg: string): string {
  const low = msg.toLowerCase();
  if (low.includes("user rejected") || low.includes("rejected the request") || low.includes("user denied")) {
    return "Wallet rejected the transaction. Your story is safely stored on 0G — you can register on-chain later from the vault.";
  }
  if (
    low.includes("walletconnect") || low.includes("relay") ||
    low.includes("websocket") || low.includes("connection timeout") ||
    low.includes("failed to publish") || low.includes("transaction failed")
  ) {
    return "Wallet connection issue (WalletConnect relay). Open this site inside your wallet's built-in browser, or use a desktop extension. Your story is safely on 0G — register later.";
  }
  if (low.includes("insufficient funds") || low.includes("underpriced") || low.includes("max fee")) {
    return "Insufficient gas / fee too low. Make sure you have OG tokens for gas on the 0G testnet.";
  }
  if (low.includes("execution reverted") || low.includes("revert")) {
    const reason = msg.match(/reason: (.+?)(?:\n|$)/)?.[1] ?? msg;
    return `Contract rejected the transaction: ${reason.slice(0, 100)}`;
  }
  return msg.length > 140 ? msg.slice(0, 140) + "…" : msg;
}

/** Human-readable message for 0G upload failures. */
function classifyStorageError(msg: string): string {
  const low = msg.toLowerCase();
  if (low.includes("too large") || low.includes("size limit") || low.includes("exceeds")) {
    return "0G Storage error: file too large. Try a smaller file (< 100 MB).";
  }
  if (low.includes("timeout") || low.includes("network") || low.includes("fetch") || low.includes("failed to fetch")) {
    return "0G network unreachable. Check your internet connection and try again.";
  }
  return `0G Storage error: ${msg.slice(0, 100)}`;
}

function detectMediaType(file: File): MediaType {
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("image/")) return "image";
  return "text";
}

function getMediaDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const el = document.createElement(
      file.type.startsWith("video/") ? "video" : "audio"
    );
    const url = URL.createObjectURL(file);
    el.preload = "metadata";
    el.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(isFinite(el.duration) ? Math.round(el.duration) : 0); };
    el.onerror = () => { URL.revokeObjectURL(url); resolve(0); };
    el.src = url;
  });
}

function buildTokenURI(zgRootHash: string): string {
  return `lorelich:${zgRootHash}`;
}

export function StoryUpload({ vaultId, isPrivate, onComplete }: StoryUploadProps) {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { uploadState, setUploadState, resetUpload } = useUploadStore();
  const addPendingStory    = useVaultStore((s) => s.addPendingStory);
  const removePendingStory = useVaultStore((s) => s.removePendingStory);

  const [mode,        setMode]        = useState<UploadMode>("file");
  const [file,        setFile]        = useState<File | null>(null);
  const [storyText,   setStoryText]   = useState("");
  const [title,       setTitle]       = useState("");
  const [dragging,    setDragging]    = useState(false);
  // Holds Phase 1 result so we can retry Phase 2 without re-uploading
  const [phase1,      setPhase1]      = useState<PhaseOneResult | null>(null);
  // Soft error shown under stored_0g state (wallet signing failed)
  const [signError,   setSignError]   = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) { setFile(dropped); setMode("file"); }
  }, []);

  const switchMode = (next: UploadMode) => {
    setMode(next);
    resetUpload();
    setFile(null);
    setStoryText("");
    setPhase1(null);
    setSignError(null);
  };

  // ── Phase 2: sign contract tx ──────────────────────────────────────────────
  const handleRegisterOnChain = async (p: PhaseOneResult) => {
    if (!address) return;
    setSignError(null);
    setUploadState({ step: "confirming_tx", progress: 75 });
    try {
      setUploadState({ step: "minting", progress: 85 });
      await writeContractAsync({
        address:      LORE_VAULT_ADDRESS,
        abi:          LORE_VAULT_ABI,
        functionName: "uploadStory",
        gas:          BigInt(600_000),
        args: [{
          vaultId,
          zgRootHash:       p.rootHash,
          title:            p.title,
          mediaType:        p.mediaType,
          duration:         BigInt(p.duration),
          encryptedKeyHash: p.encryptedKeyHash,
          tokenURI:         p.tokenURI,
        }],
      });
      // Registration succeeded — remove from pending
      removePendingStory(p.localId);
      setPhase1(null);
      setUploadState({ step: "complete", progress: 100 });
      setTimeout(() => onComplete?.(0n), 2000);
    } catch (err) {
      const humanMsg = classifyContractError((err as Error).message ?? "");
      // Stay in stored_0g state — 0G data is safe, only signing failed
      setUploadState({ step: "stored_0g", progress: 70 });
      setSignError(humanMsg);
    }
  };

  // ── Phase 1 + auto Phase 2 ─────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!title.trim() || !address) return;
    if (mode === "file" && !file) return;
    if (mode === "write" && !storyText.trim()) return;
    resetUpload();
    setPhase1(null);
    setSignError(null);

    let p: PhaseOneResult;

    // ─ Phase 1: 0G storage ─────────────────────────────────────────────────
    try {
      let uploadFile: File;
      let mediaType: MediaType;

      if (mode === "write") {
        const blob = new Blob([storyText.trim()], { type: "text/plain" });
        uploadFile = new File([blob], `${title.trim().slice(0, 60)}.txt`, { type: "text/plain" });
        mediaType = "text";
      } else {
        uploadFile = file!;
        mediaType  = detectMediaType(uploadFile);
        validateFile(uploadFile, mediaType);
      }

      let duration = 0;
      if (mediaType === "audio" || mediaType === "video") {
        duration = await getMediaDuration(uploadFile);
      }

      let fileBytes: Uint8Array = new Uint8Array(await uploadFile.arrayBuffer());
      let encryptedKeyHash = "";

      if (isPrivate) {
        setUploadState({ step: "encrypting", progress: 10 });
        const encrypted = await encryptBlob(fileBytes.buffer as ArrayBuffer, address);
        const packed     = packEncryptedBlob(encrypted);
        encryptedKeyHash = await sha256Hex(`${address.toLowerCase()}:${vaultId.toString()}`);
        fileBytes        = packed;
      }

      setUploadState({ step: "uploading_0g", progress: 20 });
      const { rootHash } = await uploadToZeroG(
        fileBytes,
        uploadFile.name,
        (pct) => setUploadState({ progress: 20 + Math.floor(pct * 0.5) }),
      );

      const localId  = crypto.randomUUID();
      const tokenURI = buildTokenURI(rootHash);

      p = { localId, rootHash, tokenURI, title: title.trim(), mediaType, duration, encryptedKeyHash };
      setPhase1(p);

      // Persist to localStorage immediately — story is on 0G regardless of what happens next
      addPendingStory({
        localId,
        vaultId:         vaultId.toString(),
        zgRootHash:      rootHash,
        title:           title.trim(),
        mediaType,
        duration,
        encryptedKeyHash,
        tokenURI,
        savedAt:         Date.now(),
        uploaderAddress: address,
      });

      setUploadState({ step: "stored_0g", progress: 70 });
    } catch (err) {
      // 0G upload failed — full error, can retry from scratch
      setUploadState({
        step:     "error",
        progress: 0,
        error:    classifyStorageError((err as Error).message ?? "Unknown storage error"),
      });
      return;
    }

    // ─ Phase 2: on-chain registration ──────────────────────────────────────
    await handleRegisterOnChain(p);
  };

  const isUploading = !["idle", "complete", "error", "stored_0g"].includes(uploadState.step);
  const isStoredOnlyState = uploadState.step === "stored_0g";
  const wordCount   = storyText.trim() ? storyText.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-4">

      {/* Mode tabs */}
      <div className="flex rounded-sm border border-brass/20 overflow-hidden">
        {(["file", "write"] as UploadMode[]).map((m) => (
          <button
            key={m}
            onClick={() => !isUploading && !isStoredOnlyState && switchMode(m)}
            disabled={isUploading || isStoredOnlyState}
            className={[
              "flex-1 py-2 text-xs font-mono transition-all duration-200",
              mode === m
                ? "bg-brass/10 text-brass border-b-2 border-brass"
                : "text-smoke hover:text-aged bg-transparent",
            ].join(" ")}
          >
            {m === "file" ? "📎 Import File" : "✍ Write Story"}
          </button>
        ))}
      </div>

      {/* File / write input — hidden once stored_0g */}
      {!isStoredOnlyState && (
        <AnimatePresence mode="wait">
          {mode === "file" ? (
            <motion.div
              key="file-mode"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onClick={() => !isUploading && inputRef.current?.click()}
                className={[
                  "rounded-sm border-2 border-dashed transition-all duration-300 cursor-pointer",
                  "flex flex-col items-center justify-center py-12 px-4 text-center",
                  dragging
                    ? "border-brass bg-brass/5 scale-[1.01]"
                    : file
                    ? "border-brass/40 bg-dusk/40"
                    : "border-brass/20 bg-shadow/40 hover:border-brass/40",
                  isUploading ? "pointer-events-none opacity-60" : "",
                ].join(" ")}
                role="button"
                aria-label="Upload story file"
                tabIndex={0}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept="audio/*,video/*,text/*,image/*,.md,.json,.pdf,.docx,.rtf"
                  onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
                  className="sr-only"
                />
                {file ? (
                  <>
                    <p className="font-serif text-parchment">{file.name}</p>
                    <p className="text-xs text-smoke font-mono mt-1">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-3xl mb-2 opacity-40">📜</div>
                    <p className="text-aged font-serif">Drop your story here</p>
                    <p className="text-smoke text-xs font-mono mt-1">
                      Audio · Video · Text · Image
                    </p>
                  </>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="write-mode"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-2"
            >
              <textarea
                value={storyText}
                onChange={(e) => setStoryText(e.target.value)}
                placeholder={`Write your ancestral story here…\n\nShare a memory, a family proverb, a tradition — in your own words.`}
                disabled={isUploading}
                rows={10}
                maxLength={50_000}
                className={[
                  "w-full bg-crypt/80 border border-brass/20 rounded-sm",
                  "px-4 py-3 text-sm text-parchment placeholder-smoke/50",
                  "font-serif leading-relaxed resize-y min-h-[200px]",
                  "focus:outline-none focus:border-brass/50",
                  "disabled:opacity-50 transition-colors duration-200",
                ].join(" ")}
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-smoke/50 font-mono">
                  {wordCount} {wordCount === 1 ? "word" : "words"}
                </p>
                <p className="text-xs text-smoke/40 font-mono">
                  {storyText.length.toLocaleString()} / 50,000 chars
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Title input — hidden once stored_0g */}
      {!isStoredOnlyState && (
        <input
          type="text"
          placeholder="Story title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          disabled={isUploading}
          className={[
            "w-full bg-crypt/80 border border-brass/20 rounded-sm",
            "px-3 py-2 text-sm text-parchment placeholder-smoke",
            "font-mono focus:outline-none focus:border-brass/50",
            "disabled:opacity-50 transition-colors duration-200",
          ].join(" ")}
        />
      )}

      {/* Progress bar */}
      <AnimatePresence>
        {uploadState.step !== "idle" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {/* Step label */}
            <p className={[
              "text-xs font-mono",
              uploadState.step === "error"    ? "text-burgundy/80" :
              uploadState.step === "complete" ? "text-moss"        :
              uploadState.step === "stored_0g" && !signError ? "text-gold" :
              "text-aged",
            ].join(" ")}>
              {uploadState.error ?? STEP_LABELS[uploadState.step]}
            </p>
            {uploadState.step !== "error" && (
              <div className="h-1 bg-dusk rounded-full overflow-hidden">
                <motion.div
                  className={[
                    "h-full rounded-full",
                    uploadState.step === "stored_0g"
                      ? "bg-gradient-to-r from-gold/60 to-gold"
                      : "bg-gradient-to-r from-brass to-gold",
                  ].join(" ")}
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadState.progress}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── stored_0g partial-success panel ──────────────────────────────── */}
      <AnimatePresence>
        {isStoredOnlyState && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-sm border border-gold/20 bg-gold/5 px-4 py-3 space-y-2"
          >
            <p className="text-xs font-mono text-gold/90 font-semibold">
              ✓ Story stored on 0G network
            </p>
            <p className="text-xs font-mono text-smoke/70 leading-relaxed">
              Your file is permanently preserved on 0G. Sign the wallet transaction to register it on-chain and receive your proof of ownership.
            </p>
            {signError && (
              <p className="text-xs font-mono text-burgundy/70 leading-relaxed border-t border-burgundy/20 pt-2">
                {signError}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              {phase1 && (
                <button
                  onClick={() => handleRegisterOnChain(phase1)}
                  disabled={isUploading}
                  className="flex-1 py-1.5 px-3 rounded-sm text-xs font-mono border border-brass/40 text-brass hover:border-brass hover:bg-brass/10 transition-all duration-200 disabled:opacity-40"
                >
                  {isUploading ? "Signing..." : signError ? "Retry signing" : "Sign & register on-chain"}
                </button>
              )}
              <button
                onClick={() => {
                  // Close modal — story is in pending localStorage, visible in vault
                  onComplete?.(0n);
                }}
                className="px-3 py-1.5 rounded-sm text-xs font-mono text-smoke/60 hover:text-aged border border-smoke/20 hover:border-smoke/40 transition-colors"
              >
                Register later
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      {!isStoredOnlyState && (
        <div className="flex gap-2">
          <button
            onClick={handleUpload}
            disabled={
              !title.trim() ||
              isUploading ||
              (mode === "file"  && !file) ||
              (mode === "write" && !storyText.trim())
            }
            className={[
              "flex-1 py-2 px-4 rounded-sm text-sm font-mono",
              "border border-brass/40 hover:border-brass",
              "bg-dusk hover:bg-brass/10 text-brass",
              "transition-all duration-200",
              "disabled:opacity-30 disabled:cursor-not-allowed",
            ].join(" ")}
          >
            {isUploading ? "Preserving..." : "Preserve to Vault"}
          </button>
          {(uploadState.step === "error" || uploadState.step === "complete") && (
            <button
              onClick={() => { resetUpload(); setFile(null); setStoryText(""); setTitle(""); setPhase1(null); setSignError(null); }}
              className="px-3 py-2 rounded-sm text-xs font-mono text-smoke hover:text-aged border border-smoke/20 hover:border-smoke/40 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      )}

      {/* Private vault indicator */}
      {isPrivate && !isStoredOnlyState && (
        <p className="text-xs text-smoke font-mono text-center">
          🔒 This vault is private — your story will be encrypted before upload
        </p>
      )}
    </div>
  );
}
