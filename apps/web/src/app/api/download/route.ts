import { NextRequest, NextResponse } from "next/server";
import { Indexer } from "@0glabs/0g-ts-sdk";
import * as os from "os";
import * as path from "path";
import * as fsPromises from "fs/promises";
import * as crypto from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/download?rootHash=0x...
// Server-side 0G Storage retrieval. Downloads a file by its merkle root hash.
//
// Content-addressing means every rootHash maps to exactly one immutable file,
// so responses are cached immutably (Cache-Control: immutable).
//
// Private vault stories are stored encrypted — the client handles decryption
// using its own wallet address (Web Crypto, no key material sent to server).
// ─────────────────────────────────────────────────────────────────────────────

const INDEXER_URL = process.env.NEXT_PUBLIC_0G_INDEXER_URL ?? "";

// Root hash must be 0x + 64 hex chars (32 bytes)
const ROOT_HASH_RE = /^0x[0-9a-fA-F]{64}$/;

export async function GET(req: NextRequest) {
  const rootHash = req.nextUrl.searchParams.get("rootHash");

  if (!rootHash) {
    return NextResponse.json({ error: "Missing rootHash param." }, { status: 400 });
  }
  if (!ROOT_HASH_RE.test(rootHash)) {
    return NextResponse.json({ error: "Invalid rootHash format." }, { status: 400 });
  }
  if (!INDEXER_URL) {
    return NextResponse.json(
      { error: "0G indexer not configured on this server." },
      { status: 503 }
    );
  }

  // Use a UUID-named temp file so parallel requests never collide
  const tmpPath = path.join(os.tmpdir(), `lorelich-dl-${crypto.randomUUID()}`);

  try {
    const indexer = new Indexer(INDEXER_URL);

    // Indexer.download saves the file to tmpPath and returns Error | null
    const dlErr = await indexer.download(rootHash, tmpPath, false);
    if (dlErr) throw dlErr;

    const bytes = await fsPromises.readFile(tmpPath);

    // Content-addressed: same rootHash always yields the same bytes → immutable cache
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type":  "application/octet-stream",
        "Content-Length": String(bytes.length),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-0G-Root-Hash": rootHash,
      },
    });
  } catch (err) {
    const msg = (err as Error).message ?? String(err);
    console.error("[Download API] failed:", msg);
    return NextResponse.json(
      { error: `0G retrieval failed: ${msg}` },
      { status: 502 }
    );
  } finally {
    // Always clean up temp file — fire-and-forget is fine
    fsPromises.unlink(tmpPath).catch(() => {});
  }
}
