import { createConfig, http } from "wagmi";
import { defineChain } from "viem";
import { getDefaultConfig } from "connectkit";

// ─────────────────────────────────────────────────────────────────────────────
// 0G Galileo Testnet (V3)
// Chain ID 16602 — same endpoint as Newton, rebranded to Galileo
// ─────────────────────────────────────────────────────────────────────────────

export const zeroGGalileo = defineChain({
  id: 16602,
  name: "0G Galileo Testnet",
  nativeCurrency: {
    name: "0G",
    symbol: "OG",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_RPC_URL ?? "https://evmrpc-testnet.0g.ai"],
    },
  },
  blockExplorers: {
    default: {
      name: "0G Galileo Explorer",
      url: "https://chainscan-galileo.0g.ai",
    },
  },
  testnet: true,
});

// ─────────────────────────────────────────────────────────────────────────────
// Wagmi Config
// ─────────────────────────────────────────────────────────────────────────────

export const wagmiConfig = createConfig(
  getDefaultConfig({
    chains: [zeroGGalileo],
    transports: {
      [zeroGGalileo.id]: http(
        process.env.NEXT_PUBLIC_RPC_URL ?? "https://evmrpc-testnet.0g.ai"
      ),
    },
    walletConnectProjectId:
      process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "",
    appName: "LoreRich Vault",
    appDescription: "A sacred digital archive for ancestral stories",
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://lorelich.app",
    appIcon: "/icon.png",
  })
);
