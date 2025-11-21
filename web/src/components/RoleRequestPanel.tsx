import { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { useRoleManager } from '../hooks/useRoleManager';
import { Button } from './Button';
import { Card, CardHeader, CardContent } from './Card';
import { Select } from './Select';
import { ROLE_NAMES, ROLE_DESCRIPTIONS, ROLE_OPTIONS } from '../constants/roles';

export function RoleRequestPanel() {
  const { user, isConnected, account, roleManager } = useWeb3();
  const { requestRole, cancelRequest, isLoading } = useRoleManager();
  const [selectedRole, setSelectedRole] = useState<string>('1');
  const [hasAdmin, setHasAdmin] = useState<boolean>(false);
  const [loadingAdmin, setLoadingAdmin] = useState(true);

  // Verificar si ya existe un admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (!roleManager) {
        setLoadingAdmin(false);
        return;
      }

      try {
        const adminAddress = await roleManager.admin();
        setHasAdmin(
          adminAddress !== '0x0000000000000000000000000000000000000000' && adminAddress !== null
        );
      } catch (error) {
        console.error('Error checking admin:', error);
        setHasAdmin(false);
      } finally {
        setLoadingAdmin(false);
      }
    };

    checkAdmin();
  }, [roleManager]);

  if (!isConnected || !account) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Gestión de Roles</h2>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Conecta tu wallet para solicitar un rol</p>
        </CardContent>
      </Card>
    );
  }

  const handleRequestRole = async () => {
    const roleNumber = parseInt(selectedRole);
    await requestRole(roleNumber);
  };

  const handleCancelRequest = async () => {
    await cancelRequest();
  };

  // Usuario tiene rol aprobado
  if (user && user.approved && user.role !== 0) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Gestión de Roles</h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">✓</span>
                <h3 className="text-lg font-semibold text-green-800">Rol Aprobado</h3>
              </div>
              <p className="text-green-700">
                Tu rol actual es: <span className="font-bold">{ROLE_NAMES[user.role]}</span>
              </p>
              <p className="text-sm text-green-600 mt-1">{ROLE_DESCRIPTIONS[user.role]}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-700">
                ℹ️ No puedes solicitar otro rol mientras tengas un rol aprobado. Si necesitas
                cambiar de rol, contacta con el administrador.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Usuario tiene solicitud pendiente
  if (user && user.requestedRole !== 0 && !user.approved) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Gestión de Roles</h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">⏳</span>
                <h3 className="text-lg font-semibold text-yellow-800">Solicitud Pendiente</h3>
              </div>
              <p className="text-yellow-700">
                Has solicitado el rol:{' '}
                <span className="font-bold">{ROLE_NAMES[user.requestedRole]}</span>
              </p>
              <p className="text-sm text-yellow-600 mt-1">
                Tu solicitud está siendo revisada por el administrador
              </p>
            </div>
            <Button
              variant="danger"
              onClick={handleCancelRequest}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Cancelando...' : 'Cancelar Solicitud'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Usuario sin rol ni solicitud pendiente - puede solicitar
  return (
    <Card>
      <CardHeader>
        <h2 className="text-xl font-semibold">Solicitar Rol</h2>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700">
              {hasAdmin
                ? 'Selecciona el rol que deseas en la cadena de suministro. Tu solicitud será revisada por el administrador.'
                : '⚠️ No hay administrador en el sistema. Puedes convertirte en el primer administrador seleccionando "Administrador". Una vez que haya un administrador, esta opción desaparecerá.'}
            </p>
          </div>

          <div>
            <Select
              id="role-select"
              label="Selecciona un rol"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              disabled={isLoading || loadingAdmin}
              options={ROLE_OPTIONS.filter((option) => {
                // Filtrar Admin si ya existe un admin
                const roleValue = parseInt(option.value);
                if (roleValue === 5) {
                  // Admin role
                  return !hasAdmin;
                }
                return true;
              })}
            />
          </div>

          {selectedRole && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-sm font-medium text-gray-700 mb-1">Descripción del rol:</p>
              <p className="text-sm text-gray-600">{ROLE_DESCRIPTIONS[parseInt(selectedRole)]}</p>
            </div>
          )}

          <Button
            variant="primary"
            onClick={handleRequestRole}
            disabled={isLoading || !selectedRole}
            className="w-full"
          >
            {isLoading ? 'Enviando solicitud...' : 'Solicitar Rol'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
