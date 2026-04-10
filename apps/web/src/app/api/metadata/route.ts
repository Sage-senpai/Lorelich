import { NextRequest, NextResponse } from "next/server";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/metadata?rootHash=0x...
// Returns ERC721-compatible JSON metadata for a story NFT.
// This is the endpoint that tokenURI points to, so chain explorers
// and wallets can display NFT info correctly.
// ─────────────────────────────────────────────────────────────────────────────

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://lorerich-vault.vercel.app";

const ROOT_HASH_RE = /^0x[0-9a-fA-F]{64}$/;

export async function GET(req: NextRequest) {
  const rootHash = req.nextUrl.searchParams.get("rootHash");

  if (!rootHash || !ROOT_HASH_RE.test(rootHash)) {
    return NextResponse.json({ error: "Invalid or missing rootHash." }, { status: 400 });
  }

  const metadata = {
    name: "LoreRich Story",
    description: "An ancestral story permanently archived on 0G decentralized storage via LoreRich Vault.",
    external_url: `${APP_URL}/story/${rootHash}`,
    attributes: [
      { trait_type: "Storage", value: "0G Network" },
      { trait_type: "Root Hash", value: rootHash },
    ],
  };

  return NextResponse.json(metadata, {
    headers: {
      "Cache-Control": "public, max-age=86400",
    },
  });
}
