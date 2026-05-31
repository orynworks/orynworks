# Oryn Works — Canonical Product Doc

> Single source of truth for product, technical architecture, brand, and vocabulary.
> Any copy edit, feature change, or external pitch should reconcile with this file.
> Update this file as the product evolves.

---

## 1. Core: What It Is

Oryn Works is a **marketplace for AI agent capabilities**. Builders publish *skills* (callable tools — e.g. "send a transaction on Base") and *knowledge packs* (queryable datasets — e.g. "trending tokens today"). Operators (devs building AI agent products) discover and install capabilities with one CLI command. Every call is billed per-use in USDC on Base. Every call also leaves an on-chain trace — builders and capabilities accumulate reputation that compounds.

**Simple analog:** App Store for agents, with pay-per-use billing and on-chain reviews that can't be faked.

---

## 2. Why It Exists — Problem We Solve

**The current situation:**
- AI agents (Claude, GPT, Cursor, etc.) are increasingly powerful, but they need external tools and data to be useful in production.
- **MCP (Model Context Protocol)** has become the standard for agents to talk to tools. Anthropic, Cursor, and IDEs have adopted it.
- **But there is no:**
  - Central place to discover MCP tools
  - Way to monetize MCP servers (builders work for free)
  - Way to know which MCP servers are trustworthy
  - Payment rails for per-call billing

**Oryn Works fills all four gaps:**
1. Discovery (browse hub)
2. Monetization (pay-per-call, builder revenue share)
3. Trust (on-chain reputation from real usage)
4. Payment infra (x402 + USDC + Base)

---

## 3. Two-Sided Market

### Side A: Builders
- Devs with valuable skills / data publish to Oryn
- Wrap existing MCP servers or build new ones
- Set price per call (or free)
- Earn USDC on every call (revenue share, protocol takes a small fee)
- Builder reputation grows when their capabilities get used

### Side B: Operators
- Teams building AI agent products
- Browse hub, pick capabilities for their agent's needs
- Install via `npx oryn install <slug>` into their MCP client
- Agent runs, capability calls are auto-billed
- Can attest (on-chain review) to help builders grow

---

## 4. End-to-End User Flows

### Builder flow
```
1. Connect wallet (SIWE) → identity
2. Go to /build/new → upload form
3. Fill: name, type (skill/knowledge), category, description, host URL, price USDC, version
4. Submit → entry in DB + (optional) register on-chain via CapabilityRegistry
5. Capability appears in /browse, gets URL /capability/<slug>
6. Each install + call → builder earns revenue → reputation grows
```

### Operator flow
```
1. Browse /browse → filter by type, category, price
2. Click capability → /capability/<slug> → see detail + install snippet
3. Copy snippet, paste into Claude/Cursor/MCP client
4. Agent runs, calls capability → gateway intercepts
5. Gateway verifies x402 payment (signed USDC payload)
6. Gateway forwards call to builder host URL
7. Response returns to agent
8. Usage is recorded, on-chain attestation emitted
```

---

## 5. Technical Architecture

### Monorepo layout (pnpm workspaces)
```
basedeploy2/
├── apps/
│   ├── web/          → Next.js 16 marketplace UI
│   └── gateway/      → Fastify proxy + payment verifier
└── packages/
    ├── db/           → Drizzle ORM + Neon Postgres schema
    └── contracts/    → Foundry / Solidity smart contracts
```

### Stack breakdown

| Layer | Tech | Purpose |
|---|---|---|
| **Frontend** | Next.js 16 + Tailwind v4 + wagmi/RainbowKit | Marketplace UI, builder dashboard, capability detail, wallet auth |
| **Auth** | SIWE (Sign-In With Ethereum) + JWT | Wallet = identity, no passwords |
| **Database** | Neon Postgres + Drizzle ORM | Capabilities, wallets, usage records, reputation, nonces |
| **Gateway** | Fastify 4 (ESM, tsx) | Proxy calls to builder MCP servers, verify x402 payment, log usage |
| **Payment** | x402 protocol (EIP-712 signatures) | Per-call USDC payment, replay-protected via nonce |
| **Contracts** | Solidity 0.8.24 + Foundry | CapabilityRegistry (catalog) + RevenueEscrow (settlement) |
| **Chain** | Base mainnet `8453` / Base Sepolia `84532` | L2 for cheap and fast settlement |
| **Currency** | USDC | Billing unit, settled on-chain |

---

## 6. Smart Contracts

### `CapabilityRegistry.sol`
On-chain catalog: each capability has entry `(slug, builder, host, priceWei, version)`. Builders `register()` new capabilities; anyone reads via `getCapability(slugHash)`. Owner can update or deprecate.

| Network | Address |
|---|---|
| **Base mainnet** | `0xDa94bD88aD764EE6eA42Cf450d3fC2f816BA6c37` |
| Base Sepolia | `0xB9a212DF77AEb7F4201d435381D68Ec10f5BAB5d` |

### `RevenueEscrow.sol`
Holds USDC from paid calls. Splits 90/10 between builder and protocol on every `settle()`. Builders `claim()` to withdraw. Owner withdraws protocol treasury via `withdrawProtocol()`.

| Network | Address |
|---|---|
| **Base mainnet** | `0x93397efB596aD82254FB047daa53Ac68c3E70a10` |
| Base Sepolia | `0x6b29663C0802F7Bc8B8750F17627a82258EE6e31` |

### Deploy status
- ✅ Sepolia: deployed + verified on BaseScan
- ✅ Mainnet: deployed 2026-05-31 + verification submitted (gas burned: 0.0000259 ETH)

### Deploy config (mainnet — current)
- Chain ID: `8453`
- USDC (mainnet): `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- Deployer + Protocol Owner: `0x3c0058Ea6178548573922adC8D9aF5B1bd5A703D` (single wallet, both roles)

### Deploy config (testnet — Sepolia)
- Chain ID: `84532`
- USDC (Sepolia): `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- Deployer + Protocol Owner: `0xc07D4A0f6379F119e162Dedf0F67F7648D02Fd20`

---

## 7. Payment Flow (x402)

**x402** = HTTP 402 ("Payment Required") protocol from Coinbase. Per-call payment at the HTTP layer.

### How it works
```
1. Operator wallet pre-approves USDC to gateway
2. Agent calls: GET /skill/alpha-feed?prompt=...
3. Gateway returns 402: "Pay 0.020 USDC, nonce: 0xABC..."
4. Agent's client auto-signs EIP-712 payload (wallet signature)
5. Re-send call with header: X-Payment: <signed-payload>
6. Gateway verifies signature + nonce not used (replay protection)
7. Gateway forwards call to builder's host URL
8. Response returns, gateway batch-settles to RevenueEscrow
9. Builder claims USDC at any time
```

### Why the nonce table
The `nonces` table in Postgres stores every used nonce. Replay attacks (resending a signed payload) get rejected.

---

## 8. Reputation System

Each successful paid call emits an on-chain attestation event. Each attestation records:
- Capability X used by operator Y
- Time, price, outcome (success/fail)

**From this:**
- Capability gets a score: total calls, unique operators, success rate
- Builder gets an aggregate score across all their capabilities
- Score is displayed on /browse + /builder/<address>
- Queryable off-chain (for UI) or on-chain (for composability — other contracts can read Oryn reputation)

**Why on-chain?** Reputation becomes credibly neutral. Can't be faked by builders, can't be censored by Oryn. Usable by other protocols as a lego brick.

---

## 9. Web App Features (Built)

### Public pages
- `/` — Landing (hero, stats bar, how it works, terminal demo, featured capabilities)
- `/browse` — Browse all capabilities + filter + search
- `/capability/<slug>` — Capability detail + install snippet + sidebar info
- `/builder/<address>` — Public builder profile (capabilities + reputation)

### Authed pages (require SIWE login)
- `/build` — Builder dashboard (your capabilities, stats)
- `/build/new` — Upload form (publish new capability)
- `/me` — User profile / settings

### Components
- Header (with wallet connect button)
- Footer (Product / Community columns)
- CapabilityCard (with FREE badge for free capabilities)
- TerminalDemo (Mac-style CLI mockup)
- Logo (bracket-O design)

---

## 10. Gateway (Fastify) — Roles

1. **Proxy** — receives agent requests, forwards to builder's MCP host URL
2. **Payment verifier** — checks x402 signed payload validity, nonce uniqueness
3. **Usage logger** — records calls to DB (capability, operator, price, outcome)
4. **Attestation emitter** — pushes events to RevenueEscrow contract
5. **Settlement** — periodic batch transfer of USDC from escrow to builder claim balance

**Why separate from web?** Web runs on Vercel (edge runtime). Gateway needs long-running processes + private key (for settlement), runs on Railway/VPS.

---

## 11. Brand & Visual Identity

| Element | Value |
|---|---|
| Name | Oryn Works |
| Wordmark | `orynworks` (lowercase, serif) |
| Logo | Bracket-O `[O]` (custom, see `apps/web/public/logo.png` and `logo2.png`) |
| Color: Cream | `#E8DCC8` (primary text + light backgrounds) |
| Color: Orange | `#E5734F` (accent, CTAs, highlights) |
| Color: Warm Dark | `#1A1612` (background) |
| Font: Headlines | Source Serif (serif) |
| Font: Body | System sans |
| Font: Mono | JetBrains Mono (CLI, addresses, eyebrows) |
| Aesthetic reference | Anthropic, Cursor, Linear |

### Asset notes
- `logo.png` — bracket-O with warm-dark background baked in. Use for favicon.
- `logo2.png` — bracket-O with transparent background. Use in-app (Header, Footer).

---

## 12. Vocabulary Rules

### Canonical lines

| Surface | Line |
|---|---|
| H1 | The capability marketplace for AI agents. |
| Subtitle | The settlement layer for AI agent capabilities. Builders publish skills and knowledge. Operators install with a single command. On-chain reputation that compounds. |
| Footer tagline | the capability marketplace for AI agents. |
| One-liner pitch | Agents make calls. Calls need capabilities. Capabilities need a market — with discovery, payment, and trust. That's Oryn Works. |

### Do say
- "Capability marketplace for AI agents"
- "Skills, knowledge, reputation"
- "Pay per use" / "Settled instantly"
- "MCP-aware client" (dev-credible)
- "On-chain reputation" (sparingly, max 2x per page)
- "Builders publish. Operators install."

### Don't say
- "Built on Base" (overused, corporate-cosplay)
- "Web3 / decentralized / blockchain" (defensive buzzwords)
- "Est. 2026" / date stamps
- Em-dashes `—` (user preference)
- "USDC" more than once per page (only in terminal output is fine)
- "Crypto-native" (too defensive)

### x402 mention rule
- OK in `/docs` page
- OK in footer "Powered by" strip (subtle)
- NOT in hero, headlines, or marketing copy
- x402 is plumbing. Outcome ("settled automatically") is what users see.

---

## 13. Roadmap Status

### Done
- Monorepo setup + tooling (pnpm, TypeScript, ESLint)
- Database schema + migrations + seed data (8 capabilities, mixed free/paid)
- Wallet auth (SIWE + JWT)
- Browse / detail / profile pages
- Builder dashboard + upload form
- Landing page (hero, stats, how-it-works, terminal demo, featured)
- Logo + brand system
- Smart contracts deployed + verified on Base Sepolia
- Gateway scaffold (Fastify + x402 verifier)
- Auth UX (Sign-in pages replace error redirects)
- FREE badge on capability cards

### In progress / Next
- Mainnet deploy contracts (Base 8453)
- Vercel deploy web app
- Railway/VPS deploy gateway
- Buy `oryn.works` domain
- Wire gateway ↔ real MCP servers (end-to-end live call test)
- Reputation aggregation worker
- Settlement worker (batch claim)
- `/docs` page (explain x402 + MCP integration)
- Soft launch tweet from @orynworks

### Future
- Builder onboarding flow + email
- Featured capability program (curator)
- Token-gated capabilities (NFT / ERC-20 access)
- Capability composability (skill calling skill)
- SDK for operators (Python, TypeScript)

---

## 14. Pitch Snippets (Pre-Approved Lines)

### 1-sentence
The capability marketplace for AI agents — built on Base.

### 2-sentence
Oryn Works is the marketplace where builders publish skills and knowledge for AI agents, and operators install them with one command. Per-call payments settle in USDC, and reputation lives on-chain.

### 3-sentence (Twitter bio length)
The capability marketplace for AI agents. Builders publish skills + knowledge. Operators install with one command, pay per use, trust on-chain reputation.

### Why-now elevator
Agents are eating software, but they need capabilities — tools, data, niche expertise — that don't ship in model weights. MCP standardized how agents talk to those capabilities. Oryn is the market layer: discovery, payment, reputation.

---

## 15. Operating Principles

- **Plumbing stays hidden.** x402 is real and matters, but users see outcomes ("settled instantly"), not protocols.
- **Outcomes > buzzwords.** "Pay per use" beats "decentralized billing infra."
- **One mention per concept per page.** USDC, on-chain, x402 — each one max once. Repetition reads as defensive.
- **Builder and operator copy must coexist.** Never write copy that excludes one side.
- **On-chain is a feature, not the product.** The product is the marketplace. On-chain is how trust is enforced.
