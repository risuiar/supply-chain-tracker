# Guía de Deployment - Sistema de Roles

## 🚨 Error Actual

Si ves este error:
```
Contract not deployed or incorrect address: Error: could not decode result data
```

Significa que el contrato no está desplegado en la red actual o la dirección es incorrecta.

## ✅ Solución: Desplegar los Contratos

### Opción 1: Red Local (Anvil/Hardhat)

#### Paso 1: Iniciar nodo local (si no está corriendo)

```bash
# Con Anvil (Foundry)
anvil

# O con Hardhat
npx hardhat node
```

**⚠️ Importante:** Anota la cuenta #0 que se muestra - esta será tu cuenta admin.

#### Paso 2: Desplegar contratos

En otra terminal:

```bash
cd sc

# Desplegar en Anvil (puerto 8545)
forge script script/DeploySupplyChain.s.sol:DeploySupplyChain \
  --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast

# O si prefieres usar una cuenta diferente
forge script script/DeploySupplyChain.s.sol:DeploySupplyChain \
  --rpc-url http://localhost:8545 \
  --private-key TU_PRIVATE_KEY \
  --broadcast
```

**Nota:** La private key por defecto (`0xac09...`) corresponde a la primera cuenta de Anvil:
- Address: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- Esta será tu cuenta admin

#### Paso 3: Copiar las direcciones

El script mostrará algo como:

```
RoleManager deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
TokenFactory deployed to: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
TransferManager deployed to: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
Admin: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

#### Paso 4: Actualizar `web/src/contracts/config.ts`

```typescript
// Contract addresses (from latest deployment)
export const ROLE_MANAGER_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3'; // ← Actualizar
export const TOKEN_FACTORY_ADDRESS = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'; // ← Actualizar
export const TRANSFER_MANAGER_ADDRESS = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'; // ← Actualizar
export const ADMIN_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'; // ← Ya está correcto

// ... resto del archivo sin cambios
```

#### Paso 5: Reiniciar el frontend

```bash
cd web
npm run dev
```

#### Paso 6: Configurar MetaMask

1. Asegúrate de estar conectado a `Localhost 8545`
2. Importa la cuenta admin usando la private key si aún no lo has hecho
3. Conecta tu wallet en la aplicación

### Opción 2: Red de Prueba (Sepolia, etc.)

#### Paso 1: Configurar variables de entorno

Crea un archivo `.env` en la carpeta `sc/`:

```bash
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/TU_INFURA_KEY
PRIVATE_KEY=tu_private_key_sin_0x
ETHERSCAN_API_KEY=tu_api_key (opcional, para verificar)
```

#### Paso 2: Desplegar

```bash
cd sc

# Sepolia
forge script script/DeploySupplyChain.s.sol:DeploySupplyChain \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify
```

#### Paso 3: Actualizar config.ts

Igual que en la Opción 1, pero con las direcciones de Sepolia.

#### Paso 4: Configurar MetaMask

1. Asegúrate de estar conectado a la red Sepolia
2. Usa la cuenta con la que desplegaste (será el admin)

## 🔍 Verificar el Deployment

### En la consola de Foundry

Si el deployment fue exitoso, verás:

```
=== Deployment Summary ===
RoleManager:      0x...
TokenFactory:     0x...
TransferManager:  0x...
Admin:            0x...
```

### En el Frontend

1. Conecta tu wallet
2. Si ves "Error: El contrato no está desplegado..." → Verifica las direcciones en `config.ts`
3. Si todo está correcto, deberías ver:
   - Como admin: redirect automático a `/admin`
   - Como usuario normal: formulario para solicitar rol

## 🐛 Troubleshooting

### Error: "insufficient funds"
- Tu cuenta no tiene ETH
- En Anvil: usa una de las cuentas pre-financiadas
- En Sepolia: obtén ETH de prueba desde un faucet

### Error: "nonce too high"
- Reset MetaMask: Settings → Advanced → Clear activity tab data

### Error: "chain not supported"
- En MetaMask, agrega la red manualmente:
  - Network Name: Localhost
  - RPC URL: http://localhost:8545
  - Chain ID: 31337
  - Currency: ETH

### Frontend sigue mostrando error después de actualizar config.ts
1. Cierra y abre de nuevo el navegador
2. Desconecta y reconecta la wallet
3. Limpia cache: Ctrl+Shift+R (Windows) o Cmd+Shift+R (Mac)

## 📝 Script Rápido de Deployment Local

Guarda esto como `deploy-local.sh` en la raíz del proyecto:

```bash
#!/bin/bash

echo "🚀 Desplegando contratos en red local..."

cd sc

forge script script/DeploySupplyChain.s.sol:DeploySupplyChain \
  --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast

echo ""
echo "✅ Deployment completado!"
echo "📋 Copia las direcciones de arriba y actualiza web/src/contracts/config.ts"
echo ""
echo "Cuenta Admin: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
echo "Private Key Admin: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
```

Luego hazlo ejecutable y úsalo:

```bash
chmod +x deploy-local.sh
./deploy-local.sh
```

## 🎯 Checklist Post-Deployment

- [ ] Anvil/Hardhat está corriendo
- [ ] Contratos desplegados exitosamente
- [ ] `web/src/contracts/config.ts` actualizado con nuevas direcciones
- [ ] Frontend reiniciado
- [ ] MetaMask configurado en la red correcta
- [ ] Cuenta admin importada en MetaMask
- [ ] Wallet conectada en la aplicación
- [ ] ¡Funciona! 🎉

## 📞 Soporte

Si sigues teniendo problemas:
1. Verifica los logs en la consola del navegador (F12)
2. Verifica los logs de Anvil/Hardhat
3. Asegúrate de que las direcciones en `config.ts` coinciden con las del deployment
4. Verifica que estás en la red correcta en MetaMask

