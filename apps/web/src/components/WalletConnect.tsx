"use client";

import { ConnectKitButton } from "connectkit";
import { useAccount } from "wagmi";
import { useVaultStore } from "@/store";
import { useEffect } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// WalletConnect — dark academia styled ConnectKit button + address display
// ─────────────────────────────────────────────────────────────────────────────

export function WalletConnect() {
  const { isConnected } = useAccount();
  const clearVaultData  = useVaultStore((s) => s.clearVaultData);

  // Clear vault cache on wallet disconnect
  useEffect(() => {
    if (!isConnected) clearVaultData();
  }, [isConnected, clearVaultData]);

  return (
    <ConnectKitButton.Custom>
      {({ isConnected, isConnecting, show, address, ensName }) => (
        <button
          onClick={show}
          className={[
            "relative group flex items-center gap-2 px-4 py-2 rounded-sm",
            "border border-brass/30 hover:border-brass/60",
            "bg-shadow/80 hover:bg-dusk/80",
            "text-parchment text-sm font-mono",
            "transition-all duration-300",
            "shadow-vault hover:shadow-candle",
            "focus:outline-none focus:ring-1 focus:ring-brass/50",
          ].join(" ")}
          aria-label={isConnected ? "Wallet connected — click to manage" : "Connect wallet"}
        >
          {/* Candle dot */}
          <span
            className={[
              "h-2 w-2 rounded-full transition-colors duration-300",
              isConnected    ? "bg-gold animate-pulse-brass" :
              isConnecting   ? "bg-ember animate-pulse" :
                               "bg-smoke",
            ].join(" ")}
          />

          {isConnecting ? (
            <span className="text-aged">Awakening...</span>
          ) : isConnected ? (
            <span className="text-parchment">
              {ensName ?? `${address?.slice(0, 6)}...${address?.slice(-4)}`}
            </span>
          ) : (
            <span className="text-aged group-hover:text-parchment transition-colors">
              Enter the Vault
            </span>
          )}
        </button>
      )}
    </ConnectKitButton.Custom>
  );
}
