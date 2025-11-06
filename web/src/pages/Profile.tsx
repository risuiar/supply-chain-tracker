import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { User as UserIcon, Package, Send, Calendar } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { Card, CardContent, CardHeader } from '../components/Card';
import { Token, Transfer, UserStatus } from '../types';

export function Profile() {
  const { account, user, contract } = useWeb3();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contract || !account) return;

    const loadData = async () => {
      try {
        const tokenIds = await contract.getUserTokens(account);
        const tokenPromises = tokenIds.map(async (id: bigint) => {
          const token = await contract.getToken(id);
          return token;
        });
        const loadedTokens = await Promise.all(tokenPromises);
        setTokens(loadedTokens);

        const transferIds = await contract.getUserTransfers(account);
        const transferPromises = transferIds.map(async (id: bigint) => {
          const transfer = await contract.getTransfer(id);
          return transfer;
        });
        const loadedTransfers = await Promise.all(transferPromises);
        setTransfers(loadedTransfers);
      } catch (error) {
        console.error('Error loading profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [contract, account]);

  if (!user || user.status !== UserStatus.Approved) {
    return <Navigate to="/" />;
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 10)}...${address.slice(-8)}`;
  };

  const stats = [
    { label: 'Total Tokens', value: tokens.length, icon: Package },
    { label: 'Total Transfers', value: transfers.length, icon: Send },
    { label: 'Role', value: user.role, icon: UserIcon },
  ];

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
                    <p className="font-mono text-gray-900 break-all">{account}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 flex items-center justify-center text-gray-400 mt-0.5">
                    🏷️
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">Role</p>
                    <span className="inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      {user.role}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 flex items-center justify-center text-gray-400 mt-0.5">
                    ✅
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">Status</p>
                    <span className="inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      Approved
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 flex items-center justify-center text-gray-400 mt-0.5">
                    #️⃣
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">User ID</p>
                    <p className="text-gray-900">#{user.id.toString()}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-3 gap-6">
            {stats.map((stat) => (
              <Card key={stat.label}>
                <CardContent className="py-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                      <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                    <div className="p-3 rounded-full bg-blue-100">
                      <stat.icon className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {tokens.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-900">Token Portfolio</h2>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tokens.slice(0, 5).map((token) => (
                      <div
                        key={token.id.toString()}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{token.name}</p>
                          <p className="text-sm text-gray-600">
                            ID: #{token.id.toString()} • Supply: {token.totalSupply.toString()}
                          </p>
                        </div>
                        <Package className="w-5 h-5 text-gray-400" />
                      </div>
                    ))}
                    {tokens.length > 5 && (
                      <p className="text-sm text-gray-500 text-center pt-2">
                        And {tokens.length - 5} more tokens...
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold text-gray-900">Role Capabilities</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {user.role === 'Producer' && (
                  <>
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span className="text-gray-700">Create raw material tokens</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span className="text-gray-700">Transfer tokens to Factories</span>
                    </div>
                  </>
                )}
                {user.role === 'Factory' && (
                  <>
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span className="text-gray-700">Receive tokens from Producers</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span className="text-gray-700">Create manufactured product tokens</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span className="text-gray-700">Transfer tokens to Retailers</span>
                    </div>
                  </>
                )}
                {user.role === 'Retailer' && (
                  <>
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span className="text-gray-700">Receive tokens from Factories</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span className="text-gray-700">Transfer tokens to Consumers</span>
                    </div>
                  </>
                )}
                {user.role === 'Consumer' && (
                  <>
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span className="text-gray-700">Receive tokens from Retailers</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span className="text-gray-700">View complete product traceability</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
