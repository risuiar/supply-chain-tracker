@echo off
echo.
echo ========================================
echo   Desplegando Contratos en Sepolia Testnet
echo ========================================
echo.

REM Verificar que existe el archivo .env
if not exist "sc\.env" (
    echo ERROR: No se encontro el archivo sc\.env
    echo.
    echo Crea el archivo sc\.env con las siguientes variables:
    echo   SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/TU_ALCHEMY_KEY
    echo   PRIVATE_KEY=tu_private_key_sin_0x
    echo   ETHERSCAN_API_KEY=tu_api_key_opcional
    echo.
    pause
    exit /b 1
)

cd sc

REM Usar script PowerShell para extraer valores
powershell -ExecutionPolicy Bypass -File read-env.ps1

if errorlevel 1 (
    del _temp_rpc.txt 2>nul
    del _temp_key.txt 2>nul
    del _temp_etherscan.txt 2>nul
    pause
    exit /b 1
)

REM Leer valores desde archivos temporales
set /p SEPOLIA_RPC_URL=<_temp_rpc.txt
set /p PRIVATE_KEY=<_temp_key.txt
if exist _temp_etherscan.txt (
    set /p ETHERSCAN_API_KEY=<_temp_etherscan.txt
)

REM Limpiar archivos temporales
del _temp_rpc.txt 2>nul
del _temp_key.txt 2>nul
del _temp_etherscan.txt 2>nul

REM Verificar que las variables esten configuradas
if "%SEPOLIA_RPC_URL%"=="" (
    echo ERROR: SEPOLIA_RPC_URL no esta configurado en sc\.env
    pause
    exit /b 1
)

if "%PRIVATE_KEY%"=="" (
    echo ERROR: PRIVATE_KEY no esta configurado en sc\.env
    pause
    exit /b 1
)

echo Verificando configuracion...
echo RPC URL: %SEPOLIA_RPC_URL%
echo Private Key: %PRIVATE_KEY:~0,10%... (oculto por seguridad)
if not "%ETHERSCAN_API_KEY%"=="" (
    echo Etherscan API Key: Configurado (verificacion habilitada)
) else (
    echo Etherscan API Key: No configurado (sin verificacion)
)
echo.

echo Desplegando RoleManager, TokenFactory y TransferManager en Sepolia...
echo.

REM Construir comando base
set FORGE_CMD=forge script script/DeploySupplyChainSystem.s.sol:DeploySupplyChain --rpc-url %SEPOLIA_RPC_URL% --private-key %PRIVATE_KEY% --broadcast

REM Agregar verificacion si hay API key
if not "%ETHERSCAN_API_KEY%"=="" (
    set FORGE_CMD=%FORGE_CMD% --verify --etherscan-api-key %ETHERSCAN_API_KEY%
)

REM Ejecutar despliegue
%FORGE_CMD%

echo.
echo ========================================
echo   Deployment Completado
echo ========================================
echo.
echo IMPORTANTE: Copia las direcciones de arriba y actualiza:
echo   web\.env
echo.
echo Ejemplo de web\.env para Sepolia:
echo   VITE_ROLE_MANAGER_ADDRESS_SEPOLIA=0x...
echo   VITE_TOKEN_FACTORY_ADDRESS_SEPOLIA=0x...
echo   VITE_TRANSFER_MANAGER_ADDRESS_SEPOLIA=0x...
echo   VITE_ADMIN_ADDRESS_SEPOLIA=0x... (direccion de tu cuenta)
echo.
echo Siguiente paso:
echo   1. Actualiza las direcciones en web\.env
echo   2. Configura MetaMask para usar la red Sepolia
echo   3. Asegurate de tener SepoliaETH en tu cuenta
echo   4. Reinicia el frontend: cd web ^&^& npm run dev
echo.
pause
