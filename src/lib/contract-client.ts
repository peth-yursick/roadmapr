/**
 * Frontend Smart Contract Integration for Roadmapr
 * Client-side functions using Farcaster miniapp wallet provider
 */

import { createWalletClient, createPublicClient, http, type Address, type Hash } from "viem";
import { defineChain } from "viem";

// Contract ABI (functions we use from client)
const ROADMAPR_VOTING_ABI = [
  // Project voting (main page)
  {
    "inputs": [
      {"name": "projectId", "type": "bytes32"},
      {"name": "voteAmount", "type": "uint256"},
      {"name": "isUpvote", "type": "bool"}
    ],
    "name": "voteProject",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Platform fee management
  {
    "inputs": [{"name": "_platformFeeRecipient", "type": "address"}],
    "name": "setPlatformFeeRecipient",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Platform fee withdrawal
  {
    "inputs": [{"name": "projectId", "type": "bytes32"}],
    "name": "withdrawPlatformFees",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // View functions
  {
    "inputs": [{"name": "projectId", "type": "bytes32"}],
    "name": "getProjectScore",
    "outputs": [{"name": "", "type": "int256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "projectId", "type": "bytes32"}],
    "name": "getProjectVotes",
    "outputs": [
      {"name": "totalUpvotes", "type": "uint256"},
      {"name": "totalDownvotes", "type": "uint256"},
      {"name": "totalFeesCollected", "type": "uint256"},
      {"name": "score", "type": "int256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "projectId", "type": "bytes32"}],
    "name": "getPlatformFees",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "platformFeeRecipient",
    "outputs": [{"name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{"name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "projectId", "type": "bytes32"}],
    "name": "projects",
    "outputs": [
      {"name": "tokenAddress", "type": "address"},
      {"name": "owner", "type": "address"},
      {"name": "voteIncrement", "type": "uint256"},
      {"name": "totalFeesCollected", "type": "uint256"},
      {"name": "totalUpvotes", "type": "uint256"},
      {"name": "totalDownvotes", "type": "uint256"},
      {"name": "exists", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Base chain definition for viem
const baseChain = defineChain({
  id: 8453,
  name: "Base",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://mainnet.base.org"] },
  },
  blockExplorers: {
    default: { name: "BaseScan", url: "https://base.blockscout.com" },
  },
});

// Convert UUID to bytes32 (pad with zeros)
export function uuidToBytes32(uuid: string): `0x${string}` {
  const clean = uuid.replace(/-/g, "");
  return `0x${clean.padEnd(64, "0")}` as `0x${string}`;
}

// Get contract address from env
export function getContractAddress(): Address {
  const address = process.env.NEXT_PUBLIC_ROADMAPR_CONTRACT_ADDRESS;
  if (!address) {
    throw new Error("NEXT_PUBLIC_ROADMAPR_CONTRACT_ADDRESS not set");
  }
  return address as Address;
}

// Get RPC URL from env
export function getRpcUrl(): string {
  return process.env.NEXT_PUBLIC_RPC_URL || "https://mainnet.base.org";
}

/**
 * Create a public client (read-only)
 */
export function createPublicClientFn() {
  return createPublicClient({
    chain: baseChain,
    transport: http(),
  });
}

/**
 * Create wallet client from custom provider (e.g., Farcaster SDK provider)
 */
export function createWalletClientFromProvider(provider: any) {
  return createWalletClient({
    chain: baseChain,
    transport: provider as any,
  });
}

/**
 * Get platform fee recipient address
 */
export async function getPlatformFeeRecipient(): Promise<Address> {
  const publicClient = createPublicClientFn();
  const contractAddress = getContractAddress();

  const recipient = await publicClient.readContract({
    address: contractAddress,
    abi: ROADMAPR_VOTING_ABI,
    functionName: "platformFeeRecipient",
  });

  return recipient as Address;
}

/**
 * Vote on a project (for main page ranking)
 * Both upvotes and downvotes collect 1% fee for platform
 * @param projectId - Project UUID
 * @param voteAmount - Amount of tokens to vote with
 * @param isUpvote - true for upvote, false for downvote
 * @param provider - Wallet provider (e.g., from Farcaster SDK)
 * @returns Transaction hash
 */
export async function voteOnProject(
  projectId: string,
  voteAmount: bigint,
  isUpvote: boolean,
  provider: any
): Promise<Hash> {
  const walletClient = createWalletClientFromProvider(provider);
  const contractAddress = getContractAddress();
  const projectBytes32 = uuidToBytes32(projectId);

  const [account] = await walletClient.getAddresses();

  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: ROADMAPR_VOTING_ABI,
    functionName: "voteProject",
    args: [projectBytes32, voteAmount, isUpvote],
    account,
  });

  return hash;
}

/**
 * Get project score (upvotes - downvotes) from smart contract
 */
export async function getProjectScoreOnChain(projectId: string): Promise<bigint> {
  const publicClient = createPublicClientFn();
  const contractAddress = getContractAddress();
  const projectBytes32 = uuidToBytes32(projectId);

  const score = await publicClient.readContract({
    address: contractAddress,
    abi: ROADMAPR_VOTING_ABI,
    functionName: "getProjectScore",
    args: [projectBytes32],
  });

  return score as bigint;
}

/**
 * Get full project vote details from smart contract
 */
export async function getProjectVotesOnChain(projectId: string): Promise<{
  totalUpvotes: bigint;
  totalDownvotes: bigint;
  totalFeesCollected: bigint;
  score: bigint;
}> {
  const publicClient = createPublicClientFn();
  const contractAddress = getContractAddress();
  const projectBytes32 = uuidToBytes32(projectId);

  const result = await publicClient.readContract({
    address: contractAddress,
    abi: ROADMAPR_VOTING_ABI,
    functionName: "getProjectVotes",
    args: [projectBytes32],
  });

  const [totalUpvotes, totalDownvotes, totalFeesCollected, score] = result as [
    bigint,
    bigint,
    bigint,
    bigint
  ];

  return { totalUpvotes, totalDownvotes, totalFeesCollected, score };
}

/**
 * Get platform fees for a project
 */
export async function getPlatformFeesOnChain(projectId: string): Promise<bigint> {
  const publicClient = createPublicClientFn();
  const contractAddress = getContractAddress();
  const projectBytes32 = uuidToBytes32(projectId);

  const fees = await publicClient.readContract({
    address: contractAddress,
    abi: ROADMAPR_VOTING_ABI,
    functionName: "getPlatformFees",
    args: [projectBytes32],
  });

  return fees as bigint;
}

/**
 * Withdraw platform fees using connected wallet
 * @param projectId - Project UUID
 * @param provider - Wallet provider (e.g., from Farcaster SDK)
 * @returns Transaction hash
 */
export async function withdrawPlatformFeesWithWallet(
  projectId: string,
  provider: any
): Promise<Hash> {
  const walletClient = createWalletClientFromProvider(provider);
  const contractAddress = getContractAddress();
  const projectBytes32 = uuidToBytes32(projectId);

  const [account] = await walletClient.getAddresses();

  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: ROADMAPR_VOTING_ABI,
    functionName: "withdrawPlatformFees",
    args: [projectBytes32],
    account,
  });

  return hash;
}

/**
 * Set platform fee recipient using connected wallet
 * Only contract owner can call this
 * @param newRecipient - New platform fee recipient address
 * @param provider - Wallet provider (e.g., from Farcaster SDK)
 * @returns Transaction hash
 */
export async function setPlatformFeeRecipientWithWallet(
  newRecipient: Address,
  provider: any
): Promise<Hash> {
  const walletClient = createWalletClientFromProvider(provider);
  const contractAddress = getContractAddress();

  const [account] = await walletClient.getAddresses();

  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: ROADMAPR_VOTING_ABI,
    functionName: "setPlatformFeeRecipient",
    args: [newRecipient],
    account,
  });

  return hash;
}
