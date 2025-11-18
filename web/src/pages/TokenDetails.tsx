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

export function TokenDetails() {
  const { id } = useParams<{ id: string }>();
  const { account, user, tokenFactory, transferManager } = useWeb3();
  const navigate = useNavigate();
  const [token, setToken] = useState<TokenData | null>(null);
  const [balance, setBalance] = useState<bigint>(0n);
  const [parentTokens, setParentTokens] = useState<TokenData[]>([]);
  const [transferHistory, setTransferHistory] = useState<TransferData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokenFactory || !transferManager || !account || !id) return;

    const loadToken = async () => {
      try {
        const tokenData = await tokenFactory.getToken(id);
        setToken(tokenData);

        const userBalance = await tokenFactory.balanceOf(id, account);
        setBalance(userBalance);

        // Load parent tokens if any
        if (tokenData.parentIds && tokenData.parentIds.length > 0) {
          const parents = await Promise.all(
            tokenData.parentIds.map((parentId: bigint) => tokenFactory.getToken(parentId))
          );
          setParentTokens(parents);
        }

        // Load transfer history
        try {
          const history = await transferManager.getTokenTransfers(id);
          const historyArray = Array.from(history);
          const approvedTransfers = historyArray.filter(
            (t: TransferData) => Number(t.status) === 2
          );
          setTransferHistory(approvedTransfers);
        } catch (error) {
          console.error('Error loading transfer history:', error);
        }
      } catch (error) {
        console.error('Error loading token:', error);
      } finally {
        setLoading(false);
      }
    };

    loadToken();
  }, [tokenFactory, transferManager, account, id]);

  if (!user || !user.approved) {
    return <Navigate to="/" />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-gray-600">Loading token...</p>
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">Token not found</h3>
              <p className="text-gray-600 mb-6">The token you are looking for does not exist</p>
              <Button onClick={() => navigate('/tokens')}>Back to Tokens</Button>
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
    return assetType === 0 ? 'Raw Material' : 'Processed Good';
  };

  const getRoleName = (role: number) => {
    const roles = ['None', 'Producer', 'Factory', 'Retailer', 'Consumer'];
    return roles[role] || 'Unknown';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <button
          onClick={() => navigate('/tokens')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tokens
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
                    <p className="text-xs text-gray-600 mb-0.5">Your Balance</p>
                    <p className="text-xl font-bold text-gray-900">{balance.toString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600 mb-0.5">Total Supply</p>
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
                        View on Etherscan
                      </a>
                    )}
                    {balance > 0n && user.role !== 4 && (
                      <Link to={`/tokens/${id}/transfer`}>
                        <Button className="whitespace-nowrap">
                          <ArrowRight className="w-4 h-4 mr-2" />
                          Transfer
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
              <h2 className="text-base font-semibold text-gray-900">Token Information</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">Creator</p>
                    <p className="font-mono text-sm text-gray-900 break-all">{token.creator}</p>
                    {token.creator.toLowerCase() === account?.toLowerCase() && (
                      <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full mt-1">
                        You created this token
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Current Holder</p>
                    <p className="font-mono text-sm text-gray-900 break-all">
                      {token.currentHolder}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Role: {getRoleName(Number(token.currentRole))}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Created</p>
                    <p className="text-sm text-gray-900">{date.toLocaleString()}</p>
                  </div>
                </div>

                {parentTokens.length > 0 && (
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600 mb-2">Made From (Parent Materials)</p>
                    <div className="space-y-2">
                      {parentTokens.map((parent) => (
                        <Link key={parent.id.toString()} to={`/tokens/${parent.id.toString()}`}>
                          <div className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <p className="font-medium text-gray-900">{parent.productName}</p>
                            <p className="text-xs text-gray-500">Token #{parent.id.toString()}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {Object.keys(metadata).length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="text-base font-semibold text-gray-900">Features & Attributes</h2>
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

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-semibold text-gray-900">Transfer History</h2>
                {transferHistory.length > 0 && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                    {transferHistory.length} transfer{transferHistory.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Complete traceability of this token through the supply chain
              </p>
            </CardHeader>
            <CardContent>
              {transferHistory.length === 0 ? (
                <div className="text-center py-6">
                  <ArrowRightLeft className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-1">No transfers yet</p>
                  <p className="text-xs text-gray-500">
                    This token has not been transferred yet. Once approved transfers occur, they
                    will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transferHistory.map((transfer, index) => {
                    const date = new Date(Number(transfer.requestedAt) * 1000);
                    const isFirstTransfer = index === 0;
                    const isLastTransfer = index === transferHistory.length - 1;

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
                                  Completed
                                </span>
                              </div>
                              <div className="space-y-1.5">
                                <div className="flex items-start gap-2">
                                  <span className="text-xs text-gray-500 min-w-[60px]">From:</span>
                                  <span className="text-xs font-mono text-gray-900 break-all">
                                    {transfer.from}
                                  </span>
                                  {transfer.from.toLowerCase() === account?.toLowerCase() && (
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                      You
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="text-xs text-gray-500 min-w-[60px]">To:</span>
                                  <span className="text-xs font-mono text-gray-900 break-all">
                                    {transfer.to}
                                  </span>
                                  {transfer.to.toLowerCase() === account?.toLowerCase() && (
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                      You
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500 min-w-[60px]">
                                    Amount:
                                  </span>
                                  <span className="text-xs font-semibold text-gray-900">
                                    {transfer.amount.toString()} units
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
              )}
            </CardContent>
          </Card>

          {EXPLORER_BASE_URL && (
            <Card>
              <CardHeader>
                <h2 className="text-base font-semibold text-gray-900">Blockchain Explorer</h2>
              </CardHeader>
              <CardContent className="space-y-2">
                <a
                  href={`${EXPLORER_BASE_URL}/address/${TOKEN_FACTORY_ADDRESS}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink className="w-4 h-4" />
                  TokenFactory contract
                </a>
                <a
                  href={`${EXPLORER_BASE_URL}/address/${TRANSFER_MANAGER_ADDRESS}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink className="w-4 h-4" />
                  TransferManager contract
                </a>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
