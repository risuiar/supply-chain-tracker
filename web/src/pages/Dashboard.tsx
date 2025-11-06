import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Package, Send, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { Card, CardContent, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { UserStatus, Token, Transfer, TransferStatus } from '../types';

export function Dashboard() {
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
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [contract, account]);

  if (!user || user.status !== UserStatus.Approved) {
    return <Navigate to="/" />;
  }

  const pendingTransfers = transfers.filter(t =>
    t.to.toLowerCase() === account?.toLowerCase() && t.status === TransferStatus.Pending
  );

  const tokensWithBalance = tokens.filter(t => {
    return true;
  });

  const stats = [
    { label: 'My Tokens', value: tokensWithBalance.length, icon: Package, color: 'blue' },
    { label: 'Pending Transfers', value: pendingTransfers.length, icon: Clock, color: 'yellow' },
    { label: 'Total Transfers', value: transfers.length, icon: Send, color: 'green' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome, {user.role}
          </h1>
          <p className="text-gray-600">
            Manage your supply chain operations from this dashboard
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-full bg-${stat.color}-100`}>
                    <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {(user.role === 'Producer' || user.role === 'Factory') && (
                <Link to="/tokens/create">
                  <Button className="w-full">
                    <Package className="w-4 h-4 mr-2" />
                    Create New Token
                  </Button>
                </Link>
              )}
              <Link to="/tokens">
                <Button variant="secondary" className="w-full">
                  <Package className="w-4 h-4 mr-2" />
                  View My Tokens
                </Button>
              </Link>
              <Link to="/transfers">
                <Button variant="secondary" className="w-full">
                  <Send className="w-4 h-4 mr-2" />
                  Manage Transfers
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-gray-500 text-center py-4">Loading...</p>
              ) : transfers.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No recent activity</p>
              ) : (
                <div className="space-y-3">
                  {transfers.slice(0, 5).map((transfer) => (
                    <div key={transfer.id.toString()} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className={`p-2 rounded-full ${
                        transfer.status === TransferStatus.Accepted
                          ? 'bg-green-100'
                          : transfer.status === TransferStatus.Pending
                          ? 'bg-yellow-100'
                          : 'bg-red-100'
                      }`}>
                        {transfer.status === TransferStatus.Accepted ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <Clock className="w-4 h-4 text-yellow-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          Transfer #{transfer.id.toString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          Token #{transfer.tokenId.toString()} - {transfer.amount.toString()} units
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {pendingTransfers.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">
                Pending Transfers Requiring Action
              </h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingTransfers.map((transfer) => (
                  <div key={transfer.id.toString()} className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div>
                      <p className="font-medium text-gray-900">
                        Transfer from {transfer.from.slice(0, 6)}...{transfer.from.slice(-4)}
                      </p>
                      <p className="text-sm text-gray-600">
                        Token #{transfer.tokenId.toString()} - {transfer.amount.toString()} units
                      </p>
                    </div>
                    <Link to="/transfers">
                      <Button size="sm">Review</Button>
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
