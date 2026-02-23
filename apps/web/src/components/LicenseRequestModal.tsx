"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatEther } from "viem";
import { useRequestLicense } from "@/hooks/useIPLicense";
import type { StoryMetadata, LicenseTerms, LicenseType } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// LicenseRequestModal — Licensee submits a request + pays the royalty upfront
// ─────────────────────────────────────────────────────────────────────────────

interface LicenseRequestModalProps {
  story:   StoryMetadata;
  terms:   LicenseTerms;
  onClose: () => void;
}

const LICENSE_OPTIONS: Array<{
  type:        LicenseType;
  label:       string;
  desc:        string;
  commercial:  boolean;
}> = [
  { type: "PERSONAL",    label: "Personal",    desc: "Family, education, personal archive", commercial: false },
  { type: "DOCUMENTARY", label: "Documentary", desc: "Film festivals, non-commercial broadcast", commercial: true  },
  { type: "COMMERCIAL",  label: "Commercial",  desc: "Streaming, broadcast, commercial media",  commercial: true  },
  { type: "EXCLUSIVE",   label: "Exclusive",   desc: "Full exclusive rights — locks this story", commercial: true  },
];

export function LicenseRequestModal({ story, terms, onClose }: LicenseRequestModalProps) {
  const { requestLicense, isPending } = useRequestLicense();

  const [licenseType,  setLicenseType]  = useState<LicenseType>("PERSONAL");
  const [purposeNote,  setPurposeNote]  = useState("");
  const [error,        setError]        = useState("");
  const [success,      setSuccess]      = useState(false);

  const isExclusive = licenseType === "EXCLUSIVE";
  const feeWei = isExclusive ? terms.exclusiveRoyaltyWei : terms.royaltyWei;
  const feeOG  = formatEther(feeWei);

  const availableOptions = LICENSE_OPTIONS.filter((opt) => {
    if (opt.commercial && !terms.commercialUse) return false;
    if (opt.type === "EXCLUSIVE" && !terms.exclusiveAvailable) return false;
    return true;
  });

  const handleSubmit = async () => {
    if (!purposeNote.trim()) { setError("Please describe your intended use."); return; }
    setError("");
    try {
      await requestLicense(story.id, licenseType, purposeNote.trim(), feeWei);
      setSuccess(true);
    } catch (err) {
      const msg = (err as Error).message ?? "";
      const isRelay = msg.includes("Transaction failed") || msg.includes("Failed to publish");
      setError(isRelay
        ? "WalletConnect relay failed. Try inside your wallet's built-in browser."
        : msg
      );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(13,11,14,0.80)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md vault-glass rounded-sm p-6 shadow-vault"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-serif text-parchment text-xl">Request License</h2>
          <button onClick={onClose} className="text-smoke hover:text-aged transition-colors text-lg">×</button>
        </div>

        {success ? (
          <div className="py-6 text-center space-y-3">
            <p className="text-3xl">📜</p>
            <p className="font-serif text-parchment text-lg">Request submitted</p>
            <p className="text-sm font-mono text-smoke">
              Your payment is held in escrow. The story owner will respond shortly.
            </p>
            <button onClick={onClose} className="btn-brass mt-4 px-6 py-2">Close</button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Story header */}
            <div className="pb-3 border-b border-brass/10">
              <p className="font-serif text-parchment">{story.title}</p>
              <p className="text-xs text-smoke font-mono mt-0.5">{story.mediaType}</p>
            </div>

            {/* License type selector */}
            <div>
              <label className="text-xs text-smoke font-mono block mb-2">License Type</label>
              <div className="space-y-2">
                {availableOptions.map((opt) => (
                  <button
                    key={opt.type}
                    onClick={() => setLicenseType(opt.type)}
                    className={[
                      "w-full flex items-start gap-3 p-3 rounded-sm border text-left transition-all duration-200",
                      licenseType === opt.type
                        ? "border-brass/60 bg-brass/5 text-parchment"
                        : "border-brass/20 text-smoke hover:border-brass/40",
                    ].join(" ")}
                  >
                    <span className={[
                      "mt-0.5 w-3.5 h-3.5 shrink-0 rounded-full border flex items-center justify-center",
                      licenseType === opt.type ? "border-brass bg-brass" : "border-smoke/40",
                    ].join(" ")} />
                    <span>
                      <span className="text-sm font-mono block">{opt.label}</span>
                      <span className="text-xs text-smoke/70 mt-0.5 block">{opt.desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Purpose note */}
            <div>
              <label className="text-xs text-smoke font-mono block mb-1.5">
                Intended use <span className="text-smoke/40">(max 500 chars)</span>
              </label>
              <textarea
                value={purposeNote}
                onChange={(e) => setPurposeNote(e.target.value.slice(0, 500))}
                rows={3}
                className="input-dark resize-none font-serif"
                placeholder="Describe how you plan to use this story…"
              />
              <p className="text-xs text-smoke/40 font-mono mt-1 text-right">
                {purposeNote.length}/500
              </p>
            </div>

            {/* Fee display */}
            <div className="bg-shadow/60 border border-brass/20 rounded-sm px-4 py-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-smoke">Payment (held in escrow)</span>
                <span className="font-mono text-brass font-semibold">
                  {feeOG === "0" ? "Free" : `${feeOG} OG`}
                </span>
              </div>
              <p className="text-xs text-smoke/50 font-mono">
                Refunded if rejected · Platform fee: 2.5%
              </p>
            </div>

            {error && (
              <p className="text-xs font-mono text-red-400 bg-red-900/20 border border-red-800/30 rounded-sm px-3 py-2">
                {error}
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={isPending || !purposeNote.trim()}
              className="btn-brass w-full py-2.5"
            >
              {isPending ? "Submitting…" : `Request License${feeWei > 0n ? ` · ${feeOG} OG` : ""}`}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
