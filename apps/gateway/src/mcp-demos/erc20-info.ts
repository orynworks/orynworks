import type { FastifyPluginAsync } from "fastify";
import {
  createPublicClient,
  http,
  isAddress,
  getAddress,
  formatUnits,
} from "viem";
import { base, mainnet } from "viem/chains";

// MCP capability: erc20-info
// Reads ERC-20 metadata (name, symbol, decimals, totalSupply) in a single
// multicall on Base mainnet or Ethereum mainnet.

interface Erc20InfoBody {
  address?: unknown;
  chain?: unknown;
}

type SupportedChain = "base" | "ethereum";

const CAPABILITY = "erc20-info";

const ETH_RPC =
  process.env.ETH_RPC_URL ?? "https://ethereum-rpc.publicnode.com";
const BASE_RPC = process.env.BASE_RPC_URL ?? "https://mainnet.base.org";

const ethClient = createPublicClient({
  chain: mainnet,
  transport: http(ETH_RPC),
});
const baseClient = createPublicClient({
  chain: base,
  transport: http(BASE_RPC),
});

const ERC20_ABI = [
  {
    type: "function",
    name: "name",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;

export const erc20infoRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: Erc20InfoBody }>(
    "/mcp/erc20-info",
    async (req, reply) => {
      const body = (req.body ?? {}) as Erc20InfoBody;

      const rawAddress =
        typeof body.address === "string" ? body.address.trim() : "";
      if (!rawAddress) {
        return reply.code(502).send({
          capability: CAPABILITY,
          error: "missing required field: address",
        });
      }
      if (!isAddress(rawAddress)) {
        return reply.code(502).send({
          capability: CAPABILITY,
          error: "address is not a valid EVM address",
        });
      }
      const address = getAddress(rawAddress);

      const rawChain =
        typeof body.chain === "string" ? body.chain.toLowerCase() : "base";
      if (rawChain !== "base" && rawChain !== "ethereum") {
        return reply.code(502).send({
          capability: CAPABILITY,
          error: "chain must be 'base' or 'ethereum'",
        });
      }
      const network: SupportedChain = rawChain;
      const client = network === "base" ? baseClient : ethClient;
      const chainId = network === "base" ? base.id : mainnet.id;

      try {
        const results = await client.multicall({
          allowFailure: false,
          contracts: [
            { address, abi: ERC20_ABI, functionName: "name" },
            { address, abi: ERC20_ABI, functionName: "symbol" },
            { address, abi: ERC20_ABI, functionName: "decimals" },
            { address, abi: ERC20_ABI, functionName: "totalSupply" },
          ],
        });

        const [name, symbol, decimals, totalSupply] = results as [
          string,
          string,
          number,
          bigint,
        ];

        const totalSupplyFormatted = formatUnits(totalSupply, decimals);

        return {
          capability: CAPABILITY,
          address,
          network,
          chainId,
          name,
          symbol,
          decimals,
          totalSupply: totalSupply.toString(),
          totalSupplyFormatted,
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "erc20 multicall failed";
        return reply.code(502).send({
          capability: CAPABILITY,
          error: message,
        });
      }
    },
  );

  fastify.get("/mcp/erc20-info", async () => ({
    capability: CAPABILITY,
    description:
      "Reads ERC-20 metadata (name, symbol, decimals, totalSupply) via a single multicall. Body: { address: string (required, EVM address), chain?: 'base' | 'ethereum' (default 'base') }.",
    method: "POST",
  }));
};
