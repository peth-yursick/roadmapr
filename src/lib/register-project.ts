import { registerProject as registerProjectOnChain, uuidToBytes32 } from "./contract-client";
import { useAuth } from "./auth-context";

/**
 * Register a project in the smart contract
 * This should be called when a new project is created to enable voting
 *
 * @param projectId - The project UUID
 * @returns Object with success status and error message if failed
 */
export async function registerProjectInContract(
  projectId: string,
  provider: any
): Promise<{ success: boolean; error?: string; txHash?: string }> {
  // $ROAD token on Base
  const ROAD_TOKEN_ADDRESS = "0xc7aaba6e953a1c0436295cfaaa9b3ab475eb07" as const;
  const VOTE_INCREMENT = 1_000_000; // 1 million tokens

  try {
    // Register project in smart contract
    const txHash = await registerProjectOnChain(
      projectId,
      ROAD_TOKEN_ADDRESS,
      VOTE_INCREMENT,
      provider
    );

    // Record registration in database
    const res = await fetch(`/api/projects/${projectId}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        txHash,
        tokenAddress: ROAD_TOKEN_ADDRESS,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to record registration in database");
    }

    return { success: true, txHash };
  } catch (error: any) {
    console.error("[registerProjectInContract] Failed:", error);
    return {
      success: false,
      error: error.message || "Failed to register project in smart contract"
    };
  }
}

/**
 * Hook to register a project in the smart contract
 * Returns a function that can be called with a project ID
 */
export function useRegisterProject() {
  const { walletProvider } = useAuth();

  return async (projectId: string) => {
    if (!walletProvider) {
      return {
        success: false,
        error: "Wallet not connected. Please open in Farcaster miniapp."
      };
    }

    return registerProjectInContract(projectId, walletProvider);
  };
}
