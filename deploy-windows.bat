@echo off
echo.
echo ========================================
echo   Desplegando Contratos en Red Local
echo ========================================
echo.

cd sc

echo Desplegando RoleManager, TokenFactory y TransferManager...
echo.

<<<<<<< HEAD
forge script script/DeploySupplyChain.s.sol:DeploySupplyChain --rpc-url http://localhost:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast
=======
forge script script/DeploySupplyChainSystem.s.sol:DeploySupplyChain --rpc-url http://localhost:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast
>>>>>>> dev

echo.
echo ========================================
echo   Deployment Completado
echo ========================================
echo.
echo IMPORTANTE: Copia las direcciones de arriba y actualiza:
<<<<<<< HEAD
echo   web\src\contracts\config.ts
=======
echo   web\.env
>>>>>>> dev
echo.
echo Cuenta Admin:
echo   Address:     0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
echo   Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
echo.
echo Siguiente paso:
<<<<<<< HEAD
echo   1. Actualiza las direcciones en config.ts
echo   2. Reinicia el frontend: cd web && npm run dev
=======
echo   1. Actualiza las direcciones en web\.env
echo   2. Reinicia el frontend: cd web ^&^& npm run dev
>>>>>>> dev
echo   3. Conecta MetaMask con la cuenta admin
echo.
pause

