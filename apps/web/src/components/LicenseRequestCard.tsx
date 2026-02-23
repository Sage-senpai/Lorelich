"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { formatEther } from "viem";
import { useApproveRequest, useRejectRequest } from "@/hooks/useIPLicense";
import type { LicenseRequest } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// LicenseRequestCard — displays an incoming or outgoing license request
// ─────────────────────────────────────────────────────────────────────────────

interface LicenseRequestCardProps {
  request:  LicenseRequest;
  mode:     "incoming" | "outgoing";
  storyTitle?: string;
  index?:   number;
}

const STATUS_STYLES: Record<string, string> = {
  PENDING:  "text-aged border-aged/40 bg-aged/10",
  APPROVED: "text-moss border-moss/40 bg-moss/10",
  REJECTED: "text-smoke border-smoke/30 bg-smoke/5",
  REVOKED:  "text-smoke border-smoke/30 bg-smoke/5 line-through",
};

const TYPE_LABELS: Record<string, string> = {
  PERSONAL:    "Personal",
  DOCUMENTARY: "Documentary",
  COMMERCIAL:  "Commercial",
  EXCLUSIVE:   "Exclusive",
};

export function LicenseRequestCard({
  request, mode, storyTitle, index = 0,
}: LicenseRequestCardProps) {
  const { approve, isPending: approving } = useApproveRequest();
  const { reject,  isPending: rejecting  } = useRejectRequest();
  const [localStatus, setLocalStatus] = useState(request.status);
  const [error, setError] = useState("");

  const truncate = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  const fmtDate  = (ts: bigint) =>
    new Date(Number(ts) * 1000).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });

  const handleApprove = async () => {
    setError("");
    try {
      await approve(request.requestId, BigInt(0)); // 0 = perpetual
      setLocalStatus("APPROVED");
    } catch (err) {
      setError((err as Error).message ?? "Transaction failed");
    }
  };

  const handleReject = async () => {
    setError("");
    try {
      await reject(request.requestId);
      setLocalStatus("REJECTED");
    } catch (err) {
      setError((err as Error).message ?? "Transaction failed");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="vault-glass rounded-sm p-4 space-y-3"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          {mode === "outgoing" && storyTitle && (
            <p className="font-serif text-parchment text-sm">{storyTitle}</p>
          )}
          {mode === "incoming" && (
            <p className="font-mono text-aged text-xs">{truncate(request.licensee)}</p>
          )}
          <p className="text-xs text-smoke font-mono">{fmtDate(request.requestedAt)}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* License type badge */}
          <span className="text-xs font-mono px-2 py-0.5 rounded-sm border border-brass/20 text-aged">
            {TYPE_LABELS[request.licenseType]}
          </span>
          {/* Status badge */}
          <span className={[
            "text-xs font-mono px-2 py-0.5 rounded-sm border",
            STATUS_STYLES[localStatus],
          ].join(" ")}>
            {localStatus}
          </span>
        </div>
      </div>

      {/* Purpose note */}
      {request.purposeNote && (
        <p className="text-xs text-smoke font-serif italic border-l border-brass/20 pl-3">
          "{request.purposeNote}"
        </p>
      )}

      {/* Amount paid */}
      {request.amountPaid > 0n && (
        <p className="text-xs font-mono text-brass">
          {formatEther(request.amountPaid)} OG escrowed
        </p>
      )}

      {/* Expiry (if approved) */}
      {localStatus === "APPROVED" && request.expiresAt > 0n && (
        <p className="text-xs font-mono text-smoke/60">
          Expires {fmtDate(request.expiresAt)}
        </p>
      )}

      {/* Incoming mode — approve / reject buttons */}
      {mode === "incoming" && localStatus === "PENDING" && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleApprove}
            disabled={approving || rejecting}
            className="flex-1 py-1.5 rounded-sm text-xs font-mono border border-moss/40 text-moss hover:bg-moss/10 transition-colors disabled:opacity-50"
          >
            {approving ? "Approving…" : "Approve"}
          </button>
          <button
            onClick={handleReject}
            disabled={approving || rejecting}
            className="flex-1 py-1.5 rounded-sm text-xs font-mono border border-smoke/30 text-smoke hover:bg-smoke/10 transition-colors disabled:opacity-50"
          >
            {rejecting ? "Rejecting…" : "Reject"}
          </button>
        </div>
      )}

      {error && (
        <p className="text-xs font-mono text-red-400">{error}</p>
      )}
    </motion.div>
  );
}
