import type { Metadata } from "next";
import { Background } from "@/components/Background";
import { WalletConnect } from "@/components/WalletConnect";
import { MobileNav } from "@/components/MobileNav";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title:       "LoreLich Vault — Ancestral Story Archive",
  description: "A sacred digital archive for ancestral stories. Permanent. Encrypted. Yours.",
  openGraph: {
    title:       "LoreLich Vault",
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
                  LoreLich Vault
                </span>
              </a>

              {/* Nav links */}
              <nav className="hidden md:flex items-center gap-5 font-mono text-sm text-smoke">
                <a href="/vault"       className="hover:text-aged transition-colors">Vaults</a>
                <a href="/upload"      className="hover:text-aged transition-colors">Upload</a>
                <a href="/marketplace" className="hover:text-aged transition-colors">Marketplace</a>
                <a href="/pitch"       className="hover:text-aged transition-colors">Pitch</a>
                <a href="/tree"        className="hover:text-aged transition-colors">Tree</a>
                <a href="/search"      className="hover:text-aged transition-colors">Search</a>
                <a href="/proverbs"    className="hover:text-aged transition-colors">Proverbs</a>
              </nav>

              <div className="flex items-center gap-3">
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
              <span>LoreLich Vault — Immortal. Verifiable. Decentralized.</span>
              <span>0G Storage · Groq AI · ERC5192 · IP Licensing · Pitch Portal · Genealogy · Search · Proverbs</span>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
