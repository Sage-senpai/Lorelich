import { NextResponse } from "next/server";
import { Indexer } from "@0gfoundation/0g-ts-sdk";
import { ethers } from "ethers";
import { getIndexerUrls } from "@/lib/indexer";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/0g-status
// Diagnostic endpoint to check 0G Storage connectivity.
// Returns the status of each configured component.
// ─────────────────────────────────────────────────────────────────────────────

const RPC_URL           = process.env.NEXT_PUBLIC_0G_RPC ?? "";
const RELAY_PRIVATE_KEY = process.env.RELAY_PRIVATE_KEY ?? "";

export async function GET() {
  const indexerUrls = getIndexerUrls();

  const checks: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    indexerUrls,
    rpcUrl: RPC_URL || "NOT SET",
    relayKeyConfigured: !!RELAY_PRIVATE_KEY,
  };

  // Check EVM RPC
  if (RPC_URL) {
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const network = await provider.getNetwork();
      checks.evmRpc = { ok: true, chainId: Number(network.chainId) };
    } catch (e) {
      checks.evmRpc = { ok: false, error: (e as Error).message };
    }
  }

  // Check relay wallet balance
  if (RPC_URL && RELAY_PRIVATE_KEY) {
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const wallet = new ethers.Wallet(RELAY_PRIVATE_KEY, provider);
      const balance = await provider.getBalance(wallet.address);
      checks.relayWallet = {
        address: wallet.address,
        balance: ethers.formatEther(balance) + " 0G",
        hasFunds: balance > 0n,
      };
    } catch (e) {
      checks.relayWallet = { ok: false, error: (e as Error).message };
    }
  }

  // Check each indexer
  for (const url of indexerUrls) {
    try {
      const indexer = new Indexer(url);
      // Try to download a non-existent file — "file not found" = indexer is alive
      const err = await indexer.download(
        "0x0000000000000000000000000000000000000000000000000000000000000001",
        "/dev/null",
        false,
      );
      // If err says "not found" the indexer is reachable
      const msg = err ? String(err) : "no error";
      const alive = msg.toLowerCase().includes("not found") || !err;
      checks[`indexer:${url}`] = { ok: alive, response: msg };
    } catch (e) {
      const msg = (e as Error).message;
      const alive = msg.toLowerCase().includes("not found");
      checks[`indexer:${url}`] = { ok: alive, response: msg };
    }
  }

  return NextResponse.json(checks, {
    headers: { "Cache-Control": "no-store" },
  });
}
