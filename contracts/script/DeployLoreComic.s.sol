// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {LoreRichComic} from "../src/LoreRichComic.sol";

contract DeployLoreComic is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        LoreRichComic comic = new LoreRichComic();
        console.log("LoreRichComic:", address(comic));

        vm.stopBroadcast();
    }
}
