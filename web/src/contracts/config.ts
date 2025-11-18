// Network configuration
const NETWORK = import.meta.env.VITE_NETWORK?.toLowerCase();

// Validate network configuration
if (!NETWORK || (NETWORK !== 'anvil' && NETWORK !== 'sepolia')) {
  console.error('⚠️ VITE_NETWORK no está configurado o es inválido. Debe ser "anvil" o "sepolia".');
  console.error('Configura VITE_NETWORK en tu archivo .env');
}

// Contract addresses from environment variables
// Selected based on VITE_NETWORK (anvil or sepolia)
const getAddress = (envVar: string, fallback: string): string => {
  if (!NETWORK) {
    console.warn(`⚠️ VITE_NETWORK no configurado. Usando fallback para ${envVar}`);
    return fallback;
  }

  const networkSpecific = import.meta.env[`${envVar}_${NETWORK.toUpperCase()}`];
  if (!networkSpecific) {
    console.warn(`⚠️ ${envVar}_${NETWORK.toUpperCase()} no está configurado. Usando fallback.`);
    return fallback;
  }
  return networkSpecific;
};

export const ROLE_MANAGER_ADDRESS = getAddress(
  'VITE_ROLE_MANAGER_ADDRESS',
  '0x5FbDB2315678afecb367f032d93F642f64180aa3'
);
export const TOKEN_FACTORY_ADDRESS = getAddress(
  'VITE_TOKEN_FACTORY_ADDRESS',
  '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'
);
export const TRANSFER_MANAGER_ADDRESS = getAddress(
  'VITE_TRANSFER_MANAGER_ADDRESS',
  '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'
);
export const ADMIN_ADDRESS = getAddress(
  'VITE_ADMIN_ADDRESS',
  '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
);

// Explorer base URL (only available on public networks)
export const EXPLORER_BASE_URL = NETWORK === 'sepolia' ? 'https://sepolia.etherscan.io' : null;

// Export network for debugging/display
export const CURRENT_NETWORK = NETWORK;

// RoleManager ABI
export const ROLE_MANAGER_ABI = [
  'function admin() view returns (address)',
  'function requestRole(uint8 desiredRole)',
  'function approveRole(address account)',
  'function rejectRole(address account)',
  'function revokeRole(address account)',
  'function cancelRequest()',
  'function getUser(address account) view returns (tuple(uint8 role, bool approved, uint8 requestedRole))',
  'function hasRole(address account, uint8 expectedRole) view returns (bool)',
  'function getUserRole(address account) view returns (uint8)',
  'function isApproved(address account) view returns (bool)',
  'event RoleRequested(address indexed account, uint8 indexed requestedRole)',
  'event RoleApproved(address indexed account, uint8 indexed role)',
  'event RoleRejected(address indexed account, uint8 indexed requestedRole)',
  'event RoleRevoked(address indexed account, uint8 indexed previousRole)',
];

// TokenFactory ABI
export const TOKEN_FACTORY_ABI = [
  'function roleManager() view returns (address)',
  'function createRawToken(string productName, string metadataURI, uint256 totalSupply) returns (uint256)',
  'function createProcessedToken(string productName, string metadataURI, uint256 totalSupply, uint256[] parentIds) returns (uint256)',
  'function getToken(uint256 tokenId) view returns (tuple(uint256 id, string productName, uint8 assetType, string metadataURI, uint256 totalSupply, address creator, address currentHolder, uint8 currentRole, uint64 createdAt, uint256[] parentIds, bool exists))',
  'function getUserTokens(address account) view returns (uint256[])',
  'function getTokenHolder(uint256 tokenId) view returns (address)',
  'function balanceOf(uint256 tokenId, address account) view returns (uint256)',
  'function transferToken(uint256 tokenId, address from, address to, uint256 amount)',
  'event TokenCreated(uint256 indexed tokenId, string productName, uint8 assetType, address indexed creator, string metadataURI)',
  'event TokenTransferred(uint256 indexed tokenId, address indexed from, address indexed to)',
  'error NotApproved()',
  'error AssetDoesNotExist()',
  'error MissingParentAssets()',
  'error InvalidRoleTransition()',
  'error Unauthorized()',
];

// TransferManager ABI
export const TRANSFER_MANAGER_ABI = [
  'function roleManager() view returns (address)',
  'function tokenFactory() view returns (address)',
  'function admin() view returns (address)',
  'function requestTransfer(uint256 tokenId, address to, uint256 amount) returns (uint256)',
  'function approveTransfer(uint256 transferId)',
  'function rejectTransfer(uint256 transferId)',
  'function getTransfer(uint256 transferId) view returns (tuple(uint256 id, uint256 tokenId, address from, address to, uint256 amount, uint8 fromRole, uint8 toRole, uint8 status, uint64 requestedAt, uint64 resolvedAt))',
  'function getTokenTransfers(uint256 tokenId) view returns (tuple(uint256 id, uint256 tokenId, address from, address to, uint256 amount, uint8 fromRole, uint8 toRole, uint8 status, uint64 requestedAt, uint64 resolvedAt)[])',
  'function getPendingTransfer(uint256 tokenId) view returns (uint256)',
  'event TransferRequested(uint256 indexed tokenId, uint256 indexed transferId, address indexed to)',
  'event TransferResolved(uint256 indexed transferId, uint8 status)',
  'error NotTokenCreator()',
];
