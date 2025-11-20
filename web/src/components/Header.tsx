import { LogOut, LayoutDashboard, Users, Package, Send, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';

export function Header() {
  const { account, isConnected, user, isAdmin, disconnectWallet } = useWeb3();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const isApproved = !!(user && user.approved);
  const roleName = (r: number) =>
    ['Ninguno', 'Productor', 'Fábrica', 'Minorista', 'Consumidor'][r] || 'Desconocido';

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2 font-semibold text-lg">
            <img src="/favicon.svg" alt="Logo" className="w-6 h-6" />
            <span className="text-gray-900">Trazabilidad de Productos</span>
          </Link>

          {isConnected && (
            <nav className="flex items-center gap-6">
              {isApproved && (
                <>
                  <Link
                    to="/dashboard"
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Panel</span>
                  </Link>

                  <Link
                    to="/tokens"
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                  >
                    <Package className="w-4 h-4" />
                    <span>Productos</span>
                  </Link>

                  <Link
                    to="/transfers"
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 relative"
                  >
                    <Send className="w-4 h-4" />
                    <span>Transferencias</span>
                  </Link>

                  <Link
                    to="/profile"
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                  >
                    <User className="w-4 h-4" />
                    <span>Perfil</span>
                  </Link>
                </>
              )}

              {isAdmin && (
                <Link
                  to="/admin"
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                >
                  <Users className="w-4 h-4" />
                  <span>Administración</span>
                </Link>
              )}

              <div className="flex items-center gap-4 pl-6 border-l border-gray-200">
                {user && (
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${user.approved ? 'bg-green-100 text-green-800' : user.requestedRole !== 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}
                    >
                      {user.approved
                        ? 'Aprobado'
                        : user.requestedRole !== 0
                          ? `Pendiente (${roleName(user.requestedRole)})`
                          : 'Sin registrar'}
                    </span>
                    {user.approved && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {roleName(user.role)}
                      </span>
                    )}
                  </div>
                )}

                {isAdmin && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    Admin
                  </span>
                )}

                <span className="text-sm text-gray-600 font-mono">
                  {account && formatAddress(account)}
                </span>

                <button
                  onClick={disconnectWallet}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Desconectar</span>
                </button>
              </div>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
