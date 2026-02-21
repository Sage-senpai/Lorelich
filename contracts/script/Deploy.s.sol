// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {LoreVault} from "../src/LoreVault.sol";
import {SoulboundStory} from "../src/SoulboundStory.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        console.log("Deployer:       ", deployer);
        console.log("Chain ID:       ", block.chainid);
        console.log("RPC:            ", vm.rpcUrl("zerog_newton"));

        vm.startBroadcast(deployerKey);

        // 1. Deploy SoulboundStory first
        SoulboundStory soul = new SoulboundStory();
        console.log("SoulboundStory: ", address(soul));

        // 2. Deploy LoreVault with soulbound token address
        LoreVault vault = new LoreVault(address(soul));
        console.log("LoreVault:      ", address(vault));

        // 3. Grant LoreVault the MINTER_ROLE on SoulboundStory
        soul.grantMinterRole(address(vault));
        console.log("MINTER_ROLE granted to LoreVault");

        vm.stopBroadcast();

        // Output for copy-paste into contracts.ts
        console.log("\n--- Update apps/web/src/lib/contracts.ts ---");
        console.log("LORE_VAULT_ADDRESS:    ", address(vault));
        console.log("SOULBOUND_ADDRESS:     ", address(soul));
    }
}
