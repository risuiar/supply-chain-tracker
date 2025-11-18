// Tipos compartidos para tokens y transferencias

export type TokenData = {
  id: bigint;
  productName: string;
  assetType: number;
  metadataURI: string;
  totalSupply: bigint;
  creator: string;
  currentHolder: string;
  currentRole: number;
  createdAt: bigint;
  parentIds: bigint[];
  exists: boolean;
};

export type TransferData = {
  id: bigint;
  tokenId: bigint;
  from: string;
  to: string;
  amount: bigint;
  fromRole: number;
  toRole: number;
  status: number; // 0: None, 1: Pending, 2: Approved, 3: Rejected
  requestedAt: bigint;
  resolvedAt: bigint;
};
