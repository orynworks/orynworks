import type { FastifyPluginAsync } from "fastify";
import { createPublicClient, http } from "viem";
import { base, baseSepolia } from "viem/chains";

// Local viem clients for this capability module. Kept independent of
// ../routes/mcp-demos.ts so the file is self-contained and can be lifted
// into its own service later without untangling shared singletons.
const BASE_RPC = process.env.BASE_RPC_URL ?? "https://mainnet.base.org";
const BASE_SEPOLIA_RPC =
  process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org";

const baseClient = createPublicClient({ chain: base, transport: http(BASE_RPC) });
const baseSepoliaClient = createPublicClient({
  chain: baseSepolia,
  transport: http(BASE_SEPOLIA_RPC),
});

type BaseGasBody = {
  network?: "mainnet" | "sepolia";
};

export const basegasRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: BaseGasBody }>(
    "/mcp/base-gas",
    async (req, reply) => {
      const body = (req.body ?? {}) as BaseGasBody;
      const network: "mainnet" | "sepolia" =
        body.network === "sepolia" ? "sepolia" : "mainnet";

      try {
        const client = network === "mainnet" ? baseClient : baseSepoliaClient;
        const chainId = network === "mainnet" ? base.id : baseSepolia.id;

        const [gasPrice, block] = await Promise.all([
          client.getGasPrice(),
          client.getBlock({ blockTag: "latest" }),
        ]);

        const baseFeePerGas = block.baseFeePerGas ?? 0n;

        const gasPriceGwei = Number(gasPrice) / 1e9;
        const baseFeeGwei = Number(baseFeePerGas) / 1e9;
        const priorityFeeGweiRaw = gasPriceGwei - baseFeeGwei;
        const priorityFeeGwei = priorityFeeGweiRaw < 0 ? 0 : priorityFeeGweiRaw;
        const suggestedTotalGwei = gasPriceGwei * 1.1;

        return {
          capability: "base-gas",
          network,
          chainId,
          blockNumber: Number(block.number ?? 0n),
          baseFeeGwei,
          gasPriceGwei,
          priorityFeeGwei,
          suggestedTotalGwei,
        };
      } catch (e) {
        return reply.code(502).send({
          capability: "base-gas",
          error: e instanceof Error ? e.message : "rpc call failed",
        });
      }
    }
  );

  fastify.get("/mcp/base-gas", async () => ({
    capability: "base-gas",
    description:
      "Current gas conditions on Base mainnet or Sepolia: base fee, gas price, priority fee, and a 10% buffered suggested total (all in gwei). Use { network: 'mainnet'|'sepolia' }; defaults to mainnet.",
    method: "POST",
  }));
};
