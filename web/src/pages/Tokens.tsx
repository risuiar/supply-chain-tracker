import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Package, Plus, ArrowRight, ExternalLink } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { Card, CardContent } from '../components/Card';
import { Button } from '../components/Button';
import type { TokenData } from '../types';
import { EXPLORER_BASE_URL, TOKEN_FACTORY_ADDRESS } from '../contracts/config';

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
        const loadedTokens = results.map((r) => r.token);
        const loadedBalances: Record<string, bigint> = {};
        results.forEach((r) => {
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">My Tokens</h1>
            <p className="text-sm text-gray-600">Manage your supply chain tokens</p>
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
          <div className="text-center py-8">
            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="mt-3 text-sm text-gray-600">Loading tokens...</p>
          </div>
        ) : tokens.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Package className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <h3 className="text-base font-medium text-gray-900 mb-2">No tokens yet</h3>
              <p className="text-sm text-gray-600 mb-4">
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tokens.map((token) => {
              const metadata = parseMetadata(token.metadataURI);
              const balance = balances[token.id.toString()] || 0n;

              return (
                <Card
                  key={token.id.toString()}
                  className="hover:shadow-lg transition-shadow duration-200"
                >
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      {/* Token Name & Balance */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-bold text-gray-900 truncate">
                            {token.productName}
                          </h3>
                          <p className="text-xs text-gray-500">#{token.id.toString()}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xl font-bold text-blue-600">
                            {balance.toString()}
                          </div>
                          <div className="text-xs text-gray-500">Balance</div>
                        </div>
                      </div>

                      {/* Info Grid */}
                      <div className="grid grid-cols-2 gap-2 py-2 border-y border-gray-200">
                        <div>
                          <div className="text-xs text-gray-600">Total Supply</div>
                          <div className="text-sm font-semibold text-gray-900">
                            {token.totalSupply.toString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600">Created</div>
                          <div className="text-sm font-semibold text-gray-900">
                            {new Date(Number(token.createdAt) * 1000).toLocaleDateString('en-GB')}
                          </div>
                        </div>
                      </div>

                      {/* Creator */}
                      <div>
                        <div className="text-xs text-gray-600">Creator</div>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          <span className="text-xs font-mono text-gray-900">
                            {token.creator.slice(0, 6)}...{token.creator.slice(-4)}
                          </span>
                          {token.creator.toLowerCase() === account?.toLowerCase() && (
                            <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                              You
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Features */}
                      {Object.keys(metadata).length > 0 && (
                        <div>
                          <div className="text-xs text-gray-600">Features</div>
                          <div className="text-xs text-gray-900 italic line-clamp-1 mt-0.5">
                            {Object.entries(metadata)
                              .map(([, value]) => String(value))
                              .join(', ')}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        {EXPLORER_BASE_URL && (
                          <a
                            href={`${EXPLORER_BASE_URL}/token/${TOKEN_FACTORY_ADDRESS}?a=${token.id.toString()}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1"
                          >
                            <Button variant="secondary" className="w-full text-xs py-1.5">
                              <ExternalLink className="w-3.5 h-3.5" />
                              Etherscan
                            </Button>
                          </a>
                        )}
                        <Link to={`/tokens/${token.id.toString()}`} className="flex-1">
                          <Button variant="secondary" className="w-full text-xs py-1.5">
                            <Package className="w-3.5 h-3.5" />
                            Details
                          </Button>
                        </Link>
                        {(() => {
                          // Determine if transfer button should be shown
                          const isCreator = token.creator.toLowerCase() === account?.toLowerCase();
                          const hasBalance = balance > 0n;
                          const isConsumer = user.role === 4;

                          // Consumer cannot transfer
                          if (isConsumer) return null;

                          // Producer: Only transfer RawMaterial tokens they created
                          if (user.role === 1) {
                            if (hasBalance && isCreator && Number(token.assetType) === 0) {
                              return (
                                <Link
                                  to={`/tokens/${token.id.toString()}/transfer`}
                                  className="flex-1"
                                >
                                  <Button className="w-full text-xs py-1.5">
                                    <ArrowRight className="w-3.5 h-3.5" />
                                    Transfer
                                  </Button>
                                </Link>
                              );
                            }
                          }

                          // Factory: Only transfer ProcessedGood tokens they created
                          if (user.role === 2) {
                            if (hasBalance && isCreator && Number(token.assetType) === 1) {
                              return (
                                <Link
                                  to={`/tokens/${token.id.toString()}/transfer`}
                                  className="flex-1"
                                >
                                  <Button className="w-full text-xs py-1.5">
                                    <ArrowRight className="w-3.5 h-3.5" />
                                    Transfer
                                  </Button>
                                </Link>
                              );
                            }
                          }

                          // Retailer: Can transfer any token they have
                          if (user.role === 3 && hasBalance) {
                            return (
                              <Link
                                to={`/tokens/${token.id.toString()}/transfer`}
                                className="flex-1"
                              >
                                <Button className="w-full text-xs py-1.5">
                                  <ArrowRight className="w-3.5 h-3.5" />
                                  Transfer
                                </Button>
                              </Link>
                            );
                          }

                          return null;
                        })()}
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
