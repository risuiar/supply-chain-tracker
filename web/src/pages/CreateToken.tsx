import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Package, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWeb3 } from '../contexts/Web3Context';
import { Card, CardContent, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Textarea } from '../components/Textarea';

type TokenData = {
  id: bigint;
  productName: string;
  assetType: number;
  balance: bigint;
};

export function CreateToken() {
  const { user, tokenFactory, account } = useWeb3();
  const navigate = useNavigate();
  const [productName, setProductName] = useState('');
  const [totalSupply, setTotalSupply] = useState('');
  const [metadataURI, setMetadataURI] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [availableRawMaterials, setAvailableRawMaterials] = useState<TokenData[]>([]);
  const [selectedParents, setSelectedParents] = useState<string[]>([]);

  // Load available raw materials for Factory
  useEffect(() => {
    const loadRawMaterials = async () => {
      if (!tokenFactory || !account || !user || user.role !== 2) return;

      try {
        const materials: TokenData[] = [];

        // We need to check all existing tokens to find which ones we have balance for
        // The contract doesn't have a way to query by balance, so we'll check tokens from events
        // or iterate through a reasonable range. For now, let's check tokens 1-100
        // In production, you'd want to query TransferRequested/TokenTransferred events
        
        for (let i = 1; i <= 100; i++) {
          try {
            const token = await tokenFactory.getToken(i);
            if (!token.exists) continue;
            
            const balance = await tokenFactory.balanceOf(i, account);
            console.log(`Token #${i} (${token.productName}): assetType=${token.assetType}, balance=${balance.toString()}, type=${typeof balance}`);
            
            // Only show RawMaterial tokens (assetType = 0) with balance > 0
            // Convert both to numbers for safe comparison
            const balanceNum = typeof balance === 'bigint' ? balance : BigInt(balance);
            if (Number(token.assetType) === 0 && balanceNum > 0n) {
              materials.push({
                id: BigInt(i),
                productName: token.productName,
                assetType: Number(token.assetType),
                balance: balanceNum,
              });
            }
          } catch {
            // Token doesn't exist, continue
            break; // Stop when we hit non-existent tokens
          }
        }

        console.log('Available raw materials:', materials);
        setAvailableRawMaterials(materials);
      } catch (error) {
        console.error('Error loading raw materials:', error);
      }
    };

    loadRawMaterials();
  }, [tokenFactory, account, user]);

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
      toast.error('Please enter product name and total supply');
      return;
    }

    const supply = parseInt(totalSupply);
    if (isNaN(supply) || supply <= 0) {
      toast.error('Total supply must be a positive number');
      return;
    }

    // Factory must select at least one parent token
    if (user.role === 2 && selectedParents.length === 0) {
      toast.error('Please select at least one raw material to process');
      return;
    }

    setIsCreating(true);
    const toastId = toast.loading('Creating token...');
    try {
      let tx;
      
      if (user.role === 1) {
        // Producer creates raw material token
        tx = await tokenFactory.createRawToken(productName, metadataURI || '', supply);
      } else {
        // Factory creates processed token from selected parents
        const parentIds = selectedParents.map(id => BigInt(id));
        tx = await tokenFactory.createProcessedToken(productName, metadataURI || '', supply, parentIds);
      }
      
      await tx.wait();
      toast.success('Token created successfully!', { id: toastId });
      navigate('/tokens');
    } catch (error) {
      console.error('Error creating token:', error);
      toast.error('Failed to create token. Please try again.', { id: toastId });
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

              {user.role === 2 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Raw Materials to Process *
                  </label>
                  {availableRawMaterials.length === 0 ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                      No raw materials available. You need to receive raw materials from a Producer first.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
                      {availableRawMaterials.map((material) => (
                        <label
                          key={material.id.toString()}
                          className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedParents.includes(material.id.toString())}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedParents([...selectedParents, material.id.toString()]);
                              } else {
                                setSelectedParents(selectedParents.filter(id => id !== material.id.toString()));
                              }
                            }}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{material.productName}</div>
                            <div className="text-sm text-gray-500">
                              Token #{material.id.toString()} • Balance: {material.balance.toString()} units
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    Select the raw materials you want to use to create this processed token
                  </p>
                </div>
              )}

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
