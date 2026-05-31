import type { FastifyPluginAsync } from "fastify";
import { createPublicClient, http, isAddress, getAddress } from "viem";
import { base } from "viem/chains";

// Local viem clients — intentionally not imported from ../routes/mcp-demos.js so
// this MCP module stays self-contained and independently deployable.
const ETH_RPC = process.env.ETH_RPC_URL ?? "https://ethereum-rpc.publicnode.com";
const BASE_RPC = process.env.BASE_RPC_URL ?? "https://mainnet.base.org";
const BASE_SEPOLIA_RPC =
  process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org";

void ETH_RPC;
void BASE_SEPOLIA_RPC;

const baseClient = createPublicClient({ chain: base, transport: http(BASE_RPC) });

// Uniswap V3 QuoterV2 deployed on Base mainnet.
const QUOTER_V2_BASE = "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a" as const;

// QuoterV2 ABI — quoteExactInputSingle takes a struct param and is non-view in
// V2 (it relies on a revert-and-decode pattern), so we use `simulateContract`
// to read the return values without sending a transaction.
const quoterV2Abi = [
  {
    type: "function",
    name: "quoteExactInputSingle",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "fee", type: "uint24" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "sqrtPriceX96After", type: "uint160" },
      { name: "initializedTicksCrossed", type: "uint32" },
      { name: "gasEstimate", type: "uint256" },
    ],
  },
] as const;

type FeeTier = 500 | 3000 | 10000;

interface UniswapQuoteBody {
  tokenIn?: unknown;
  tokenOut?: unknown;
  amountIn?: unknown;
  fee?: unknown;
  chain?: unknown;
}

const ALLOWED_FEES: ReadonlySet<FeeTier> = new Set<FeeTier>([500, 3000, 10000]);

function isFeeTier(v: unknown): v is FeeTier {
  return (
    typeof v === "number" && ALLOWED_FEES.has(v as FeeTier)
  );
}

function parseAmount(raw: unknown): bigint | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!/^[0-9]+$/.test(trimmed)) return null;
  try {
    const v = BigInt(trimmed);
    if (v <= 0n) return null;
    return v;
  } catch {
    return null;
  }
}

export const uniswapquoteRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: UniswapQuoteBody }>(
    "/mcp/uniswap-quote",
    async (req, reply) => {
      const body: UniswapQuoteBody = req.body ?? {};

      const chain = body.chain ?? "base";
      if (chain !== "base") {
        return reply.code(400).send({
          capability: "uniswap-quote",
          error: "unsupported chain — only 'base' is supported",
        });
      }

      if (typeof body.tokenIn !== "string" || !isAddress(body.tokenIn)) {
        return reply.code(400).send({
          capability: "uniswap-quote",
          error: "invalid tokenIn — must be a checksummed or lowercase EVM address",
        });
      }
      if (typeof body.tokenOut !== "string" || !isAddress(body.tokenOut)) {
        return reply.code(400).send({
          capability: "uniswap-quote",
          error: "invalid tokenOut — must be a checksummed or lowercase EVM address",
        });
      }

      const tokenIn = getAddress(body.tokenIn);
      const tokenOut = getAddress(body.tokenOut);

      if (tokenIn === tokenOut) {
        return reply.code(400).send({
          capability: "uniswap-quote",
          error: "tokenIn and tokenOut must differ",
        });
      }

      const amountIn = parseAmount(body.amountIn);
      if (amountIn === null) {
        return reply.code(400).send({
          capability: "uniswap-quote",
          error:
            "invalid amountIn — must be a positive integer numeric string (raw amount including decimals)",
        });
      }

      let fee: FeeTier = 3000;
      if (body.fee !== undefined) {
        if (!isFeeTier(body.fee)) {
          return reply.code(400).send({
            capability: "uniswap-quote",
            error: "invalid fee — must be 500, 3000, or 10000",
          });
        }
        fee = body.fee;
      }

      try {
        const { result } = await baseClient.simulateContract({
          address: QUOTER_V2_BASE,
          abi: quoterV2Abi,
          functionName: "quoteExactInputSingle",
          args: [
            {
              tokenIn,
              tokenOut,
              amountIn,
              fee,
              sqrtPriceLimitX96: 0n,
            },
          ],
        });

        const [amountOut, sqrtPriceX96After, , gasEstimate] = result;

        return {
          capability: "uniswap-quote",
          chain: "base" as const,
          tokenIn,
          tokenOut,
          fee,
          amountIn: amountIn.toString(),
          amountOut: amountOut.toString(),
          gasEstimate: gasEstimate.toString(),
          sqrtPriceX96After: sqrtPriceX96After.toString(),
          note: "QuoterV2 on Base mainnet at 0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
        };
      } catch (e) {
        const message =
          e instanceof Error
            ? e.message
            : "quoter call reverted — pool may not exist for this pair/fee tier";
        return reply.code(502).send({
          capability: "uniswap-quote",
          error: message,
        });
      }
    }
  );

  fastify.get("/mcp/uniswap-quote", async () => ({
    capability: "uniswap-quote",
    description:
      "Quote an exact-input single-hop swap on Uniswap V3 (Base mainnet) via QuoterV2. Input { tokenIn, tokenOut, amountIn (raw integer string), fee?: 500|3000|10000, chain?: 'base' }. Returns { amountOut, gasEstimate, sqrtPriceX96After } as decimal strings.",
    method: "POST",
  }));
};
