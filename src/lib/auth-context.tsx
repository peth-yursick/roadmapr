"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import sdk from "@farcaster/miniapp-sdk";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useConnectorClient } from "wagmi";
import type { UserInfo, WalletProvider } from "@/types/contracts";

interface AuthContextType {
  user: UserInfo | null;
  isLoading: boolean;
  isAuthorizedMarker: boolean;
  walletProvider: WalletProvider | null;
  walletAddress: string | null;
  signIn: () => Promise<void>;
  setWalletUser: (address: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthorizedMarker: false,
  walletProvider: null,
  walletAddress: null,
  signIn: async () => {},
  setWalletUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorizedMarker, setIsAuthorizedMarker] = useState(false);
  const [walletProvider, setWalletProvider] = useState<WalletProvider | null>(null);
  const { ready, authenticated, login, user: privyUser } = usePrivy();

  // Wagmi hooks for standard wallet connection
  const { address, isConnected: isWagmiConnected } = useAccount();
  const { data: wagmiWalletClient } = useConnectorClient();

  // Sign-in function for web users (Privy-based)
  const signIn = async () => {
    try {
      await login();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[Auth] Sign-in error:", message);
      throw error;
    }
  };

  // Set user from standard wallet connection (MetaMask, etc.)
  const setWalletUser = (walletAddress: string) => {
    // Set cookie for server-side authentication
    document.cookie = `wallet_address=${walletAddress}; path=/; max-age=604800`; // 7 days

    const userData: UserInfo = {
      fid: 0, // No FID for wallet-only users
      username: walletAddress.slice(0, 8),
      displayName: walletAddress.slice(0, 8),
      pfpUrl: "",
      custodyAddress: walletAddress,
    };
    setUser(userData);
    setIsAuthorizedMarker(false);
  };

  // Update wallet provider when wagmi client changes
  useEffect(() => {
    if (wagmiWalletClient && isWagmiConnected && address) {
      setWalletProvider(wagmiWalletClient as unknown as WalletProvider);
      setWalletUser(address);
    }
  }, [wagmiWalletClient, isWagmiConnected, address]);

  useEffect(() => {
    async function init() {

      // If user is connected via wagmi, prioritize that
      if (isWagmiConnected && address) {
        setWalletUser(address);
        setIsLoading(false);
        return;
      }

      // If not ready, wait for Privy to initialize
      if (!ready) {
        return;
      }

      // Check if user is authenticated via Privy
      if (authenticated && privyUser) {
        // Extract Farcaster account from Privy user
        const farcasterAccount = privyUser.linkedAccounts.find(
          (account) => account.type === "farcaster"
        ) as { type: "farcaster"; fid: number; username?: string; displayName?: string; pfpUrl?: string } | undefined;

        // Set user data - prefer Farcaster account if available, otherwise use email/wallet
        if (farcasterAccount) {
          const userData: UserInfo = {
            fid: farcasterAccount.fid,
            username: farcasterAccount.username || `fid:${farcasterAccount.fid}`,
            displayName: farcasterAccount.displayName || farcasterAccount.username || `fid:${farcasterAccount.fid}`,
            pfpUrl: farcasterAccount.pfpUrl || "",
            custodyAddress: privyUser.wallet?.address,
          };
          setUser(userData);

          const markerFids = process.env.NEXT_PUBLIC_AUTHORIZED_MARKER_FIDS?.split(",").map(Number) || [];
          setIsAuthorizedMarker(markerFids.includes(userData.fid));
        } else {
          // Web-only login (email/wallet) - create user without Farcaster
          const emailAccount = privyUser.linkedAccounts.find(
            (account) => account.type === "email"
          ) as { type: "email"; address: string } | undefined;
          const walletAccount = privyUser.linkedAccounts.find(
            (account) => account.type === "wallet"
          ) as { type: "wallet"; address: string } | undefined;

          const userData: UserInfo = {
            fid: 0, // No FID for web-only users
            username: emailAccount?.address || walletAccount?.address?.slice(0, 8) || "web-user",
            displayName: emailAccount?.address || walletAccount?.address?.slice(0, 8) || "Web User",
            pfpUrl: "",
            custodyAddress: privyUser.wallet?.address,
          };
          setUser(userData);

          // Web-only users are not authorized markers
          setIsAuthorizedMarker(false);
        }

        setIsLoading(false);
        return;
      }

      // Fallback: try Farcaster miniapp SDK
      try {
        const context = await sdk.context;

        if (context?.user) {
          const farcasterUser = context.user;
          const userData: UserInfo = {
            fid: farcasterUser.fid,
            username: farcasterUser.username || `fid:${farcasterUser.fid}`,
            displayName: farcasterUser.displayName || farcasterUser.username || `fid:${farcasterUser.fid}`,
            pfpUrl: farcasterUser.pfpUrl || "",
          };
          setUser(userData);

          const markerFids = process.env.NEXT_PUBLIC_AUTHORIZED_MARKER_FIDS?.split(",").map(Number) || [];
          setIsAuthorizedMarker(markerFids.includes(userData.fid));

          // Get wallet provider
          try {
            const provider = await sdk.wallet.getEthereumProvider();
            if (provider) {
              setWalletProvider(provider as unknown as WalletProvider);
            }
          } catch (walletError) {
            console.error("Failed to get wallet provider:", walletError);
          }

          sdk.actions.ready();
          setIsLoading(false);
          return;
        }
      } catch (error) {
        console.error("Failed to initialize Farcaster context:", error);
      }

      // Not in Farcaster context - use mock user in development
      if (process.env.NODE_ENV === "development") {
        const mockUser: UserInfo = {
          fid: 1,
          username: "dev-user",
          displayName: "Dev User",
          pfpUrl: "",
        };
        setUser(mockUser);
        setIsAuthorizedMarker(true);
      }
      setIsLoading(false);
    }

    init();
  }, [ready, authenticated, privyUser, isWagmiConnected, address]);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthorizedMarker, walletProvider, walletAddress: address || null, signIn, setWalletUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
