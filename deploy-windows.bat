@echo off
echo.
echo ========================================
echo   Desplegando Contratos en Red Local
echo ========================================
echo.

cd sc

echo Desplegando RoleManager, TokenFactory y TransferManager...
echo.

REM Ejecutar el deploy y capturar output
forge script script/DeploySupplyChain.s.sol:DeploySupplyChain --rpc-url http://localhost:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast > deploy_output.txt 2>&1

REM Mostrar el output del deploy
type deploy_output.txt

echo.
echo ========================================
echo   Variables para web\.env
echo ========================================
echo.

REM Extraer direcciones y mostrar variables completas
powershell -Command "& {$content = Get-Content 'deploy_output.txt' -Raw; if($content -match 'RoleManager:\s+([0-9a-fA-Fx]+)'){$roleManager=$matches[1]} else {$roleManager='DIRECCION_NO_ENCONTRADA'}; if($content -match 'TokenFactory:\s+([0-9a-fA-Fx]+)'){$tokenFactory=$matches[1]} else {$tokenFactory='DIRECCION_NO_ENCONTRADA'}; if($content -match 'TransferManager:\s+([0-9a-fA-Fx]+)'){$transferManager=$matches[1]} else {$transferManager='DIRECCION_NO_ENCONTRADA'}; Write-Host \"VITE_ROLE_MANAGER_ADDRESS_ANVIL=$roleManager\"; Write-Host \"VITE_TOKEN_FACTORY_ADDRESS_ANVIL=$tokenFactory\"; Write-Host \"VITE_TRANSFER_MANAGER_ADDRESS_ANVIL=$transferManager\"}"

echo.
echo Cuenta Admin:
echo   Address:     0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
echo   Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
echo.
echo Siguiente paso:
echo   1. Copia las 3 lineas de "Variables para web\.env" a tu archivo web\.env
echo   2. Reinicia el frontend: cd web ^&^& npm run dev
echo   3. Conecta MetaMask con la cuenta admin
echo.

REM Limpiar archivo temporal
del deploy_output.txt

pause

