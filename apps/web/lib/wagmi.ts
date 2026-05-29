"use client";

import { http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
  console.warn(
    "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set — WalletConnect will fail. Get one from https://cloud.walletconnect.com"
  );
}

const baseRpc = process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org";
const baseSepoliaRpc =
  process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";

export const wagmiConfig = getDefaultConfig({
  appName: "Oryn Works",
  projectId: projectId ?? "missing-project-id",
  chains: [base, baseSepolia],
  transports: {
    [base.id]: http(baseRpc),
    [baseSepolia.id]: http(baseSepoliaRpc),
  },
  ssr: true,
});
