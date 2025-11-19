import { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { useRoleManager } from '../hooks/useRoleManager';
import { Button } from './Button';
import { Card, CardHeader, CardContent } from './Card';
import { ROLE_NAMES } from '../constants/roles';

interface PendingRequest {
  address: string;
  requestedRole: number;
}

export function AdminRolePanel() {
  const { isAdmin, isConnected, roleManager, getReasonableFromBlock } = useWeb3();
  const { approveRole, rejectRole, revokeRole, isLoading } = useRoleManager();
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<{ address: string; role: number }[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);

  // Escuchar eventos del contrato para mantener la lista actualizada
  useEffect(() => {
    if (!roleManager) return;

    const loadPendingRequests = async () => {
      setIsLoadingRequests(true);
      try {
        // Obtener un bloque de inicio razonable para evitar consultar desde el bloque 0
        const fromBlock = await getReasonableFromBlock();

        // Obtener eventos RoleRequested
        const roleRequestedFilter = roleManager.filters.RoleRequested();
        const roleRequestedEvents = await roleManager.queryFilter(roleRequestedFilter, fromBlock);

        // Obtener eventos RoleApproved
        const roleApprovedFilter = roleManager.filters.RoleApproved();
        const roleApprovedEvents = await roleManager.queryFilter(roleApprovedFilter, fromBlock);

        // Obtener eventos RoleRejected
        const roleRejectedFilter = roleManager.filters.RoleRejected();
        const roleRejectedEvents = await roleManager.queryFilter(roleRejectedFilter, fromBlock);

        // Crear un mapa de solicitudes pendientes
        const requestsMap = new Map<string, number>();

        // Añadir todas las solicitudes
        for (const event of roleRequestedEvents) {
          const address = event.args?.[0] as string;
          const role = Number(event.args?.[1]);
          requestsMap.set(address.toLowerCase(), role);
        }

        // Remover las aprobadas
        for (const event of roleApprovedEvents) {
          const address = event.args?.[0] as string;
          requestsMap.delete(address.toLowerCase());
        }

        // Remover las rechazadas
        for (const event of roleRejectedEvents) {
          const address = event.args?.[0] as string;
          requestsMap.delete(address.toLowerCase());
        }

        // Verificar el estado actual de cada solicitud en el contrato
        const pending: PendingRequest[] = [];
        for (const [address, role] of requestsMap.entries()) {
          try {
            const user = await roleManager.getUser(address);
            const requestedRole = Number(user.requestedRole);

            // Solo añadir si realmente tiene una solicitud pendiente
            if (requestedRole !== 0 && !user.approved) {
              pending.push({ address, requestedRole });
            }
          } catch (error) {
            console.error('Error checking user:', address, error);
          }
        }

        setPendingRequests(pending);

        // Obtener usuarios aprobados
        const approved: { address: string; role: number }[] = [];
        for (const event of roleApprovedEvents) {
          const address = event.args?.[0] as string;
          try {
            const user = await roleManager.getUser(address);
            if (user.approved && Number(user.role) !== 0) {
              approved.push({ address, role: Number(user.role) });
            }
          } catch (error) {
            console.error('Error checking approved user:', address, error);
          }
        }

        setApprovedUsers(approved);
      } catch (error) {
        console.error('Error loading requests:', error);
      } finally {
        setIsLoadingRequests(false);
      }
    };

    loadPendingRequests();

    // Event listeners en tiempo real
    const handleRoleRequested = () => {
      loadPendingRequests();
    };

    const handleRoleApproved = () => {
      loadPendingRequests();
    };

    const handleRoleRejected = () => {
      loadPendingRequests();
    };

    const handleRoleRevoked = () => {
      loadPendingRequests();
    };

    roleManager.on('RoleRequested', handleRoleRequested);
    roleManager.on('RoleApproved', handleRoleApproved);
    roleManager.on('RoleRejected', handleRoleRejected);
    roleManager.on('RoleRevoked', handleRoleRevoked);

    return () => {
      roleManager.off('RoleRequested', handleRoleRequested);
      roleManager.off('RoleApproved', handleRoleApproved);
      roleManager.off('RoleRejected', handleRoleRejected);
      roleManager.off('RoleRevoked', handleRoleRevoked);
    };
  }, [roleManager]);

  const handleApprove = async (address: string) => {
    const success = await approveRole(address);
    if (success) {
      setPendingRequests((prev) => prev.filter((req) => req.address !== address));
    }
  };

  const handleReject = async (address: string) => {
    const success = await rejectRole(address);
    if (success) {
      setPendingRequests((prev) => prev.filter((req) => req.address !== address));
    }
  };

  const handleRevoke = async (address: string) => {
    const success = await revokeRole(address);
    if (success) {
      setApprovedUsers((prev) => prev.filter((user) => user.address !== address));
    }
  };

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Panel de Administración</h2>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Conecta tu wallet para acceder al panel de administración</p>
        </CardContent>
      </Card>
    );
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Panel de Administración</h2>
        </CardHeader>
        <CardContent>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">⚠️ No tienes permisos de administrador</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Solicitudes Pendientes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Solicitudes Pendientes</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (roleManager) {
                    const loadPendingRequests = async () => {
                      setIsLoadingRequests(true);
                      try {
                        const fromBlock = await getReasonableFromBlock();
                        const roleRequestedFilter = roleManager.filters.RoleRequested();
                        const roleRequestedEvents = await roleManager.queryFilter(
                          roleRequestedFilter,
                          fromBlock
                        );
                        const roleApprovedFilter = roleManager.filters.RoleApproved();
                        const roleApprovedEvents = await roleManager.queryFilter(
                          roleApprovedFilter,
                          fromBlock
                        );
                        const roleRejectedFilter = roleManager.filters.RoleRejected();
                        const roleRejectedEvents = await roleManager.queryFilter(
                          roleRejectedFilter,
                          fromBlock
                        );

                        const requestsMap = new Map<string, number>();
                        for (const event of roleRequestedEvents) {
                          const address = event.args?.[0] as string;
                          const role = Number(event.args?.[1]);
                          requestsMap.set(address.toLowerCase(), role);
                        }
                        for (const event of roleApprovedEvents) {
                          const address = event.args?.[0] as string;
                          requestsMap.delete(address.toLowerCase());
                        }
                        for (const event of roleRejectedEvents) {
                          const address = event.args?.[0] as string;
                          requestsMap.delete(address.toLowerCase());
                        }

                        const pending: PendingRequest[] = [];
                        for (const [address, role] of requestsMap.entries()) {
                          try {
                            const user = await roleManager.getUser(address);
                            const requestedRole = Number(user.requestedRole);
                            if (requestedRole !== 0 && !user.approved) {
                              pending.push({ address, requestedRole });
                            }
                          } catch (error) {
                            console.error('Error checking user:', address, error);
                          }
                        }
                        setPendingRequests(pending);
                      } catch (error) {
                        console.error('Error refreshing requests:', error);
                      } finally {
                        setIsLoadingRequests(false);
                      }
                    };
                    loadPendingRequests();
                  }
                }}
                disabled={isLoadingRequests}
                className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                title="Actualizar lista"
              >
                {isLoadingRequests ? '⏳' : '🔄'}
              </button>
              <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                {pendingRequests.length} pendientes
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-lg">✓ No hay solicitudes pendientes</p>
              <p className="text-sm mt-1">Las nuevas solicitudes aparecerán aquí</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div
                  key={request.address}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        Rol solicitado:{' '}
                        <span className="text-blue-600">{ROLE_NAMES[request.requestedRole]}</span>
                      </p>
                      <p className="text-xs text-gray-500 truncate" title={request.address}>
                        Usuario: {request.address}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="success"
                        onClick={() => handleApprove(request.address)}
                        disabled={isLoading}
                        className="text-sm px-3 py-1"
                      >
                        Aprobar
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => handleReject(request.address)}
                        disabled={isLoading}
                        className="text-sm px-3 py-1"
                      >
                        Rechazar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usuarios Aprobados */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Usuarios Aprobados</h2>
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
              {approvedUsers.length} usuarios
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {approvedUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-lg">No hay usuarios aprobados todavía</p>
            </div>
          ) : (
            <div className="space-y-3">
              {approvedUsers.map((user) => (
                <div
                  key={user.address}
                  className="border border-gray-200 rounded-lg p-4 hover:border-green-300 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        Rol: <span className="text-green-600">{ROLE_NAMES[user.role]}</span>
                      </p>
                      <p className="text-xs text-gray-500 truncate" title={user.address}>
                        Usuario: {user.address}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <Button
                        variant="danger"
                        onClick={() => handleRevoke(user.address)}
                        disabled={isLoading}
                        className="text-sm px-3 py-1"
                      >
                        Revocar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
