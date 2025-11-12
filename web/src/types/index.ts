export enum UserStatus {
  Pending = 0,
  Approved = 1,
  Rejected = 2,
  Canceled = 3,
}

export enum TransferStatus {
  None = 0,
  Pending = 1,
  Approved = 2,
  Rejected = 3,
}

export type UserRole = 'Admin' | 'Producer' | 'Factory' | 'Retailer' | 'Consumer';

export interface Token {
  id: bigint;
  creator: string;
  name: string;
  totalSupply: bigint;
  features: string;
  parentId: bigint;
  dateCreated: bigint;
}

export interface Transfer {
  id: bigint;
  from: string;
  to: string;
  tokenId: bigint;
  dateCreated: bigint;
  amount: bigint;
  status: TransferStatus;
}

export interface User {
  id: bigint;
  userAddress: string;
  role: string;
  status: UserStatus;
}

export interface TokenWithBalance extends Token {
  balance: bigint;
}
