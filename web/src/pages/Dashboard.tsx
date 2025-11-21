import { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Package, Send, User, Plus } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { Card, CardContent } from '../components/Card';
import { AdminRolePanel } from '../components/AdminRolePanel';
import { AdminTransferPanel } from '../components/AdminTransferPanel';

export function Dashboard() {
  const {
    user,
    isAdmin,
    account,
    tokenFactory,
    transferManager,
    isConnected,
    retryConnection,
    getReasonableFromBlock,
  } = useWeb3();
  const [tokenCount, setTokenCount] = useState<number>(0);
  const [pendingIncoming, setPendingIncoming] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [systemStats, setSystemStats] = useState({
    totalTokens: 0,
    totalUsers: 0,
    totalTransfers: 0,
  });

  useEffect(() => {
    if (!tokenFactory || !transferManager || !account) {
      setLoading(false);
      return;
    }

    const loadStats = async () => {
      try {
        if (isAdmin) {
          // Admin ve estadísticas del sistema completo
          const fromBlock = await getReasonableFromBlock();

          // Contar todos los tokens del sistema
          const tokenCreatedFilter = tokenFactory.filters.TokenCreated();
          const tokenEvents = await tokenFactory.queryFilter(tokenCreatedFilter, fromBlock);
          setTokenCount(tokenEvents.length);

          // Contar todas las transferencias del sistema
          const transferFilter = transferManager.filters.TransferRequested();
          const transferEvents = await transferManager.queryFilter(transferFilter, fromBlock);

          // Contar transferencias pendientes en todo el sistema
          let pendingCount = 0;
          for (const event of transferEvents) {
            if ('args' in event) {
              const transferId = event.args[1];
              try {
                const transfer = await transferManager.getTransfer(transferId);
                if (transfer.status === 1) {
                  // Status 1 = Pending
                  pendingCount++;
                }
              } catch (err) {
                console.error('Error checking transfer:', err);
              }
            }
          }
          setPendingIncoming(pendingCount);

          // Estadísticas adicionales del sistema para admin
          setSystemStats({
            totalTokens: tokenEvents.length,
            totalUsers: 0, // Se puede implementar más tarde si es necesario
            totalTransfers: transferEvents.length,
          });
        } else {
          // Usuario normal ve sus propias estadísticas
          const tokenIds = await tokenFactory.getUserTokens(account);
          setTokenCount(tokenIds.length);

          // Load pending incoming transfers for this user
          const fromBlock = await getReasonableFromBlock();
          const filter = transferManager.filters.TransferRequested();
          const events = await transferManager.queryFilter(filter, fromBlock);

          let pendingCount = 0;
          for (const event of events) {
            if ('args' in event) {
              const transferId = event.args[1];
              try {
                const transfer = await transferManager.getTransfer(transferId);
                // Count only pending transfers TO this user (status 1 = Pending)
                if (transfer.to.toLowerCase() === account.toLowerCase() && transfer.status === 1) {
                  pendingCount++;
                }
              } catch (err) {
                console.error('Error checking transfer:', err);
              }
            }
          }
          setPendingIncoming(pendingCount);
        }
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [tokenFactory, transferManager, account, isAdmin, getReasonableFromBlock]);

  // Los administradores ahora ven su dashboard con panel de administración incluido

  // Si está conectado pero no hay usuario (puede ser error de conexión)
  if (isConnected && !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto px-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-yellow-900 mb-2 text-center">
              Error de conexión con Sepolia
            </h2>
            <p className="text-yellow-800 mb-4 text-sm">
              MetaMask no puede conectarse a Sepolia. Esto puede deberse a:
            </p>
            <ul className="text-yellow-800 text-sm mb-4 list-disc list-inside space-y-1">
              <li>El RPC endpoint por defecto de MetaMask está caído</li>
              <li>Problemas de red temporales</li>
              <li>Rate limiting del proveedor RPC</li>
            </ul>
            <div className="space-y-2">
              <button
                onClick={retryConnection}
                className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                Reintentar conexión
              </button>
              <details className="mt-4">
                <summary className="text-sm text-yellow-800 cursor-pointer hover:text-yellow-900">
                  ¿Cómo cambiar el RPC endpoint en MetaMask?
                </summary>
                <div className="mt-2 text-xs text-yellow-700 bg-yellow-100 p-3 rounded">
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Abre MetaMask → Settings → Networks</li>
                    <li>Selecciona "Sepolia"</li>
                    <li>Haz clic en "Edit"</li>
                    <li>Cambia el "RPC URL" por uno alternativo:</li>
                    <li className="ml-4 font-semibold">
                      • <strong>Recomendado (sin registro):</strong> https://rpc.sepolia.org
                    </li>
                    <li className="ml-4 text-yellow-600">
                      • Opcional (requiere registro): Alchemy o Infura
                    </li>
                    <li>Guarda los cambios y vuelve a intentar</li>
                  </ol>
                  <p className="mt-2 text-yellow-600 italic">
                    💡 El endpoint público no requiere API key ni registro. Es la opción más rápida.
                  </p>
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !user.approved) {
    return <Navigate to="/" />;
  }

  const roleName = (r: number) =>
    ['Ninguno', 'Productor', 'Fábrica', 'Minorista', 'Consumidor', 'Admin'][r] || 'Desconocido';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <img src="/favicon.svg" alt="Logo" className="w-10 h-10" />
            <h1 className="text-3xl font-bold text-gray-900">
              Bienvenido a Trazabilidad de Productos
            </h1>
          </div>
          <p className="text-gray-600">
            Gestiona tus productos y transferencias en el sistema descentralizado de cadena de
            suministro
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Tu Rol: {roleName(user.role)}
          </h2>
          <p className="text-gray-600">
            {user.role === 1 && 'Crea tokens de materias primas y transfiere a fábricas'}
            {user.role === 2 &&
              'Transforma materias primas en productos procesados y transfiere a minoristas'}
            {user.role === 3 && 'Distribuye productos a consumidores'}
            {user.role === 4 && 'Rastrea los productos que recibes'}
            {user.role === 5 &&
              'Administra usuarios, roles y supervisa toda la cadena de suministro'}
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {isAdmin ? (
            // Vista de administrador - estadísticas del sistema
            <Link to="/tokens">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="py-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-purple-100">
                      <Package className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {loading ? '...' : tokenCount}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Tokens del Sistema</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ) : (
            // Vista de usuario normal
            <Link to="/tokens">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="py-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-blue-100">
                      <Package className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {loading ? '...' : tokenCount}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Mis Productos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}

          {isAdmin ? (
            // Tarjeta adicional para admin - Total de transferencias del sistema
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="py-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-green-100">
                    <Send className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {loading ? '...' : systemStats.totalTransfers}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Total Transferencias</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            // Tarjeta de crear producto solo para productores y fábricas
            (user.role === 1 || user.role === 2) && (
              <Link to="/tokens/create">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="py-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-full bg-green-100">
                        <Plus className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Crear Producto</p>
                        <p className="text-xs text-gray-500 mt-1">Crear nuevo producto</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          )}

          <Link to="/transfers">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="py-6">
                <div className="flex items-center gap-4">
                  <div
                    className={`p-3 rounded-full ${
                      isAdmin
                        ? 'bg-orange-100'
                        : pendingIncoming > 0
                          ? 'bg-red-100'
                          : 'bg-yellow-100'
                    }`}
                  >
                    <Send
                      className={`w-6 h-6 ${
                        isAdmin
                          ? 'text-orange-600'
                          : pendingIncoming > 0
                            ? 'text-red-600'
                            : 'text-yellow-600'
                      }`}
                    />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {loading ? '...' : pendingIncoming}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {isAdmin
                        ? 'Transferencias Pendientes (Sistema)'
                        : 'Transferencias pendientes'}
                    </p>
                  </div>
                </div>
                {!isAdmin && pendingIncoming > 0 && (
                  <div className="mt-2 px-2 py-1 bg-red-50 border border-red-200 rounded text-xs text-red-800 font-medium">
                    ¡Acción requerida!
                  </div>
                )}
                {isAdmin && pendingIncoming > 0 && (
                  <div className="mt-2 px-2 py-1 bg-orange-50 border border-orange-200 rounded text-xs text-orange-800 font-medium">
                    Supervisión del sistema
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>

          <Link to="/profile">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="py-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-purple-100">
                    <User className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Perfil</p>
                    <p className="text-xs text-gray-500 mt-1">Ver perfil</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Panel de Administración para Admins */}
        {isAdmin ? (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Panel de Administración</h3>
              <p className="text-gray-600 mb-4">
                Como administrador, puedes gestionar usuarios y supervisar toda la actividad del
                sistema.
              </p>
            </div>
            <AdminRolePanel />
            <AdminTransferPanel />
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Próximos Pasos</h3>
            <ul className="space-y-2 text-gray-600">
              <li>• Ver tus productos actuales</li>
              {(user.role === 1 || user.role === 2) && (
                <li>• Crear nuevos productos (si aplica)</li>
              )}
              <li>• Gestionar transferencias pendientes</li>
              <li>• Rastrear historial de la cadena de suministro</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
