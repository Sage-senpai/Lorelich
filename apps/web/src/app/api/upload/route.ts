import { NextRequest, NextResponse } from "next/server";
import { MemData, Indexer } from "@0glabs/0g-ts-sdk";
import { ethers } from "ethers";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/upload
// Server-side 0G Storage upload. Receives file from client, uploads to 0G.
// Returns { rootHash, txHash } for on-chain recording.
//
// Requires RELAY_PRIVATE_KEY env var — a funded wallet on the 0G Galileo
// testnet that pays the gas for storage submissions.
//
// Falls back to { rootHash, txHash: "" } if 0G is unavailable — the rootHash
// is still valid for on-chain recording; the DA proof just won't be live.
// ─────────────────────────────────────────────────────────────────────────────

const INDEXER_URL       = process.env.NEXT_PUBLIC_0G_INDEXER_URL ?? "";
const RPC_URL           = process.env.NEXT_PUBLIC_0G_RPC ?? "";
const RELAY_PRIVATE_KEY = process.env.RELAY_PRIVATE_KEY ?? "";

export async function POST(req: NextRequest) {
  // ── 1. Parse form data ──────────────────────────────────────────────────────
  let file: File | null;
  try {
    const formData = await req.formData();
    file = formData.get("file") as File | null;
  } catch (err) {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const MAX_SIZE = 500 * 1024 * 1024; // 500 MB
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: `File too large. Max ${MAX_SIZE / (1024 * 1024)}MB.` },
      { status: 400 }
    );
  }

  // ── 2. Build merkle tree to get rootHash ────────────────────────────────────
  let rootHash: string;
  try {
    // Buffer is required by 0G SDK (Uint8Array causes issues in some versions)
    const bytes  = Buffer.from(await file.arrayBuffer());
    const zgFile = new MemData(bytes);

    const [tree, treeErr] = await zgFile.merkleTree();
    if (treeErr) throw new Error(String(treeErr));
    rootHash = tree!.rootHash()!;
  } catch (err) {
    console.error("[Upload API] merkle tree error:", err);
    return NextResponse.json(
      { error: `Merkle tree failed: ${(err as Error).message}` },
      { status: 500 }
    );
  }

  // ── 3. Attempt 0G storage upload ────────────────────────────────────────────
  // If anything fails here, we return rootHash with empty txHash so the
  // contract call can still proceed (ownership is recorded on-chain).
  if (!INDEXER_URL || !RPC_URL || !RELAY_PRIVATE_KEY) {
    console.warn("[Upload API] 0G not fully configured — rootHash only");
    return NextResponse.json({ rootHash, txHash: "" });
  }

  try {
    // Re-create MemData for upload (merkle tree step consumed it)
    const bytes2  = Buffer.from(await file.arrayBuffer());
    const zgFile2 = new MemData(bytes2);

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet   = new ethers.Wallet(RELAY_PRIVATE_KEY, provider);
    const indexer  = new Indexer(INDEXER_URL);

    const [result, uploadErr] = await (indexer as any).upload(zgFile2, RPC_URL, wallet);
    if (uploadErr) throw new Error(String(uploadErr));

    return NextResponse.json({ rootHash, txHash: result?.txHash ?? "" });
  } catch (err) {
    // 0G upload failed — still return rootHash so the flow can complete
    console.error("[Upload API] 0G upload failed (rootHash returned):", err);
    return NextResponse.json({ rootHash, txHash: "" });
  }
}
