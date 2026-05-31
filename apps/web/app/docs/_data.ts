// All long terminal/code-block content lives here as plain strings.
// Keeping them out of page.tsx avoids Turbopack HMR memory blow-ups on
// pages that mix many large multi-line template literals with JSX.

export const QUICKSTART_INSTALL = `$ npx orynworks install deep-research --client claude
→ Resolving capability...
→ Verified on-chain at 0xB9a2…BAB5d
✓ Installed deep-research@1.2.0`;

export const QUICKSTART_PRINT = `$ npx orynworks install deep-research

# Add to your MCP-aware client config:
{
  "mcpServers": {
    "oryn-deep-research": {
      "type": "http",
      "url": "https://api.oryn.works/v1/skills/deep-research/call"
    }
  }
}`;

export const QUICKSTART_CALL = `$ npx orynworks call deep-research --prompt "summarize latest base ecosystem trends"`;

export const OPERATORS_INSTALL = `# Auto-write into Claude Desktop config
$ npx orynworks install <slug> --client claude

# Cursor
$ npx orynworks install <slug> --client cursor

# Just print the JSON
$ npx orynworks install <slug>`;

export const BUILDERS_SPLIT = `Operator pays   1.0000 USDC
        →   0.9000 USDC  →  builderBalance[you]
        →   0.1000 USDC  →  protocolTreasury`;

export const X402_FLOW = `1. Agent calls a paid capability:
   POST /v1/skills/<slug>/call

2. Gateway returns 402 with a challenge:
   WWW-Authenticate: X402 realm="oryn", amount="0.0200"

3. Agent's client builds an EIP-712 payment for amount,
   signs with the operator's wallet key, retries with:
   X-Payment: <signed-payload>

4. Gateway verifies signature, nonce uniqueness, USDC
   allowance. Forwards the call to the builder's host URL.

5. Off-chain ledger records the usage event.
   Settlement worker batches per-builder accruals and
   pushes them to RevenueEscrow on a schedule.`;

export const API_SKILL_CURL = `curl -X POST https://api.oryn.works/v1/skills/deep-research/call \\
  -H "Content-Type: application/json" \\
  -H "Cookie: oryn_session=..." \\
  -H "X-Payment: <eip712-signed-payload>" \\
  -d '{"prompt": "..."}'`;

export const API_KNOWLEDGE_CURL = `curl -X POST https://api.oryn.works/v1/knowledge/alpha-feed/query \\
  -H "Content-Type: application/json" \\
  -H "Cookie: oryn_session=..." \\
  -H "X-Payment: <eip712-signed-payload>" \\
  -d '{"prompt": "..."}'`;

export const API_RESPONSES = `// 200 OK
{
  "ok": true,
  "data": <upstream response>,
  "costUsdc": "0.0200",
  "latencyMs": 412
}

// 402 Payment Required
{
  "error": "payment required",
  "priceUsdc": "0.0200",
  "protocol": "x402",
  "version": "1"
}

// 502 Bad Gateway
{
  "error": "upstream_502" |
           "upstream_host_blocked" |
           "upstream_timeout"
}`;

export const SDK_CLI = `orynworks install <slug> [--client claude|cursor|print] [--gateway URL]
oryn call    <slug> --prompt "..." [--gateway URL] [--auth TOKEN]
oryn query   <slug> --prompt "..." [--gateway URL] [--auth TOKEN]
oryn ping    [--gateway URL]
oryn --version`;

export const SDK_PROGRAMMATIC = `import { OrynClient } from "oryn";

const client = new OrynClient({
  gatewayUrl: "https://api.oryn.works",
  authToken: process.env.ORYN_AUTH_TOKEN,
});

const result = await client.query("alpha-feed", {
  prompt: "trending on base, last 24h"
});`;

export type Section = {
  id: string;
  num: string;
  label: string;
  readMin: number;
};

export const SECTIONS: Section[] = [
  { id: "quickstart", num: "01", label: "Quickstart", readMin: 1 },
  { id: "operators", num: "02", label: "For operators", readMin: 2 },
  { id: "builders", num: "03", label: "For builders", readMin: 2 },
  { id: "x402", num: "04", label: "x402 payment", readMin: 2 },
  { id: "api", num: "05", label: "API reference", readMin: 2 },
  { id: "sdk", num: "06", label: "SDK reference", readMin: 1 },
  { id: "contracts", num: "07", label: "Contracts", readMin: 2 },
];

export type ContractRow = {
  contract: string;
  network: string;
  shortAddr: string;
  fullAddr: string;
  explorerUrl: string;
};

export const CONTRACT_ROWS: ContractRow[] = [
  {
    contract: "CapabilityRegistry",
    network: "Base mainnet",
    shortAddr: "0xDa94…6c37",
    fullAddr: "0xDa94bD88aD764EE6eA42Cf450d3fC2f816BA6c37",
    explorerUrl:
      "https://basescan.org/address/0xDa94bD88aD764EE6eA42Cf450d3fC2f816BA6c37",
  },
  {
    contract: "RevenueEscrow",
    network: "Base mainnet",
    shortAddr: "0x9339…0a10",
    fullAddr: "0x93397efB596aD82254FB047daa53Ac68c3E70a10",
    explorerUrl:
      "https://basescan.org/address/0x93397efB596aD82254FB047daa53Ac68c3E70a10",
  },
  {
    contract: "USDC",
    network: "Base mainnet",
    shortAddr: "0x8335…2913",
    fullAddr: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    explorerUrl:
      "https://basescan.org/address/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  },
];
