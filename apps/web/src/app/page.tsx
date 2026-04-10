"use client";

import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { WalletConnect } from "@/components/WalletConnect";
import Link from "next/link";

// ─────────────────────────────────────────────────────────────────────────────
// Home — Landing page / entry gate
// ─────────────────────────────────────────────────────────────────────────────

const CORE_FEATURES = [
  {
    icon: "🗝",
    title: "Encrypted Vaults",
    desc:  "Private stories are encrypted client-side with AES-256 before leaving your device.",
  },
  {
    icon: "⛓",
    title: "0G Decentralized Storage",
    desc:  "Every story lives on the 0G network — verifiable, permanent, owned by no company.",
  },
  {
    icon: "🪬",
    title: "Soulbound Ownership",
    desc:  "Each upload mints a non-transferable ERC5192 token. Your story. Provably yours.",
  },
  {
    icon: "🕯",
    title: "LoreRich AI",
    desc:  "An AI guardian trained to speak with wisdom and reverence about ancestral stories.",
  },
];

const ECOSYSTEM_FEATURES = [
  {
    icon: "📜",
    title: "IP Licensing",
    desc:  "Set programmable license terms on-chain. Filmmakers request licenses. Royalties flow automatically.",
    href: "/marketplace",
    cta:  "Browse Marketplace →",
  },
  {
    icon: "🎬",
    title: "Pitch Portal",
    desc:  "LoreRich AI generates film treatment briefs — logline, synopsis, visual approach, comparables.",
    href: "/pitch",
    cta:  "Explore Pitches →",
  },
  {
    icon: "🌌",
    title: "Genealogy Tree",
    desc:  "Import GEDCOM files, visualize ancestors as a constellation, link them to vault stories.",
    href: "/tree",
    cta:  "Build Your Tree →",
  },
];

const CARD_VARIANTS = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function HomePage() {
  const { isConnected } = useAccount();

  return (
    <div className="max-w-4xl mx-auto px-4 py-20">

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center mb-20"
      >
        {/* Candlelight orb */}
        <motion.div
          className="mx-auto mb-8 w-20 h-20 rounded-full flex items-center justify-center"
          style={{
            background: "radial-gradient(circle, rgba(184,134,11,0.2) 0%, transparent 70%)",
            boxShadow:  "0 0 40px rgba(184,134,11,0.3)",
          }}
          animate={{ boxShadow: [
            "0 0 30px rgba(184,134,11,0.2)",
            "0 0 50px rgba(184,134,11,0.4)",
            "0 0 30px rgba(184,134,11,0.2)",
          ]}}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="text-4xl">🕯</span>
        </motion.div>

        <h1 className="font-serif text-5xl md:text-6xl text-parchment mb-4 leading-tight">
          LoreRich Vault
        </h1>

        <p className="font-serif text-aged text-xl md:text-2xl italic mb-2">
          A sacred archive for the stories that made you.
        </p>

        <p className="text-smoke font-mono text-sm mb-10 max-w-xl mx-auto leading-relaxed">
          Preserve ancestral audio, video, and text on decentralized storage.
          License your stories. Pitch to filmmakers. Map your ancestors.
          Encrypted. Verifiable. Immortal.
        </p>

        {/* CTA */}
        {isConnected ? (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/vault"      className="btn-brass px-8 py-3 text-base">
              Enter the Vault
            </Link>
            <Link href="/upload"     className="px-8 py-3 rounded-sm font-mono text-base border border-brass/20
                                                text-aged hover:text-parchment hover:border-brass/40 transition-all duration-200">
              Upload a Story
            </Link>
            <Link href="/marketplace" className="px-8 py-3 rounded-sm font-mono text-base border border-brass/20
                                                  text-aged hover:text-parchment hover:border-brass/40 transition-all duration-200">
              Marketplace
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <WalletConnect />
            <p className="text-xs text-smoke font-mono">
              Connect your wallet to access the vault
            </p>
          </div>
        )}
      </motion.div>

      {/* Brass divider */}
      <Divider />

      {/* Core archive features */}
      <SectionLabel label="The Archive" />
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.12 } }, hidden: {} }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-16"
      >
        {CORE_FEATURES.map((f) => (
          <motion.div
            key={f.title}
            variants={CARD_VARIANTS}
            className="vault-glass rounded-sm p-5 group hover:border-brass/40 transition-all duration-300"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0 mt-0.5">{f.icon}</span>
              <div>
                <h3 className="font-serif text-parchment mb-1 group-hover:text-gold transition-colors duration-300">
                  {f.title}
                </h3>
                <p className="text-sm text-smoke leading-relaxed">{f.desc}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Brass divider */}
      <Divider />

      {/* Ecosystem features */}
      <SectionLabel label="The Ecosystem" />
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.14 } }, hidden: {} }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-16"
      >
        {ECOSYSTEM_FEATURES.map((f) => (
          <motion.div
            key={f.title}
            variants={CARD_VARIANTS}
            className="vault-glass rounded-sm p-5 group hover:border-brass/40 transition-all duration-300
                       flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl shrink-0 mt-0.5">{f.icon}</span>
                <h3 className="font-serif text-parchment group-hover:text-gold transition-colors duration-300 pt-0.5">
                  {f.title}
                </h3>
              </div>
              <p className="text-sm text-smoke leading-relaxed mb-4">{f.desc}</p>
            </div>
            <Link
              href={f.href}
              className="text-xs font-mono text-brass/70 hover:text-brass transition-colors duration-200 self-start"
            >
              {f.cta}
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {/* How it works — licensing flow */}
      <Divider />
      <SectionLabel label="Story Lifecycle" />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.8 }}
        className="vault-glass rounded-sm p-6 mb-20 overflow-x-auto"
      >
        <div className="flex items-center gap-2 min-w-max mx-auto justify-center flex-wrap text-xs font-mono text-smoke">
          {[
            { step: "Upload",     sub: "to 0G storage",      icon: "⬆" },
            { step: "Mint",       sub: "soulbound NFT",       icon: "🪬" },
            { step: "License",    sub: "set terms on-chain",  icon: "📜" },
            { step: "Pitch",      sub: "AI film treatment",   icon: "🎬" },
            { step: "Earn",       sub: "royalties on approval", icon: "✦" },
          ].map((s, i, arr) => (
            <div key={s.step} className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-1">
                <span className="text-brass text-base">{s.icon}</span>
                <span className="text-parchment font-semibold text-[11px]">{s.step}</span>
                <span className="text-smoke/70 text-[9px]">{s.sub}</span>
              </div>
              {i < arr.length - 1 && (
                <span className="text-brass/40 text-lg mx-1">→</span>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Bottom quote */}
      <motion.blockquote
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="text-center font-serif text-aged/80 italic text-sm"
      >
        "The elders die twice — once when they stop breathing,<br />
        and once when their stories are forgotten."
      </motion.blockquote>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function Divider() {
  return (
    <div className="flex items-center gap-4 mb-10">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent to-brass/30" />
      <span className="text-brass/50 font-serif text-sm">⸻</span>
      <div className="flex-1 h-px bg-gradient-to-l from-transparent to-brass/30" />
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="font-mono text-xs text-smoke/60 uppercase tracking-widest mb-6 text-center">
      {label}
    </p>
  );
}
