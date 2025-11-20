import { BrowserProvider } from 'ethers';

export function getWebProvider() {
  if (!window.ethereum) {
    throw new Error('window.ethereum no está disponible. Asegúrate de tener MetaMask instalado.');
  }
  return new BrowserProvider(window.ethereum);
}
