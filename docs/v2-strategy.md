# LoreLich Vault — Version 2 Expansion Strategy

## V1 → V2 Trigger Conditions

V2 development begins when ALL of the following are true:
- V1 has been live for ≥ 3 months
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

### 5. Genealogy Builder

Visual family tree linked to vault stories.

**Implementation**:
- Off-chain graph DB (Neo4j or Supabase tables with recursive CTEs)
- Nodes: individuals
- Edges: relationships (parent, sibling, spouse, mentor)
- Each node can link to N stories
- Visualized via D3.js force graph or React Flow
- Exportable to GEDCOM format (standard genealogy format)

---

### 6. Proverb-of-the-Day Engine

Daily proverb surfaced from public vault stories, with context.

**Implementation**:
- Claude extracts proverbs from uploaded text/audio transcriptions
- Stored in curated pool (approved by vault owner)
- Daily cron selects one, generates cultural context
- Shareable as image (OG:image, Twitter card)

---

## V2 Tech Stack Additions

| Addition | Purpose |
|---|---|
| Pinecone | Semantic search vector DB |
| Elevenlabs API | Voice synthesis |
| Snapshot.js | DAO governance |
| Gnosis Safe SDK | Multi-sig treasury |
| Neo4j (or Supabase) | Genealogy graph |
| D3.js / React Flow | Family tree visualization |
| Bull / QStash | Background job queue |

---

## V2 Contract Changes

### New: `CollaborativeVault.sol`
Extends `LoreVault` with multi-custodian logic and quorum-based access grants.

### Modified: `LoreVault.sol`
- Add `Pausable` (emergency stop)
- Add protocol fee (0.5% on premium features)
- Add governance hook interface

### New: `LoreToken.sol`
- ERC20 governance token
- Earned via contribution (not purchasable at launch)
- Non-transferable for first 6 months (soulbound contribution proof)

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
| Genealogy builder | 10 weeks |
| Governance (DAO) | 12 weeks |
| Proverb engine | 3 weeks |
| **Total (parallel)** | ~16 weeks (4 months) |
