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
  ADMIN_ADDRESS 
} from '../contracts/config';

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

  const setupProvider = async (ethereum: Eip1193Provider) => {
    const browserProvider = new BrowserProvider(ethereum);
    const signer = await browserProvider.getSigner();
    
    const roleManagerContract = new Contract(ROLE_MANAGER_ADDRESS, ROLE_MANAGER_ABI, signer);
    const tokenFactoryContract = new Contract(TOKEN_FACTORY_ADDRESS, TOKEN_FACTORY_ABI, signer);
    const transferManagerContract = new Contract(TRANSFER_MANAGER_ADDRESS, TRANSFER_MANAGER_ABI, signer);

    setProvider(browserProvider);
    setRoleManager(roleManagerContract);
    setTokenFactory(tokenFactoryContract);
    setTransferManager(transferManagerContract);

    return { browserProvider, roleManagerContract, tokenFactoryContract, transferManagerContract };
  };

  const loadUserInfo = async (address: string, roleManagerContract: Contract) => {
    try {
      const rawStruct = await roleManagerContract.getUser(address) as unknown as {
        role: bigint;
        approved: boolean;
        requestedRole: bigint;
      };
      
      const chainUser: ChainUser = {
        role: Number(rawStruct.role),
        approved: rawStruct.approved,
        requestedRole: Number(rawStruct.requestedRole),
      };
      
      const adminAddress: string = await roleManagerContract.admin();
      
      const addrLower = address.toLowerCase();
      const chainAdminLower = adminAddress?.toLowerCase?.() ?? '';
      const envAdminLower = ADMIN_ADDRESS?.toLowerCase?.() ?? '';
      const adminCheck = addrLower === chainAdminLower || (!!envAdminLower && addrLower === envAdminLower);
      setIsAdmin(adminCheck);

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
    } catch (error) {
      console.error('Error loading user info:', error);
      setUser(null);
      setIsAdmin(false);
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      toast.error('Please install MetaMask to use this application');
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      const address = accounts[0];
      setAccount(address);
      setIsConnected(true);

      const { roleManagerContract } = await setupProvider(window.ethereum);
      await loadUserInfo(address, roleManagerContract);
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  const disconnectWallet = () => {
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
    try {
      const tx = await roleManager.requestRole(desiredRole);
      await tx.wait();
      await refreshUser();
    } catch (e) {
      console.error('requestRole failed', e);
      throw e;
    }
  };

  useEffect(() => {
    // No auto-reconnect - user must explicitly click Connect
    
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else if (account && accounts[0] !== account) {
          setAccount(accounts[0]);
          if (window.ethereum) {
            setupProvider(window.ethereum as Eip1193Provider).then(({ roleManagerContract }) => {
              loadUserInfo(accounts[0], roleManagerContract);
            });
          }
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

  window.ethereum.on('accountsChanged', handleAccountsChanged);
  window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
  window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
  window.ethereum?.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [account]);

  useEffect(() => {
    let interval: number | undefined;
    if (window.ethereum && account && isConnected) {
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
          if (!current && account) {
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
  }, [account, isConnected]);

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
