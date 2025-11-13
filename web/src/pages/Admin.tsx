import { Navigate } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import { AdminRolePanel } from '../components/AdminRolePanel';

export function Admin() {
  const { isAdmin } = useWeb3();

  if (!isAdmin) {
    return <Navigate to="/" />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Panel de Administración</h1>
          <p className="text-gray-600">Gestiona las solicitudes de roles y usuarios del sistema</p>
        </div>

        <AdminRolePanel />
      </div>
    </div>
  );
}
