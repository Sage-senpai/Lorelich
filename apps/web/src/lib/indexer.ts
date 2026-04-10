import { Indexer } from "@0gfoundation/0g-ts-sdk";

/**
 * 0G Storage Indexer — uses the turbo indexer (standard is defunct).
 *
 * Environment:
 *   NEXT_PUBLIC_0G_INDEXER_URL — primary turbo indexer
 *   NEXT_PUBLIC_0G_INDEXER_FALLBACK_URL — optional second indexer
 */
const PRIMARY_URL  = process.env.NEXT_PUBLIC_0G_INDEXER_URL ?? "";
const FALLBACK_URL = process.env.NEXT_PUBLIC_0G_INDEXER_FALLBACK_URL ?? "";

/** Returns ordered list of configured indexer URLs (primary first). */
export function getIndexerUrls(): string[] {
  const urls: string[] = [];
  if (PRIMARY_URL)  urls.push(PRIMARY_URL);
  if (FALLBACK_URL) urls.push(FALLBACK_URL);
  return urls;
}

/**
 * Downloads a file from 0G Storage with automatic fallback.
 * Tries the primary indexer first, then the fallback if it fails.
 */
export async function downloadWithFallback(
  rootHash: string,
  destPath: string,
): Promise<void> {
  const urls = getIndexerUrls();
  if (urls.length === 0) throw new Error("No 0G indexer URLs configured.");

  let lastError: Error | null = null;

  for (const url of urls) {
    try {
      const indexer = new Indexer(url);
      const err = await indexer.download(rootHash, destPath, true);
      if (err) throw err;
      return; // success
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      console.warn(`[0G] Indexer ${url} failed: ${lastError.message}, trying next...`);
    }
  }

  throw lastError ?? new Error("All 0G indexers failed.");
}

/**
 * Uploads a file to 0G Storage with automatic fallback.
 * Returns { txHash, rootHash } from the successful upload.
 *
 * The new SDK (v1.2.1) returns either:
 *   { rootHash, txHash }       — single file (<4GB)
 *   { rootHashes[], txHashes[] } — fragmented file (>4GB)
 */
export async function uploadWithFallback(
  zgFile: any,
  rpcUrl: string,
  wallet: any,
): Promise<{ txHash: string; rootHash?: string }> {
  const urls = getIndexerUrls();
  if (urls.length === 0) throw new Error("No 0G indexer URLs configured.");

  let lastError: Error | null = null;

  for (const url of urls) {
    try {
      const indexer = new Indexer(url);
      const [tx, uploadErr] = await indexer.upload(zgFile, rpcUrl, wallet);
      if (uploadErr) throw new Error(String(uploadErr));

      // Handle single vs fragmented response
      if ("rootHash" in tx) {
        return { txHash: tx.txHash, rootHash: tx.rootHash };
      } else {
        return { txHash: tx.txHashes[0], rootHash: tx.rootHashes[0] };
      }
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      console.warn(`[0G] Upload via ${url} failed: ${lastError.message}, trying next...`);
    }
  }

  throw lastError ?? new Error("All 0G indexers failed.");
}
