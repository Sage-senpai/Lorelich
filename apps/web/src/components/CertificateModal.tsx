"use client";

import { motion } from "framer-motion";
import type { StoryMetadata, Vault } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// CertificateModal — Printable Certificate of Preservation.
//
// A client-side modal with print-optimized CSS that generates a verifiable
// Certificate of Preservation for any on-chain story. No server round-trip.
//
// The certificate shows:
//   - Story title, vault name, media type, duration
//   - Uploader wallet address
//   - Timestamp (human-readable + Unix epoch)
//   - 0G Merkle Root Hash (the on-chain verifiable content identifier)
//   - Soulbound Story token ID (= story ID on LoreLich)
//   - LoreLich Vault contract address
//   - Verification instructions
//
// Print: window.print() triggers the @media print CSS which hides the overlay
// and shows only the certificate content.
// ─────────────────────────────────────────────────────────────────────────────

interface CertificateModalProps {
  story:   StoryMetadata;
  vault:   Vault;
  onClose: () => void;
}

export function CertificateModal({ story, vault, onClose }: CertificateModalProps) {
  const date = new Date(Number(story.timestamp) * 1000);
  const dateStr = date.toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", timeZoneName: "short",
  });

  function handlePrint() {
    window.print();
  }

  return (
    <>
      {/* Print-specific global styles — injected once per render */}
      <style>{`
        @media print {
          body > *:not(#lorelich-cert-root) { display: none !important; }
          #lorelich-cert-root .no-print    { display: none !important; }
          #lorelich-cert-root              { position: static !important; background: white !important; }
          #lorelich-cert-paper             { box-shadow: none !important; border: 2px solid #c5a028 !important; }
        }
      `}</style>

      <motion.div
        id="lorelich-cert-root"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
        style={{ background: "rgba(13,11,14,0.85)", backdropFilter: "blur(6px)" }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="w-full max-w-2xl my-4">

          {/* Action buttons — hidden on print */}
          <div className="no-print flex items-center justify-between mb-4">
            <h2 className="font-serif text-parchment text-lg">
              Certificate of Preservation
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="btn-brass text-xs px-4 py-1.5"
              >
                🖨 Print / Save as PDF
              </button>
              <button
                onClick={onClose}
                className="text-smoke hover:text-aged transition-colors text-xl"
                aria-label="Close"
              >
                ×
              </button>
            </div>
          </div>

          {/* Certificate paper */}
          <div
            id="lorelich-cert-paper"
            className="bg-white text-gray-900 rounded-sm shadow-2xl"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              border: "2px solid #c5a028",
              padding: "3rem",
            }}
          >
            {/* Header ornament */}
            <div className="text-center mb-6">
              <p style={{ fontSize: "0.65rem", letterSpacing: "0.3em", color: "#8B6914", textTransform: "uppercase" }}>
                LoreLich Vault · Decentralized Ancestral Archive
              </p>
              <div style={{ borderTop: "1px solid #c5a028", margin: "0.75rem 0", width: "100%" }} />
              <h1 style={{ fontSize: "1.75rem", fontWeight: "bold", color: "#1a1a1a", margin: "0.5rem 0 0" }}>
                Certificate of Preservation
              </h1>
              <p style={{ fontSize: "0.75rem", color: "#666", marginTop: "0.25rem" }}>
                Immutable on-chain record · 0G Storage Network · Galileo Testnet
              </p>
            </div>

            {/* Story identity */}
            <div style={{ marginBottom: "2rem" }}>
              <p style={{ fontSize: "0.7rem", color: "#8B6914", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                This certifies that the following ancestral story has been permanently preserved
              </p>
              <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1a1a1a", lineHeight: 1.3 }}>
                {story.title}
              </h2>
              <p style={{ fontSize: "0.85rem", color: "#555", marginTop: "0.25rem" }}>
                {vault.name} · {story.mediaType}
                {story.duration > 0n && ` · ${fmtDuration(Number(story.duration))}`}
              </p>
            </div>

            <div style={{ borderTop: "1px solid #e5e5e5", paddingTop: "1.5rem", marginBottom: "1.5rem" }}>
              {/* Two-column details */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                <CertField label="Preserved by"    value={formatAddr(story.uploader)} mono />
                <CertField label="Preservation Date" value={`${dateStr}, ${timeStr}`} />
                <CertField label="Unix Timestamp"  value={story.timestamp.toString()} mono />
                <CertField label="Story Token ID"  value={story.id.toString()} mono />
              </div>

              {/* Full-width rootHash */}
              <CertField
                label="0G Merkle Root Hash (Content Identifier)"
                value={story.zgRootHash}
                mono
                full
              />
            </div>

            {/* Verification section */}
            <div
              style={{
                background: "#f9f6ef",
                border: "1px solid #e8d78a",
                borderRadius: "4px",
                padding: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              <p style={{ fontSize: "0.7rem", color: "#8B6914", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                Independent Verification
              </p>
              <p style={{ fontSize: "0.75rem", color: "#555", lineHeight: 1.6 }}>
                The content of this story can be verified by anyone using the 0G Merkle Root Hash above.
                Using the 0G Storage SDK, call <code style={{ background: "#f0e8c8", padding: "0 3px", borderRadius: "2px" }}>indexer.download(rootHash, outputPath, false)</code> to retrieve
                an exact copy of the preserved content. The Soulbound Story token (ERC-5192) at token ID {story.id.toString()} on the
                LoreVault contract is the permanent, non-transferable on-chain record of ownership.
              </p>
            </div>

            {/* Footer */}
            <div style={{ borderTop: "1px solid #e5e5e5", paddingTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <p style={{ fontSize: "0.65rem", color: "#999" }}>LoreVault Contract</p>
                <p style={{ fontSize: "0.65rem", color: "#666", fontFamily: "monospace" }}>
                  {process.env.NEXT_PUBLIC_LORE_VAULT_ADDRESS ?? "See deployment docs"}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "0.65rem", color: "#999" }}>0G Galileo Testnet · Chain ID 16601</p>
                <p style={{ fontSize: "0.65rem", color: "#8B6914" }}>Immortal · Verifiable · Decentralized</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function CertField({
  label,
  value,
  mono,
  full,
}: {
  label: string;
  value: string;
  mono?:  boolean;
  full?:  boolean;
}) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : undefined }}>
      <p style={{ fontSize: "0.65rem", color: "#999", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.2rem" }}>
        {label}
      </p>
      <p
        style={{
          fontSize:   mono ? "0.72rem" : "0.82rem",
          color:      "#1a1a1a",
          fontFamily: mono ? "monospace" : "inherit",
          wordBreak:  "break-all",
          lineHeight: 1.4,
        }}
      >
        {value}
      </p>
    </div>
  );
}

function formatAddr(addr: string) {
  return `${addr.slice(0, 10)}…${addr.slice(-8)}`;
}

function fmtDuration(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}
