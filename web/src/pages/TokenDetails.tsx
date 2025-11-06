import { useState, useEffect } from 'react';
import { useParams, Navigate, useNavigate, Link } from 'react-router-dom';
import { Package, ArrowLeft, ArrowRight, Calendar, User } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { Card, CardContent, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { Token, UserStatus } from '../types';

export function TokenDetails() {
  const { id } = useParams<{ id: string }>();
  const { account, user, contract } = useWeb3();
  const navigate = useNavigate();
  const [token, setToken] = useState<Token | null>(null);
  const [balance, setBalance] = useState<bigint>(0n);
  const [parentToken, setParentToken] = useState<Token | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contract || !account || !id) return;

    const loadToken = async () => {
      try {
        const tokenData = await contract.getToken(id);
        setToken(tokenData);

        const userBalance = await contract.getTokenBalance(id, account);
        setBalance(userBalance);

        if (tokenData.parentId > 0n) {
          const parent = await contract.getToken(tokenData.parentId);
          setParentToken(parent);
        }
      } catch (error) {
        console.error('Error loading token:', error);
      } finally {
        setLoading(false);
      }
    };

    loadToken();
  }, [contract, account, id]);

  if (!user || user.status !== UserStatus.Approved) {
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
              <p className="text-gray-600 mb-6">
                The token you are looking for does not exist
              </p>
              <Button onClick={() => navigate('/tokens')}>
                Back to Tokens
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const parseFeatures = (features: string) => {
    try {
      return JSON.parse(features);
    } catch {
      return {};
    }
  };

  const features = parseFeatures(token.features);
  const date = new Date(Number(token.dateCreated) * 1000);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate('/tokens')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tokens
        </button>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Package className="w-8 h-8 text-blue-600" />
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{token.name}</h1>
                    <p className="text-sm text-gray-500">Token ID: #{token.id.toString()}</p>
                  </div>
                </div>
                {balance > 0n && user.role !== 'Consumer' && (
                  <Link to={`/tokens/${id}/transfer`}>
                    <Button>
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Transfer
                    </Button>
                  </Link>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Your Balance</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {balance.toString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Supply</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {token.totalSupply.toString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Token Information</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Creator</p>
                    <p className="font-mono text-sm text-gray-900">{token.creator}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Created</p>
                    <p className="text-sm text-gray-900">{date.toLocaleString()}</p>
                  </div>
                </div>

                {parentToken && (
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600 mb-2">Derived From</p>
                    <Link to={`/tokens/${parentToken.id.toString()}`}>
                      <div className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <p className="font-medium text-gray-900">{parentToken.name}</p>
                        <p className="text-xs text-gray-500">Token #{parentToken.id.toString()}</p>
                      </div>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {Object.keys(features).length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900">Features & Attributes</h2>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {Object.entries(features).map(([key, value]) => (
                    <div key={key} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </p>
                      <p className="text-gray-900">{String(value)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
