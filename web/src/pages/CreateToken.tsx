import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Package, ArrowLeft } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { Card, CardContent, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Textarea } from '../components/Textarea';
import { Select } from '../components/Select';
import { UserStatus, Token } from '../types';

export function CreateToken() {
  const { account, user, contract } = useWeb3();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [totalSupply, setTotalSupply] = useState('');
  const [features, setFeatures] = useState('');
  const [parentId, setParentId] = useState('0');
  const [availableTokens, setAvailableTokens] = useState<Token[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!contract || !account || user?.role === 'Producer') return;

    const loadAvailableTokens = async () => {
      try {
        const tokenIds = await contract.getUserTokens(account);
        const tokenPromises = tokenIds.map(async (id: bigint) => {
          const token = await contract.getToken(id);
          const balance = await contract.getTokenBalance(id, account);
          return { token, balance };
        });

        const results = await Promise.all(tokenPromises);
        const tokensWithBalance = results
          .filter(r => r.balance > 0n)
          .map(r => r.token);

        setAvailableTokens(tokensWithBalance);
      } catch (error) {
        console.error('Error loading available tokens:', error);
      }
    };

    loadAvailableTokens();
  }, [contract, account, user]);

  if (!user || user.status !== UserStatus.Approved) {
    return <Navigate to="/" />;
  }

  if (user.role !== 'Producer' && user.role !== 'Factory') {
    return <Navigate to="/tokens" />;
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contract || !name || !totalSupply) {
      alert('Please fill in all required fields');
      return;
    }

    if (user.role === 'Factory' && parentId === '0') {
      alert('Factory must select a parent token');
      return;
    }

    setIsCreating(true);
    try {
      const featuresObj = features.trim() ? JSON.parse(features) : {};
      const featuresJson = JSON.stringify(featuresObj);

      const tx = await contract.createToken(
        name,
        totalSupply,
        featuresJson,
        parentId
      );
      await tx.wait();

      navigate('/tokens');
    } catch (error) {
      console.error('Error creating token:', error);
      alert('Failed to create token. Please check your input and try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate('/tokens')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tokens
        </button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Package className="w-6 h-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Create New Token</h1>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-6">
              <Input
                label="Token Name"
                placeholder="e.g., Organic Wheat Batch #123"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <Input
                label="Total Supply"
                type="number"
                placeholder="e.g., 1000"
                value={totalSupply}
                onChange={(e) => setTotalSupply(e.target.value)}
                min="1"
                required
              />

              {user.role === 'Factory' && (
                <div>
                  <Select
                    label="Parent Token (Raw Material)"
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                    options={[
                      { value: '0', label: 'Select a parent token' },
                      ...availableTokens.map(token => ({
                        value: token.id.toString(),
                        label: `#${token.id.toString()} - ${token.name}`
                      }))
                    ]}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Select the raw material token this product is derived from
                  </p>
                </div>
              )}

              <div>
                <Textarea
                  label="Features (JSON)"
                  placeholder='{"origin": "California", "organic": true, "harvestDate": "2025-01-15"}'
                  value={features}
                  onChange={(e) => setFeatures(e.target.value)}
                  rows={6}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Enter product features as JSON. Example: {`{"color": "brown", "weight": "50kg"}`}
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Token Information</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Role: <strong>{user.role}</strong></li>
                  {user.role === 'Producer' && (
                    <li>• You are creating a raw material token</li>
                  )}
                  {user.role === 'Factory' && (
                    <li>• You are creating a manufactured product from raw materials</li>
                  )}
                </ul>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate('/tokens')}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1"
                >
                  {isCreating ? 'Creating...' : 'Create Token'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
