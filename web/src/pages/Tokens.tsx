import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Package, Plus, ArrowRight } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { Card, CardContent, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { Token, UserStatus } from '../types';

export function Tokens() {
  const { account, user, contract } = useWeb3();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [balances, setBalances] = useState<Record<string, bigint>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contract || !account) return;

    const loadTokens = async () => {
      try {
        const tokenIds = await contract.getUserTokens(account);
        const tokenPromises = tokenIds.map(async (id: bigint) => {
          const token = await contract.getToken(id);
          const balance = await contract.getTokenBalance(id, account);
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
        console.error('Error loading tokens:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTokens();
  }, [contract, account]);

  if (!user || user.status !== UserStatus.Approved) {
    return <Navigate to="/" />;
  }

  const parseFeatures = (features: string) => {
    try {
      return JSON.parse(features);
    } catch {
      return {};
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Tokens</h1>
            <p className="text-gray-600">
              Manage your supply chain tokens
            </p>
          </div>
          {(user.role === 'Producer' || user.role === 'Factory') && (
            <Link to="/tokens/create">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Token
              </Button>
            </Link>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-gray-600">Loading tokens...</p>
          </div>
        ) : tokens.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tokens yet</h3>
              <p className="text-gray-600 mb-6">
                {user.role === 'Producer' || user.role === 'Factory'
                  ? 'Create your first token to get started'
                  : 'You will receive tokens through transfers'}
              </p>
              {(user.role === 'Producer' || user.role === 'Factory') && (
                <Link to="/tokens/create">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Token
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tokens.map((token) => {
              const features = parseFeatures(token.features);
              const balance = balances[token.id.toString()] || 0n;

              return (
                <Card key={token.id.toString()}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{token.name}</h3>
                        <p className="text-xs text-gray-500">ID: #{token.id.toString()}</p>
                      </div>
                      <Package className="w-5 h-5 text-blue-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-600">Balance</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {balance.toString()} / {token.totalSupply.toString()}
                        </p>
                      </div>

                      {token.parentId > 0n && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span>Derived from Token #{token.parentId.toString()}</span>
                        </div>
                      )}

                      {Object.keys(features).length > 0 && (
                        <div className="pt-3 border-t border-gray-200">
                          <p className="text-xs font-medium text-gray-700 mb-2">Features:</p>
                          <div className="space-y-1">
                            {Object.entries(features).slice(0, 3).map(([key, value]) => (
                              <p key={key} className="text-xs text-gray-600">
                                <span className="font-medium">{key}:</span> {String(value)}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-3">
                        <Link to={`/tokens/${token.id.toString()}`} className="flex-1">
                          <Button variant="secondary" className="w-full text-sm">
                            View Details
                          </Button>
                        </Link>
                        {balance > 0n && user.role !== 'Consumer' && (
                          <Link to={`/tokens/${token.id.toString()}/transfer`}>
                            <Button className="text-sm">
                              <ArrowRight className="w-4 h-4" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
