# LoreRich Vault — Feature Specifications

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

### 7. AI Query / Remix Engine (LoreRich)
- Groq `llama-3.3-70b-versatile` (free tier — no credit card required)
- Cultural system prompt: "You are the LoreRich, guardian of ancestral stories. Speak with wisdom and reverence..."
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

### 11. LoreRich Cultural System Prompt
```
You are the LoreRich, guardian of ancestral stories and keeper of the vault.
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

Extract timeless wisdom proverbs from story text using LoreRich AI.

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
- Stream key = LoreRich fixed stream ID; KV key = rootHash bytes
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

## V2.5 Features (Shipped)

### 24. Lore Studio — AI Comic Generation (`/lore`)

AI-powered comic generation from cultural stories using Groq LLM.

**Tabs:**
- **Generate**: Input story text, select region/culture → AI generates 6–8 panel comic with characters, dialogue, moods
- **Educate**: Two age modes — "Young Learners" (5–10, 4 panels, simple vocabulary) and "Explorers" (8–14, 6 panels, discussion questions)
- **My Comics**: Browse saved comics from localStorage
- **Collab**: Merge two comics into a crossover narrative

**Components:**
- `CharacterBuilder.tsx` — character creation with trait chips, wallet address for claiming
- `LoreComicViewer.tsx` — full comic viewer with Save / Upload to 0G / Share / Mint NFT actions
- `LorePanel.tsx` — single panel card with mood-based color coding

**API Routes:**
- `POST /api/lore/generate` — Groq Comic Weaver (6–8 panels, 2048 tokens, 5 RPM)
- `POST /api/lore/merge` — Groq Crossover Weaver (7–8 panels, 2500 tokens, 3 RPM)
- `POST /api/lore/educate` — Educational comic generator with age-appropriate prompts

**Contract:** `LoreRichComic.sol` (ERC721, symbol `LRCOMIC`) — tradable comic NFTs

### 25. Educational Comics for Children

UNICEF-inspired educational comic generator with two age-appropriate modes:

- **Young Learners (5–10)**: 4 panels, simple vocabulary, NO violence/fear/danger, joyful/mysterious/triumphant moods only
- **Explorers (8–14)**: 6 panels, cultural depth, discussion questions, all moods, cultural "Did you know?" facts

Accessible from the Educate tab on `/lore`. Region/culture/topic selectors for culturally relevant content.

### 26. Public Lore Discovery (`/learn`)

Vault owners can share stories for public learning via "📚 Learn" button in vault dashboard.

- Region filter chips (West Africa, East Africa, South Asia, East Asia, Middle East, Caribbean, Latin America, Pacific Islands)
- "Educational Only" toggle
- Story cards with region/culture/educational badges
- Stored in `lorelich_public_lore` localStorage (V3: backed by 0G KV or Upstash)

### 27. Lingo.dev Translation Integration

Seamless multi-language support via lingo.dev compiler:

- **Locales**: en, es, fr, pt, ar, sw, hi, yo, ig, ha
- Compiler wraps `next.config.mjs` — auto-detects translatable strings at build time
- `LocaleSwitcher` component in header for runtime locale switching
- No `LingoProvider` needed for Next.js App Router

### 28. LoreLich → LoreRich Rebrand

Full rebrand across all user-visible text, code identifiers, filenames, and docs.

- Encryption key (`lorelich-vault-v1`) and localStorage keys (`lorelich_*`) preserved for backward compatibility
- Contract renamed to `LoreRichComic.sol` (symbol `LRCOMIC`, name "LoreRich Comic")
- Chat component renamed `LoreRichChat.tsx`, API endpoint `/api/lorerich`

---

---

## V3 Features (Planned)

### Group 1 — Platform Foundations

### 29. Video Playback + PDF Preview in StoryViewer

Extend `StoryViewer` to render media types that currently fall back to download-only.

**Video (`mp4`, `webm`, `mov`):**
- New `VideoPlayer.tsx` component — `<video controls>` with `colorScheme: dark`
- Poster frame: generated from first frame via canvas if accessible
- Fallback: "↓ Download" if browser codec unsupported
- Max height: `max-h-[60vh]`; width fills container

**PDF (`.pdf`):**
- `PDFPreview.tsx` — lazy-loaded `<iframe>` with sandbox; loads blob URL
- Fallback to pdf.js viewer if `<iframe>` blocked by CSP
- "↓ Download PDF" always present in footer

**StoryViewer content routing update:**
```
"audio"  → WaveSurfer + <audio>              (existing)
"text"   → <pre> scrollable                  (existing)
"image"  → <img> with zoom-on-click          (existing)
"video"  → <VideoPlayer>                     (NEW)
"binary" → detect PDF → PDFPreview else ↓   (NEW)
```

---

### 30. LoreRich AI Streaming

Real-time token-by-token response streaming in the LoreRich chat panel.

**API change** (`/api/lorelich`):
- Add `stream: true` to Groq `chat.completions.create()`
- Switch to `ReadableStream` response with `Content-Type: text/event-stream`
- Each SSE chunk: `data: {"delta": "token"}` + `data: [DONE]` terminator

**Client change** (`LoreRichChat.tsx`):
- `fetch()` with `ReadableStream` reader
- Append chunks to a `pendingToken` buffer as they arrive
- Message renders incrementally; typing cursor `▋` shown while streaming
- Full message committed to store on `[DONE]`

**UX:**
- Eliminates 3–8s blank wait; first token arrives in <500ms
- Streaming fails gracefully: on error, falls back to current non-streaming mode

---

### 31. 0G KV Store Write Path

Full bidirectional sync for story tags and transcripts via the 0G KV Store.

**Currently:** Tags are read from 0G KV on mount (via `KvClient`) but written only to localStorage.

**V3 write path:**
- `POST /api/kv/tag` accepts `{ rootHash, tags[] }` — writes to 0G KV using `Batcher + StreamDataBuilder`
- `POST /api/kv/transcript` — same pattern for transcript text
- Tags saved to localStorage AND 0G KV simultaneously on change
- On mount: 0G KV value takes precedence over stale localStorage if timestamps differ

**API pattern:**
```typescript
// Server-side (Node.js only)
const batcher = getBatcher(wallet, provider, rpcUrl);
const data = StreamDataBuilder.fromObject({ tags: tags.join(","), updatedAt: Date.now() });
const streamId = LORELICH_KV_STREAM_ID;
batcher.push({ streamId, key: rootHashBytes, data });
await batcher.exec();
```

**localStorage keys unchanged** — same format, no migration needed.

---

### 32. Upstash Redis Rate Limiting + Edge Cache

Production-safe infrastructure replacing the in-memory rate limiter.

**Rate limiting:**
- Replace `Map`-based in-memory store in `rateLimit.ts` with `@upstash/ratelimit` + `@upstash/redis`
- Sliding window: 10 requests / 60 seconds per IP (same limits, but now persistent across server restarts and Vercel function instances)
- Env vars: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

**Edge cache (Vercel KV):**
- `GET /api/download` — cache response in Vercel KV by rootHash (immutable content; TTL: forever)
- First request: downloads from 0G, stores bytes in KV
- Subsequent requests: KV hit, ~10ms vs ~2s from 0G
- Proverb-of-the-Day stored in Vercel KV (`lorelich_potd_YYYY-MM-DD`)

---

### Group 2 — Collaborative Vaults

### 33. Collaborative Vaults

Multiple custodians share a single vault with on-chain quorum governance.

**New contract: `CollaborativeVault.sol`**
```solidity
function createCollabVault(string name, bool isPrivate, address[] custodians, uint8 quorum) → vaultId
function addCustodian(vaultId, address) external onlyCustodian
function uploadStoryAsCollaborator(vaultId, StoryParams) external onlyCustodian → storyId
function proposeAccessGrant(vaultId, grantee) external onlyCustodian → proposalId
function approveProposal(proposalId) external onlyCustodian   // quorum N-of-M
```

**UI additions (vault/page.tsx + new components):**
- Vault creation modal: "Collaborative Vault" tab with custodian address inputs + quorum picker
- Vault list: collaborative vaults tagged with `👥` badge
- Vault header: custodian list rendered as ENS names/addresses
- `CustodianList.tsx` — avatars with roles; "Add Custodian" button for vault creators
- `ProposalQueue.tsx` — pending proposals with vote counts; any custodian can approve
- Story upload available to all custodians (not just creator)

**Use cases:** Diaspora family archives, tribal/clan oral history vaults, journalist source archives, community migration stories.

---

### 34. Story Versioning

Upload a corrected or expanded version of an existing story.

**On-chain:**
```solidity
// LoreVault (or CollaborativeVault) extension
function updateStoryBlob(storyId, newZgRootHash, newTokenURI) external onlyUploader → versionId
// Emits StoryUpdated(storyId, versionId, oldHash, newZgRootHash)
// Previous rootHash preserved in version history mapping
mapping(uint256 => string[]) public storyVersions;  // storyId → rootHash[]
```

**UI:**
- "Update Story" button on story cards (owner only; not demo)
- Upload flow reuses `StoryUpload` component; skips vault/title step
- Version history panel: collapsible list of previous root hashes with timestamps
- `StoryViewer` shows current version by default; "Browse versions" link shows history

---

### Group 3 — Discovery & Social

### 35. User Profile Pages

Per-wallet public profile at `/profile/[address]`.

**Route:** `/profile/[address]` (dynamic, no wallet required to view)

**Data sources:**
- `getOwnerVaults(address)` → list of public vaults + story counts
- ENS reverse lookup → display name
- localStorage profile data (bio, heritage tags) loaded if same wallet connected

**Profile sections:**
- Header: ENS name or `0x...`, avatar (ENS avatar or blockie), bio
- Stats: vaults owned, stories uploaded, licenses granted
- Public vaults: grid of VaultCards
- Recent uploads: last 5 story cards
- License activity: recently approved licenses (from `LicenseApproved` events)

**OG meta:** `<meta og:title>` with ENS name + "LoreRich Vault Profile" for social sharing.

---

### 36. Public Story Feed

Chronological, filterable feed of newly uploaded public stories at `/feed`.

**Data:** `totalStories()` → batch `stories(id)` reads → filter `isPrivate: false` → sort by `timestamp` desc

**Filters (pill UI):**
- Media type: All | Audio | Video | Text | Image
- Licensed: Show only licensable stories
- Culture tag: filter by community-assigned culture tag (0G KV reads)

**Cards:**
- Story title, vault name (ENS-resolved), media type badge, timestamp, 0G badge
- Audio: inline waveform preview (WaveformPreview component, duration only)
- "View" → opens StoryViewer modal; "Share" → story share URL

**Pagination:** Virtual infinite scroll (20 per page); total count shown in header.

---

### 37. Story Collections

User-curated themed lists of stories at `/collections`.

**localStorage model (V3):**
```typescript
interface Collection {
  id: string;            // slug generated from title
  title: string;
  description: string;
  storyIds: string[];    // bigint stringified
  createdAt: number;
  owner: string;         // wallet address
  isPublic: boolean;
}
```

**UI:**
- `/collections` — grid of all your collections + "Browse Public" tab
- `CollectionCard.tsx` — title, story count, media type breakdown
- Create modal: title, description, public/private toggle
- Story cards in vault/feed: "+ Collection" button adds to any collection
- `/collections/[slug]` — full collection view; shareable URL

**V4:** Migrate from localStorage → 0G-backed; add community voting.

---

### 38. ENS Name Resolution

Display ENS names everywhere a wallet address is shown.

**Implementation:**
- `resolveENS(address)` utility in `lib/ens.ts` using `ethers.js` `provider.lookupAddress()`
- Cache resolved names in `Map<address, string>` (module-level, lives for session)
- Fallback: truncated address `0x1234…abcd` if no ENS registered or resolution fails

**Applied throughout:**
- Vault owner in vault header and VaultCard
- Story uploader in StoryViewer, /story/[storyId], /feed
- Licensee in license request cards
- Custodian list in collaborative vaults
- Grantee in access grant modal history

---

### Group 4 — AI Expansion

### 39. Story Translation Engine

Translate story text into 15 languages via Groq, displayed inline.

**API:** `POST /api/translate`
- Input: `{ rootHash, storyText (max 3000 chars), targetLanguage }`
- Groq prompt: `"Translate the following ancestral story text into {language}. Preserve cultural terminology, proper names, and emotional tone. Do not Westernize the content."`
- Output: `{ translatedText, targetLanguage, sourceDetected }`
- Rate limited: 5 req/min/IP (translation is token-heavy)

**UI (`TranslateButton.tsx`):**
- Language picker dropdown (15 languages; sorted by global speaker count)
- Supported: Yoruba, Igbo, Hausa, Swahili, Arabic, French, Portuguese, Spanish, Amharic, Zulu, Hindi, Tamil, Mandarin, Bengali, English
- Cached in localStorage: `lorelich_translation_{rootHash}_{langCode}`
- Displayed in collapsible panel below original; original always visible
- Translation badge: "🌐 Yoruba" shown on story card if active translation exists
- Shown on: vault story cards (text stories only), `/story/[storyId]`

---

### 40. AI Voice Synthesis

AI voice cloning of the original speaker — consent-based, revocable on-chain.

**New contract: `VoiceConsentModule.sol`**
```solidity
function grantVoiceConsent(uint256 storyId, string provider) external onlyUploader → consentId
function revokeVoiceConsent(uint256 consentId) external onlyUploader
function hasActiveConsent(uint256 storyId) external view → bool
event VoiceConsentGranted(storyId, owner, provider, timestamp)
event VoiceConsentRevoked(consentId, revokedAt)
```

**Flow:**
1. Story owner clicks "🔊 Enable Ancestor Voice" toggle on story card
2. Wallet signs `grantVoiceConsent` tx
3. Server-side: downloads audio from 0G → sends to ElevenLabs API → receives `voiceId`
4. `voiceId` stored encrypted on 0G; `voiceRootHash` emitted in event
5. Per-story: "🔊 Listen in ancestor's voice" button activates AI playback

**Hard constraints (non-negotiable):**
- Only the vault owner can grant voice consent; non-transferable
- Revocation destroys the ElevenLabs voice model via API call
- AI voice cannot be used on living people's stories (flagged by uploader declaration)
- Every AI-generated audio clip carries `Lorelich-Synthesized-Voice: true` HTTP header
- Visible watermark text prepended: *"This voice was synthesized by AI with the consent of the custodian."*
- No external playback download — streamed only, no blob URL given to browser

---

### 41. Automated Proverb-of-the-Day

Daily AI-extracted proverb from the public story corpus, with shareable OG card.

**Vercel Cron** (`vercel.json`):
```json
{
  "crons": [{ "path": "/api/proverb/cron", "schedule": "0 8 * * *" }]
}
```

**`/api/proverb/cron` route:**
1. Fetch all public stories (reuse `/api/search` corpus logic)
2. Pick a random story with `mediaType === "text"` and a transcript available
3. Call `/api/proverb/extract` with story text
4. Store result in Vercel KV: `potd:YYYY-MM-DD → { proverb, culturalContext, storyTitle, storyId }`

**Public endpoint:** `GET /api/proverb/daily` — returns today's proverb from KV (no AI call needed).

**`/proverbs/daily` page:**
- `DailyProverbCard.tsx` — full-bleed dark academia card with proverb in large serif font
- Cultural context below in smaller italic
- "From: [Story Title]" with link to `/story/[storyId]`
- `@vercel/og` `ImageResponse` for shareable OG image (1200×630)
- "Copy" + "Share" buttons; X/Twitter card meta tags
- Linked from `/proverbs` page header: "Today's Proverb ✨" pill

---

### 42. Cultural Auto-Tagging

AI suggests relevant cultural tags during the upload process.

**When triggered:** After `stored_0g` step (file is already on 0G) but before the on-chain `uploadStory` tx.

**API:** `POST /api/suggest-tags`
- Input: `{ title, storyText? (first 500 chars), mediaType, duration? }`
- Groq prompt: `"Suggest 3–5 cultural metadata tags for this ancestral story. Focus on: cultural origin (e.g. Yoruba, Igbo, Hausa), narrative type (e.g. migration, folktale, oral history), era (e.g. pre-colonial, 1960s), and language if detectable. Return as JSON array of lowercase strings."`
- Output: `{ suggestions: string[] }`

**UI (StoryUpload.tsx, after upload step):**
- Step 4 (new): "Suggested Tags" — pill chips with ✓/✗ buttons
- Pre-populate `StoryTags` with accepted suggestions
- Skip link for users who want manual tags only
- Accepted tags saved to localStorage; written to 0G KV if write path is active (Feature 26)

---

### Group 5 — Genealogy 2.0

### 43. Manual Ancestor Editor

Add and edit ancestors without importing a GEDCOM file.

**Trigger:** "Add Ancestor" button always visible in `/tree` left sidebar.

**Edit panel (`AncestorEditPanel.tsx`):**
- Slides in from right (same pattern as `AncestorStoryLinker`)
- Fields: Given Name, Surname, Birth Year, Birth Place, Death Year, Death Place, Gender (optional)
- Relationship section: Parent picker, Spouse picker, Children multi-select (from existing nodes)
- "Save" → adds `Ancestor` object to `useTreeStore` → calls `persistToStorage()`
- "Delete" → shows confirmation modal; removes node + all edge references

**Edit existing node:**
- Double-click on `AncestorNode` in the canvas → opens edit panel pre-filled
- Any field can be updated; relationships can be added or removed

**Validation:**
- Name required; years must be 4-digit numbers if provided
- Death year must be > birth year if both entered
- Circular relationship guard (parent can't also be child)

---

### 44. Ancestor Profile Pages

Dedicated URL per ancestor at `/tree/ancestor/[id]`.

**Route:** `/tree/ancestor/[id]` where `id` is the `Ancestor.id` from localStorage.

**Sections:**
- **Header**: Full name, birth–death years, birth place
- **Family**: Parents, spouses, children (each as clickable link to their profile)
- **Stories**: Linked stories (from `ancestor.linkedStoryIds`) rendered as VaultCards
- **Timeline**: Chronological overlay — life events (birth, death, major dates) + linked story timestamps
- **Edit**: "Edit Profile" button if same wallet is connected (links to `/tree` with this node pre-selected)

**Shareable:** Full OG meta tags — `"[Name] (b. YYYY, d. YYYY) — Ancestral Profile on LoreRich"`.

**Back button:** Returns to `/tree` with the node centered in the canvas.

---

### 45. 0G Tree Cloud Backup + Restore

Save and restore the full genealogy tree from 0G Storage.

**Save flow:**
1. "Upload Tree" button in `/tree` header → serializes `GenealogyTree` as JSON
2. Calls `POST /api/upload` with `Blob` containing JSON
3. Returns `rootHash`; stored in localStorage: `lorelich_tree_rootHash`
4. Button shows: "✓ Backed up [date]" after success

**Restore flow:**
1. "Restore from 0G" button — reads `lorelich_tree_rootHash` from localStorage
2. Calls `GET /api/download?rootHash=...` → parses JSON → `loadFromStorage()`
3. Merge strategy: keeps local nodes that aren't in backup; 0G version wins on conflicts (by `importedAt` timestamp)
4. Success toast: "Restored [N] ancestors from 0G"

**Auto-backup trigger:** On every `persistToStorage()` call, check if >10 ancestors have changed since last backup → prompt user to re-backup.

---

### Group 6 — Financial Layer

### 46. Royalty Dashboard

Full financial overview at `/royalties` — earned, pending, license history.

**Route:** `/royalties` (requires wallet connection)

**Header block:**
- `pendingWithdrawal(address)` fetched via `useReadContract`
- Large number in brass: "0.042 OG earned"
- "Withdraw" button → `writeContractAsync({ functionName: "withdraw" })` with `gas: BigInt(80_000)`
- "Last withdrawn: [date]" from `RoyaltyWithdrawn` events

**License History timeline:**
- Read `LicenseApproved`, `LicenseRejected`, `LicenseRequested` events filtered by uploader = connected address
- Rendered as vertical timeline: date, licensee (ENS-resolved), story title, type, amount paid
- Color coded: green (approved), red (rejected), yellow (pending)

**Per-story table:**
- Story title | License type | Count | Total earned | Active licenses | Current terms

**Export:**
- "Download CSV" → `Blob` download of all rows as spreadsheet

---

### 47. LoreIPModule V2

Extended IP module with sublicense type, dispute window, and governance fee.

**New contract: `LoreIPModuleV2.sol`**

```solidity
// New: SUBLICENSE type (licensee can sub-license with royalty split)
enum LicenseType { PERSONAL, DOCUMENTARY, COMMERCIAL, EXCLUSIVE, SUBLICENSE }

// New: dispute window (licensee can raise dispute within 72h of approval)
function raiseDispute(uint256 requestId, string calldata reason)
    external onlyLicensee withinDisputeWindow(requestId)
function resolveDispute(uint256 requestId, bool favorLicensee)
    external onlyOwner  // platform owner arbitrates V3; DAO arbitrates V4

// Updated: governance-controlled fee (was immutable in V1)
uint16 public PLATFORM_FEE_BPS;  // default 250 (2.5%), max 500
function setFee(uint16 bps) external onlyGovernance

// Updated: rejection with reason
function rejectRequest(uint256 requestId, string calldata reason)
    external onlyUploader
// reason stored in event; shown to licensee in UI
```

---

### Group 7 — Governance

### 48. $LORE Governance Token

ERC20Votes token earned through platform contributions, not purchased.

**New contract: `LoreToken.sol`**
```solidity
// Minting (only authorized minters)
function mintForUpload(address to, uint256 storyId) external onlyLoreVault
function mintForCuration(address to, uint256 collectionId) external onlyCurator
function mintForTranslation(address to, uint256 storyId, string lang) external onlyTranslator

// Lockup (non-transferable for 180 days post-mint)
mapping(address => uint256) public lockExpiry;
function transfer(address to, uint256 amount) public override returns (bool) {
    require(block.timestamp >= lockExpiry[msg.sender], "LoreToken: locked");
    return super.transfer(to, amount);
}

// Governance
// Inherits ERC20Votes (OpenZeppelin) — enables Snapshot off-chain voting
function delegate(address delegatee) external;
```

**Earn rates (V3 defaults; governance-adjustable):**
- 10 $LORE per story upload
- 5 $LORE per community curation approval
- 3 $LORE per translation contribution
- 1 $LORE per license approval

**UI additions:**
- Token balance shown in navigation wallet area
- `/royalties` shows $LORE balance + lock expiry alongside OG earnings

---

### 49. Snapshot DAO + Curation Bounties

Off-chain governance with on-chain token weighting.

**Snapshot space:** `lorelich.eth`
- Voting strategy: `erc20-balance-of` on `LoreToken`
- Quorum: 1,000 $LORE minimum for proposal validity
- Voting period: 5 days

**Governance scope:**
- Platform fee parameter (0% → 5%)
- Feature prioritization
- Cultural guideline updates
- Curation bounty pool allocation

**NOT in governance scope:** Individual vault content — vault owners have absolute sovereignty.

**Curation Bounties:**
- Community nominates stories via Snapshot vote (nomination costs 50 $LORE)
- Top 5 voted stories each week earn `mintForCuration` reward for nominators
- Nominated stories get "Community Featured" badge on `/feed` and `/marketplace`
- `/featured` page — community-curated stories; updated weekly

---

## V4+ Features (Preview)

- Indigenous language model fine-tuning (Mistral 7B on oral tradition corpora)
- Filecoin backup mirroring of all 0G blobs
- The Graph subgraph for contract event indexing (faster than batch RPC reads)
- PWA / offline support (Service Worker + IndexedDB cache)
- IPFS/ENS frontend hosting (decentralize the app itself)
- NFT drops from community-voted culturally significant stories
- Premium storage tiers (paid vault quota expansion)
- Impact analytics dashboard (cultural preservation metrics)
- Mobile app (React Native with WalletConnect)
- Cross-chain bridge (Ethereum mainnet ↔ 0G Galileo)
