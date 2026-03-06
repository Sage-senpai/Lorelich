# LoreRich Vault — Environment Variables

## Frontend (`apps/web/.env.local`)

| Variable | Required | Description | Example |
|---|---|---|---|
| `NEXT_PUBLIC_CHAIN_ID` | ✅ | Target chain ID | `16602` (0G Newton Testnet) |
| `NEXT_PUBLIC_RPC_URL` | ✅ | EVM RPC endpoint | `https://evmrpc-testnet.0g.ai` |
| `NEXT_PUBLIC_LORE_VAULT_ADDRESS` | ✅ | Deployed LoreVault contract | `0x...` |
| `NEXT_PUBLIC_SOULBOUND_ADDRESS` | ✅ | Deployed SoulboundStory contract | `0x...` |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | ✅ | WalletConnect Cloud project ID | `abc123...` |
| `NEXT_PUBLIC_0G_INDEXER_URL` | ✅ | 0G storage indexer endpoint | `https://indexer-storage-testnet-standard.0g.ai` |
| `NEXT_PUBLIC_0G_RPC` | ✅ | 0G chain RPC for storage ops | `https://evmrpc-testnet.0g.ai` |
| `ANTHROPIC_API_KEY` | ✅ | Claude API key (server-side only) | `sk-ant-...` |
| `ENCRYPTION_SALT` | ✅ | 32-byte hex salt for key derivation | `deadbeef...` (64 hex chars) |
| `NEXT_PUBLIC_APP_URL` | ✅ | Canonical app URL | `https://lorelich.app` |
| `RATE_LIMIT_RPM` | ❌ | AI requests per minute per IP | `10` |
| `SENTRY_DSN` | ❌ | Sentry error tracking DSN | `https://...@sentry.io/...` |
| `NEXT_PUBLIC_POSTHOG_KEY` | ❌ | PostHog analytics key | `phc_...` |

## Contracts (`contracts/.env`)

| Variable | Required | Description |
|---|---|---|
| `RPC_URL` | ✅ | EVM RPC for deployment |
| `DEPLOYER_PRIVATE_KEY` | ✅ | Private key of deployer wallet |
| `ETHERSCAN_API_KEY` | ❌ | For contract verification (Blockscout compatible) |

## Security Notes

- `ANTHROPIC_API_KEY` must **never** be prefixed with `NEXT_PUBLIC_`. It is server-only.
- `DEPLOYER_PRIVATE_KEY` must **never** be committed to git. Add `contracts/.env` to `.gitignore`.
- `ENCRYPTION_SALT` should be generated once: `openssl rand -hex 32`
- Rotate `ENCRYPTION_SALT` only if you are re-encrypting all vault blobs. A rotation without migration breaks existing vaults.
- Store production secrets in a secrets manager (Vercel encrypted env, AWS Secrets Manager, Doppler).

## Generating Required Values

```bash
# Encryption salt
openssl rand -hex 32

# WalletConnect Project ID
# → https://cloud.walletconnect.com → New Project

# Anthropic API Key
# → https://console.anthropic.com → API Keys
```
