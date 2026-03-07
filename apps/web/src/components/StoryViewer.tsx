"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";
import { decryptBlob, unpackEncryptedBlob } from "@/lib/encryption";
import { useLoreRichStore } from "@/store";
import type { StoryMetadata } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// StoryViewer — modal that downloads a story from 0G Storage and renders it.
//
// Flow:
//   1. GET /api/download?rootHash=... → raw bytes (encrypted or plain)
//   2. If private vault: unpack + decrypt via Web Crypto using wallet address
//   3. Render: text scroll | <img> | <audio> | download-only fallback
// ─────────────────────────────────────────────────────────────────────────────

interface StoryViewerProps {
  story:           StoryMetadata;
  onClose:         () => void;
  /** Bypass 0G download and show this content directly (used for demo data). */
  contentOverride?: { kind: "text"; text: string };
}

type ViewState =
  | { status: "loading"    }
  | { status: "decrypting" }
  | { status: "ready";  content: ContentView }
  | { status: "error";  message: string };

type ContentView =
  | { kind: "text";   text: string }
  | { kind: "image";  url: string  }
  | { kind: "audio";  url: string  }
  | { kind: "binary"; url: string; sizeKB: number };

export function StoryViewer({ story, onClose, contentOverride }: StoryViewerProps) {
  const { address } = useAccount();
  const [state, setState] = useState<ViewState>({ status: "loading" });
  const blobUrlRef = useRef<string | null>(null);
  const setContextStory = useLoreRichStore((s) => s.setContextStory);

  useEffect(() => {
    // If demo content is provided, skip the 0G download entirely
    if (contentOverride) {
      setState({ status: "ready", content: contentOverride });
      setContextStory(story, contentOverride.text);
      return;
    }

    let cancelled = false;

    async function load() {
      setState({ status: "loading" });
      try {
        const res = await fetch(
          `/api/download?rootHash=${encodeURIComponent(story.zgRootHash)}`
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }

        let bytes = new Uint8Array(await res.arrayBuffer());

        if (story.isPrivate) {
          if (!address) throw new Error("Connect your wallet to decrypt this story.");
          setState({ status: "decrypting" });
          const encrypted = unpackEncryptedBlob(bytes);
          const decrypted = await decryptBlob(encrypted, address);
          bytes = new Uint8Array(decrypted);
        }

        if (cancelled) return;

        let content: ContentView;
        const mt = story.mediaType;

        if (mt === "text") {
          const decoded = new TextDecoder().decode(bytes);
          content = { kind: "text", text: decoded };
          setContextStory(story, decoded);
        } else if (mt === "image") {
          const blob = new Blob([bytes]);
          const url  = URL.createObjectURL(blob);
          blobUrlRef.current = url;
          content = { kind: "image", url };
          setContextStory(story);
        } else if (mt === "audio") {
          const blob = new Blob([bytes]);
          const url  = URL.createObjectURL(blob);
          blobUrlRef.current = url;
          content = { kind: "audio", url };
          setContextStory(story);
        } else {
          const blob = new Blob([bytes]);
          const url  = URL.createObjectURL(blob);
          blobUrlRef.current = url;
          content = { kind: "binary", url, sizeKB: Math.ceil(bytes.length / 1024) };
          setContextStory(story);
        }

        setState({ status: "ready", content });
      } catch (err) {
        if (!cancelled) setState({ status: "error", message: (err as Error).message });
      }
    }

    load();
    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story.zgRootHash, story.isPrivate, story.mediaType, address, contentOverride]);

  return (
    <AnimatePresence>
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
          className="w-full max-w-2xl vault-glass rounded-sm shadow-vault flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-start justify-between p-4 sm:p-5 border-b border-brass/10 shrink-0">
            <div>
              <h2 className="font-serif text-parchment text-lg leading-tight">{story.title}</h2>
              <p className="text-xs font-mono text-smoke/60 mt-0.5">
                {story.mediaType}
                {story.isPrivate && " · 🔒 Private"}
                {" · "}
                <span className="text-smoke/40 truncate">{story.zgRootHash.slice(0, 20)}…</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-smoke hover:text-aged transition-colors text-xl ml-4 shrink-0"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-auto p-4 sm:p-5">
            {state.status === "loading" && (
              <StatusView icon="📡" label="Fetching from 0G Storage…" pulse />
            )}

            {state.status === "decrypting" && (
              <StatusView icon="🔓" label="Decrypting with your wallet…" pulse />
            )}

            {state.status === "error" && (
              <div className="text-center py-8 space-y-3">
                <div className="text-3xl opacity-40">⚠</div>
                <p className="font-mono text-sm text-burgundy/80">{state.message}</p>
                <p className="text-xs text-smoke/50 font-mono">
                  The file may not yet be replicated on 0G storage nodes, or the indexer
                  may be temporarily unavailable. Try again in a moment.
                </p>
              </div>
            )}

            {state.status === "ready" && (
              <ContentRenderer content={state.content} title={story.title} />
            )}
          </div>

          {/* Footer */}
          {state.status === "ready" && (
            <div className="shrink-0 flex items-center justify-between px-4 sm:px-5 py-3 border-t border-brass/10">
              <p className="text-xs font-mono text-smoke/40">
                {contentOverride
                  ? "⚠ Demo content · fictional ancestral story"
                  : "✓ 0G Storage · content-addressed · immutable"}
              </p>
              {"url" in state.content && (
                <a
                  href={state.content.url}
                  download={story.title}
                  className="text-xs font-mono text-aged hover:text-brass transition-colors"
                >
                  ↓ Download
                </a>
              )}
            </div>
          )}
        </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function StatusView({ icon, label, pulse }: { icon: string; label: string; pulse?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <span className={["text-4xl opacity-40", pulse ? "animate-pulse" : ""].join(" ")}>
        {icon}
      </span>
      <p className={["text-sm font-mono text-smoke/60", pulse ? "animate-pulse" : ""].join(" ")}>
        {label}
      </p>
    </div>
  );
}

function ContentRenderer({ content, title }: { content: ContentView; title: string }) {
  switch (content.kind) {
    case "text":
      return (
        <pre
          className="font-serif text-sm text-parchment/90 leading-relaxed whitespace-pre-wrap break-words"
          style={{ fontFamily: "inherit" }}
        >
          {content.text}
        </pre>
      );

    case "image":
      return (
        <div className="flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={content.url}
            alt={title}
            className="max-w-full max-h-[55vh] object-contain rounded-sm"
          />
        </div>
      );

    case "audio":
      return (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="text-5xl opacity-30">🎵</div>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio
            src={content.url}
            controls
            className="w-full"
            style={{ colorScheme: "dark" }}
          />
          <p className="text-xs font-mono text-smoke/50">{title}</p>
        </div>
      );

    case "binary":
      return (
        <div className="flex flex-col items-center gap-3 py-12">
          <div className="text-4xl opacity-30">📄</div>
          <p className="text-sm font-serif text-aged">
            This file type cannot be previewed in-browser.
          </p>
          <p className="text-xs font-mono text-smoke/50">{content.sizeKB} KB</p>
          <a
            href={content.url}
            download={title}
            className="btn-brass px-5 py-2 text-sm mt-2"
          >
            ↓ Download File
          </a>
        </div>
      );
  }
}
