# LoreRich Vault — Version 3 Strategy

> V3 target: evolve from a personal archive tool into a **community-owned cultural protocol** — collaborative, monetizable, discoverable, and spoken in every language.

---

## State of the Platform at V3 Entry

### Shipped: 23 Features Across V1 → V2.5

| Version | Key Additions |
|---|---|
| V1 | Vault CRUD, 0G Upload, Soulbound ERC5192, LoreRich AI, Encryption, Waveform |
| V1.5 | IP Licensing, Marketplace, Pitch Portal, Genealogy Tree |
| V2 | Proverbs Engine, Semantic Search |
| V2.1 | 0G Download, StoryViewer, Mobile Nav, 7 bug fixes |
| V2.5 | Story Share, Tags (0G KV), Whisper Transcripts, Access Grants, Certificates, NFT Badge, Vault Rename/Archive, Story Hide |

### Structural Gaps That V3 Must Close

| Gap | Impact |
|---|---|
| No video playback in StoryViewer | Video stories show download-only; frustrating UX |
| 0G KV tags are read-only | Tags don't sync across devices or wallets |
| No multi-custodian vaults | Families/tribes can't share a single archive |
| No public discovery surface | Stories exist in silos; no feed, no culture browsing |
| No user identity layer | Wallet addresses are anonymous; no human presence |
| No royalty visibility | Earners don't know what they've earned without CLI |
| LoreRich chat is stateless | Conversation dies on navigation; no history export |
| Genealogy tree is localStorage-only | Proper 0G cloud backup undefined |
| No real-time notifications | License request arrives; owner has no idea |
| AI responses are not streamed | Users wait 3–8s for full response to render |
| Rate limiting is in-memory | Not production-safe; resets on server restart |
| Semantic search uses Groq re-ranking | Expensive and slow for large story corpora |

---

## V3 Principles

1. **Community over individual** — V1/V2 was personal vaults. V3 enables shared family/tribe/community archives.
2. **Discoverable by default** — Public stories should surface naturally; culture is meant to spread.
3. **AI depth over AI breadth** — Fewer but more powerful AI integrations (streaming, voice, translation).
4. **Full round-trip on every feature** — No more read-only half-features (0G KV write, tree cloud backup).
5. **Financial clarity** — Creators should understand and easily access what they've earned.
6. **Protocol not app** — Begin building toward governance, token, and decentralization.

---

## V3 Feature Groups

### Group 1 — Platform Foundations
*Makes everything run better before adding more surface area.*

| # | Feature | Summary |
|---|---|---|
| 24 | **Video Playback + PDF Preview** | Extend StoryViewer to render `<video>` for MP4/WebM; PDF preview via `<iframe>` or pdf.js |
| 25 | **LoreRich AI Streaming** | SSE streaming on `/api/lorelich` → real-time token-by-token response in chat panel |
| 26 | **0G KV Write Path** | Write tags and transcripts to 0G KV Store via `Batcher + StreamDataBuilder`; full bidirectional sync |
| 27 | **Redis Rate Limiting + Edge Cache** | Upstash Redis replaces in-memory rate limiting; Vercel KV caches frequent 0G downloads |

---

### Group 2 — Collaborative Vaults
*The structural V3 centrepiece. Families and communities share one archive.*

| # | Feature | Summary |
|---|---|---|
| 28 | **Collaborative Vaults** | New `CollaborativeVault.sol`; multiple custodians; quorum-based access grants; joint vault UI |
| 29 | **Story Versioning** | Upload a revised version of an existing story; new 0G blob + updated on-chain pointer; version history list |

**CollaborativeVault.sol — Contract Spec:**
```solidity
struct CollabVault {
    address[]              custodians;
    uint8                  quorumRequired;   // e.g. 2-of-3
    mapping(address=>bool) isCustodian;
    uint256                storyCount;
    bool                   isPrivate;
    string                 name;
}

function createCollabVault(string name, bool isPrivate, address[] custodians, uint8 quorum) → vaultId
function addCustodian(vaultId, address) external onlyCustodian
function removeCustodian(vaultId, address) external onlyQuorum
function uploadStoryAsCollaborator(vaultId, StoryParams) external onlyCustodian → storyId
function proposeAccessGrant(vaultId, address grantee) external onlyCustodian → proposalId
function approveProposal(proposalId) external onlyCustodian   // quorum approval
```

**UI additions:**
- Vault creation modal: toggle between Personal / Collaborative
- Collaborative vault header: custodian list with avatars/ENS names
- Add custodian modal: input address → on-chain `addCustodian`
- Proposal queue: pending access grant proposals with vote counts
- Upload allowed for any custodian (not just creator)

---

### Group 3 — Discovery & Social
*Moving from silos to community. Stories need to be found.*

| # | Feature | Summary |
|---|---|---|
| 30 | **User Profile Pages** | `/profile/[address]` — public page: name, bio, linked vaults, story count, upload history |
| 31 | **Public Story Feed** | `/feed` — chronological feed of newly uploaded public stories; filterable by media type + culture tag |
| 32 | **Story Collections** | `/collections` — user-curated themed lists (e.g. "West African Migration Stories"); shareable URL |
| 33 | **ENS Name Resolution** | Resolve ENS names globally throughout the app (vault owner, uploader, grantee displays) |

**Profile Page Details (`/profile/[address]`):**
- Reads: `getOwnerVaults(address)` → lists public vaults
- Shows: display name (ENS or truncated address), cultural heritage tags (localStorage), bio
- Tabs: Stories uploaded | Vaults owned | Licenses granted
- "Follow" state: localStorage only in V3 (on-chain in V4)
- OG meta tags for link preview sharing

**Story Feed (`/feed`):**
- Reads: `totalStories()` → batch `stories(id)` calls → filter `isPrivate: false`
- Sort: newest first (by `timestamp`)
- Filter pills: media type, culture tag, licensed-only
- Infinite scroll with page size 20
- Each card: story title, vault name, uploader ENS/address, media type badge, 0G badge, "View" button

**Collections (`/collections`):**
- localStorage-persisted in V3 (0G-backed in V4)
- Create: title, description, add stories by ID or from current vault
- Share: `/collections/[collectionId]` (slug from title)
- Public collections browseable at `/collections`

---

### Group 4 — AI Expansion
*Deeper, more powerful AI — not just more endpoints.*

| # | Feature | Summary |
|---|---|---|
| 34 | **Story Translation Engine** | `/api/translate` + `TranslateButton` component; Groq translates story text into selected language |
| 35 | **AI Voice Synthesis** | ElevenLabs/PlayHT integration; consent-based on-chain; `VoiceConsentModule.sol`; stories played in ancestor's voice |
| 36 | **Automated Proverb-of-the-Day** | Vercel cron selects random public story, extracts proverb, generates shareable OG card image |
| 37 | **Cultural Auto-Tagging** | During upload, AI suggests 3–5 cultural context tags; user reviews before saving |

**Story Translation (`TranslateButton`):**
- Appears on text stories in vault dashboard and `/story/[storyId]`
- Language picker: 15 supported (Yoruba, Igbo, Hausa, Swahili, Arabic, French, Portuguese, Spanish, Amharic, Zulu, Hindi, Tamil, Mandarin, Bengali, English)
- API: `POST /api/translate` — Groq translates `storyText` → `{ translatedText, targetLanguage }`
- Translated text cached in localStorage (`lorelich_translation_{rootHash}_{lang}`)
- Displayed in collapsible panel below original text; not written back to 0G (read-only transform)

**AI Voice Synthesis — Architecture:**
```
VoiceConsentModule.sol
├── grantVoiceConsent(storyId, provider) external onlyVaultOwner → consentId
├── revokeVoiceConsent(consentId) external onlyVaultOwner
├── hasActiveConsent(storyId) view → bool
└── event VoiceConsentGranted(storyId, owner, provider, timestamp)
```
- UI: Settings panel per story; "Enable Voice" toggle → wallet signs consent tx
- Voice model: ElevenLabs voice clone from uploaded audio; model ID stored encrypted on 0G
- Playback: "🔊 Listen in ancestor's voice" button on story cards with active consent
- Hard constraints: no living person impersonation; watermark on all AI audio; revocable instantly

**Cultural Auto-Tagging (`/api/suggest-tags`):**
- Called automatically after `stored_0g` upload step (before on-chain tx)
- Groq analyzes title + first 500 chars → suggests: culture origin, era, narrative type, language
- Displayed as pill suggestions with ✓/✗ checkboxes; confirmed tags saved normally

**Proverb-of-the-Day Cron:**
- Vercel cron job (`cron.json`) — runs daily at 08:00 UTC
- Selects random public story with text content; calls `/api/proverb/extract`
- Stores to `lorelich_proverb_otd_{date}` in Vercel KV
- Public endpoint: `GET /api/proverb/daily` returns today's proverb
- Shareable card: `/proverbs/daily` — OG image with `next/og` (ImageResponse)

---

### Group 5 — Genealogy 2.0
*Completing the tree builder. No GEDCOM required.*

| # | Feature | Summary |
|---|---|---|
| 38 | **Manual Ancestor Editor** | Form-based add/edit ancestors without GEDCOM; inline name, dates, places, relationships |
| 39 | **Ancestor Profile Pages** | `/tree/ancestor/[id]` — dedicated page per ancestor; linked stories, timeline events, bio |
| 40 | **0G Tree Cloud Backup** | Save/restore full `GenealogyTree` JSON to 0G Storage; `Upload Tree` + `Restore Tree` buttons |

**Manual Ancestor Editor:**
- "Add Ancestor" button in `/tree` sidebar (always visible, no GEDCOM required)
- Form fields: given name, surname, birth year, birth place, death year, gender
- Relationship linking: parent select, spouse select, child select (from existing nodes)
- Edit mode: click any node → edit panel slides in with same form
- Delete: confirmation modal; removes node + all edges referencing it
- All changes saved to `useTreeStore` + `persistToStorage()`

**Ancestor Profile Pages (`/tree/ancestor/[id]`):**
- Dynamic route; `id` is the local ancestor ID from tree store
- Shows: full name, dates, places, family relationships (parents, spouses, children as links)
- "Stories" section: linked story cards (same StoryViewer integration)
- "Timeline" tab: chronological life events + story timestamps overlaid
- Shareable: OG meta with ancestor name + birth/death years

**0G Tree Backup:**
- `POST /api/upload` reused — serializes `GenealogyTree` as JSON blob
- Stores root hash in localStorage (`lorelich_tree_rootHash`)
- `GET /api/download?rootHash=...` restores tree
- `Upload Tree` button in `/tree` header; `Restore from 0G` button beside it
- On restore: merges with current tree (keeps local additions, overwrites on conflict by timestamp)

---

### Group 6 — Financial Layer
*Creators deserve to understand and access what they've earned.*

| # | Feature | Summary |
|---|---|---|
| 41 | **Royalty Dashboard** | `/royalties` — full financial overview: earned, pending withdrawal, license history timeline |
| 42 | **LoreIPModule V2** | New contract: sublicense type, 72h dispute window, governance-controlled fee, `rejectWithMessage` |

**Royalty Dashboard (`/royalties`):**
- Header: `pendingWithdrawal(address)` — large number with "Withdraw" button
- License history: all `LicenseApproved` events for your stories (indexed via event logs or The Graph)
- Timeline view: approve/reject events sorted by date; grouped by story
- Per-story breakdown: total earned, license count, current terms
- Export: "Download CSV" — license history as spreadsheet
- Gas estimate shown before withdraw click

**LoreIPModule V2 Contract Spec:**
```solidity
// New license type
enum LicenseType { PERSONAL, DOCUMENTARY, COMMERCIAL, EXCLUSIVE, SUBLICENSE }

// Dispute window (72h after approval; licensee can raise dispute)
function raiseDispute(requestId, reason) external onlyLicensee withinDisputeWindow
function resolveDispute(requestId, favorLicensee) external onlyOwner

// Governance-controlled fee
uint16 public PLATFORM_FEE_BPS;  // mutable via governance (was immutable in V1)
function setFee(uint16 bps) external onlyGovernance  // max 500 (5%)

// Richer rejection
function rejectRequest(requestId, string reason) external onlyUploader
```

---

### Group 7 — Governance
*Beginning the transition from company-controlled to community-owned.*

| # | Feature | Summary |
|---|---|---|
| 43 | **$LORE Governance Token** | `LoreToken.sol`: ERC20 earned via uploads, curation, translations; non-transferable for 6 months |
| 44 | **Snapshot DAO + Curation Bounties** | Snapshot voting for protocol decisions; curation bounty pool for community story discovery |

**LoreToken.sol:**
```solidity
// Earn via contributions (not purchasable at launch)
function mintForUpload(address to, uint256 storyId) external onlyLoreVault
function mintForCuration(address to, uint256 collectionId) external onlyCurator
function mintForTranslation(address to, uint256 storyId, string lang) external onlyTranslator

// Non-transferable for lockup period post-mint
mapping(address => uint256) public lockExpiry;
function transfer(address, uint256) override → reverts if lockExpiry[msg.sender] > block.timestamp

// Snapshot delegate
function delegate(address delegatee) external  // ERC20Votes
```

**Governance Scope (on Snapshot):**
- Feature prioritization votes
- Platform fee parameter (0% → 5% range)
- Cultural guidelines updates
- Curation bounty pool allocation

**NOT in governance scope:** Individual vault content — vault owners have absolute sovereignty.

**Curation Bounties:**
- Community nominates "culturally significant" stories by Snapshot vote
- Top N stories receive `mintForCuration` reward
- Curators earn $LORE; stories get "Community Featured" badge
- `/featured` page shows community-curated stories

---

## V3 New API Routes

| Route | Method | Purpose |
|---|---|---|
| `POST /api/translate` | POST | Story text translation via Groq (15 languages) |
| `GET /api/proverb/daily` | GET | Today's AI-extracted proverb from public corpus |
| `POST /api/suggest-tags` | POST | AI cultural auto-tagging on upload |
| `GET /api/feed` | GET | Paginated public story feed (newest first) |
| `GET /api/profile/[address]` | GET | Aggregated public profile data |
| `POST /api/collections` | POST | Create/update story collection |
| `GET /api/royalties` | GET | License history for a wallet address (event logs) |

---

## V3 New Smart Contracts

| Contract | Purpose | Dependencies |
|---|---|---|
| `CollaborativeVault.sol` | Multi-custodian vaults with quorum | `ILoreVault`, `SoulboundStory` |
| `VoiceConsentModule.sol` | On-chain voice synthesis consent; revocable | `ILoreVault` |
| `LoreIPModuleV2.sol` | Sublicense, dispute resolution, governance fee | `ILoreVault` |
| `LoreToken.sol` | ERC20Votes governance token; earned via contributions | none |

**EVM version:** All new contracts compiled with `evm_version = "shanghai"` (0G Galileo constraint).

---

## V3 Tech Stack Additions

| Addition | Purpose | Notes |
|---|---|---|
| Upstash Redis | Production rate limiting + cron locks | Replaces in-memory `Map` |
| Vercel KV | Edge cache for 0G downloads + proverb-of-the-day | Built into Vercel platform |
| Vercel Cron | Proverb-of-the-day daily job | `vercel.json` → `crons` key |
| ElevenLabs API | Voice model generation + playback | Server-side only (API key) |
| `@vercel/og` | Proverb-of-the-day shareable image | Already a Next.js feature |
| Tiptap or Lexical | Rich text editor for story writing | Replaces plain `<textarea>` |
| `ethers.js` ENS | ENS name resolution | Already bundled (ethers 6) |
| `pdf.js` (optional) | Client-side PDF preview in StoryViewer | Lazy-loaded |

---

## V3 Contract Migration Strategy

V1 contracts remain live and immutable. V3 adds **new contracts** that can read V1 state.

```
V1: LoreVault + SoulboundStory + LoreIPModule  → stay live forever
V3: CollaborativeVault                          → new vault type; reads ILoreVault
V3: LoreIPModuleV2                             → new IP module; reads ILoreVault
V3: VoiceConsentModule                         → references storyId from LoreVault
V3: LoreToken                                  → standalone; integrates with vault events
```

Frontend reads from **both** LoreVault (personal) and CollaborativeVault (collab) simultaneously. The vault list in the dashboard shows both types merged.

---

## V3 UI Architecture Changes

### New Pages
| Route | Page |
|---|---|
| `/feed` | Public story feed |
| `/royalties` | Royalty dashboard |
| `/collections` | Browse + manage collections |
| `/collections/[slug]` | Single collection view |
| `/profile/[address]` | User profile |
| `/tree/ancestor/[id]` | Ancestor detail page |
| `/proverbs/daily` | Proverb-of-the-day card (OG-shareable) |

### Modified Pages
| Route | Change |
|---|---|
| `/vault` | Add collaborative vault tab; custodian list in header; proposal queue |
| `/tree` | Add manual ancestor editor panel; `Upload Tree` / `Restore Tree` buttons |
| `/marketplace` | Add culture/region filter; ENS names on cards |
| `/story/[storyId]` | Add `TranslateButton`; voice playback if consent active |
| `/proverbs` | Add "Today's Proverb" hero at top |

### New Components
| Component | Purpose |
|---|---|
| `VideoPlayer.tsx` | HTML5 video element with controls + quality fallback |
| `PDFPreview.tsx` | Lazy-loaded `<iframe>` PDF viewer |
| `TranslateButton.tsx` | Language picker + translated text panel |
| `RoyaltyCard.tsx` | Single license event card for royalty dashboard |
| `StoryFeedCard.tsx` | Compact story card for `/feed` page |
| `CollectionCard.tsx` | Collection thumbnail for browse view |
| `CustodianList.tsx` | Vault custodian avatars + add/remove UI |
| `ProposalQueue.tsx` | Access grant proposals with quorum votes |
| `AncestorEditPanel.tsx` | Slide-in ancestor add/edit form |
| `VoiceConsentToggle.tsx` | Per-story voice synthesis opt-in |
| `DailyProverbCard.tsx` | OG-ready proverb card with share button |

---

## V3 Timeline Estimate

| Milestone | Duration | Dependencies |
|---|---|---|
| Platform Foundations (24–27) | 2 weeks | Upstash account |
| Collaborative Vaults (28–29) | 4 weeks | New contract deploy |
| Discovery & Social (30–33) | 3 weeks | ENS resolution |
| AI Expansion (34–37) | 4 weeks | ElevenLabs key, Vercel cron |
| Genealogy 2.0 (38–40) | 3 weeks | — |
| Financial Layer (41–42) | 3 weeks | New contract deploy |
| Governance (43–44) | 4 weeks | Snapshot setup |
| **Total (parallel streams)** | **~8–10 weeks** | — |

---

## V3 → V4 Trigger Conditions

V4 development begins when:
- V3 has been live for ≥ 2 months
- 10,000+ stories uploaded across personal + collaborative vaults
- $LORE token distributed to ≥ 500 wallets
- First Snapshot governance vote completed
- Smart contracts audited (Code4rena or Spearbit)
- At least one collaborative vault with 5+ custodians is active

---

## V4+ Preview (Do Not Build Yet)

- Indigenous language model fine-tuning (Mistral 7B trained on oral tradition corpora)
- Filecoin backup mirroring of all 0G blobs
- The Graph subgraph for contract event indexing
- PWA / offline support (Service Worker + IndexedDB cache)
- IPFS/ENS frontend hosting (decentralize the frontend itself)
- NFT drops from community-voted culturally significant stories
- Premium storage tiers (paid vault quota expansion)
- Impact analytics dashboard (cultural preservation metrics)
- Mobile app (React Native with WalletConnect)
- Cross-chain bridge (Ethereum mainnet ↔ 0G)
