import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Send, CheckCircle, XCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWeb3 } from '../contexts/Web3Context';
import { Card, CardContent } from '../components/Card';
import { Button } from '../components/Button';

type TransferData = {
  id: bigint;
  tokenId: bigint;
  from: string;
  to: string;
  amount: bigint;
  fromRole: number;
  toRole: number;
  status: number; // 0: None, 1: Pending, 2: Approved, 3: Rejected
  requestedAt: bigint;
  resolvedAt: bigint;
};

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

export function Transfers() {
  const { account, user, tokenFactory, transferManager } = useWeb3();
  const [transfers, setTransfers] = useState<TransferData[]>([]);
  const [tokens, setTokens] = useState<Record<string, TokenData>>({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const loadTransfers = async () => {
    if (!tokenFactory || !transferManager || !account) {
      return;
    }

    try {
      const allTransfers: TransferData[] = [];
      const tokenMap: Record<string, TokenData> = {};
      const transferIds = new Set<string>();

      // Get all TransferRequested events
      const filter = transferManager.filters.TransferRequested();
      const events = await transferManager.queryFilter(filter);

      for (const event of events) {
        if ('args' in event) {
          const tokenId = event.args[0];
          const transferId = event.args[1];

          const transferIdStr = transferId.toString();

          // Skip if already processed
          if (transferIds.has(transferIdStr)) {
            continue;
          }

          try {
            const transfer = await transferManager.getTransfer(transferId);

            // Only include transfers that involve this user (from OR to)
            const fromMatch = transfer.from.toLowerCase() === account.toLowerCase();
            const toMatch = transfer.to.toLowerCase() === account.toLowerCase();

            if (fromMatch || toMatch) {
              // Normalize the transfer object with proper types
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
              allTransfers.push(normalizedTransfer);
              transferIds.add(transferIdStr);

              // Get token info if not already loaded
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
            console.error(`Error loading transfer ${transferIdStr}:`, err);
          }
        }
      }

      // Sort by most recent first
      allTransfers.sort((a, b) => Number(b.requestedAt) - Number(a.requestedAt));

      setTransfers(allTransfers);
      setTokens(tokenMap);
    } catch (error) {
      console.error('Error loading transfers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransfers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenFactory, transferManager, account]);

  if (!user || !user.approved) {
    return <Navigate to="/" />;
  }

  const handleAccept = async (transferId: bigint) => {
    if (!transferManager) return;

    setProcessing(transferId.toString());
    const toastId = toast.loading('Accepting transfer...');
    try {
      const tx = await transferManager.approveTransfer(transferId);
      await tx.wait();
      toast.success('Transfer accepted successfully!', { id: toastId });
      await loadTransfers();
    } catch (error) {
      console.error('Error accepting transfer:', error);
      toast.error('Failed to accept transfer', { id: toastId });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (transferId: bigint) => {
    if (!transferManager) return;

    setProcessing(transferId.toString());
    const toastId = toast.loading('Rejecting transfer...');
    try {
      const tx = await transferManager.rejectTransfer(transferId);
      await tx.wait();
      toast.success('Transfer rejected successfully!', { id: toastId });
      await loadTransfers();
    } catch (error) {
      console.error('Error rejecting transfer:', error);
      toast.error('Failed to reject transfer', { id: toastId });
    } finally {
      setProcessing(null);
    }
  };

  const pendingIncoming = transfers.filter(
    (t) => account && t.to.toLowerCase() === account.toLowerCase() && t.status === 1
  );

  const pendingOutgoing = transfers.filter(
    (t) => account && t.from.toLowerCase() === account.toLowerCase() && t.status === 1
  );

  const completed = transfers.filter((t) => t.status === 2 || t.status === 3);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const TransferCard = ({
    transfer,
    showActions = false,
  }: {
    transfer: TransferData;
    showActions?: boolean;
  }) => {
    const token = tokens[transfer.tokenId.toString()];
    const isProcessing = processing === transfer.id.toString();
    const date = new Date(Number(transfer.requestedAt) * 1000);

    return (
      <Card>
        <CardContent className="py-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    transfer.status === 2
                      ? 'bg-green-100 text-green-800'
                      : transfer.status === 1
                        ? 'bg-yellow-100 text-yellow-800'
                        : transfer.status === 3
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {transfer.status === 2
                    ? 'Approved'
                    : transfer.status === 1
                      ? 'Pending'
                      : transfer.status === 3
                        ? 'Rejected'
                        : 'Unknown'}
                </span>
                <span className="text-sm text-gray-500">#{transfer.id.toString()}</span>
              </div>

              <h3 className="font-medium text-gray-900 mb-1">
                {token?.productName || `Token #${transfer.tokenId.toString()}`}
              </h3>

              <div className="space-y-1 text-sm text-gray-600">
                <p>
                  <strong>From:</strong> {formatAddress(transfer.from)}
                  {transfer.from.toLowerCase() === account?.toLowerCase() && ' (You)'}
                </p>
                <p>
                  <strong>To:</strong> {formatAddress(transfer.to)}
                  {transfer.to.toLowerCase() === account?.toLowerCase() && ' (You)'}
                </p>
                <p>
                  <strong>Amount:</strong> {transfer.amount.toString()} units
                </p>
                <p>
                  <strong>Date:</strong> {date.toLocaleString()}
                </p>
              </div>
            </div>

            {showActions && (
              <div className="flex gap-2 ml-4">
                <Button
                  variant="success"
                  onClick={() => handleAccept(transfer.id)}
                  disabled={isProcessing}
                  className="text-sm"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Accept
                </Button>
                <Button
                  variant="danger"
                  onClick={() => handleReject(transfer.id)}
                  disabled={isProcessing}
                  className="text-sm"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Reject
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Transfers</h1>
          <p className="text-gray-600">Manage incoming and outgoing token transfers</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-gray-600">Loading transfers...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {pendingIncoming.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  Pending Incoming ({pendingIncoming.length})
                </h2>
                <div className="space-y-4">
                  {pendingIncoming.map((transfer) => (
                    <TransferCard key={transfer.id.toString()} transfer={transfer} showActions />
                  ))}
                </div>
              </div>
            )}

            {pendingOutgoing.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Send className="w-5 h-5 text-blue-600" />
                  Pending Outgoing ({pendingOutgoing.length})
                </h2>
                <div className="space-y-4">
                  {pendingOutgoing.map((transfer) => (
                    <TransferCard key={transfer.id.toString()} transfer={transfer} />
                  ))}
                </div>
              </div>
            )}

            {completed.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Transfer History ({completed.length})
                </h2>
                <div className="space-y-4">
                  {completed.map((transfer) => (
                    <TransferCard key={transfer.id.toString()} transfer={transfer} />
                  ))}
                </div>
              </div>
            )}

            {transfers.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Send className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No transfers yet</h3>
                  <p className="text-gray-600">
                    Your incoming and outgoing transfers will appear here
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
