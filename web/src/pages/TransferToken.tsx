import { useState, useEffect } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { Card, CardContent, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Token, UserStatus, UserRole } from '../types';

export function TransferToken() {
  const { id } = useParams<{ id: string }>();
  const { account, user, contract } = useWeb3();
  const navigate = useNavigate();
  const [token, setToken] = useState<Token | null>(null);
  const [balance, setBalance] = useState<bigint>(0n);
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  useEffect(() => {
    if (!contract || !account || !id) return;

    const loadToken = async () => {
      try {
        const tokenData = await contract.getToken(id);
        setToken(tokenData);

        const userBalance = await contract.getTokenBalance(id, account);
        setBalance(userBalance);
      } catch (error) {
        console.error('Error loading token:', error);
      }
    };

    loadToken();
  }, [contract, account, id]);

  if (!user || user.status !== UserStatus.Approved) {
    return <Navigate to="/" />;
  }

  if (user.role === 'Consumer') {
    return <Navigate to="/tokens" />;
  }

  const getAllowedRecipientRole = (senderRole: UserRole): string => {
    switch (senderRole) {
      case 'Producer':
        return 'Factory';
      case 'Factory':
        return 'Retailer';
      case 'Retailer':
        return 'Consumer';
      default:
        return '';
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contract || !toAddress || !amount || !id) {
      alert('Please fill in all fields');
      return;
    }

    const amountBigInt = BigInt(amount);
    if (amountBigInt <= 0n || amountBigInt > balance) {
      alert('Invalid amount');
      return;
    }

    setIsTransferring(true);
    try {
      const tx = await contract.transfer(toAddress, id, amount);
      await tx.wait();

      navigate('/transfers');
    } catch (error: unknown) {
      console.error('Error transferring token:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to transfer token: ${errorMessage}`);
    } finally {
      setIsTransferring(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-gray-600">Loading token...</p>
        </div>
      </div>
    );
  }

  const allowedRole = getAllowedRecipientRole(user.role as UserRole);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate(`/tokens/${id}`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Token
        </button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Send className="w-6 h-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Transfer Token</h1>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Token: {token.name}</h3>
              <p className="text-sm text-blue-800">
                Available Balance: <strong>{balance.toString()}</strong> units
              </p>
            </div>

            <form onSubmit={handleTransfer} className="space-y-6">
              <div>
                <Input
                  label="Recipient Address"
                  placeholder="0x..."
                  value={toAddress}
                  onChange={(e) => setToAddress(e.target.value)}
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  The recipient must be a registered <strong>{allowedRole}</strong>
                </p>
              </div>

              <Input
                label="Amount"
                type="number"
                placeholder="e.g., 100"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
                max={balance.toString()}
                required
              />

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-medium text-yellow-900 mb-2">Transfer Rules</h3>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• As a <strong>{user.role}</strong>, you can only transfer to a <strong>{allowedRole}</strong></li>
                  <li>• The recipient must accept the transfer before it is completed</li>
                  <li>• Tokens will be held until the recipient accepts or rejects</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate(`/tokens/${id}`)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isTransferring || balance === 0n}
                  className="flex-1"
                >
                  {isTransferring ? 'Transferring...' : 'Send Transfer'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
