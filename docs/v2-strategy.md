# LoreLich Vault — Version 2 Expansion Strategy

## Current State

### V1.5 — Shipped

| Feature | Notes |
|---|---|
| IP Licensing Layer | `LoreIPModule.sol` deployed; `/marketplace` live |
| Documentary Pitch Portal | `/pitch` and `/pitch/[storyId]` live |
| Genealogy Tree Builder | `/tree` with React Flow + GEDCOM + AI linking |

### V2 — Shipped

| Feature | Notes |
|---|---|
| Proverb Extraction Engine | `/proverbs` + `/api/proverb/extract` (Groq cultural scholar) |
| Semantic Story Search | `/search` + `/api/search` (Groq AI relevance ranking 0–100) |

### V2.1 — Shipped

| Feature | Notes |
|---|---|
| 0G Storage Retrieval | `GET /api/download` — complete read/write round-trip via `Indexer.download()` |
| StoryViewer | In-browser text/image/audio viewer; private vaults decrypted client-side |
| Mobile Navigation | Hamburger menu for sub-`md` viewports |
| 7 Bug Fixes | linkedCount, BigInt crash, form hydration, unlink, nav overlap, txHash, accept |

### V2.2 — Shipped

| Feature | Notes |
|---|---|
| Public Story Share Page | `/story/[storyId]` — shareable URL; no wallet required; IP terms, DA badge, locked private |
| Story Tags (0G KV) | `StoryTags.tsx`; localStorage primary + `GET /api/kv/tag` reads from `KvClient`; 8 tags max |
| Story Transcript | `POST /api/transcript` — Groq Whisper large v3 via `client.audio.transcriptions.create()` |
| Private Vault Access Grants | `AccessGrantModal.tsx` — grant/revoke with localStorage history; `gas: BigInt(200_000)` |
| Certificate of Preservation | `CertificateModal.tsx` — client-side, `window.print()` → PDF; no server round-trip |

---

## V2 → V3 Trigger Conditions

V3 development begins when ALL of the following are true:
- V2 has been live for ≥ 3 months
- 1,000+ stories uploaded
- Security audit complete with no critical findings
- Community feedback collected (min 50 user interviews)

---

## V2 Feature Set

### 1. Semantic Search

Users can search across public vaults using natural language.

**Implementation**:
- Generate embeddings for each story via `text-embedding-3-small` (Anthropic equivalents when available)
- Store in Pinecone or Weaviate vector DB
- On query: embed query → nearest-neighbor search → return ranked results
- Filter by vault, culture, media type, era

**Privacy**: Private vault stories are never embedded or indexed.

---

### 2. AI Voice Synthesis (Consent-Based)

Allow story custodians to consent to AI voice cloning of the original speaker.

**Flow**:
1. Vault owner enables voice synthesis in settings
2. Upload ≥60s of clean audio of the speaker
3. Elevenlabs / PlayHT generates voice model
4. Voice model stored encrypted on 0G, accessible only to authorized users
5. LoreLich can "speak" stories in the ancestor's voice

**Consent Smart Contract**:
```solidity
function grantVoiceConsent(uint256 storyId, address synthesisProvider) external onlyVaultOwner(storyId);
function revokeVoiceConsent(uint256 storyId) external onlyVaultOwner(storyId);
```

**Hard Rules**:
- Consent is revocable at any time
- Voice model destroyed on revocation
- AI voice synthesis cannot be used to impersonate living people
- Watermarking on all synthesized audio

---

### 3. Community Governance

**DAO Structure**:
- Governance token: $LORE (earned via uploads, curation, translations)
- Snapshot voting for protocol decisions
- Gnosis Safe multi-sig for treasury
- Governance scope: feature prioritization, fee parameters, cultural guidelines

**NOT in governance scope**: Individual vault content — vault owners have absolute sovereignty.

---

### 4. Collaborative Vaults

Multiple custodians can contribute to a shared family or community vault.

**Contract Changes**:
```solidity
struct CollaborativeVault {
    address[]   custodians;
    uint256     quorumRequired;    // # custodians to approve access grants
    mapping(address => bool) isCustodian;
}
```

Use cases: Diaspora family vaults, tribe/clan archives, oral history projects.

---

### 5. Proverb-of-the-Day Engine *(Shipped as V2 — manual extraction)*

Shipped: `/proverbs` lets users manually extract proverbs from any story text via Groq AI.

Remaining for V3: automated daily cron, curated public pool, shareable OG image card.

---

## V2 Tech Stack Additions

| Addition | Purpose |
|---|---|
| Pinecone | Semantic search vector DB |
| Elevenlabs API | Voice synthesis |
| Snapshot.js | DAO governance |
| Gnosis Safe SDK | Multi-sig treasury |
| Bull / QStash | Background job queue |
| Upstash Redis | Production rate limiting (replaces in-memory) |

> Note: React Flow and GEDCOM parsing (originally listed as V2 tech) were shipped in V1.5.

---

## V2 Contract Changes

### New: `CollaborativeVault.sol`
Extends `LoreVault` with multi-custodian logic and quorum-based access grants.

### Modified: `LoreVault.sol`
- Add `Pausable` (emergency stop)
- Add protocol fee hook (governance-controlled)
- Add governance hook interface

### New: `LoreToken.sol`
- ERC20 governance token
- Earned via contribution (not purchasable at launch)
- Non-transferable for first 6 months (soulbound contribution proof)

### Extended: `LoreIPModule.sol`
- Add dispute resolution window (72h challenge period on approvals)
- Add `SUBLICENSE` license type
- Governance control of `PLATFORM_FEE_BPS`

---

## Migration Path (V1 → V2)

1. Deploy V2 contracts (do NOT modify V1)
2. V1 vaults automatically readable by V2 via event indexing
3. Users prompted to "migrate" vault — one-click re-registration on V2 contract
4. V1 remains live indefinitely (immutable history)
5. After 12 months: V1 UI shows deprecation banner, V2 is primary

---

## V2 Timeline Estimate

| Milestone | Duration |
|---|---|
| Semantic search | 6 weeks |
| Voice synthesis | 8 weeks |
| Collaborative vaults | 6 weeks |
| Governance (DAO) | 12 weeks |
| Proverb engine | 3 weeks |
| **Total (parallel)** | ~14 weeks (3.5 months) |
