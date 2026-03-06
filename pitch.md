# LoreRich Vault — Pitch

---

## The Problem

Ancestral stories are dying.

Oral histories, family narratives, cultural wisdom — they live in the memories of elders and are lost when those elders pass. Digital files rot, cloud services shut down, hard drives fail. Institutions archive for institutions, not for families or communities.

There is no permanent, community-owned, AI-enhanced home for the stories that define who we are.

And when those stories do survive — documentarians, filmmakers, and researchers have no structured way to discover, license, or build on them. The value stays locked. Families see none of the returns.

---

## The Market

- **8 billion** people have ancestors
- **800M+** diaspora people actively seeking cultural connection
- **$4.5B** genealogy market, growing 13% YoY
- **$12B+** documentary and factual entertainment market
- **300M+** podcast listeners who would engage with family audio archives
- IP licensing for cultural content is structurally underserved — no on-chain primitive exists today

---

## The Journey

---

### V1 — The Foundation
*"A sacred digital archive. Permanent. Verifiable. Yours."*

LoreRich started with one thesis: ancestral stories deserve the same permanence as blockchain transactions.

**What we built:**
- **Vault Dashboard** — private and public story vaults, AES-256 client-side encrypted
- **0G Decentralized Storage** — files uploaded to the 0G network; merkle root hash stored on-chain as a permanent DA proof
- **Soulbound Ownership** — every story mints a non-transferable ERC5192 NFT; cryptographic proof that this story belongs to this wallet, forever
- **LoreRich AI** — a Groq-powered cultural guardian that speaks with reverence; answers questions, extracts wisdom, remixes stories without ever mocking or diminishing them
- **Waveform Playback** — WaveSurfer.js audio visualization for oral history recordings
- **Write Stories** — compose directly in-browser; no file import required

**V1 answer to the problem:** *Preservation.* Stories no longer die when the elder does. They live on 0G, immutably, under the cryptographic custody of their family.

---

### V1.5 → V2.2 — The Platform
*"Stories that live forever should also earn."*

After proving the archive, we built the platform around it. V1.5 through V2.2 transformed LoreRich from a personal archive tool into a full cultural IP stack.

**IP & Monetization:**
- **On-chain IP Licensing** (`LoreIPModule.sol`) — story owners set programmable license terms: royalty in OG, commercial use flag, exclusive option, jurisdiction note
- **Story Marketplace** — `/marketplace` lists all licensable stories, filterable by media type and price
- **License Requests** — filmmakers and researchers request licenses with payment attached; owners approve or reject; royalties flow automatically via pull-pattern withdrawals
- **Documentary Pitch Portal** — LoreRich AI generates structured film treatment briefs (logline, synopsis, visual approach, comparables, audience) for every licensable story; filmmakers browse at `/pitch`

**Discovery & Intelligence:**
- **Genealogy Tree Builder** — import GEDCOM files, visualize family as an interactive constellation graph; LoreRich AI links vault stories to the right ancestors
- **Proverb Engine** — extract timeless wisdom from story text; personal proverb library at `/proverbs`
- **Semantic Search** — natural language search across all public stories; AI relevance scoring 0–100
- **Audio Transcription** — Groq Whisper large v3 one-click transcription; cached per story

**Story Utilities:**
- **Public Share Pages** — `/story/[storyId]` shareable URL for any story; no wallet required to view
- **Story Tags** — inline tag editor backed by the 0G KV Store
- **Access Grants** — private vault owners grant/revoke read access to specific addresses on-chain
- **Certificate of Preservation** — printable PDF proof of preservation with 0G merkle root hash, soulbound token ID, verification instructions
- **Soulbound NFT Badge** — view ERC5192 token details, ownership, and explorer link per story
- **Vault Management** — local rename, archive, and story hide controls

**What shipped (V1.5–V2.2):** 23 features. 3 deployed smart contracts. 9 API routes. 11 pages. TypeScript exits 0.

**V1.5–V2.2 answer to the problem:** *Ownership + monetization.* Stories don't just survive — they generate on-chain IP value that flows directly back to the families who preserved them.

---

### V2.5 — Education & Accessibility
*"Culture is a birthright. Make it teachable."*

V2.5 brings cultural stories to new audiences through AI-powered educational content and multi-language support.

**Lore Studio** (`/lore`):
- **AI Comic Generation** — Groq LLM transforms cultural stories into visual 6–8 panel comics with characters, dialogue, and scene descriptions
- **Educational Comics** — UNICEF-inspired age-appropriate modes: "Young Learners" (5–10) and "Explorers" (8–14) with discussion questions
- **Collaborative Comics** — merge two comics into crossover narratives; off-chain character claiming via wallet signatures
- **LoreRich Comic NFT** — `LoreRichComic.sol` (ERC721, symbol `LRCOMIC`) for tradable comic mints

**Public Learning** (`/learn`):
- Vault owners share stories for public learning via "📚 Learn" button
- Region and culture filter chips; educational-only toggle
- Discoverable cultural stories for niche history education

**Internationalization:**
- Lingo.dev compiler for seamless build-time translations (10 locales: en, es, fr, pt, ar, sw, hi, yo, ig, ha)
- `LocaleSwitcher` in header for runtime locale switching

**What shipped (V2.5):** 28 total features. 4 new (Lore Studio, Edu Comics, Learn, i18n) + rebrand. 3 new API routes. 2 new pages. 1 new contract.

**V2.5 answer to the problem:** *Education.* Ancestral stories become age-appropriate learning tools that cross language barriers, bringing cultural heritage into classrooms and living rooms worldwide.

---

### V3 — The Protocol
*"From personal archive to community-owned cultural infrastructure."*

V3 is the inflection point. We stop building a product and start building a protocol — one that entire communities, diaspora organizations, and cultural institutions can build on top of.

---

#### The Core V3 Insight

**V1 and V2 answered "how do we preserve?"**
**V3 answers "how do we share, collaborate, and govern?"**

A single story in a personal vault reaches the uploader. A shared archive owned by a Yoruba diaspora community, backed by an ENS-resolved identity layer, discoverable through a public feed, translatable into any language, with every contributor earning governance tokens — that reaches a civilization.

---

#### What V3 Builds

**1. Collaborative Vaults** — `CollaborativeVault.sol`

The archive goes from *personal* to *communal*. Multiple custodians share a single vault with on-chain quorum governance. The Okafor family in Lagos, London, and Houston all contribute to one archive. No single wallet controls it. A 2-of-3 quorum approves access grants.

```
Use cases: diaspora family archives · tribal oral history vaults ·
journalist source archives · community migration story collections
```

**2. Public Discovery Layer**

Stories need to be found. V3 adds:
- `/feed` — chronological public story feed, filtered by media type and culture tag
- `/profile/[address]` — ENS-resolved public identity: vaults owned, stories uploaded, license activity
- `/collections` — curated themed lists ("West African Migration Stories", "Pre-colonial Oral Traditions")
- ENS name resolution everywhere wallet addresses appear

**3. AI Voice Synthesis** — `VoiceConsentModule.sol`

LoreRich learns to speak in an ancestor's voice.

Story owners opt in via an on-chain consent transaction. ElevenLabs clones the voice from the uploaded audio. The model is stored encrypted on 0G. Consent is revocable at any time — one transaction destroys the model. Every AI playback is watermarked: *"This voice was synthesized by AI with the consent of the custodian."*

This is not a gimmick. A grandmother who died in 1987 can tell her grandchildren a story in 2040, in her own voice, with her family's full consent and control.

**4. Translation Into Every Language**

Groq translates story text into 15 languages — Yoruba, Swahili, Arabic, Mandarin, Hindi, Amharic, Zulu, and more — with a single click. Cultural terminology is preserved. Names are not Westernized. Translations cache locally and sync to 0G KV.

The story recorded in Hausa by a great-grandmother in Kano can be read by her grandchildren who grew up in Manchester and only speak English. And then their children, who are learning Hausa, can read both.

**5. Royalty Dashboard** — `/royalties`

Creators finally see what they've earned. A single view: pending OG balance, one-click withdrawal, full license history timeline, per-story breakdown, CSV export. No CLI required. No block explorer.

**6. $LORE Governance Token** — `LoreToken.sol`

The community earns ownership of the protocol by contributing to it.
- 10 $LORE per story upload
- 5 $LORE per community curation approval
- 3 $LORE per translation contribution
- 1 $LORE per license approval

$LORE is not for sale. It is not speculative. It is earned. For the first 180 days after mint it cannot be transferred — it is, fittingly, soulbound to the contributor.

**7. Snapshot DAO + Curation Bounties**

$LORE holders vote on platform fee parameters, feature priorities, and cultural guidelines. No individual vault is ever subject to governance — vault owners have absolute sovereignty. But the protocol's rules are community-owned.

Community-curated stories get a "Featured" badge. Curators earn $LORE. The best stories rise.

---

#### V3 in Numbers

| Metric | V1 | V2.2 | V2.5 | V3 Target |
|---|---|---|---|---|
| Features | 11 | 23 | 28 | 49 |
| Smart contracts | 2 | 3 | 4 | 7 |
| API routes | 3 | 9 | 12 | 16 |
| Pages | 5 | 11 | 13 | 18 |
| AI response (first token) | ~3s | ~2s | ~2s | <500ms (streaming) |
| 0G download speed | ~2s (live) | ~2s (live) | ~2s (live) | <50ms (cached) |
| Vault types | Personal only | Personal only | Personal only | Personal + Collaborative |
| Languages supported | 1 | 1 | 10 | 15 |
| Governance | None | None | None | Snapshot DAO + $LORE |

---

#### V3 Flow

```
Family uploads oral history → LoreRich AI transcribes + auto-tags + translates
                                         ↓
AI synthesizes ancestor's voice (with on-chain consent)
                                         ↓
Story appears in public /feed → community curates it → "Featured" badge earned
                                         ↓
Filmmaker discovers via /pitch → requests documentary license → royalty flows on-chain
                                         ↓
Family earns OG tokens + $LORE governance rights → votes on protocol's future
```

---

## The Business Model

| Revenue Stream | V1 | V2 | V3 |
|---|---|---|---|
| Platform license fee (2.5%) | ✓ | ✓ | ✓ (governance-adjustable) |
| Premium storage tiers | — | — | ✓ |
| Pitch Portal featured listings | — | ✓ | ✓ |
| Enterprise collaborative vaults | — | — | ✓ |
| Translation API (B2B) | — | — | ✓ |
| Voice synthesis (per-story opt-in) | — | — | ✓ |

The 2.5% platform fee is code, not policy — collected automatically, without human intervention, on every on-chain royalty payment.

---

## Why Now

Three things converged at V1. Three more converge at V3.

**At V1:**
1. 0G Network launched Galileo Testnet — permanent, verifiable storage at cost
2. Groq free tier made AI querying viable at zero marginal cost
3. ERC5192 soulbound standard matured — cryptographic ownership without speculation

**At V3:**
4. AI voice cloning (ElevenLabs) reached quality and API accessibility where consent-based ancestor voice is viable and ethically deployable
5. Diaspora communities are actively seeking Web3-native tools for cultural preservation — no competing product exists at this feature depth
6. The governance token model is now proven (Nouns DAO, Gitcoin) — earning ownership through contribution, not purchase, is a credible path to decentralization

LoreRich Vault is the only product that combines permanent decentralized storage, on-chain IP licensing, AI cultural intelligence, voice synthesis with on-chain consent, multi-custodian collaborative vaults, and community governance into a single coherent protocol for ancestral story preservation.

---

## Deployed Contracts (0G Galileo Testnet)

| Contract | Purpose | Address |
|---|---|---|
| `LoreVault.sol` | Vaults, stories, access control | `0x0e3eB25239e2C4cc8595306BCEB4746461499483` |
| `SoulboundStory.sol` | ERC5192 soulbound token per story | `0x1c780cc7ed8bBDf69376F343a592740Ee3B6EF18` |
| `LoreIPModule.sol` | IP licensing, royalties, license requests | `0x036eACE959adb91BdD35b7c1cf607B0133545968` |

*V3 contracts (CollaborativeVault, VoiceConsentModule, LoreIPModuleV2, LoreToken) — planned deployment on 0G Galileo with `evm_version = "shanghai"`.*

---

## Team

[Dvyne]

## Pitch Link
[https://docs.google.com/document/d/1X_Od56I1Hff_3LNhS-fuqly1vjlYA_e8-gLzZ_ic8a4/edit?usp=sharing]
