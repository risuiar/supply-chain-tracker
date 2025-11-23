import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Package, Plus, ArrowRight, ExternalLink } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { Card, CardContent } from '../components/Card';
import { Button } from '../components/Button';
import type { TokenData } from '../types';
import { EXPLORER_BASE_URL, TOKEN_FACTORY_ADDRESS } from '../contracts/config';

export function Tokens() {
  const { account, user, isAdmin, tokenFactory } = useWeb3();
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

  // Permitir acceso si es admin o si tiene un rol aprobado
  if (!isAdmin && (!user || !user.approved)) {
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
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Mis Tokens</h1>
            <p className="text-sm text-gray-600">Administra tus tokens de cadena de suministro</p>
          </div>
          {(user.role === 1 || user.role === 2) && (
            <Link to="/tokens/create">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Crear Token
              </Button>
            </Link>
          )}
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="mt-3 text-sm text-gray-600">Cargando tokens...</p>
          </div>
        ) : tokens.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Package className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <h3 className="text-base font-medium text-gray-900 mb-2">Aún no tienes tokens</h3>
              <p className="text-sm text-gray-600 mb-4">
                {user.role === 1 || user.role === 2
                  ? 'Crea tu primer token para comenzar'
                  : 'Recibirás tokens a través de transferencias'}
              </p>
              {(user.role === 1 || user.role === 2) && (
                <Link to="/tokens/create">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Token
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {(() => {
              // Separar tokens por tipo
              const rawMaterials = tokens.filter((token) => Number(token.assetType) === 0);
              const processedGoods = tokens.filter((token) => Number(token.assetType) === 1);

              return (
                <>
                  {/* Materias Primas */}
                  {rawMaterials.length > 0 && (
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <h2 className="text-lg font-semibold text-gray-900">Materias Primas</h2>
                        </div>
                        <div className="text-sm text-gray-500">
                          ({rawMaterials.length} {rawMaterials.length === 1 ? 'token' : 'tokens'})
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {rawMaterials.map((token) => {
                          const metadata = parseMetadata(token.metadataURI);
                          const balance = balances[token.id.toString()] || 0n;

                          return (
                            <TokenCard
                              key={token.id.toString()}
                              token={token}
                              metadata={metadata}
                              balance={balance}
                              account={account}
                              user={user}
                              typeColor="border-l-4 border-l-green-500"
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Productos Procesados */}
                  {processedGoods.length > 0 && (
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <h2 className="text-lg font-semibold text-gray-900">
                            Productos Procesados
                          </h2>
                        </div>
                        <div className="text-sm text-gray-500">
                          ({processedGoods.length}{' '}
                          {processedGoods.length === 1 ? 'token' : 'tokens'})
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {processedGoods.map((token) => {
                          const metadata = parseMetadata(token.metadataURI);
                          const balance = balances[token.id.toString()] || 0n;

                          return (
                            <TokenCard
                              key={token.id.toString()}
                              token={token}
                              metadata={metadata}
                              balance={balance}
                              account={account}
                              user={user}
                              typeColor="border-l-4 border-l-blue-500"
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

// Componente separado para la tarjeta de token
function TokenCard({
  token,
  metadata,
  balance,
  account,
  user,
  typeColor,
}: {
  token: TokenData;
  metadata: Record<string, unknown>;
  balance: bigint;
  account: string | null;
  user: { role: number };
  typeColor: string;
}) {
  return (
    <Card className={`hover:shadow-lg transition-shadow duration-200 ${typeColor}`}>
      <CardContent className="p-3">
        <div className="space-y-2">
          {/* Token Name & Balance */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-gray-900 truncate">{token.productName}</h3>
              <p className="text-xs text-gray-500">#{token.id.toString()}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-xl font-bold text-blue-600">{balance.toString()}</div>
              <div className="text-xs text-gray-500">Balance</div>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-2 py-2 border-y border-gray-200">
            <div>
              <div className="text-xs text-gray-600">Suministro Total</div>
              <div className="text-sm font-semibold text-gray-900">
                {token.totalSupply.toString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600">Creado</div>
              <div className="text-sm font-semibold text-gray-900">
                {new Date(Number(token.createdAt) * 1000).toLocaleDateString('en-GB')}
              </div>
            </div>
          </div>

          {/* Creator */}
          <div>
            <div className="text-xs text-gray-600">Creador</div>
            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
              <span className="text-xs font-mono text-gray-900">
                {token.creator.slice(0, 6)}...{token.creator.slice(-4)}
              </span>
              {token.creator.toLowerCase() === account?.toLowerCase() && (
                <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                  Tú
                </span>
              )}
            </div>
          </div>

          {/* Features */}
          {Object.keys(metadata).length > 0 && (
            <div>
              <div className="text-xs text-gray-600 mb-1">Características</div>
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {Object.entries(metadata)
                  .slice(0, 3)
                  .map(([key, value]) => (
                    <div key={key} className="flex gap-2 text-xs">
                      <span className="font-semibold text-gray-700 capitalize whitespace-nowrap">
                        {key.replace(/_/g, ' ')}:
                      </span>
                      <span className="text-gray-900 truncate">{String(value)}</span>
                    </div>
                  ))}
                {Object.keys(metadata).length > 3 && (
                  <div className="text-xs text-gray-500 italic pt-0.5">
                    +{Object.keys(metadata).length - 3} más
                  </div>
                )}
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
                Detalles
              </Button>
            </Link>
            {(() => {
              // Determinar si el botón de transferencia debe mostrarse
              const isCreator = token.creator.toLowerCase() === account?.toLowerCase();
              const hasBalance = balance > 0n;
              const isConsumer = user.role === 4;

              // El consumidor no puede transferir
              if (isConsumer) return null;

              // Productor: Solo transferir tokens RawMaterial que haya creado
              if (user.role === 1) {
                if (hasBalance && isCreator && Number(token.assetType) === 0) {
                  return (
                    <Link to={`/tokens/${token.id.toString()}/transfer`} className="flex-1">
                      <Button className="w-full text-xs py-1.5">
                        <ArrowRight className="w-3.5 h-3.5" />
                        Transferir
                      </Button>
                    </Link>
                  );
                }
              }

              // Fábrica: Solo transferir tokens ProcessedGood que haya creado
              if (user.role === 2) {
                if (hasBalance && isCreator && Number(token.assetType) === 1) {
                  return (
                    <Link to={`/tokens/${token.id.toString()}/transfer`} className="flex-1">
                      <Button className="w-full text-xs py-1.5">
                        <ArrowRight className="w-3.5 h-3.5" />
                        Transferir
                      </Button>
                    </Link>
                  );
                }
              }

              // Minorista: Puede transferir cualquier token que tenga
              if (user.role === 3 && hasBalance) {
                return (
                  <Link to={`/tokens/${token.id.toString()}/transfer`} className="flex-1">
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
}
