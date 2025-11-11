export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707';
export const ADMIN_ADDRESS = import.meta.env.VITE_ADMIN_ADDRESS || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

export const CONTRACT_ABI = [
  "function admin() view returns (address)",
  // SupplyChainTracker - Role Management
  "function requestRole(uint8 desiredRole)",
  "function approveRole(address account)",
  "function rejectRole(address account)",
  "function revokeRole(address account)",
  "function getUser(address account) view returns (tuple(uint8 role, bool approved, uint8 requestedRole))",
  "event RoleRequested(address indexed account, uint8 indexed requestedRole)",
  "event RoleApproved(address indexed account, uint8 indexed role)",
  "event RoleRejected(address indexed account, uint8 indexed requestedRole)",
  "event RoleRevoked(address indexed account, uint8 indexed previousRole)",
  // Legacy ABI entries kept temporarily to avoid breaking other pages; will be removed during refactor
  "function requestUserRole(string role)",
  "function changeStatusUser(address userAddress, uint8 newStatus)",
  "function getUserInfo(address userAddress) view returns (tuple(uint256 id, address userAddress, string role, uint8 status))",
  "function isAdmin(address userAddress) view returns (bool)",
  "function createToken(string name, uint256 totalSupply, string features, uint256 parentId)",
  "function getToken(uint256 tokenId) view returns (tuple(uint256 id, address creator, string name, uint256 totalSupply, string features, uint256 parentId, uint256 dateCreated))",
  "function getTokenBalance(uint256 tokenId, address userAddress) view returns (uint256)",
  "function transfer(address to, uint256 tokenId, uint256 amount)",
  "function acceptTransfer(uint256 transferId)",
  "function rejectTransfer(uint256 transferId)",
  "function getTransfer(uint256 transferId) view returns (tuple(uint256 id, address from, address to, uint256 tokenId, uint256 dateCreated, uint256 amount, uint8 status))",
  "function getUserTokens(address userAddress) view returns (uint256[])",
  "function getUserTransfers(address userAddress) view returns (uint256[])",
  "function nextTokenId() view returns (uint256)",
  "function nextTransferId() view returns (uint256)",
  "function nextUserId() view returns (uint256)",
  "event TokenCreated(uint256 indexed tokenId, address indexed creator, string name, uint256 totalSupply)",
  "event TransferRequested(uint256 indexed transferId, address indexed from, address indexed to, uint256 tokenId, uint256 amount)",
  "event TransferAccepted(uint256 indexed transferId)",
  "event TransferRejected(uint256 indexed transferId)",
  "event UserRoleRequested(address indexed user, string role)",
  "event UserStatusChanged(address indexed user, uint8 status)"
];
