# LoreLich Vault — Security Audit Checklist

## Smart Contract Security

### Reentrancy
- [ ] All state changes occur **before** external calls (CEI pattern)
- [ ] `ReentrancyGuard` from OpenZeppelin applied to state-mutating functions
- [ ] No ETH value sent to external contracts in V1

### Access Control
- [ ] `Ownable` or `AccessControl` on admin functions
- [ ] `onlyVaultOwner` modifier before vault mutations
- [ ] `onlyMinter` role on `SoulboundStory.mint()`
- [ ] Role separation: deployer ≠ admin ≠ minter
- [ ] No `tx.origin` checks (use `msg.sender` only)

### Storage Safety
- [ ] No unbounded loops (risk of block gas limit DoS)
- [ ] Arrays capped at reasonable maximum lengths
- [ ] Mappings preferred over arrays for O(1) access
- [ ] No storage of sensitive data on-chain (keys encrypted before storing)
- [ ] All structs packed to minimize storage slots

### Soulbound Integrity
- [ ] `transferFrom`, `safeTransferFrom`, `approve`, `setApprovalForAll` all revert
- [ ] `locked()` always returns `true` (ERC5192)
- [ ] Token IDs tied 1:1 to story IDs — no orphan mints

### Integer Safety
- [ ] Using Solidity `^0.8.24` — built-in overflow protection
- [ ] Division before multiplication avoided (precision loss)
- [ ] Token ID counter uses monotonic increment (no reuse)

### Input Validation
- [ ] Empty string checks on `zgRootHash`, `name`
- [ ] `duration` must be > 0 for audio/video
- [ ] `mediaType` validated against enum
- [ ] Max story count per vault enforced

---

## Frontend Security

### Encryption
- [ ] AES-GCM 256-bit via Web Crypto API (native, not JS library)
- [ ] PBKDF2 key derivation — 310,000 iterations minimum
- [ ] Unique IV per encryption operation
- [ ] Random salt per vault/session — never reused
- [ ] Encrypted blobs never logged or persisted in localStorage unencrypted

### Wallet / Auth
- [ ] No private keys stored in frontend state
- [ ] Message signing used for auth (no password auth)
- [ ] Wallet disconnect clears all sensitive state
- [ ] No `eval()` or dynamic script injection near wallet state

### AI Prompt Injection Defenses
- [ ] System prompt is server-side only — never exposed to client
- [ ] User input sanitized before inclusion in prompt
- [ ] Max token limit enforced per query (512 input, 1024 output)
- [ ] Rate limiting per IP: 10 requests/minute (configurable)
- [ ] Reject inputs containing `</s>`, `<|im_start|>`, `SYSTEM:`, `Ignore previous`
- [ ] AI responses validated — no code execution of AI output

### API Route Security
- [ ] `ANTHROPIC_API_KEY` server-side only (no `NEXT_PUBLIC_`)
- [ ] CORS restricted to own domain
- [ ] All API routes wrapped in try/catch with generic error messages
- [ ] No stack traces exposed to client in production
- [ ] Request body size limited (next.config maxRequestBodySize)

### General Frontend
- [ ] CSP headers configured (no `unsafe-eval`, `unsafe-inline`)
- [ ] No XSS vectors in story content rendering (sanitize HTML)
- [ ] `rel="noopener noreferrer"` on all external links
- [ ] File type validation client-side AND server-side before 0G upload
- [ ] HTTPS enforced — no mixed content

---

## Infrastructure Security

- [ ] `.env` files excluded from git (`.gitignore` verified)
- [ ] Secrets managed via Vercel encrypted env or secrets manager
- [ ] Deployer wallet is a hardware wallet or MPC wallet (not hot wallet)
- [ ] Admin wallet separate from deployer wallet
- [ ] `DEPLOYER_PRIVATE_KEY` rotated post-deployment
- [ ] Monitoring on contract events (OpenZeppelin Defender or custom)
- [ ] Alerting on unusual mint volume or access grant spikes

---

## Pre-Audit Preparation

Before engaging an external auditor:

1. All tests passing (`forge test -vvv`)
2. 100% branch coverage on critical paths
3. `slither .` run — all findings reviewed
4. `mythril analyze` run on both contracts
5. Manual review of all `external` and `public` functions
6. NatSpec documentation on all public interfaces
7. Known issues documented in `KNOWN_ISSUES.md`

---

## Recommended Auditors (V1 Budget)

| Tier | Auditor | Notes |
|---|---|---|
| Full audit | Code4rena contest | Community + paid auditors |
| Full audit | Spearbit / Cantina | Premium, pre-V1 mainnet |
| Automated | Slither (free) | Run in CI/CD |
| Automated | Mythril (free) | Run pre-deploy |

**Do not deploy to mainnet without at least one paid audit.**
