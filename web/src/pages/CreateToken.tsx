import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Package, CheckCircle } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { Card, CardContent, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Textarea } from '../components/Textarea';

export function CreateToken() {
  const { user, tokenFactory } = useWeb3();
  const navigate = useNavigate();
  const [productName, setProductName] = useState('');
  const [totalSupply, setTotalSupply] = useState('');
  const [metadataURI, setMetadataURI] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  if (!user || !user.approved) {
    return <Navigate to="/" />;
  }

  // Only Producer (1) and Factory (2) can create tokens
  if (user.role !== 1 && user.role !== 2) {
    return <Navigate to="/tokens" />;
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tokenFactory || !productName.trim() || !totalSupply) {
      alert('Please enter product name and total supply');
      return;
    }

    const supply = parseInt(totalSupply);
    if (isNaN(supply) || supply <= 0) {
      alert('Total supply must be a positive number');
      return;
    }

    setIsCreating(true);
    try {
      let tx;
      
      if (user.role === 1) {
        // Producer creates raw material token
        tx = await tokenFactory.createRawToken(productName, metadataURI || '', supply);
      } else {
        // Factory creates processed token (for now without parents - we'll add parent selection later)
        tx = await tokenFactory.createProcessedToken(productName, metadataURI || '', supply, []);
      }
      
      await tx.wait();
      alert('Token created successfully!');
      navigate('/tokens');
    } catch (error) {
      console.error('Error creating token:', error);
      alert('Failed to create token. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-blue-100">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Create Token</h1>
                <p className="text-sm text-gray-600">Create a new token for your role as {user.role === 1 ? 'Producer' : 'Factory'}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-6">
              <Input
                label="Token Name *"
                placeholder="Enter token name (e.g., Premium Coffee Beans)"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                required
              />

              <Input
                label="Total Supply *"
                type="number"
                placeholder="Enter total supply (e.g., 1000)"
                value={totalSupply}
                onChange={(e) => setTotalSupply(e.target.value)}
                min="1"
                required
              />

              <div>
                <Textarea
                  label="Features (JSON)"
                  placeholder={`Enter features as JSON, e.g.:
{
  "origin": "Colombia",
  "quality": "Premium",
  "certification": "Organic",
  "harvest_date": "2024-03-15"
}`}
                  value={metadataURI}
                  onChange={(e) => setMetadataURI(e.target.value)}
                  rows={8}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Optional: Add product characteristics in JSON format
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-blue-900 mb-1">Creating as {user.role === 1 ? 'Producer' : 'Factory'}</h3>
                    <p className="text-sm text-blue-800">
                      {user.role === 1 
                        ? 'You can create raw material tokens and transfer them to factories.'
                        : 'You can transform raw materials into processed goods and transfer to retailers.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate('/dashboard')}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1"
                >
                  <Package className="w-4 h-4 mr-2" />
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
