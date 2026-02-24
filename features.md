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
- **Import File**: MP3, WAV, M4A (audio) | MP4, WebM (video) | TXT, MD, JSON, DOCX (text) | JPEG, PNG, WebP (image)
- **Write Story**: Compose text directly in-browser (up to 50,000 chars) — no file needed
- File size limits enforced client-side
- Audio/video duration auto-detected via HTML5 media API
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
- Groq `llama-3.3-70b-versatile` (free tier — no credit card required)
- Cultural system prompt: "You are the LoreLich, guardian of ancestral stories. Speak with wisdom and reverence..."
- Users can ask questions about a story, request summaries, generate proverbs
- Input sanitized against prompt injection (client + server side)
- Rate limited: 10 requests/minute per IP (in-memory; upgrade to Redis for production)

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

## V1.5 Features (Scalability Phase — Shipped)

### 12. IP Licensing Layer (`LoreIPModule.sol`)

On-chain programmable license terms and royalty distribution.

**Contract** (deployed `0x036eACE959adb91BdD35b7c1cf607B0133545968`):
- `setTerms(storyId, ...)` — vault owner sets isLicensable, royaltyWei, commercialUse, exclusiveAvailable, maxLicenses
- `requestLicense(storyId, licenseType, purposeNote)` payable — licensee submits payment with request
- `approveRequest(requestId, expirySeconds)` — owner approves; royalty minus 2.5% platform fee added to withdrawal balance
- `rejectRequest(requestId)` — owner rejects; full refund via pull pattern
- `withdraw()` — owner or feeRecipient pulls accumulated ETH
- EXCLUSIVE license type: sets `isLicensable = false` on approval

**UI**:
- `/marketplace` — filterable grid of all licensable public stories
- `🔑 License` button per story in vault dashboard → opens `LicenseTermsForm`
- Incoming Requests collapsible panel in vault for pending approvals
- `LicenseRequestModal` — select license type, write purpose note, pay royalty

**License Types**: PERSONAL | DOCUMENTARY | COMMERCIAL | EXCLUSIVE

### 13. Documentary Pitch Portal

AI-generated film treatment briefs for licensable stories.

**API** (`/api/pitch/generate`):
- Groq `llama-3.3-70b-versatile` with film development consultant system prompt
- Returns JSON: `{ logline, synopsis, themes[], visualApproach, comparables[], targetAudience }`
- Rate limited + injection guarded

**UI**:
- `/pitch` — lists commercial stories (`commercialUse: true`) with brief previews
- `/pitch/[storyId]` — full pitch page; `PitchGenerateButton` → reveals `PitchBriefCard`
- Sticky "Request License →" bar when brief is displayed
- AnimatePresence reveal animation on brief generation

### 14. Genealogy Tree Builder

GEDCOM-powered family tree linked to vault stories via AI.

**GEDCOM Parser** (pure client-side, no library):
- Handles INDI records: NAME, BIRT/DATE, BIRT/PLAC, DEAT/DATE
- Handles FAM records: HUSB, WIFE, CHIL
- Produces `GenealogyTree` with `Ancestor[]` and edge maps

**API** (`/api/genealogy/suggest`):
- Groq expert genealogist prompt matches ancestors to stories by surname/birthPlace/era overlap
- Returns `[{ ancestorId, storyId, confidence: "high"|"medium"|"low", reason }]`
- Max 200 ancestors, max 500 stories per request

**UI**:
- `/tree` — React Flow canvas (full-height, `@xyflow/react` v12)
- `AncestorNode` — circular custom node; brass glow if linked, aged glow if AI-suggested
- `GedcomImporter` — drag-and-drop zone for `.ged` files with "Found N ancestors" preview
- `AncestorStoryLinker` — right slide-in panel; Link/Unlink per story; AI Suggest button
- Generational BFS layout: roots at top, children cascade downward
- Brass smoothstep edges for parent-child; dashed straight edges for spouses
- localStorage persistence; optional 0G backup via existing upload route

---

## V2 Features

- Semantic search across public vaults
- AI voice synthesis (consent-based, revocable)
- Community governance ($LORE token)
- Collaborative multi-custodian vaults
- Proverb-of-the-day engine

## V3+ Features

- Indigenous language expansion
- Premium storage tiers
- NFT drops from culturally significant stories (community-governed)
- Impact analytics dashboard
- Offline support (PWA + local storage cache)
