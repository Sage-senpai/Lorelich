"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWriteContract, useAccount } from "wagmi";
import { useUploadStore } from "@/store";
import { validateFile, uploadToZeroG } from "@/lib/zerog";
import { encryptBlob, packEncryptedBlob, sha256Hex } from "@/lib/encryption";
import { LORE_VAULT_ADDRESS, LORE_VAULT_ABI } from "@/lib/contracts";
import type { MediaType, UploadStep } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// StoryUpload — Full upload flow: select/write → (encrypt) → 0G → contract → mint
// Two modes: "file" (import a file) and "write" (compose text in-browser)
// ─────────────────────────────────────────────────────────────────────────────

interface StoryUploadProps {
  vaultId:    bigint;
  isPrivate:  boolean;
  onComplete?: (storyId: bigint) => void;
}

type UploadMode = "file" | "write";

const STEP_LABELS: Record<UploadStep, string> = {
  idle:          "Ready to upload",
  encrypting:    "Encrypting your story...",
  uploading_0g:  "Storing on 0G network...",
  confirming_tx: "Confirming on-chain...",
  minting:       "Minting soulbound token...",
  complete:      "Story preserved forever",
  error:         "Something went wrong",
};

function detectMediaType(file: File): MediaType {
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("image/")) return "image";
  return "text";
}

/** Get audio/video duration in seconds using an HTMLMediaElement. */
function getMediaDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const el = document.createElement(
      file.type.startsWith("video/") ? "video" : "audio"
    );
    const url = URL.createObjectURL(file);
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(isFinite(el.duration) ? Math.round(el.duration) : 0);
    };
    el.onerror = () => { URL.revokeObjectURL(url); resolve(0); };
    el.src = url;
  });
}

/**
 * Build the soulbound token URI.
 * Kept intentionally short (just the 0G root hash) to minimise calldata and
 * avoid WalletConnect relay size limits. Full metadata is derived from
 * on-chain story data by the front-end.
 */
function buildTokenURI(params: {
  zgRootHash: string;
}): string {
  // Compact URI: just the verifiable 0G merkle root — unique per story,
  // no large base64 blob in the transaction.
  return `lorelich:${params.zgRootHash}`;
}

export function StoryUpload({ vaultId, isPrivate, onComplete }: StoryUploadProps) {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { uploadState, setUploadState, resetUpload } = useUploadStore();

  const [mode,     setMode]     = useState<UploadMode>("file");
  const [file,     setFile]     = useState<File | null>(null);
  const [storyText, setStoryText] = useState("");
  const [title,    setTitle]    = useState("");
  const [dragging, setDragging] = useState(false);
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
  };

  const handleUpload = async () => {
    if (!title.trim() || !address) return;
    if (mode === "file" && !file) return;
    if (mode === "write" && !storyText.trim()) return;
    resetUpload();

    try {
      let uploadFile: File;
      let mediaType: MediaType;

      if (mode === "write") {
        // Convert written text to a plain-text File
        const blob = new Blob([storyText.trim()], { type: "text/plain" });
        uploadFile = new File([blob], `${title.trim().slice(0, 60)}.txt`, { type: "text/plain" });
        mediaType = "text";
      } else {
        uploadFile = file!;
        mediaType  = detectMediaType(uploadFile);
        validateFile(uploadFile, mediaType);
      }

      // Detect duration for audio/video
      let duration = 0;
      if (mediaType === "audio" || mediaType === "video") {
        duration = await getMediaDuration(uploadFile);
      }

      let fileBytes: Uint8Array = new Uint8Array(await uploadFile.arrayBuffer());
      let encryptedKeyHash = "";

      // Step 1: Encrypt if private vault
      if (isPrivate) {
        setUploadState({ step: "encrypting", progress: 10 });
        const encrypted = await encryptBlob(fileBytes.buffer as ArrayBuffer, address);
        const packed     = packEncryptedBlob(encrypted);
        // Hash of (address + vaultId) — stable identifier for key verification
        encryptedKeyHash = await sha256Hex(`${address.toLowerCase()}:${vaultId.toString()}`);
        fileBytes        = packed;
      }

      // Step 2: Upload to 0G
      setUploadState({ step: "uploading_0g", progress: 20 });
      const { rootHash } = await uploadToZeroG(
        fileBytes,
        uploadFile.name,
        (pct) => setUploadState({ progress: 20 + Math.floor(pct * 0.5) })
      );

      // Step 3: Build token metadata URI (data URI — no IPFS dependency)
      const tokenURI = buildTokenURI({ zgRootHash: rootHash });

      // Step 4: Write to contract (uploadStory triggers soulbound mint internally)
      setUploadState({ step: "confirming_tx", progress: 75, zgRootHash: rootHash });
      setUploadState({ step: "minting", progress: 85 });

      await writeContractAsync({
        address:      LORE_VAULT_ADDRESS,
        abi:          LORE_VAULT_ABI,
        functionName: "uploadStory",
        // Manual gas limit bypasses eth_estimateGas which is unreliable on 0G testnet
        gas:          BigInt(600_000),
        args: [{
          vaultId,
          zgRootHash:       rootHash,
          title:            title.trim(),
          mediaType,
          duration:         BigInt(duration),
          encryptedKeyHash,
          tokenURI,
        }],
      });

      setUploadState({ step: "complete", progress: 100 });
      onComplete?.(0n); // storyId not returned from writeContract
    } catch (err) {
      const msg = (err as Error).message ?? "";
      // WalletConnect relay failures surface as "Transaction failed" or "Failed to publish"
      const isRelayError =
        msg.includes("Transaction failed") ||
        msg.includes("Failed to publish") ||
        msg.includes("Connection timeout") ||
        msg.includes("WebSocket");
      setUploadState({
        step:  "error",
        progress: 0,
        error: isRelayError
          ? "WalletConnect relay failed. Open this site inside the MetaMask mobile browser, or connect MetaMask extension on desktop."
          : msg,
      });
    }
  };

  const isUploading = !["idle", "complete", "error"].includes(uploadState.step);
  const wordCount   = storyText.trim() ? storyText.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-4">

      {/* Mode tabs */}
      <div className="flex rounded-sm border border-brass/20 overflow-hidden">
        {(["file", "write"] as UploadMode[]).map((m) => (
          <button
            key={m}
            onClick={() => !isUploading && switchMode(m)}
            disabled={isUploading}
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

      {/* File mode — drop zone */}
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
                accept="audio/*,video/*,text/*,image/*,.md,.json"
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
          /* Write mode — textarea */
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
              placeholder={`Write your ancestral story here…\n\nShare a memory, a family proverb, a tradition — in your own words. This text will be preserved exactly as you write it.`}
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

      {/* Title input */}
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

      {/* Progress */}
      <AnimatePresence>
        {uploadState.step !== "idle" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <p className={[
              "text-xs font-mono",
              uploadState.step === "error"    ? "text-burgundy/80" :
              uploadState.step === "complete" ? "text-moss"        : "text-aged",
            ].join(" ")}>
              {uploadState.error ?? STEP_LABELS[uploadState.step]}
            </p>
            {uploadState.step !== "error" && (
              <div className="h-1 bg-dusk rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-brass to-gold rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadState.progress}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
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
            onClick={() => { resetUpload(); setFile(null); setStoryText(""); setTitle(""); }}
            className="px-3 py-2 rounded-sm text-xs font-mono text-smoke hover:text-aged border border-smoke/20 hover:border-smoke/40 transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {/* Private vault indicator */}
      {isPrivate && (
        <p className="text-xs text-smoke font-mono text-center">
          🔒 This vault is private — your story will be encrypted before upload
        </p>
      )}
    </div>
  );
}
