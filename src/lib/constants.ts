/**
 * Centralized constants for the Roadmapr application
 * Magic numbers and configuration values
 */

// Token voting configuration
export const ROAD_TOKEN_ADDRESS = "0xc7aaba6e953a1c0436295cfaaaea9b3ab475eb07" as const;
export const VOTE_PRICE_TOKENS = 1_000_000 as const; // 1 million tokens per vote
export const FEE_PERCENTAGE = 0.01 as const; // 1% fee
export const TOKEN_DECIMALS = 18 as const;

// Vote price in wei (1 million * 10^18)
export const VOTE_PRICE_WEI = BigInt(VOTE_PRICE_TOKENS) * BigInt(10 ** TOKEN_DECIMALS);

// Project listing limits
export const MAX_FEATURES_PER_PAGE = 20 as const;
export const PROJECTS_PER_PAGE = 50 as const;

// Timeouts and durations (in milliseconds)
export const TOAST_DURATION = 3000 as const;
export const CACHE_TTL = 60_000 as const; // 1 minute
export const WALLET_SESSION_TTL = 604_800_000 as const; // 7 days

// Feature status values
export const FEATURE_STATUS = {
  OPEN: "open",
  IN_PROGRESS: "in-progress",
  SHIPPED: "shipped",
  CANCELLED: "cancelled",
} as const;

export type FeatureStatus = typeof FEATURE_STATUS[keyof typeof FEATURE_STATUS];

// Voting type values
export const VOTING_TYPE = {
  SIMPLE: "simple",
  TOKEN: "token",
} as const;

export type VotingType = typeof VOTING_TYPE[keyof typeof VOTING_TYPE];

// Chain configuration
export const CHAIN_ID = 8453 as const; // Base mainnet
export const BLOCK_EXPLORER_URL = "https://base.blockscout.com" as const;

// Error messages
export const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: "Please connect your wallet first",
  INSUFFICIENT_TOKENS: (required: number, balance: number) =>
    `Insufficient $ROAD token balance. You need ${required.toLocaleString()} $ROAD tokens but only have ${balance.toLocaleString()} tokens.`,
  TRANSACTION_REJECTED: "Transaction was rejected in your wallet.",
  PROJECT_NOT_FOUND: "Project not found",
  FEATURE_NOT_FOUND: "Feature not found",
  ALREADY_VOTED: "You have already voted on this project.",
} as const;
