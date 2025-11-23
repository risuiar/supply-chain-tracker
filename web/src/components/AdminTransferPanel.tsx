import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightLeft, Clock } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { Card, CardHeader, CardContent } from './Card';
import type { TokenData, TransferData } from '../types';

export function AdminTransferPanel() {
  const { tokenFactory, transferManager, getReasonableFromBlock } = useWeb3();
  const [pendingTransfers, setPendingTransfers] = useState<TransferData[]>([]);
  const [tokens, setTokens] = useState<Record<string, TokenData>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!transferManager || !tokenFactory) return;

    const loadPendingTransfers = async () => {
      setLoading(true);
      try {
        const fromBlock = await getReasonableFromBlock();
        const filter = transferManager.filters.TransferRequested();
        const events = await transferManager.queryFilter(filter, fromBlock);

        const transfers: TransferData[] = [];
        const tokenMap: Record<string, TokenData> = {};

        for (const event of events) {
          if ('args' in event) {
            const tokenId = event.args[0];
            const transferId = event.args[1];

            try {
              const transfer = await transferManager.getTransfer(transferId);

              // Solo incluir transferencias pendientes (status 1)
              if (Number(transfer.status) === 1) {
                const normalizedTransfer: TransferData = {
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
                };
                transfers.push(normalizedTransfer);

                // Cargar información del token si no está ya cargada
                const tokenIdStr = tokenId.toString();
                if (!tokenMap[tokenIdStr]) {
                  try {
                    const token = await tokenFactory.getToken(tokenId);
                    tokenMap[tokenIdStr] = token;
                  } catch (err) {
                    console.error(`Error loading token ${tokenIdStr}:`, err);
                  }
                }
              }
            } catch (err) {
              console.error(`Error loading transfer ${transferId}:`, err);
            }
          }
        }

        // Ordenar por fecha más reciente primero
        transfers.sort((a, b) => Number(b.requestedAt) - Number(a.requestedAt));

        setPendingTransfers(transfers);
        setTokens(tokenMap);
      } catch (error) {
        console.error('Error loading pending transfers:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPendingTransfers();
  }, [transferManager, tokenFactory, getReasonableFromBlock]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getRoleName = (role: number) => {
    const roles = ['Ninguno', 'Productor', 'Fábrica', 'Minorista', 'Consumidor', 'Admin'];
    return roles[role] || 'Desconocido';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-orange-600" />
            <h2 className="text-xl font-semibold">Transferencias Pendientes del Sistema</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.location.reload()}
              disabled={loading}
              className="px-2 py-1 text-xs text-orange-600 hover:text-orange-800 disabled:opacity-50"
              title="Actualizar lista"
            >
              {loading ? '⏳' : '🔄'}
            </button>
            <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
              {pendingTransfers.length} pendientes
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-1">
          Supervisión de todas las transferencias pendientes en el sistema
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-6">
            <div className="inline-block w-6 h-6 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
            <p className="mt-2 text-sm text-gray-600">Cargando transferencias...</p>
          </div>
        ) : pendingTransfers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-lg">No hay transferencias pendientes</p>
            <p className="text-sm mt-1">Todas las transferencias han sido procesadas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingTransfers.map((transfer) => {
              const token = tokens[transfer.tokenId.toString()];
              const date = new Date(Number(transfer.requestedAt) * 1000);

              return (
                <div
                  key={transfer.id.toString()}
                  className="border border-gray-200 rounded-lg p-4 hover:border-orange-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Pendiente
                        </span>
                        <span className="text-sm text-gray-500">#{transfer.id.toString()}</span>
                      </div>

                      <h3 className="font-medium text-gray-900 mb-2">
                        {token?.productName || `Token #${transfer.tokenId.toString()}`}
                      </h3>

                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <p>
                            <strong>De:</strong> {formatAddress(transfer.from)}
                          </p>
                          <p>
                            <strong>Rol:</strong> {getRoleName(transfer.fromRole)}
                          </p>
                        </div>
                        <div>
                          <p>
                            <strong>Para:</strong> {formatAddress(transfer.to)}
                          </p>
                          <p>
                            <strong>Rol:</strong> {getRoleName(transfer.toRole)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3 text-sm text-gray-600">
                        <p>
                          <strong>Cantidad:</strong> {transfer.amount.toString()} unidades
                        </p>
                        <p>
                          <strong>Fecha:</strong> {date.toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      <Link
                        to={`/tokens/${transfer.tokenId.toString()}`}
                        className="inline-flex items-center px-3 py-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
                      >
                        Ver Token
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
