import { useState, useEffect } from 'react';
import { useParams, Navigate, useNavigate, Link } from 'react-router-dom';
import {
  Package,
  ArrowLeft,
  ArrowRight,
  Calendar,
  User,
  ArrowRightLeft,
  ExternalLink,
  Factory,
  ShoppingCart,
  Sprout,
  Store,
} from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { Card, CardContent, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import type { TokenData, TransferData } from '../types';
import {
  EXPLORER_BASE_URL,
  TOKEN_FACTORY_ADDRESS,
  TRANSFER_MANAGER_ADDRESS,
} from '../contracts/config';

type TraceabilityNode = {
  token: TokenData;
  transfers: TransferData[];
  children: TraceabilityNode[];
};

// Componente para renderizar el árbol de trazabilidad
function TraceabilityTree({
  node,
  account,
  level = 0,
}: {
  node: TraceabilityNode;
  account: string | null;
  level?: number;
}) {
  const getRoleIcon = (role: number) => {
    switch (role) {
      case 1: // Producer
        return <Sprout className="w-4 h-4 text-green-600" />;
      case 2: // Factory
        return <Factory className="w-4 h-4 text-blue-600" />;
      case 3: // Retailer
        return <Store className="w-4 h-4 text-purple-600" />;
      case 4: // Consumer
        return <ShoppingCart className="w-4 h-4 text-orange-600" />;
      default:
        return <Package className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRoleName = (role: number) => {
    const roles = ['Ninguno', 'Productor', 'Fábrica', 'Minorista', 'Consumidor', 'Admin'];
    return roles[role] || 'Desconocido';
  };

  const getAssetTypeName = (assetType: number) => {
    return assetType === 0 ? 'Materia Prima' : 'Producto Procesado';
  };

  const isRawMaterial = Number(node.token.assetType) === 0;
  const isRoot = level === 0;

  return (
    <div className="space-y-4">
      {/* Token actual */}
      <div className="relative">
        {level > 0 && <div className="absolute -left-6 top-0 bottom-0 w-0.5 bg-gray-300" />}
        <div className="flex gap-3">
          <div className="flex flex-col items-center">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                isRawMaterial
                  ? 'bg-green-50 border-green-300 text-green-700'
                  : 'bg-blue-50 border-blue-300 text-blue-700'
              }`}
            >
              {getRoleIcon(Number(node.token.currentRole))}
            </div>
            {node.children.length > 0 && (
              <div className="w-0.5 bg-gray-300 flex-1 min-h-[20px] mt-2" />
            )}
          </div>
          <div className="flex-1 pb-4">
            <div
              className={`p-4 rounded-lg border-2 ${
                isRawMaterial
                  ? 'bg-green-50 border-green-200'
                  : isRoot
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Link
                      to={`/tokens/${node.token.id.toString()}`}
                      className="font-semibold text-gray-900 hover:text-blue-600"
                    >
                      {node.token.productName}
                    </Link>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        isRawMaterial ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {getAssetTypeName(Number(node.token.assetType))}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">Token #{node.token.id.toString()}</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Creado por:</span>
                      <span className="font-mono text-gray-900">
                        {node.token.creator.slice(0, 6)}...{node.token.creator.slice(-4)}
                      </span>
                      {node.token.creator.toLowerCase() === account?.toLowerCase() && (
                        <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                          Tú
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Poseedor actual:</span>
                      <span className="font-mono text-gray-900">
                        {node.token.currentHolder.slice(0, 6)}...
                        {node.token.currentHolder.slice(-4)}
                      </span>
                      <span className="text-gray-500">
                        ({getRoleName(Number(node.token.currentRole))})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Suministro:</span>
                      <span className="font-semibold text-gray-900">
                        {node.token.totalSupply.toString()} unidades
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transferencias de este token */}
              {node.transfers.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-700 mb-2">
                    Transferencias ({node.transfers.length}):
                  </p>
                  <div className="space-y-2">
                    {node.transfers.map((transfer) => {
                      const date = new Date(Number(transfer.requestedAt) * 1000);
                      return (
                        <div
                          key={transfer.id.toString()}
                          className="p-2 bg-white rounded border border-gray-200"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">
                              {getRoleName(Number(transfer.fromRole))} →{' '}
                              {getRoleName(Number(transfer.toRole))}
                            </span>
                            <span className="text-gray-500">{date.toLocaleDateString()}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Cantidad: {transfer.amount.toString()} unidades
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tokens relacionados (padres o hijos según la dirección) */}
      {node.children.length > 0 && (
        <div className="ml-6 space-y-4 border-l-2 border-gray-300 pl-4">
          <p className="text-xs font-medium text-gray-600 mb-2">
            {(() => {
              // Detectar dirección basándose en los tipos de activos
              const currentIsRaw = Number(node.token.assetType) === 0;
              const hasProcessedChildren = node.children.some(
                (child) => Number(child.token.assetType) === 1
              );

              // Si es materia prima y tiene hijos procesados, es trazabilidad hacia adelante
              if (currentIsRaw && hasProcessedChildren) {
                return `Usado para crear ${node.children.length} producto${node.children.length !== 1 ? 's' : ''}:`;
              }
              // Si es producto procesado y tiene hijos materias primas, es trazabilidad hacia atrás
              return `Hecho de ${node.children.length} material${node.children.length !== 1 ? 'es' : ''}:`;
            })()}
          </p>
          {node.children.map((child) => (
            <TraceabilityTree
              key={child.token.id.toString()}
              node={child}
              account={account}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TokenDetails() {
  const { id } = useParams<{ id: string }>();
  const { account, user, tokenFactory, transferManager, getReasonableFromBlock } = useWeb3();
  const navigate = useNavigate();
  const [token, setToken] = useState<TokenData | null>(null);
  const [balance, setBalance] = useState<bigint>(0n);
  const [parentTokens, setParentTokens] = useState<TokenData[]>([]);
  const [transferHistory, setTransferHistory] = useState<TransferData[]>([]);
  const [fullTraceability, setFullTraceability] = useState<TraceabilityNode | null>(null);
  const [forwardTraceability, setForwardTraceability] = useState<TraceabilityNode | null>(null);
  const [completeSupplyChain, setCompleteSupplyChain] = useState<TransferData[]>([]);
  const [loading, setLoading] = useState(true);

  // Función optimizada para encontrar tokens hijos usando eventos
  const findChildTokens = async (parentTokenId: bigint): Promise<TokenData[]> => {
    if (!tokenFactory || !getReasonableFromBlock) return [];

    try {
      const children: TokenData[] = [];
      const parentTokenIdStr = parentTokenId.toString();

      // Obtener todos los eventos TokenCreated desde un bloque razonable
      const fromBlock = await getReasonableFromBlock();
      const filter = tokenFactory.filters.TokenCreated();
      const events = await tokenFactory.queryFilter(filter, fromBlock);

      // Para cada token creado, verificar si tiene el parentTokenId en sus parentIds
      const tokenPromises = events.map(async (event) => {
        if ('args' in event && event.args) {
          const tokenId = event.args[0];
          if (!tokenId) return null;

          try {
            const tokenData = await tokenFactory!.getToken(tokenId);

            // Verificar si este token tiene el parentTokenId en sus parentIds
            if (tokenData.parentIds && tokenData.parentIds.length > 0) {
              const hasParent = tokenData.parentIds.some(
                (pid: bigint) => pid.toString() === parentTokenIdStr
              );
              if (hasParent) {
                return tokenData;
              }
            }
          } catch {
            // Token no existe o error al obtenerlo, ignorar
            return null;
          }
        }
        return null;
      });

      const results = await Promise.all(tokenPromises);
      children.push(...results.filter((token): token is TokenData => token !== null));

      return children;
    } catch (error) {
      console.error('Error finding child tokens:', error);
      return [];
    }
  };

  // Función recursiva para obtener toda la trazabilidad hacia atrás (padres)
  const buildTraceabilityTree = async (
    tokenId: bigint,
    visited: Set<string> = new Set()
  ): Promise<TraceabilityNode | null> => {
    const tokenIdStr = tokenId.toString();
    if (visited.has(tokenIdStr)) {
      return null; // Evitar ciclos
    }
    visited.add(tokenIdStr);

    try {
      const tokenData = await tokenFactory!.getToken(tokenId);

      // Obtener historial de transferencias
      let transfers: TransferData[] = [];
      try {
        const history = await transferManager!.getTokenTransfers(tokenId);
        const historyArray = Array.from(history) as TransferData[];
        transfers = historyArray.filter((t: TransferData) => Number(t.status) === 2);
        // Ordenar por fecha
        transfers.sort((a, b) => Number(a.requestedAt) - Number(b.requestedAt));
      } catch (error) {
        console.error(`Error loading transfers for token ${tokenIdStr}:`, error);
      }

      // Obtener tokens padre recursivamente
      const children: TraceabilityNode[] = [];
      if (tokenData.parentIds && tokenData.parentIds.length > 0) {
        const parentNodes = await Promise.all(
          tokenData.parentIds.map((parentId: bigint) =>
            buildTraceabilityTree(parentId, new Set(visited))
          )
        );
        children.push(...parentNodes.filter((node): node is TraceabilityNode => node !== null));
      }

      return {
        token: tokenData,
        transfers,
        children,
      };
    } catch (error) {
      console.error(`Error loading token ${tokenIdStr}:`, error);
      return null;
    }
  };

  // Función recursiva para recopilar todas las transferencias de la cadena completa
  const collectCompleteSupplyChain = async (
    node: TraceabilityNode,
    allTransfers: TransferData[] = []
  ): Promise<TransferData[]> => {
    // Agregar transferencias del nodo actual
    allTransfers.push(...node.transfers);

    // Recursivamente procesar hijos (materias primas)
    for (const child of node.children) {
      await collectCompleteSupplyChain(child, allTransfers);
    }

    return allTransfers;
  };

  // Función recursiva para obtener trazabilidad hacia adelante (hijos)
  const buildForwardTraceabilityTree = async (
    tokenId: bigint,
    visited: Set<string> = new Set()
  ): Promise<TraceabilityNode | null> => {
    const tokenIdStr = tokenId.toString();
    if (visited.has(tokenIdStr)) {
      return null; // Evitar ciclos
    }
    visited.add(tokenIdStr);

    try {
      const tokenData = await tokenFactory!.getToken(tokenId);

      // Obtener historial de transferencias
      let transfers: TransferData[] = [];
      try {
        const history = await transferManager!.getTokenTransfers(tokenId);
        const historyArray = Array.from(history) as TransferData[];
        transfers = historyArray.filter((t: TransferData) => Number(t.status) === 2);
        // Ordenar por fecha
        transfers.sort((a, b) => Number(a.requestedAt) - Number(b.requestedAt));
      } catch (error) {
        console.error(`Error loading transfers for token ${tokenIdStr}:`, error);
      }

      // Buscar tokens hijos (productos creados a partir de este token)
      const children: TraceabilityNode[] = [];
      const childTokens = await findChildTokens(tokenId);

      if (childTokens.length > 0) {
        const childNodes = await Promise.all(
          childTokens.map((childToken) =>
            buildForwardTraceabilityTree(childToken.id, new Set(visited))
          )
        );
        children.push(...childNodes.filter((node): node is TraceabilityNode => node !== null));
      }

      return {
        token: tokenData,
        transfers,
        children,
      };
    } catch (error) {
      console.error(`Error loading token ${tokenIdStr}:`, error);
      return null;
    }
  };

  useEffect(() => {
    if (!tokenFactory || !transferManager || !account || !id) return;

    const loadToken = async () => {
      try {
        const tokenId = BigInt(id);
        const tokenData = await tokenFactory!.getToken(tokenId);
        setToken(tokenData);

        const userBalance = await tokenFactory.balanceOf(tokenId, account);
        setBalance(userBalance);

        // Load parent tokens if any
        if (tokenData.parentIds && tokenData.parentIds.length > 0) {
          const parents = await Promise.all(
            tokenData.parentIds.map((parentId: bigint) => tokenFactory.getToken(parentId))
          );
          setParentTokens(parents);
        }

        // Load transfer history for current token
        try {
          const history = await transferManager!.getTokenTransfers(tokenId);
          const historyArray = Array.from(history) as TransferData[];
          const approvedTransfers = historyArray.filter(
            (t: TransferData) => Number(t.status) === 2
          );
          approvedTransfers.sort((a, b) => Number(a.requestedAt) - Number(b.requestedAt));
          setTransferHistory(approvedTransfers);
        } catch (error) {
          console.error('Error loading transfer history:', error);
        }

        // Build full traceability tree (hacia atrás - padres)
        const traceabilityTree = await buildTraceabilityTree(tokenId);
        setFullTraceability(traceabilityTree);

        // Construir cadena completa de suministro desde productor hasta consumidor
        if (traceabilityTree) {
          const completeChain = await collectCompleteSupplyChain(traceabilityTree);
          // Agregar también las transferencias del token actual
          completeChain.push(...transferHistory);
          // Ordenar por fecha (más antiguas primero)
          completeChain.sort((a, b) => Number(a.requestedAt) - Number(b.requestedAt));
          // Eliminar duplicados basados en transfer ID
          const uniqueTransfers = Array.from(
            new Map(completeChain.map((t) => [t.id.toString(), t])).values()
          );
          setCompleteSupplyChain(uniqueTransfers);
        }

        // Build forward traceability tree (hacia adelante - hijos) solo para materias primas
        if (Number(tokenData.assetType) === 0) {
          const forwardTree = await buildForwardTraceabilityTree(tokenId);
          setForwardTraceability(forwardTree);
        }
      } catch (error) {
        console.error('Error loading token:', error);
      } finally {
        setLoading(false);
      }
    };

    loadToken();
  }, [
    tokenFactory,
    transferManager,
    account,
    id,
    buildTraceabilityTree,
    buildForwardTraceabilityTree,
  ]);

  if (!user || !user.approved) {
    return <Navigate to="/" />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-gray-600">Cargando token...</p>
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">Token no encontrado</h3>
              <p className="text-gray-600 mb-6">El token que buscas no existe</p>
              <Button onClick={() => navigate('/tokens')}>Volver a Tokens</Button>
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
    return assetType === 0 ? 'Materia Prima' : 'Producto Procesado';
  };

  const getRoleName = (role: number) => {
    const roles = ['Ninguno', 'Productor', 'Fábrica', 'Minorista', 'Consumidor', 'Admin'];
    return roles[role] || 'Desconocido';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <button
          onClick={() => navigate('/tokens')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Tokens
        </button>

        <div className="grid gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Package className="w-8 h-8 text-blue-600 flex-shrink-0" />
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">{token.productName}</h1>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-gray-500">#{token.id.toString()}</p>
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          Number(token.assetType) === 0
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {getAssetTypeName(Number(token.assetType))}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-xs text-gray-600 mb-0.5">Tu Balance</p>
                    <p className="text-xl font-bold text-gray-900">{balance.toString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600 mb-0.5">Suministro Total</p>
                    <p className="text-xl font-bold text-gray-900">
                      {token.totalSupply.toString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {EXPLORER_BASE_URL && (
                      <a
                        href={`${EXPLORER_BASE_URL}/token/${TOKEN_FACTORY_ADDRESS}?a=${token.id.toString()}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Ver en Etherscan
                      </a>
                    )}
                    {balance > 0n && user.role !== 4 && (
                      <Link to={`/tokens/${id}/transfer`}>
                        <Button className="whitespace-nowrap">
                          <ArrowRight className="w-4 h-4 mr-2" />
                          Transferir
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-gray-900">Información del Token</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">Creador</p>
                    <p className="font-mono text-sm text-gray-900 break-all">{token.creator}</p>
                    {token.creator.toLowerCase() === account?.toLowerCase() && (
                      <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full mt-1">
                        Tú creaste este token
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Poseedor Actual</p>
                    <p className="font-mono text-sm text-gray-900 break-all">
                      {token.currentHolder}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Rol: {getRoleName(Number(token.currentRole))}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Creado</p>
                    <p className="text-sm text-gray-900">{date.toLocaleString()}</p>
                  </div>
                </div>

                {parentTokens.length > 0 && (
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600 mb-2">
                      Hecho de {parentTokens.length} material{parentTokens.length !== 1 ? 'es' : ''}
                    </p>
                    <div className="max-h-64 overflow-y-auto">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {parentTokens.map((parent) => (
                          <Link key={parent.id.toString()} to={`/tokens/${parent.id.toString()}`}>
                            <div className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {parent.productName}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">#{parent.id.toString()}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {Object.keys(metadata).length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="text-base font-semibold text-gray-900">Características y Atributos</h2>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-3">
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

          {/* Complete Supply Chain - Cadena Lineal Completa */}
          {completeSupplyChain.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-green-600" />
                  <h2 className="text-base font-semibold text-gray-900">
                    Cadena Completa de Suministro
                  </h2>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Cadena completa desde el productor original hasta el consumidor final
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {completeSupplyChain.map((transfer, index) => {
                    const date = new Date(Number(transfer.requestedAt) * 1000);
                    const getRoleNameLocal = (role: number) => {
                      const roles = ['Ninguno', 'Productor', 'Fábrica', 'Minorista', 'Consumidor', 'Admin'];
                      return roles[role] || 'Desconocido';
                    };

                    return (
                      <div key={transfer.id.toString()} className="relative">
                        {/* Información de transferencia */}
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                                {index + 1}
                              </span>
                              <span className="font-semibold text-gray-900">
                                {getRoleNameLocal(Number(transfer.fromRole))}
                              </span>
                              <ArrowRight className="w-4 h-4 text-gray-400" />
                              <span className="font-semibold text-gray-900">
                                {getRoleNameLocal(Number(transfer.toRole))}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {date.toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600">
                            Cantidad: <span className="font-semibold">{transfer.amount.toString()}</span> unidades
                          </div>
                        </div>
                        {/* Flecha hacia abajo para la siguiente transferencia */}
                        {index < completeSupplyChain.length - 1 && (
                          <div className="flex justify-center mt-2 mb-1">
                            <ArrowRight className="w-5 h-5 text-gray-400 rotate-90" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Full Traceability Chain (Backward - Parents) */}
          {fullTraceability && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-green-600" />
                  <h2 className="text-base font-semibold text-gray-900">
                    Trazabilidad Completa de la Cadena de Suministro (Origen)
                  </h2>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Trazabilidad completa desde el productor hasta el consumidor, incluyendo todas las materias primas
                </p>
              </CardHeader>
              <CardContent>
                <TraceabilityTree node={fullTraceability} account={account} />
              </CardContent>
            </Card>
          )}

          {/* Forward Traceability (Products Created from This Material) - Solo para materias primas */}
          {token && Number(token.assetType) === 0 && forwardTraceability && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sprout className="w-5 h-5 text-green-600" />
                  <h2 className="text-base font-semibold text-gray-900">
                    Productos Creados a partir de esta Materia Prima
                  </h2>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {user.role === 1 ? (
                    <>
                      Trazabilidad hacia adelante: ve todos los productos creados con tu materia prima y
                      su estado actual.
                      <span className="block mt-1 text-gray-500 italic">
                        Nota: Los detalles completos de transferencias son visibles para mantener la transparencia de blockchain.
                      </span>
                    </>
                  ) : (
                    'Trazabilidad hacia adelante: ve todos los productos creados con esta materia prima y su recorrido hasta los consumidores'
                  )}
                </p>
              </CardHeader>
              <CardContent>
                {forwardTraceability.children.length === 0 ? (
                  <div className="text-center py-6">
                    <Factory className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-1">Aún no se han creado productos</p>
                    <p className="text-xs text-gray-500">
                      Esta materia prima no ha sido utilizada para crear ningún producto procesado todavía.
                    </p>
                  </div>
                ) : (
                  <TraceabilityTree node={forwardTraceability} account={account} />
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-semibold text-gray-900">
                  Historial de Transferencias
                </h2>
                {(completeSupplyChain.length > 0 || transferHistory.length > 0) && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                    {completeSupplyChain.length > 0
                      ? completeSupplyChain.length
                      : transferHistory.length}{' '}
                    transfer{(completeSupplyChain.length > 0
                      ? completeSupplyChain.length
                      : transferHistory.length) !== 1
                      ? 's'
                      : ''}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Trazabilidad completa desde el productor hasta el consumidor a través de toda la cadena de suministro
              </p>
            </CardHeader>
            <CardContent>
              {(() => {
                // Usar completeSupplyChain si está disponible (incluye productor), sino usar transferHistory
                const displayTransfers =
                  completeSupplyChain.length > 0 ? completeSupplyChain : transferHistory;

                if (displayTransfers.length === 0) {
                  return (
                    <div className="text-center py-6">
                      <ArrowRightLeft className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-1">No hay transferencias aún</p>
                      <p className="text-xs text-gray-500">
                        Este token no ha sido transferido todavía. Una vez que ocurran transferencias aprobadas, aparecerán aquí.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {displayTransfers.map((transfer, index) => {
                      const date = new Date(Number(transfer.requestedAt) * 1000);
                      const isFirstTransfer = index === 0;
                      const isLastTransfer = index === displayTransfers.length - 1;

                      return (
                        <div key={transfer.id.toString()} className="relative">
                          {!isLastTransfer && (
                            <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-gray-200" />
                          )}
                          <div className="flex gap-4">
                            <div className="flex flex-col items-center">
                              <div
                                className={`flex items-center justify-center w-10 h-10 rounded-full ${
                                  isFirstTransfer
                                    ? 'bg-green-100 text-green-600'
                                    : isLastTransfer
                                      ? 'bg-blue-100 text-blue-600'
                                      : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                <ArrowRightLeft className="w-5 h-5" />
                              </div>
                            </div>
                            <div className="flex-1 pb-6">
                              <div className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      {getRoleName(Number(transfer.fromRole))} →{' '}
                                      {getRoleName(Number(transfer.toRole))}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                      {date.toLocaleString()}
                                    </p>
                                  </div>
                                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                    Completada
                                  </span>
                                </div>
                                <div className="space-y-1.5">
                                  <div className="flex items-start gap-2">
                                    <span className="text-xs text-gray-500 min-w-[60px]">De:</span>
                                    <span className="text-xs font-mono text-gray-900 break-all">
                                      {transfer.from}
                                    </span>
                                    {transfer.from.toLowerCase() === account?.toLowerCase() && (
                                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                        Tú
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <span className="text-xs text-gray-500 min-w-[60px]">Para:</span>
                                    <span className="text-xs font-mono text-gray-900 break-all">
                                      {transfer.to}
                                    </span>
                                    {transfer.to.toLowerCase() === account?.toLowerCase() && (
                                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                        Tú
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500 min-w-[60px]">
                                      Cantidad:
                                    </span>
                                    <span className="text-xs font-semibold text-gray-900">
                                      {transfer.amount.toString()} unidades
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {EXPLORER_BASE_URL && (
            <Card>
              <CardHeader>
                <h2 className="text-base font-semibold text-gray-900">Explorador de Blockchain</h2>
              </CardHeader>
              <CardContent className="space-y-2">
                <a
                  href={`${EXPLORER_BASE_URL}/address/${TOKEN_FACTORY_ADDRESS}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink className="w-4 h-4" />
                  Contrato TokenFactory
                </a>
                <a
                  href={`${EXPLORER_BASE_URL}/address/${TRANSFER_MANAGER_ADDRESS}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink className="w-4 h-4" />
                  Contrato TransferManager
                </a>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
