// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {LoreIPModule} from "../src/LoreIPModule.sol";

contract DeployIPModule is Script {
    function run() external {
        uint256 deployerKey   = vm.envUint("DEPLOYER_PRIVATE_KEY");
        // Accept NEXT_PUBLIC_LORE_VAULT_ADDRESS (Next.js convention) or plain LORE_VAULT_ADDRESS
        address loreVault = vm.envOr("LORE_VAULT_ADDRESS",
                            vm.envAddress("NEXT_PUBLIC_LORE_VAULT_ADDRESS"));
        address feeRecipient  = vm.envAddress("FEE_RECIPIENT");

        address deployer = vm.addr(deployerKey);
        console.log("Deployer:        ", deployer);
        console.log("Chain ID:        ", block.chainid);
        console.log("LoreVault:       ", loreVault);
        console.log("Fee Recipient:   ", feeRecipient);

        vm.startBroadcast(deployerKey);
        LoreIPModule ipModule = new LoreIPModule(loreVault, feeRecipient);
        vm.stopBroadcast();

        console.log("LoreIPModule:    ", address(ipModule));
        console.log("\n--- Add to .env.local and Vercel ---");
        console.log("NEXT_PUBLIC_LORE_IP_MODULE_ADDRESS=", address(ipModule));
    }
}
