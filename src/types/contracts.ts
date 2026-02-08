/**
 * Shared type definitions for contract interactions
 */

/**
 * Wallet provider interface for Farcaster miniapp and standard wallets
 * Made flexible to accommodate viem wallet clients and EIP-1193 providers
 */
export type WalletProvider = {
  request: (args: {
    method: string;
    params?: readonly unknown[] | object;
  }) => Promise<unknown>;
} & Record<string, unknown>;

/**
 * Standard error interface for caught exceptions
 */
export interface CaughtError {
  message?: string;
  code?: number | string;
  data?: {
    message?: string;
  };
}

/**
 * Farcaster account from Privy
 */
export interface FarcasterAccount {
  type: "farcaster";
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}

/**
 * Email account from Privy
 */
export interface EmailAccount {
  type: "email";
  address: string;
}

/**
 * Wallet account from Privy
 */
export interface WalletAccount {
  type: "wallet";
  address: string;
}

/**
 * Privy account (union type)
 */
export type PrivyAccount = FarcasterAccount | EmailAccount | WalletAccount;

/**
 * Feature from database (for embed page)
 */
export interface Feature {
  id: string;
  title: string;
  description: string;
  status: "open" | "in-progress" | "shipped" | "cancelled";
  total_weight?: number;
  created_at: string;
  project_id: string;
}

/**
 * Vote item in pending queue
 */
export interface PendingVote {
  id: string;
  projectId: string;
  projectName?: string;
  isUpvote: boolean;
  timestamp: number;
}

/**
 * User authentication info
 */
export interface UserInfo {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
  custodyAddress?: string;
}
