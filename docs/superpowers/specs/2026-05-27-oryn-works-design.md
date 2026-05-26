---
title: Oryn Works — Design Spec
date: 2026-05-27
status: Draft v1 — Pending implementation plan
author: kijulgd
---

# Oryn Works

> **The capability marketplace for AI agents.**

A crypto-native marketplace where builders publish **Skills** (MCP servers) and **Knowledge packs**, and AI agent operators discover, install, and pay per-use — with **on-chain reputation** sealing trust. Built on Base. Settled in USDC. x402-native.

---

## 0. Brand identity

| Asset | Value |
|---|---|
| Brand short | **Oryn** |
| Brand full | **Oryn Works** |
| Tagline | "The capability marketplace for AI agents." |
| Twitter | `@orynworks` |
| Domain primary | `oryn.works` |
| Legal name | Oryn Works Inc. (TBD jurisdiction) |
| Token (future) | `$ORYN` |
| GitHub org | `github.com/orynworks` |

### Visual direction (locked)

- **Aesthetic:** Anthropic-style — warm cream + burnt orange on warm dark, serif headlines + Inter sans body, sophisticated minimalist with retro-futurist NASA-poster DNA.
- **Palette:**
  - Cream: `#E8DCC8`
  - Orange accent: `#E5734F`
  - Warm dark: `#1A1612`
- **Typography:**
  - Headlines: Tiempos Text serif (fallback Fraunces/Newsreader free)
  - Body: Inter sans
  - Mono accents: JetBrains Mono atau Consolas
- **Logo direction:** user-driven (Google/designer brief), placeholder wordmark "oryn" lowercase serif sampai logo final locked.

### Positioning

Layer 3 infrastructure protocol. Crypto-native execution of an idea proven elsewhere (Smithery/HuggingFace) — but with wallet auth, USDC payment per call, on-chain reputation, and builder revenue share. Target audience: anak crypto / Base ecosystem builders, AI agent operators, MCP server authors.

---

## 1. System Shape

Three product surfaces:

```
┌─────────────────────────────────────────────────────────┐
│  1. WEB APP (discovery + dashboard)                     │
│     - Browse Skills + Knowledge                         │
│     - Builder dashboard (upload, revenue, rep)          │
│     - User dashboard (installed, attestation, spending) │
├─────────────────────────────────────────────────────────┤
│  2. RUNTIME GATEWAY (proxy)                             │
│     - Receive call/query from agent                     │
│     - Verify x402 payment                               │
│     - Forward to skill host / knowledge vector DB       │
│     - Log usage (for billing + reputation)              │
├─────────────────────────────────────────────────────────┤
│  3. ON-CHAIN LAYER (Base)                               │
│     - CapabilityRegistry contract                       │
│     - EAS attestation schema                            │
│     - RevenueSplitter (90/10 builder/protocol)          │
└─────────────────────────────────────────────────────────┘
```

### High-level data flow

```
Builder ──upload──▶ Web App ──register──▶ Runtime Gateway
                                            │
User ──discover──▶ Web App ──install/query─▶│
                                            ▼
Agent ──call────────────────────────────▶ Runtime Gateway
                                            ├─ verify x402 payment
                                            ├─ proxy to actual host/DB
                                            ├─ log usage event
                                            └─ split fee to Builder + Protocol

User ──attest─▶ Web App ──sign with wallet─▶ On-chain attestation (EAS)
                                            └─ aggregate into reputation score
```

### External dependencies

- Base RPC (mainnet + Sepolia testnet)
- USDC contract on Base: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- EAS (Ethereum Attestation Service) on Base
- Pinata (IPFS for capability metadata + Knowledge pack files)
- Pinecone or Chroma (vector DB for Knowledge query)
- x402 protocol library (Coinbase resmi)

### Out of scope (MVP)

- ❌ Multi-chain (Base only)
- ❌ Token launch (defer to Phase 4+)
- ❌ Agent coordination protocol (separate product)
- ❌ Cross-protocol federation (Smithery import, etc.)
- ❌ Mobile app (responsive web first)
- ❌ Agent orchestration UI (Layer 2 tooling, separate product)

---

## 2. Components Detail

### 2.1 Web App (Next.js 15, App Router)

| Route | Purpose | Audience |
|---|---|---|
| `/` | Landing — hero + featured capabilities + stats | Anyone |
| `/browse` | Discovery: filter (Skill/Knowledge/All), search, sort | User/Operator |
| `/capability/[slug]` | Detail — desc, ratings, attestations, install/query CTA | User |
| `/build` | Builder dashboard — capabilities, revenue, reputation | Builder |
| `/build/new` | Upload form (MCP server URL or Knowledge pack) | Builder |
| `/profile/[wallet]` | Public builder profile | Public |
| `/me` | User dashboard — installed, spending, attestations made | User |
| `/leaderboard` | Top capabilities + builders by category | Public |
| `/docs` | API + SDK + integration guides | Builder/Dev |
| `/about` + `/changelog` | Standard | Public |

### 2.2 Runtime Gateway (Node.js + Fastify)

Service between agent and capability host. Endpoints:

```
POST   /v1/skills/:slug/call         # Agent invoke skill
POST   /v1/knowledge/:slug/query     # Agent query knowledge pack
GET    /v1/capabilities              # Public list & search
POST   /v1/attestations              # Submit signed attestation
GET    /v1/reputation/:wallet        # Public reputation read
POST   /v1/builders/register         # Builder onboard
```

Responsibilities:
1. **Auth verify** — wallet signature (SIWE)
2. **Payment verify** — x402 header check, USDC settlement state
3. **Rate limit** — per-agent, per-capability quotas (Redis)
4. **Proxy** — forward call to capability `host_url` or vector DB
5. **Log usage** — write to Postgres + enqueue on-chain settlement
6. **Return response** — streaming where possible

**Rationale:** Gateway = single source of truth for billing + reputation. Without central choke point, builder could cheat (claim revenue without proof).

### 2.3 On-Chain Layer (Base, Solidity 0.8.x)

3 smart contracts minimal:

```
1. CapabilityRegistry.sol
   - register(slug, builder, hostUrl, priceUSDC, type) external
   - update(slug, ...) external onlyBuilder
   - getCapability(slug) view returns (Capability)
   - Events: Registered, Updated, Deprecated

2. RevenueSplitter.sol
   - receive USDC from gateway settlements
   - split 90% builder / 10% protocol
   - claim() pull-based (gas-efficient)
   - protocolTreasury accumulator
   - Events: PaymentReceived, RevenueClaimed

3. EAS Schema (no custom contract)
   - Schema: { string slug, uint8 rating, string tag, string comment }
   - Attestations submitted directly to EAS contract on Base
```

**Trade-off:** Most logic handled off-chain (Postgres + signature). On-chain only for what needs **public trust** — attestation + revenue split. Capability metadata hybrid: on-chain hash + off-chain JSON in IPFS.

---

## 3. Data Model

### 3.1 Entity overview

```
wallet ─────────────owns/builds─────────────► capability
   │                                                │
   │ ◄────installs──── capability_install ─────────┤
   │ ◄────attests──── attestation ─────────────────┤
   │ ◄────pays──────  payment ──────receives───────┤
   └─────────calls──── usage_event ────────────────┘

                ┌──────────────────────────────┐
                │  reputation_score (cached)   │
                │  ← derived from attestations │
                └──────────────────────────────┘
```

### 3.2 Schema (Postgres)

**wallet** — Authenticated user (builder or operator)
```sql
id            uuid PRIMARY KEY
address       text UNIQUE       -- EOA address
role          enum(builder, operator, both)
display_name  text NULL
bio           text NULL
twitter       text NULL
created_at    timestamptz
```

**capability** — Skill (MCP) or Knowledge pack
```sql
id              uuid PRIMARY KEY
slug            text UNIQUE                -- e.g., "aeon-research-pack"
type            enum(skill, knowledge)
builder_id      uuid REFERENCES wallet
name            text
description     text
category        text                       -- data, action, knowledge, utility
host_url        text                       -- MCP endpoint or vector DB URL
price_usdc      numeric(10,6)              -- per-call / per-query
token_gated     boolean DEFAULT false
required_token  text NULL                  -- ERC-20/721 contract address if gated
status          enum(draft, published, deprecated)
version         text                       -- semver
metadata_uri    text                       -- IPFS JSON detail URI
onchain_hash    text NULL                  -- hash in CapabilityRegistry.sol
created_at      timestamptz
updated_at      timestamptz
```

**attestation** — Signed reputation signal (on-chain via EAS)
```sql
id              uuid PRIMARY KEY
capability_id   uuid REFERENCES capability
attester_id     uuid REFERENCES wallet
rating          int CHECK (rating BETWEEN 1 AND 5)
tag             enum(positive, negative, issue)
comment         text NULL
signature       text                       -- EIP-712 signature
onchain_tx      text NULL                  -- EAS attestation UID
created_at      timestamptz
```

**usage_event** — Call/query log (off-chain, high volume)
```sql
id              uuid PRIMARY KEY
capability_id   uuid REFERENCES capability
caller_id       uuid REFERENCES wallet
event_type      enum(call, query)
request_hash    text                       -- hash of input, not raw input
success         boolean
latency_ms      int
error_code      text NULL
cost_usdc       numeric(10,6)
billed          boolean DEFAULT false
created_at      timestamptz
```

**payment** — USDC settlement record
```sql
id                uuid PRIMARY KEY
payer_id          uuid REFERENCES wallet
receiver_id       uuid REFERENCES wallet
capability_id     uuid REFERENCES capability NULL
amount_usdc       numeric(10,6)
settlement_type   enum(per_call, batch, subscription)
onchain_tx        text
created_at        timestamptz
```

**reputation_score** — Cached aggregate (recomputed daily or on-trigger)
```sql
id                  uuid PRIMARY KEY
target_type         enum(capability, builder)
target_id           uuid                    -- poly FK
score               numeric(4,2)            -- 0.00-5.00
attestation_count   int
usage_count         int
success_rate        numeric(5,4)
calculated_at       timestamptz
```

### 3.3 On-chain vs off-chain split

| Data | On-chain | Off-chain | Rationale |
|---|---|---|---|
| Capability metadata | hash + key fields | full JSON (IPFS) | Verifiability + low gas |
| Attestation | ✓ via EAS | indexed cache | Public trust, sybil-resistant |
| Payment settlement | ✓ USDC transfer | event log mirror | Source of truth |
| Usage event | ✗ | ✓ Postgres | High volume, low individual value |
| Reputation score | ✗ (derived) | ✓ computed | Off-chain compute, on-chain inputs |
| Builder profile | wallet address only | full bio/social | Cost |

### 3.4 Indexes

```sql
CREATE INDEX ON capability (category, type, status);
CREATE INDEX ON capability (builder_id);
CREATE INDEX ON capability (price_usdc) WHERE status = 'published';
CREATE INDEX ON usage_event (capability_id, created_at DESC);
CREATE INDEX ON usage_event (caller_id, created_at DESC);
CREATE INDEX ON attestation (capability_id);
CREATE INDEX ON attestation (attester_id);
CREATE INDEX ON reputation_score (target_type, target_id);
```

### 3.5 Sample data flow

**Builder upload skill:**
1. POST `/build/new` with form data
2. Backend writes `capability` row (status=draft)
3. Upload metadata JSON to IPFS → store `metadata_uri`
4. Trigger `CapabilityRegistry.register()` on Base → store `onchain_hash`
5. Update status=published

**Agent call skill:**
1. POST `/v1/skills/:slug/call` with x402 payment header
2. Gateway verify wallet sig + payment
3. Insert `usage_event` (billed=false)
4. Proxy to capability `host_url`
5. Update `usage_event.success`, `latency_ms`
6. Insert `payment` (off-chain pending settlement)
7. Settlement batch → on-chain USDC transfer + update `payment.onchain_tx` + `usage_event.billed=true`

**User attest:**
1. POST `/v1/attestations` with signed EIP-712 payload
2. Submit to EAS contract → return UID
3. Insert `attestation` row with `onchain_tx`
4. Trigger recompute `reputation_score` for capability

---

## 4. Tech Stack

### Frontend
- Next.js 15 (App Router, RSC) + TypeScript
- Tailwind CSS + shadcn/ui
- wagmi + viem (wallet auth via SIWE)
- React Query (data fetching)

### Backend (Runtime Gateway)
- Node.js 20 + Fastify
- TypeScript
- Postgres 16 + Drizzle ORM
- Redis (cache + rate limit)
- BullMQ or Inngest (background jobs: reputation calc, on-chain settlement mirror)

### On-chain
- Solidity 0.8.x + Foundry (test + deploy)
- viem (off-chain interaction)
- Base mainnet + Base Sepolia testnet
- USDC on Base: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- EAS on Base

### Knowledge storage
- Pinecone OR Chroma (vector DB)
- IPFS via Pinata (metadata + pack files)

### Auth
- SIWE (Sign-In With Ethereum) via wagmi
- JWT session (24h expiry)
- No email, no OAuth

### Deployment
- Frontend → Vercel
- Gateway → Railway or Fly.io
- DB → Supabase (managed Postgres) or Railway Postgres

### Observability
- Sentry (errors)
- Axiom or Better Stack (logs)
- Plausible (web analytics, privacy-friendly)

---

## 5. Crypto-native Specifics

### 5.1 Smart contracts

```solidity
// CapabilityRegistry.sol — pseudocode
contract CapabilityRegistry {
    struct Capability {
        bytes32 slug;
        address builder;
        string  hostUrl;
        uint256 priceUSDC;
        CapType capType;     // Skill, Knowledge
        Status  status;       // Active, Deprecated
        uint256 version;
    }

    mapping(bytes32 => Capability) public capabilities;
    event Registered(bytes32 indexed slug, address indexed builder);
    event Updated(bytes32 indexed slug);
    event Deprecated(bytes32 indexed slug);

    function register(bytes32 slug, ...) external;
    function update(bytes32 slug, ...) external onlyBuilder(slug);
    function getCapability(bytes32 slug) external view returns (Capability memory);
}

// RevenueSplitter.sol — pseudocode
contract RevenueSplitter {
    uint256 constant BUILDER_BPS = 9000;    // 90.00%
    uint256 constant PROTOCOL_BPS = 1000;   // 10.00%

    mapping(address => uint256) public builderBalance;
    uint256 public protocolTreasury;

    function receivePayment(bytes32 slug, uint256 amountUSDC) external;
    function claim() external;              // pull builder revenue
    function withdrawProtocol(address to, uint256 amount) external onlyOwner;
}
```

EAS Schema (registered separately):
```
schema: "string slug, uint8 rating, string tag, string comment"
revocable: true
```

### 5.2 Payment flow (x402)

1. Agent invokes `POST /v1/skills/:slug/call`
2. Gateway reads `X-PAYMENT` header (USDC pre-auth signature)
3. Verify signer = caller wallet, amount >= capability price
4. Proxy to skill `host_url`
5. Log `usage_event` (billed=false)
6. Background job: batch settlement via `RevenueSplitter.receivePayment()` every 1 hour
7. Update `usage_event.billed=true`, set `payment.onchain_tx`

### 5.3 Token-gating (optional per-capability)

- Builder sets `required_token` field at registration
- Gateway checks ERC-20 `balanceOf(callerWallet) > 0` or ERC-721 `balanceOf > 0` before call
- Reverts call if balance check fails

### 5.4 Subscription tier (premium)

- Coinbase Commerce subscription (USDC, monthly recurring)
- Free tier: 1 agent registered, 7-day retention, manual calls
- Pro $10/mo USDC: 10 agents, 30-day retention, alerts, attestation analytics
- Pro+ $50/mo USDC: unlimited agents, 1-year retention, replay, full analytics

### 5.5 Builder reputation SBT (Phase 2)

- ERC-5192 soulbound token, milestone-based issuance
- Triggered automatically by usage thresholds: 10K calls, 100K calls, top-10 category
- Non-transferable, public proof on builder profile

---

## 6. Phased Build Plan

### Phase 1: MVP Marketplace (Weeks 1-6)
- [ ] Web shell + landing page (Anthropic warm theme)
- [ ] Wallet auth (SIWE) via wagmi
- [ ] Builder upload form (Skills only, MCP server URL)
- [ ] Discovery + search + capability detail pages
- [ ] Gateway endpoint: skill call with x402 payment
- [ ] Postgres schema + Drizzle migrations
- [ ] Smart contracts: deploy to Base Sepolia → audit → Base mainnet
- [ ] Seed 5-10 capabilities (wrap publicly-known Aeon skills as initial inventory)
- [ ] Soft launch to Crypto Twitter

**Phase 1 success criteria:** 1 builder publishes, 1 agent calls a skill, USDC settled, all visible in dashboard.

### Phase 2: Reputation Layer (Weeks 7-10)
- [ ] EAS integration on Base
- [ ] Attestation submit flow (EIP-712 signing)
- [ ] Reputation score cron (daily recompute) + cache table
- [ ] Builder profile page (public)
- [ ] Category leaderboards
- [ ] User dashboard (installed capabilities, spending, attestations made)

**Phase 2 success criteria:** 50+ attestations submitted, leaderboard alive with 20+ ranked capabilities.

### Phase 3: Knowledge Packs (Weeks 11-14)
- [ ] Vector DB integration (Pinecone OR Chroma — decide based on cost)
- [ ] Knowledge upload form + IPFS storage for source files
- [ ] Query endpoint with retrieval
- [ ] Knowledge detail + preview page
- [ ] Filter combine Skills + Knowledge in discovery UI

**Phase 3 success criteria:** 10+ knowledge packs published, agent queries with USDC payment work end-to-end.

### Phase 4: Premium Tiers + Token Gating (Weeks 15-18)
- [ ] Token-gated capability gateway logic (ERC-20/721 balance check)
- [ ] Coinbase Commerce subscription integration
- [ ] Builder dashboard analytics (revenue chart, usage breakdown)
- [ ] User spending dashboard (per-capability, per-period)
- [ ] Optional: launch `$ORYN` token (gate on traction signal — defer if not warranted)

**Phase 4 success criteria:** 5+ paying Pro subscriptions, 1+ token-gated capability listed.

### Phase 5: Ecosystem Integration (Weeks 19+)
- [ ] Aeon official integration (sync skill-packs.json mirror)
- [ ] `@oryn/sdk` npm package
- [ ] CLI: `npx oryn install <slug>` for one-line install to Claude Desktop / Cursor
- [ ] Discord bot for community
- [ ] Public API + docs site
- [ ] Builder grants program (incentive seed for early ecosystem builders)

**Phase 5 success criteria:** 50+ capabilities listed, 10+ active builders earning USDC, mention in Aeon ecosystem map.

---

## 7. Open Questions

These need to be resolved during/before implementation:

1. **Vector DB choice** — Pinecone (managed, $) vs Chroma (self-host, free). Decide based on early Knowledge usage volume.
2. **Token launch timing** — Gate on Phase 4 traction signal (5+ Pro subs, 50+ capabilities). Premature launch hurts brand.
3. **Initial seed strategy** — Wrap Aeon's public skills as inventory v1 (need attribution/permission strategy) vs encourage native builders only.
4. **Smart contract audit** — Internal review v1, professional audit before $10K USDC daily volume.
5. **Domain registration** — `oryn.works` availability and price. If taken, alternates: `useoryn.com`, `oryn.fun`, `orynworks.xyz`.
6. **Logo final** — User searching/commissioning. Wordmark placeholder until logo locked.
7. **Twitter handle** — `@orynworks` availability check. Backup: `@OrynHQ`, `@useoryn`.

---

## 8. Decisions log

| Date | Decision | Rationale |
|---|---|---|
| 2026-05-27 | Layer 3 infrastructure (not agent, not tooling) | Best moat, slow-build aligned, user preference |
| 2026-05-27 | A+B+C combination (Marketplace + Knowledge Vault + Reputation) | Shared infra (same backend, UI, payments), 30-40% extra effort for ~2x TAM |
| 2026-05-27 | Anthropic-style visual (warm cream + orange + serif) | User locked after 4 rounds of visual previews |
| 2026-05-27 | Name: **Oryn Works** (brand short: Oryn) | Ory-style abstract + "Works" workshop suffix that maps to product semantics |
| 2026-05-27 | Domain: `oryn.works` | Brand-product alignment > crypto-default TLD convention |
| 2026-05-27 | Logo: defer — user-driven (Google/designer brief) | ChatGPT generates produced target/Pac-Man reads; user will source separately |
| 2026-05-27 | Built on Base, USDC settled, x402 native | Crypto-native target audience preference |
| 2026-05-27 | Revenue split 90/10 builder/protocol | Builder-friendly to incentivize supply-side |

---

## 9. Glossary

- **MCP** — Model Context Protocol (Anthropic). Standardized way for AI clients to call external tools/skills.
- **EAS** — Ethereum Attestation Service. Schema-based on-chain attestations on Base/Ethereum.
- **x402** — HTTP-native payment protocol (Coinbase). Per-call USDC settlement via HTTP headers.
- **SIWE** — Sign-In With Ethereum. Wallet-native auth via EIP-4361.
- **SBT** — Soulbound Token (ERC-5192). Non-transferable NFT for reputation/credentials.
- **Capability** — A Skill (MCP server) OR Knowledge pack (vector DB) listed on Oryn.
- **Builder** — Wallet that publishes capabilities, earns USDC revenue share.
- **Operator** — Wallet that consumes capabilities to extend AI agents.

---

_End of design spec. Next: implementation plan via `writing-plans` skill._
