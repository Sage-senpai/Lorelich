# LoreLich Vault — Scaling Roadmap

## Current Architecture (V1.5 Baseline)

```
User → Next.js (Vercel) → 0G Storage + EVM (0G Chain)
                        → Groq API (server-side: lorelich, pitch/generate, genealogy/suggest)
                        → LoreIPModule.sol (on-chain IP licensing + royalties)
```

Single-region, serverless, stateless. Sufficient for 0–10K MAU.

**AI API Routes (all rate-limited + injection-guarded):**
- `POST /api/lorelich` — story query and remix (10 req/min/IP)
- `POST /api/pitch/generate` — film treatment brief generation (10 req/min/IP)
- `POST /api/genealogy/suggest` — ancestor-to-story link suggestions (10 req/min/IP)

---

## Phase 1: Hardening (0–10K MAU)

**Goal**: Stable, reliable, zero downtime.

| Area | Action | Priority |
|---|---|---|
| Caching | Cache 0G download responses at edge (Vercel KV) | High |
| Rate limiting | Upstash Redis rate limiter on all `/api/*` AI routes | High |
| Error tracking | Sentry for frontend + API errors | High |
| Monitoring | Datadog or Grafana Cloud on contract events | Medium |
| CDN | Vercel Edge Network for static assets | Low (default) |
| DB | PlanetScale or Supabase for off-chain metadata index | Medium |
| IP Module | Index `LicenseRequested` / `LicenseApproved` events via The Graph | Medium |

---

## Phase 2: Scale-Out (10K–100K MAU)

**Goal**: Handle concurrent vault access, reduce latency.

| Area | Action |
|---|---|
| AI | Streaming responses on LoreLich chat (`stream: true`) |
| AI | Move pitch generation to async queue (long-running Groq calls) |
| Storage | Multi-region 0G node pinning for faster downloads |
| Indexing | The Graph subgraph for contract event indexing (vault + IP module) |
| Search | Pinecone or Weaviate for semantic story search (V2) |
| Queue | Upstash QStash for async upload processing |
| Auth | JWT session tokens to reduce RPC calls per page load |
| Tree | Migrate genealogy tree from localStorage → user-owned 0G storage |

---

## Phase 3: Decentralization (100K+ MAU)

**Goal**: Reduce centralized dependencies. Move toward protocol.

| Area | Action |
|---|---|
| AI | Fine-tuned open-source model (Mistral 7B) for cultural prompts |
| AI | Run inference on Akash Network or Bittensor subnet |
| Frontend | IPFS / ENS hosting of frontend bundle |
| Governance | DAO multi-sig for contract upgrades (Gnosis Safe) |
| Storage | Filecoin backup mirroring of all 0G blobs |
| Identity | ENS / Lens Protocol profile integration |
| Revenue | Protocol fee governance via $LORE token |

---

## Bottleneck Analysis

### AI (Most Likely Bottleneck)
- Groq free tier has rate limits (tokens/min per key) — now shared across 3 routes
- Mitigation: Per-route rate limiting, request queue, caching frequent prompts
- Long-term: Local model for common queries, Groq/Claude for complex remixes

### 0G Storage Upload
- Upload speed depends on user connection and 0G node availability
- Mitigation: Upload progress indicators, chunked upload, retry logic
- Large files (>100MB): Background worker + webhook notification

### Smart Contract Gas
- Story upload triggers 2 transactions (0G + contract)
- IP licensing adds 1–2 transactions per license flow
- Mitigation: Batch multiple operations where possible
- `eth_estimateGas` is unreliable on 0G testnet — all write calls hardcode gas limits

### Vercel Serverless
- Cold start latency on AI routes (~200ms)
- Mitigation: Edge runtime for non-AI routes, keep-warm pings
- Genealogy suggest route processes up to 200 ancestors × 500 stories — consider token budget cap

---

## Performance Targets

| Metric | V1 | V2 | V3 |
|---|---|---|---|
| Page load (LCP) | <3s | <2s | <1.5s |
| Story upload (10MB) | <30s | <15s | <10s |
| AI response (first token) | <3s | <2s | <1s |
| Pitch brief generation | <8s | <5s | <3s |
| Tree render (100 ancestors) | <500ms | <300ms | <200ms |
| MAU supported | 10K | 100K | 1M+ |

---

## Cost Projections

| MAU | Monthly Infra Cost (est.) |
|---|---|
| 1K | ~$50 (Vercel free tier + API costs) |
| 10K | ~$500 |
| 100K | ~$3,000–$5,000 |
| 1M | Custom enterprise pricing |

Primary costs: Groq API tokens (3 routes), Vercel bandwidth, 0G storage fees.
IP module royalties and platform fees are self-funded by protocol revenue.
