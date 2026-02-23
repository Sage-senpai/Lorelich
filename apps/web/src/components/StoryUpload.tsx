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
// StoryUpload — Full upload flow: select → (encrypt) → 0G → contract → mint
// ─────────────────────────────────────────────────────────────────────────────

interface StoryUploadProps {
  vaultId:   bigint;
  isPrivate: boolean;
  onComplete?: (storyId: bigint) => void;
}

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

export function StoryUpload({ vaultId, isPrivate, onComplete }: StoryUploadProps) {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { uploadState, setUploadState, resetUpload } = useUploadStore();

  const [file,  setFile]  = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }, []);

  const handleUpload = async () => {
    if (!file || !title.trim() || !address) return;
    resetUpload();

    try {
      const mediaType = detectMediaType(file);
      validateFile(file, mediaType);

      let fileBytes: Uint8Array = new Uint8Array(await file.arrayBuffer());
      let encryptedKeyHash = "";

      // Step 1: Encrypt if private vault
      if (isPrivate) {
        setUploadState({ step: "encrypting", progress: 10 });
        const encrypted = await encryptBlob(fileBytes.buffer as ArrayBuffer, address);
        const packed     = packEncryptedBlob(encrypted);
        encryptedKeyHash = await sha256Hex(`${address}:${vaultId}:${title}`);
        fileBytes        = packed;
      }

      // Step 2: Upload to 0G
      setUploadState({ step: "uploading_0g", progress: 20 });
      const { rootHash } = await uploadToZeroG(
        fileBytes,
        file.name,
        (pct) => setUploadState({ progress: 20 + Math.floor(pct * 0.5) })
      );

      // Step 3: Write to contract
      setUploadState({ step: "confirming_tx", progress: 75, zgRootHash: rootHash });
      const duration = mediaType === "text" || mediaType === "image" ? 0 : 0;

      setUploadState({ step: "minting", progress: 85 });
      await writeContractAsync({
        address: LORE_VAULT_ADDRESS,
        abi:     LORE_VAULT_ABI,
        functionName: "uploadStory",
        args: [{
          vaultId,
          zgRootHash:       rootHash,
          title:            title.trim(),
          mediaType,
          duration:         BigInt(duration),
          encryptedKeyHash,
          tokenURI:         `ipfs://pending-${rootHash.slice(0, 8)}`,
        }],
      });

      setUploadState({ step: "complete", progress: 100 });
    } catch (err) {
      setUploadState({
        step:     "error",
        progress: 0,
        error:    (err as Error).message,
      });
    }
  };

  const isUploading = !["idle", "complete", "error"].includes(uploadState.step);

  return (
    <div className="space-y-4">
      {/* Drop zone */}
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
              Audio, video, text, or image
            </p>
          </>
        )}
      </div>

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
          disabled={!file || !title.trim() || isUploading}
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
            onClick={() => { resetUpload(); setFile(null); setTitle(""); }}
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
