# LoreRich Vault — Smart Contracts

Foundry project. Two contracts. No proxies in V1.

## Contracts

| Contract | Description |
|---|---|
| `src/LoreVault.sol` | Vault management, story metadata, 0G DA proof storage, access control |
| `src/SoulboundStory.sol` | ERC721 + ERC5192 soulbound token — minted per story, non-transferable |
| `src/interfaces/IERC5192.sol` | ERC5192 minimal soulbound interface |
| `script/Deploy.s.sol` | Deployment script |
| `test/LoreVault.t.sol` | Foundry tests |

## Setup

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install dependencies
forge install OpenZeppelin/openzeppelin-contracts
forge install foundry-rs/forge-std

# Build
forge build

# Test
forge test -vv

# Test with gas report
forge test --gas-report
```

## Deploy

```bash
cp .env.example .env
# Fill RPC_URL and DEPLOYER_PRIVATE_KEY

forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast
```

## Security Properties

- **Reentrancy**: `ReentrancyGuard` on all state-mutating external functions
- **Access control**: `onlyVaultOwner` modifier — no caller can mutate another wallet's vault
- **Soulbound**: `transferFrom`, `approve`, `setApprovalForAll` all revert unconditionally
- **No ETH**: V1 contracts accept no ETH value — no accidental ETH lock
- **Bounded arrays**: `MAX_STORIES_PER_VAULT = 10,000`, `MAX_VAULTS_PER_ADDRESS = 100`
- **CEI pattern**: All state changes before external calls

## Audit Status

V1 — **Not yet audited**. Do not deploy to mainnet before a professional audit.
Run `slither .` and `mythril analyze` before engaging auditors.

See [../docs/security-audit.md](../docs/security-audit.md) for full checklist.
