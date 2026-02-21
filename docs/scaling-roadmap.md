# LoreLich Vault — Scaling Roadmap

## Current Architecture (V1 Baseline)

```
User → Next.js (Vercel) → 0G Storage + EVM (0G Chain)
                        → Anthropic Claude API (server-side)
```

Single-region, serverless, stateless. Sufficient for 0–10K MAU.

---

## Phase 1: Hardening (0–10K MAU)

**Goal**: Stable, reliable, zero downtime.

| Area | Action | Priority |
|---|---|---|
| Caching | Cache 0G download responses at edge (Vercel KV) | High |
| Rate limiting | Upstash Redis rate limiter on `/api/lorelich` | High |
| Error tracking | Sentry for frontend + API errors | High |
| Monitoring | Datadog or Grafana Cloud on contract events | Medium |
| CDN | Vercel Edge Network for static assets | Low (default) |
| DB | PlanetScale or Supabase for off-chain metadata index | Medium |

---

## Phase 2: Scale-Out (10K–100K MAU)

**Goal**: Handle concurrent vault access, reduce latency.

| Area | Action |
|---|---|
| AI | Move to Claude Batches API for non-realtime remixes |
| AI | Streaming responses on LoreLich chat (`stream: true`) |
| Storage | Multi-region 0G node pinning for faster downloads |
| Indexing | The Graph subgraph for contract event indexing |
| Search | Pinecone or Weaviate for semantic story search (V2) |
| Queue | Upstash QStash for async upload processing |
| Auth | JWT session tokens to reduce RPC calls per page load |

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
| Revenue | Protocol fee (0.5%) on vault monetization |

---

## Bottleneck Analysis

### AI (Most Likely Bottleneck)
- Claude API has rate limits (tokens/min per key)
- Mitigation: Multiple API keys, request queue, caching frequent prompts
- Long-term: Local model for common queries, Claude for complex remixes

### 0G Storage Upload
- Upload speed depends on user connection and 0G node availability
- Mitigation: Upload progress indicators, chunked upload, retry logic
- Large files (>100MB): Background worker + webhook notification

### Smart Contract Gas
- Story upload triggers 2 transactions (0G + contract)
- Mitigation: Batch multiple operations where possible
- Future: zkProof of upload without on-chain call per story

### Vercel Serverless
- Cold start latency on AI route (~200ms)
- Mitigation: Edge runtime for non-AI routes, keep-warm pings

---

## Performance Targets

| Metric | V1 | V2 | V3 |
|---|---|---|---|
| Page load (LCP) | <3s | <2s | <1.5s |
| Story upload (10MB) | <30s | <15s | <10s |
| AI response (first token) | <3s | <2s | <1s |
| Waveform render | <500ms | <200ms | <100ms |
| MAU supported | 10K | 100K | 1M+ |

---

## Cost Projections

| MAU | Monthly Infra Cost (est.) |
|---|---|
| 1K | ~$50 (Vercel free tier + API costs) |
| 10K | ~$500 |
| 100K | ~$3,000–$5,000 |
| 1M | Custom enterprise pricing |

Primary costs: Anthropic API tokens, Vercel bandwidth, 0G storage fees.
