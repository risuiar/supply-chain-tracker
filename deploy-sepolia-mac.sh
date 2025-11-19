#!/bin/bash

echo ""
echo "========================================"
echo "  Desplegando Contratos en Sepolia Testnet"
echo "========================================"
echo ""

# Verificar que existe el archivo .env
if [ ! -f "sc/.env" ]; then
    echo "ERROR: No se encontró el archivo sc/.env"
    echo ""
    echo "Crea el archivo sc/.env con las siguientes variables:"
    echo "  SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/TU_ALCHEMY_KEY"
    echo "  PRIVATE_KEY=tu_private_key_sin_0x"
    echo "  ETHERSCAN_API_KEY=tu_api_key_opcional"
    echo ""
    exit 1
fi

cd sc

# Cargar variables de entorno
export $(grep -v '^#' .env | xargs)

# Verificar que las variables estén configuradas
if [ -z "$SEPOLIA_RPC_URL" ]; then
    echo "ERROR: SEPOLIA_RPC_URL no está configurado en sc/.env"
    exit 1
fi

if [ -z "$PRIVATE_KEY" ]; then
    echo "ERROR: PRIVATE_KEY no está configurado en sc/.env"
    exit 1
fi

echo "Verificando configuración..."
echo "RPC URL: $SEPOLIA_RPC_URL"
echo "Private Key: ${PRIVATE_KEY:0:10}... (oculto por seguridad)"
if [ -n "$ETHERSCAN_API_KEY" ]; then
    echo "Etherscan API Key: Configurado (verificación habilitada)"
else
    echo "Etherscan API Key: No configurado (sin verificación)"
fi
echo ""

echo "========================================"
echo "  Limpiando estados anteriores de Sepolia"
echo "========================================"
echo ""
echo "Eliminando archivos de broadcast y cache anteriores..."

# Limpiar broadcast de Sepolia (chain ID: 11155111)
if [ -d "broadcast/DeploySupplyChainSystem.s.sol/11155111" ]; then
    echo "Eliminando broadcast anterior de Sepolia..."
    rm -rf "broadcast/DeploySupplyChainSystem.s.sol/11155111"
fi

# Limpiar cache de Sepolia (chain ID: 11155111)
if [ -d "cache/DeploySupplyChainSystem.s.sol/11155111" ]; then
    echo "Eliminando cache anterior de Sepolia..."
    rm -rf "cache/DeploySupplyChainSystem.s.sol/11155111"
fi

echo "Estados anteriores eliminados. Iniciando deploy limpio..."
echo ""

echo "Desplegando RoleManager, TokenFactory y TransferManager en Sepolia..."
echo ""

# Construir comando base
FORGE_CMD="forge script script/DeploySupplyChainSystem.s.sol:DeploySupplyChain --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY --broadcast"

# Agregar verificación si hay API key
if [ -n "$ETHERSCAN_API_KEY" ]; then
    FORGE_CMD="$FORGE_CMD --verify --etherscan-api-key $ETHERSCAN_API_KEY"
fi

# Ejecutar despliegue
eval $FORGE_CMD

echo ""
echo "========================================"
echo "  Deployment Completado"
echo "========================================"
echo ""
echo "NOTA: Si viste warnings sobre 'Could not detect deployment' o"
echo "'Verification is still pending', son NORMALES. Etherscan puede"
echo "tardar unos segundos en procesar la verificación. Si al final"
echo "ves 'All contracts were verified!', todo está correcto."
echo ""
echo "IMPORTANTE: Copia las direcciones de arriba y actualiza:"
echo "  web/.env"
echo ""
echo "Ejemplo de web/.env para Sepolia:"
echo "  VITE_ROLE_MANAGER_ADDRESS_SEPOLIA=0x..."
echo "  VITE_TOKEN_FACTORY_ADDRESS_SEPOLIA=0x..."
echo "  VITE_TRANSFER_MANAGER_ADDRESS_SEPOLIA=0x..."
echo "  VITE_ADMIN_ADDRESS_SEPOLIA=0x... (dirección de tu cuenta)"
echo ""
echo "Siguiente paso:"
echo "  1. Actualiza las direcciones en web/.env"
echo "  2. Configura MetaMask para usar la red Sepolia"
echo "  3. Asegúrate de tener SepoliaETH en tu cuenta"
echo "  4. Reinicia el frontend: cd web && npm run dev"
echo ""

