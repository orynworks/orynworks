// All long terminal/code-block content lives here as plain strings.
// Keeping them out of page.tsx avoids Turbopack HMR memory blow-ups on
// pages that mix many large multi-line template literals with JSX.

export const QUICKSTART_INSTALL = `$ npx oryn install deep-research --client claude
→ Resolving capability...
→ Verified on-chain at 0xB9a2…BAB5d
✓ Installed deep-research@1.2.0`;

export const QUICKSTART_PRINT = `$ npx oryn install deep-research

# Add to your MCP-aware client config:
{
  "mcpServers": {
    "oryn-deep-research": {
      "type": "http",
      "url": "https://api.oryn.works/v1/skills/deep-research/call"
    }
  }
}`;

export const QUICKSTART_CALL = `$ npx oryn call deep-research --prompt "summarize latest base ecosystem trends"`;

export const OPERATORS_INSTALL = `# Auto-write into Claude Desktop config
$ npx oryn install <slug> --client claude

# Cursor
$ npx oryn install <slug> --client cursor

# Just print the JSON
$ npx oryn install <slug>`;

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

export const SDK_CLI = `oryn install <slug> [--client claude|cursor|print] [--gateway URL]
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
    network: "Base Sepolia",
    shortAddr: "0xB9a2…BAB5d",
    fullAddr: "0xB9a212DF77AEb7F4201d435381D68Ec10f5BAB5d",
    explorerUrl:
      "https://sepolia.basescan.org/address/0xB9a212DF77AEb7F4201d435381D68Ec10f5BAB5d",
  },
  {
    contract: "RevenueEscrow",
    network: "Base Sepolia",
    shortAddr: "0x6b29…6e31",
    fullAddr: "0x6b29663C0802F7Bc8B8750F17627a82258EE6e31",
    explorerUrl:
      "https://sepolia.basescan.org/address/0x6b29663C0802F7Bc8B8750F17627a82258EE6e31",
  },
  {
    contract: "USDC (testnet)",
    network: "Base Sepolia",
    shortAddr: "0x036C…CF7e",
    fullAddr: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    explorerUrl:
      "https://sepolia.basescan.org/address/0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  },
];
