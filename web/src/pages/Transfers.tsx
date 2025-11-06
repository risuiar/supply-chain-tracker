import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Send, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { Card, CardContent, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { Transfer, TransferStatus, UserStatus, Token } from '../types';

export function Transfers() {
  const { account, user, contract } = useWeb3();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [tokens, setTokens] = useState<Record<string, Token>>({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const loadTransfers = async () => {
    if (!contract || !account) return;

    try {
      const transferIds = await contract.getUserTransfers(account);
      const transferPromises = transferIds.map(async (id: bigint) => {
        const transfer = await contract.getTransfer(id);
        return transfer;
      });

      const loadedTransfers = await Promise.all(transferPromises);
      setTransfers(loadedTransfers);

      const tokenIds = new Set<string>();
      loadedTransfers.forEach(t => tokenIds.add(t.tokenId.toString()));

      const tokenPromises = Array.from(tokenIds).map(async (id) => {
        const token = await contract.getToken(id);
        return { id, token };
      });

      const tokenResults = await Promise.all(tokenPromises);
      const tokenMap: Record<string, Token> = {};
      tokenResults.forEach(({ id, token }) => {
        tokenMap[id] = token;
      });
      setTokens(tokenMap);
    } catch (error) {
      console.error('Error loading transfers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransfers();
  }, [contract, account]);

  if (!user || user.status !== UserStatus.Approved) {
    return <Navigate to="/" />;
  }

  const handleAccept = async (transferId: bigint) => {
    if (!contract) return;

    setProcessing(transferId.toString());
    try {
      const tx = await contract.acceptTransfer(transferId);
      await tx.wait();
      await loadTransfers();
    } catch (error) {
      console.error('Error accepting transfer:', error);
      alert('Failed to accept transfer');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (transferId: bigint) => {
    if (!contract) return;

    setProcessing(transferId.toString());
    try {
      const tx = await contract.rejectTransfer(transferId);
      await tx.wait();
      await loadTransfers();
    } catch (error) {
      console.error('Error rejecting transfer:', error);
      alert('Failed to reject transfer');
    } finally {
      setProcessing(null);
    }
  };

  const pendingIncoming = transfers.filter(
    t => t.to.toLowerCase() === account?.toLowerCase() && t.status === TransferStatus.Pending
  );

  const pendingOutgoing = transfers.filter(
    t => t.from.toLowerCase() === account?.toLowerCase() && t.status === TransferStatus.Pending
  );

  const completed = transfers.filter(
    t => t.status !== TransferStatus.Pending
  );

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const TransferCard = ({ transfer, showActions = false }: { transfer: Transfer; showActions?: boolean }) => {
    const token = tokens[transfer.tokenId.toString()];
    const isProcessing = processing === transfer.id.toString();
    const date = new Date(Number(transfer.dateCreated) * 1000);

    return (
      <Card>
        <CardContent className="py-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  transfer.status === TransferStatus.Accepted
                    ? 'bg-green-100 text-green-800'
                    : transfer.status === TransferStatus.Pending
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {transfer.status === TransferStatus.Accepted
                    ? 'Accepted'
                    : transfer.status === TransferStatus.Pending
                    ? 'Pending'
                    : 'Rejected'}
                </span>
                <span className="text-sm text-gray-500">#{transfer.id.toString()}</span>
              </div>

              <h3 className="font-medium text-gray-900 mb-1">
                {token?.name || `Token #${transfer.tokenId.toString()}`}
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
          <p className="text-gray-600">
            Manage incoming and outgoing token transfers
          </p>
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
                  {pendingIncoming.map(transfer => (
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
                  {pendingOutgoing.map(transfer => (
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
                  {completed.map(transfer => (
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
