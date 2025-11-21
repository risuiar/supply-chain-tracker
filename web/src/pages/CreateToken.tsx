import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Package, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWeb3 } from '../contexts/Web3Context';
import { Card, CardContent, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Textarea } from '../components/Textarea';

type TokenData = {
  id: bigint;
  productName: string;
  assetType: number;
  balance: bigint;
};

type SelectedMaterial = {
  id: string;
  amount: number;
};

export function CreateToken() {
  const { user, tokenFactory, account } = useWeb3();
  const navigate = useNavigate();
  const [productName, setProductName] = useState('');
  const [totalSupply, setTotalSupply] = useState('');
  const [metadataURI, setMetadataURI] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [availableRawMaterials, setAvailableRawMaterials] = useState<TokenData[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<SelectedMaterial[]>([]);

  // Cargar materias primas disponibles para la Fábrica
  useEffect(() => {
    const loadRawMaterials = async () => {
      if (!tokenFactory || !account || !user || user.role !== 2) return;

      try {
        const materials: TokenData[] = [];

        // Necesitamos verificar todos los tokens existentes para encontrar cuáles tenemos balance
        // El contrato no tiene una forma de consultar por balance, así que verificaremos tokens de eventos
        // o iteraremos a través de un rango razonable. Por ahora, verificamos tokens 1-100
        // En producción, querrías consultar eventos TransferRequested/TokenTransferred

        for (let i = 1; i <= 100; i++) {
          try {
            const token = await tokenFactory.getToken(i);
            if (!token.exists) continue;

            const balance = await tokenFactory.balanceOf(i, account);

            // Solo mostrar tokens RawMaterial (assetType = 0) con balance > 0
            // Convertir ambos a números para comparación segura
            const balanceNum = typeof balance === 'bigint' ? balance : BigInt(balance);
            const assetTypeNum = Number(token.assetType);

            // IMPORTANTE: Solo RawMaterial (tipo 0) puede ser usado como tokens padre
            if (assetTypeNum === 0 && balanceNum > 0n) {
              materials.push({
                id: BigInt(i),
                productName: token.productName,
                assetType: assetTypeNum,
                balance: balanceNum,
              });
            }
          } catch {
            // El token no existe, continuar
            break; // Parar cuando encontremos tokens no existentes
          }
        }

        setAvailableRawMaterials(materials);
      } catch (error) {
        console.error('Error loading raw materials:', error);
      }
    };

    loadRawMaterials();
  }, [tokenFactory, account, user]);

  if (!user || !user.approved) {
    return <Navigate to="/" />;
  }

  // Solo Productor (1) y Fábrica (2) pueden crear tokens
  if (user.role !== 1 && user.role !== 2) {
    return <Navigate to="/tokens" />;
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tokenFactory || !productName.trim() || !totalSupply) {
      toast.error('Por favor ingresa el nombre del producto y la cantidad total');
      return;
    }

    const supply = parseInt(totalSupply);
    if (isNaN(supply) || supply <= 0) {
      toast.error('La cantidad total debe ser un número positivo');
      return;
    }

    // La Fábrica debe seleccionar al menos un token padre
    if (user.role === 2 && selectedMaterials.length === 0) {
      toast.error('Por favor selecciona al menos una materia prima para procesar');
      return;
    }

    // Validar cantidades para materiales seleccionados
    if (user.role === 2) {
      for (const material of selectedMaterials) {
        if (material.amount <= 0) {
          toast.error('Todas las cantidades deben ser mayores a 0');
          return;
        }
        const availableMaterial = availableRawMaterials.find(
          (m) => m.id.toString() === material.id
        );
        if (availableMaterial && material.amount > Number(availableMaterial.balance)) {
          toast.error(
            `No tienes suficiente balance de ${availableMaterial.productName}. Disponible: ${availableMaterial.balance}, Requerido: ${material.amount}`
          );
          return;
        }
      }
    }

    setIsCreating(true);
    const toastId = toast.loading('Enviando transacción...');

    try {
      let tx;

      if (user.role === 1) {
        // El Productor crea token de materia prima
        tx = await tokenFactory.createRawToken(productName, metadataURI || '', supply);
      } else {
        // La Fábrica crea token procesado de padres seleccionados con cantidades
        const parentIds = selectedMaterials.map((material) => BigInt(material.id));
        const amounts = selectedMaterials.map((material) => BigInt(material.amount));

        tx = await tokenFactory.createProcessedTokenWithAmounts(
          productName,
          metadataURI || '',
          supply,
          parentIds,
          amounts
        );
      }

      toast.loading('Esperando confirmación...', { id: toastId });
      await tx.wait();
      toast.success('¡Producto creado exitosamente!', { id: toastId });
      navigate('/tokens');
    } catch (error) {
      console.error('Error creating token:', error);

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
          // Detectar limitación de velocidad
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
        } else if (message.includes('NotApproved')) {
          errorMessage = 'No tienes un rol aprobado para crear tokens.';
        } else if (message.includes('AssetDoesNotExist')) {
          errorMessage = 'Una de las materias primas seleccionadas no existe.';
        } else if (message.includes('MissingParentAssets')) {
          errorMessage = 'Faltan materias primas requeridas para crear este producto procesado.';
        } else if (message.includes('InvalidRoleTransition')) {
          errorMessage =
            'Error de transición de rol. Verifica que estés usando solo materias primas (Raw Materials) y no productos procesados.';
        } else if (message.includes('InsufficientBalance')) {
          errorMessage = 'No tienes suficiente balance de una o más materias primas seleccionadas.';
        } else if (message.includes('InvalidAmountArray')) {
          errorMessage =
            'Las cantidades especificadas no son válidas. Verifica que todas sean mayores a 0.';
        } else if (message.includes('Unauthorized')) {
          errorMessage = 'No tienes permiso para crear tokens.';
        } else if (message) {
          // Si el mensaje es muy técnico, simplificarlo
          if (message.length > 200 || message.includes('0x')) {
            errorMessage =
              'Error al crear el producto. Por favor intenta de nuevo o verifica la consola para más detalles.';
          } else {
            errorMessage = message;
          }
        }
      }

      toast.error(`Error: ${errorMessage}`, { id: toastId });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-blue-100">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Crear Token</h1>
                <p className="text-sm text-gray-600">
                  Crear un nuevo token para tu rol como {user.role === 1 ? 'Productor' : 'Fábrica'}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-6">
              <Input
                label="Nombre del Token *"
                placeholder="Ingresa el nombre del token (ej: Granos de Café Premium)"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                required
              />

              <Input
                label="Cantidad Total *"
                type="number"
                placeholder="Ingresa la cantidad total (ej: 1000)"
                value={totalSupply}
                onChange={(e) => setTotalSupply(e.target.value)}
                min="1"
                required
              />

              <div>
                <Textarea
                  label="Características (JSON)"
                  placeholder={`Ingresa las características como JSON, ej:
{
  "origen": "Colombia",
  "calidad": "Premium",
  "certificacion": "Organico",
  "fecha_cosecha": "2024-03-15"
}`}
                  value={metadataURI}
                  onChange={(e) => setMetadataURI(e.target.value)}
                  rows={8}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Opcional: Agregar características del producto en formato JSON
                </p>
              </div>

              {user.role === 2 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Materias Primas a Procesar *
                  </label>
                  {availableRawMaterials.length === 0 ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                      No hay materias primas disponibles. Necesitas recibir materias primas de un
                      Productor primero.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-80 overflow-y-auto border border-gray-200 rounded-lg p-4">
                      {availableRawMaterials.map((material) => {
                        const selectedMaterial = selectedMaterials.find(
                          (sm) => sm.id === material.id.toString()
                        );
                        const isSelected = !!selectedMaterial;

                        return (
                          <div
                            key={material.id.toString()}
                            className={`p-4 border rounded-lg transition-colors ${
                              isSelected
                                ? 'border-blue-300 bg-blue-50'
                                : 'border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedMaterials([
                                      ...selectedMaterials,
                                      { id: material.id.toString(), amount: 1 },
                                    ]);
                                  } else {
                                    setSelectedMaterials(
                                      selectedMaterials.filter(
                                        (sm) => sm.id !== material.id.toString()
                                      )
                                    );
                                  }
                                }}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 mt-1"
                              />
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">
                                  {material.productName}
                                </div>
                                <div className="text-sm text-gray-500 mb-2">
                                  Token #{material.id.toString()} • Disponible:{' '}
                                  {material.balance.toString()} unidades
                                </div>
                                {isSelected && (
                                  <div className="flex items-center gap-2">
                                    <label className="text-sm font-medium text-gray-700">
                                      Cantidad a usar:
                                    </label>
                                    <input
                                      type="number"
                                      min="1"
                                      max={material.balance.toString()}
                                      value={selectedMaterial?.amount || 1}
                                      onChange={(e) => {
                                        const newAmount = parseInt(e.target.value) || 1;
                                        setSelectedMaterials(
                                          selectedMaterials.map((sm) =>
                                            sm.id === material.id.toString()
                                              ? { ...sm, amount: newAmount }
                                              : sm
                                          )
                                        );
                                      }}
                                      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <span className="text-sm text-gray-500">unidades</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-sm text-gray-500 mt-2">
                    Selecciona las materias primas y especifica cuántas unidades quieres consumir de
                    cada una para crear este producto procesado
                  </p>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-blue-900 mb-1">
                      Creando como {user.role === 1 ? 'Productor' : 'Fábrica'}
                    </h3>
                    <p className="text-sm text-blue-800">
                      {user.role === 1
                        ? 'Puedes crear tokens de materia prima y transferirlos a fábricas.'
                        : 'Puedes transformar materias primas en productos procesados y transferirlos a minoristas.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate('/dashboard')}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isCreating} className="flex-1">
                  <Package className="w-4 h-4 mr-2" />
                  {isCreating ? 'Creando...' : 'Crear Token'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
