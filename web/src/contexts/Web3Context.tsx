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

  // Si es un error de rechazo del usuario
  if (message.includes('user rejected') || message.includes('User denied')) {
    return 'Transacción cancelada por el usuario';
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

  // Si es un error de estimación de gas (CALL_EXCEPTION), probablemente es un error de validación
  if (errorObj.action === 'estimateGas' || errorObj.code === 'CALL_EXCEPTION') {
    return 'La transacción fue rechazada. Verifica que no tengas un rol aprobado o una solicitud pendiente.';
  }

  // Mensaje genérico
  return message || 'Error en la transacción. Por favor intenta de nuevo.';
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
    const browserProvider = new BrowserProvider(ethereum);
    const network = await browserProvider.getNetwork();
    const signer = await browserProvider.getSigner();

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
      // Verificar si es admin primero
      let adminAddress: string;
      try {
        adminAddress = await roleManagerContract.admin();
      } catch (adminError) {
        // Si falla admin(), el contrato no está desplegado o la dirección es incorrecta
        console.error('Contract not deployed or incorrect address:', adminError);
        toast.error(
          'Error: El contrato no está desplegado en esta red. Verifica la configuración.'
        );
        setUser(null);
        setIsAdmin(false);
        return;
      }

      const addrLower = address.toLowerCase();
      const chainAdminLower = adminAddress?.toLowerCase?.() ?? '';
      const envAdminLower = ADMIN_ADDRESS?.toLowerCase?.() ?? '';
      const adminCheck =
        addrLower === chainAdminLower || (!!envAdminLower && addrLower === envAdminLower);
      setIsAdmin(adminCheck);

      // Intentar obtener información del usuario
      try {
        const rawStruct = (await roleManagerContract.getUser(address)) as unknown as {
          role: bigint;
          approved: boolean;
          requestedRole: bigint;
        };

        const chainUser: ChainUser = {
          role: Number(rawStruct.role),
          approved: rawStruct.approved,
          requestedRole: Number(rawStruct.requestedRole),
        };

        // Si el usuario no tiene ningún dato relevante, establecer como null
        if (!chainUser.approved && chainUser.requestedRole === 0 && chainUser.role === 0) {
          setUser(null);
        } else {
          const uiUser = {
            role: chainUser.role,
            approved: chainUser.approved,
            requestedRole: chainUser.requestedRole,
          };
          setUser(uiUser);
        }
      } catch (userError) {
        // Si falla getUser (ej: usuario nuevo sin registro), establecer null
        // pero no fallar completamente - el usuario puede solicitar un rol
        console.log('User not registered yet, setting to null');
        setUser(null);
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

  const requestRole = async (desiredRole: number) => {
    if (!roleManager || !account) return;
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
    if (window.ethereum && account && isConnected && !manualDisconnect) {
      const eth = window.ethereum as Eip1193Provider;
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
        } catch {
          // Ignore polling errors
        }
      };
      interval = window.setInterval(check, 2000);
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
