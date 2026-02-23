# LoreLich Vault — 0G Storage Integration

## What is 0G?

0G (Zero Gravity) is a modular decentralized AI operating system with:
- **0G Storage**: Decentralized object storage with on-chain merkle proofs
- **0G DA**: Data Availability layer with verifiable proofs
- **0G Chain**: EVM-compatible L1 (Newton Testnet: chain ID 16602)

LoreLich uses 0G Storage for story blobs (audio, video, text) and 0G DA for verifiable upload proofs.

---

## SDK Setup

```bash
bun add @0glabs/0g-ts-sdk viem
```

---

## Architecture

```
User uploads story
       │
       ▼
Client-side AES-GCM encryption (private vaults)
       │
       ▼
0G Storage upload via SDK → returns { rootHash, txHash }
       │
       ▼
LoreVault.uploadStory(vaultId, rootHash, encryptedKey, mediaType) on-chain
       │
       ▼
SoulboundStory.mint(owner, storyId, tokenURI) — ownership proof
       │
       ▼
DA proof stored in contract → verifiable by anyone
```

---

## Core Integration (`apps/web/src/lib/zerog.ts`)

```ts
import { ZgFile, Indexer } from "@0glabs/0g-ts-sdk";
import { createWalletClient, http } from "viem";

const INDEXER_URL = process.env.NEXT_PUBLIC_0G_INDEXER_URL!;
const RPC_URL     = process.env.NEXT_PUBLIC_0G_RPC!;

export async function uploadToZeroG(
  file: File,
  walletClient: ReturnType<typeof createWalletClient>
): Promise<{ rootHash: string; txHash: string }> {
  const zgFile = await ZgFile.fromFile(file);
  const [tree, err] = await zgFile.merkleTree();
  if (err) throw new Error(`Merkle tree error: ${err}`);

  const indexer = new Indexer(INDEXER_URL);
  const [txHash, uploadErr] = await indexer.upload(zgFile, RPC_URL, walletClient);
  if (uploadErr) throw new Error(`Upload error: ${uploadErr}`);

  return {
    rootHash: tree!.rootHash()!,
    txHash: txHash!,
  };
}

export async function downloadFromZeroG(rootHash: string): Promise<Uint8Array> {
  const indexer = new Indexer(INDEXER_URL);
  const [data, err] = await indexer.download(rootHash, true);
  if (err) throw new Error(`Download error: ${err}`);
  return data!;
}
```

---

## Encryption Flow (Private Vaults)

```ts
// apps/web/src/lib/encryption.ts

export async function encryptBlob(
  data: ArrayBuffer,
  password: string
): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array; salt: Uint8Array }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv   = crypto.getRandomValues(new Uint8Array(12));
  const key  = await deriveKey(password, salt);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );
  return { ciphertext, iv, salt };
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 310_000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}
```

The encrypted key is stored **on-chain** per authorized address. Private vault = encrypted blob on 0G, decryption key only accessible to authorized wallets.

---

## Verifiable DA Proof

After upload, the `rootHash` from 0G is stored in `LoreVault`:

```solidity
struct StoryMetadata {
    address uploader;
    uint256 vaultId;
    string  zgRootHash;    // 0G merkle root — verifiable
    string  mediaType;     // "audio" | "video" | "text"
    uint256 duration;      // seconds (audio/video)
    bool    isPrivate;
    uint256 timestamp;
}
```

Anyone can verify a story exists on 0G:

```ts
import { Indexer } from "@0glabs/0g-ts-sdk";

const indexer = new Indexer(INDEXER_URL);
const [exists] = await indexer.fileExists(rootHash);
console.log("Story verifiably on 0G:", exists);
```

---

## File Size Limits

| Media Type | Max Size | Notes |
|---|---|---|
| Audio | 200 MB | MP3, WAV, M4A |
| Video | 500 MB | MP4, WebM |
| Text | 10 MB | JSON, TXT, MD |
| Image | 50 MB | JPG, PNG, WebP |

Enforce limits client-side before upload to avoid wasted gas.

---

## Testnet Faucet

Get 0G testnet tokens: `https://faucet.0g.ai`

Wallet needs A0GI tokens to pay for:
1. 0G storage transaction gas
2. LoreVault contract interaction gas
