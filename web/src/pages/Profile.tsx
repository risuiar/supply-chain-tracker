import { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { User as UserIcon, Package, ArrowRight, Calendar, CheckCircle } from 'lucide-react';
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

export function Profile() {
  const { account, user, tokenFactory } = useWeb3();
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [balances, setBalances] = useState<Record<string, bigint>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokenFactory || !account) return;

    const loadData = async () => {
      try {
        const tokenIds = await tokenFactory.getUserTokens(account);
        const tokenPromises = tokenIds.map(async (id: bigint) => {
          const token = await tokenFactory.getToken(id);
          const balance = await tokenFactory.balanceOf(id, account);
          return { token, balance };
        });
        const results = await Promise.all(tokenPromises);
        
        const loadedTokens = results.map(r => r.token);
        const loadedBalances: Record<string, bigint> = {};
        results.forEach(r => {
          loadedBalances[r.token.id.toString()] = r.balance;
        });

        setTokens(loadedTokens);
        setBalances(loadedBalances);
      } catch (error) {
        console.error('Error loading profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [tokenFactory, account]);

  if (!user || !user.approved) {
    return <Navigate to="/" />;
  }

  const getRoleName = (role: number) => {
    const roles = ['None', 'Producer', 'Factory', 'Retailer', 'Consumer'];
    return roles[role] || 'Unknown';
  };

  const getRoleColor = (role: number) => {
    const colors = [
      'bg-gray-100 text-gray-700',
      'bg-green-100 text-green-700',
      'bg-blue-100 text-blue-700',
      'bg-purple-100 text-purple-700',
      'bg-orange-100 text-orange-700'
    ];
    return colors[role] || colors[0];
  };

  const getAssetTypeName = (assetType: number) => {
    return assetType === 0 ? 'Raw Material' : 'Processed Good';
  };

  const totalTokensOwned = tokens.length;
  const totalBalance = Object.values(balances).reduce((sum, bal) => sum + bal, 0n);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile</h1>
          <p className="text-gray-600">
            View your account information and activity
          </p>
        </div>

        <div className="grid gap-6">
          {/* Account Information */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold text-gray-900">Account Information</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <UserIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">Wallet Address</p>
                    <p className="font-mono text-sm text-gray-900 break-all">{account}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 flex items-center justify-center text-gray-400 mt-0.5">
                    🏷️
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">Role</p>
                    <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(user.role)}`}>
                      {getRoleName(user.role)}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">Status</p>
                    <span className="inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      Approved
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">Member Since</p>
                    <p className="text-gray-900">{new Date().toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Tokens</p>
                    <p className="text-3xl font-bold text-gray-900">{totalTokensOwned}</p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-100">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Balance</p>
                    <p className="text-3xl font-bold text-gray-900">{totalBalance.toString()}</p>
                  </div>
                  <div className="p-3 rounded-full bg-green-100">
                    <Package className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Role Level</p>
                    <p className="text-3xl font-bold text-gray-900">{user.role}</p>
                  </div>
                  <div className="p-3 rounded-full bg-purple-100">
                    <UserIcon className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Token Portfolio */}
          {loading ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <p className="mt-4 text-gray-600">Loading tokens...</p>
                </div>
              </CardContent>
            </Card>
          ) : tokens.length > 0 ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Token Portfolio</h2>
                  <Link to="/tokens">
                    <Button variant="secondary" size="sm">
                      View All
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tokens.slice(0, 5).map((token) => {
                    const balance = balances[token.id.toString()] || 0n;
                    return (
                      <Link
                        key={token.id.toString()}
                        to={`/tokens/${token.id.toString()}`}
                        className="block"
                      >
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-gray-900">{token.productName}</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                Number(token.assetType) === 0 
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {getAssetTypeName(Number(token.assetType))}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              Balance: {balance.toString()} • Total Supply: {token.totalSupply.toString()}
                            </p>
                          </div>
                          <ArrowRight className="w-5 h-5 text-gray-400" />
                        </div>
                      </Link>
                    );
                  })}
                  {tokens.length > 5 && (
                    <p className="text-sm text-gray-500 text-center pt-2">
                      And {tokens.length - 5} more tokens...
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tokens yet</h3>
                <p className="text-gray-600 mb-6">
                  {user.role === 1 || user.role === 2
                    ? 'Create your first token to get started'
                    : 'You will receive tokens through transfers'}
                </p>
                {(user.role === 1 || user.role === 2) && (
                  <Link to="/tokens/create">
                    <Button>
                      Create Token
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}

          {/* Role Capabilities */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold text-gray-900">Role Capabilities</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {user.role === 1 && (
                  <>
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span className="text-gray-700">Create raw material tokens</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span className="text-gray-700">Transfer raw materials to Factories</span>
                    </div>
                  </>
                )}
                {user.role === 2 && (
                  <>
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span className="text-gray-700">Receive raw materials from Producers</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span className="text-gray-700">Create processed product tokens from raw materials</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span className="text-gray-700">Transfer processed products to Retailers</span>
                    </div>
                  </>
                )}
                {user.role === 3 && (
                  <>
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span className="text-gray-700">Receive products from Factories</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span className="text-gray-700">Distribute products to Consumers</span>
                    </div>
                  </>
                )}
                {user.role === 4 && (
                  <>
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span className="text-gray-700">Receive products from Retailers</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span className="text-gray-700">View complete product traceability</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span className="text-gray-700">Verify product authenticity</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <Link to="/tokens">
                  <Button variant="secondary" className="w-full">
                    <Package className="w-4 h-4 mr-2" />
                    View My Tokens
                  </Button>
                </Link>
                <Link to="/transfers">
                  <Button variant="secondary" className="w-full">
                    <ArrowRight className="w-4 h-4 mr-2" />
                    View Transfers
                  </Button>
                </Link>
                {(user.role === 1 || user.role === 2) && (
                  <Link to="/tokens/create">
                    <Button className="w-full">
                      Create New Token
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
