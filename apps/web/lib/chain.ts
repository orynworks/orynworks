import { createPublicClient, http, keccak256, toBytes, type Hex } from "viem";
import { base, baseSepolia } from "viem/chains";
import { CAPABILITY_REGISTRY_ABI, getCapabilityRegistryAddress } from "./contracts";

const BASE_CHAIN_ID = Number(process.env.NEXT_PUBLIC_BASE_CHAIN_ID ?? 8453);
const BASE_SEPOLIA_CHAIN_ID = Number(
  process.env.NEXT_PUBLIC_BASE_SEPOLIA_CHAIN_ID ?? 84532
);

export function slugHash(slug: string): Hex {
  return keccak256(toBytes(slug));
}

export function metadataHash(payload: {
  name: string;
  description: string;
  category: string;
  hostUrl: string;
  version?: string;
}): Hex {
  const canonical = JSON.stringify({
    name: payload.name,
    description: payload.description,
    category: payload.category,
    hostUrl: payload.hostUrl,
    version: payload.version ?? "1.0.0",
  });
  return keccak256(toBytes(canonical));
}

function getPublicClientForChain(chainId: number) {
  if (chainId === BASE_SEPOLIA_CHAIN_ID) {
    return createPublicClient({ chain: baseSepolia, transport: http() });
  }
  if (chainId === BASE_CHAIN_ID) {
    return createPublicClient({ chain: base, transport: http() });
  }
  throw new Error(`Unsupported chain ${chainId}`);
}

export type RegistryVerification =
  | { ok: true; builder: Hex; priceUSDC: bigint; metadataHash: Hex }
  | { ok: false; reason: string };

export async function verifyCapabilityOnChain(args: {
  chainId: number;
  slug: string;
  expectedBuilder: string;
  expectedMetadataHash: Hex;
}): Promise<RegistryVerification> {
  const registry = getCapabilityRegistryAddress(args.chainId);
  if (!registry) {
    return { ok: false, reason: `Registry not configured for chain ${args.chainId}` };
  }

  const client = getPublicClientForChain(args.chainId);
  const hash = slugHash(args.slug);

  try {
    const result = (await client.readContract({
      address: registry,
      abi: CAPABILITY_REGISTRY_ABI,
      functionName: "capabilities",
      args: [hash],
    })) as readonly [Hex, Hex, bigint, number, number, Hex, bigint];

    const [, builder, priceUSDC, , , chainMetadataHash] = result;

    if (builder.toLowerCase() === "0x0000000000000000000000000000000000000000") {
      return { ok: false, reason: "Capability not found on-chain" };
    }
    if (builder.toLowerCase() !== args.expectedBuilder.toLowerCase()) {
      return {
        ok: false,
        reason: `On-chain builder ${builder} does not match session ${args.expectedBuilder}`,
      };
    }
    if (chainMetadataHash.toLowerCase() !== args.expectedMetadataHash.toLowerCase()) {
      return { ok: false, reason: "Metadata hash mismatch" };
    }
    return { ok: true, builder, priceUSDC, metadataHash: chainMetadataHash };
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : "Read failed",
    };
  }
}
