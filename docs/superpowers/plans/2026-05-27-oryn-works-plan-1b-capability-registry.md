# Oryn Works — Plan 1B: Capability Registry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) for tracking.

**Goal:** Builders can publish capabilities (Skills / Knowledge packs) and users can browse + view details. At the end of Plan 1B: builder upload → registered in DB → visible at `/browse` → clickable to detail page.

**Scope boundary:** Plan 1B handles the CONTENT layer (capability metadata, UI). Plan 1C handles the EXECUTION layer (calling capability with USDC payment). Plan 1D handles the on-chain layer.

**Tech stack additions (on top of Plan 1A):** Zod for form validation. Optional: dropzone for file upload. IPFS via Pinata for metadata storage (defer if not needed for MVP).

---

## Pre-flight: Task 0 — Foundation cleanup

Critical issues from Plan 1A final review must be fixed first.

### Task 0.1: Add `"type": "module"` to gateway package.json

**File:** `apps/gateway/package.json`

- [ ] Add `"type": "module"` field after `"private": true`
- [ ] Run `pnpm install` to refresh
- [ ] Run `cd apps/gateway && pnpm test` — should still pass
- [ ] Commit: `chore(gateway): set type:module for proper ESM`

### Task 0.2: Restore `.js` extensions in packages/db

**Files:** `packages/db/src/index.ts`, `packages/db/src/client.ts`, `packages/db/src/wallet-repo.ts`

- [ ] Add `.js` extensions to all relative imports (e.g., `from "./schema"` → `from "./schema.js"`)
- [ ] Revert `tsconfig.json` `moduleResolution` from `"Bundler"` back to `"Node16"`
- [ ] Verify `cd packages/db && npx tsc --noEmit` passes
- [ ] Verify `apps/web` and `apps/gateway` still build
- [ ] Commit: `fix(db): restore .js extensions for Node16 module resolution`

### Task 0.3: Lazy DB client singleton

**Files:** `apps/web/app/api/auth/verify/route.ts`, `apps/gateway/src/routes/me.ts`

Pattern:
```typescript
import { createDbClient, type DbClient } from "@oryn/db";

let _db: DbClient | undefined;
function getDb(): DbClient {
  if (!_db) _db = createDbClient(process.env.DATABASE_URL!);
  return _db;
}

// Use getDb() inside request handlers instead of top-level const
```

- [ ] Apply to web verify route
- [ ] Apply to gateway me route
- [ ] Build both apps, verify tests still pass
- [ ] Commit: `refactor: lazy-init DB clients to avoid pool leaks`

### Task 0.4: Gate `main()` in gateway server

**File:** `apps/gateway/src/server.ts`

Wrap the `main()` call so it only runs when file is executed directly, not on import:

```typescript
import { fileURLToPath } from "url";

const isEntrypoint = fileURLToPath(import.meta.url) === process.argv[1];
if (isEntrypoint) {
  main();
}
```

- [ ] Apply gate
- [ ] Run `pnpm test` in gateway — vitest should now exit 0 cleanly
- [ ] Run `pnpm dev` in gateway — should still start normally
- [ ] Commit: `fix(gateway): gate main() behind entrypoint check`

### Task 0.5: README sync to Neon

**File:** `README.md`

- [ ] Replace docker-compose references with Neon setup instructions
- [ ] Note: `pnpm db:up` no longer needed (Neon is cloud)
- [ ] Add Neon signup link
- [ ] Note `DATABASE_URL` must be in both `apps/gateway/.env` and `apps/web/.env.local`
- [ ] Commit: `docs: update README for Neon cloud DB setup`

### Task 0.6: Shared session module

**Files:** Create `packages/auth/` (new workspace package) — OR consolidate in `packages/db/src/session.ts`

For simplicity, add to existing `packages/db`:

- [ ] Create `packages/db/src/session.ts`:
  ```typescript
  import { SignJWT, jwtVerify } from "jose";

  export type SessionPayload = { address: string; chainId: number };

  export function createSessionToken(secret: Uint8Array, payload: SessionPayload) {
    return new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(secret);
  }

  export async function verifySessionToken(
    secret: Uint8Array,
    token: string
  ): Promise<SessionPayload | null> {
    try {
      const { payload } = await jwtVerify(token, secret);
      if (typeof payload.address !== "string" || typeof payload.chainId !== "number") return null;
      return { address: payload.address, chainId: payload.chainId };
    } catch { return null; }
  }
  ```
- [ ] Add `jose` to `packages/db/package.json` dependencies
- [ ] Re-export from `packages/db/src/index.ts`
- [ ] Delete `apps/web/lib/session.ts` and `apps/gateway/src/lib/session.ts`
- [ ] Update callers to use `@oryn/db` session helpers
- [ ] Build + test both apps
- [ ] Commit: `refactor: consolidate session helpers in @oryn/db`

---

## Task 1: Extend DB schema for capabilities

**Files:**
- Modify: `packages/db/src/schema.ts`
- Create: `packages/db/src/capability-repo.ts`
- Modify: `packages/db/src/index.ts`

### Step 1: Add capability table to schema

Append to `packages/db/src/schema.ts`:

```typescript
export const capabilityTypeEnum = pgEnum("capability_type", ["skill", "knowledge"]);
export const capabilityStatusEnum = pgEnum("capability_status", ["draft", "published", "deprecated"]);

export const capability = pgTable("capability", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  type: capabilityTypeEnum("type").notNull(),
  builderId: uuid("builder_id").notNull().references(() => wallet.id),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  hostUrl: text("host_url").notNull(),
  priceUsdc: numeric("price_usdc", { precision: 10, scale: 6 }).notNull().default("0"),
  tokenGated: boolean("token_gated").notNull().default(false),
  requiredToken: text("required_token"),
  status: capabilityStatusEnum("status").notNull().default("draft"),
  version: text("version").notNull().default("1.0.0"),
  metadataUri: text("metadata_uri"),
  onchainHash: text("onchain_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Capability = typeof capability.$inferSelect;
export type NewCapability = typeof capability.$inferInsert;
```

(Note: import `numeric`, `boolean` from `drizzle-orm/pg-core` at top.)

### Step 2: Generate + run migration

- [ ] `cd packages/db && pnpm generate` — creates new migration SQL
- [ ] `DATABASE_URL=... pnpm migrate` — applies to Neon
- [ ] Verify in Neon dashboard: `capability` table exists

### Step 3: Create repo helpers

Create `packages/db/src/capability-repo.ts`:

```typescript
import { eq, and, desc, ilike, or } from "drizzle-orm";
import { capability, type Capability, type NewCapability } from "./schema.js";
import type { DbClient } from "./client.js";

export async function createCapability(db: DbClient, data: NewCapability): Promise<Capability> {
  const [created] = await db.insert(capability).values(data).returning();
  return created;
}

export async function getCapabilityBySlug(db: DbClient, slug: string): Promise<Capability | null> {
  const result = await db.select().from(capability).where(eq(capability.slug, slug)).limit(1);
  return result[0] ?? null;
}

export async function listPublishedCapabilities(
  db: DbClient,
  filters: {
    type?: "skill" | "knowledge";
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<Capability[]> {
  const conditions = [eq(capability.status, "published")];
  if (filters.type) conditions.push(eq(capability.type, filters.type));
  if (filters.category) conditions.push(eq(capability.category, filters.category));
  if (filters.search) {
    conditions.push(or(
      ilike(capability.name, `%${filters.search}%`),
      ilike(capability.description, `%${filters.search}%`),
      ilike(capability.slug, `%${filters.search}%`)
    )!);
  }
  return db
    .select()
    .from(capability)
    .where(and(...conditions))
    .orderBy(desc(capability.createdAt))
    .limit(filters.limit ?? 50)
    .offset(filters.offset ?? 0);
}

export async function listCapabilitiesByBuilder(
  db: DbClient,
  builderId: string
): Promise<Capability[]> {
  return db
    .select()
    .from(capability)
    .where(eq(capability.builderId, builderId))
    .orderBy(desc(capability.createdAt));
}
```

### Step 4: Re-export

In `packages/db/src/index.ts`, add:
```typescript
export * from "./capability-repo.js";
```

### Step 5: Commit

```bash
git add packages/db
git commit -m "feat(db): add capability schema + repo helpers"
```

---

## Task 2: Builder upload form `/build/new`

**Files:**
- Create: `apps/web/app/build/new/page.tsx` — form page
- Create: `apps/web/app/build/new/actions.ts` — Server Action to create capability
- Modify: `apps/web/app/build/page.tsx` — link to /build/new

### Step 1: Replace `/build` stub with builder dashboard

Update `apps/web/app/build/page.tsx`:

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { createDbClient, listCapabilitiesByBuilder, upsertWalletByAddress } from "@oryn/db";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getSession } from "@/lib/get-session";

const db = createDbClient(process.env.DATABASE_URL!);  // (will be replaced with lazy getDb after Task 0.3)

export default async function BuildPage() {
  const session = await getSession();
  if (!session) redirect("/?error=auth_required");

  const walletRecord = await upsertWalletByAddress(db, session.address);
  const myCapabilities = await listCapabilitiesByBuilder(db, walletRecord.id);

  return (
    <main className="min-h-screen flex flex-col">
      <Header showDashboardLink />
      <section className="flex-1 px-6 py-12 max-w-5xl mx-auto w-full">
        <div className="flex items-baseline justify-between mb-10">
          <div>
            <p className="text-xs tracking-[0.3em] text-cream/60 uppercase mb-3 font-mono">Build</p>
            <h1 className="font-serif text-4xl">Your capabilities</h1>
          </div>
          <Link
            href="/build/new"
            className="bg-orange text-warmdark px-6 py-3 font-mono text-xs uppercase tracking-widest hover:bg-orange-light transition-colors"
          >
            + Publish new
          </Link>
        </div>

        {myCapabilities.length === 0 ? (
          <div className="border border-cream/10 px-8 py-16 text-center">
            <p className="text-cream/60 mb-4">No capabilities yet.</p>
            <p className="text-cream/40 text-sm">Publish your first Skill (MCP server URL) or Knowledge pack.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {myCapabilities.map((cap) => (
              <li key={cap.id} className="border border-cream/10 px-5 py-4 flex items-center justify-between">
                <div>
                  <Link href={`/capability/${cap.slug}`} className="font-serif text-lg hover:text-orange">
                    {cap.name}
                  </Link>
                  <p className="text-xs font-mono text-cream/50 mt-1">
                    {cap.slug} · {cap.type} · {cap.category} · {cap.status}
                  </p>
                </div>
                <span className="text-xs font-mono text-cream/40">${cap.priceUsdc}/call</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <Footer />
    </main>
  );
}
```

### Step 2: Create `/build/new` form page

Create `apps/web/app/build/new/page.tsx` and `apps/web/app/build/new/actions.ts`.

(Full Zod schema validation, slug auto-generation from name, redirect to detail page on success. See plan reference for full code.)

**Field set:**
- name (text)
- slug (text, auto-generated from name, editable)
- type (radio: skill | knowledge)
- category (select: data, action, knowledge, utility)
- description (textarea, markdown supported)
- hostUrl (URL — MCP server endpoint atau IPFS hash for knowledge pack)
- priceUsdc (number, default 0)
- tokenGated (checkbox, optional)
- requiredToken (address, optional, shown if tokenGated)

### Step 3: Server Action `createCapabilityAction`

In `actions.ts`:
- Parse + validate form via Zod
- Get session, upsert wallet to get builderId
- Insert capability via `createCapability(db, ...)`
- Redirect to `/capability/[slug]`

### Step 4: Commit

```bash
git add apps/web
git commit -m "feat(web): builder dashboard + capability upload form"
```

---

## Task 3: Browse page `/browse`

**Files:**
- Modify: `apps/web/app/browse/page.tsx` — replace stub with real list
- Create: `apps/web/components/CapabilityCard.tsx` — card UI

### Step 1: Replace stub with capability list

Capability cards in grid (2-3 columns desktop, 1 column mobile). Each card shows:
- Type badge (Skill / Knowledge)
- Name (serif, large)
- Description (truncated 2 lines)
- Category tag
- Price per call/query
- Builder address (truncated)
- Created date

Filter UI:
- Tabs at top: All / Skills / Knowledge
- Category dropdown
- Search input (debounced)

URL state: `/browse?type=skill&category=data&q=research`

### Step 2: Create CapabilityCard component

```tsx
import Link from "next/link";
import type { Capability } from "@oryn/db";

export function CapabilityCard({ capability }: { capability: Capability }) {
  return (
    <Link href={`/capability/${capability.slug}`} className="block border border-cream/10 p-5 hover:border-orange transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono uppercase tracking-widest text-orange">
          {capability.type === "skill" ? "Skill" : "Knowledge"}
        </span>
        <span className="text-[10px] font-mono text-cream/40">{capability.category}</span>
      </div>
      <h3 className="font-serif text-xl mb-2">{capability.name}</h3>
      <p className="text-sm text-cream/60 line-clamp-2 mb-4">{capability.description}</p>
      <div className="flex items-center justify-between text-xs font-mono text-cream/50">
        <span>${capability.priceUsdc}/call</span>
        <span>v{capability.version}</span>
      </div>
    </Link>
  );
}
```

### Step 3: Build + commit

```bash
git add apps/web
git commit -m "feat(web): browse page with filter, search, capability cards"
```

---

## Task 4: Capability detail page `/capability/[slug]`

**Files:**
- Create: `apps/web/app/capability/[slug]/page.tsx`
- Create: `apps/web/components/InstallSnippet.tsx` (copy-to-clipboard code)

### Step 1: Detail page layout

Two-column layout (stacks on mobile):

**Left column (main content):**
- Breadcrumb (Browse → Category → Name)
- Type + category badges
- Name (huge serif)
- Description (rendered Markdown)
- "How to use" section with copy-paste install snippet
- Stats (calls/queries this week, success rate — placeholders, real numbers Plan 1C)

**Right column (sidebar):**
- Price per call: $X.XX USDC
- Builder profile (wallet address, link to `/profile/[wallet]`)
- Version, status, published date
- Token-gated indicator (if applicable)
- Install button (deep-link to Claude Desktop for MCP — placeholder for now)

### Step 2: Install snippet component

For Skills:
```typescript
"use client";
import { useState } from "react";

export function InstallSnippet({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const command = `npx oryn install ${slug}`;
  
  return (
    <div className="bg-warmdark-deep border border-cream/10 px-4 py-3 flex items-center justify-between">
      <code className="font-mono text-sm text-cream/90">{command}</code>
      <button
        onClick={() => { navigator.clipboard.writeText(command); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        className="text-xs font-mono uppercase tracking-wider text-cream/60 hover:text-orange"
      >
        {copied ? "Copied ✓" : "Copy"}
      </button>
    </div>
  );
}
```

Note: `npx oryn install` CLI is Phase 5 — for now the snippet is a placeholder representing intent.

### Step 3: Commit

```bash
git add apps/web
git commit -m "feat(web): capability detail page with install snippet"
```

---

## Task 5: Public builder profile `/profile/[wallet]`

**Files:**
- Create: `apps/web/app/profile/[wallet]/page.tsx`

Show builder's published capabilities + basic stats (count, type breakdown). No private data (revenue stays in /build only).

### Commit

```bash
git commit -m "feat(web): public builder profile page"
```

---

## Task 6: Landing page reveal — featured capabilities

**Files:**
- Modify: `apps/web/app/page.tsx`

Add a "Featured" section between hero and footer:

- Server-fetch top 3-6 published capabilities (by recency for now, later by reputation)
- Display in grid below hero
- "Browse all" link to `/browse`

Now landing isn't just teaser — it shows live inventory.

### Commit

```bash
git commit -m "feat(web): featured capabilities section on landing"
```

---

## Task 7: Seed sample data

Insert 5-10 sample capabilities via SQL or seed script so the browse page isn't empty for development.

**File:** `packages/db/src/seed.ts`

Add a script that inserts sample capabilities (wrap public Aeon skills as initial inventory — attribution clear in description).

```bash
pnpm --filter @oryn/db run seed
```

### Commit

```bash
git commit -m "chore(db): add seed data for dev/demo capabilities"
```

---

## Acceptance criteria (Plan 1B complete when ALL pass)

- [ ] All Task 0 cleanup done (`pnpm -r build` exits 0 across all packages)
- [ ] `capability` table exists in Neon
- [ ] Signed-in builder can publish via `/build/new`
- [ ] Capability appears in `/build` dashboard
- [ ] Capability searchable in `/browse` with filters
- [ ] Capability detail page renders at `/capability/[slug]`
- [ ] Featured capabilities show on landing
- [ ] Builder profile public at `/profile/[wallet]`
- [ ] Seed script populates 5-10 sample rows
- [ ] All routes build + render without errors
- [ ] Conventional commits throughout

---

## What's NOT in Plan 1B (saved for 1C / 1D)

- ❌ Actually calling/invoking the capability (Plan 1C)
- ❌ x402 payment verification (Plan 1C)
- ❌ Usage event logging (Plan 1C)
- ❌ Attestation submit + reputation score (Phase 2)
- ❌ Smart contracts on-chain (Plan 1D)
- ❌ Vector DB for Knowledge query (Phase 3)

---

## Self-review checklist (before handoff to executor)

- [ ] Spec section 2.1 (Web App pages) — all routes covered? Yes: /browse, /build, /build/new, /capability/[slug], /profile/[wallet]
- [ ] Spec section 3 (data model) — capability table fields match? Verify against design spec section 3.2 capability table — yes
- [ ] No placeholder TODOs in task code blocks — all snippets are complete
- [ ] Foundation issues from Plan 1A final review — all 5 addressed in Task 0
- [ ] Tasks are well-bounded — each produces a working increment

---

_End of Plan 1B. After execution, write Plan 1C (Gateway + Payment)._
