import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { wallet, capability, type NewCapability } from "./schema.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL not set. Export it or create .env in packages/db.");
  process.exit(1);
}

// Seed builder address — recognisable, not a real wallet.
const SEED_BUILDER_ADDRESS = "0x000000000000000000000000000000000000d0ed";

// Host URL of the built-in demo capabilities. In dev this is the local gateway.
// In production these will be re-pointed to the deployed gateway URL.
const DEMO_HOST = process.env.MCP_DEMO_HOST ?? "http://localhost:4000/mcp";

type SeedCapability = Omit<NewCapability, "builderId">;

const SAMPLES: SeedCapability[] = [
  {
    slug: "echo-debug",
    type: "skill",
    name: "Echo Debug",
    description:
      "Lightweight diagnostic capability that mirrors any input back with a server-generated timestamp and request id.\n\nUse it to verify the install → call → settle loop end-to-end before plugging in real logic.",
    category: "utility",
    hostUrl: `${DEMO_HOST}/echo`,
    priceUsdc: "0",
    tokenGated: false,
    status: "published",
    version: "1.0.0",
  },
  {
    slug: "base-live-block",
    type: "skill",
    name: "Base Live Block",
    description:
      "Real-time block info for Base mainnet (chainId 8453) or Base Sepolia (84532). Returns block number, hash, timestamp, and transaction count.\n\nUseful for agents that need to time on-chain actions or display chain health.",
    category: "data",
    hostUrl: `${DEMO_HOST}/base-block`,
    priceUsdc: "0",
    tokenGated: false,
    status: "published",
    version: "1.0.0",
  },
  {
    slug: "ens-resolver",
    type: "skill",
    name: "ENS Resolver",
    description:
      "Bidirectional ENS resolution. Send `{ name: 'vitalik.eth' }` to get the address, or `{ address: '0x...' }` to reverse-resolve to the primary ENS name. Uses public Ethereum mainnet RPC.\n\nReturns `{ resolved: true|false }` so agents can fall back gracefully.",
    category: "data",
    hostUrl: `${DEMO_HOST}/ens-lookup`,
    priceUsdc: "0",
    tokenGated: false,
    status: "published",
    version: "1.0.0",
  },
  {
    slug: "github-trending",
    type: "knowledge",
    name: "GitHub Trending",
    description:
      "Top GitHub repositories created in the last 7 days, filtered by language. Returns full repo metadata: stars, description, owner, URL.\n\nLanguages supported: typescript, javascript, python, rust, go, solidity, java, swift, kotlin. Defaults to typescript.",
    category: "knowledge",
    hostUrl: `${DEMO_HOST}/github-trending`,
    priceUsdc: "0",
    tokenGated: false,
    status: "published",
    version: "1.0.0",
  },
  {
    slug: "token-price",
    type: "skill",
    name: "Token Price",
    description:
      "Current USD price for any major cryptocurrency. Send `{ ids: 'ethereum' }` or `{ symbol: 'ETH' }` and get back price, 24h change, market cap, and 24h volume. Supports CoinGecko-style ids and common symbol shortcuts (eth, btc, usdc, sol, etc.). Backed by CoinGecko's public API.",
    category: "market-data",
    hostUrl: `${DEMO_HOST}/token-price`,
    priceUsdc: "0",
    tokenGated: false,
    status: "published",
    version: "1.0.0",
  },
  {
    slug: "trending-tokens",
    type: "knowledge",
    name: "Trending Tokens",
    description:
      "Top trending tokens on Base, Ethereum, or Solana from DEXScreener's boosted-tokens feed. Each result includes token address, chain, icon, and links. Useful for agents hunting early signal or rotating into momentum names.",
    category: "market-data",
    hostUrl: `${DEMO_HOST}/trending-tokens`,
    priceUsdc: "0",
    tokenGated: false,
    status: "published",
    version: "1.0.0",
  },
  {
    slug: "top-gainers",
    type: "knowledge",
    name: "Top Gainers",
    description:
      "Top crypto gainers (or losers) over the last 24 hours, ranked by % change. Returns up to 50 coins with symbol, name, current price, % change, and market cap. Powered by CoinGecko's market-data feed.",
    category: "market-data",
    hostUrl: `${DEMO_HOST}/top-gainers`,
    priceUsdc: "0",
    tokenGated: false,
    status: "published",
    version: "1.0.0",
  },
  {
    slug: "dex-pairs",
    type: "knowledge",
    name: "DEX Pairs",
    description:
      "Best DEX trading pools for any token on Base (or other chains). Returns the top pairs by liquidity with price, 24h volume, txn counts, and direct trade URLs. Use this to find the deepest pool before quoting a swap.",
    category: "market-data",
    hostUrl: `${DEMO_HOST}/dex-pairs`,
    priceUsdc: "0",
    tokenGated: false,
    status: "published",
    version: "1.0.0",
  },
  {
    slug: "defi-tvl",
    type: "knowledge",
    name: "DeFi TVL",
    description:
      "Total Value Locked across DeFi protocols, via DefiLlama. Query a single protocol by slug (`{ protocol: 'aave' }`) for detailed TVL by chain, or omit to get the top protocols by TVL. Includes 1d / 7d change and category.",
    category: "defi",
    hostUrl: `${DEMO_HOST}/defi-tvl`,
    priceUsdc: "0",
    tokenGated: false,
    status: "published",
    version: "1.0.0",
  },
  {
    slug: "wallet-portfolio",
    type: "skill",
    name: "Wallet Portfolio",
    description:
      "Full ETH + ERC-20 balance breakdown for any wallet address on Base or Ethereum. Returns native balance plus balances of the major tokens (USDC, WETH, cbETH, AERO, USDbC on Base; USDC, USDT, WETH, DAI, WBTC on Ethereum). Combine with token-price for USD valuation.",
    category: "wallet",
    hostUrl: `${DEMO_HOST}/wallet-portfolio`,
    priceUsdc: "0",
    tokenGated: false,
    status: "published",
    version: "1.0.0",
  },
  {
    slug: "base-gas",
    type: "skill",
    name: "Base Gas",
    description:
      "Current Base gas conditions. Returns base fee, gas price, priority fee, and a suggested total gwei (with a 10% buffer) for the next block. Use this before broadcasting any transaction on Base mainnet or Sepolia.",
    category: "infra",
    hostUrl: `${DEMO_HOST}/base-gas`,
    priceUsdc: "0",
    tokenGated: false,
    status: "published",
    version: "1.0.0",
  },
  {
    slug: "erc20-info",
    type: "skill",
    name: "ERC-20 Info",
    description:
      "Standard ERC-20 metadata for any token contract on Base or Ethereum: name, symbol, decimals, total supply. Single multicall round-trip. Useful when an agent encounters an unknown token and needs to identify it before acting.",
    category: "token-data",
    hostUrl: `${DEMO_HOST}/erc20-info`,
    priceUsdc: "0",
    tokenGated: false,
    status: "published",
    version: "1.0.0",
  },
  {
    slug: "tx-lookup",
    type: "skill",
    name: "Transaction Lookup",
    description:
      "Transaction receipt for any tx hash on Base, Ethereum, or Base Sepolia. Returns status, block, from / to, gas used, log count, and a direct BaseScan / Etherscan link. Use this to confirm a tx landed and inspect its outcome.",
    category: "infra",
    hostUrl: `${DEMO_HOST}/tx-lookup`,
    priceUsdc: "0",
    tokenGated: false,
    status: "published",
    version: "1.0.0",
  },
  {
    slug: "uniswap-quote",
    type: "skill",
    name: "Uniswap Quote",
    description:
      "Simulate a Uniswap V3 swap on Base without executing. Send `{ tokenIn, tokenOut, amountIn, fee }` and get back the output amount, gas estimate, and post-trade price. Use this to size trades or check slippage before committing on-chain.",
    category: "defi",
    hostUrl: `${DEMO_HOST}/uniswap-quote`,
    priceUsdc: "0",
    tokenGated: false,
    status: "published",
    version: "1.0.0",
  },
  {
    slug: "base-pulse",
    type: "knowledge",
    name: "Base Pulse",
    description:
      "Real-time snapshot of activity on Base: current gas, trending tokens, recently featured launches, and total chain TVL — all in a single call. Use it as the first call in any Base-focused agent loop to anchor downstream decisions on a fresh picture of the chain.",
    category: "infra",
    hostUrl: `${DEMO_HOST}/base-pulse`,
    priceUsdc: "0",
    tokenGated: false,
    status: "published",
    version: "1.0.0",
  },
  {
    slug: "narrative-tokens",
    type: "knowledge",
    name: "Narrative Tokens",
    description:
      "Curated lists of tokens by narrative — ai-agents, depin, memes-base, rwa, defi-blue-chips, base-ecosystem, l2s, oracles, gaming — each enriched with live CoinGecko price, 24h change, market cap, and volume. Skip token-by-token guessing; pivot whole strategies by theme.",
    category: "market-data",
    hostUrl: `${DEMO_HOST}/narrative-tokens`,
    priceUsdc: "0",
    tokenGated: false,
    status: "published",
    version: "1.0.0",
  },
  {
    slug: "prediction-markets",
    type: "knowledge",
    name: "Prediction Markets",
    description:
      "Live snapshot of active Polymarket markets, sorted by 24h volume by default. Optional query string filters markets by topic. Returns market question, outcome prices, volume, liquidity, and end date — wisdom-of-crowds signal most price feeds ignore.",
    category: "market-data",
    hostUrl: `${DEMO_HOST}/prediction-markets`,
    priceUsdc: "0",
    tokenGated: false,
    status: "published",
    version: "1.0.0",
  },
  {
    slug: "base-movers",
    type: "knowledge",
    name: "Base Movers",
    description:
      "Top Base ecosystem tokens ranked by 24h performance — gainers, losers, volume, or trade count. Each entry includes price, 24h change, 24h volume, trade count, and primary DEX pair. Filter by minimum liquidity to avoid micro-cap noise.",
    category: "market-data",
    hostUrl: `${DEMO_HOST}/base-movers`,
    priceUsdc: "0",
    tokenGated: false,
    status: "published",
    version: "1.0.0",
  },
];

async function main() {
  const sql = postgres(databaseUrl!, { max: 1 });
  const db = drizzle(sql, { schema: { wallet, capability } });

  let seedBuilder = await db
    .select()
    .from(wallet)
    .where(eq(wallet.address, SEED_BUILDER_ADDRESS))
    .limit(1);

  if (seedBuilder.length === 0) {
    const [created] = await db
      .insert(wallet)
      .values({
        address: SEED_BUILDER_ADDRESS,
        displayName: "Oryn Seed",
        bio: "Builder identity used for built-in demo capabilities maintained by the Oryn team. These are real working endpoints, not placeholders.",
        twitter: "orynworks",
      })
      .returning();
    seedBuilder = [created];
    console.log("✓ Created seed builder wallet:", SEED_BUILDER_ADDRESS);
  } else {
    console.log("✓ Seed builder wallet exists:", SEED_BUILDER_ADDRESS);
  }

  const builderId = seedBuilder[0].id;

  let createdCount = 0;
  let skippedCount = 0;
  for (const sample of SAMPLES) {
    const existing = await db
      .select()
      .from(capability)
      .where(eq(capability.slug, sample.slug))
      .limit(1);

    if (existing.length > 0) {
      console.log(`  - skip: ${sample.slug} (already exists)`);
      skippedCount++;
      continue;
    }

    await db.insert(capability).values({ ...sample, builderId });
    console.log(`  + create: ${sample.slug}`);
    createdCount++;
  }

  console.log(`\n✓ Seed complete: ${createdCount} created, ${skippedCount} skipped.`);
  await sql.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
