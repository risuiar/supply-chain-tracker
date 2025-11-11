// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/SupplyChainTracker.sol";

contract DeploySupplyChainTracker is Script {
    function run() external returns (SupplyChainTracker tracker) {
        vm.startBroadcast();
        tracker = new SupplyChainTracker();
        vm.stopBroadcast();
    }
}
