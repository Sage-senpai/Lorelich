import { NextRequest, NextResponse } from "next/server";
import { MemData, Indexer } from "@0glabs/0g-ts-sdk";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/upload
// Server-side 0G Storage upload. Receives file from client, uploads to 0G.
// Returns { rootHash, txHash } for on-chain recording.
//
// NOTE: In production, this should use a session-based wallet or
// account abstraction. For the MVP, the server holds a funded relay wallet.
// ─────────────────────────────────────────────────────────────────────────────

const INDEXER_URL = process.env.NEXT_PUBLIC_0G_INDEXER_URL ?? "";
const RPC_URL     = process.env.NEXT_PUBLIC_0G_RPC ?? "";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file     = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    // Size limits
    const MAX_SIZE = 500 * 1024 * 1024; // 500MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `File too large. Max ${MAX_SIZE / (1024 * 1024)}MB.` },
        { status: 400 }
      );
    }

    // Convert web File to Uint8Array, then create 0G MemData (in-memory file)
    const bytes  = new Uint8Array(await file.arrayBuffer());
    const zgFile = new MemData(bytes);

    const [tree, treeErr] = await zgFile.merkleTree();
    if (treeErr) {
      return NextResponse.json(
        { error: `Merkle tree error: ${treeErr}` },
        { status: 500 }
      );
    }

    const rootHash = tree!.rootHash()!;

    // Upload to 0G storage via Indexer
    // NOTE: For the MVP, we use the server's funded relay wallet.
    // In production, use EIP-4337 account abstraction or session keys.
    if (!INDEXER_URL || !RPC_URL) {
      // 0G not configured — return rootHash so the contract call still works
      return NextResponse.json({ rootHash, txHash: "" });
    }

    const indexer = new Indexer(INDEXER_URL);
    const [txHash, uploadErr] = await (indexer as any).upload(zgFile, RPC_URL, undefined);
    if (uploadErr) {
      return NextResponse.json(
        { error: `0G upload error: ${uploadErr}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      rootHash,
      txHash: txHash ?? "",
    });
  } catch (err) {
    console.error("[Upload API]", err);
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 }
    );
  }
}
