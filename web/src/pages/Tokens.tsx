import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Package, Plus, ArrowRight } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { Card, CardContent } from '../components/Card';
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

export function Tokens() {
  const { account, user, tokenFactory } = useWeb3();
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [balances, setBalances] = useState<Record<string, bigint>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokenFactory || !account) return;

    const loadTokens = async () => {
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
        console.error('Error loading tokens:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTokens();
  }, [tokenFactory, account]);

  if (!user || !user.approved) {
    return <Navigate to="/" />;
  }

  const parseMetadata = (uri: string) => {
    try {
      if (!uri) return {};
      const parsed = JSON.parse(uri);
      // Si es un objeto, devolverlo; si es string, convertir a objeto
      return typeof parsed === 'object' && parsed !== null ? parsed : { value: parsed };
    } catch {
      // Si falla el parse, es un string plano
      return uri ? { value: uri } : {};
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
          {(user.role === 1 || user.role === 2) && (
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
                {user.role === 1 || user.role === 2
                  ? 'Create your first token to get started'
                  : 'You will receive tokens through transfers'}
              </p>
              {(user.role === 1 || user.role === 2) && (
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
              const metadata = parseMetadata(token.metadataURI);
              const balance = balances[token.id.toString()] || 0n;

              return (
                <Card key={token.id.toString()} className="hover:shadow-lg transition-shadow duration-200">
                  <CardContent className="p-5">
                    <div className="space-y-4">
                      {/* Token Name & Balance */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-bold text-gray-900 mb-0.5 truncate">{token.productName}</h3>
                          <p className="text-xs text-gray-500">Token #{token.id.toString()}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-3xl font-bold text-blue-600">
                            {balance.toString()}
                          </div>
                          <div className="text-xs text-gray-500 font-medium">Balance</div>
                        </div>
                      </div>

                      {/* Info Grid */}
                      <div className="grid grid-cols-2 gap-3 py-3 border-y border-gray-200">
                        <div>
                          <div className="text-xs text-gray-600 mb-0.5">Total Supply</div>
                          <div className="text-base font-semibold text-gray-900">
                            {token.totalSupply.toString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 mb-0.5">Created</div>
                          <div className="text-base font-semibold text-gray-900">
                            {new Date(Number(token.createdAt) * 1000).toLocaleDateString('en-GB')}
                          </div>
                        </div>
                      </div>

                      {/* Creator */}
                      <div>
                        <div className="text-xs text-gray-600 mb-1">Creator</div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono text-gray-900">
                            {token.creator.slice(0, 6)}...{token.creator.slice(-4)}
                          </span>
                          {token.creator.toLowerCase() === account?.toLowerCase() && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                              Owned by you
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Features */}
                      {Object.keys(metadata).length > 0 && (
                        <div>
                          <div className="text-xs text-gray-600 mb-1">Features</div>
                          <div className="text-sm text-gray-900 italic line-clamp-2">
                            "{Object.entries(metadata).map(([, value]) => String(value)).join(', ')}"
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-1">
                        <Link to={`/tokens/${token.id.toString()}`} className="flex-1">
                          <Button variant="secondary" className="w-full text-sm py-2">
                            <Package className="w-4 h-4" />
                            Details
                          </Button>
                        </Link>
                        {balance > 0n && user.role !== 4 && (
                          <Link to={`/tokens/${token.id.toString()}/transfer`} className="flex-1">
                            <Button className="w-full text-sm py-2">
                              <ArrowRight className="w-4 h-4" />
                              Transfer
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
