# Sistema de Gestión de Roles

Este documento explica cómo funcionan los nuevos componentes de gestión de roles integrados con el contrato `RoleManager`.

## Arquitectura

### Contrato RoleManager

El contrato tiene las siguientes funciones principales:
- `requestRole(desiredRole)` - Usuario solicita un rol
- `cancelRequest()` - Usuario cancela su solicitud pendiente
- `approveRole(account)` - Admin aprueba una solicitud
- `rejectRole(account)` - Admin rechaza una solicitud
- `revokeRole(account)` - Admin revoca un rol aprobado
- `getUser(account)` - Obtiene información del usuario

### Validaciones del Contrato

1. No se puede solicitar un rol si ya tienes uno aprobado
2. No se puede solicitar un rol si ya hay una solicitud pendiente
3. El usuario puede cancelar su propia solicitud
4. Solo el admin puede aprobar, rechazar o revocar roles

### Errores Personalizados

- `AlreadyHasRole` - El usuario ya tiene un rol aprobado
- `RoleAlreadyRequested` - Ya hay una solicitud pendiente
- `RoleNotRequested` - No hay solicitud para cancelar
- `NotApproved` - No tiene un rol aprobado
- `InvalidRoleRequest` - Rol solicitado no válido (Role.None)
- `NotAdmin` - Solo el admin puede ejecutar esta acción

## Componentes

### 1. useRoleManager (Hook)

**Ubicación:** `src/hooks/useRoleManager.ts`

Hook que encapsula toda la lógica de interacción con el contrato RoleManager.

**Funciones:**
```typescript
const {
  requestRole,      // (desiredRole: number) => Promise<boolean>
  cancelRequest,    // () => Promise<boolean>
  approveRole,      // (userAccount: string) => Promise<boolean>
  rejectRole,       // (userAccount: string) => Promise<boolean>
  revokeRole,       // (userAccount: string) => Promise<boolean>
  isLoading,        // boolean
} = useRoleManager();
```

**Características:**
- Maneja errores del contrato y los traduce a mensajes en español
- Muestra notificaciones toast automáticamente
- Devuelve `true` en éxito, `false` en error
- Incluye estado de carga global

**Ejemplo de uso:**
```typescript
const { requestRole, isLoading } = useRoleManager();

const handleRequest = async () => {
  const success = await requestRole(1); // 1 = Producer
  if (success) {
    console.log('Rol solicitado correctamente');
  }
};
```

### 2. UserStatusBadge

**Ubicación:** `src/components/UserStatusBadge.tsx`

Componente pequeño que muestra el estado actual del usuario.

**Uso:**
```tsx
import { UserStatusBadge } from '../components/UserStatusBadge';

<UserStatusBadge />
```

**Estados que muestra:**
- Desconectado (wallet no conectada)
- Sin rol asignado
- Solicitud pendiente (con animación)
- Rol aprobado (con checkmark)

**Integración en Header:**
Puedes agregarlo al Header para mostrar el estado del usuario en todo momento:
```tsx
<div className="flex items-center gap-4">
  <UserStatusBadge />
  {/* ... otros elementos */}
</div>
```

### 3. RoleRequestPanel

**Ubicación:** `src/components/RoleRequestPanel.tsx`

Panel completo para que los usuarios gestionen sus solicitudes de rol.

**Uso:**
```tsx
import { RoleRequestPanel } from '../components/RoleRequestPanel';

<RoleRequestPanel />
```

**Características:**
- Detecta el estado del usuario automáticamente
- Muestra diferentes vistas según el estado:
  - Sin rol: formulario para solicitar rol con selector y descripciones
  - Solicitud pendiente: información + botón cancelar solicitud
  - Rol aprobado: muestra el rol actual (no permite solicitar otro)
- Maneja todos los errores del contrato
- Integrado con `useRoleManager` para gestión de estado

**Roles disponibles:**
1. Producer (Productor)
2. Factory (Fábrica)
3. Retailer (Minorista)
4. Consumer (Consumidor)

### 4. AdminRolePanel

**Ubicación:** `src/components/AdminRolePanel.tsx`

Panel completo de administración para gestionar solicitudes y usuarios.

**Uso:**
```tsx
import { AdminRolePanel } from '../components/AdminRolePanel';

// Solo para admins
{isAdmin && <AdminRolePanel />}
```

**Características:**
- Lista solicitudes pendientes en tiempo real
- Lista usuarios aprobados
- Escucha eventos del contrato para actualizaciones automáticas
- Botones de acción: Aprobar, Rechazar, Revocar
- Muestra contadores de solicitudes pendientes y usuarios aprobados
- Filtra y organiza usuarios por estado

**Eventos escuchados:**
- `RoleRequested` - Nueva solicitud
- `RoleApproved` - Solicitud aprobada
- `RoleRejected` - Solicitud rechazada
- `RoleRevoked` - Rol revocado

### 5. Web3Context (Actualizado)

**Ubicación:** `src/contexts/Web3Context.tsx`

El contexto Web3 ahora incluye todas las funciones de gestión de roles.

**Nuevas funciones agregadas:**
```typescript
const {
  cancelRequest,    // () => Promise<void>
  approveRole,      // (userAccount: string) => Promise<void>
  rejectRole,       // (userAccount: string) => Promise<void>
  revokeRole,       // (userAccount: string) => Promise<void>
  refreshUser,      // () => Promise<void>
  // ... funciones existentes
} = useWeb3();
```

**Event Listeners:**
El contexto ahora escucha eventos del contrato y actualiza automáticamente el estado del usuario cuando:
- Se solicita un rol
- Se aprueba una solicitud
- Se rechaza una solicitud
- Se revoca un rol

## Integración en Páginas

### Landing Page

```tsx
import { RoleRequestPanel } from '../components/RoleRequestPanel';

export function Landing() {
  const { isConnected } = useWeb3();

  return (
    <div>
      {isConnected ? (
        <RoleRequestPanel />
      ) : (
        <ConnectWalletButton />
      )}
    </div>
  );
}
```

### Admin Page

```tsx
import { AdminRolePanel } from '../components/AdminRolePanel';

export function Admin() {
  const { isAdmin } = useWeb3();

  if (!isAdmin) {
    return <Navigate to="/" />;
  }

  return (
    <div>
      <h1>Panel de Administración</h1>
      <AdminRolePanel />
    </div>
  );
}
```

### Profile Page

```tsx
import { UserStatusBadge } from '../components/UserStatusBadge';
import { RoleRequestPanel } from '../components/RoleRequestPanel';

export function Profile() {
  const { user } = useWeb3();

  return (
    <div>
      <UserStatusBadge />
      {!user?.approved && <RoleRequestPanel />}
      {/* ... resto del perfil */}
    </div>
  );
}
```

## Flujo Completo de Usuario

### 1. Usuario Normal

1. **Conecta wallet** → Landing Page
2. **Solicita rol** → RoleRequestPanel
3. **Espera aprobación** → Muestra "Solicitud pendiente"
4. **Admin aprueba** → Evento actualiza estado automáticamente
5. **Accede al Dashboard** → Redirige automáticamente

### 2. Administrador

1. **Conecta wallet** → Detecta rol admin automáticamente
2. **Ve AdminRolePanel** → Lista de solicitudes pendientes
3. **Aprueba/Rechaza solicitudes** → Con botones
4. **Gestiona usuarios aprobados** → Puede revocar roles

## Mensajes de Error Traducidos

| Error del Contrato | Mensaje en Español |
|-------------------|-------------------|
| `AlreadyHasRole` | "Ya tienes un rol aprobado" |
| `RoleAlreadyRequested` | "Ya tienes una solicitud pendiente" |
| `RoleNotRequested` | "No hay ninguna solicitud para cancelar" |
| `NotApproved` | "No tienes un rol aprobado" |
| `InvalidRoleRequest` | "Rol solicitado no válido" |
| `NotAdmin` | "Solo el administrador puede hacer esta acción" |
| User rejection | "Transacción cancelada por el usuario" |

## Testing Manual

### Probar como Usuario

1. Conectar con una cuenta que no sea admin
2. Intentar solicitar un rol
3. Ver el mensaje de "solicitud pendiente"
4. Intentar solicitar otro rol (debe dar error)
5. Cancelar la solicitud
6. Solicitar un rol nuevamente

### Probar como Admin

1. Conectar con la cuenta admin
2. Ver lista de solicitudes pendientes
3. Aprobar una solicitud
4. Verificar que desaparece de pendientes
5. Ver el usuario en la lista de aprobados
6. Revocar el rol
7. Verificar que desaparece de aprobados

## Constantes de Roles

**Ubicación:** `src/constants/roles.ts`

```typescript
import { Role, ROLE_NAMES, ROLE_DESCRIPTIONS, ROLE_COLORS, ROLE_OPTIONS } from '../constants/roles';

// Role enum
Role.None      // 0
Role.Producer  // 1
Role.Factory   // 2
Role.Retailer  // 3
Role.Consumer  // 4

// Mapas
ROLE_NAMES[1]        // "Productor"
ROLE_DESCRIPTIONS[1] // "Responsable de crear materias primas..."
ROLE_COLORS[1]       // "bg-green-100 text-green-700"
ROLE_OPTIONS         // Array para <select>
```

## Notas Importantes

1. **Eventos en Tiempo Real:** Los componentes se actualizan automáticamente cuando ocurren eventos on-chain
2. **Validaciones:** Todas las validaciones del contrato se manejan en el frontend con mensajes claros
3. **Estado Global:** El `Web3Context` mantiene el estado sincronizado con la blockchain
4. **UX Optimizada:** Notificaciones toast, estados de carga, y mensajes claros en español
5. **Separación de Responsabilidades:** Hook → Lógica, Componentes → UI

