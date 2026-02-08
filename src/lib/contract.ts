/**
 * Smart Contract Integration for Roadmapr
 * Handles interactions with RoadmaprVoting.sol
 */

import { createWalletClient, http, type Address, type Hash } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { uuidToBytes32, createPublicClientFn, baseChain } from "./contract-utils";
import { ROADMAPR_VOTING_ABI } from "./contract-constants";

// Get contract address from env
export function getContractAddress(): Address {
  const address = process.env.NEXT_PUBLIC_ROADMAPR_CONTRACT_ADDRESS;
  if (!address) {
    throw new Error("NEXT_PUBLIC_ROADMAPR_CONTRACT_ADDRESS not set");
  }
  return address as Address;
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
    chain: baseChain,
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
