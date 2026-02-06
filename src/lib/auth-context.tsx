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

interface User {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
  custodyAddress?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthorizedMarker: boolean;
  walletProvider: any; // Wallet provider from Farcaster SDK
  signIn: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthorizedMarker: false,
  walletProvider: null,
  signIn: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorizedMarker, setIsAuthorizedMarker] = useState(false);
  const [walletProvider, setWalletProvider] = useState<any>(null);
  const { ready, authenticated, login, user: privyUser, getEthereumProvider } = usePrivy();

  // Sign-in function for web users
  const signIn = async () => {
    try {
      console.log("[Auth] Starting Privy login...");
      console.log("[Auth] Privy ready:", ready);
      console.log("[Auth] Privy authenticated:", authenticated);
      await login();
      console.log("[Auth] Privy login successful");
    } catch (error: any) {
      console.error("[Auth] Sign-in error:", error);
      console.error("[Auth] Error details:", {
        name: error?.name,
        message: error?.message,
        code: error?.code,
        stack: error?.stack
      });
      throw error;
    }
  };

  useEffect(() => {
    async function init() {
      console.log("[Auth] Initializing auth state...");
      console.log("[Auth] Privy ready:", ready);
      console.log("[Auth] Privy authenticated:", authenticated);

      // If not ready, wait for Privy to initialize
      if (!ready) {
        console.log("[Auth] Waiting for Privy to be ready...");
        return;
      }

      // Check if user is authenticated via Privy
      if (authenticated && privyUser) {
        console.log("[Auth] User authenticated via Privy:", privyUser);
        // Extract Farcaster account from Privy user
        const farcasterAccount = privyUser.linkedAccounts.find(
          (account: any) => account.type === "farcaster"
        );

        if (farcasterAccount) {
          const userData: User = {
            fid: farcasterAccount.fid,
            username: farcasterAccount.username || `fid:${farcasterAccount.fid}`,
            displayName: farcasterAccount.displayName || farcasterAccount.username || `fid:${farcasterAccount.fid}`,
            pfpUrl: farcasterAccount.pfpUrl || "",
            custodyAddress: privyUser.wallet?.address,
          };
          setUser(userData);

          const markerFids = process.env.NEXT_PUBLIC_AUTHORIZED_MARKER_FIDS?.split(",").map(Number) || [];
          setIsAuthorizedMarker(markerFids.includes(userData.fid));

          // Get wallet provider from Privy
          try {
            const provider = await getEthereumProvider();
            setWalletProvider(provider);
          } catch (e) {
            console.log("No wallet provider from Privy");
          }

          setIsLoading(false);
          return;
        }
      }

      // Fallback: try Farcaster miniapp SDK
      try {
        const context = await sdk.context;

        if (context?.user) {
          const farcasterUser = context.user;
          const userData: User = {
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
            setWalletProvider(provider);
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
        const mockUser: User = {
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
  }, [ready, authenticated, privyUser, getEthereumProvider]);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthorizedMarker, walletProvider, signIn }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
