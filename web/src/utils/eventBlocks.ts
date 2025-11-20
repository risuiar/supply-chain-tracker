import { BrowserProvider } from 'ethers';

export type ContractKey = 'roleManager' | 'tokenFactory' | 'transferManager';

interface DeploymentMetadata {
  deployBlock?: number;
  deployTxHash?: string;
  fallbackOffset?: number;
  fallbackBlock?: number;
}

type Network = 'sepolia' | 'anvil' | 'unknown';

const DEFAULT_FALLBACK_OFFSET = 20_000;
const STATIC_FALLBACK_BLOCK = 7_000_000;
const MIN_BLOCK = 1;

// Helper to get deployment metadata from environment variables
const getDeploymentMetadata = (
  network: Network
): Partial<Record<ContractKey, DeploymentMetadata>> => {
  const metadata: Partial<Record<ContractKey, DeploymentMetadata>> = {};

  const getEnvValue = (key: string): string | undefined => {
    return import.meta.env[key];
  };

  const getEnvNumber = (key: string): number | undefined => {
    const value = getEnvValue(key);
    if (!value) return undefined;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? undefined : parsed;
  };

  const networkUpper = network.toUpperCase();

  // Map contract names to env variable prefixes
  const envContractMap: Record<ContractKey, string> = {
    roleManager: 'ROLE_MANAGER',
    tokenFactory: 'TOKEN_FACTORY',
    transferManager: 'TRANSFER_MANAGER',
  };

  const contracts: ContractKey[] = ['roleManager', 'tokenFactory', 'transferManager'];

  for (const contract of contracts) {
    const envPrefix = `VITE_${envContractMap[contract]}`;
    const deployBlock = getEnvNumber(`${envPrefix}_DEPLOY_BLOCK_${networkUpper}`);
    const deployTxHash = getEnvValue(`${envPrefix}_DEPLOY_TX_HASH_${networkUpper}`);
    const fallbackOffset = getEnvNumber(`${envPrefix}_FALLBACK_OFFSET_${networkUpper}`);

    if (deployBlock !== undefined || deployTxHash !== undefined || fallbackOffset !== undefined) {
      metadata[contract] = {};
      if (deployBlock !== undefined) {
        metadata[contract]!.deployBlock = deployBlock;
      }
      if (deployTxHash) {
        metadata[contract]!.deployTxHash = deployTxHash;
      }
      if (fallbackOffset !== undefined) {
        metadata[contract]!.fallbackOffset = fallbackOffset;
      }
    }
  }

  return metadata;
};

const deploymentMetadata: Record<Network, Partial<Record<ContractKey, DeploymentMetadata>>> = {
  sepolia: getDeploymentMetadata('sepolia'),
  anvil: getDeploymentMetadata('anvil'),
  unknown: {},
};

const resolvedBlocksCache = new Map<string, number>();

const toNumber = (value: number | bigint | undefined): number | null => {
  if (value === undefined) {
    return null;
  }
  return typeof value === 'bigint' ? Number(value) : value;
};

const sanitizeBlock = (value: number | null | undefined): number | null => {
  if (value === null || typeof value === 'undefined' || Number.isNaN(value)) {
    return null;
  }
  return Math.max(MIN_BLOCK, Math.trunc(value));
};

const networkKey = (networkEnv: string | undefined): Network => {
  if (!networkEnv) return 'unknown';
  const normalized = networkEnv.toLowerCase().trim();
  if (normalized === 'sepolia' || normalized === 'anvil') {
    return normalized;
  }
  return 'unknown';
};

export async function resolveEventFromBlock(
  provider: BrowserProvider | null,
  contract: ContractKey
): Promise<number> {
  const network = networkKey(import.meta.env.VITE_NETWORK);
  const cacheKey = `${network}-${contract}`;

  if (resolvedBlocksCache.has(cacheKey)) {
    return resolvedBlocksCache.get(cacheKey)!;
  }

  const metadata = deploymentMetadata[network]?.[contract] ?? deploymentMetadata.unknown[contract];

  const recordBlock = (blockValue: number | null): number => {
    const safeBlock = blockValue ?? MIN_BLOCK;
    resolvedBlocksCache.set(cacheKey, safeBlock);
    if (metadata) {
      metadata.deployBlock = safeBlock;
    }
    return safeBlock;
  };

  if (metadata?.deployBlock) {
    const sanitized = sanitizeBlock(metadata.deployBlock);
    if (sanitized !== null) {
      return recordBlock(sanitized);
    }
  }

  if (metadata?.deployTxHash && provider) {
    try {
      const receipt = await provider.getTransactionReceipt(metadata.deployTxHash);
      const blockFromReceipt = sanitizeBlock(toNumber(receipt?.blockNumber));
      if (blockFromReceipt !== null) {
        return recordBlock(blockFromReceipt);
      }
    } catch (error) {
      console.warn(`⚠️ No se pudo obtener el bloque de deploy para ${contract} via recibo:`, error);
    }
  }

  if (provider) {
    try {
      const currentBlock = toNumber(await provider.getBlockNumber());
      if (currentBlock !== null) {
        const offset = metadata?.fallbackOffset ?? DEFAULT_FALLBACK_OFFSET;
        const fallbackBlock = sanitizeBlock(currentBlock - offset);
        if (fallbackBlock !== null) {
          return recordBlock(fallbackBlock);
        }
      }
    } catch (error) {
      console.warn(
        `⚠️ No se pudo obtener el bloque actual al resolver logs para ${contract}:`,
        error
      );
    }
  }

  const staticFallback = metadata?.fallbackBlock ?? metadata?.deployBlock ?? STATIC_FALLBACK_BLOCK;
  return recordBlock(sanitizeBlock(staticFallback));
}
