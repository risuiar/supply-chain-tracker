// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/RoleManager.sol";
import "../src/TokenFactory.sol";
import "../src/TransferManager.sol";

/// @title Script de Despliegue del Sistema de Cadena de Suministro
/// @notice Despliega los tres contratos principales: RoleManager, TokenFactory y TransferManager
contract DeploySupplyChain is Script {
    function run() external {
        vm.startBroadcast();

        // 1. Despliega RoleManager primero (es independiente)
        RoleManager roleManager = new RoleManager();
        console.log("RoleManager desplegado en:", address(roleManager));

        // 2. Despliega TokenFactory con la dirección de RoleManager
        TokenFactory tokenFactory = new TokenFactory(address(roleManager));
        console.log("TokenFactory desplegado en:", address(tokenFactory));

        // 3. Despliega TransferManager con ambas direcciones
        TransferManager transferManager = new TransferManager(
            address(roleManager),
            address(tokenFactory)
        );
        console.log("TransferManager desplegado en:", address(transferManager));

        console.log("\n=== Resumen del Despliegue ===");
        console.log("RoleManager:     ", address(roleManager));
        console.log("TokenFactory:    ", address(tokenFactory));
        console.log("TransferManager: ", address(transferManager));
        console.log("Admin:           ", roleManager.admin());

        vm.stopBroadcast();
    }
}

