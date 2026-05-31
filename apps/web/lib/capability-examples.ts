/**
 * Per-capability call examples used by the capability detail page to render
 * concrete copy-paste install + curl snippets. Keyed by capability slug.
 *
 * `mcpPath` is the gateway URL segment, which for a handful of capabilities
 * diverges from the slug (e.g. echo-debug → echo, base-live-block → base-block,
 * ens-resolver → ens-lookup). Always use this when constructing curl examples
 * so users don't hit 404s.
 *
 * Eventually these fields will live on the capability record itself. Until
 * then this static map is the source of truth.
 */

export type CapabilityExample = {
  mcpPath: string;
  exampleBody: string;
  exampleOutputShape: string;
};

export const CALL_EXAMPLES: Record<string, CapabilityExample> = {
  "echo-debug": {
    mcpPath: "echo",
    exampleBody: '{"prompt":"hello world"}',
    exampleOutputShape:
      '{"ok":true,"data":{"echo":"hello world","serverTime":"2026-06-01T12:00:00Z","requestId":"req_…"},"latencyMs":12}',
  },
  "base-live-block": {
    mcpPath: "base-block",
    exampleBody: '{"network":"mainnet"}',
    exampleOutputShape:
      '{"ok":true,"data":{"network":"mainnet","number":"12345678","hash":"0x…","timestamp":1717200000,"baseFeeGwei":"0.0021"},"latencyMs":180}',
  },
  "ens-resolver": {
    mcpPath: "ens-lookup",
    exampleBody: '{"name":"vitalik.eth"}',
    exampleOutputShape:
      '{"ok":true,"data":{"name":"vitalik.eth","address":"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"},"latencyMs":240}',
  },
  "github-trending": {
    mcpPath: "github-trending",
    exampleBody: '{"language":"typescript","limit":5}',
    exampleOutputShape:
      '{"ok":true,"data":{"language":"typescript","repos":[{"full_name":"org/repo","stars":1234,"description":"…","url":"https://github.com/org/repo"}]}}',
  },
  "token-price": {
    mcpPath: "token-price",
    exampleBody: '{"ids":"ethereum,bitcoin"}',
    exampleOutputShape:
      '{"ok":true,"data":{"ethereum":{"usd":3400.12,"usd_24h_change":1.2,"usd_market_cap":4.1e11,"usd_24h_vol":1.8e10},"bitcoin":{…}}}',
  },
  "trending-tokens": {
    mcpPath: "trending-tokens",
    exampleBody: '{"chain":"base","limit":5}',
    exampleOutputShape:
      '{"ok":true,"data":{"chain":"base","tokens":[{"address":"0x…","symbol":"TKN","name":"Token","url":"https://dexscreener.com/…"}]}}',
  },
  "top-gainers": {
    mcpPath: "top-gainers",
    exampleBody: '{"limit":5,"direction":"gainers"}',
    exampleOutputShape:
      '{"ok":true,"data":{"direction":"gainers","coins":[{"id":"…","symbol":"…","name":"…","priceUsd":0.42,"change24h":58.3}]}}',
  },
  "dex-pairs": {
    mcpPath: "dex-pairs",
    exampleBody:
      '{"tokenAddress":"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913","chain":"base"}',
    exampleOutputShape:
      '{"ok":true,"data":{"chain":"base","pairs":[{"dexId":"uniswap","pairAddress":"0x…","liquidityUsd":4200000,"priceUsd":"1.00"}]}}',
  },
  "defi-tvl": {
    mcpPath: "defi-tvl",
    exampleBody: '{"limit":5}',
    exampleOutputShape:
      '{"ok":true,"data":{"protocols":[{"name":"Aave","slug":"aave","tvlUsd":2.1e10,"chain":"multi"}]}}',
  },
  "wallet-portfolio": {
    mcpPath: "wallet-portfolio",
    exampleBody:
      '{"address":"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045","chain":"base"}',
    exampleOutputShape:
      '{"ok":true,"data":{"address":"0xd8dA…6045","chain":"base","native":{"symbol":"ETH","balance":"0.42"},"tokens":[{"symbol":"USDC","balance":"125.50"}]}}',
  },
  "base-gas": {
    mcpPath: "base-gas",
    exampleBody: '{"network":"mainnet"}',
    exampleOutputShape:
      '{"ok":true,"data":{"network":"mainnet","baseFeeGwei":"0.0021","gasPriceGwei":"0.0030","priorityFeeGwei":"0.0010","suggestedGwei":"0.0033"}}',
  },
  "erc20-info": {
    mcpPath: "erc20-info",
    exampleBody:
      '{"address":"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913","chain":"base"}',
    exampleOutputShape:
      '{"ok":true,"data":{"address":"0x8335…2913","chain":"base","name":"USD Coin","symbol":"USDC","decimals":6,"totalSupply":"…"}}',
  },
  "tx-lookup": {
    mcpPath: "tx-lookup",
    exampleBody: '{"hash":"0xPASTE_TX_HASH_HERE","chain":"base"}',
    exampleOutputShape:
      '{"ok":true,"data":{"chain":"base","hash":"0x…","status":"success","blockNumber":12345678,"gasUsed":"42000","explorerUrl":"https://basescan.org/tx/0x…"}}',
  },
  "uniswap-quote": {
    mcpPath: "uniswap-quote",
    exampleBody:
      '{"tokenIn":"0x4200000000000000000000000000000000000006","tokenOut":"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913","amountIn":"1000000000000000000","fee":500}',
    exampleOutputShape:
      '{"ok":true,"data":{"chain":"base","amountOut":"3400123456","gasEstimate":"140000","sqrtPriceX96After":"…"}}',
  },
  "base-pulse": {
    mcpPath: "base-pulse",
    exampleBody: "{}",
    exampleOutputShape:
      '{"ok":true,"data":{"gas":{…},"trendingTokens":[…],"featuredLaunches":[…],"totalTvl":2.1e9}}',
  },
  "narrative-tokens": {
    mcpPath: "narrative-tokens",
    exampleBody: '{"narrative":"ai-agents"}',
    exampleOutputShape:
      '{"ok":true,"data":{"narrative":"ai-agents","tokens":[{"id":"…","symbol":"…","priceUsd":1.23,"change24h":4.2,"marketCap":1.2e8}]}}',
  },
  "prediction-markets": {
    mcpPath: "prediction-markets",
    exampleBody: '{"limit":5}',
    exampleOutputShape:
      '{"ok":true,"data":{"markets":[{"id":"…","question":"…","endDate":"2026-…","volume24hr":120000,"outcomes":[…]}]}}',
  },
  "base-movers": {
    mcpPath: "base-movers",
    exampleBody: '{"sort":"gainers","limit":5}',
    exampleOutputShape:
      '{"ok":true,"data":{"sort":"gainers","tokens":[{"address":"0x…","symbol":"…","priceUsd":0.42,"change24h":58.3,"volume24h":1200000,"trades24h":342}]}}',
  },
};

export function getCapabilityExample(slug: string): CapabilityExample | undefined {
  return CALL_EXAMPLES[slug];
}
