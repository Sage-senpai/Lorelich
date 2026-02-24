# LoreLich Vault — Smart Contract Deployment Guide

## Contracts Overview

| Contract | Purpose | Status |
|---|---|---|
| `LoreVault.sol` | Manages vaults, story metadata, access control, 0G storage refs | Deployed |
| `SoulboundStory.sol` | ERC5192 soulbound token minted on story upload | Deployed |
| `LoreIPModule.sol` | IP licensing, on-chain royalties, license requests | Deployed |

---

## Setup (Foundry)

```bash
cd contracts
forge install OpenZeppelin/openzeppelin-contracts
forge install foundry-rs/forge-std
```

`foundry.toml`:
```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc = "0.8.24"
optimizer = true
optimizer_runs = 200
```

---

## Contract Architecture

### LoreVault.sol

```
LoreVault
├── createVault(name, isPrivate) → vaultId
├── uploadStory(vaultId, cid, encryptedKey, mediaType, duration) → storyId
├── grantAccess(vaultId, address)
├── revokeAccess(vaultId, address)
├── getStory(storyId) → StoryMetadata
├── getVaultStories(vaultId) → storyId[]
└── getDAProof(storyId) → proof bytes
```

### SoulboundStory.sol

```
SoulboundStory (ERC721 + ERC5192)
├── mint(to, storyId, tokenURI) — only LoreVault
├── locked(tokenId) → true     — always locked
├── transferFrom() → reverts   — non-transferable
└── tokenURI(tokenId) → IPFS/Arweave metadata URI
```

### LoreIPModule.sol

```
LoreIPModule
├── setTerms(storyId, isLicensable, commercialUse, exclusiveAvailable,
│            royaltyWei, exclusiveRoyaltyWei, maxLicenses, jurisdictionNote)
│   — onlyStoryUploader; locked after first approval
├── requestLicense(storyId, licenseType, purposeNote) payable → requestId
│   — validates isLicensable, commercialUse, maxLicenses, exact msg.value
├── approveRequest(requestId, expirySeconds) nonReentrant
│   — only uploader; CEI: sets state → distributes royalty minus PLATFORM_FEE_BPS
│   — EXCLUSIVE approval: sets isLicensable = false
├── rejectRequest(requestId) nonReentrant
│   — only uploader; refunds licensee via _pendingWithdrawals
├── revokeRequest(requestId) nonReentrant
│   — only uploader; sets REVOKED, clears _hasActiveLicense
├── withdraw() nonReentrant
│   — pull pattern: zeroes balance before .call{value}()
├── getTerms(storyId) → LicenseTerms
├── getRequest(requestId) → LicenseRequest
├── getStoryRequests(storyId) → requestId[]
├── hasActiveLicense(storyId, licensee) → bool
└── pendingWithdrawal(account) → uint256
```

**Security Properties:**
- `ReentrancyGuard` on all payable and ETH-transfer functions
- Pull-pattern ETH distribution — no push transfers
- CEI (Checks-Effects-Interactions) throughout
- Terms lock after first approval — no retroactive changes to approved licenses
- `onlyStoryUploader` reads from `ILoreVault.stories()` — zero LoreVault state modification
- Platform fee: `PLATFORM_FEE_BPS = 250` (2.5%), immutable

**License Types**: `PERSONAL | DOCUMENTARY | COMMERCIAL | EXCLUSIVE`
**License Statuses**: `PENDING | APPROVED | REJECTED | EXPIRED | REVOKED`

---

## Deployment Scripts

### Core (LoreVault + SoulboundStory)

`contracts/script/Deploy.s.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {LoreVault} from "../src/LoreVault.sol";
import {SoulboundStory} from "../src/SoulboundStory.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        SoulboundStory soul = new SoulboundStory();
        LoreVault vault = new LoreVault(address(soul));

        // Grant vault contract minter role on soul token
        soul.grantMinterRole(address(vault));

        console.log("SoulboundStory:", address(soul));
        console.log("LoreVault:     ", address(vault));

        vm.stopBroadcast();
    }
}
```

### IP Module

`contracts/script/DeployIPModule.s.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {LoreIPModule} from "../src/LoreIPModule.sol";

contract DeployIPModule is Script {
    function run() external {
        address loreVault    = vm.envAddress("LORE_VAULT_ADDRESS");
        address feeRecipient = vm.envAddress("FEE_RECIPIENT");
        uint256 deployerKey  = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerKey);
        LoreIPModule ipModule = new LoreIPModule(loreVault, feeRecipient);
        console.log("LoreIPModule:", address(ipModule));
        vm.stopBroadcast();
    }
}
```

---

## Network Configs

### 0G Galileo Testnet (current)
- **Chain ID**: `16601`
- **RPC**: `https://evmrpc-testnet.0g.ai`
- **Explorer**: `https://chainscan-galileo.0g.ai`
- **Faucet**: `https://faucet.0g.ai`

### 0G Newton Testnet (legacy)
- **Chain ID**: `16602`
- **RPC**: `https://evmrpc-testnet.0g.ai`
- **Explorer**: `https://chainscan-newton.0g.ai`

### Ethereum Sepolia (fallback testing)
- **Chain ID**: `11155111`
- **RPC**: `https://rpc.sepolia.org`

---

## Deployed Addresses (0G Galileo Testnet)

| Contract | Address |
|---|---|
| `LoreIPModule` | `0x036eACE959adb91BdD35b7c1cf607B0133545968` |

Set in frontend environment:
```
NEXT_PUBLIC_LORE_IP_MODULE_ADDRESS=0x036eACE959adb91BdD35b7c1cf607B0133545968
```

---

## Verification

```bash
forge verify-contract \
  <DEPLOYED_ADDRESS> \
  src/LoreVault.sol:LoreVault \
  --verifier blockscout \
  --verifier-url https://chainscan-galileo.0g.ai/api \
  --chain-id 16601
```

---

## Testing

```bash
# Run all contract tests
forge test

# Run IP module tests only
forge test --match-path contracts/test/LoreIPModule.t.sol -vvv

# Simulate setTerms → requestLicense → approveRequest → withdraw
cast call $IP_MODULE "getTerms(uint256)" 0 --rpc-url $RPC_URL
```

---

## Upgrade Path (V2)

Contracts are **non-upgradeable** in V1 for simplicity and auditability. If a bug is found:

1. Deploy new contract version
2. Emit migration event from old contract
3. Frontend reads both contract versions during transition period
4. Governance vote (V2) to officially deprecate old address

Do **not** use transparent proxies in V1 — they increase attack surface before audit.

`LoreIPModule` reads from `LoreVault` via the `ILoreVault` interface — any future vault upgrade can have a new module deployed pointing to the new vault, without touching the old module.

---

## Gas Estimates (0G Galileo)

| Operation | Est. Gas |
|---|---|
| `createVault` | ~85,000 |
| `uploadStory` | ~120,000 |
| `mint` (soulbound) | ~95,000 |
| `grantAccess` | ~45,000 |
| `setTerms` | ~75,000 |
| `requestLicense` | ~90,000 |
| `approveRequest` | ~65,000 |
| `withdraw` | ~35,000 |

> Note: `eth_estimateGas` is unreliable on 0G testnet. All frontend write calls hardcode gas limits to bypass this.

---

## Emergency Procedures

```bash
# Check owner
cast call $LORE_VAULT_ADDRESS "owner()(address)" --rpc-url $RPC_URL

# Check pending withdrawal for an address
cast call $IP_MODULE "pendingWithdrawal(address)(uint256)" $ADDRESS --rpc-url $RPC_URL

# Check if story is licensable
cast call $IP_MODULE "getTerms(uint256)(bool,bool,bool,uint256,uint256,uint256,string,uint256)" $STORY_ID --rpc-url $RPC_URL
```
