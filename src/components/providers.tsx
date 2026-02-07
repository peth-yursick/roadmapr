"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import * as React from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "@/lib/wagmi";
import { VotingProvider } from "@/lib/voting-context";

const queryClient = new QueryClient();

function WalletProviders({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <VotingProvider>
          {children}
        </VotingProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  // Wrap with wallet providers first
  const content = <WalletProviders>{children}</WalletProviders>;

  // If no Privy App ID is configured, don't use PrivyProvider
  // This allows the app to work in development without Privy
  if (!privyAppId || privyAppId === "your-privy-app-id-here") {
    return <>{content}</>;
  }

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#6366f1",
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: "all-users",
          },
        },
      }}
    >
      {content}
    </PrivyProvider>
  );
}
