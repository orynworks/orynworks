import type { FastifyPluginAsync } from "fastify";
import {
  createPublicClient,
  http,
  isAddress,
  getAddress,
  formatUnits,
  erc20Abi,
  type Address,
  type PublicClient,
} from "viem";
import { base, mainnet } from "viem/chains";

// Wallet portfolio MCP capability — returns native ETH + common ERC-20
// balances on Base or Ethereum mainnet via a single multicall. USD pricing
// is intentionally out of scope; callers compose this with `token-price`.

const ETH_RPC = process.env.ETH_RPC_URL ?? "https://ethereum-rpc.publicnode.com";
const BASE_RPC = process.env.BASE_RPC_URL ?? "https://mainnet.base.org";
const BASE_SEPOLIA_RPC =
  process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org";

const ethClient = createPublicClient({ chain: mainnet, transport: http(ETH_RPC) });
const baseClient = createPublicClient({ chain: base, transport: http(BASE_RPC) });
// baseSepoliaClient is intentionally not constructed here — the portfolio
// endpoint is mainnet/Base-only. Keeping the RPC env honored for parity.
void BASE_SEPOLIA_RPC;

type SupportedChain = "base" | "ethereum";

interface TokenSpec {
  symbol: string;
  address: Address;
  decimals: number;
}

interface PortfolioBody {
  address?: unknown;
  chain?: unknown;
}

interface PortfolioToken {
  symbol: string;
  address: Address;
  balanceRaw: string;
  balanceFormatted: string;
  decimals: number;
}

const BASE_TOKENS: TokenSpec[] = [
  {
    symbol: "USDC",
    address: getAddress("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"),
    decimals: 6,
  },
  {
    symbol: "WETH",
    address: getAddress("0x4200000000000000000000000000000000000006"),
    decimals: 18,
  },
  {
    symbol: "cbETH",
    address: getAddress("0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22"),
    decimals: 18,
  },
  {
    symbol: "AERO",
    address: getAddress("0x940181a94A35A4569E4529A3CDfB74e38FD98631"),
    decimals: 18,
  },
  {
    symbol: "USDbC",
    address: getAddress("0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA"),
    decimals: 6,
  },
];

const ETHEREUM_TOKENS: TokenSpec[] = [
  {
    symbol: "USDC",
    address: getAddress("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"),
    decimals: 6,
  },
  {
    symbol: "USDT",
    address: getAddress("0xdAC17F958D2ee523a2206206994597C13D831ec7"),
    decimals: 6,
  },
  {
    symbol: "WETH",
    address: getAddress("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"),
    decimals: 18,
  },
  {
    symbol: "DAI",
    address: getAddress("0x6B175474E89094C44Da98b954EedeAC495271d0F"),
    decimals: 18,
  },
  {
    symbol: "WBTC",
    address: getAddress("0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599"),
    decimals: 8,
  },
];

function pickChain(input: unknown): SupportedChain {
  if (input === "ethereum") return "ethereum";
  if (input === "base") return "base";
  return "base";
}

function clientFor(chain: SupportedChain): PublicClient {
  return (chain === "ethereum" ? ethClient : baseClient) as PublicClient;
}

function tokensFor(chain: SupportedChain): TokenSpec[] {
  return chain === "ethereum" ? ETHEREUM_TOKENS : BASE_TOKENS;
}

export const walletportfolioRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: PortfolioBody }>(
    "/mcp/wallet-portfolio",
    async (req, reply) => {
      const body = (req.body ?? {}) as PortfolioBody;
      const rawAddress = typeof body.address === "string" ? body.address.trim() : "";
      if (!rawAddress || !isAddress(rawAddress)) {
        return reply.code(400).send({
          capability: "wallet-portfolio",
          error:
            "missing or invalid `address` — provide a 0x-prefixed EVM address",
        });
      }

      const address = getAddress(rawAddress);
      const network = pickChain(body.chain);
      const client = clientFor(network);
      const tokens = tokensFor(network);

      try {
        const ethBalanceRaw = await client.getBalance({ address });

        const multicallResults = await client.multicall({
          allowFailure: true,
          contracts: tokens.map((t) => ({
            address: t.address,
            abi: erc20Abi,
            functionName: "balanceOf" as const,
            args: [address] as const,
          })),
        });

        const tokenRows: PortfolioToken[] = [];
        for (let i = 0; i < tokens.length; i++) {
          const spec = tokens[i]!;
          const res = multicallResults[i]!;
          if (res.status !== "success") continue;
          const raw = res.result as bigint;
          if (raw === 0n) continue;
          tokenRows.push({
            symbol: spec.symbol,
            address: spec.address,
            balanceRaw: raw.toString(),
            balanceFormatted: formatUnits(raw, spec.decimals),
            decimals: spec.decimals,
          });
        }

        return {
          capability: "wallet-portfolio",
          address,
          network,
          ethBalance: ethBalanceRaw.toString(),
          ethBalanceFormatted: formatUnits(ethBalanceRaw, 18),
          tokens: tokenRows,
          note: "USD values not computed in this endpoint — use token-price for valuation",
        };
      } catch (e) {
        return reply.code(502).send({
          capability: "wallet-portfolio",
          error: e instanceof Error ? e.message : "rpc call failed",
        });
      }
    }
  );

  fastify.get("/mcp/wallet-portfolio", async () => ({
    capability: "wallet-portfolio",
    description:
      "Native ETH + common ERC-20 balances for a wallet on Base (default) or Ethereum mainnet. Single multicall, zero-balance tokens omitted. USD valuation is out of scope — compose with token-price.",
    method: "POST",
    schema: {
      input: '{ address: "0x...", chain?: "base" | "ethereum" }',
      output:
        "{ capability, address, network, ethBalance, ethBalanceFormatted, tokens: [{ symbol, address, balanceRaw, balanceFormatted, decimals }], note }",
    },
  }));
};
