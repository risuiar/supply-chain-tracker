import { Navigate } from 'react-router-dom';
import { Shield, Wallet } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader } from '../components/Card';
import { RoleRequestPanel } from '../components/RoleRequestPanel';

export function Landing() {
  const { isConnected, isAdmin, user, connectWallet } = useWeb3();

  // If admin, go directly to admin panel
  if (isConnected && isAdmin) {
    return <Navigate to="/admin" />;
  }

  // Approved user: approved == true and role != 0
  if (isConnected && user && user.approved && user.role !== 0) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <Shield className="w-16 h-16 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Trazabilidad de Productos</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Una aplicación descentralizada para la gestión transparente y segura de la cadena de
            suministro. Rastrea productos desde el origen hasta el consumidor con tecnología
            blockchain.
          </p>
        </div>

        {!isConnected ? (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <h2 className="text-xl font-semibold text-gray-900">Conecta tu Wallet</h2>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-6">
                Conecta tu wallet MetaMask para acceder al sistema de trazabilidad
              </p>
              <Button
                onClick={connectWallet}
                className="w-full flex items-center justify-center gap-2"
              >
                <Wallet className="w-5 h-5" />
                Conectar MetaMask
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="max-w-md mx-auto">
            <RoleRequestPanel />
          </div>
        )}

        <div className="mt-16 grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
          <Card className="text-center">
            <CardContent className="py-6">
              <div className="text-3xl mb-2">🌾</div>
              <h3 className="font-semibold text-gray-900 mb-1">Productor</h3>
              <p className="text-sm text-gray-600">Registra materias primas</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="py-6">
              <div className="text-3xl mb-2">🏭</div>
              <h3 className="font-semibold text-gray-900 mb-1">Fábrica</h3>
              <p className="text-sm text-gray-600">Transforma en productos</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="py-6">
              <div className="text-3xl mb-2">🏪</div>
              <h3 className="font-semibold text-gray-900 mb-1">Minorista</h3>
              <p className="text-sm text-gray-600">Distribuye a consumidores</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="py-6">
              <div className="text-3xl mb-2">🛒</div>
              <h3 className="font-semibold text-gray-900 mb-1">Consumidor</h3>
              <p className="text-sm text-gray-600">Destino final</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
