import { useState, useEffect } from 'react';
import { useParams, Navigate, useNavigate, Link } from 'react-router-dom';
import { Package, ArrowLeft, ArrowRight, Calendar, User } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { Card, CardContent, CardHeader } from '../components/Card';
import { Button } from '../components/Button';

type TokenData = {
  id: bigint;
  productName: string;
  assetType: number;
  metadataURI: string;
  totalSupply: bigint;
  creator: string;
  currentHolder: string;
  currentRole: number;
  createdAt: bigint;
  parentIds: bigint[];
  exists: boolean;
};

export function TokenDetails() {
  const { id } = useParams<{ id: string }>();
  const { account, user, tokenFactory } = useWeb3();
  const navigate = useNavigate();
  const [token, setToken] = useState<TokenData | null>(null);
  const [balance, setBalance] = useState<bigint>(0n);
  const [parentTokens, setParentTokens] = useState<TokenData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokenFactory || !account || !id) return;

    const loadToken = async () => {
      try {
        const tokenData = await tokenFactory.getToken(id);
        setToken(tokenData);

        const userBalance = await tokenFactory.balanceOf(id, account);
        setBalance(userBalance);

        // Load parent tokens if any
        if (tokenData.parentIds && tokenData.parentIds.length > 0) {
          const parents = await Promise.all(
            tokenData.parentIds.map((parentId: bigint) => tokenFactory.getToken(parentId))
          );
          setParentTokens(parents);
        }
      } catch (error) {
        console.error('Error loading token:', error);
      } finally {
        setLoading(false);
      }
    };

    loadToken();
  }, [tokenFactory, account, id]);

  if (!user || !user.approved) {
    return <Navigate to="/" />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-gray-600">Loading token...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Token not found</h3>
              <p className="text-gray-600 mb-6">
                The token you are looking for does not exist
              </p>
              <Button onClick={() => navigate('/tokens')}>
                Back to Tokens
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const parseMetadata = (uri: string) => {
    try {
      if (!uri) return {};
      const parsed = JSON.parse(uri);
      return typeof parsed === 'object' && parsed !== null ? parsed : { value: parsed };
    } catch {
      return uri ? { value: uri } : {};
    }
  };

  const metadata = parseMetadata(token.metadataURI);
  const date = new Date(Number(token.createdAt) * 1000);
  
  const getAssetTypeName = (assetType: number) => {
    return assetType === 0 ? 'Raw Material' : 'Processed Good';
  };
  
  const getRoleName = (role: number) => {
    const roles = ['None', 'Producer', 'Factory', 'Retailer', 'Consumer'];
    return roles[role] || 'Unknown';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate('/tokens')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tokens
        </button>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Package className="w-8 h-8 text-blue-600" />
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{token.productName}</h1>
                    <p className="text-sm text-gray-500">Token ID: #{token.id.toString()}</p>
                    <span className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${
                      Number(token.assetType) === 0 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {getAssetTypeName(Number(token.assetType))}
                    </span>
                  </div>
                </div>
                {balance > 0n && user.role !== 4 && (
                  <Link to={`/tokens/${id}/transfer`}>
                    <Button>
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Transfer
                    </Button>
                  </Link>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Your Balance</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {balance.toString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Supply</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {token.totalSupply.toString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Token Information</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">Creator</p>
                    <p className="font-mono text-sm text-gray-900 break-all">{token.creator}</p>
                    {token.creator.toLowerCase() === account?.toLowerCase() && (
                      <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full mt-1">
                        You created this token
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Current Holder</p>
                    <p className="font-mono text-sm text-gray-900 break-all">{token.currentHolder}</p>
                    <p className="text-xs text-gray-500 mt-1">Role: {getRoleName(Number(token.currentRole))}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Created</p>
                    <p className="text-sm text-gray-900">{date.toLocaleString()}</p>
                  </div>
                </div>

                {parentTokens.length > 0 && (
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600 mb-2">Made From (Parent Materials)</p>
                    <div className="space-y-2">
                      {parentTokens.map((parent) => (
                        <Link key={parent.id.toString()} to={`/tokens/${parent.id.toString()}`}>
                          <div className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <p className="font-medium text-gray-900">{parent.productName}</p>
                            <p className="text-xs text-gray-500">Token #{parent.id.toString()}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {Object.keys(metadata).length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900">Features & Attributes</h2>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {Object.entries(metadata).map(([key, value]) => (
                    <div key={key} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        {key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}
                      </p>
                      <p className="text-gray-900">{String(value)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
