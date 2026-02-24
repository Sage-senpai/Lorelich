"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { formatEther, parseEther } from "viem";
import { useSetTerms, useStoryTerms } from "@/hooks/useIPLicense";
import type { StoryMetadata } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// LicenseTermsForm — Story owner sets programmable license terms
// ─────────────────────────────────────────────────────────────────────────────

interface LicenseTermsFormProps {
  story:      StoryMetadata;
  onSuccess?: () => void;
}

export function LicenseTermsForm({ story, onSuccess }: LicenseTermsFormProps) {
  const { terms: existing } = useStoryTerms(story.id);
  const { setTerms, isPending } = useSetTerms();

  const [isLicensable,       setIsLicensable]       = useState(false);
  const [commercialUse,      setCommercialUse]       = useState(false);
  const [exclusiveAvailable, setExclusiveAvailable]  = useState(false);
  const [royaltyOG,          setRoyaltyOG]           = useState("0");
  const [exclusiveRoyaltyOG, setExclusiveRoyaltyOG] = useState("0");
  const [maxLicenses,        setMaxLicenses]         = useState(0);
  const [jurisdictionNote,   setJurisdictionNote]    = useState("");
  const [error,              setError]               = useState("");
  const [success,            setSuccess]             = useState(false);

  // Hydrate form from on-chain data once it loads (useState initial value only
  // runs once, so existing=undefined on first render is safe to ignore)
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!existing || hydratedRef.current) return;
    hydratedRef.current = true;
    setIsLicensable(existing.isLicensable);
    setCommercialUse(existing.commercialUse);
    setExclusiveAvailable(existing.exclusiveAvailable);
    setRoyaltyOG(formatEther(existing.royaltyWei));
    setExclusiveRoyaltyOG(formatEther(existing.exclusiveRoyaltyWei));
    setMaxLicenses(Number(existing.maxLicenses));
    setJurisdictionNote(existing.jurisdictionNote);
  }, [existing]);

  const handleSubmit = async () => {
    setError("");
    try {
      await setTerms(story.id, {
        isLicensable,
        commercialUse,
        exclusiveAvailable,
        royaltyWei:          parseEther(royaltyOG || "0"),
        exclusiveRoyaltyWei: parseEther(exclusiveRoyaltyOG || "0"),
        maxLicenses:         BigInt(maxLicenses),
        jurisdictionNote,
      });
      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      setError((err as Error).message ?? "Transaction failed");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-5"
    >
      {/* Story title */}
      <div className="pb-3 border-b border-brass/10">
        <p className="font-serif text-parchment">{story.title}</p>
        <p className="text-xs text-smoke font-mono mt-0.5">{story.mediaType}</p>
      </div>

      {/* Master switch */}
      <Toggle
        label="Make this story licensable"
        desc="Allow others to request a license to use this story"
        checked={isLicensable}
        onChange={setIsLicensable}
      />

      {isLicensable && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="space-y-4 pl-3 border-l border-brass/20"
        >
          {/* Commercial use */}
          <Toggle
            label="Allow commercial use"
            desc="Licensees may use this story in commercial projects"
            checked={commercialUse}
            onChange={setCommercialUse}
          />

          {/* Exclusive */}
          <Toggle
            label="Allow exclusive licenses"
            desc="One licensee can acquire exclusive rights (locks story after approval)"
            checked={exclusiveAvailable}
            onChange={setExclusiveAvailable}
          />

          {/* Royalty per license */}
          <div>
            <label className="text-xs text-smoke font-mono block mb-1.5">
              Royalty per license (OG)
            </label>
            <input
              type="number"
              min="0"
              step="0.001"
              value={royaltyOG}
              onChange={(e) => setRoyaltyOG(e.target.value)}
              className="input-dark"
              placeholder="0.01"
            />
            <p className="text-xs text-smoke/50 font-mono mt-1">
              Set 0 to allow free requests (approval still required)
            </p>
          </div>

          {/* Exclusive royalty */}
          {exclusiveAvailable && (
            <div>
              <label className="text-xs text-smoke font-mono block mb-1.5">
                Exclusive license royalty (OG)
              </label>
              <input
                type="number"
                min="0"
                step="0.001"
                value={exclusiveRoyaltyOG}
                onChange={(e) => setExclusiveRoyaltyOG(e.target.value)}
                className="input-dark"
                placeholder="0.1"
              />
            </div>
          )}

          {/* Max licenses */}
          <div>
            <label className="text-xs text-smoke font-mono block mb-1.5">
              Max licenses (0 = unlimited)
            </label>
            <input
              type="number"
              min="0"
              value={maxLicenses}
              onChange={(e) => setMaxLicenses(Number(e.target.value))}
              className="input-dark"
              placeholder="0"
            />
          </div>

          {/* Jurisdiction note */}
          <div>
            <label className="text-xs text-smoke font-mono block mb-1.5">
              Jurisdiction note <span className="text-smoke/40">(optional, max 200 chars)</span>
            </label>
            <input
              type="text"
              value={jurisdictionNote}
              onChange={(e) => setJurisdictionNote(e.target.value.slice(0, 200))}
              className="input-dark"
              placeholder="e.g. Worldwide excluding US"
            />
          </div>
        </motion.div>
      )}

      {error && (
        <p className="text-xs font-mono text-red-400 bg-red-900/20 border border-red-800/30 rounded-sm px-3 py-2">
          {error}
        </p>
      )}

      {success ? (
        <p className="text-xs font-mono text-moss border border-moss/30 rounded-sm px-3 py-2">
          ✓ License terms saved on-chain
        </p>
      ) : (
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="btn-brass w-full py-2.5"
        >
          {isPending ? "Saving…" : "Save License Terms"}
        </button>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Toggle helper
// ─────────────────────────────────────────────────────────────────────────────

function Toggle({
  label, desc, checked, onChange,
}: {
  label:    string;
  desc:     string;
  checked:  boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={[
        "w-full flex items-start gap-3 p-3 rounded-sm border text-left transition-all duration-200",
        checked
          ? "border-brass/60 bg-brass/5 text-parchment"
          : "border-brass/20 text-smoke hover:border-brass/40",
      ].join(" ")}
    >
      <span className={[
        "mt-0.5 w-4 h-4 shrink-0 rounded-sm border flex items-center justify-center text-xs",
        checked ? "border-brass bg-brass text-shadow" : "border-smoke/40",
      ].join(" ")}>
        {checked && "✓"}
      </span>
      <span>
        <span className="text-sm font-mono block">{label}</span>
        <span className="text-xs text-smoke/70 block mt-0.5">{desc}</span>
      </span>
    </button>
  );
}
