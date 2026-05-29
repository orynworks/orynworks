# Oryn Works — Roadmap

> ⚠️ **INTERNAL DOCUMENT** — not for public website.
> Planning artifact for builder + AI assistant. Contains pivot points, decision criteria, and tactical task breakdown that should NOT be public commitments. A simplified public version can be derived for Twitter/website post-launch.

The capability marketplace for AI agents. Built on Base. Settled in USDC.

**Status:** Plan 1A Foundation complete (17 commits). Web app + Fastify gateway + Neon DB + SIWE auth working end-to-end.

**Last updated:** 2026-05-27

---

## Trajectory overview

```
                                  Public
                                  Launch
                                    ↓
  [TEASER] → [CLOSED BETA] → [OPEN BETA] → [v1.0] → [GROW] → [SCALE]
     ▲           ▲              ▲           ▲        ▲         ▲
  Plan 1A     Plan 1B         Plan 1C    Plan 1D  Phase 2-3  Phase 4-5
  ✅ DONE     NEXT            LATER      LAUNCH   POST-MVP   ECOSYSTEM
```

---

## Pre-launch (current → launch ready)

### ✅ Plan 1A — Foundation _(DONE — 17 commits)_
- pnpm monorepo (web + gateway + db + contracts)
- Next.js 16 landing + warm Anthropic brand
- Fastify gateway + Drizzle ORM + Neon Postgres
- SIWE wallet auth full flow
- /me protected page, gateway /me with shared JWT
- Foundry contracts stub
- Twitter banner + logo locked

**Live now:** Landing teaser, wallet connect, sign-in, basic /me dashboard.

---

### ⏳ Plan 1B — Capability Registry _(next ~3-5h)_

**Goal:** Builders can publish capabilities. Users can browse and view detail.

Sub-plans:
- **1B-0** Cleanup (~30 min): fix tsc, lazy DB clients, gate `main()`, README sync
- **1B-1** DB schema extension: `capability` table, indexes, repo helpers
- **1B-2** Builder upload form: `/build/new` page, validation, IPFS metadata
- **1B-3** Browse page: `/browse` with filter, search, sort
- **1B-4** Capability detail page: `/capability/[slug]` with metadata, stats
- **1B-5** Builder dashboard: `/build` shows owner's capabilities

**After Plan 1B:** Closed beta — builders ngumpulin capability, users bisa browse. Belum bisa **call/install** (Plan 1C handles).

---

### ⏳ Plan 1C — Gateway + Payment _(after 1B)_

**Goal:** Agents bisa call capability dengan USDC payment via x402.

Tasks:
- Skill call endpoint: `POST /v1/skills/:slug/call` (proxy to host_url)
- Knowledge query endpoint: `POST /v1/knowledge/:slug/query`
- x402 payment header verify
- Usage event logging (Postgres)
- Builder revenue claim flow

**After Plan 1C:** Open beta — full call + payment flow. Still off-chain settlement (no on-chain contracts yet).

---

### ⏳ Plan 1D — Contracts + Launch _(after 1C)_

**Goal:** On-chain contracts deployed. Public launch.

Tasks:
- `CapabilityRegistry.sol` implementation + Foundry tests
- `RevenueSplitter.sol` implementation + Foundry tests (90% builder / 10% protocol)
- EAS attestation schema registration
- Deploy to Base Sepolia testnet
- Audit pass (self-review)
- Deploy to Base mainnet
- Seed 5-10 capabilities (initial inventory)
- **Soft launch announcement** on Crypto Twitter

**After Plan 1D:** **v1.0 PUBLIC LAUNCH.** Marketplace functional with on-chain trust.

---

## Post-launch updates (growth phase)

### 🌱 Phase 2 — Reputation Layer

**Goal:** Trust signals on capabilities.

- EAS attestation submit flow from user dashboard
- Reputation score cron (daily compute, cached)
- Builder profile page (public, with rep + revenue stats)
- Category leaderboards
- User dashboard: spending, attestations made

**Success metric:** 50+ attestations submitted, 20+ ranked capabilities.

---

### 📚 Phase 3 — Knowledge Packs

**Goal:** Add Knowledge as first-class capability type.

- Vector DB integration (Pinecone atau Chroma — decide based on cost)
- Knowledge upload form + IPFS storage
- Query endpoint with retrieval
- Knowledge detail + preview page

**Success metric:** 10+ knowledge packs published, agent queries with USDC work.

---

## Long-tail evolution

### 💎 Phase 4 — Premium Tiers + Token

**Goal:** Monetization layer matures.

- Token-gated capabilities (ERC-20/721 balance check)
- Coinbase Commerce subscription tier (USDC monthly)
- Builder dashboard analytics (revenue charts)
- User spending dashboard
- **Optional:** launch `$ORYN` token (gate on traction signal — defer if not warranted)

**Success metric:** 5+ paying Pro subscriptions, 1+ token-gated capability.

---

### 🌐 Phase 5 — Ecosystem Integration

**Goal:** Become infrastructure for the agent economy.

- Partner framework integrations (Claude Desktop, Cursor, OpenAgents)
- `@oryn/sdk` npm package
- CLI: `npx oryn install <slug>` (one-line install to Claude Desktop/Cursor)
- Discord bot for community
- Public API + docs site
- Builder grants program

**Success metric:** 50+ capabilities listed, 10+ active builders earning revenue, established presence in the agent ecosystem.

---

## Update cadence (post-v1.0)

Cycle that runs in parallel with Phase 2-5:

| Cadence | Type | Examples |
|---|---|---|
| Daily | Hotfix | Critical bug fix, security patch |
| Weekly | Minor release | New capability seeded, UI polish, copy tweaks |
| Bi-weekly | Feature release | New endpoint, new component, performance optimization |
| Monthly | Phase milestone | Phase progress (e.g., Phase 2 → Phase 3 transition) |
| Quarterly | Strategy review | Adjust roadmap based on metrics, community feedback |

---

## Decision points (when to pivot)

These are not deadlines — they're checkpoints.

- **After Plan 1B (closed beta):** Are there 3+ builders willing to publish? If no, pause and iterate on builder UX.
- **After Plan 1C (open beta):** Is the call-to-payment flow >95% success rate? If no, debug before public launch.
- **After Plan 1D (v1.0 launch):** Hit 50+ capabilities + $1K USDC settled /week within 30 days? If no, focus on supply-side (builder acquisition) before adding features.
- **Phase 4 token launch:** Only proceed if Phase 2-3 metrics validate sustained usage. Premature token launch hurts brand.

---

## Out of scope (for now)

- ❌ Multi-chain (Base only)
- ❌ Mobile app (responsive web is enough)
- ❌ Agent orchestration UI (Layer 2 tooling — separate product if pursued)
- ❌ Cross-protocol federation (Smithery import) — wait until Phase 5
- ❌ Token-gated DAO governance — too early

---

## Related docs

- Design spec: `docs/superpowers/specs/2026-05-27-oryn-works-design.md`
- Plan 1A: `docs/superpowers/plans/2026-05-27-oryn-works-plan-1a-foundation.md`
- Plan 1B (next): `docs/superpowers/plans/2026-05-27-oryn-works-plan-1b-capability-registry.md` _(to be written)_
