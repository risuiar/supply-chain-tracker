import { BrowserProvider } from 'ethers';

const cache: Record<string, number> = {};

export async function getDeployBlock(
  provider: BrowserProvider | null,
  deployTxHash: string | null | undefined,
  deployBlockOverride: number | null | undefined,
  contractName: string
): Promise<number> {
  if (!provider) {
    throw new Error('BrowserProvider no disponible');
  }

  if (cache[contractName] !== undefined) {
    return cache[contractName];
  }

  if (deployBlockOverride != null && !Number.isNaN(deployBlockOverride)) {
    cache[contractName] = Number(deployBlockOverride);
    console.log('[EVENT SCAN]', contractName, 'fromBlock=', cache[contractName]);
    return cache[contractName];
  }

  if (deployTxHash) {
    try {
      const receipt = await provider.getTransactionReceipt(deployTxHash);
      if (receipt?.blockNumber != null) {
        cache[contractName] = Number(receipt.blockNumber);
        console.log('[EVENT SCAN]', contractName, 'fromBlock=', cache[contractName]);
        return cache[contractName];
      }
    } catch (error) {
      console.warn(`Receipt lookup failed for ${contractName}:`, error);
    }
  }

  const current = await provider.getBlockNumber();
  cache[contractName] = Math.max(0, current - 20000);
  console.warn(`⚠ Fallback deploy block used for ${contractName}:`, cache[contractName]);
  console.log('[EVENT SCAN]', contractName, 'fromBlock=', cache[contractName]);
  return cache[contractName];
}
