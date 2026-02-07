/**
 * Frontend Smart Contract Integration for Roadmapr
 * Client-side functions using Farcaster miniapp wallet provider
 *
 * TWO CONTRACTS:
 * 1. ProjectRanking - Simple upvote/downvote for main page ranking
 * 2. RoadmaprVoting - Complex token-based voting for features within projects
 */

import { createWalletClient, createPublicClient, http, custom, type Address, type Hash } from "viem";
import { defineChain } from "viem";

// ============================================
// CONTRACT 1: ProjectRanking (Simple)
// ============================================

const PROJECT_RANKING_ABI = [
  // Vote on project (upvote/downvote)
  {
    "inputs": [
      {"name": "projectId", "type": "bytes32"},
      {"name": "isUpvote", "type": "bool"}
    ],
    "name": "voteProject",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Get project score
  {
    "inputs": [{"name": "projectId", "type": "bytes32"}],
    "name": "getProjectScore",
    "outputs": [{"name": "", "type": "bigint"}],
    "stateMutability": "view",
    "type": "function"
  },
  // Get full project votes
  {
    "inputs": [{"name": "projectId", "type": "bytes32"}],
    "name": "getProjectVotes",
    "outputs": [
      {"name": "totalUpvotes", "type": "ubigint"},
      {"name": "totalDownvotes", "type": "ubigint"},
      {"name": "score", "type": "bigint"},
      {"name": "exists", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // Check if project exists
  {
    "inputs": [{"name": "projectId", "type": "bytes32"}],
    "name": "projectExists",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  // Check if address voted
  {
    "inputs": [
      {"name": "projectId", "type": "bytes32"},
      {"name": "voter", "type": "address"}
    ],
    "name": "hasVotedOnProject",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view",
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
  }
] as const;

// ============================================
// CONTRACT 2: RoadmaprVoting (Feature Voting)
// ============================================

const ROADMAPR_VOTING_ABI = [
  // Project registration (for feature voting)
  {
    "inputs": [
      {"name": "projectId", "type": "bytes32"},
      {"name": "tokenAddress", "type": "address"},
      {"name": "voteIncrement", "type": "ubigint"}
    ],
    "name": "registerProject",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Vote on feature (NOT project!)
  {
    "inputs": [
      {"name": "featureId", "type": "bytes32"},
      {"name": "projectId", "type": "bytes32"},
      {"name": "voteCount", "type": "ubigint"},
      {"name": "isUpvote", "type": "bool"}
    ],
    "name": "vote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Get project data (for feature voting contract)
  {
    "inputs": [{"name": "projectId", "type": "bytes32"}],
    "name": "getProject",
    "outputs": [
      {"name": "tokenAddress", "type": "address"},
      {"name": "owner", "type": "address"},
      {"name": "voteIncrement", "type": "ubigint"},
      {"name": "totalFeesCollected", "type": "ubigint"},
      {"name": "exists", "type": "bool"}
    ],
    "stateMutability": "view",
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
  {
    "inputs": [{"name": "projectId", "type": "bytes32"}],
    "name": "withdrawPlatformFees",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "projectId", "type": "bytes32"}],
    "name": "getPlatformFees",
    "outputs": [{"name": "", "type": "ubigint"}],
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
  }
] as const;

// ============================================
// Shared: Chain & Utility Functions
// ============================================

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

export function uuidToBytes32(uuid: string): `0x${string}` {
  const clean = uuid.replace(/-/g, "");
  return `0x${clean.padEnd(64, "0")}` as `0x${string}`;
}

export function getProjectRankingAddress(): Address {
  const address = process.env.NEXT_PUBLIC_PROJECT_RANKING_ADDRESS;
  if (!address) {
    throw new Error("NEXT_PUBLIC_PROJECT_RANKING_ADDRESS not set");
  }
  return address as Address;
}

export function getRoadmaprVotingAddress(): Address {
  const address = process.env.NEXT_PUBLIC_ROADMAPR_VOTING_ADDRESS;
  if (!address) {
    throw new Error("NEXT_PUBLIC_ROADMAPR_VOTING_ADDRESS not set");
  }
  return address as Address;
}

export function getRpcUrl(): string {
  return process.env.NEXT_PUBLIC_RPC_URL || "https://mainnet.base.org";
}

export function createPublicClientFn() {
  return createPublicClient({
    chain: baseChain,
    transport: http(),
  });
}

export function createWalletClientFromProvider(provider: any) {
  if (!provider) {
    throw new Error("Provider is required");
  }

  console.log("[createWalletClientFromProvider] Provider type:", typeof provider);
  console.log("[createWalletClientFromProvider] Provider keys:", Object.keys(provider));

  if (typeof provider.request !== 'function' && typeof provider.requestAsync !== 'function') {
    console.error("[createWalletClientFromProvider] Invalid provider - missing request/requestAsync methods");
    throw new Error("Invalid provider: must have request or requestAsync method");
  }

  try {
    return createWalletClient({
      chain: baseChain,
      transport: custom(provider),
    });
  } catch (error) {
    console.error("[createWalletClientFromProvider] Failed to create wallet client:", error);
    throw error;
  }
}

// ============================================
// PROJECT RANKING (Simple) Functions
// ============================================

/**
 * Vote on a project for main page ranking
 * One vote per address per project
 */
export async function voteOnProjectRanking(
  projectId: string,
  isUpvote: boolean,
  provider: any
): Promise<Hash> {
  console.log("[voteOnProjectRanking] Starting vote", { projectId, isUpvote });

  if (!provider) {
    throw new Error("Wallet provider is required");
  }

  const addresses = await provider.request({ method: 'eth_requestAccounts' });
  const account = addresses[0] as Address;

  const walletClient = createWalletClientFromProvider(provider);
  const contractAddress = getProjectRankingAddress();
  const projectBytes32 = uuidToBytes32(projectId);

  console.log("[voteOnProjectRanking] Contract address:", contractAddress);
  console.log("[voteOnProjectRanking] Project bytes32:", projectBytes32);

  try {
    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi: PROJECT_RANKING_ABI,
      functionName: "voteProject",
      args: [projectBytes32, isUpvote],
      account,
    });

    console.log("[voteOnProjectRanking] Transaction hash:", hash);
    return hash;
  } catch (error: any) {
    console.error("[voteOnProjectRanking] Transaction failed:", error);

    if (error.message?.includes("User rejected")) {
      throw new Error("Transaction was rejected in your wallet.");
    }

    if (error.message?.includes("Already voted")) {
      throw new Error("You have already voted on this project.");
    }

    throw error;
  }
}

/**
 * Get project score from ranking contract
 */
export async function getProjectRankingScore(projectId: string): Promise<bigint> {
  const publicClient = createPublicClientFn();
  const contractAddress = getProjectRankingAddress();
  const projectBytes32 = uuidToBytes32(projectId);

  const score = await publicClient.readContract({
    address: contractAddress,
    abi: PROJECT_RANKING_ABI,
    functionName: "getProjectScore",
    args: [projectBytes32],
  });

  return score as bigint;
}

/**
 * Get full project vote data from ranking contract
 */
export async function getProjectRankingVotes(projectId: string): Promise<{
  totalUpvotes: bigint;
  totalDownvotes: bigint;
  score: bigint;
  exists: boolean;
}> {
  const publicClient = createPublicClientFn();
  const contractAddress = getProjectRankingAddress();
  const projectBytes32 = uuidToBytes32(projectId);

  const result = await publicClient.readContract({
    address: contractAddress,
    abi: PROJECT_RANKING_ABI,
    functionName: "getProjectVotes",
    args: [projectBytes32],
  });

  const [totalUpvotes, totalDownvotes, score, exists] = result as [
    bigint,
    bigint,
    bigint,
    boolean
  ];

  return { totalUpvotes, totalDownvotes, score, exists };
}

/**
 * Check if user has voted on a project
 */
export async function hasUserVotedOnProject(projectId: string, voterAddress: Address): Promise<boolean> {
  const publicClient = createPublicClientFn();
  const contractAddress = getProjectRankingAddress();
  const projectBytes32 = uuidToBytes32(projectId);

  const hasVoted = await publicClient.readContract({
    address: contractAddress,
    abi: PROJECT_RANKING_ABI,
    functionName: "hasVotedOnProject",
    args: [projectBytes32, voterAddress],
  });

  return hasVoted as boolean;
}

// ============================================
// ROADMAPR VOTING (Feature Voting) Functions
// ============================================

/**
 * Register a project for feature voting
 * Sets up which token to use for voting on features within the project
 */
export async function registerProjectForFeatureVoting(
  projectId: string,
  tokenAddress: Address,
  voteIncrement: number,
  provider: any
): Promise<Hash> {
  console.log("[registerProjectForFeatureVoting] Registering project", { projectId, tokenAddress, voteIncrement });

  if (!provider) {
    throw new Error("Wallet provider is required");
  }

  const addresses = await provider.request({ method: 'eth_requestAccounts' });
  const account = addresses[0] as Address;

  const walletClient = createWalletClientFromProvider(provider);
  const contractAddress = getRoadmaprVotingAddress();
  const projectBytes32 = uuidToBytes32(projectId);

  console.log("[registerProjectForFeatureVoting] Contract address:", contractAddress);
  console.log("[registerProjectForFeatureVoting] Project bytes32:", projectBytes32);

  try {
    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi: ROADMAPR_VOTING_ABI,
      functionName: "registerProject",
      args: [projectBytes32, tokenAddress, BigInt(voteIncrement)],
      account,
    });

    console.log("[registerProjectForFeatureVoting] Transaction hash:", hash);
    return hash;
  } catch (error: any) {
    console.error("[registerProjectForFeatureVoting] Transaction failed:", error);

    if (error.message?.includes("User rejected")) {
      throw new Error("Transaction was rejected in your wallet.");
    }

    if (error.message?.includes("Project already exists")) {
      throw new Error("This project is already registered for feature voting.");
    }

    throw error;
  }
}

/**
 * Vote on a feature within a project
 */
export async function voteOnFeature(
  featureId: string,
  projectId: string,
  voteCount: bigint,
  isUpvote: boolean,
  provider: any
): Promise<Hash> {
  console.log("[voteOnFeature] Starting vote", { featureId, projectId, voteCount, isUpvote });

  if (!provider) {
    throw new Error("Wallet provider is required");
  }

  const addresses = await provider.request({ method: 'eth_requestAccounts' });
  const account = addresses[0] as Address;

  const walletClient = createWalletClientFromProvider(provider);
  const contractAddress = getRoadmaprVotingAddress();
  const featureBytes32 = uuidToBytes32(featureId);
  const projectBytes32 = uuidToBytes32(projectId);

  console.log("[voteOnFeature] Contract address:", contractAddress);

  try {
    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi: ROADMAPR_VOTING_ABI,
      functionName: "vote",
      args: [featureBytes32, projectBytes32, voteCount, isUpvote],
      account,
    });

    console.log("[voteOnFeature] Transaction hash:", hash);
    return hash;
  } catch (error: any) {
    console.error("[voteOnFeature] Transaction failed:", error);

    if (error.message?.includes("User rejected")) {
      throw new Error("Transaction was rejected in your wallet.");
    }

    throw error;
  }
}

/**
 * Check if project is registered for feature voting
 */
export async function isProjectRegisteredForFeatureVoting(projectId: string): Promise<boolean> {
  try {
    const publicClient = createPublicClientFn();
    const contractAddress = getRoadmaprVotingAddress();
    const projectBytes32 = uuidToBytes32(projectId);

    const result = await publicClient.readContract({
      address: contractAddress,
      abi: ROADMAPR_VOTING_ABI,
      functionName: "getProject",
      args: [projectBytes32],
    });

    const projectData = result as readonly unknown[];
    const exists = projectData[4] === true;

    return exists;
  } catch (error: any) {
    console.error("[isProjectRegisteredForFeatureVoting] Error:", error);
    return false;
  }
}

// ============================================
// Shared Admin Functions
// ============================================

/**
 * Withdraw platform fees from feature voting contract
 */
export async function withdrawPlatformFeesWithWallet(
  projectId: string,
  provider: any
): Promise<Hash> {
  const addresses = await provider.request({ method: 'eth_requestAccounts' });
  const account = addresses[0] as Address;

  const walletClient = createWalletClientFromProvider(provider);
  const contractAddress = getRoadmaprVotingAddress();
  const projectBytes32 = uuidToBytes32(projectId);

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
 * Get platform fees for a project from feature voting contract
 */
export async function getPlatformFeesOnChain(projectId: string): Promise<bigint> {
  const publicClient = createPublicClientFn();
  const contractAddress = getRoadmaprVotingAddress();
  const projectBytes32 = uuidToBytes32(projectId);

  const fees = await publicClient.readContract({
    address: contractAddress,
    abi: ROADMAPR_VOTING_ABI,
    functionName: "getPlatformFees",
    args: [projectBytes32],
  });

  return fees as bigint;
}

export async function getPlatformFeeRecipient(): Promise<Address> {
  const publicClient = createPublicClientFn();
  const contractAddress = getProjectRankingAddress();

  const recipient = await publicClient.readContract({
    address: contractAddress,
    abi: PROJECT_RANKING_ABI,
    functionName: "platformFeeRecipient",
  });

  return recipient as Address;
}

export async function setPlatformFeeRecipientWithWallet(
  newRecipient: Address,
  provider: any
): Promise<Hash> {
  const addresses = await provider.request({ method: 'eth_requestAccounts' });
  const account = addresses[0] as Address;

  const walletClient = createWalletClientFromProvider(provider);
  const contractAddress = getProjectRankingAddress();

  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: PROJECT_RANKING_ABI,
    functionName: "setPlatformFeeRecipient",
    args: [newRecipient],
    account,
  });

  return hash;
}
