import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BrowserProvider, Contract, Eip1193Provider } from 'ethers';
import toast from 'react-hot-toast';
import {
  ROLE_MANAGER_ADDRESS,
  ROLE_MANAGER_ABI,
  TOKEN_FACTORY_ADDRESS,
  TOKEN_FACTORY_ABI,
  TRANSFER_MANAGER_ADDRESS,
  TRANSFER_MANAGER_ABI,
  ADMIN_ADDRESS,
} from '../contracts/config';

// Mapeo de errores del contrato a mensajes en español
const ERROR_MESSAGES: Record<string, string> = {
  AlreadyHasRole:
    'Ya tienes un rol aprobado. No puedes solicitar otro rol mientras tengas uno activo.',
  RoleAlreadyRequested: 'Ya tienes una solicitud pendiente. Espera a que sea aprobada o rechazada.',
  RoleNotRequested: 'No hay ninguna solicitud para cancelar.',
  NotApproved: 'No tienes un rol aprobado.',
  InvalidRoleRequest: 'Rol solicitado no válido.',
  NotAdmin: 'Solo el administrador puede hacer esta acción.',
};

// Helper para decodificar errores del contrato
function decodeContractError(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'Error desconocido';
  }

  const errorObj = error as any;
  const message = errorObj.message || '';

  // Detectar primero si el usuario canceló (ACTION_REJECTED = 4001)
  // Esto tiene prioridad sobre rate limiting para mostrar el mensaje correcto
  if (
    errorObj.code === 4001 ||
    errorObj.error?.code === 4001 ||
    message.includes('ACTION_REJECTED') ||
    message.includes('user rejected') ||
    message.includes('User denied')
  ) {
    return 'Transacción cancelada por el usuario';
  }

  // Si es un error de rate limiting del RPC
  if (
    errorObj.code === -32603 ||
    errorObj.code === -32005 ||
    message.includes('rate limited') ||
    message.includes('rate limit') ||
    (errorObj.error && errorObj.error.message && errorObj.error.message.includes('rate limit'))
  ) {
    return 'Demasiadas solicitudes al nodo RPC. Por favor espera 60 segundos antes de intentar de nuevo.';
  }

  // Intentar buscar el nombre del error en el mensaje
  for (const [errorName, translatedMessage] of Object.entries(ERROR_MESSAGES)) {
    if (message.includes(errorName)) {
      return translatedMessage;
    }
  }

  // Si es un error de "missing revert data", probablemente es un error de validación del contrato
  // Este error ocurre cuando estimateGas falla porque el contrato revierte con un custom error
  // que no se puede decodificar (generalmente porque el usuario ya tiene un rol o solicitud pendiente)
  if (message.includes('missing revert data')) {
    return 'La transacción fue rechazada por el contrato. Verifica que no tengas un rol aprobado o una solicitud pendiente.';
  }

  // Si es un error de estimación de gas (CALL_EXCEPTION), puede ser varias cosas
  // Solo mostrar el mensaje genérico si realmente parece ser un error de validación del contrato
  if (errorObj.action === 'estimateGas' || errorObj.code === 'CALL_EXCEPTION') {
    // Si el error tiene "missing revert data", ya lo manejamos arriba
    // Para otros CALL_EXCEPTION, mostrar un mensaje más genérico
    if (!message.includes('missing revert data')) {
      return 'Error al procesar la transacción. Por favor verifica tu conexión y vuelve a intentar.';
    }
  }

  // Mensaje genérico - mostrar el mensaje original si está disponible
  if (message) {
    // Si el mensaje es muy técnico, simplificarlo
    if (message.length > 200 || message.includes('0x')) {
      return 'Error en la transacción. Por favor intenta de nuevo o verifica la consola para más detalles.';
    }
    return message;
  }

  return 'Error en la transacción. Por favor intenta de nuevo.';
}

// Internal UI user shape adapted to on-chain struct
interface ChainUser {
  role: number; // enum Role: 0 None, 1 Producer, 2 Factory, 3 Retailer, 4 Consumer
  approved: boolean;
  requestedRole: number; // pending requested role (enum value) or 0
}

interface UiUser {
  role: number; // current approved role (0 means none)
  approved: boolean;
  requestedRole: number; // 0 if none requested
}

interface Web3ContextType {
  account: string | null;
  isConnected: boolean;
  isAdmin: boolean;
  user: UiUser | null;
  provider: BrowserProvider | null;
  roleManager: Contract | null;
  tokenFactory: Contract | null;
  transferManager: Contract | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  refreshUser: () => Promise<void>;
  retryConnection: () => Promise<void>;
  requestRole: (desiredRole: number) => Promise<void>;
  cancelRequest: () => Promise<void>;
  approveRole: (userAccount: string) => Promise<void>;
  rejectRole: (userAccount: string) => Promise<void>;
  revokeRole: (userAccount: string) => Promise<void>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export function Web3Provider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<UiUser | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [roleManager, setRoleManager] = useState<Contract | null>(null);
  const [tokenFactory, setTokenFactory] = useState<Contract | null>(null);
  const [transferManager, setTransferManager] = useState<Contract | null>(null);
  const [manualDisconnect, setManualDisconnect] = useState(false);

  // Validar configuración de red al montar el componente
  useEffect(() => {
    const network = import.meta.env.VITE_NETWORK?.toLowerCase();
    console.log('🔍 VITE_NETWORK check:', { network, env: import.meta.env.VITE_NETWORK });

    if (!network || (network !== 'anvil' && network !== 'sepolia')) {
      console.error('❌ VITE_NETWORK no configurado o inválido');
      toast.error(
        '⚠️ VITE_NETWORK no está configurado en .env. Debe ser "anvil" o "sepolia". ' +
          'Configura VITE_NETWORK en web/.env y reinicia el servidor.',
        {
          duration: 10000,
          id: 'network-config-error', // Evita duplicados
        }
      );
    } else {
      console.log('✅ VITE_NETWORK configurado correctamente:', network);
    }
  }, []);

  const setupProvider = async (ethereum: Eip1193Provider) => {
    let browserProvider: BrowserProvider;
    let network;
    let signer;

    try {
      browserProvider = new BrowserProvider(ethereum);

      // Agregar timeout más largo para detectar problemas de conexión de MetaMask
      network = await Promise.race([
        browserProvider.getNetwork(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  'Timeout: MetaMask no puede conectarse a Sepolia. Intenta cambiar el RPC endpoint en MetaMask.'
                )
              ),
            15000 // 15 segundos de timeout
          )
        ),
      ]);

      signer = await browserProvider.getSigner();
    } catch (error) {
      console.error('Error setting up provider:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Detectar errores específicos de conexión de MetaMask
      if (
        errorMessage.includes('Unable to connect') ||
        errorMessage.includes('Check network connectivity') ||
        errorMessage.includes('Still connecting') ||
        errorMessage.includes('Timeout: MetaMask no puede conectarse')
      ) {
        toast.error(
          'MetaMask no puede conectarse a Sepolia. Intenta: 1) Cambiar el RPC endpoint en MetaMask (Settings > Networks > Sepolia > RPC URL), 2) Usar un RPC alternativo como Alchemy o Infura, 3) Esperar unos minutos y reintentar.',
          {
            duration: 12000,
            id: 'metamask-connection-error',
          }
        );
      } else if (errorMessage.includes('network') || errorMessage.includes('connect')) {
        toast.error(
          'Error de conexión con la red. Verifica tu conexión a internet y que MetaMask esté conectado a Sepolia.',
          {
            duration: 8000,
            id: 'network-connection-error',
          }
        );
      }
      throw error;
    }

    // Validar que la red de MetaMask coincida con la configuración
    const configuredNetwork = import.meta.env.VITE_NETWORK?.toLowerCase().trim();
    const expectedChainId = configuredNetwork === 'sepolia' ? 11155111n : 31337n;
    const networkName = configuredNetwork === 'sepolia' ? 'Sepolia' : 'Anvil (Local)';

    console.log('🔍 Network validation:', {
      configuredNetwork,
      expectedChainId: expectedChainId.toString(),
      actualChainId: network.chainId.toString(),
      match: network.chainId === expectedChainId,
    });

    if (network.chainId !== expectedChainId) {
      const currentNetworkName =
        network.chainId === 11155111n
          ? 'Sepolia'
          : network.chainId === 31337n
            ? 'Anvil'
            : `Chain ID ${network.chainId}`;
      const currentChainId = network.chainId.toString();
      const expectedChainIdStr = expectedChainId.toString();

      toast.error(
        `⚠️ Red incorrecta: Estás en ${currentNetworkName} (Chain ID: ${currentChainId}) pero la app está configurada para ${networkName} (Chain ID: ${expectedChainIdStr}). ` +
          `Por favor cambia la red en MetaMask a ${networkName} o ajusta VITE_NETWORK en web/.env`,
        {
          duration: 8000,
          id: 'network-mismatch-error', // ID único para evitar duplicados
        }
      );
    } else {
      console.log('✅ Red correcta:', networkName);
      // Limpiar el toast de error si existe y ahora la red es correcta
      toast.dismiss('network-mismatch-error');
    }

    const roleManagerContract = new Contract(ROLE_MANAGER_ADDRESS, ROLE_MANAGER_ABI, signer);
    const tokenFactoryContract = new Contract(TOKEN_FACTORY_ADDRESS, TOKEN_FACTORY_ABI, signer);
    const transferManagerContract = new Contract(
      TRANSFER_MANAGER_ADDRESS,
      TRANSFER_MANAGER_ABI,
      signer
    );

    setProvider(browserProvider);
    setRoleManager(roleManagerContract);
    setTokenFactory(tokenFactoryContract);
    setTransferManager(transferManagerContract);

    return { browserProvider, roleManagerContract, tokenFactoryContract, transferManagerContract };
  };

  const loadUserInfo = async (address: string, roleManagerContract: Contract) => {
    try {
      // Verificar si es admin primero con retry logic para manejar errores temporales de red
      let adminAddress: string;
      let retries = 3;
      let lastError: unknown = null;

      while (retries > 0) {
        try {
          // Timeout de 10 segundos para evitar esperar indefinidamente
          adminAddress = await Promise.race([
            roleManagerContract.admin(),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Timeout: La solicitud tardó demasiado')), 10000)
            ),
          ]);
          lastError = null;
          break; // Éxito, salir del loop
        } catch (adminError) {
          lastError = adminError;
          retries--;
          const errorMessage =
            adminError instanceof Error ? adminError.message : String(adminError);

          // Si es un error de rate limiting o timeout, esperar antes de reintentar
          if (
            errorMessage.includes('rate limit') ||
            errorMessage.includes('timeout') ||
            errorMessage.includes('Timeout')
          ) {
            if (retries > 0) {
              console.warn(
                `Error temporal de red, reintentando... (${retries} intentos restantes)`
              );
              await new Promise((resolve) => setTimeout(resolve, 2000)); // Esperar 2 segundos
              continue;
            }
          }

          // Si no es un error temporal o se agotaron los reintentos, lanzar el error
          if (retries === 0) {
            throw adminError;
          }
        }
      }

      // Si después de todos los reintentos aún falla, verificar el tipo de error
      if (lastError) {
        const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);

        // Distinguir entre error de red temporal y contrato no desplegado
        if (
          errorMessage.includes('rate limit') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('network') ||
          errorMessage.includes('connect')
        ) {
          console.error('Error de conexión con la red:', lastError);
          toast.error(
            'Error temporal de conexión con Sepolia. MetaMask puede estar teniendo problemas para conectarse. Intenta: 1) Cambiar el RPC endpoint en MetaMask, 2) Esperar unos minutos y refrescar la página, 3) Usar el botón "Reintentar conexión" en el Dashboard.',
            {
              duration: 10000,
              id: 'network-connection-error',
            }
          );
          // No desconectar completamente, mantener el estado pero sin datos
          setUser(null);
          setIsAdmin(false);
          return;
        } else {
          // Error real de contrato no desplegado
          console.error('Contract not deployed or incorrect address:', lastError);
          toast.error(
            'Error: El contrato no está desplegado en esta red. Verifica la configuración.',
            {
              duration: 8000,
              id: 'contract-not-deployed-error',
            }
          );
          setUser(null);
          setIsAdmin(false);
          return;
        }
      }

      const addrLower = address.toLowerCase();
      const chainAdminLower = adminAddress?.toLowerCase?.() ?? '';
      const envAdminLower = ADMIN_ADDRESS?.toLowerCase?.() ?? '';
      const adminCheck =
        addrLower === chainAdminLower || (!!envAdminLower && addrLower === envAdminLower);
      setIsAdmin(adminCheck);

      // Intentar obtener información del usuario con retry logic
      let userRetries = 2; // Menos reintentos para getUser ya que admin() ya pasó
      let userData: ChainUser | null = null;

      while (userRetries > 0) {
        try {
          const rawStruct = (await Promise.race([
            roleManagerContract.getUser(address),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000)),
          ])) as unknown as {
            role: bigint;
            approved: boolean;
            requestedRole: bigint;
          };

          userData = {
            role: Number(rawStruct.role),
            approved: rawStruct.approved,
            requestedRole: Number(rawStruct.requestedRole),
          };
          break; // Éxito
        } catch (userError) {
          userRetries--;
          const errorMessage = userError instanceof Error ? userError.message : String(userError);

          // Si es un error temporal, reintentar
          if (
            (errorMessage.includes('rate limit') ||
              errorMessage.includes('timeout') ||
              errorMessage.includes('Timeout') ||
              errorMessage.includes('network')) &&
            userRetries > 0
          ) {
            console.warn(`Error temporal obteniendo datos del usuario, reintentando...`);
            await new Promise((resolve) => setTimeout(resolve, 1500));
            continue;
          }

          // Si es un error de usuario no registrado, es normal
          if (
            errorMessage.includes('revert') ||
            errorMessage.includes('execution reverted') ||
            userRetries === 0
          ) {
            console.log('User not registered yet or error getting user data, setting to null');
            userData = null;
            break;
          }
        }
      }

      // Establecer datos del usuario
      if (
        !userData ||
        (!userData.approved && userData.requestedRole === 0 && userData.role === 0)
      ) {
        setUser(null);
      } else {
        const uiUser = {
          role: userData.role,
          approved: userData.approved,
          requestedRole: userData.requestedRole,
        };
        setUser(uiUser);
      }
    } catch (error) {
      console.error('Error loading user info:', error);
      setUser(null);
      setIsAdmin(false);
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      toast.error('Por favor instala MetaMask para usar esta aplicación');
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      const address = accounts[0];
      setAccount(address);
      setIsConnected(true);
      setManualDisconnect(false); // Reset flag al conectar

      // Guardar en localStorage para persistencia
      if (typeof window !== 'undefined') {
        localStorage.setItem('connectedAccount', address);
      }

      const { roleManagerContract } = await setupProvider(window.ethereum);
      await loadUserInfo(address, roleManagerContract);
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  const disconnectWallet = () => {
    // Marcar como desconexión manual para evitar reconexión automática
    setManualDisconnect(true);

    // Limpiar todo el estado
    setAccount(null);
    setIsConnected(false);
    setIsAdmin(false);
    setUser(null);
    setProvider(null);
    setRoleManager(null);
    setTokenFactory(null);
    setTransferManager(null);
    localStorage.removeItem('connectedAccount');
  };

  const refreshUser = async () => {
    if (!account || !roleManager) return;
    await loadUserInfo(account, roleManager);
  };

  // Función para reintentar la conexión cuando hay errores de red
  const retryConnection = async () => {
    if (!account || !window.ethereum) {
      toast.error('No hay cuenta conectada o MetaMask no está disponible');
      return;
    }

    const toastId = toast.loading('Reintentando conexión...');
    try {
      const { roleManagerContract } = await setupProvider(window.ethereum);
      await loadUserInfo(account, roleManagerContract);
      toast.success('Conexión restablecida correctamente', { id: toastId });
    } catch (error) {
      console.error('Error retrying connection:', error);
      const errorMessage = decodeContractError(error);
      toast.error(`Error al reintentar: ${errorMessage}`, { id: toastId });
    }
  };

  const requestRole = async (desiredRole: number) => {
    if (!roleManager || !account) return;

    // Validar estado del usuario antes de intentar la transacción
    try {
      const userInfo = await roleManager.getUser(account);
      const userRole = Number(userInfo.role);
      const userApproved = userInfo.approved;
      const userRequestedRole = Number(userInfo.requestedRole);

      // Si ya tiene un rol aprobado
      if (userApproved && userRole !== 0) {
        toast.error(
          'Ya tienes un rol aprobado. No puedes solicitar otro rol mientras tengas uno activo.'
        );
        return;
      }

      // Si ya tiene una solicitud pendiente
      if (userRequestedRole !== 0) {
        toast.error(
          'Ya tienes una solicitud pendiente. Espera a que sea aprobada o rechazada, o cancélala primero.'
        );
        return;
      }
    } catch (validationError) {
      console.error('Error validando estado del usuario:', validationError);
      // Continuar con la transacción si la validación falla (puede ser un error de conexión)
    }

    const toastId = toast.loading('Enviando transacción...');
    try {
      const tx = await roleManager.requestRole(desiredRole);
      toast.loading('Esperando confirmación...', { id: toastId });
      await tx.wait();
      await refreshUser();
      toast.success('Solicitud de rol enviada correctamente', { id: toastId });
    } catch (e) {
      console.error('requestRole failed', e);
      const errorMessage = decodeContractError(e);
      toast.error(errorMessage, { id: toastId });
      throw e;
    }
  };

  const cancelRequest = async () => {
    if (!roleManager || !account) return;
    const toastId = toast.loading('Enviando transacción...');
    try {
      const tx = await roleManager.cancelRequest();
      toast.loading('Esperando confirmación...', { id: toastId });
      await tx.wait();
      await refreshUser();
      toast.success('Solicitud cancelada correctamente', { id: toastId });
    } catch (e) {
      console.error('cancelRequest failed', e);
      const errorMessage = decodeContractError(e);
      toast.error(errorMessage, { id: toastId });
      throw e;
    }
  };

  const approveRole = async (userAccount: string) => {
    if (!roleManager || !account) return;
    const toastId = toast.loading('Enviando transacción...');
    try {
      const tx = await roleManager.approveRole(userAccount);
      toast.loading('Esperando confirmación...', { id: toastId });
      await tx.wait();
      await refreshUser();
      toast.success('Rol aprobado correctamente', { id: toastId });
    } catch (e) {
      console.error('approveRole failed', e);
      const errorMessage = decodeContractError(e);
      toast.error(errorMessage, { id: toastId });
      throw e;
    }
  };

  const rejectRole = async (userAccount: string) => {
    if (!roleManager || !account) return;
    const toastId = toast.loading('Enviando transacción...');
    try {
      const tx = await roleManager.rejectRole(userAccount);
      toast.loading('Esperando confirmación...', { id: toastId });
      await tx.wait();
      await refreshUser();
      toast.success('Solicitud rechazada', { id: toastId });
    } catch (e) {
      console.error('rejectRole failed', e);
      const errorMessage = decodeContractError(e);
      toast.error(errorMessage, { id: toastId });
      throw e;
    }
  };

  const revokeRole = async (userAccount: string) => {
    if (!roleManager || !account) return;
    const toastId = toast.loading('Enviando transacción...');
    try {
      const tx = await roleManager.revokeRole(userAccount);
      toast.loading('Esperando confirmación...', { id: toastId });
      await tx.wait();
      await refreshUser();
      toast.success('Rol revocado correctamente', { id: toastId });
    } catch (e) {
      console.error('revokeRole failed', e);
      const errorMessage = decodeContractError(e);
      toast.error(errorMessage, { id: toastId });
      throw e;
    }
  };

  // Restaurar sesión desde localStorage al cargar la página
  useEffect(() => {
    const restoreSession = async () => {
      if (!window.ethereum) return;

      try {
        const savedAccount = localStorage.getItem('connectedAccount');
        if (!savedAccount) return;

        // Verificar que la cuenta sigue disponible en MetaMask
        const accounts = (await window.ethereum.request({
          method: 'eth_accounts',
        })) as string[];

        if (accounts.length === 0) {
          // No hay cuentas conectadas, limpiar localStorage
          localStorage.removeItem('connectedAccount');
          return;
        }

        const currentAccount = accounts[0];
        const savedLower = savedAccount.toLowerCase();
        const currentLower = currentAccount.toLowerCase();

        // Solo restaurar si la cuenta guardada coincide con la actual en MetaMask
        if (savedLower === currentLower) {
          setAccount(currentAccount);
          setIsConnected(true);
          const { roleManagerContract } = await setupProvider(window.ethereum);
          await loadUserInfo(currentAccount, roleManagerContract);
        } else {
          // La cuenta cambió, limpiar localStorage
          localStorage.removeItem('connectedAccount');
        }
      } catch (error) {
        console.error('Error restoring session:', error);
        // Si hay error, limpiar localStorage
        localStorage.removeItem('connectedAccount');
      }
    };

    restoreSession();
  }, []); // Solo ejecutar una vez al montar

  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        // Solo procesar si no es una desconexión manual
        if (manualDisconnect) return;

        if (accounts.length === 0) {
          disconnectWallet();
        } else if (account && accounts[0] !== account) {
          const newAccount = accounts[0];
          setAccount(newAccount);
          // Actualizar localStorage con la nueva cuenta
          if (typeof window !== 'undefined') {
            localStorage.setItem('connectedAccount', newAccount);
          }
          if (window.ethereum) {
            setupProvider(window.ethereum as Eip1193Provider).then(({ roleManagerContract }) => {
              loadUserInfo(newAccount, roleManagerContract);
            });
          }
        }
      };

      const handleChainChanged = (chainId: string | number) => {
        console.log('🔄 Chain changed detected:', chainId);
        const configuredNetwork = import.meta.env.VITE_NETWORK?.toLowerCase().trim();
        const expectedChainId = configuredNetwork === 'sepolia' ? '0xaa36a7' : '0x7a69'; // Sepolia: 11155111, Anvil: 31337

        // Convertir chainId a número para comparar
        const currentChainId = typeof chainId === 'string' ? parseInt(chainId, 16) : chainId;
        const expectedChainIdNum = configuredNetwork === 'sepolia' ? 11155111 : 31337;

        console.log('🔍 Chain change validation:', {
          currentChainId,
          expectedChainIdNum,
          configuredNetwork,
          match: currentChainId === expectedChainIdNum,
        });

        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum?.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [account, manualDisconnect]);

  // Event listeners para actualizar datos en tiempo real
  useEffect(() => {
    if (!roleManager || !account) return;

    const handleRoleRequested = () => {
      refreshUser();
    };

    const handleRoleApproved = (userAddress: string) => {
      if (userAddress.toLowerCase() === account.toLowerCase()) {
        refreshUser();
      }
    };

    const handleRoleRejected = (userAddress: string) => {
      if (userAddress.toLowerCase() === account.toLowerCase()) {
        refreshUser();
      }
    };

    const handleRoleRevoked = (userAddress: string) => {
      if (userAddress.toLowerCase() === account.toLowerCase()) {
        refreshUser();
      }
    };

    roleManager.on('RoleRequested', handleRoleRequested);
    roleManager.on('RoleApproved', handleRoleApproved);
    roleManager.on('RoleRejected', handleRoleRejected);
    roleManager.on('RoleRevoked', handleRoleRevoked);

    return () => {
      roleManager.off('RoleRequested', handleRoleRequested);
      roleManager.off('RoleApproved', handleRoleApproved);
      roleManager.off('RoleRejected', handleRoleRejected);
      roleManager.off('RoleRevoked', handleRoleRevoked);
    };
  }, [roleManager, account]);

  useEffect(() => {
    let interval: number | undefined;
    // Solo hacer polling si NO es una desconexión manual
    // Reducir frecuencia en Sepolia para evitar problemas de rate limiting
    if (window.ethereum && account && isConnected && !manualDisconnect) {
      const eth = window.ethereum as Eip1193Provider;
      const configuredNetwork = import.meta.env.VITE_NETWORK?.toLowerCase().trim();
      // Polling mucho más lento en Sepolia (cada 30 segundos) vs Anvil (cada 10 segundos)
      // Esto reduce significativamente las solicitudes al RPC
      const pollInterval = configuredNetwork === 'sepolia' ? 30000 : 10000;

      const check = async () => {
        try {
          const list = (await eth.request({ method: 'eth_accounts' })) as string[];
          const current = list && list.length > 0 ? list[0] : null;
          const currentLower = current?.toLowerCase() ?? '';
          const accountLower = (account ?? '').toLowerCase();

          if (current && currentLower !== accountLower) {
            setAccount(current);
            const { roleManagerContract } = await setupProvider(eth);
            await loadUserInfo(current, roleManagerContract);
          }
          if (!current && account && !manualDisconnect) {
            // Solo desconectar si no fue manual
            disconnectWallet();
          }
        } catch (error) {
          // Log pero no desconectar por errores de red temporales
          // No hacer nada para evitar más solicitudes al RPC
          console.warn('Polling check error (ignored):', error);
        }
      };
      interval = window.setInterval(check, pollInterval);
    }
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [account, isConnected, manualDisconnect]);

  return (
    <Web3Context.Provider
      value={{
        account,
        isConnected,
        isAdmin,
        user,
        provider,
        roleManager,
        tokenFactory,
        transferManager,
        connectWallet,
        disconnectWallet,
        refreshUser,
        retryConnection,
        requestRole,
        cancelRequest,
        approveRole,
        rejectRole,
        revokeRole,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider & {
      on(event: 'accountsChanged', handler: (accounts: string[]) => void): void;
      on(event: 'chainChanged', handler: (chainId: string | number) => void): void;
      removeListener(event: 'accountsChanged', handler: (accounts: string[]) => void): void;
      removeListener(event: 'chainChanged', handler: (chainId: string | number) => void): void;
    };
  }
}
