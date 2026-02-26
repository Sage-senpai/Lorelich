"use client";

// ─────────────────────────────────────────────────────────────────────────────
// DemoBanner / DemoBadge — disclaimer components for sample content
// ─────────────────────────────────────────────────────────────────────────────

/** Full-width disclaimer banner — shown once per section that contains demo data. */
export function DemoBanner() {
  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2.5 mb-5 rounded-sm
                 border border-brass/25 bg-brass/5 text-xs font-mono text-smoke/60"
    >
      <span className="text-brass shrink-0">⚠</span>
      <span>
        Sample content below is{" "}
        <strong className="text-aged/70 font-semibold">fictional</strong> and for
        demonstration purposes only. Real ancestral stories are stored on{" "}
        <span className="text-moss/80">0G Galileo Testnet</span>.
      </span>
    </div>
  );
}

/** Inline badge — shown on individual demo cards. */
export function DemoBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={[
        "inline-block text-[9px] font-mono px-1.5 py-0.5 rounded-sm",
        "border border-brass/30 bg-brass/10 text-brass/60",
        className,
      ].join(" ")}
    >
      DEMO
    </span>
  );
}
