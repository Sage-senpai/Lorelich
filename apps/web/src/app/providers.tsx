"use client";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider } from "connectkit";
import { wagmiConfig } from "@/lib/wagmi";
import { useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Providers — wagmi + ConnectKit + React Query
// Dark academia ConnectKit theme
// ─────────────────────────────────────────────────────────────────────────────

const connectKitTheme = {
  "--ck-font-family":        "'JetBrains Mono', monospace",
  "--ck-border-radius":      "2px",
  "--ck-overlay-background": "rgba(13, 11, 14, 0.8)",
  "--ck-modal-background":   "#1A1520",
  "--ck-modal-box-shadow":   "0 8px 32px rgba(0,0,0,0.8), inset 0 1px 0 rgba(184,134,11,0.1)",
  "--ck-body-color":         "#E8D5B0",
  "--ck-body-color-muted":   "#6B5D7A",
  "--ck-primary-button-background":    "#261E2E",
  "--ck-primary-button-color":         "#DAA520",
  "--ck-primary-button-border-radius": "2px",
  "--ck-primary-button-hover-background": "#2F2437",
  "--ck-secondary-button-background":  "#1A1520",
  "--ck-focus-color":        "#B8860B",
};

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } })
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider
          customTheme={connectKitTheme}
          options={{
            hideNoWalletCTA:    false,
            walletConnectName:  "WalletConnect",
            hideQuestionMarkCTA: true,
          }}
        >
          {children}
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
