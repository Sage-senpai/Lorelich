// ─────────────────────────────────────────────────────────────────────────────
// 0G Storage integration
// Wraps @0glabs/0g-ts-sdk for LoreLich story upload / download
// ─────────────────────────────────────────────────────────────────────────────

import type { ZeroGUploadResult } from "@/types";

const INDEXER_URL = process.env.NEXT_PUBLIC_0G_INDEXER_URL!;
const RPC_URL     = process.env.NEXT_PUBLIC_0G_RPC!;

// File size limits (bytes)
const MAX_SIZE: Record<string, number> = {
  audio: 200 * 1024 * 1024,  // 200 MB
  video: 500 * 1024 * 1024,  // 500 MB
  text:   10 * 1024 * 1024,  //  10 MB
  image:  50 * 1024 * 1024,  //  50 MB
};

const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  audio: ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/aac"],
  video: ["video/mp4", "video/webm"],
  text:  ["text/plain", "text/markdown", "application/json"],
  image: ["image/jpeg", "image/png", "image/webp"],
};

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

export function validateFile(file: File, mediaType: string): void {
  const maxSize = MAX_SIZE[mediaType];
  if (!maxSize) throw new Error(`Unsupported media type: ${mediaType}`);
  if (file.size > maxSize) {
    throw new Error(
      `File too large. Max ${maxSize / (1024 * 1024)}MB for ${mediaType}.`
    );
  }

  const allowed = ALLOWED_MIME_TYPES[mediaType];
  if (allowed && !allowed.includes(file.type)) {
    throw new Error(`File type ${file.type} not allowed for ${mediaType}.`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload
// ─────────────────────────────────────────────────────────────────────────────

export async function uploadToZeroG(
  fileData: Uint8Array,
  fileName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  walletClient: any,
  onProgress?: (pct: number) => void
): Promise<ZeroGUploadResult> {
  // Dynamic import to avoid SSR issues with the 0G SDK
  const { ZgFile, Indexer } = await import("@0glabs/0g-ts-sdk");

  onProgress?.(10);

  const blob = new Blob([fileData]);
  const file = new File([blob], fileName);

  const zgFile = await ZgFile.fromFile(file);
  onProgress?.(25);

  const [tree, treeErr] = await zgFile.merkleTree();
  if (treeErr) throw new Error(`0G merkle tree error: ${treeErr}`);
  onProgress?.(40);

  const indexer = new Indexer(INDEXER_URL);
  const [txHash, uploadErr] = await indexer.upload(zgFile, RPC_URL, walletClient);
  if (uploadErr) throw new Error(`0G upload error: ${uploadErr}`);
  onProgress?.(90);

  const rootHash = tree!.rootHash()!;
  onProgress?.(100);

  return { rootHash, txHash: txHash! };
}

// ─────────────────────────────────────────────────────────────────────────────
// Download
// ─────────────────────────────────────────────────────────────────────────────

export async function downloadFromZeroG(rootHash: string): Promise<Uint8Array> {
  const { Indexer } = await import("@0glabs/0g-ts-sdk");

  const indexer = new Indexer(INDEXER_URL);
  const [data, err] = await indexer.download(rootHash, true);
  if (err) throw new Error(`0G download error: ${err}`);
  return data!;
}

// ─────────────────────────────────────────────────────────────────────────────
// Verify (DA Proof)
// ─────────────────────────────────────────────────────────────────────────────

export async function verifyOnZeroG(rootHash: string): Promise<boolean> {
  const { Indexer } = await import("@0glabs/0g-ts-sdk");

  const indexer = new Indexer(INDEXER_URL);
  const [exists] = await indexer.fileExists(rootHash);
  return !!exists;
}
