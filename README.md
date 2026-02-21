# LoreLich Vault

> *A sacred digital archive. Ancient stories awakening through AI. Immortal. Verifiable. Decentralized.*

LoreLich Vault is a decentralized platform for preserving ancestral stories — audio, video, and text — with client-side encryption, 0G decentralized storage, soulbound on-chain ownership, and an AI guardian that speaks with wisdom and reverence.

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

- **Wallet Login** — Connect with any EVM wallet via WalletConnect
- **Vault Dashboard** — Private and public vault management
- **Story Upload** — Audio, video, and text with client-side AES-GCM encryption
- **0G Storage** — Decentralized, verifiable file storage with DA proofs
- **Soulbound Ownership** — ERC5192 non-transferable token minted per story
- **LoreLich AI** — Claude-powered cultural guardian for story querying and remixing
- **Waveform Playback** — WaveSurfer.js audio visualization
- **Verifiable Proofs** — On-chain 0G merkle roots for every story

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Framer Motion |
| Wallet | wagmi v2, ConnectKit |
| Storage | 0G Storage (`@0glabs/0g-ts-sdk`) |
| Contracts | Solidity 0.8.24, Foundry, OpenZeppelin |
| AI | Anthropic Claude (`claude-sonnet-4-6`) |
| Waveform | WaveSurfer.js |
| State | Zustand |
| Encryption | Web Crypto API (AES-GCM 256) |

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
