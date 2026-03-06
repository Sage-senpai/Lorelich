"use client";

import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { AnimatePresence, motion } from "framer-motion";
import { LorePanel } from "./LorePanel";
import { LORE_COMIC_ADDRESS, LORE_COMIC_ABI } from "@/lib/contracts";
import type { LoreComic } from "@/types";

interface Props {
  comic:    LoreComic;
  readOnly?: boolean;
  onSave?:  () => void;
  onUpload?: () => Promise<string | null>; // returns zgRootHash or null
  onMinted?: (tokenId: string) => void;
}

export function LoreComicViewer({ comic, readOnly = false, onSave, onUpload, onMinted }: Props) {
  const { address, isConnected } = useAccount();
  const { writeContractAsync }   = useWriteContract();

  const [uploading,  setUploading]  = useState(false);
  const [minting,    setMinting]    = useState(false);
  const [shareMsg,   setShareMsg]   = useState("");
  const [statusMsg,  setStatusMsg]  = useState("");

  // ── Save to localStorage ─────────────────────────────────────────────────────

  function handleSave() {
    try {
      const raw    = localStorage.getItem("lorelich_comics");
      const comics = raw ? (JSON.parse(raw) as LoreComic[]) : [];
      const idx    = comics.findIndex((c) => c.id === comic.id);
      if (idx >= 0) comics[idx] = comic; else comics.unshift(comic);
      localStorage.setItem("lorelich_comics", JSON.stringify(comics));
      setStatusMsg("Saved to My Comics.");
      setTimeout(() => setStatusMsg(""), 3000);
    } catch {
      setStatusMsg("Save failed.");
    }
    onSave?.();
  }

  // ── Upload to 0G ─────────────────────────────────────────────────────────────

  async function handleUpload() {
    if (!onUpload) return;
    setUploading(true);
    setStatusMsg("Uploading to 0G…");
    const hash = await onUpload();
    setUploading(false);
    if (hash) {
      setStatusMsg("Uploaded. Share link ready.");
    } else {
      setStatusMsg("Upload failed — try again.");
    }
    setTimeout(() => setStatusMsg(""), 4000);
  }

  // ── Share ────────────────────────────────────────────────────────────────────

  function handleShare() {
    if (!comic.zgRootHash) { setStatusMsg("Upload first to get a share link."); return; }
    const url = `${window.location.origin}/lore/${comic.zgRootHash}`;
    navigator.clipboard.writeText(url).then(() => {
      setShareMsg("Link copied!");
      setTimeout(() => setShareMsg(""), 2500);
    });
  }

  // ── Mint NFT ─────────────────────────────────────────────────────────────────

  async function handleMint() {
    if (!comic.zgRootHash || !isConnected || !address) return;
    setMinting(true);
    setStatusMsg("Minting comic NFT…");
    try {
      const collaboratorAddresses = comic.collaborators
        .filter((a) => a !== address)
        .slice(0, 5) as `0x${string}`[];

      const uri = `data:application/json;base64,${btoa(JSON.stringify({
        name:        comic.title,
        description: comic.tagline,
        attributes:  [
          { trait_type: "Genre",    value: comic.genre  },
          { trait_type: "Theme",    value: comic.theme  },
          { trait_type: "Panels",   value: comic.panels.length },
        ],
        external_url: `${window.location.origin}/lore/${comic.zgRootHash}`,
      }))}`;

      const hash = await writeContractAsync({
        address:      LORE_COMIC_ADDRESS,
        abi:          LORE_COMIC_ABI,
        functionName: "mint",
        args:         [address, comic.zgRootHash, uri, collaboratorAddresses],
        gas:          BigInt(130_000),
      });

      setStatusMsg(`Minted! Tx: ${hash.slice(0, 10)}…`);
      // We don't have the tokenId synchronously; parent can handle onMinted via event
      onMinted?.("pending");
    } catch (err) {
      console.error("[LoreComicViewer] mint error", err);
      setStatusMsg("Mint failed. Check wallet and try again.");
    } finally {
      setMinting(false);
      setTimeout(() => setStatusMsg(""), 6000);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-serif text-2xl text-parchment leading-tight">{comic.title}</h2>
            {comic.tagline && (
              <p className="font-serif italic text-smoke/70 mt-1">{comic.tagline}</p>
            )}
          </div>
          <span className="text-xs font-mono text-brass/60 border border-brass/20 rounded px-2.5 py-1 shrink-0">
            {comic.genre}
          </span>
        </div>
        <p className="font-mono text-xs text-smoke/40">
          By {comic.createdBy ? `${comic.createdBy.slice(0, 6)}…${comic.createdBy.slice(-4)}` : "Unknown"}
          {comic.collaborators.length > 0 &&
            ` × ${comic.collaborators.map((a) => `${a.slice(0, 6)}…`).join(", ")}`}
        </p>
      </div>

      {/* ── Character strip ─────────────────────────────────────────────────── */}
      {comic.characters.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {comic.characters.map((char) => (
            <div
              key={char.id}
              className="shrink-0 vault-glass border border-brass/15 rounded px-3 py-2 min-w-[120px] max-w-[180px]"
            >
              <p className="font-mono text-xs text-parchment/90 truncate">{char.name}</p>
              {char.traits.slice(0, 3).map((t) => (
                <span key={t} className="inline-block text-[10px] text-brass/50 font-mono mr-1">
                  ·{t}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ── Panel grid ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {comic.panels.map((panel) => (
          <LorePanel key={panel.number} panel={panel} />
        ))}
      </div>

      {/* ── Theme block ─────────────────────────────────────────────────────── */}
      {comic.theme && (
        <div className="border-t border-brass/20 pt-4">
          <p className="font-serif italic text-smoke/60 text-sm">
            &ldquo;{comic.theme}&rdquo;
          </p>
        </div>
      )}

      {/* ── Action bar ──────────────────────────────────────────────────────── */}
      {!readOnly && (
        <div className="flex flex-wrap gap-2 items-center pt-2 border-t border-brass/10">
          {onSave && (
            <button onClick={handleSave} className="text-xs font-mono text-smoke/60 border border-smoke/20 rounded px-3 py-1.5 hover:border-smoke/40 hover:text-smoke/80 transition-colors">
              Save
            </button>
          )}
          {onUpload && !comic.zgRootHash && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="text-xs font-mono text-brass/70 border border-brass/25 rounded px-3 py-1.5 hover:border-brass/50 hover:text-brass transition-colors disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Upload to 0G"}
            </button>
          )}
          {comic.zgRootHash && (
            <button
              onClick={handleShare}
              className="text-xs font-mono text-moss/70 border border-moss/25 rounded px-3 py-1.5 hover:border-moss/50 hover:text-moss transition-colors"
            >
              {shareMsg || "Share Link"}
            </button>
          )}
          {comic.zgRootHash && isConnected && (
            <button
              onClick={handleMint}
              disabled={minting}
              className="btn-brass text-xs px-4 py-1.5 disabled:opacity-50"
            >
              {minting ? "Minting…" : "Mint NFT"}
            </button>
          )}
          {!comic.zgRootHash && (
            <span className="text-xs font-mono text-smoke/30">Upload to unlock Share & Mint</span>
          )}
          <AnimatePresence>
            {statusMsg && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs font-mono text-smoke/50 ml-2"
              >
                {statusMsg}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
