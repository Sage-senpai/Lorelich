import { createConfig, http } from "wagmi";
import { defineChain } from "viem";
import { getDefaultConfig } from "connectkit";

// ─────────────────────────────────────────────────────────────────────────────
// 0G Newton Testnet
// ─────────────────────────────────────────────────────────────────────────────

export const zeroGNewton = defineChain({
  id: 16600,
  name: "0G Newton Testnet",
  nativeCurrency: {
    name: "0G",
    symbol: "A0GI",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_RPC_URL ?? "https://evmrpc-testnet.0g.ai"],
    },
  },
  blockExplorers: {
    default: {
      name: "0G Newton Explorer",
      url: "https://chainscan-newton.0g.ai",
    },
  },
  testnet: true,
});

// ─────────────────────────────────────────────────────────────────────────────
// Wagmi Config
// ─────────────────────────────────────────────────────────────────────────────

export const wagmiConfig = createConfig(
  getDefaultConfig({
    chains: [zeroGNewton],
    transports: {
      [zeroGNewton.id]: http(
        process.env.NEXT_PUBLIC_RPC_URL ?? "https://evmrpc-testnet.0g.ai"
      ),
    },
    walletConnectProjectId:
      process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "",
    appName: "LoreLich Vault",
    appDescription: "A sacred digital archive for ancestral stories",
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://lorelich.app",
    appIcon: "/icon.png",
  })
);
