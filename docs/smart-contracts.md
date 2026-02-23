# LoreLich Vault — Smart Contract Deployment Guide

## Contracts Overview

| Contract | Purpose |
|---|---|
| `LoreVault.sol` | Manages vaults, story metadata, access control, 0G storage refs |
| `SoulboundStory.sol` | ERC5192 soulbound token minted on story upload |

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

---

## Deployment Script

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

---

## Network Configs

### 0G Newton Testnet
- **Chain ID**: `16602`
- **RPC**: `https://evmrpc-testnet.0g.ai`
- **Explorer**: `https://chainscan-newton.0g.ai`
- **Faucet**: `https://faucet.0g.ai`

### Ethereum Sepolia (fallback testing)
- **Chain ID**: `11155111`
- **RPC**: `https://rpc.sepolia.org`

---

## Verification

```bash
forge verify-contract \
  <DEPLOYED_ADDRESS> \
  src/LoreVault.sol:LoreVault \
  --verifier blockscout \
  --verifier-url https://chainscan-newton.0g.ai/api \
  --chain-id 16602
```

---

## Upgrade Path (V2)

Contracts are **non-upgradeable** in V1 for simplicity and auditability. If a bug is found:

1. Deploy new contract version
2. Emit migration event from old contract
3. Frontend reads both contract versions during transition period
4. Governance vote (V2) to officially deprecate old address

Do **not** use transparent proxies in V1 — they increase attack surface before audit.

---

## Gas Estimates (0G Newton)

| Operation | Est. Gas |
|---|---|
| `createVault` | ~85,000 |
| `uploadStory` | ~120,000 |
| `mint` (soulbound) | ~95,000 |
| `grantAccess` | ~45,000 |

---

## Emergency Procedures

```bash
# Pause vault (if Pausable added in V2)
cast send $LORE_VAULT_ADDRESS "pause()" --private-key $ADMIN_KEY --rpc-url $RPC_URL

# Check owner
cast call $LORE_VAULT_ADDRESS "owner()(address)" --rpc-url $RPC_URL
```
