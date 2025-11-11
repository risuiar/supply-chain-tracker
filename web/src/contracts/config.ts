// Contract addresses
export const ROLE_MANAGER_ADDRESS = import.meta.env.VITE_ROLE_MANAGER_ADDRESS || '0x610178dA211FEF7D417bC0e6FeD39F05609AD788';
export const TOKEN_FACTORY_ADDRESS = import.meta.env.VITE_TOKEN_FACTORY_ADDRESS || '0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e';
export const TRANSFER_MANAGER_ADDRESS = import.meta.env.VITE_TRANSFER_MANAGER_ADDRESS || '0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0';
export const ADMIN_ADDRESS = import.meta.env.VITE_ADMIN_ADDRESS || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

// RoleManager ABI
export const ROLE_MANAGER_ABI = [
  "function admin() view returns (address)",
  "function requestRole(uint8 desiredRole)",
  "function approveRole(address account)",
  "function rejectRole(address account)",
  "function revokeRole(address account)",
  "function getUser(address account) view returns (tuple(uint8 role, bool approved, uint8 requestedRole))",
  "function hasRole(address account, uint8 expectedRole) view returns (bool)",
  "function getUserRole(address account) view returns (uint8)",
  "function isApproved(address account) view returns (bool)",
  "event RoleRequested(address indexed account, uint8 indexed requestedRole)",
  "event RoleApproved(address indexed account, uint8 indexed role)",
  "event RoleRejected(address indexed account, uint8 indexed requestedRole)",
  "event RoleRevoked(address indexed account, uint8 indexed previousRole)"
];

// TokenFactory ABI
export const TOKEN_FACTORY_ABI = [
  "function roleManager() view returns (address)",
  "function createRawToken(string productName, string metadataURI) returns (uint256)",
  "function createProcessedToken(string productName, string metadataURI, uint256[] parentIds) returns (uint256)",
  "function getToken(uint256 tokenId) view returns (tuple(uint256 id, string productName, uint8 assetType, string metadataURI, address creator, address currentHolder, uint8 currentRole, uint64 createdAt, uint256[] parentIds, bool exists))",
  "function getUserTokens(address account) view returns (uint256[])",
  "function getTokenHolder(uint256 tokenId) view returns (address)",
  "function transferToken(uint256 tokenId, address to)",
  "event TokenCreated(uint256 indexed tokenId, string productName, uint8 assetType, address indexed creator, string metadataURI)",
  "event TokenTransferred(uint256 indexed tokenId, address indexed from, address indexed to)"
];

// TransferManager ABI
export const TRANSFER_MANAGER_ABI = [
  "function roleManager() view returns (address)",
  "function tokenFactory() view returns (address)",
  "function admin() view returns (address)",
  "function requestTransfer(uint256 tokenId, address to) returns (uint256)",
  "function approveTransfer(uint256 transferId)",
  "function rejectTransfer(uint256 transferId)",
  "function getTransfer(uint256 transferId) view returns (tuple(uint256 id, uint256 tokenId, address from, address to, uint8 fromRole, uint8 toRole, uint8 status, uint64 requestedAt, uint64 resolvedAt))",
  "function getTokenTransfers(uint256 tokenId) view returns (tuple(uint256 id, uint256 tokenId, address from, address to, uint8 fromRole, uint8 toRole, uint8 status, uint64 requestedAt, uint64 resolvedAt)[])",
  "function getPendingTransfer(uint256 tokenId) view returns (uint256)",
  "event TransferRequested(uint256 indexed tokenId, uint256 indexed transferId, address indexed to)",
  "event TransferResolved(uint256 indexed transferId, uint8 status)"
];
