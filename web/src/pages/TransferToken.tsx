import { useState, useEffect } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Package, AlertCircle, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWeb3 } from '../contexts/Web3Context';
import { Card, CardContent } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import type { TokenData } from '../types';

type RecipientUser = {
  address: string;
  role: number;
};

export function TransferToken() {
  const { id } = useParams<{ id: string }>();
  const { account, user, roleManager, tokenFactory, transferManager, getReasonableFromBlock } =
    useWeb3();
  const navigate = useNavigate();
  const [token, setToken] = useState<TokenData | null>(null);
  const [balance, setBalance] = useState<bigint>(0n);
  const [recipients, setRecipients] = useState<RecipientUser[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [loadingRecipients, setLoadingRecipients] = useState(true);
  const [hasPendingTransfer, setHasPendingTransfer] = useState(false);

  useEffect(() => {
    if (!tokenFactory || !transferManager || !account || !id) return;

    const loadToken = async () => {
      try {
        const tokenData = await tokenFactory.getToken(id);
        setToken(tokenData);

        const userBalance = await tokenFactory.balanceOf(id, account);
        setBalance(userBalance);

        // Check if there's a pending transfer
        const pendingTransferId = await transferManager.getPendingTransfer(id);
        setHasPendingTransfer(pendingTransferId !== 0n);
      } catch (error) {
        console.error('Error loading token:', error);
      }
    };

    loadToken();
  }, [tokenFactory, transferManager, account, id]);

  // Get target role in the supply chain
  const getTargetRole = (currentRole: number): number => {
    // Producer(1) -> Factory(2) -> Retailer(3) -> Consumer(4)
    return currentRole + 1;
  };

  // Load available recipients based on user role
  useEffect(() => {
    if (!roleManager || !user) return;

    const loadRecipients = async () => {
      try {
        setLoadingRecipients(true);

        const targetRole = getTargetRole(user.role);

        // Consumer (4) cannot transfer
        if (user.role >= 4 || targetRole > 4) {
          setRecipients([]);
          setLoadingRecipients(false);
          return;
        }

        // Query RoleApproved events to find approved users with target role
        const fromBlock = await getReasonableFromBlock();
        const filter = roleManager.filters.RoleApproved();
        const events = await roleManager.queryFilter(filter, fromBlock);

        const approvedUsers: RecipientUser[] = [];
        const seenAddresses = new Set<string>();

        for (const event of events) {
          // Type guard to check if event has args
          if ('args' in event) {
            const userAddress = (event.args[0] as string).toLowerCase();
            const eventRole = event.args[1];

            // Skip if already processed or same as current user
            if (seenAddresses.has(userAddress) || userAddress === account?.toLowerCase()) {
              continue;
            }

            // Check if this user still has the target role and is approved
            if (Number(eventRole) === targetRole) {
              try {
                const userData = await roleManager.getUser(userAddress);
                if (userData.approved && Number(userData.role) === targetRole) {
                  approvedUsers.push({
                    address: userAddress,
                    role: targetRole,
                  });
                  seenAddresses.add(userAddress);
                }
              } catch (error) {
                console.error(`Error checking user ${userAddress}:`, error);
              }
            }
          }
        }

        setRecipients(approvedUsers);
      } catch (error) {
        console.error('Error loading recipients:', error);
      } finally {
        setLoadingRecipients(false);
      }
    };

    loadRecipients();
  }, [roleManager, user, account]);

  if (!user || !user.approved) {
    return <Navigate to="/" />;
  }

  if (user.role === 4) {
    return <Navigate to="/tokens" />;
  }

  const getRoleName = (role: number): string => {
    const roles = ['Ninguno', 'Productor', 'Fábrica', 'Minorista', 'Consumidor', 'Admin'];
    return roles[role] || 'Desconocido';
  };

  const getTargetRoleName = (): string => {
    const targetRole = getTargetRole(user.role);
    const pluralNames = ['', 'Productores', 'Fábricas', 'Minoristas', 'Consumidores'];
    return pluralNames[targetRole] || 'Desconocido';
  };

  const getTransferDescription = (): string => {
    const descriptions: Record<number, string> = {
      1: 'Enviar materias primas a fábricas para procesamiento',
      2: 'Enviar productos procesados a minoristas para distribución',
      3: 'Enviar productos a consumidores para uso final',
    };
    return descriptions[user.role] || '';
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!transferManager || !selectedRecipient || !amount || !id) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    const amountBigInt = BigInt(amount);
    if (amountBigInt <= 0n || amountBigInt > balance) {
      toast.error('Cantidad inválida');
      return;
    }

    // Check if there's a pending transfer for this token
    try {
      const pendingTransferId = await transferManager.getPendingTransfer(id);
      if (pendingTransferId !== 0n) {
        toast.error(
          'Este producto ya tiene una transferencia pendiente. Por favor espera a que sea aceptada o rechazada antes de crear una nueva.'
        );
        return;
      }
    } catch (error) {
      console.error('Error checking pending transfer:', error);
    }

    setIsTransferring(true);
    const toastId = toast.loading('Enviando solicitud de transferencia...');
    try {
      const tx = await transferManager.requestTransfer(id, selectedRecipient, amountBigInt);
      toast.loading('Esperando confirmación...', { id: toastId });
      await tx.wait();

      toast.success('¡Solicitud de transferencia enviada exitosamente!', { id: toastId });
      navigate('/transfers');
    } catch (error: unknown) {
      console.error('Error requesting transfer:', error);

      let errorMessage = 'Error desconocido';
      if (error && typeof error === 'object') {
        const errorObj = error as {
          message?: string;
          code?: number;
          error?: { message?: string; code?: number };
        };
        const message = errorObj.message || '';

        // Detectar primero si el usuario canceló (ACTION_REJECTED = 4001)
        // Esto tiene prioridad sobre rate limiting para mostrar el mensaje correcto
        if (
          errorObj.code === 4001 ||
          errorObj.error?.code === 4001 ||
          message.includes('user rejected') ||
          message.includes('User denied') ||
          message.includes('ACTION_REJECTED')
        ) {
          errorMessage = 'Transacción cancelada por el usuario';
        } else if (
          // Detectar rate limiting
          errorObj.code === -32603 ||
          errorObj.code === -32005 ||
          message.includes('rate limited') ||
          message.includes('rate limit') ||
          (errorObj.error &&
            errorObj.error.message &&
            errorObj.error.message.includes('rate limit'))
        ) {
          errorMessage =
            'Demasiadas solicitudes al nodo RPC. Por favor espera 60 segundos antes de intentar de nuevo.';
        } else if (message.includes('NotTokenCreator')) {
          errorMessage =
            'Solo puedes transferir tokens que creaste. Para procesar materiales recibidos, crea un nuevo token procesado.';
        } else if (message.includes('TransferAlreadyPending')) {
          errorMessage =
            'Este token ya tiene una transferencia pendiente. Por favor espera a que sea resuelta.';
        } else if (message.includes('InvalidRoleTransition')) {
          errorMessage =
            'Transferencia inválida: Verifica el rol del destinatario o el tipo de token.';
        } else if (message.includes('NotApproved')) {
          errorMessage = 'Tú o el destinatario no están aprobados en el sistema.';
        } else if (message.includes('Unauthorized')) {
          errorMessage = 'No tienes suficiente balance o permiso para hacer esta transferencia.';
        } else if (message) {
          // Si el mensaje es muy técnico, simplificarlo
          if (message.length > 200 || message.includes('0x')) {
            errorMessage =
              'Error en la transferencia. Por favor intenta de nuevo o verifica la consola para más detalles.';
          } else {
            errorMessage = message;
          }
        }
      }

      toast.error(`Error: ${errorMessage}`, { id: toastId });
    } finally {
      setIsTransferring(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-gray-600">Cargando token...</p>
        </div>
      </div>
    );
  }

  const targetRoleName = getTargetRoleName();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <button
          onClick={() => navigate('/tokens')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Tokens
        </button>

        <div className="space-y-4">
          {/* Token Info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-gray-900 truncate">{token.productName}</h2>
                  <p className="text-xs text-gray-600">
                    Token #{token.id.toString()} • Balance: {balance.toString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transfer Rules - Compact */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-base font-bold text-gray-900 mb-1">
                    Reglas de Transferencia
                  </h3>
                  <p className="text-sm text-gray-700">
                    <User className="w-3 h-3 inline mr-1" />
                    <strong>Tu Rol:</strong> {getRoleName(user.role)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Puedes transferir a:{' '}
                    <strong>
                      {targetRoleName} ({recipients.length} disponibles)
                    </strong>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{getTransferDescription()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending Transfer Warning */}
          {hasPendingTransfer && (
            <Card>
              <CardContent className="p-4 bg-yellow-50 border-l-4 border-yellow-400">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-yellow-900">Transferencia Pendiente</h3>
                    <p className="text-xs text-yellow-800 mt-1">
                      Este token ya tiene una transferencia pendiente. Debes esperar a que sea
                      aceptada o rechazada antes de crear una nueva solicitud de transferencia.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Transfer Form - Compact */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Send className="w-5 h-5 text-green-600" />
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Enviar Solicitud de Transferencia
                  </h3>
                  <p className="text-xs text-gray-600">
                    El destinatario necesitará aceptar la transferencia
                  </p>
                </div>
              </div>

              <form onSubmit={handleTransfer} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Destinatario ({getRoleName(getTargetRole(user.role))}) *
                  </label>
                  <select
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={selectedRecipient}
                    onChange={(e) => setSelectedRecipient(e.target.value)}
                    required
                    disabled={loadingRecipients}
                  >
                    <option value="">
                      {loadingRecipients
                        ? 'Cargando destinatarios...'
                        : 'Selecciona un destinatario...'}
                    </option>
                    {recipients.map((recipient) => (
                      <option key={recipient.address} value={recipient.address}>
                        {recipient.address.slice(0, 6)}...{recipient.address.slice(-4)} (
                        {getRoleName(recipient.role)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Cantidad *</label>
                  <Input
                    type="number"
                    placeholder="Ingresa la cantidad a transferir"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="1"
                    max={balance.toString()}
                    required
                    className="text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">Máximo: {balance.toString()} tokens</p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-yellow-800">
                      <p className="font-medium">Importante</p>
                      <p className="mt-1">
                        Esto creará una solicitud de transferencia. El destinatario debe aceptar la
                        transferencia antes de que los tokens sean realmente movidos.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => navigate('/tokens')}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      isTransferring ||
                      balance === 0n ||
                      !selectedRecipient ||
                      recipients.length === 0 ||
                      hasPendingTransfer
                    }
                    className="flex-1"
                  >
                    <Send className="w-4 h-4" />
                    {isTransferring
                      ? 'Enviando...'
                      : hasPendingTransfer
                        ? 'Transferencia Pendiente'
                        : 'Enviar Solicitud'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
