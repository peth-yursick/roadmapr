/**
 * Smart Contract Integration for Roadmapr
 * Handles interactions with RoadmaprVoting.sol
 */

import { createWalletClient, createPublicClient, http, type Address, type Hash } from "viem";
import { privateKeyToAccount } from "viem/accounts";

// Contract ABI (functions we use)
const ROADMAPR_VOTING_ABI = [
  // Migration
  {
    "inputs": [{"name": "_migrationContract", "type": "address"}],
    "name": "setMigrationContract",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "featureId", "type": "bytes32"},
      {"name": "voters", "type": "address[]"}
    ],
    "name": "migrateFeature",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Platform fee
  {
    "inputs": [{"name": "_platformFeeRecipient", "type": "address"}],
    "name": "setPlatformFeeRecipient",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Project management
  {
    "inputs": [
      {"name": "projectId", "type": "bytes32"},
      {"name": "tokenAddress", "type": "address"},
      {"name": "voteIncrement", "type": "uint256"}
    ],
    "name": "registerProject",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "projectId", "type": "bytes32"},
      {"name": "voteIncrement", "type": "uint256"}
    ],
    "name": "updateProject",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Voting
  {
    "inputs": [
      {"name": "featureId", "type": "bytes32"},
      {"name": "projectId", "type": "bytes32"},
      {"name": "voteCount", "type": "uint256"},
      {"name": "isUpvote", "type": "bool"}
    ],
    "name": "vote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "featureId", "type": "bytes32"}],
    "name": "withdrawVote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Feature shipping
  {
    "inputs": [{"name": "featureId", "type": "bytes32"}],
    "name": "markFeatureShipped",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Token claiming
  {
    "inputs": [
      {"name": "featureId", "type": "bytes32"},
      {"name": "voters", "type": "address[]"}
    ],
    "name": "claimTokens",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "featureIds", "type": "bytes32[]"},
      {"name": "votersPerFeature", "type": "address[][]"}
    ],
    "name": "batchClaimTokens",
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
    "inputs": [{"name": "featureId", "type": "bytes32"}],
    "name": "getFeature",
    "outputs": [{"components": [
      {"name": "projectId", "type": "bytes32"},
      {"name": "totalUpvoteTokens", "type": "uint256"},
      {"name": "totalDownvoteTokens", "type": "uint256"},
      {"name": "shippedAt", "type": "uint256"},
      {"name": "status", "type": "uint8"}
    ], "name": "", "type": "tuple"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "featureId", "type": "bytes32"},
      {"name": "voters", "type": "address[]"}
    ],
    "name": "getClaimableAmount",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "featureId", "type": "bytes32"},
      {"name": "voter", "type": "address"}
    ],
    "name": "canWithdraw",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "projectId", "type": "bytes32"}],
    "name": "getPlatformFees",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Convert UUID to bytes32 (pad with zeros)
export function uuidToBytes32(uuid: string): `0x${string}` {
  const clean = uuid.replace(/-/g, '');
  return `0x${clean.padEnd(64, '0')}` as `0x${string}`;
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

// Create wallet client from private key
export function createWalletClientFromPrivateKey() {
  const privateKey = process.env.ROADMAPR_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("ROADMAPR_PRIVATE_KEY not set");
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);

  return createWalletClient({
    account,
    chain: {
      id: 8453, // Base mainnet
      name: "Base",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: {
        default: { http: [getRpcUrl()] },
        public: { http: [getRpcUrl()] },
      },
    },
    transport: http(),
  });
}

// Create public client
export function createPublicClientFn() {
  return createPublicClient({
    chain: {
      id: 8453, // Base mainnet
      name: "Base",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: {
        default: { http: [getRpcUrl()] },
        public: { http: [getRpcUrl()] },
      },
    },
    transport: http(),
  });
}

/**
 * Mark feature as shipped (owner can claim immediately after)
 */
export async function markFeatureShippedOnChain(featureId: string): Promise<Hash> {
  const walletClient = createWalletClientFromPrivateKey();
  const contractAddress = getContractAddress();
  const featureBytes32 = uuidToBytes32(featureId);

  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: ROADMAPR_VOTING_ABI,
    functionName: "markFeatureShipped",
    args: [featureBytes32],
  });

  return hash;
}

/**
 * Claim tokens from a shipped feature
 */
export async function claimFeatureTokens(
  featureId: string,
  voterAddresses: Address[]
): Promise<Hash> {
  const walletClient = createWalletClientFromPrivateKey();
  const contractAddress = getContractAddress();
  const featureBytes32 = uuidToBytes32(featureId);

  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: ROADMAPR_VOTING_ABI,
    functionName: "claimTokens",
    args: [featureBytes32, voterAddresses],
  });

  return hash;
}

/**
 * Batch claim from multiple features
 */
export async function batchClaimFeatureTokens(
  featureIds: string[],
  voterAddressesPerFeature: Address[][]
): Promise<Hash> {
  const walletClient = createWalletClientFromPrivateKey();
  const contractAddress = getContractAddress();

  const featureBytes32Array = featureIds.map(uuidToBytes32);

  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: ROADMAPR_VOTING_ABI,
    functionName: "batchClaimTokens",
    args: [featureBytes32Array, voterAddressesPerFeature],
  });

  return hash;
}

/**
 * Withdraw platform 1% fees
 */
export async function withdrawPlatformFees(projectId: string): Promise<Hash> {
  const walletClient = createWalletClientFromPrivateKey();
  const contractAddress = getContractAddress();
  const projectBytes32 = uuidToBytes32(projectId);

  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: ROADMAPR_VOTING_ABI,
    functionName: "withdrawPlatformFees",
    args: [projectBytes32],
  });

  return hash;
}

/**
 * Get claimable amount for a feature
 */
export async function getClaimableAmountOnChain(
  featureId: string,
  voterAddresses: Address[]
): Promise<bigint> {
  const publicClient = createPublicClientFn();
  const contractAddress = getContractAddress();
  const featureBytes32 = uuidToBytes32(featureId);

  const amount = await publicClient.readContract({
    address: contractAddress,
    abi: ROADMAPR_VOTING_ABI,
    functionName: "getClaimableAmount",
    args: [featureBytes32, voterAddresses],
  });

  return amount as bigint;
}

/**
 * Check if voter can withdraw
 */
export async function canWithdrawVote(
  featureId: string,
  voterAddress: Address
): Promise<boolean> {
  const publicClient = createPublicClientFn();
  const contractAddress = getContractAddress();
  const featureBytes32 = uuidToBytes32(featureId);

  const canWithdraw = await publicClient.readContract({
    address: contractAddress,
    abi: ROADMAPR_VOTING_ABI,
    functionName: "canWithdraw",
    args: [featureBytes32, voterAddress],
  });

  return canWithdraw as boolean;
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
 * Get feature info from contract
 */
export async function getFeatureFromContract(featureId: string) {
  const publicClient = createPublicClientFn();
  const contractAddress = getContractAddress();
  const featureBytes32 = uuidToBytes32(featureId);

  const feature = await publicClient.readContract({
    address: contractAddress,
    abi: ROADMAPR_VOTING_ABI,
    functionName: "getFeature",
    args: [featureBytes32],
  });

  return feature;
}
