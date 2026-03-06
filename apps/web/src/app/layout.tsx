import type { Metadata } from "next";
import { Background } from "@/components/Background";
import { WalletConnect } from "@/components/WalletConnect";
import { MobileNav } from "@/components/MobileNav";
import { LangSwitcher } from "@/components/LangSwitcher";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title:       "LoreRich Vault — Ancestral Story Archive",
  description: "A sacred digital archive for ancestral stories. Permanent. Encrypted. Yours.",
  openGraph: {
    title:       "LoreRich Vault",
    description: "Preserve ancestral stories forever on decentralized storage.",
    type:        "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          {/* Smoky animated background — fixed, behind everything */}
          <Background />

          {/* Navigation */}
          <header className="fixed top-0 left-0 right-0 z-50 border-b border-brass/10 bg-crypt/70 backdrop-blur-md">
            <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
              {/* Logo */}
              <a href="/" className="flex items-center gap-2 group">
                <span className="text-lg animate-candle-flicker" aria-hidden>🕯</span>
                <span className="font-serif text-parchment text-lg group-hover:text-gold transition-colors duration-300">
                  LoreRich Vault
                </span>
              </a>

              {/* Nav links */}
              <nav className="hidden md:flex items-center gap-5 font-mono text-sm text-smoke">
                {/* Vaults — dropdown with Tree */}
                <div className="relative group/vaults">
                  <a href="/vault" className="hover:text-aged transition-colors flex items-center gap-1">
                    Vaults <span className="text-[9px] opacity-40 group-hover/vaults:opacity-70 transition-opacity">▾</span>
                  </a>
                  <div className="absolute top-full left-0 pt-1 hidden group-hover/vaults:block">
                    <div className="border border-brass/15 bg-crypt/95 backdrop-blur-md rounded-sm py-1 min-w-[120px] shadow-lg">
                      <a href="/vault" className="block px-3 py-1.5 hover:text-aged hover:bg-brass/5 transition-colors">Dashboard</a>
                      <a href="/tree"  className="block px-3 py-1.5 hover:text-aged hover:bg-brass/5 transition-colors">Genealogy</a>
                    </div>
                  </div>
                </div>
                <a href="/upload" className="hover:text-aged transition-colors">Upload</a>
                {/* Marketplace — dropdown with Search + Lore */}
                <div className="relative group/market">
                  <a href="/marketplace" className="hover:text-aged transition-colors flex items-center gap-1">
                    Marketplace <span className="text-[9px] opacity-40 group-hover/market:opacity-70 transition-opacity">▾</span>
                  </a>
                  <div className="absolute top-full left-0 pt-1 hidden group-hover/market:block">
                    <div className="border border-brass/15 bg-crypt/95 backdrop-blur-md rounded-sm py-1 min-w-[120px] shadow-lg">
                      <a href="/marketplace" className="block px-3 py-1.5 hover:text-aged hover:bg-brass/5 transition-colors">Browse</a>
                      <a href="/search"      className="block px-3 py-1.5 hover:text-aged hover:bg-brass/5 transition-colors">Search</a>
                      <a href="/lore"        className="block px-3 py-1.5 hover:text-aged hover:bg-brass/5 transition-colors">Lore Studio</a>
                    </div>
                  </div>
                </div>
                <a href="/pitch"    className="hover:text-aged transition-colors">Pitch</a>
                <a href="/learn"    className="hover:text-aged transition-colors">Learn</a>
                <a href="/proverbs" className="hover:text-aged transition-colors">Proverbs</a>
              </nav>

              <div className="flex items-center gap-3">
                <LangSwitcher />
                <WalletConnect />
                <MobileNav />
              </div>
            </div>
          </header>

          {/* Main content — padded for fixed header */}
          <main className="min-h-dvh pt-14">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t border-brass/10 py-6 mt-20">
            <div className="max-w-6xl mx-auto px-4 flex items-center justify-between text-xs text-smoke font-mono">
              <span>LoreRich Vault — Immortal. Verifiable. Decentralized.</span>
              <span>0G Storage · Groq AI · ERC5192 · IP Licensing · Pitch Portal · Lore Comics · Educational Comics · Genealogy · Search · Learn · Proverbs · Transcripts · Certificates</span>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
