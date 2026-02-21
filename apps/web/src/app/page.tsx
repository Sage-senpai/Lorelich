"use client";

import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { WalletConnect } from "@/components/WalletConnect";
import Link from "next/link";

// ─────────────────────────────────────────────────────────────────────────────
// Home — Landing page / entry gate
// ─────────────────────────────────────────────────────────────────────────────

const FEATURES = [
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
    title: "LoreLich AI",
    desc:  "An AI guardian trained to speak with wisdom and reverence about ancestral stories.",
  },
];

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
          LoreLich Vault
        </h1>

        <p className="font-serif text-aged text-xl md:text-2xl italic mb-2">
          A sacred archive for the stories that made you.
        </p>

        <p className="text-smoke font-mono text-sm mb-10 max-w-xl mx-auto leading-relaxed">
          Preserve ancestral audio, video, and text on decentralized storage.
          Encrypted. Verifiable. Guarded by AI. Immortal.
        </p>

        {/* CTA */}
        {isConnected ? (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/vault"
              className="btn-brass px-8 py-3 text-base"
            >
              Enter the Vault
            </Link>
            <Link
              href="/upload"
              className="px-8 py-3 rounded-sm font-mono text-base border border-brass/20
                         text-aged hover:text-parchment hover:border-brass/40 transition-all duration-200"
            >
              Upload a Story
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
      <div className="flex items-center gap-4 mb-16">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent to-brass/30" />
        <span className="text-brass/50 font-serif text-sm">⸻</span>
        <div className="flex-1 h-px bg-gradient-to-l from-transparent to-brass/30" />
      </div>

      {/* Features */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.12 } },
          hidden:  {},
        }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-5"
      >
        {FEATURES.map((f) => (
          <motion.div
            key={f.title}
            variants={{
              hidden:  { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
            }}
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

      {/* Bottom quote */}
      <motion.blockquote
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="text-center mt-20 font-serif text-aged/60 italic text-sm"
      >
        "The elders die twice — once when they stop breathing,<br />
        and once when their stories are forgotten."
      </motion.blockquote>
    </div>
  );
}
