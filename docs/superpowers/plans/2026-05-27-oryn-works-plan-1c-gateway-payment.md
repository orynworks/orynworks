# Oryn Works — Plan 1C: Gateway + x402 Payment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`).

**Goal:** Agents can call capabilities via the Fastify gateway, payment is verified via x402 (USDC pre-authorized) OR direct settlement, usage is logged, and builders accrue claimable revenue.

**Scope boundary:** Plan 1C is the EXECUTION layer (runtime call + payment). Plan 1D is on-chain contracts + deployment + launch. After Plan 1C: agents can `POST /v1/skills/:slug/call` from a SDK/CLI and the builder earns USDC for it (off-chain ledger; on-chain settlement = Plan 1D).

**Architecture (Vercel + Railway split confirmed):** Web hosts the marketplace UI + auth + capability CRUD. Gateway (`apps/gateway`) handles the runtime proxy + payment + usage events. Both share `@oryn/db` (Neon Postgres).

**Tech stack additions:**
- x402 protocol library (Coinbase): `x402-fetch` or manual EIP-712 verification
- Fastify rate limiting plugin (`@fastify/rate-limit`)
- (Optional) Server-sent events for streaming responses

---

## Task 0 — Plan 1B polish carryovers (~20 min)

These are the 3 important items from Plan 1B final review.

### Task 0.1: globalThis-pinned lazy DB in apps/web

**File:** `apps/web/lib/db.ts`

Current pattern leaks pools on Next 16 Turbopack HMR. Switch to `globalThis` stash.

- [ ] Replace contents with:

```typescript
import { createDbClient, type DbClient } from "@oryn/db";

declare global {
  // eslint-disable-next-line no-var
  var _orynDb: DbClient | undefined;
}

export function getDb(): DbClient {
  if (!globalThis._orynDb) {
    globalThis._orynDb = createDbClient(process.env.DATABASE_URL!);
  }
  return globalThis._orynDb;
}
```

- [ ] Run `cd apps/web && pnpm build` — verify still builds
- [ ] Commit: `fix(web): pin lazy DB on globalThis to survive Next HMR`

### Task 0.2: /build avoids redundant wallet upsert

**Files:** `apps/web/app/build/page.tsx`, `apps/web/app/build/new/actions.ts`

The verify route already upserts wallet on sign-in. `/build` page reading should use `getWalletByAddress` (read-only) and only upsert when actually publishing.

- [ ] In `apps/web/app/build/page.tsx`, change `upsertWalletByAddress(db, session.address)` to `getWalletByAddress(db, session.address)`. If null (shouldn't happen post-sign-in but be safe), fall back to upsert.
- [ ] In `actions.ts` keep `upsertWalletByAddress` for the publish path (still correct there — it's the canonical "ensure exists for FK").
- [ ] Build, verify dashboard still loads.
- [ ] Commit: `perf(web): read-only wallet lookup on /build dashboard`

### Task 0.3: Lowercase address comparison consistency

**File:** `apps/web/app/capability/[slug]/page.tsx`

Currently compares `session?.address === builderAddress` without lowercasing both. Bug if any caller stores mixed case.

- [ ] Change to `session?.address.toLowerCase() === builderAddress.toLowerCase()`
- [ ] Audit other files for similar comparisons: `apps/web/app/profile/[wallet]/page.tsx` (already does `.toLowerCase()` — confirm)
- [ ] Build, commit: `fix(web): lowercase address comparisons consistently`

---

## Task 1 — Add `usage_event` table + repo

### Step 1: Extend schema

**File:** `packages/db/src/schema.ts`

Append:

```typescript
export const usageEventTypeEnum = pgEnum("usage_event_type", ["call", "query"]);

export const usageEvent = pgTable("usage_event", {
  id: uuid("id").primaryKey().defaultRandom(),
  capabilityId: uuid("capability_id").notNull().references(() => capability.id),
  callerAddress: text("caller_address").notNull(),
  eventType: usageEventTypeEnum("event_type").notNull(),
  requestHash: text("request_hash").notNull(),  // hash of inputs (not raw inputs)
  success: boolean("success").notNull(),
  latencyMs: integer("latency_ms"),
  errorCode: text("error_code"),
  costUsdc: numeric("cost_usdc", { precision: 10, scale: 6 }).notNull().default("0"),
  billed: boolean("billed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UsageEvent = typeof usageEvent.$inferSelect;
export type NewUsageEvent = typeof usageEvent.$inferInsert;
```

Make sure `integer` is imported from `drizzle-orm/pg-core`.

### Step 2: Create `packages/db/src/usage-repo.ts`

Helpers:
- `recordUsageEvent(db, data)` — insert
- `getUsageStats(db, capabilityId, sinceDate)` — aggregate: total, success_rate, avg_latency, p95_latency
- `getCapabilityRevenue(db, capabilityId)` — sum billed cost_usdc
- `listRecentUsageByCapability(db, capabilityId, limit)` — for debugging

### Step 3: Re-export, generate + run migration

```bash
cd packages/db && pnpm generate
cd packages/db && DATABASE_URL=... pnpm migrate
cd packages/db && pnpm build
```

Commit: `feat(db): add usage_event table + repo helpers`

---

## Task 2 — Wire `usage_event` aggregation to capability detail page

**File:** `apps/web/app/capability/[slug]/page.tsx`

Replace the "Usage (last 7d)" `—` placeholders with real numbers from `getUsageStats`.

- [ ] Import `getUsageStats` from `@oryn/db`
- [ ] After fetching the capability, fetch stats for the last 7 days
- [ ] Render: total calls, success rate, avg latency
- [ ] If 0 calls, show "—" + small note "No usage yet"

Commit: `feat(web): wire real usage stats on capability detail page`

---

## Task 3 — Gateway: wallet auth middleware adaptation

The gateway already has `requireAuth` for `/me`. For `POST /v1/skills/:slug/call`, the caller is an AGENT not a user — auth flow may differ.

Two patterns:
A) **Same SIWE JWT** — agent operator signs in via web, gets JWT, agent uses it (via x402 header carries the JWT)
B) **API key** — Operator generates an API key bound to their wallet, agent uses it as Bearer

For MVP, use pattern A (reuse SIWE JWT cookie / Authorization header).

### Step 1: Adapt `requireAuth` middleware

Make it accept JWT from:
1. `Cookie: oryn_session=...` (existing)
2. `Authorization: Bearer <jwt>` (new, for agents)

```typescript
const cookieMatch = (req.headers.cookie ?? "").match(/oryn_session=([^;]+)/);
const bearerMatch = (req.headers.authorization ?? "").match(/^Bearer (.+)$/);
const token = cookieMatch?.[1] ?? bearerMatch?.[1];
if (!token) return reply.code(401).send({ error: "no session" });
```

Commit: `feat(gateway): accept Bearer JWT in addition to cookie`

---

## Task 4 — Gateway: skill call proxy endpoint

**File:** `apps/gateway/src/routes/skills.ts`

### Step 1: Route definition

```typescript
import type { FastifyPluginAsync } from "fastify";
import { createHash } from "node:crypto";
import { getCapabilityBySlug, recordUsageEvent, type Capability } from "@oryn/db";
import { requireAuth } from "../middleware/auth.js";
import { getDb } from "../lib/db.js";

export const skillsRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Params: { slug: string }; Body: unknown }>(
    "/v1/skills/:slug/call",
    { preHandler: requireAuth },
    async (req, reply) => {
      const session = req.session!;
      const { slug } = req.params;
      const db = getDb();

      const cap = await getCapabilityBySlug(db, slug);
      if (!cap || cap.status !== "published" || cap.type !== "skill") {
        return reply.code(404).send({ error: "skill not found" });
      }

      // Hash request body for usage_event (we don't store raw input)
      const requestHash = createHash("sha256")
        .update(JSON.stringify(req.body ?? {}))
        .digest("hex");

      const startTime = Date.now();
      let success = false;
      let errorCode: string | undefined;
      let proxyResponse: unknown = null;

      try {
        // Proxy to capability host
        const upstream = await fetch(cap.hostUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req.body ?? {}),
        });

        if (!upstream.ok) {
          errorCode = `upstream_${upstream.status}`;
          success = false;
        } else {
          proxyResponse = await upstream.json();
          success = true;
        }
      } catch (e) {
        errorCode = e instanceof Error ? e.message.slice(0, 100) : "fetch_failed";
        success = false;
      }

      const latencyMs = Date.now() - startTime;

      // Record usage event (off-chain)
      await recordUsageEvent(db, {
        capabilityId: cap.id,
        callerAddress: session.address,
        eventType: "call",
        requestHash,
        success,
        latencyMs,
        errorCode,
        costUsdc: success ? cap.priceUsdc : "0",  // only charge on success
        billed: false,  // x402 settlement will mark billed=true in Task 5
      });

      if (!success) {
        return reply.code(502).send({ error: errorCode ?? "upstream_error" });
      }

      return { ok: true, data: proxyResponse, costUsdc: cap.priceUsdc };
    }
  );
};
```

### Step 2: Register route in `apps/gateway/src/server.ts`

Add `import { skillsRoute } from "./routes/skills.js";` and `await fastify.register(skillsRoute);` alongside meRoute.

### Step 3: Test with curl against running gateway + a public MCP-like echo URL

(Or just hit our seed capability's hostUrl which will return 404 — that's fine, the test is that gateway records the failed usage_event correctly.)

Commit: `feat(gateway): add skill call proxy endpoint with usage logging`

---

## Task 5 — Gateway: x402 payment verification

x402 is Coinbase's HTTP payment protocol. Headers:
- `X-PAYMENT: <signed payload>` — pre-authorized USDC transfer
- Response `402 Payment Required` if missing/invalid

For MVP, support 2 modes:
1. **Free capability** (priceUsdc=0): no x402 needed
2. **Paid capability**: require valid `X-PAYMENT` header

### Step 1: Add x402 verifier middleware

**File:** `apps/gateway/src/middleware/x402.ts`

Use the `x402-fetch` library or implement EIP-712 verification manually. For now (since x402 SDK landscape is fluid), implement a minimal verifier:

```typescript
import type { FastifyRequest, FastifyReply } from "fastify";
import { recoverTypedDataAddress, parseUnits, type Address } from "viem";

const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address;

export type X402Payload = {
  amountUsdc: string;  // decimal string, e.g. "0.01"
  recipient: Address;
  expiry: number;       // unix timestamp
  signature: `0x${string}`;
};

export async function verifyX402(
  paymentHeader: string,
  expectedAmount: string,
  expectedRecipient: Address
): Promise<{ ok: true; payerAddress: Address } | { ok: false; error: string }> {
  let payload: X402Payload;
  try {
    payload = JSON.parse(Buffer.from(paymentHeader, "base64").toString("utf-8"));
  } catch {
    return { ok: false, error: "malformed X-PAYMENT header" };
  }

  if (payload.expiry < Math.floor(Date.now() / 1000)) {
    return { ok: false, error: "expired payment" };
  }

  if (parseUnits(payload.amountUsdc, 6) < parseUnits(expectedAmount, 6)) {
    return { ok: false, error: "insufficient amount" };
  }

  if (payload.recipient.toLowerCase() !== expectedRecipient.toLowerCase()) {
    return { ok: false, error: "wrong recipient" };
  }

  // Verify EIP-712 signature
  try {
    const payerAddress = await recoverTypedDataAddress({
      domain: { name: "Oryn x402", version: "1", chainId: 8453 },
      types: {
        Payment: [
          { name: "amountUsdc", type: "string" },
          { name: "recipient", type: "address" },
          { name: "expiry", type: "uint256" },
        ],
      },
      primaryType: "Payment",
      message: {
        amountUsdc: payload.amountUsdc,
        recipient: payload.recipient,
        expiry: BigInt(payload.expiry),
      },
      signature: payload.signature,
    });
    return { ok: true, payerAddress };
  } catch {
    return { ok: false, error: "invalid signature" };
  }
}
```

### Step 2: Wire into skill call route

In `apps/gateway/src/routes/skills.ts`, before proxying:

```typescript
if (Number(cap.priceUsdc) > 0) {
  const paymentHeader = req.headers["x-payment"];
  if (!paymentHeader || typeof paymentHeader !== "string") {
    return reply
      .code(402)
      .header("WWW-Authenticate", `X402 realm="oryn", amount="${cap.priceUsdc}"`)
      .send({ error: "payment required", priceUsdc: cap.priceUsdc });
  }

  const builder = await getWalletById(db, cap.builderId);
  if (!builder) return reply.code(500).send({ error: "builder not found" });

  const result = await verifyX402(
    paymentHeader,
    cap.priceUsdc,
    builder.address as Address  // builder address is the recipient
  );
  if (!result.ok) {
    return reply.code(402).send({ error: result.error });
  }
}
```

### Step 3: Update usage_event to mark billed=true on successful paid call

After successful proxy, set `billed: Number(cap.priceUsdc) === 0 ? true : true` — both free and paid are "billed" (free has cost 0 but is settled).

Commit: `feat(gateway): x402 payment verification on paid capability calls`

---

## Task 6 — Knowledge query endpoint (mirror of skill call)

**File:** `apps/gateway/src/routes/knowledge.ts`

Same shape as skills route but:
- Route: `POST /v1/knowledge/:slug/query`
- `eventType: "query"` in usage_event
- Body: `{ prompt: string, topK?: number }` — proxied to capability hostUrl

For MVP, just proxy. Vector DB integration is Phase 3.

Commit: `feat(gateway): add knowledge query proxy endpoint`

---

## Task 7 — Operator dashboard: spending + recent calls

**File:** `apps/web/app/me/page.tsx`

Currently shows just address + chain ID. Add:
- Spending total (sum of usage_event.cost_usdc where caller_address = session.address AND billed = true)
- Recent calls (last 10 from `listRecentUsageByCaller`)

Add `listRecentUsageByCaller(db, address, limit)` to usage-repo.

Commit: `feat(web): operator dashboard with spending + recent calls`

---

## Task 8 — Builder dashboard: revenue + usage breakdown

**File:** `apps/web/app/build/page.tsx`

Per capability in the list, show:
- Total revenue (USDC) — sum of cost_usdc where capability_id IN owner's caps AND billed = true
- Calls last 7d
- Success rate

Commit: `feat(web): builder dashboard with revenue + usage stats per capability`

---

## Acceptance criteria (Plan 1C complete when ALL pass)

- [ ] Task 0 polish (3 commits)
- [ ] `usage_event` table in Neon
- [ ] Capability detail page shows real stats (not `—`) when usage exists
- [ ] Gateway accepts Bearer JWT in addition to Cookie
- [ ] `POST /v1/skills/:slug/call` proxies to hostUrl and logs usage_event
- [ ] Paid capability requires valid `X-PAYMENT` header (returns 402 if missing)
- [ ] `POST /v1/knowledge/:slug/query` works (proxy only for MVP)
- [ ] `/me` shows operator spending + recent calls
- [ ] `/build` shows per-capability revenue + usage
- [ ] All routes build, gateway tests still pass

---

## What's NOT in Plan 1C

- ❌ On-chain settlement (USDC transfer happens via x402, but registry + revenue contract = Plan 1D)
- ❌ Attestation submission (Phase 2)
- ❌ Vector DB for knowledge (Phase 3)
- ❌ Subscription tiers (Phase 4)
- ❌ Vercel/Railway deploy (Plan 1D)

---

_End of Plan 1C. After execution, write Plan 1D._
