import { decryptBlob, unpackEncryptedBlob } from "@/lib/encryption";

/**
 * Fetches story content from 0G via /api/download, decrypts if private,
 * and returns the decoded text. Only works for text stories.
 */
export async function fetchStoryContent(
  rootHash: string,
  isPrivate: boolean,
  address?: string,
): Promise<string> {
  const res = await fetch(`/api/download?rootHash=${encodeURIComponent(rootHash)}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Download failed (HTTP ${res.status})`);
  }

  let bytes = new Uint8Array(await res.arrayBuffer());

  if (isPrivate) {
    if (!address) throw new Error("Connect your wallet to read this private story.");
    const encrypted = unpackEncryptedBlob(bytes);
    const decrypted = await decryptBlob(encrypted, address);
    bytes = new Uint8Array(decrypted);
  }

  return new TextDecoder().decode(bytes);
}
