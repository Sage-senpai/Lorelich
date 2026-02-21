// ─────────────────────────────────────────────────────────────────────────────
// Client-side AES-GCM 256 encryption via Web Crypto API
// Used for private vault story blobs before uploading to 0G Storage
// ─────────────────────────────────────────────────────────────────────────────

import type { EncryptedBlob } from "@/types";

const PBKDF2_ITERATIONS = 310_000;
const KEY_LENGTH        = 256;

// ─────────────────────────────────────────────────────────────────────────────
// Key Derivation
// ─────────────────────────────────────────────────────────────────────────────

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name:       "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash:       "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Encrypt
// ─────────────────────────────────────────────────────────────────────────────

export async function encryptBlob(
  data: ArrayBuffer,
  walletAddress: string
): Promise<EncryptedBlob> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv   = crypto.getRandomValues(new Uint8Array(12));

  // Derive key from wallet address + global salt
  const password = `${walletAddress}:${process.env.NEXT_PUBLIC_APP_URL ?? "lorelich"}`;
  const key = await deriveKey(password, salt);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );

  return { ciphertext, iv, salt };
}

// ─────────────────────────────────────────────────────────────────────────────
// Decrypt
// ─────────────────────────────────────────────────────────────────────────────

export async function decryptBlob(
  encrypted: EncryptedBlob,
  walletAddress: string
): Promise<ArrayBuffer> {
  const password = `${walletAddress}:${process.env.NEXT_PUBLIC_APP_URL ?? "lorelich"}`;
  const key = await deriveKey(password, encrypted.salt);

  return crypto.subtle.decrypt(
    { name: "AES-GCM", iv: encrypted.iv },
    key,
    encrypted.ciphertext
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Encode EncryptedBlob as a single Uint8Array: [salt(16) | iv(12) | ciphertext] */
export function packEncryptedBlob(blob: EncryptedBlob): Uint8Array {
  const ct   = new Uint8Array(blob.ciphertext);
  const out  = new Uint8Array(16 + 12 + ct.length);
  out.set(blob.salt,  0);
  out.set(blob.iv,   16);
  out.set(ct,        28);
  return out;
}

/** Decode a packed Uint8Array back into EncryptedBlob */
export function unpackEncryptedBlob(packed: Uint8Array): EncryptedBlob {
  return {
    salt:       packed.slice(0, 16),
    iv:         packed.slice(16, 28),
    ciphertext: packed.slice(28).buffer,
  };
}

/** Hash a string to a hex string (SHA-256) — used for encryptedKeyHash on-chain */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
