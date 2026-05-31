<div align="center">

# Oryn Works

**The capability marketplace for AI agents.**

The settlement layer for AI agent capabilities. Builders publish skills and knowledge.
Operators install with a single command. On-chain reputation that compounds.

[![Built on Base](https://img.shields.io/badge/built%20on-Base-0052FF?style=flat-square)](https://base.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-E5734F?style=flat-square)](#license)
[![Status](https://img.shields.io/badge/status-pre--mainnet-orange?style=flat-square)](#roadmap)
[![SDK](https://img.shields.io/badge/sdk-oryn%20v0.1.0-cream?style=flat-square)](packages/sdk)

[Browse](#quick-start)  ·  [Build](#publish-a-capability)  ·  [Docs](https://oryn.works/docs)  ·  [x402](https://github.com/coinbase/x402)

</div>

---

## What it is

Oryn is a two-sided marketplace for AI agent capabilities, built on Base.

- **Builders** publish skills (MCP servers) and knowledge packs.
- **Operators** install them into Claude Desktop, Cursor, or any MCP-aware client with one command.
- Every call settles per-use in USDC via the [x402](https://github.com/coinbase/x402) protocol.
- Every settled call emits an on-chain attestation — reputation compounds with usage.

```sh
$ npx oryn install ens-resolver --client claude
→ Resolving capability...
→ Verified on-chain at 0xB9a2…BAB5d
✓ Installed ens-resolver@1.0.0
```

## How it works

```
 ┌─────────────┐    1. discover     ┌──────────┐
 │  operator   │ ─────────────────▶ │  /browse │
 │  (agent)    │                    └─────┬────┘
 └──────┬──────┘                          │
        │                                 │ 2. install (one command)
        │                                 ▼
        │                          ┌──────────────┐
        │                          │ MCP client   │
        │                          │ (Claude /    │
        │                          │  Cursor)     │
        │                          └──────┬───────┘
        │                                 │ 3. call
        │ 4. x402 sign + retry            ▼
        └────────────────────────▶ ┌──────────────┐
                                   │   Gateway    │ ──▶ Builder host
                                   │  (Fastify)   │     (MCP server)
                                   └──────┬───────┘
                                          │ 5. settle (batched)
                                          ▼
                              ┌─────────────────────┐
                              │  RevenueEscrow.sol  │
                              │  90% builder        │
                              │  10% protocol       │
                              └─────────────────────┘
```

## Stack

| Layer | Tech |
|---|---|
| Web | Next.js 16 + Tailwind v4 + wagmi/RainbowKit + viem |
| Gateway | Fastify 4 (ESM, tsx) + x402 verifier + settlement worker |
| Database | Neon Postgres + Drizzle ORM |
| Contracts | Solidity 0.8.24 + Foundry (CapabilityRegistry, RevenueEscrow) |
| Chain | Base mainnet `8453` / Base Sepolia `84532` |
| Currency | USDC (per-call billing) |
| Auth | SIWE (Sign-In With Ethereum) + JWT sessions |
| SDK | `oryn` npm package (CLI + programmatic) |

## Project layout

```
basedeploy2/
├── apps/
│   ├── web/              # Next.js marketplace UI
│   └── gateway/          # Fastify proxy + x402 + settlement + demo MCPs
├── packages/
│   ├── db/               # Drizzle schema + repos + URL safety
│   ├── contracts/        # Solidity sources + Foundry deploy script
│   └── sdk/              # `oryn` CLI + OrynClient
├── docs/                 # Design specs + execution plans
├── CANON.md              # Single source of truth: product + brand + vocab
├── TESTING.md            # Pre-mainnet E2E walkthrough
└── ROADMAP.md            # Phase 1 → 5 ship plan
```

## Quick start

Prereqs: **Node 20+**, **pnpm 9+**, **Foundry** (for `packages/contracts`).

```sh
# 1. Install
pnpm install

# 2. Copy env templates
cp .env.example apps/gateway/.env
cp .env.example apps/web/.env.local
cp packages/contracts/.env.example packages/contracts/.env

# 3. Fill in:
#    - DATABASE_URL  → your Neon postgres connection (https://neon.tech)
#    - JWT_SECRET    → must MATCH between gateway and web
#    - NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID → from https://cloud.walletconnect.com

# 4. Run migrations
pnpm db:migrate

# 5. Boot web + gateway concurrently
pnpm dev
```

Open:
- Web → <http://localhost:3000>
- Gateway → <http://localhost:4000/health>

## Built-in demo capabilities

Four real, free MCP capabilities ship with the gateway out of the box. They run against public RPCs / APIs — no keys, no setup:

| Slug | Type | What it does |
|---|---|---|
| `echo-debug` | skill | Mirror any input. Useful for testing the install → call → settle loop end-to-end. |
| `base-live-block` | skill | Latest block on Base mainnet or Sepolia via viem. |
| `ens-resolver` | skill | Bidirectional ENS lookup (name ↔ address) via public Eth RPC. |
| `github-trending` | knowledge | Top GitHub repos created in the last 7 days, by language. |

These let the marketplace feel populated from day one and serve as reference implementations for builders shipping their own MCP servers.

## Publish a capability

```sh
# 1. Connect your wallet at /build
# 2. Fill the form at /build/new
# 3. On submit, your wallet signs a tx registering the capability
#    on CapabilityRegistry (~$0.01 gas on Base)
# 4. Capability shows up at /capability/<slug>, callable via gateway
# 5. Earn 90% of every paid call. Claim USDC at /build anytime.
```

## Programmatic SDK

```ts
import { OrynClient } from "oryn";

const client = new OrynClient({
  gatewayUrl: "https://api.oryn.works",
  authToken: process.env.ORYN_AUTH_TOKEN,
});

const result = await client.query("github-trending", {
  language: "typescript",
  limit: 5,
});
```

## Smart contracts

| Contract | Network | Address |
|---|---|---|
| `CapabilityRegistry` | **Base mainnet** | [0xDa94bD88aD764EE6eA42Cf450d3fC2f816BA6c37](https://basescan.org/address/0xDa94bD88aD764EE6eA42Cf450d3fC2f816BA6c37) |
| `RevenueEscrow` | **Base mainnet** | [0x93397efB596aD82254FB047daa53Ac68c3E70a10](https://basescan.org/address/0x93397efB596aD82254FB047daa53Ac68c3E70a10) |
| `USDC` | Base mainnet | [0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913](https://basescan.org/address/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913) |
| `CapabilityRegistry` | Base Sepolia | [0xB9a212DF77AEb7F4201d435381D68Ec10f5BAB5d](https://sepolia.basescan.org/address/0xB9a212DF77AEb7F4201d435381D68Ec10f5BAB5d) |
| `RevenueEscrow` | Base Sepolia | [0x6b29663C0802F7Bc8B8750F17627a82258EE6e31](https://sepolia.basescan.org/address/0x6b29663C0802F7Bc8B8750F17627a82258EE6e31) |
| `USDC` (testnet) | Base Sepolia | [0x036CbD53842c5426634e7929541eC2318f3dCF7e](https://sepolia.basescan.org/address/0x036CbD53842c5426634e7929541eC2318f3dCF7e) |

## Testing

Full E2E walkthrough in [`TESTING.md`](TESTING.md). Highlights:

- Sign in via SIWE → publish capability (on-chain register) → call via gateway → settle → claim
- Adversarial SSRF tests + idempotency reconciliation
- 12/12 on-chain checks pass on Base Sepolia at last run

## Roadmap

| Phase | Status |
|---|---|
| **1A** — Foundation (auth, DB, monorepo) | ✅ |
| **1B** — Capability registry UI | ✅ |
| **1C** — Gateway + x402 payment | ✅ |
| **1D** — Contracts + settlement + SDK + docs | ✅ |
| **Pre-mainnet hardening** — on-chain publish, SSRF guard, RPC race fix, built-in demos | ✅ |
| **Mainnet contracts** — CapabilityRegistry + RevenueEscrow deployed to Base 8453 | ✅ |
| **Mainnet launch** — hosting (Vercel + Railway), domain, public traffic | ⏳ |
| Phase 2 — Reputation aggregation, on-chain attestations | 🔮 |
| Phase 3 — Knowledge packs at scale (vector DB) | 🔮 |
| Phase 4 — Token-gated capabilities | 🔮 |
| Phase 5 — Ecosystem partnerships, SDK, CLI distribution | 🔮 |

Full breakdown in [`ROADMAP.md`](ROADMAP.md).

## Contributing

Issues + PRs welcome. Before contributing:

1. Read [`CANON.md`](CANON.md) — single source of truth for product positioning, vocab, and brand rules.
2. Check the relevant phase doc in [`docs/`](docs/) for context.
3. Run `pnpm -r build` and verify it passes before opening a PR.

Capabilities to add as built-in demos are especially welcome — keep them small, public-RPC backed, and free.

## License

[MIT](LICENSE) — do what you want, attribution appreciated.

---

<div align="center">

<sub>

Built on [Base](https://base.org) · Payments via [x402](https://github.com/coinbase/x402) · Protocol: [MCP](https://modelcontextprotocol.io)

[Website](https://oryn.works) · [Docs](https://oryn.works/docs) · [Twitter](https://x.com/orynworks) · [GitHub](https://github.com/orynworks)

```
the settlement layer for agent capabilities · v0.1.0 · orynworks
```

</sub>

</div>
