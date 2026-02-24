# LoreLich Vault — 0G Storage Integration

## What is 0G?

0G (Zero Gravity) is a modular decentralized AI operating system with:
- **0G Storage** — Decentralized object storage with on-chain merkle proofs
- **0G DA** — Data Availability layer with verifiable proofs
- **0G Chain** — EVM-compatible L1 (Galileo Testnet: chain ID 16601)
- **0G KV** — Decentralized key-value store built on 0G Storage

LoreLich uses **0G Storage** for the full story lifecycle: upload (write) and download (read), with 0G Chain for all smart contract interactions.

---

## SDK

```bash
npm install @0glabs/0g-ts-sdk
```

Version used: `^0.3.3`. The SDK is Node.js-only (uses `fs`, `node:crypto`) — all SDK calls are made from Next.js API routes, never in the browser.

---

## Architecture — Full Read/Write Cycle

```
WRITE (upload):
  User picks file in browser
        │
        ▼
  Client-side AES-GCM encryption   ← private vaults only
        │
        ▼
  POST /api/upload (server-side)
        │
        ├── MemData(bytes).merkleTree() → rootHash
        │
        └── Indexer.upload(zgFile, rpc, relayWallet) → { txHash, rootHash }
        │
        ▼
  LoreVault.uploadStory({ vaultId, zgRootHash, ... }) on-chain
        │
        ▼
  SoulboundStory.mint(owner, storyId, tokenURI)

READ (download):
  User clicks "View" on story in vault
        │
        ▼
  GET /api/download?rootHash=0x...
        │
        └── Indexer.download(rootHash, tmpFile, false)
               → reads tmpFile → returns bytes
        │
        ▼
  Client receives bytes
        │
        ├── If private: unpackEncryptedBlob → decryptBlob(bytes, walletAddress)
        │
        └── Render: text / <img> / <audio> / download link
```

---

## Upload Implementation (`/api/upload`)

```ts
import { MemData, Indexer } from "@0glabs/0g-ts-sdk";
import { ethers } from "ethers";

const INDEXER_URL = process.env.NEXT_PUBLIC_0G_INDEXER_URL!;
const RPC_URL     = process.env.NEXT_PUBLIC_0G_RPC!;

// Server-side relay wallet — pays 0G storage gas so users don't need A0GI
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet   = new ethers.Wallet(process.env.RELAY_PRIVATE_KEY!, provider);

// Step 1: build merkle tree to get rootHash (done before upload so we can
//         return it even if 0G upload fails — on-chain recording still works)
const bytes  = Buffer.from(await file.arrayBuffer());
const zgFile = new MemData(bytes);
const [tree, treeErr] = await zgFile.merkleTree();
if (treeErr) throw treeErr;
const rootHash = tree!.rootHash()!;

// Step 2: upload to 0G Storage
const indexer = new Indexer(INDEXER_URL);
// upload() returns [{ txHash, rootHash }, Error | null]
const [result, uploadErr] = await indexer.upload(zgFile, RPC_URL, wallet);
if (uploadErr) throw uploadErr;

return { rootHash, txHash: result?.txHash ?? "" };
```

**Relay Wallet Pattern**: A server-side funded wallet (`RELAY_PRIVATE_KEY`) pays for 0G storage submission. Users only need gas for contract writes (createVault, uploadStory), not for 0G storage separately.

**Fallback**: If 0G upload fails (testnet instability), the server returns `{ rootHash, txHash: "" }`. The on-chain `uploadStory` call proceeds with the locally-computed `rootHash`. Ownership is recorded; the file may not yet be retrievable from 0G nodes.

---

## Download Implementation (`/api/download`)

```ts
import { Indexer } from "@0glabs/0g-ts-sdk";
import * as os from "os";
import * as path from "path";
import * as fs from "fs/promises";
import * as crypto from "crypto";

const INDEXER_URL = process.env.NEXT_PUBLIC_0G_INDEXER_URL!;

// rootHash must be 0x + 64 hex chars
const tmpPath = path.join(os.tmpdir(), `lorelich-dl-${crypto.randomUUID()}`);
try {
  const indexer = new Indexer(INDEXER_URL);
  // download() saves to filePath, returns Error | null (not a tuple)
  const dlErr = await indexer.download(rootHash, tmpPath, false);
  if (dlErr) throw dlErr;

  const bytes = await fs.readFile(tmpPath);
  // Content-addressed → same hash always = same bytes → immutable cache
  return new Response(bytes, {
    headers: { "Cache-Control": "public, max-age=31536000, immutable" }
  });
} finally {
  fs.unlink(tmpPath).catch(() => {}); // always clean up temp file
}
```

**Content-addressed caching**: Because every rootHash deterministically maps to exactly one file, download responses carry `Cache-Control: immutable`. Browsers and CDNs can cache forever.

---

## Client-Side Decryption (Private Vaults)

Private vault stories are encrypted before upload and decrypted fully in-browser — no key material ever leaves the client.

```ts
// In browser (StoryViewer.tsx)
import { unpackEncryptedBlob, decryptBlob } from "@/lib/encryption";

const res   = await fetch(`/api/download?rootHash=${story.zgRootHash}`);
let bytes   = new Uint8Array(await res.arrayBuffer());

if (story.isPrivate) {
  const encrypted = unpackEncryptedBlob(bytes);
  // address + fixed domain string derives the AES key via PBKDF2 (310K iterations)
  const decrypted = await decryptBlob(encrypted, walletAddress);
  bytes = new Uint8Array(decrypted);
}

// bytes is now the original plaintext — render as text / image / audio
```

**Key derivation**: `password = "${walletAddress}:lorelich-vault-v1"`. The domain string `lorelich-vault-v1` is fixed forever — changing it breaks all existing encrypted files.

**Packed format**: `[salt(16 bytes) | iv(12 bytes) | ciphertext(N bytes)]` — self-contained, no separate key storage needed.

---

## Encryption Flow (write path)

```ts
// In browser (StoryUpload.tsx) — private vaults only
import { encryptBlob, packEncryptedBlob } from "@/lib/encryption";

const encrypted = await encryptBlob(fileBytes.buffer, walletAddress);
const packed    = packEncryptedBlob(encrypted); // Uint8Array: salt|iv|ciphertext
// packed is what gets sent to POST /api/upload
```

---

## Verifiable DA Proofs

The `zgRootHash` stored in `LoreVault.stories()` is the 0G merkle root. Anyone can verify independently:

```ts
import { Indexer } from "@0glabs/0g-ts-sdk";

const indexer = new Indexer(INDEXER_URL);
const nodes   = await indexer.getFileLocations(rootHash);
console.log(`Story replicated on ${nodes.length} 0G storage nodes`);
```

The `✓ 0G` badge in the vault UI confirms the rootHash is on-chain. Clicking **View** confirms the file is retrievable from 0G nodes — completing the full verifiable proof.

---

## 0G KV Store (Available — planned for V2.2)

The SDK includes a `KvClient` for the 0G decentralized key-value store:

```ts
import { KvClient } from "@0glabs/0g-ts-sdk";

const kv    = new KvClient(KV_RPC_URL);
const value = await kv.getValue(streamId, key);
```

Planned use: story tags, cultural annotations, transcript caching, and a per-wallet story index — reducing contract read calls for metadata that doesn't need on-chain finality.

---

## File Size Limits

| Media Type | Client limit | Server limit | Accepted formats |
|---|---|---|---|
| Audio | 200 MB | 500 MB | MP3, WAV, M4A, AAC, OGG, FLAC |
| Video | 500 MB | 500 MB | MP4, WebM, MOV |
| Text  | 10 MB  | 500 MB | TXT, MD, HTML, JSON, PDF, DOCX, RTF |
| Image | 50 MB  | 500 MB | JPEG, PNG, WebP, GIF |

Client limits enforced in `lib/zerog.ts:validateFile()`. Server enforces a 500 MB cap on all uploads.

---

## Testnet Setup

**Chain**: 0G Galileo Testnet (chain ID 16601)
**Faucet**: `https://faucet.0g.ai`

Tokens needed:
- **Relay wallet** (server-side): A0GI for 0G storage submission gas
- **User wallet**: A0GI for LoreVault contract interactions (createVault, uploadStory)
