import { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Package, Send, User, Plus } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { Card, CardContent } from '../components/Card';

export function Dashboard() {
  const { user, isAdmin, account, tokenFactory, transferManager } = useWeb3();
  const [tokenCount, setTokenCount] = useState<number>(0);
  const [pendingIncoming, setPendingIncoming] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokenFactory || !transferManager || !account) {
      setLoading(false);
      return;
    }

    const loadStats = async () => {
      try {
        const tokenIds = await tokenFactory.getUserTokens(account);
        setTokenCount(tokenIds.length);

        // Load pending incoming transfers
        const filter = transferManager.filters.TransferRequested();
        const events = await transferManager.queryFilter(filter);

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
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [tokenFactory, transferManager, account]);

  // If admin, redirect to admin panel
  if (isAdmin) {
    return <Navigate to="/admin" />;
  }

  if (!user || !user.approved) {
    return <Navigate to="/" />;
  }

  const roleName = (r: number) =>
    ['Ninguno', 'Productor', 'Fábrica', 'Minorista', 'Consumidor'][r] || 'Desconocido';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bienvenido a Trazabilidad de Productos
          </h1>
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
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
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

          {(user.role === 1 || user.role === 2) && (
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
          )}

          <Link to="/transfers">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="py-6">
                <div className="flex items-center gap-4">
                  <div
                    className={`p-3 rounded-full ${pendingIncoming > 0 ? 'bg-red-100' : 'bg-yellow-100'}`}
                  >
                    <Send
                      className={`w-6 h-6 ${pendingIncoming > 0 ? 'text-red-600' : 'text-yellow-600'}`}
                    />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {loading ? '...' : pendingIncoming}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Transferencias pendientes</p>
                  </div>
                </div>
                {pendingIncoming > 0 && (
                  <div className="mt-2 px-2 py-1 bg-red-50 border border-red-200 rounded text-xs text-red-800 font-medium">
                    ¡Acción requerida!
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

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Próximos Pasos</h3>
          <ul className="space-y-2 text-gray-600">
            <li>• Ver tus productos actuales</li>
            {(user.role === 1 || user.role === 2) && <li>• Crear nuevos productos (si aplica)</li>}
            <li>• Gestionar transferencias pendientes</li>
            <li>• Rastrear historial de la cadena de suministro</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
