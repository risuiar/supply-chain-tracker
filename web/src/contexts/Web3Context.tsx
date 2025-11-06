import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BrowserProvider, Contract, Eip1193Provider } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../contracts/config';
import { User, UserStatus } from '../types';

interface Web3ContextType {
  account: string | null;
  isConnected: boolean;
  isAdmin: boolean;
  user: User | null;
  provider: BrowserProvider | null;
  contract: Contract | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  refreshUser: () => Promise<void>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export function Web3Provider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);

  const setupProvider = async (ethereum: Eip1193Provider) => {
    const browserProvider = new BrowserProvider(ethereum);
    const signer = await browserProvider.getSigner();
    const supplyChainContract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    setProvider(browserProvider);
    setContract(supplyChainContract);

    return { browserProvider, supplyChainContract };
  };

  const loadUserInfo = async (address: string, supplyChainContract: Contract) => {
    try {
      const userInfo = await supplyChainContract.getUserInfo(address);

      if (userInfo.id === 0n) {
        setUser(null);
      } else {
        setUser({
          id: userInfo.id,
          userAddress: userInfo.userAddress,
          role: userInfo.role,
          status: Number(userInfo.status) as UserStatus,
        });
      }

      const adminStatus = await supplyChainContract.isAdmin(address);
      setIsAdmin(adminStatus);
    } catch (error) {
      console.error('Error loading user info:', error);
      setUser(null);
      setIsAdmin(false);
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask to use this application');
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      const address = accounts[0];
      setAccount(address);
      setIsConnected(true);

      const { supplyChainContract } = await setupProvider(window.ethereum);
      await loadUserInfo(address, supplyChainContract);

      localStorage.setItem('connectedAccount', address);
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
    setContract(null);
    localStorage.removeItem('connectedAccount');
  };

  const refreshUser = async () => {
    if (!account || !contract) return;
    await loadUserInfo(account, contract);
  };

  useEffect(() => {
    const savedAccount = localStorage.getItem('connectedAccount');

    if (savedAccount && window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
        if (accounts.includes(savedAccount)) {
          setAccount(savedAccount);
          setIsConnected(true);

          setupProvider(window.ethereum).then(({ supplyChainContract }) => {
            loadUserInfo(savedAccount, supplyChainContract);
          });
        } else {
          localStorage.removeItem('connectedAccount');
        }
      });
    }

    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else if (accounts[0] !== account) {
          setAccount(accounts[0]);
          localStorage.setItem('connectedAccount', accounts[0]);

          setupProvider(window.ethereum).then(({ supplyChainContract }) => {
            loadUserInfo(accounts[0], supplyChainContract);
          });
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
  }, []);

  return (
    <Web3Context.Provider
      value={{
        account,
        isConnected,
        isAdmin,
        user,
        provider,
        contract,
        connectWallet,
        disconnectWallet,
        refreshUser,
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
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}
