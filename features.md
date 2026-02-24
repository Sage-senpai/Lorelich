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

## V2 Features (Shipped)

### 15. Proverb Extraction Engine

Extract timeless wisdom proverbs from story text using LoreLich AI.

**API** (`/api/proverb/extract`):
- Groq with cultural scholar system prompt
- Input: `{ storyId, storyText (max 2000 chars), title, vaultName }`
- Returns: `{ proverb, culturalContext, culture? }`

**UI** (`/proverbs`):
- Vault → story selector to choose source story
- Textarea pre-fills from story text; user can trim to 2000 chars
- Proverb cards with copy-to-clipboard and delete
- localStorage persistence (`lorelich_proverbs`)

### 16. Semantic Story Search

Natural language search across all public vault stories.

**API** (`/api/search`):
- Groq AI semantic ranking of stories against query
- Input: `{ query, stories: SearchStoryInput[] }` — max 300 stories
- Returns: `[{ storyId, relevanceScore: 0-100, reason }]` sorted by score

**UI** (`/search`):
- Fetches all public stories on load (via contract batch reads)
- Score bar visualization per result
- Shows corpus count when idle, result count after search

---

## V2.1 Features (Shipped)

### 17. 0G Storage Retrieval (Complete Read/Write Round-Trip)

Stories can now be fetched back from 0G Storage and viewed in-browser.

**API** (`GET /api/download?rootHash=0x...`):
- `Indexer.download(rootHash, tmpFile, false)` — writes to temp file, streams bytes to client
- `Cache-Control: immutable` (content-addressed: same hash = same bytes forever)
- Returns `application/octet-stream`

**StoryViewer component**:
- Fetches from `/api/download`, optionally decrypts (private vaults) via Web Crypto
- Renders: scrollable text | `<img>` | `<audio controls>` | download-only fallback
- "↓ Download" link always present in footer

**Vault integration**: "View" button on every story card opens StoryViewer modal.

### 18. Mobile Navigation

Hamburger menu (`MobileNav.tsx`) for viewports below `md` breakpoint.
- Animated slide-down with all 7 nav links
- CSS-only animated three-line → X transition on toggle

### Bug Fixes Applied (V2.1)
- `linkedCount` double-count in tree constellation (was filter result + full array length)
- `pitch/[storyId]` — BigInt crash on non-numeric URL segment (wrapped in try-catch IIFE)
- `LicenseTermsForm` stale initial state (useState with async hook value; fixed with `useEffect` + `useRef`)
- `AncestorStoryLinker` unlink on confirmed stories was no-op (called `dismissLink` not `removeConfirmedLink`)
- `AncestorStoryLinker` panel overlapped by nav bar (`top-0` → `top-14`)
- Upload route: txHash destructuring extracted entire result object (fixed: `result?.txHash`)
- File input `accept` missing `.pdf,.docx,.rtf`

---

## V2.2 Features (Shipped)

### 19. Public Story Share Page

Shareable URL for any story at `/story/[storyId]`.

- Fetches story + vault metadata from contract (no wallet required)
- Shows: title, vault, media type, duration, timestamp, 0G root hash
- IP terms badges if story is licensable (commercialUse, royalty price)
- "View Story" button opens StoryViewer modal for public stories
- Private stories show locked state with access request instructions
- "Film Pitch →" link if story is commercially licensable
- Detail rows: uploader address, full root hash, vault ID
- "Copy Link" button for sharing

### 20. Story Tags (0G KV Store + localStorage)

Inline tag editor on every story card in the vault dashboard.

**Storage**: localStorage primary (`lorelich_tags_{rootHash}`); 0G KV read
on mount via `GET /api/kv/tag?rootHash=0x...` (merged into local state).

**API** (`/api/kv/tag`):
- `KvClient(NEXT_PUBLIC_0G_KV_URL)` reads from the 0G decentralized KV store
- Stream key = LoreLich fixed stream ID; KV key = rootHash bytes
- Tags stored as comma-separated UTF-8 string
- Graceful degradation: returns `{ tags: [] }` if KV unconfigured or unavailable

**UI** (`StoryTags.tsx`):
- Pill chips per tag with ×-on-hover remove
- Inline `<input>` activated by "+ tag" button; Enter or comma commits tag
- Max 8 tags, max 30 chars per tag; Backspace removes last tag
- No page reload; persists instantly to localStorage

### 21. Story Transcript (Groq Whisper)

One-click transcription of audio stories using Groq's Whisper large v3.

**API** (`POST /api/transcript`):
- Downloads audio from 0G Storage via `Indexer.download()` to temp file
- Wraps file in `toFile()` uploadable for multipart upload
- Calls `client.audio.transcriptions.create({ file, model: "whisper-large-v3" })`
- 25 MB size cap (Groq free tier limit); rate limited (shared 10 RPM/IP)
- Returns `{ text, language }`

**UI** (`TranscriptButton.tsx`):
- Shows only for `mediaType === "audio"` stories
- "📝 Transcribe Audio" button → animated "Transcribing…" loading state
- Transcript displayed in collapsible vault-glass panel below the button
- Cached in localStorage (`lorelich_transcript_{rootHash}`) — survives reload
- ✕ button clears cached transcript; timestamp + language shown in footer

### 22. Private Vault Access Grants UI

Vault owners can grant/revoke read access from the vault header.

**Contract**: `grantAccess(vaultId, grantee)` and `revokeAccess(vaultId, grantee)` (already in ABI).

**UI** (`AccessGrantModal.tsx`):
- "🔑 Access" button shown only when connected wallet owns a private vault
- Address input → `grantAccess` call with `gas: BigInt(200_000)`
- Active grants list with "Revoke" button per entry
- LocalStorage persistence of grant history (`lorelich_access_{vaultId}`)
- `isAddress()` validation from viem before any contract call

### 23. Certificate of Preservation

Printable, verifiable proof-of-preservation document for any story.

**UI** (`CertificateModal.tsx`):
- "📜 Cert" button on every story card in vault dashboard
- Client-side only — no server round-trip, no PDF library
- `@media print` CSS hides overlay, shows only white-background certificate
- "🖨 Print / Save as PDF" → `window.print()`
- Certificate contains: title, vault name, media type, uploader address,
  date + Unix timestamp, 0G Merkle Root Hash, soulbound token ID,
  LoreVault contract address, verification instructions
- Verification section explains how to use `indexer.download(rootHash, ...)` to
  independently verify the content

---

## V3 Features

- AI voice synthesis (consent-based, revocable on-chain)
- Community governance ($LORE token, Snapshot DAO)
- Collaborative multi-custodian vaults
- 0G KV Store write path (Batcher + StreamDataBuilder for tags sync across devices)

## V4+ Features

- Indigenous language expansion
- Premium storage tiers
- NFT drops from culturally significant stories (community-governed)
- Impact analytics dashboard
- Offline support (PWA + local storage cache)
