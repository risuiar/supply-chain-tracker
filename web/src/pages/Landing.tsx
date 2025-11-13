import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Shield, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWeb3 } from '../contexts/Web3Context';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader } from '../components/Card';
import { Select } from '../components/Select';

type UserRole = 'Admin' | 'Producer' | 'Factory' | 'Retailer' | 'Consumer';

export function Landing() {
  const { isConnected, isAdmin, user, connectWallet, requestRole, refreshUser } = useWeb3();
  const [selectedRole, setSelectedRole] = useState<UserRole>('Producer');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleRegister = async () => {
    setIsRegistering(true);
    try {
      // Map UI role string to enum Role (Solidity): 1 Producer, 2 Factory, 3 Retailer, 4 Consumer
      const roleMap: Record<UserRole, number> = {
        Producer: 1,
        Factory: 2,
        Retailer: 3,
        Consumer: 4,
        Admin: 0,
      };
      const desired = roleMap[selectedRole];
      await requestRole(desired);
      await refreshUser();
      toast.success('Role request submitted! Waiting for admin approval...');
    } catch (error) {
      console.error('Error registering:', error);
      toast.error('Failed to register. Please try again.');
    } finally {
      setIsRegistering(false);
    }
  };

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
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Supply Chain Tracker</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            A decentralized application for transparent and secure supply chain management. Track
            products from origin to consumer with blockchain technology.
          </p>
        </div>

        {!isConnected ? (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <h2 className="text-xl font-semibold text-gray-900">Connect Your Wallet</h2>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-6">
                Connect your MetaMask wallet to access the Supply Chain Tracker
              </p>
              <Button
                onClick={connectWallet}
                className="w-full flex items-center justify-center gap-2"
              >
                <Wallet className="w-5 h-5" />
                Connect MetaMask
              </Button>
            </CardContent>
          </Card>
        ) : !user ? (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <h2 className="text-xl font-semibold text-gray-900">Register Your Role</h2>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-6">
                Select your role in the supply chain to get started
              </p>
              <div className="space-y-4">
                <Select
                  label="Select Role"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                  options={[
                    { value: 'Producer', label: 'Producer - Register raw materials' },
                    { value: 'Factory', label: 'Factory - Transform materials into products' },
                    { value: 'Retailer', label: 'Retailer - Distribute products' },
                    { value: 'Consumer', label: 'Consumer - End consumer' },
                  ]}
                />
                <Button onClick={handleRegister} disabled={isRegistering} className="w-full">
                  {isRegistering ? 'Registering...' : 'Register'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : user && !user.approved && user.requestedRole !== 0 ? (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <h2 className="text-xl font-semibold text-gray-900">Pending Approval</h2>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 mb-4">
                  <div className="w-8 h-8 border-4 border-yellow-600 border-t-transparent rounded-full animate-spin" />
                </div>
                <p className="text-gray-600 mb-2">
                  Your registration as <strong>{user.role}</strong> is pending admin approval
                </p>
                <p className="text-sm text-gray-500">
                  Please wait while an administrator reviews your request
                </p>
              </div>
            </CardContent>
          </Card>
        ) : user && !user.approved && user.requestedRole === 0 && user.role === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <h2 className="text-xl font-semibold text-gray-900">Registration Rejected</h2>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-6">
                Your registration as <strong>{user.role}</strong> has been rejected by an
                administrator
              </p>
              <Button
                onClick={() => setSelectedRole('Producer')}
                className="w-full"
                variant="secondary"
              >
                Request Different Role
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <div className="mt-16 grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
          <Card className="text-center">
            <CardContent className="py-6">
              <div className="text-3xl mb-2">🌾</div>
              <h3 className="font-semibold text-gray-900 mb-1">Producer</h3>
              <p className="text-sm text-gray-600">Register raw materials</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="py-6">
              <div className="text-3xl mb-2">🏭</div>
              <h3 className="font-semibold text-gray-900 mb-1">Factory</h3>
              <p className="text-sm text-gray-600">Transform into products</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="py-6">
              <div className="text-3xl mb-2">🏪</div>
              <h3 className="font-semibold text-gray-900 mb-1">Retailer</h3>
              <p className="text-sm text-gray-600">Distribute to consumers</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="py-6">
              <div className="text-3xl mb-2">🛒</div>
              <h3 className="font-semibold text-gray-900 mb-1">Consumer</h3>
              <p className="text-sm text-gray-600">Final destination</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
