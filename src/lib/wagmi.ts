import { http, createConfig } from "wagmi";
import { base, mainnet } from "viem/chains";
import { injected, walletConnect } from "wagmi/connectors";

export const wagmiConfig = createConfig({
  chains: [base, mainnet],
  connectors: [
    injected(),
    walletConnect({
      projectId: "YOUR_WALLETCONNECT_PROJECT_ID", // Optional: Get from https://cloud.walletconnect.com
      showQrModal: false,
    }),
  ],
  transports: {
    [base.id]: http(),
    [mainnet.id]: http(),
  },
  ssr: true,
});
