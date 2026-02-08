/**
 * Shared Smart Contract Utilities
 * Common functions used across contract integration files
 */

import { createPublicClient, http, defineChain, type Address } from "viem";

// Base chain configuration
export const baseChain = defineChain({
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

/**
 * Convert UUID to bytes32 format for Solidity
 * Removes hyphens and pads with zeros to 64 characters (32 bytes)
 */
export function uuidToBytes32(uuid: string): `0x${string}` {
  const clean = uuid.replace(/-/g, "");
  return `0x${clean.padEnd(64, "0")}` as `0x${string}`;
}

/**
 * Get RPC URL from environment or use default
 */
export function getRpcUrl(): string {
  return process.env.NEXT_PUBLIC_RPC_URL || "https://mainnet.base.org";
}

/**
 * Create a public client for reading from the blockchain
 */
export function createPublicClientFn() {
  return createPublicClient({
    chain: baseChain,
    transport: http(),
  });
}
