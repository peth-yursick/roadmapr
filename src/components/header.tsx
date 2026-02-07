"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { SubmitFeatureDialog } from "@/components/submit-feature-dialog";
import { Button } from "@/components/ui/button";
import { LogIn, Settings, Wallet } from "lucide-react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggle}
      aria-label="Toggle theme"
      className="text-muted-foreground hover:text-foreground"
    >
      {isDark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </Button>
  );
}

function WalletConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => disconnect()}
        className="gap-1.5 text-xs"
      >
        <Wallet className="w-3 h-3" />
        {address.slice(0, 6)}...{address.slice(-4)}
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      onClick={() => connect({ connector: connectors[0] })}
      disabled={isPending}
      className="gap-1.5"
    >
      <Wallet className="w-4 h-4" />
      {isPending ? "Connecting..." : "Connect Wallet"}
    </Button>
  );
}

export function Header() {
  const { user, isLoading, signIn, walletAddress } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);

  async function handleSignIn() {
    setIsSigningIn(true);
    try {
      await signIn();
    } catch (err: any) {
      console.error("Sign-in failed:", err);
      const errorMsg = err?.message || err?.toString() || "Unknown error";
      alert(`Sign-in failed: ${errorMsg}\n\nTry connecting your wallet instead.`);
    } finally {
      setIsSigningIn(false);
    }
  }

  // Get display text for user
  const getUserDisplay = () => {
    if (walletAddress && user?.fid === 0) {
      // Connected via wallet
      return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
    }
    return user?.username || "User";
  };

  return (
    <header className="border-b border-border/50 sticky top-0 bg-background/80 backdrop-blur-md z-50">
      <div className="max-w-2xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Roadmapr</h1>
            <p className="text-xs text-muted-foreground">Where do we go?</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {!isLoading && user && (
              <>
                <div className="flex items-center gap-2">
                  {user.pfpUrl && (
                    <img
                      src={user.pfpUrl}
                      alt=""
                      className="w-7 h-7 rounded-full"
                    />
                  )}
                  <span className="text-sm text-muted-foreground hidden sm:inline">
                    @{getUserDisplay()}
                  </span>
                </div>
              </>
            )}
            {!isLoading && !user && (
              <>
                <WalletConnectButton />
                <div className="hidden lg:flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSignIn}
                    disabled={isSigningIn}
                    className="gap-1.5 text-xs"
                  >
                    <LogIn className="w-3 h-3" />
                    {isSigningIn ? "Signing in..." : "Sign in with Farcaster"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
        {!isLoading && user && (
          <div className="flex justify-end mt-3">
            <SubmitFeatureDialog onSubmitted={() => window.location.reload()} />
          </div>
        )}
      </div>
    </header>
  );
}
