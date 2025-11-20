import { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import {
  User as UserIcon,
  Package,
  ArrowRight,
  Calendar,
  CheckCircle,
  ArrowRightLeft,
} from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { Card, CardContent, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import type { TokenData, TransferData } from '../types';

export function Profile() {
  const { account, user, tokenFactory, transferManager } = useWeb3();
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [balances, setBalances] = useState<Record<string, bigint>>({});
  const [transfers, setTransfers] = useState<TransferData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTransfers, setLoadingTransfers] = useState(false);

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

        const loadedTokens = results.map((r) => r.token);
        const loadedBalances: Record<string, bigint> = {};
        results.forEach((r) => {
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

  // Cargar historial de transferencias usando getUserTransfers
  useEffect(() => {
    if (!transferManager || !account) return;

    const loadUserTransfers = async () => {
      setLoadingTransfers(true);
      try {
        // Usar la nueva función getUserTransfers
        const transferIds = await transferManager.getUserTransfers(account);

        // Obtener detalles de cada transferencia
        const transferPromises = transferIds.map(async (id: bigint) => {
          try {
            const transfer = await transferManager.getTransfer(id);
            return {
              id: transfer.id,
              tokenId: transfer.tokenId,
              from: transfer.from,
              to: transfer.to,
              amount: transfer.amount,
              fromRole: Number(transfer.fromRole),
              toRole: Number(transfer.toRole),
              status: Number(transfer.status),
              requestedAt: transfer.requestedAt,
              resolvedAt: transfer.resolvedAt,
            } as TransferData;
          } catch (error) {
            console.error(`Error loading transfer ${id}:`, error);
            return null;
          }
        });

        const loadedTransfers = await Promise.all(transferPromises);
        const validTransfers = loadedTransfers.filter((t): t is TransferData => t !== null);

        // Ordenar por fecha (más recientes primero)
        validTransfers.sort((a, b) => Number(b.requestedAt) - Number(a.requestedAt));

        setTransfers(validTransfers);
      } catch (error) {
        console.error('Error loading user transfers:', error);
      } finally {
        setLoadingTransfers(false);
      }
    };

    loadUserTransfers();
  }, [transferManager, account]);

  if (!user || !user.approved) {
    return <Navigate to="/" />;
  }

  const getRoleName = (role: number) => {
    const roles = ['None', 'Producer', 'Factory', 'Retailer', 'Consumer', 'Admin'];
    return roles[role] || 'Unknown';
  };

  const getRoleColor = (role: number) => {
    const colors = [
      'bg-gray-100 text-gray-700',
      'bg-green-100 text-green-700',
      'bg-blue-100 text-blue-700',
      'bg-purple-100 text-purple-700',
      'bg-orange-100 text-orange-700',
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
          <p className="text-gray-600">View your account information and activity</p>
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
                    <span
                      className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(user.role)}`}
                    >
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
                    <Button variant="secondary">
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
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                  Number(token.assetType) === 0
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-blue-100 text-blue-700'
                                }`}
                              >
                                {getAssetTypeName(Number(token.assetType))}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              Balance: {balance.toString()} • Total Supply:{' '}
                              {token.totalSupply.toString()}
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
                    <Button>Create Token</Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}

          {/* Transfer History - Using getUserTransfers */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">Transfer History</h2>
                {transfers.length > 0 && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                    {transfers.length} transfer{transfers.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Complete history of all transfers where you participated (as sender or receiver)
              </p>
            </CardHeader>
            <CardContent>
              {loadingTransfers ? (
                <div className="text-center py-6">
                  <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <p className="mt-2 text-sm text-gray-600">Loading transfers...</p>
                </div>
              ) : transfers.length === 0 ? (
                <div className="text-center py-6">
                  <ArrowRightLeft className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-1">No transfers yet</p>
                  <p className="text-xs text-gray-500">
                    Your transfer history will appear here once you send or receive tokens
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transfers.slice(0, 10).map((transfer) => {
                    const date = new Date(Number(transfer.requestedAt) * 1000);
                    const isSender = transfer.from.toLowerCase() === account?.toLowerCase();
                    const statusColors = {
                      1: 'bg-yellow-100 text-yellow-700', // Pending
                      2: 'bg-green-100 text-green-700', // Approved
                      3: 'bg-red-100 text-red-700', // Rejected
                    };
                    const statusNames = ['None', 'Pending', 'Completed', 'Rejected'];

                    return (
                      <Link
                        key={transfer.id.toString()}
                        to={`/tokens/${transfer.tokenId.toString()}`}
                        className="block"
                      >
                        <div className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {isSender ? 'Sent' : 'Received'} {transfer.amount.toString()} units
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {getRoleName(transfer.fromRole)} → {getRoleName(transfer.toRole)}
                              </p>
                            </div>
                            <span
                              className={`px-2 py-0.5 text-xs rounded-full ${
                                statusColors[transfer.status as keyof typeof statusColors] ||
                                'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {statusNames[transfer.status] || 'Unknown'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>Token #{transfer.tokenId.toString()}</span>
                            <span>{date.toLocaleDateString()}</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                  {transfers.length > 10 && (
                    <p className="text-sm text-gray-500 text-center pt-2">
                      And {transfers.length - 10} more transfers...{' '}
                      <Link to="/transfers" className="text-blue-600 hover:text-blue-800">
                        View all
                      </Link>
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

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
                      <span className="text-gray-700">
                        Create processed product tokens from raw materials
                      </span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span className="text-gray-700">
                        Transfer processed products to Retailers
                      </span>
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
                    <Button className="w-full">Create New Token</Button>
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
