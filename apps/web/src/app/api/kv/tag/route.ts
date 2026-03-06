import { NextRequest, NextResponse } from "next/server";
import { KvClient } from "@0glabs/0g-ts-sdk";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/kv/tag?rootHash=0x...
// Reads story tags from the 0G KV Store.
//
// 0G KV is a decentralized key-value store built on 0G Storage.
// StreamId is a fixed LoreRich-owned stream. Key = rootHash bytes.
// Tags are stored as a UTF-8 comma-separated string.
//
// Returns: { tags: string[] }
// Falls back to { tags: [] } if KV is not configured or unavailable.
// ─────────────────────────────────────────────────────────────────────────────

const KV_RPC_URL   = process.env.NEXT_PUBLIC_0G_KV_URL ?? "";
const KV_STREAM_ID = process.env.NEXT_PUBLIC_0G_KV_STREAM_ID ?? "";

const ROOT_HASH_RE = /^0x[0-9a-fA-F]{64}$/;

export async function GET(req: NextRequest) {
  const rootHash = req.nextUrl.searchParams.get("rootHash");

  if (!rootHash || !ROOT_HASH_RE.test(rootHash)) {
    return NextResponse.json({ error: "Invalid or missing rootHash." }, { status: 400 });
  }

  // If KV is not configured, return empty gracefully
  if (!KV_RPC_URL || !KV_STREAM_ID) {
    return NextResponse.json({ tags: [], source: "unconfigured" });
  }

  try {
    const kv = new KvClient(KV_RPC_URL);
    // Key: the rootHash stripped to 32 bytes, encoded as a hex Buffer
    const keyBytes = Buffer.from(rootHash.slice(2), "hex");
    // getValue returns a Value object with .data: Uint8Array | null
    const value = await (kv as any).getValue(KV_STREAM_ID, keyBytes);

    if (!value || !value.data || value.data.length === 0) {
      return NextResponse.json({ tags: [], source: "0g-kv" });
    }

    const csv  = Buffer.from(value.data).toString("utf-8");
    const tags = csv.split(",").map((t: string) => t.trim()).filter(Boolean);
    return NextResponse.json({ tags, source: "0g-kv" });
  } catch (err) {
    // KV node unavailable — degrade gracefully
    console.warn("[KV Tag API] read failed:", (err as Error).message);
    return NextResponse.json({ tags: [], source: "error" });
  }
}

// Only GET for now; writes happen client-side (localStorage) or via
// on-chain Batcher transactions initiated by the story owner wallet.
export function POST() {
  return NextResponse.json({ error: "Tag writes are managed client-side." }, { status: 405 });
}
