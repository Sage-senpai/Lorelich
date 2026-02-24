# LoreLich Vault

> *A sacred digital archive. Ancient stories awakening through AI. Immortal. Verifiable. Decentralized.*

LoreLich Vault is a decentralized platform for preserving ancestral stories — audio, video, and text — with client-side encryption, 0G decentralized storage, soulbound on-chain ownership, an AI guardian that speaks with wisdom and reverence, on-chain IP licensing, AI-generated documentary pitch briefs, and an interactive genealogy constellation builder.

---

## Architecture

```
apps/
  web/           Next.js 14 (App Router) — frontend + API routes
contracts/       Foundry — Solidity smart contracts
docs/            Deployment, integration, and audit guides
```

## Quick Start

```bash
# Install dependencies
bun install

# Setup environment
cp .env.example apps/web/.env.local
cp contracts/.env.example contracts/.env

# Start development
bun dev
```

## Feature Highlights

### Core Archive
- **Wallet Login** — Connect with any EVM wallet via WalletConnect
- **Vault Dashboard** — Private and public vault management
- **Story Upload** — Audio, video, text, and images with client-side AES-GCM encryption
- **0G Storage** — Decentralized, verifiable file storage with DA proofs
- **Soulbound Ownership** — ERC5192 non-transferable token minted per story
- **LoreLich AI** — AI cultural guardian (Groq / llama-3.3-70b) for story querying and remixing
- **Write Stories** — Compose stories directly in-browser; no file import required
- **Waveform Playback** — WaveSurfer.js audio visualization
- **Verifiable Proofs** — On-chain 0G merkle roots for every story

### IP Licensing Layer
- **License Terms** — Story owners set programmable on-chain license terms (royaltyWei, license types, exclusive availability)
- **Story Marketplace** — Browse all licensable stories at `/marketplace` with media type, license type, and price filters
- **License Requests** — Filmmakers and developers request licenses on-chain with payment attached
- **Royalty Withdrawals** — Pull-pattern royalty flow; 2.5% platform fee built into contract
- **Incoming Requests Panel** — Vault owners see and approve/reject pending license requests

### Documentary Pitch Portal
- **AI Film Treatments** — LoreLich generates structured pitch briefs (logline, synopsis, visual approach, comparables, target audience)
- **Pitch Portal** — Browse commercial stories at `/pitch` with generated treatments
- **One-Click License** — Sticky "Request License" bar on each pitch page for immediate action

### Genealogy Tree Builder
- **GEDCOM Import** — Drag-and-drop `.ged` file parser (no external library, pure client-side)
- **Constellation Graph** — React Flow interactive star map at `/tree` with brass-colored edges
- **AI Story Linking** — LoreLich AI suggests which vault stories belong to which ancestor
- **Persistent Tree** — localStorage-backed with optional 0G backup

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Framer Motion |
| Wallet | wagmi v2, ConnectKit |
| Storage | 0G Storage (`@0glabs/0g-ts-sdk`) |
| Contracts | Solidity 0.8.24, Foundry, OpenZeppelin |
| AI | Groq (`llama-3.3-70b-versatile` — free tier) |
| Graph | `@xyflow/react` v12 (React Flow) |
| Waveform | WaveSurfer.js |
| State | Zustand |
| Encryption | Web Crypto API (AES-GCM 256) |

## Deployed Contracts (0G Galileo Testnet)

| Contract | Purpose | Address |
|---|---|---|
| `LoreVault.sol` | Vaults, stories, access control, 0G storage refs | *(see docs/deployment.md)* |
| `SoulboundStory.sol` | ERC5192 soulbound token per story | *(see docs/deployment.md)* |
| `LoreIPModule.sol` | IP licensing, royalties, license requests | `0x036eACE959adb91BdD35b7c1cf607B0133545968` |

## Documentation

- [Deployment Guide](docs/deployment.md)
- [Environment Variables](docs/environment.md)
- [Smart Contract Guide](docs/smart-contracts.md)
- [0G Integration](docs/zerog-integration.md)
- [Security Audit Checklist](docs/security-audit.md)
- [Scaling Roadmap](docs/scaling-roadmap.md)
- [V2 Strategy](docs/v2-strategy.md)

## License

MIT — but ancestral stories belong to their communities. Always.
