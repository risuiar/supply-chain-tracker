# 🌐 Deployment en Testnets (Sepolia, etc.)

> ⚠️ **Advertencia**: Este documento contiene instrucciones para el despliegue en la testnet Sepolia. Tenga en cuenta que esto fue un intento, no funciona correctamente y el desarrollo no fue finalizado.

> 💻 **Live Testnet Frontend:** La versión conectada a Sepolia está desplegada en un VPS propio y disponible en https://supply-chain-tracker-risuiar.travix.app/. Usa la red Sepolia en MetaMask para interactuar con los contratos verificados.

Para desplegar en una red de prueba real en lugar de local:

### 1. Configurar Variables de Entorno

Crea un archivo `sc/.env` con tu configuración:

```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/TU_ALCHEMY_KEY
PRIVATE_KEY=tu_private_key_sin_0x
ETHERSCAN_API_KEY=tu_api_key_opcional
```

**⚠️ Importante:**
- `PRIVATE_KEY` debe ser sin el prefijo `0x`
- Asegúrate de tener SepoliaETH en tu cuenta (usa un faucet: https://sepoliafaucet.com)
- `ETHERSCAN_API_KEY` es opcional, pero recomendado para verificar contratos

### 2. Desplegar en Sepolia

**En Windows:**
```bash
deploy-sepolia-windows.bat
```

**En Mac/Linux:**
```bash
chmod +x deploy-sepolia-mac.sh
./deploy-sepolia-mac.sh
```

Los scripts automáticamente:
- ✅ Verifican que existe `sc/.env`
- ✅ Cargan las variables de entorno
- ✅ Validan que las variables estén configuradas
- ✅ Despliegan los contratos en Sepolia
- ✅ Verifican los contratos en Etherscan (si tienes API key)

**📝 Copia las 3 direcciones que aparecen:**
```
RoleManager:      0x...
TokenFactory:     0x...
TransferManager:  0x...
```

> **💡 Nota**: Estas direcciones son únicas para tu deployment y serán diferentes cada vez que despliegues los contratos.

### 3. Actualizar Frontend

Actualiza `web/.env` con las **nuevas direcciones de Sepolia**:

```env
# Cambia la red a sepolia
VITE_NETWORK=sepolia

# Actualiza las direcciones SEPOLIA (mantén las ANVIL también)
VITE_ROLE_MANAGER_ADDRESS_SEPOLIA=0x... # Dirección de Sepolia
VITE_TOKEN_FACTORY_ADDRESS_SEPOLIA=0x... # Dirección de Sepolia
VITE_TRANSFER_MANAGER_ADDRESS_SEPOLIA=0x... # Dirección de Sepolia
```

### 4. Configurar MetaMask

1. **Agregar Red Sepolia**:
   - Nombre: `Sepolia`
   - RPC URL: `https://eth-sepolia.g.alchemy.com/v2/TU_ALCHEMY_KEY` (o usa una pública)
   - Chain ID: `11155111`
   - Moneda: `ETH`

2. **Usar cualquier cuenta con SepoliaETH**:
   - Puedes usar cualquier cuenta que tenga SepoliaETH
   - El primer usuario que solicite "Administrador" se convertirá automáticamente en Admin
   - Asegúrate de tener SepoliaETH (usa un faucet si necesitas: https://sepoliafaucet.com)

3. **Conectar a la aplicación**:
   - Cambia a la red Sepolia en MetaMask
   - Conecta tu wallet en la aplicación
