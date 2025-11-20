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

const deploymentMetadata: Record<Network, Partial<Record<ContractKey, DeploymentMetadata>>> = {
  sepolia: {
    roleManager: {
      deployBlock: 9_664_166,
      deployTxHash: '0x10a0dffc448f8ea0f36ae567842882b98ca175a8969e33e18725d34a737c203f',
    },
    tokenFactory: {
      deployBlock: 9_664_166,
      deployTxHash: '0x32ff58769035cf9f713755f05c2ca9e59c7baaa1d3444240d0c48a4d72d42ba3',
    },
    transferManager: {
      deployBlock: 9_664_166,
      deployTxHash: '0x937a1244917b10c3078370a7e94b83456cd1d2b468fc797573347b3967137401',
    },
  },
  anvil: {
    roleManager: {
      deployBlock: 39,
      deployTxHash: '0x00a7af61eb13459ad1e2b8916b9dcf7dd65aa8371fd70b257d9f4cd7f65c9079',
      fallbackOffset: 500,
    },
    tokenFactory: {
      deployBlock: 40,
      deployTxHash: '0x1f68a156ac806744ba18aa50a17e4088349543da3cc7e7b1df0848b91f23c86a',
      fallbackOffset: 500,
    },
    transferManager: {
      deployBlock: 40,
      deployTxHash: '0xc3f7981a7e78627cff010337c05b6ab59e32d2043af1343c05d872f32b318ef8',
      fallbackOffset: 500,
    },
  },
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
