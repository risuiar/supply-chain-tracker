# Estrategia para completar Supply Chain Tracker

Fecha: 2025-11-06
Rama: dev

## Resumen ejecutivo

El repositorio ya incluye un smart contract funcional (SupplyChainTracker) con pruebas y un frontend React/Vite esqueleto. Sin embargo, el frontend implementa el modelo "tokens con balance y transferencias con cantidad" del README original, mientras que el contrato implementa "activos indivisibles" (un solo titular por activo) y transferencias sin cantidades. Hay un desfase de API/Modelo entre backend y frontend.

Estrategia recomendada: Fase 1 alinear el frontend con el contrato actual para tener una demo funcional rápido. Fase 2 opcional: evolucionar el contrato a un modelo con balances si se requiere la semántica de unidades/cantidades del README.

## Estado actual (auditoría breve)

- Smart Contracts (Foundry)

  - Contrato: `sc/src/SupplyChainTracker.sol`
    - Conceptos: Roles (Producer → Factory → Retailer → Consumer), registro y aprobación de roles; Activos (RawMaterial, ProcessedGood), creación de activos, transferencias con aceptación; historial por activo.
    - API clave:
      - Roles: `requestRole(Role)`, `approveRole(address)`, `rejectRole(address)`, `getUser(address)`.
      - Activos: `createRawAsset(string)`, `createProcessedAsset(string, uint256[])`, `getAsset(uint256)`.
      - Transferencias: `requestTransfer(uint256,address)`, `approveTransfer(uint256)`, `rejectTransfer(uint256)`, `getTransfer(uint256)`, `getAssetTransfers(uint256)`.
    - Limitaciones: No hay listados por usuario (no `getUserAssets`, `getUserTransfers`), los activos no tienen balances (no cantidades), `metadataURI` es un string único.
  - Tests: `sc/test/SupplyChainTracker.t.sol` (pasan contra el contrato actual; cubren alta de roles, crear activos, flujo de transferencias y trazabilidad).
  - Deploy script: `sc/script/Deploy.s.sol` correcto.
  - Config: `sc/scfoundry.toml` OK.

- Frontend (Vite + React + Ethers v6 + Tailwind)
  - Contexto Web3: `web/src/contexts/Web3Context.tsx` (conexión, persistencia, eventos) asume métodos `getUserInfo`, `isAdmin(address)` etc. que no existen en el contrato actual.
  - Config ABI: `web/src/contracts/config.ts` define una ABI para tokens con balances y métodos `createToken`, `transfer(to, tokenId, amount)`, etc. Incompatible con el contrato actual.
  - Páginas: `Landing`, `Dashboard`, `Tokens`, `CreateToken`, `TokenDetails`, `TransferToken`, `Transfers`, `Admin`, `Profile` implementan UI rica, pero consumen la ABI equivocada (tokens con balance, `nextUserId`, etc.).

Conclusión: Backend y frontend no hablan el mismo idioma. El contrato y sus tests están bien cohesionados; conviene acoplar el frontend a este contrato.

## Decisión de diseño (Fase 1)

- Modelo de datos canónico: Activo indivisible con titular único (NFT-like) y transferencia sin cantidad. Los activos procesados pueden referenciar padres (ids) para trazabilidad.
- Información enriquecida del activo: `metadataURI` podrá almacenar una URL (p. ej. ipfs://) o un JSON inline (data:application/json,...) con metadatos. La UI expondrá un editor JSON y lo serializará a `metadataURI`.
- Consultas: Añadiremos funciones de sólo lectura al contrato para facilitar la UI:
  - `function getUserAssets(address) external view returns (uint256[] memory)`
  - `function getUserTransfers(address) external view returns (uint256[] memory)` (opcional; alternativamente, derivar vía eventos)
    Estas funciones iteran 1..\_assetIdTracker de forma O(n). Aceptable en proyecto educativo.

## Roadmap por fases

- Fase 1 — Alinear Frontend con contrato (1-2 días)

  1. Actualizar ABI y configuración
     - `web/src/contracts/config.ts` → exportar ABI real del contrato (o importar de `sc/out/...` en tiempo de desarrollo) y dirección por `.env`.
     - Añadir `VITE_CONTRACT_ADDRESS` y `VITE_ADMIN_ADDRESS`.
  2. Adaptar Web3Context
     - Reemplazar `getUserInfo` por `getUser(address)` y mapear a un modelo de UI `{role, approved, requestedRole}`.
     - Calcular `isAdmin` comparando `account.toLowerCase() === await contract.admin()`.
     - Exponer helpers: `requestRole(role: Role)`, `approveRole(address)`, `rejectRole(address)` para Admin.
  3. Refactor de páginas
     - Landing: usar `requestRole(uint8)` con mapa `{'Producer':1,'Factory':2,'Retailer':3,'Consumer':4}`.
     - Admin: listar usuarios desde eventos `RoleRequested` únicos y consultar `getUser(addr)`. Acciones `approveRole`, `rejectRole`.
     - Tokens → Assets: listar activos del usuario. Para ello, opción A: añadir `getUserAssets` al contrato; opción B: derivar con eventos `AssetCreated` + transferencias aprobadas. Recomendado: opción A por simplicidad.
     - CreateToken:
       - Producer → `createRawAsset(metadataURI)`.
       - Factory → `createProcessedAsset(metadataURI, parentIds)` (permitir seleccionar 1..n padres). Quitar `totalSupply`, `amount`.
     - TokenDetails: mostrar `metadataURI` parseado si es JSON; relación con `parentIds`.
     - TransferToken: eliminar campo `amount`; llamar `requestTransfer(assetId, to)`. Mostrar regla de roles (siguiente rol).
     - Transfers: usar `getAssetTransfers(assetId)` según los activos del usuario o añadir `getUserTransfers` al contrato.
  4. UI copy/strings: renombrar “Token(s)” a “Asset(s)” donde aplique.

- Fase 2 — Funcionalidad complementaria (1 día)

  - Añadir en contrato funciones view utilitarias:
    - `getUserAssets(address)` y/o `getAssetsByCreator(address)`.
    - `getPendingTransferByAsset(uint256)` para UI.
  - Mejoras de seguridad y DX: modifiers de acceso más finos, errores de require detallados (ya existen custom errors), events adicionales.

- Fase 3 — Opcional: Modelo con cantidades/balances (3-4 días)
  - Si se desea el modelo del README (suministro, balances, cantidades en transferencias), re-diseñar el contrato a un sistema tipo ERC1155-lite con:
    - `struct Token { id, totalSupply, featuresJSON, parentId }`
    - `mapping(tokenId => mapping(address => uint256)) balances`
    - Transferencias con `amount` y estados `Pending/Accepted/Rejected`.
  - Migrar tests y UI a este nuevo modelo. Esta fase es disruptiva y no compatible con Fase 1.

## Plan técnico detallado (Fase 1)

- Ajustes en contrato (opcionales pero recomendados)

  - Agregar:
    ```solidity
    function getUserAssets(address holder) external view returns (uint256[] memory ids) {
        uint256 total = _assetIdTracker;
        uint256 count;
        for (uint256 i=1; i<=total; i++) if (_assets[i].exists && _assets[i].currentHolder == holder) count++;
        ids = new uint256[](count);
        uint256 idx;
        for (uint256 i=1; i<=total; i++) if (_assets[i].exists && _assets[i].currentHolder == holder) ids[idx++] = i;
    }
    ```
    (Similar para `getAssetsByCreator` o `getUserTransfers` si se requiere.)

- Frontend
  - `web/src/contracts/config.ts`
    - Reemplazar ABI por la del contrato actual:
      - `admin()`
      - `requestRole(uint8)`, `approveRole(address)`, `rejectRole(address)`, `getUser(address)`
      - `createRawAsset(string)`, `createProcessedAsset(string,uint256[])`
      - `getAsset(uint256)`, `requestTransfer(uint256,address)`, `approveTransfer(uint256)`, `rejectTransfer(uint256)`, `getTransfer(uint256)`, `getAssetTransfers(uint256)`
  - `Web3Context.tsx`
    - Mapear `User` a `{ role: number, approved: boolean, requestedRole: number }` y exponer `isAdmin` comparando con `admin()`.
    - Persistencia en localStorage tal como está.
  - Páginas
    - `Landing`: enum de roles → `uint8` para `requestRole`.
    - `Admin`: usar `queryFilter(RoleRequested)` para descubrir usuarios y consultar `getUser(addr)`; botones `approveRole`/`rejectRole`.
    - `Tokens`/`TokenDetails`: renombrar a `Assets` o mantener “Tokens” pero con semántica de activo; cargar desde `getUserAssets`.
    - `CreateToken`: enviar `metadataURI` (usar JSON string o data URI). Permitir múltiples `parentIds` para productos procesados.
    - `TransferToken`: eliminar `amount`; usar `requestTransfer(assetId,to)`.
    - `Transfers`: para cada activo del usuario, llamar `getAssetTransfers(assetId)` y aplanar.

## Hitos y estimaciones

- Hito 1: ABI y Web3Context alineados (0.5 d)
- Hito 2: Refactor Landing + Admin (0.5 d)
- Hito 3: Refactor Create/Details/Transfer/Transfers (0.75–1 d)
- Hito 4: Añadir funciones view al contrato + re-test (0.25 d)
- Total Fase 1: ~2 días efectivos

## Plan de pruebas

- Smart contracts
  - Mantener `forge test` actual (debería seguir pasando al añadir funciones view).
  - Añadir tests de borde: rechazo de transferencias, doble aprobación, padres inexistentes.
- Frontend
  - Validación manual end-to-end en Anvil:
    - Alta de 4 usuarios (roles) y aprobación admin.
    - Producer crea RawAsset, transfiere a Factory; Factory aprueba y crea ProcessedAsset con parent.
    - Flujo completo hasta Consumer, ver historial por activo.
  - Typecheck: `npm run typecheck`, build: `npm run build`.

## DevEx, build y despliegue

- Variables de entorno en `web/.env`:
  - `VITE_CONTRACT_ADDRESS=0x...`
  - `VITE_ADMIN_ADDRESS=0x...`
- Scripts existentes:
  - Web: `npm run dev|build|preview|typecheck`; Lint `npm run lint`.
  - SC: `forge build`, `forge test`, `anvil`, `forge script ... --broadcast`.
- CI (sugerido): workflow con jobs para `forge test` y `web npm run typecheck && build`.

## Riesgos y mitigaciones

- Desfase de modelo (tokens con cantidad vs activos singulares): Mitigar alineando UI con contrato (Fase 1) o planificando refactor profundo (Fase 3).
- Enumeración on-chain O(n): Aceptable por fines educativos. Para escala, indexar con subgrafo (The Graph) o logs en frontend.
- Manejo de metadatos: `metadataURI` sin validación. UI debe validar JSON y avisar.
- UX de Admin: No hay listado on-chain de todos los usuarios. Se resuelve con eventos `RoleRequested` y consulta `getUser`.

## KPIs de entrega

- Build SC: PASS `forge build` y `forge test` (100% passing)
- Build Web: PASS `npm run typecheck` y `npm run build`
- Flujo E2E en Anvil funcionando (4 roles, 1 activo completo)
- Documentación: este documento + README actualizado con pasos de Fase 1

## Extras propuestos

- Archivo IA.md con retrospectiva del uso de IA (según README) y logs de prompts relevantes.
- MVP de MCP wrapper para `anvil`, `cast`, `forge` con comandos básicos.
- Exportar ABI post-build de Foundry al frontend automáticamente (script de copia `out/*ABI.json`).

## Próximos pasos inmediatos

1. Confirmar opción Fase 1 y añadir funciones view al contrato si se desea `getUserAssets`.
2. Sustituir ABI y adaptar `Web3Context`.
3. Refactor de páginas clave: Landing, Admin, Create, Transfer, Transfers.
4. Prueba E2E local y ajustar copy/UI.
