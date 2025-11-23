import { Navigate } from 'react-router-dom';
import { Wallet, ArrowRight } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader } from '../components/Card';
import { RoleRequestPanel } from '../components/RoleRequestPanel';

export function Landing() {
  const { isConnected, isAdmin, user, connectWallet } = useWeb3();

  // Si es admin, redirigir al dashboard
  if (isConnected && isAdmin) {
    return <Navigate to="/dashboard" />;
  }

  // Usuario aprobado: approved == true y role != 0
  if (isConnected && user && user.approved && user.role !== 0) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <img src="/favicon.svg" alt="Logo" className="w-16 h-16" />
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

        <div className="mt-16 max-w-5xl mx-auto">
          <style>{`
            @keyframes slideRight {
              0%, 100% { transform: translateX(0); opacity: 0.7; }
              50% { transform: translateX(8px); opacity: 1; }
            }
            .arrow-animate {
              animation: slideRight 2s ease-in-out infinite;
            }
            .arrow-animate-delay-1 {
              animation: slideRight 2s ease-in-out infinite;
              animation-delay: 0.3s;
            }
            .arrow-animate-delay-2 {
              animation: slideRight 2s ease-in-out infinite;
              animation-delay: 0.6s;
            }
            @keyframes slideDown {
              0%, 100% { transform: translateY(0) rotate(90deg); opacity: 0.7; }
              50% { transform: translateY(8px) rotate(90deg); opacity: 1; }
            }
            .arrow-vertical {
              animation: slideDown 2s ease-in-out infinite;
            }
            .arrow-vertical-delay-1 {
              animation: slideDown 2s ease-in-out infinite;
              animation-delay: 0.3s;
            }
            .arrow-vertical-delay-2 {
              animation: slideDown 2s ease-in-out infinite;
              animation-delay: 0.6s;
            }
          `}</style>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-2">
            <Card className="text-center flex-1 max-w-[200px] w-full">
              <CardContent className="py-6">
                <div className="text-3xl mb-2">🌾</div>
                <h3 className="font-semibold text-gray-900 mb-1">Productor</h3>
                <p className="text-sm text-gray-600">Registra materias primas</p>
              </CardContent>
            </Card>

            <div className="hidden md:flex items-center justify-center px-2">
              <ArrowRight className="w-8 h-8 text-blue-600 arrow-animate" />
            </div>

            <Card className="text-center flex-1 max-w-[200px] w-full">
              <CardContent className="py-6">
                <div className="text-3xl mb-2">🏭</div>
                <h3 className="font-semibold text-gray-900 mb-1">Fábrica</h3>
                <p className="text-sm text-gray-600">Transforma en productos</p>
              </CardContent>
            </Card>

            <div className="hidden md:flex items-center justify-center px-2">
              <ArrowRight className="w-8 h-8 text-blue-600 arrow-animate-delay-1" />
            </div>

            <Card className="text-center flex-1 max-w-[200px] w-full">
              <CardContent className="py-6">
                <div className="text-3xl mb-2">🏪</div>
                <h3 className="font-semibold text-gray-900 mb-1">Minorista</h3>
                <p className="text-sm text-gray-600">Distribuye a consumidores</p>
              </CardContent>
            </Card>

            <div className="hidden md:flex items-center justify-center px-2">
              <ArrowRight className="w-8 h-8 text-blue-600 arrow-animate-delay-2" />
            </div>

            <Card className="text-center flex-1 max-w-[200px] w-full">
              <CardContent className="py-6">
                <div className="text-3xl mb-2">🛒</div>
                <h3 className="font-semibold text-gray-900 mb-1">Consumidor</h3>
                <p className="text-sm text-gray-600">Destino final</p>
              </CardContent>
            </Card>
          </div>

          {/* Flechas verticales para móvil */}
          <div className="md:hidden flex flex-col items-center gap-4 mt-4">
            <ArrowRight className="w-6 h-6 text-blue-600 arrow-vertical" />
            <ArrowRight className="w-6 h-6 text-blue-600 arrow-vertical-delay-1" />
            <ArrowRight className="w-6 h-6 text-blue-600 arrow-vertical-delay-2" />
          </div>
        </div>
      </div>
    </div>
  );
}
