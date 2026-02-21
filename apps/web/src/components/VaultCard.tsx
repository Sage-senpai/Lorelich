"use client";

import { motion } from "framer-motion";
import type { Vault } from "@/types";
import { useVaultStore } from "@/store";

// ─────────────────────────────────────────────────────────────────────────────
// VaultCard — Frosted glass card with brass glow on hover
// ─────────────────────────────────────────────────────────────────────────────

interface VaultCardProps {
  vault:    Vault;
  index?:   number;
  onClick?: () => void;
}

const LOCK_ICON = (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
);

const GLOBE_ICON = (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
  </svg>
);

export function VaultCard({ vault, index = 0, onClick }: VaultCardProps) {
  const selectVault = useVaultStore((s) => s.selectVault);

  const handleClick = () => {
    selectVault(vault.id);
    onClick?.();
  };

  const createdDate = new Date(Number(vault.createdAt) * 1000).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5, ease: "easeOut" }}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      onClick={handleClick}
      className={[
        "group relative cursor-pointer rounded-sm",
        "border border-brass/20 hover:border-brass/50",
        "bg-shadow/60 hover:bg-dusk/70",
        "backdrop-blur-sm",
        "shadow-vault hover:shadow-brass-glow",
        "transition-all duration-400",
        "p-5 overflow-hidden",
      ].join(" ")}
      role="button"
      tabIndex={0}
      aria-label={`Open vault: ${vault.name}`}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
    >
      {/* Brass glow on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 50% 0%, rgba(184,134,11,0.08) 0%, transparent 60%)",
        }}
      />

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-serif text-parchment text-lg leading-snug group-hover:text-gold transition-colors duration-300 pr-2">
          {vault.name}
        </h3>
        <span className={[
          "flex items-center gap-1 text-xs font-mono px-2 py-1 rounded-sm",
          "border shrink-0",
          vault.isPrivate
            ? "text-aged border-aged/30 bg-shadow/50"
            : "text-moss border-moss/30 bg-moss/10",
        ].join(" ")}>
          {vault.isPrivate ? LOCK_ICON : GLOBE_ICON}
          {vault.isPrivate ? "Private" : "Public"}
        </span>
      </div>

      {/* Story count */}
      <div className="flex items-center gap-4 text-sm text-smoke font-mono">
        <span>
          <span className="text-brass">{vault.storyCount.toString()}</span>
          {" "}
          {vault.storyCount === 1n ? "story" : "stories"}
        </span>
        <span className="text-smoke/50">·</span>
        <span>{createdDate}</span>
      </div>

      {/* Bottom brass rule */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brass/30 to-transparent
        opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────────────────

export function VaultCardEmpty() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="col-span-full flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="text-5xl mb-4 opacity-30">🗝</div>
      <p className="font-serif text-aged text-xl mb-2">No vaults yet</p>
      <p className="text-smoke text-sm font-mono">
        Create your first vault to begin preserving ancestral stories.
      </p>
    </motion.div>
  );
}
