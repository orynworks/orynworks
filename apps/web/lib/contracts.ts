export const REVENUE_ESCROW_ABI = [
  {
    name: "builderBalance",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "claim",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
] as const;

export const CAPABILITY_REGISTRY_ABI = [
  {
    name: "register",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "slug", type: "bytes32" },
      { name: "priceUSDC", type: "uint256" },
      { name: "capType", type: "uint8" },
      { name: "metadataHash", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    name: "capabilities",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [
      { name: "slug", type: "bytes32" },
      { name: "builder", type: "address" },
      { name: "priceUSDC", type: "uint256" },
      { name: "capType", type: "uint8" },
      { name: "status", type: "uint8" },
      { name: "metadataHash", type: "bytes32" },
      { name: "createdAt", type: "uint256" },
    ],
  },
] as const;

export const USDC_DECIMALS = 6;

export const CAP_TYPE = { skill: 0, knowledge: 1 } as const;

const BASE_CHAIN_ID = Number(process.env.NEXT_PUBLIC_BASE_CHAIN_ID ?? 8453);
const BASE_SEPOLIA_CHAIN_ID = Number(
  process.env.NEXT_PUBLIC_BASE_SEPOLIA_CHAIN_ID ?? 84532
);

export function getRevenueEscrowAddress(
  chainId: number | undefined
): `0x${string}` | null {
  if (chainId === BASE_SEPOLIA_CHAIN_ID) {
    const addr = process.env.NEXT_PUBLIC_REVENUE_ESCROW_TESTNET;
    return addr && addr.startsWith("0x") ? (addr as `0x${string}`) : null;
  }
  if (chainId === BASE_CHAIN_ID) {
    const addr = process.env.NEXT_PUBLIC_REVENUE_ESCROW_MAINNET;
    return addr && addr.startsWith("0x") ? (addr as `0x${string}`) : null;
  }
  return null;
}

export function getCapabilityRegistryAddress(
  chainId: number | undefined
): `0x${string}` | null {
  if (chainId === BASE_SEPOLIA_CHAIN_ID) {
    const addr = process.env.NEXT_PUBLIC_CAPABILITY_REGISTRY_TESTNET;
    return addr && addr.startsWith("0x") ? (addr as `0x${string}`) : null;
  }
  if (chainId === BASE_CHAIN_ID) {
    const addr = process.env.NEXT_PUBLIC_CAPABILITY_REGISTRY_MAINNET;
    return addr && addr.startsWith("0x") ? (addr as `0x${string}`) : null;
  }
  return null;
}

export function getUsdcAddress(
  chainId: number | undefined
): `0x${string}` | null {
  if (chainId === BASE_SEPOLIA_CHAIN_ID) {
    const addr = process.env.NEXT_PUBLIC_USDC_TESTNET;
    return addr && addr.startsWith("0x") ? (addr as `0x${string}`) : null;
  }
  if (chainId === BASE_CHAIN_ID) {
    const addr = process.env.NEXT_PUBLIC_USDC_MAINNET;
    return addr && addr.startsWith("0x") ? (addr as `0x${string}`) : null;
  }
  return null;
}

export function formatUsdc(amount: bigint): string {
  const divisor = 10n ** BigInt(USDC_DECIMALS);
  const whole = amount / divisor;
  const fraction = amount % divisor;
  const fracStr = fraction.toString().padStart(USDC_DECIMALS, "0").slice(0, 4);
  return `${whole}.${fracStr}`;
}
