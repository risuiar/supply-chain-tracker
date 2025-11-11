// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/RoleManager.sol";
import "../src/TokenFactory.sol";
import "../src/TransferManager.sol";

contract DeploySupplyChain is Script {
    function run() external {
        vm.startBroadcast();

        // 1. Deploy RoleManager first
        RoleManager roleManager = new RoleManager();
        console.log("RoleManager deployed to:", address(roleManager));

        // 2. Deploy TokenFactory with RoleManager address
        TokenFactory tokenFactory = new TokenFactory(address(roleManager));
        console.log("TokenFactory deployed to:", address(tokenFactory));

        // 3. Deploy TransferManager with both addresses
        TransferManager transferManager = new TransferManager(
            address(roleManager),
            address(tokenFactory)
        );
        console.log("TransferManager deployed to:", address(transferManager));

        console.log("\n=== Deployment Summary ===");
        console.log("RoleManager:     ", address(roleManager));
        console.log("TokenFactory:    ", address(tokenFactory));
        console.log("TransferManager: ", address(transferManager));
        console.log("Admin:           ", roleManager.admin());

        vm.stopBroadcast();
    }
}
