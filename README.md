# 🔗 Supply Chain Tracker

DApp de trazabilidad en cadena de suministro usando blockchain.

## 📖 ¿Qué es esto?

Una aplicación que permite rastrear productos desde su origen hasta el consumidor final usando blockchain. Cada actor (Producer → Factory → Retailer → Consumer) puede crear y transferir tokens que representan productos.

### ✨ Características

- **Tokens**: Cada producto es un token con cantidad total y metadatos
- **Transferencias**: Mueve productos entre actores con aprobación
- **Roles**: Sistema de permisos según el rol de cada usuario
- **Trazabilidad**: Historial completo e inmutable de movimientos

## 🚀 Inicio Rápido

### Requisitos

- **Node.js** v18+ ([Descargar](https://nodejs.org/))
- **Foundry** ([Instalación](https://book.getfoundry.sh/getting-started/installation))
- **MetaMask** ([Extensión](https://metamask.io/))

### Instalación

```bash
# 1. Clonar repositorio
git clone <repo-url>
cd 98_pfm_traza_2025

# 2. Instalar dependencias del frontend
cd web
npm install
cd ..
```

### Ejecutar la Aplicación

#### Terminal 1: Blockchain Local

```bash
cd sc
anvil
```

✅ Debe mostrar: `Listening on 127.0.0.1:8545`

**⚠️ Deja esta terminal abierta**

#### Terminal 2: Desplegar Contratos

```bash
cd sc
forge script script/DeploySupplyChain.s.sol --rpc-url http://127.0.0.1:8545 --broadcast --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

**📝 Copia las 3 direcciones que aparecen:**

```
RoleManager deployed to: 0x...
TokenFactory deployed to: 0x...
TransferManager deployed to: 0x...
```

Edita `web/.env` con esas direcciones:

```env
VITE_ROLE_MANAGER_ADDRESS=0x...
VITE_TOKEN_FACTORY_ADDRESS=0x...
VITE_TRANSFER_MANAGER_ADDRESS=0x...
VITE_ADMIN_ADDRESS=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

#### Terminal 3: Frontend

```bash
cd web
npm run dev
```

Abre: http://localhost:5173

### Configurar MetaMask

1. **Agregar Red Local**:
   - Red: Anvil Local
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Moneda: `ETH`

2. **Importar Cuentas** (ver tabla abajo)

## 🔑 Cuentas de Prueba

| Rol | Dirección | Private Key |
|-----|-----------|-------------|
| **Admin** | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| **Producer** | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` |
| **Factory** | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` |
| **Retailer** | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` | `0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6` |
| **Consumer** | `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` | `0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a` |

## 🎯 Flujo de Uso

### 1. Registrar Usuarios

Desde terminal (o usa la UI con cada cuenta):

```bash
# Producer solicita rol
cast send <ROLE_MANAGER_ADDRESS> "requestRole(uint8)" 1 --rpc-url http://127.0.0.1:8545 --private-key 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

# Factory, Retailer, Consumer (cambiar el número de rol: 2, 3, 4)
```

### 2. Aprobar (Como Admin)

1. Conectar con cuenta Admin
2. Ir a `/admin`
3. Aprobar cada usuario

### 3. Crear Token (Como Producer)

1. Conectar con Producer
2. Ir a "Create Token"
3. Llenar:
   - Nombre: "Café Premium"
   - Total Supply: 1000
   - Features: `{"origin": "Colombia"}`

### 4. Transferir

1. Ver token en "My Tokens"
2. Click "Transfer"
3. Seleccionar destinatario y cantidad

## 🛠️ Stack Tecnológico

- **Blockchain**: Solidity 0.8.30 + Foundry
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS
- **Web3**: ethers.js v6

## 📚 Documentación

- **[README_SPECS.md](./README_SPECS.md)**: Especificaciones técnicas completas
- **[RESUMEN_IMPLEMENTACION.md](./RESUMEN_IMPLEMENTACION.md)**: Resumen de implementación
- **[ACCOUNTS.md](./ACCOUNTS.md)**: Guía detallada de cuentas

## 🐛 Problemas Comunes

**❌ "Cannot connect to localhost:8545"**
→ Asegúrate de que Anvil está corriendo

**❌ "Transaction reverted: NotApproved"**
→ El usuario debe estar aprobado por Admin

**❌ MetaMask no detecta cambio de cuenta**
→ Disconnect → Cambiar cuenta → Connect

**❌ Contrato no responde**
→ Reinicia Anvil y re-despliega contratos, actualiza `.env`

---

**¿Necesitas más información?** Consulta [README_SPECS.md](./README_SPECS.md) para documentación técnica completa.
