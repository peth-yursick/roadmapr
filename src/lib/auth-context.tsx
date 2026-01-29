"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import sdk from "@farcaster/miniapp-sdk";

interface User {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthorizedMarker: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthorizedMarker: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorizedMarker, setIsAuthorizedMarker] = useState(false);

  useEffect(() => {
    async function init() {
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
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthorizedMarker }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
