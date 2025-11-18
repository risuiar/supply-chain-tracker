# Instrucciones para usar Anvil Local

## 1. Verificar que Anvil esté corriendo

Abre una terminal y ejecuta:
```bash
anvil
```

Debe mostrar algo como:
```
Listening on 127.0.0.1:8545
```

## 2. Desplegar contratos en Anvil

En otra terminal (con Anvil corriendo), ejecuta:

**Windows:**
```bash
.\deploy-windows.bat
```

**Mac/Linux:**
```bash
./deploy-mac.sh
```

Esto desplegará los contratos y mostrará las direcciones.

## 3. Actualizar web/.env

Copia las direcciones que aparecen en el output del deploy y actualiza `web/.env`:

```env
VITE_NETWORK=anvil

# Direcciones para Anvil (red local)
VITE_ROLE_MANAGER_ADDRESS_ANVIL=0x... (copia del deploy)
VITE_TOKEN_FACTORY_ADDRESS_ANVIL=0x... (copia del deploy)
VITE_TRANSFER_MANAGER_ADDRESS_ANVIL=0x... (copia del deploy)
VITE_ADMIN_ADDRESS_ANVIL=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

## 4. Reiniciar el servidor frontend

```bash
cd web
npm run dev
```

## 5. Configurar MetaMask

1. Abre MetaMask
2. Agrega la red local:
   - Network Name: `Anvil Local`
   - RPC URL: `http://localhost:8545`
   - Chain ID: `31337`
   - Currency Symbol: `ETH`
3. Importa la cuenta admin:
   - Private Key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
   - Address: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`

## 6. Conectar en la aplicación

1. Abre http://localhost:5173
2. Conecta MetaMask
3. Asegúrate de estar en la red "Anvil Local" (Chain ID: 31337)

