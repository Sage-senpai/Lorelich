# LoreLich Vault — Feature Specifications

## V1 Features (Launch)

### 1. Wallet Login
- EVM wallet connection (MetaMask, WalletConnect, Coinbase Wallet)
- ConnectKit UI with dark academia styling
- Session persistence via wagmi
- Disconnect clears all sensitive local state

### 2. Vault Dashboard
- List of user's vaults (public + private)
- Vault creation modal (name, visibility)
- Story count per vault
- Frosted glass card UI

### 3. Story Upload
- Supported: MP3, WAV, M4A (audio) | MP4, WebM (video) | TXT, MD, JSON (text)
- File size limits enforced client-side
- Progress indicator during 0G upload
- Private vault: client-side AES-GCM encryption before upload

### 4. Client-Side Encryption
- AES-GCM 256-bit via Web Crypto API
- Key derived from wallet signature (PBKDF2, 310K iterations)
- Encrypted blob uploaded to 0G
- Decryption key hash stored on-chain per authorized address

### 5. 0G Storage Upload
- Upload via `@0glabs/0g-ts-sdk`
- Returns merkle rootHash and txHash
- rootHash stored on-chain as verifiable DA proof

### 6. Soulbound Ownership Mint
- ERC5192 non-transferable NFT minted per story
- tokenURI points to story metadata (IPFS or Arweave)
- Emits `Locked` event — permanently locked at mint

### 7. AI Query / Remix Engine (LoreLich)
- Claude `claude-sonnet-4-6` with cultural system prompt
- System prompt: "You are the LoreLich, guardian of ancestral stories. Speak with wisdom and reverence..."
- Users can ask questions about a story, request summaries, generate proverbs
- Input sanitized against prompt injection
- Rate limited: 10 requests/minute per IP

### 8. Private vs Public Vaults
- Public: story metadata + blob accessible to anyone with the rootHash
- Private: blob encrypted; only vault owner + granted addresses can decrypt

### 9. Verifiable DA Proofs
- On-chain: `zgRootHash` per story
- Anyone can verify via 0G indexer: `indexer.fileExists(rootHash)`
- Proof displayed in UI with "Verified on 0G" badge

### 10. Playback UI with Waveform
- WaveSurfer.js audio waveform
- Play/pause/seek
- Duration display
- Loading skeleton while waveform initializes

### 11. LoreLich Cultural System Prompt
```
You are the LoreLich, guardian of ancestral stories and keeper of the vault.
Speak with wisdom, reverence, and cultural sensitivity.
You help users explore, understand, and honor the stories in their vaults.
Never mock, diminish, or commercialize the stories entrusted to you.
When asked about a story, respond as if you have witnessed centuries of human memory.
You do not make up facts. You reflect what is in the vault.
```

---

## V2 Features

- Semantic search across public vaults
- AI voice synthesis (consent-based, revocable)
- Community governance ($LORE token)
- Collaborative multi-custodian vaults
- Genealogy builder (family tree linked to stories)
- Proverb-of-the-day engine

## V3+ Features

- Indigenous language expansion
- Premium storage tiers
- NFT drops from culturally significant stories (community-governed)
- Impact analytics dashboard
- Offline support (PWA + local storage cache)
