# LoreRich Vault — Deployment Guide

## Prerequisites

- Node.js >= 20.x
- Bun >= 1.1 (preferred runtime)
- Foundry (forge, cast, anvil) — `curl -L https://foundry.paradigm.xyz | bash`
- Git

---

## 1. Clone & Install

```bash
git clone https://github.com/your-org/lorelich-vault.git
cd lorelich-vault
bun install
```

---

## 2. Environment Setup

Copy the example env and fill in values:

```bash
cp .env.example .env.local          # Frontend
cp contracts/.env.example contracts/.env  # Contracts
```

See [environment.md](./environment.md) for full variable reference.

---

## 3. Smart Contract Deployment

### 3a. Compile

```bash
cd contracts
forge build
```

### 3b. Run Tests

```bash
forge test -vv
```

### 3c. Deploy to 0G Testnet (Newton)

```bash
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --verify \
  --verifier blockscout \
  --verifier-url https://chainscan-newton.0g.ai/api
```

### 3d. Save Deployed Addresses

After deployment, update `apps/web/src/lib/contracts.ts` with the returned addresses:

```ts
export const LORE_VAULT_ADDRESS   = "0x...";
export const SOULBOUND_STORY_ADDRESS = "0x...";
```

---

## 4. Frontend Deployment

### Local Development

```bash
cd apps/web
bun dev
```

Open `http://localhost:3000`.

### Production Build

```bash
cd apps/web
bun run build
bun run start
```

### Vercel Deployment (Recommended)

```bash
# Install Vercel CLI
bun add -g vercel

# Deploy
cd apps/web
vercel --prod
```

Set all environment variables in the Vercel dashboard under **Project → Settings → Environment Variables**.

---

## 5. Verify Deployment

```bash
# Check vault contract
cast call $LORE_VAULT_ADDRESS "totalVaults()(uint256)" --rpc-url $RPC_URL

# Check soulbound contract
cast call $SOULBOUND_STORY_ADDRESS "name()(string)" --rpc-url $RPC_URL
```

---

## 6. Post-Deployment Checklist

- [ ] Contract addresses saved to `contracts.ts`
- [ ] All env vars set in Vercel / hosting provider
- [ ] 0G storage nodes reachable (ping test)
- [ ] Anthropic API key active and rate-limited
- [ ] Wallet connect project ID verified (WalletConnect Cloud)
- [ ] Sentry / monitoring configured
- [ ] HTTPS forced (no HTTP endpoints)
- [ ] Rate limiting middleware active on `/api/*` routes

---

## 7. Rollback

If a deployment fails:

```bash
# Re-deploy previous contract version
forge script script/Deploy.s.sol --rpc-url $RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast

# Revert Vercel deployment
vercel rollback [deployment-url]
```
