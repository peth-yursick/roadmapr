/**
 * Frontend Smart Contract Integration for Roadmapr
 * Client-side functions using Farcaster miniapp wallet provider
 */

import { createWalletClient, createPublicClient, http, custom, type Address, type Hash } from "viem";
import { defineChain } from "viem";

// Contract ABI (functions we use from client)
const ROADMAPR_VOTING_ABI = [
  // Project registration
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
  if (!provider) {
    throw new Error("Provider is required");
  }

  console.log("[createWalletClientFromProvider] Provider type:", typeof provider);
  console.log("[createWalletClientFromProvider] Provider keys:", Object.keys(provider));

  // Check if provider has the expected methods
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
 * Register a new project in the smart contract
 * @param projectId - Project UUID
 * @param tokenAddress - Token address to use for voting (e.g., $ROAD)
 * @param voteIncrement - Amount of tokens per vote (e.g., 1 million)
 * @param provider - Wallet provider (e.g., from Farcaster SDK)
 * @returns Transaction hash
 */
export async function registerProject(
  projectId: string,
  tokenAddress: Address,
  voteIncrement: number,
  provider: any
): Promise<Hash> {
  console.log("[registerProject] Registering project", { projectId, tokenAddress, voteIncrement });

  if (!provider) {
    throw new Error("Wallet provider is required");
  }

  // Get account address from provider first
  const addresses = await provider.request({ method: 'eth_requestAccounts' });
  const account = addresses[0] as Address;

  const walletClient = createWalletClientFromProvider(provider);
  const contractAddress = getContractAddress();
  const projectBytes32 = uuidToBytes32(projectId);

  console.log("[registerProject] Contract address:", contractAddress);
  console.log("[registerProject] Project bytes32:", projectBytes32);

  try {
    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi: ROADMAPR_VOTING_ABI,
      functionName: "registerProject",
      args: [projectBytes32, tokenAddress, BigInt(voteIncrement)],
      account,
    });

    console.log("[registerProject] Transaction hash:", hash);
    return hash;
  } catch (error: any) {
    console.error("[registerProject] Transaction failed:", error);

    // Provide better error messages
    if (error.message?.includes("User rejected")) {
      throw new Error("Transaction was rejected in your wallet.");
    }

    if (error.message?.includes("Project already exists")) {
      throw new Error("This project is already registered in the smart contract.");
    }

    throw error;
  }
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
  console.log("[voteOnProject] Starting vote", { projectId, voteAmount, isUpvote });

  if (!provider) {
    throw new Error("Wallet provider is required");
  }

  // Check if project exists in the smart contract first
  const projectExists = await getProjectExistsOnChain(projectId);
  if (!projectExists) {
    throw new Error("This project hasn't been registered in the voting contract yet. Please contact the project owner to register it.");
  }

  // Get account address from provider first
  let account: Address;
  try {
    // Try to get addresses from provider's request method
    const addresses = await provider.request({ method: 'eth_requestAccounts' });
    account = addresses[0] as Address;
    console.log("[voteOnProject] Got account from provider:", account);
  } catch (error) {
    console.error("[voteOnProject] Failed to get account from provider:", error);
    throw new Error("Failed to get wallet address. Please connect your wallet.");
  }

  const walletClient = createWalletClientFromProvider(provider);
  const contractAddress = getContractAddress();
  const projectBytes32 = uuidToBytes32(projectId);

  console.log("[voteOnProject] Contract address:", contractAddress);
  console.log("[voteOnProject] Project bytes32:", projectBytes32);

  try {
    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi: ROADMAPR_VOTING_ABI,
      functionName: "voteProject",
      args: [projectBytes32, voteAmount, isUpvote],
      account,
    });

    console.log("[voteOnProject] Transaction hash:", hash);
    return hash;
  } catch (error: any) {
    console.error("[voteOnProject] Transaction failed:", error);

    // Provide better error messages
    if (error.message?.includes("User rejected")) {
      throw new Error("Transaction was rejected in your wallet.");
    }

    if (error.message?.includes("execution reverted") || error.data?.startsWith("0x")) {
      throw new Error("Transaction failed. The project may not be properly configured in the smart contract, or you may need to approve $ROAD token spending first.");
    }

    throw error;
  }
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
 * Check if a project exists in the smart contract
 */
export async function getProjectExistsOnChain(projectId: string): Promise<boolean> {
  try {
    const publicClient = createPublicClientFn();
    const contractAddress = getContractAddress();
    const projectBytes32 = uuidToBytes32(projectId);

    console.log("[getProjectExistsOnChain] Calling projects() with:", { contractAddress, projectBytes32 });

    const result = await publicClient.readContract({
      address: contractAddress,
      abi: ROADMAPR_VOTING_ABI,
      functionName: "projects",
      args: [projectBytes32],
    });

    console.log("[getProjectExistsOnChain] Raw result:", result);
    console.log("[getProjectExistsOnChain] Result type:", typeof result);
    console.log("[getProjectExistsOnChain] Result keys:", Object.keys(result || {}));

    // viem returns a tuple when there are named outputs
    // [tokenAddress, owner, voteIncrement, totalFeesCollected, totalUpvotes, totalDownvotes, exists]
    const projectData = result as readonly unknown[];

    // The exists flag is the last element (index 6)
    const exists = projectData[6] === true;

    console.log("[getProjectExistsOnChain] Parsed data:", {
      projectId,
      exists,
      tokenAddress: projectData[0],
      owner: projectData[1],
      voteIncrement: projectData[2],
      totalUpvotes: projectData[4],
      totalDownvotes: projectData[5]
    });

    return exists;
  } catch (error: any) {
    console.error("[getProjectExistsOnChain] Contract read error:", {
      name: error?.name,
      message: error?.message,
      shortMessage: error?.shortMessage,
      cause: error?.cause,
      fullError: error
    });

    // If we get a PositionOutOfBoundsError or other data errors, the project doesn't exist
    if (error.name === 'PositionOutOfBoundsError' || error.message?.includes('out of bounds')) {
      console.log("[getProjectExistsOnChain] Project not registered in contract:", projectId);
      return false;
    }

    // For any other error, also return false (project doesn't exist)
    console.log("[getProjectExistsOnChain] Returning false due to error");
    return false;
  }
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
  // Get account address from provider first
  const addresses = await provider.request({ method: 'eth_requestAccounts' });
  const account = addresses[0] as Address;

  const walletClient = createWalletClientFromProvider(provider);
  const contractAddress = getContractAddress();
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
  // Get account address from provider first
  const addresses = await provider.request({ method: 'eth_requestAccounts' });
  const account = addresses[0] as Address;

  const walletClient = createWalletClientFromProvider(provider);
  const contractAddress = getContractAddress();

  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: ROADMAPR_VOTING_ABI,
    functionName: "setPlatformFeeRecipient",
    args: [newRecipient],
    account,
  });

  return hash;
}
