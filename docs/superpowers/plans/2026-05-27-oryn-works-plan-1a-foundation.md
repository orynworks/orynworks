# Oryn Works — Plan 1A: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up Oryn Works monorepo scaffolding with working wallet auth (SIWE) and base infrastructure — at the end of this plan, an engineer can clone the repo, `pnpm dev`, open the landing page, connect a wallet, sign in, and see authenticated state on a protected `/me` page.

**Architecture:** pnpm workspaces monorepo with 4 packages — `apps/web` (Next.js 15 frontend), `apps/gateway` (Fastify backend), `packages/db` (Drizzle ORM + Postgres schema), `packages/contracts` (Foundry smart contracts stub). Wallet-native auth via SIWE (EIP-4361) with JWT sessions. Postgres runs locally via Docker.

**Tech Stack:** Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui + wagmi/viem + Fastify + Drizzle ORM + Postgres 16 + Foundry/Solidity + Docker Compose

---

## File Structure

```
oryn-works/
├── apps/
│   ├── web/                       # Next.js frontend (port 3000)
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx            # Landing page
│   │   │   ├── me/page.tsx         # Protected profile page
│   │   │   └── api/auth/
│   │   │       ├── nonce/route.ts  # SIWE nonce issuer
│   │   │       └── verify/route.ts # SIWE signature verifier
│   │   ├── components/
│   │   │   ├── ConnectButton.tsx   # Wallet connect / sign-in UI
│   │   │   ├── Header.tsx
│   │   │   └── Footer.tsx
│   │   ├── lib/
│   │   │   ├── wagmi.ts            # wagmi config (Base mainnet + Sepolia)
│   │   │   ├── auth.ts             # SIWE client helpers
│   │   │   └── session.ts          # JWT session cookie helpers
│   │   ├── public/
│   │   ├── tailwind.config.ts
│   │   ├── next.config.js
│   │   └── package.json
│   └── gateway/                    # Fastify backend (port 4000)
│       ├── src/
│       │   ├── server.ts           # Fastify entry
│       │   ├── routes/
│       │   │   ├── health.ts       # GET /health
│       │   │   └── me.ts           # GET /me (protected)
│       │   ├── middleware/
│       │   │   └── auth.ts         # JWT verify middleware
│       │   ├── lib/
│       │   │   └── db.ts           # Drizzle client init
│       │   └── env.ts              # Environment validation
│       ├── test/
│       │   ├── health.test.ts
│       │   └── auth.test.ts
│       └── package.json
├── packages/
│   ├── db/                         # Shared Drizzle schema + client
│   │   ├── src/
│   │   │   ├── schema.ts           # wallet table (Plan 1A scope)
│   │   │   ├── client.ts
│   │   │   └── index.ts
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   └── contracts/                  # Foundry stub (full impl in Plan 1D)
│       ├── src/
│       │   └── .gitkeep
│       ├── test/
│       │   └── .gitkeep
│       └── foundry.toml
├── docker-compose.yml              # Local Postgres 16
├── .env.example
├── .gitignore
├── pnpm-workspace.yaml
├── package.json
├── README.md
└── .editorconfig
```

---

## Task 1: Initialize monorepo + root tooling

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `package.json`
- Create: `.gitignore`
- Create: `.editorconfig`
- Create: `README.md`

- [ ] **Step 1: Verify prerequisites**

Run:
```bash
node --version    # Expected: v20.x or higher
pnpm --version    # Expected: 9.x or higher (install via: npm i -g pnpm@latest)
docker --version  # Expected: 24.x or higher
git --version
```

All four must succeed before proceeding. If any missing, install before continuing.

- [ ] **Step 2: Initialize git + root files**

In the empty project root:
```bash
git init
git branch -m main
```

- [ ] **Step 3: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- [ ] **Step 4: Create root `package.json`**

```json
{
  "name": "oryn-works",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "pnpm -r --parallel run dev",
    "build": "pnpm -r run build",
    "test": "pnpm -r run test",
    "lint": "pnpm -r run lint",
    "db:up": "docker compose up -d postgres",
    "db:down": "docker compose down",
    "db:migrate": "pnpm --filter @oryn/db run migrate"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "tsx": "^4.16.0",
    "@types/node": "^20.14.0"
  },
  "packageManager": "pnpm@9.7.0",
  "engines": {
    "node": ">=20"
  }
}
```

- [ ] **Step 5: Create `.gitignore`**

```
# deps
node_modules/
.pnpm-store/

# build outputs
.next/
dist/
out/
build/

# env
.env
.env.local
.env.*.local

# logs
*.log
.npm/
.pnpm-debug.log*

# IDE
.vscode/
.idea/
*.swp
.DS_Store

# foundry
packages/contracts/cache/
packages/contracts/out/
packages/contracts/broadcast/

# postgres data
.postgres-data/
```

- [ ] **Step 6: Create `.editorconfig`**

```
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false

[*.sol]
indent_size = 4
```

- [ ] **Step 7: Create initial `README.md`**

```markdown
# Oryn Works

The capability marketplace for AI agents. Built on Base. Settled in USDC.

## Quick start

```bash
pnpm install
pnpm db:up
pnpm db:migrate
pnpm dev
```

Open http://localhost:3000

## Structure

- `apps/web` — Next.js frontend (port 3000)
- `apps/gateway` — Fastify backend (port 4000)
- `packages/db` — Drizzle schema + client
- `packages/contracts` — Foundry smart contracts

## Docs

- Design spec: `docs/superpowers/specs/2026-05-27-oryn-works-design.md`
- Implementation plans: `docs/superpowers/plans/`
```

- [ ] **Step 8: Install root devDependencies**

Run:
```bash
pnpm install
```

Expected: pnpm creates `pnpm-lock.yaml` and installs typescript/tsx/@types/node at root.

- [ ] **Step 9: Commit**

```bash
git add .
git commit -m "chore: initialize pnpm monorepo scaffolding"
```

---

## Task 2: Bootstrap `apps/web` with Next.js 15 + Tailwind

**Files:**
- Create: `apps/web/` (via `create-next-app`)
- Modify: `apps/web/package.json` (rename, add scripts)
- Modify: `apps/web/tailwind.config.ts` (add brand palette)
- Modify: `apps/web/app/globals.css` (font imports)
- Modify: `apps/web/app/layout.tsx` (brand metadata, fonts)
- Modify: `apps/web/app/page.tsx` (landing skeleton)

- [ ] **Step 1: Scaffold Next.js app**

From project root:
```bash
pnpm create next-app@latest apps/web --typescript --tailwind --app --no-src-dir --import-alias "@/*"
```

When prompted about ESLint, answer **Yes**. When prompted about Turbopack, answer **No** (for stability).

- [ ] **Step 2: Rename package + add dev script port**

Edit `apps/web/package.json` — change `name` to `@oryn/web`, ensure dev script binds to port 3000:

```json
{
  "name": "@oryn/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "lint": "next lint"
  }
}
```

Keep dependencies and devDependencies as scaffolded.

- [ ] **Step 3: Add brand palette to Tailwind config**

Replace `apps/web/tailwind.config.ts` with:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: "#E8DCC8",
          light: "#F5EDE0",
          dark: "#C4B89C",
        },
        orange: {
          DEFAULT: "#E5734F",
          light: "#FF8855",
          dark: "#C05E3D",
        },
        warmdark: {
          DEFAULT: "#1A1612",
          light: "#2A2218",
          deep: "#0D0A06",
        },
      },
      fontFamily: {
        serif: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 4: Add fonts via next/font**

Replace `apps/web/app/layout.tsx`:

```typescript
import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Oryn Works — Capability marketplace for AI agents",
  description:
    "Skills, knowledge, and reputation for AI agents. Built on Base. Settled in USDC.",
  metadataBase: new URL("https://oryn.works"),
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="bg-warmdark text-cream font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Replace `globals.css`**

Replace `apps/web/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color-scheme: dark;
}

html, body {
  background: #1A1612;
  color: #E8DCC8;
}

::selection {
  background: #E5734F;
  color: #1A1612;
}
```

- [ ] **Step 6: Replace `app/page.tsx` with landing skeleton**

Replace `apps/web/app/page.tsx`:

```typescript
export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-2xl text-center">
        <p className="text-xs tracking-[0.3em] text-cream/60 uppercase mb-4">
          A capability marketplace
        </p>
        <h1 className="font-serif text-5xl md:text-6xl leading-tight tracking-tight mb-6">
          The capability<br />marketplace<br />
          <span className="text-orange">for AI agents.</span>
        </h1>
        <p className="text-cream/70 text-lg mb-8 max-w-md mx-auto">
          Skills, knowledge, and reputation — discovered, installed, attested.
          Built on Base. Settled in USDC.
        </p>
        <div className="text-xs font-mono text-cream/50 tracking-wider">
          EST. 2026 / BUILT ON BASE
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 7: Run dev server + verify**

Run:
```bash
cd apps/web && pnpm dev
```

Open `http://localhost:3000` — should see warm dark background with cream serif headline.

Stop the server with `Ctrl+C`.

- [ ] **Step 8: Commit**

```bash
git add apps/web pnpm-lock.yaml
git commit -m "feat(web): bootstrap Next.js 15 with brand palette and landing skeleton"
```

---

## Task 3: Bootstrap `apps/gateway` with Fastify + TypeScript

**Files:**
- Create: `apps/gateway/package.json`
- Create: `apps/gateway/tsconfig.json`
- Create: `apps/gateway/src/env.ts`
- Create: `apps/gateway/src/server.ts`
- Create: `apps/gateway/src/routes/health.ts`

- [ ] **Step 1: Create `apps/gateway/package.json`**

```json
{
  "name": "@oryn/gateway",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "fastify": "^4.28.0",
    "@fastify/cors": "^9.0.1",
    "@fastify/jwt": "^8.0.1",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "tsx": "^4.16.0",
    "vitest": "^1.6.0",
    "@types/node": "^20.14.0"
  }
}
```

- [ ] **Step 2: Create `apps/gateway/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules", "test"]
}
```

- [ ] **Step 3: Create `apps/gateway/src/env.ts`**

```typescript
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 chars"),
  DATABASE_URL: z.string().url(),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
```

- [ ] **Step 4: Create `apps/gateway/src/routes/health.ts`**

```typescript
import type { FastifyPluginAsync } from "fastify";

export const healthRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get("/health", async () => {
    return {
      status: "ok",
      service: "oryn-gateway",
      timestamp: new Date().toISOString(),
    };
  });
};
```

- [ ] **Step 5: Create `apps/gateway/src/server.ts`**

```typescript
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { env } from "./env.js";
import { healthRoute } from "./routes/health.js";

export async function buildServer() {
  const fastify = Fastify({
    logger: env.NODE_ENV === "development" ? { transport: { target: "pino-pretty" } } : true,
  });

  await fastify.register(cors, {
    origin: env.WEB_ORIGIN,
    credentials: true,
  });

  await fastify.register(jwt, {
    secret: env.JWT_SECRET,
  });

  await fastify.register(healthRoute);

  return fastify;
}

async function main() {
  const fastify = await buildServer();
  try {
    await fastify.listen({ port: env.PORT, host: "0.0.0.0" });
    console.log(`✓ Oryn Gateway listening on port ${env.PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();
```

- [ ] **Step 6: Add pino-pretty for dev logs**

```bash
cd apps/gateway && pnpm add -D pino-pretty
```

- [ ] **Step 7: Install dependencies**

From project root:
```bash
pnpm install
```

- [ ] **Step 8: Write `.env.example` at root**

```
# Postgres
DATABASE_URL=postgres://oryn:oryn@localhost:5432/oryn_dev

# Gateway
PORT=4000
JWT_SECRET=change-me-to-a-random-32-char-string-or-longer
WEB_ORIGIN=http://localhost:3000
NODE_ENV=development

# Web (apps/web/.env.local)
NEXT_PUBLIC_GATEWAY_URL=http://localhost:4000
NEXT_PUBLIC_BASE_CHAIN_ID=8453
NEXT_PUBLIC_BASE_SEPOLIA_CHAIN_ID=84532
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=get-from-cloud.walletconnect.com
```

- [ ] **Step 9: Create `apps/gateway/.env` (local, gitignored)**

Copy `.env.example` content into `apps/gateway/.env`, replace `JWT_SECRET` with a real random string (use `openssl rand -hex 32` on macOS/Linux or `[Convert]::ToBase64String((1..32 | ForEach-Object {Get-Random -Maximum 256}))` in PowerShell).

- [ ] **Step 10: Verify gateway runs**

Run:
```bash
cd apps/gateway && pnpm dev
```

In another terminal:
```bash
curl http://localhost:4000/health
```

Expected output:
```json
{"status":"ok","service":"oryn-gateway","timestamp":"2026-05-27T..."}
```

Stop with `Ctrl+C`.

- [ ] **Step 11: Commit**

```bash
git add apps/gateway pnpm-lock.yaml .env.example
git commit -m "feat(gateway): bootstrap Fastify server with health endpoint and env validation"
```

---

## Task 4: Set up `packages/db` with Drizzle ORM

**Files:**
- Create: `packages/db/package.json`
- Create: `packages/db/tsconfig.json`
- Create: `packages/db/drizzle.config.ts`
- Create: `packages/db/src/schema.ts`
- Create: `packages/db/src/client.ts`
- Create: `packages/db/src/index.ts`

- [ ] **Step 1: Create `packages/db/package.json`**

```json
{
  "name": "@oryn/db",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "generate": "drizzle-kit generate",
    "migrate": "tsx src/migrate.ts",
    "studio": "drizzle-kit studio"
  },
  "dependencies": {
    "drizzle-orm": "^0.32.0",
    "postgres": "^3.4.4"
  },
  "devDependencies": {
    "drizzle-kit": "^0.23.0",
    "tsx": "^4.16.0",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 2: Create `packages/db/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "declaration": true,
    "outDir": "dist"
  },
  "include": ["src/**/*", "drizzle.config.ts"]
}
```

- [ ] **Step 3: Create `packages/db/src/schema.ts`**

Plan 1A only needs the `wallet` table. Other tables (capability, attestation, etc.) come in Plan 1B.

```typescript
import { pgTable, uuid, text, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const walletRoleEnum = pgEnum("wallet_role", ["builder", "operator", "both"]);

export const wallet = pgTable("wallet", {
  id: uuid("id").primaryKey().defaultRandom(),
  address: text("address").notNull().unique(),
  role: walletRoleEnum("role").notNull().default("both"),
  displayName: text("display_name"),
  bio: text("bio"),
  twitter: text("twitter"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Wallet = typeof wallet.$inferSelect;
export type NewWallet = typeof wallet.$inferInsert;
```

- [ ] **Step 4: Create `packages/db/src/client.ts`**

```typescript
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema.js";

export function createDbClient(databaseUrl: string) {
  const sql = postgres(databaseUrl, { max: 10 });
  return drizzle(sql, { schema });
}

export type DbClient = ReturnType<typeof createDbClient>;
```

- [ ] **Step 5: Create `packages/db/src/index.ts`**

```typescript
export * from "./schema.js";
export * from "./client.js";
```

- [ ] **Step 6: Create `packages/db/drizzle.config.ts`**

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://oryn:oryn@localhost:5432/oryn_dev",
  },
});
```

- [ ] **Step 7: Create `packages/db/src/migrate.ts`**

```typescript
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1 });
const db = drizzle(sql);

await migrate(db, { migrationsFolder: "./drizzle" });
console.log("✓ Migrations complete");
await sql.end();
```

- [ ] **Step 8: Install dependencies**

From project root:
```bash
pnpm install
```

- [ ] **Step 9: Commit**

```bash
git add packages/db pnpm-lock.yaml
git commit -m "feat(db): set up Drizzle schema with wallet table"
```

---

## Task 5: Local Postgres via Docker Compose

**Files:**
- Create: `docker-compose.yml`

- [ ] **Step 1: Create `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: oryn-postgres
    environment:
      POSTGRES_USER: oryn
      POSTGRES_PASSWORD: oryn
      POSTGRES_DB: oryn_dev
    ports:
      - "5432:5432"
    volumes:
      - ./.postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U oryn -d oryn_dev"]
      interval: 5s
      timeout: 5s
      retries: 5
```

- [ ] **Step 2: Start Postgres**

```bash
pnpm db:up
```

Wait ~5 seconds, then verify:
```bash
docker exec oryn-postgres pg_isready -U oryn -d oryn_dev
```

Expected: `accepting connections`

- [ ] **Step 3: Generate initial migration**

From project root:
```bash
cd packages/db && pnpm generate
```

Drizzle Kit will create `packages/db/drizzle/0000_*.sql` with the wallet table DDL.

- [ ] **Step 4: Run migration**

```bash
cd packages/db && DATABASE_URL=postgres://oryn:oryn@localhost:5432/oryn_dev pnpm migrate
```

Expected output: `✓ Migrations complete`

- [ ] **Step 5: Verify table exists**

```bash
docker exec oryn-postgres psql -U oryn -d oryn_dev -c "\dt"
```

Expected: lists `wallet` table.

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml packages/db/drizzle
git commit -m "feat(db): add Docker Compose for local Postgres + initial wallet migration"
```

---

## Task 6: Implement SIWE nonce endpoint in `apps/web`

**Files:**
- Create: `apps/web/app/api/auth/nonce/route.ts`
- Test: manual curl test (no unit test yet; auth integration tested end-to-end in Task 12)

- [ ] **Step 1: Install SIWE dependencies in `apps/web`**

```bash
cd apps/web && pnpm add siwe viem cookies-next jose
```

- [ ] **Step 2: Create nonce route**

Create `apps/web/app/api/auth/nonce/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { generateSiweNonce } from "viem/siwe";
import { cookies } from "next/headers";

export async function GET() {
  const nonce = generateSiweNonce();
  const cookieStore = await cookies();
  cookieStore.set("siwe_nonce", nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });
  return new NextResponse(nonce, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}
```

- [ ] **Step 3: Verify nonce endpoint works**

Run dev server:
```bash
cd apps/web && pnpm dev
```

In another terminal:
```bash
curl -i http://localhost:3000/api/auth/nonce
```

Expected: 200 status, plaintext nonce (16 chars alphanumeric), `Set-Cookie: siwe_nonce=...` header.

- [ ] **Step 4: Commit**

```bash
git add apps/web pnpm-lock.yaml
git commit -m "feat(web): add SIWE nonce endpoint"
```

---

## Task 7: Implement SIWE verify endpoint in `apps/web`

**Files:**
- Create: `apps/web/lib/session.ts`
- Create: `apps/web/app/api/auth/verify/route.ts`
- Modify: `apps/web/.env.local` (add JWT_SECRET)

- [ ] **Step 1: Create `apps/web/lib/session.ts`**

```typescript
import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-only-secret-must-be-replaced-in-production-and-at-least-32-chars"
);

export type SessionPayload = {
  address: string;
  chainId: number;
};

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (typeof payload.address !== "string" || typeof payload.chainId !== "number") {
      return null;
    }
    return { address: payload.address, chainId: payload.chainId };
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Create verify route**

Create `apps/web/app/api/auth/verify/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createPublicClient, http } from "viem";
import { base, baseSepolia } from "viem/chains";
import { parseSiweMessage } from "viem/siwe";
import { createSessionToken } from "@/lib/session";

const chains = { [base.id]: base, [baseSepolia.id]: baseSepolia };

export async function POST(req: NextRequest) {
  const { message, signature } = await req.json();

  if (!message || !signature) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const storedNonce = cookieStore.get("siwe_nonce")?.value;

  if (!storedNonce) {
    return NextResponse.json({ error: "no nonce in session" }, { status: 400 });
  }

  const siweMessage = parseSiweMessage(message);

  if (siweMessage.nonce !== storedNonce) {
    return NextResponse.json({ error: "nonce mismatch" }, { status: 400 });
  }

  const chain = chains[siweMessage.chainId as keyof typeof chains];
  if (!chain) {
    return NextResponse.json({ error: "unsupported chain" }, { status: 400 });
  }

  const publicClient = createPublicClient({ chain, transport: http() });

  const valid = await publicClient.verifySiweMessage({ message, signature });
  if (!valid) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const token = await createSessionToken({
    address: siweMessage.address!.toLowerCase(),
    chainId: siweMessage.chainId!,
  });

  cookieStore.set("oryn_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24,
    path: "/",
  });

  // clear the one-time nonce
  cookieStore.delete("siwe_nonce");

  return NextResponse.json({
    ok: true,
    address: siweMessage.address!.toLowerCase(),
    chainId: siweMessage.chainId!,
  });
}
```

- [ ] **Step 3: Create `apps/web/.env.local`**

```
NEXT_PUBLIC_GATEWAY_URL=http://localhost:4000
NEXT_PUBLIC_BASE_CHAIN_ID=8453
NEXT_PUBLIC_BASE_SEPOLIA_CHAIN_ID=84532
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=replace-with-real-id-from-cloud.walletconnect.com
JWT_SECRET=replace-with-32-char-random-secret-or-longer-not-checked-in-to-git
```

Generate a real `JWT_SECRET` value:
- macOS/Linux: `openssl rand -hex 32`
- Windows PowerShell: `-join ((48..57) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})`

Paste the result as the JWT_SECRET value.

- [ ] **Step 4: Restart dev server**

Stop and re-run `pnpm dev` in `apps/web` so it picks up the new env file.

- [ ] **Step 5: Commit**

```bash
git add apps/web .gitignore
git commit -m "feat(web): add SIWE verify endpoint with JWT session cookie"
```

---

## Task 8: Configure wagmi + Web3 providers

**Files:**
- Create: `apps/web/lib/wagmi.ts`
- Create: `apps/web/components/Web3Provider.tsx`
- Modify: `apps/web/app/layout.tsx` (wrap with provider)

- [ ] **Step 1: Install wagmi + RainbowKit**

```bash
cd apps/web && pnpm add wagmi@^2.12.0 viem@^2.21.0 @rainbow-me/rainbowkit@^2.1.0 @tanstack/react-query@^5.51.0
```

- [ ] **Step 2: Create wagmi config**

Create `apps/web/lib/wagmi.ts`:

```typescript
"use client";

import { http, createConfig } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
  console.warn(
    "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set — WalletConnect will fail. Get one from https://cloud.walletconnect.com"
  );
}

export const wagmiConfig = getDefaultConfig({
  appName: "Oryn Works",
  projectId: projectId ?? "missing-project-id",
  chains: [base, baseSepolia],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
  ssr: true,
});
```

- [ ] **Step 3: Create Web3Provider**

Create `apps/web/components/Web3Provider.tsx`:

```typescript
"use client";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { wagmiConfig } from "@/lib/wagmi";
import { useState } from "react";

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#E5734F",
            accentColorForeground: "#1A1612",
            borderRadius: "small",
            fontStack: "system",
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

- [ ] **Step 4: Wrap layout with provider**

Modify `apps/web/app/layout.tsx` body content — wrap children with `<Web3Provider>`:

```typescript
import { Web3Provider } from "@/components/Web3Provider";

// ... existing imports + fonts unchanged ...

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="bg-warmdark text-cream font-sans antialiased min-h-screen">
        <Web3Provider>{children}</Web3Provider>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Sign up for WalletConnect Cloud + paste real project ID**

1. Open https://cloud.walletconnect.com
2. Create an account (free)
3. Create a new project named "Oryn Works"
4. Copy the Project ID
5. Replace `replace-with-real-id-from-cloud.walletconnect.com` in `apps/web/.env.local` with the real value.

- [ ] **Step 6: Restart dev + verify no errors**

```bash
cd apps/web && pnpm dev
```

Open `http://localhost:3000`. Open browser console — should be no errors from wagmi/RainbowKit.

- [ ] **Step 7: Commit**

```bash
git add apps/web pnpm-lock.yaml
git commit -m "feat(web): configure wagmi + RainbowKit with Base mainnet and Sepolia"
```

---

## Task 9: Build ConnectButton with sign-in flow

**Files:**
- Create: `apps/web/components/ConnectButton.tsx`
- Create: `apps/web/lib/auth.ts`

- [ ] **Step 1: Create `apps/web/lib/auth.ts`**

```typescript
import { createSiweMessage } from "viem/siwe";

export async function fetchNonce(): Promise<string> {
  const res = await fetch("/api/auth/nonce", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch nonce");
  return res.text();
}

export function buildSiweMessage(args: {
  address: `0x${string}`;
  chainId: number;
  nonce: string;
}) {
  return createSiweMessage({
    address: args.address,
    chainId: args.chainId,
    domain: window.location.host,
    uri: window.location.origin,
    statement: "Sign in to Oryn Works — the capability marketplace for AI agents.",
    nonce: args.nonce,
    version: "1",
    issuedAt: new Date(),
  });
}

export async function verifySiwe(message: string, signature: string) {
  const res = await fetch("/api/auth/verify", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, signature }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Verification failed");
  }
  return res.json();
}

export async function logout() {
  const res = await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  return res.ok;
}
```

- [ ] **Step 2: Add logout endpoint**

Create `apps/web/app/api/auth/logout/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete("oryn_session");
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Create ConnectButton**

Create `apps/web/components/ConnectButton.tsx`:

```typescript
"use client";

import { ConnectButton as RainbowConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useSignMessage, useChainId } from "wagmi";
import { useState } from "react";
import { fetchNonce, buildSiweMessage, verifySiwe, logout } from "@/lib/auth";

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    if (!address) return;
    setBusy(true);
    setError(null);
    try {
      const nonce = await fetchNonce();
      const message = buildSiweMessage({ address, chainId, nonce });
      const signature = await signMessageAsync({ message });
      await verifySiwe(message, signature);
      setSignedIn(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    await logout();
    setSignedIn(false);
  }

  if (!isConnected) {
    return <RainbowConnectButton />;
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <RainbowConnectButton />
      {!signedIn ? (
        <button
          onClick={handleSignIn}
          disabled={busy}
          className="text-xs font-mono tracking-wider uppercase bg-orange text-warmdark px-4 py-2 disabled:opacity-50"
        >
          {busy ? "Signing..." : "Sign in with wallet"}
        </button>
      ) : (
        <button
          onClick={handleSignOut}
          className="text-xs font-mono tracking-wider uppercase border border-cream/30 px-4 py-2"
        >
          Sign out
        </button>
      )}
      {error && <p className="text-xs text-orange/80">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 4: Add to landing page**

Modify `apps/web/app/page.tsx` to include ConnectButton in a top-right header:

```typescript
import { ConnectButton } from "@/components/ConnectButton";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-cream/10">
        <span className="font-serif text-xl">oryn</span>
        <ConnectButton />
      </header>
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="max-w-2xl text-center">
          <p className="text-xs tracking-[0.3em] text-cream/60 uppercase mb-4">
            A capability marketplace
          </p>
          <h1 className="font-serif text-5xl md:text-6xl leading-tight tracking-tight mb-6">
            The capability<br />marketplace<br />
            <span className="text-orange">for AI agents.</span>
          </h1>
          <p className="text-cream/70 text-lg mb-8 max-w-md mx-auto">
            Skills, knowledge, and reputation — discovered, installed, attested.
            Built on Base. Settled in USDC.
          </p>
          <div className="text-xs font-mono text-cream/50 tracking-wider">
            EST. 2026 / BUILT ON BASE
          </div>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Manual test the full flow**

Run dev:
```bash
cd apps/web && pnpm dev
```

In browser at `http://localhost:3000`:
1. Click "Connect Wallet" → choose wallet (MetaMask/Coinbase)
2. Switch to Base or Base Sepolia in your wallet
3. Click "Sign in with wallet"
4. Approve the signature in wallet popup
5. Should see "Sign out" button appear (means JWT cookie set)

Verify cookie in DevTools → Application → Cookies → `oryn_session` exists.

- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "feat(web): add ConnectButton with full SIWE sign-in flow"
```

---

## Task 10: Persist wallet on first sign-in

**Files:**
- Create: `packages/db/src/wallet-repo.ts`
- Modify: `apps/web/app/api/auth/verify/route.ts` (insert/upsert wallet on success)

- [ ] **Step 1: Install db package in web app**

```bash
cd apps/web && pnpm add @oryn/db
```

(pnpm will link the workspace package; no install from npm.)

- [ ] **Step 2: Create wallet repository helper**

Create `packages/db/src/wallet-repo.ts`:

```typescript
import { eq } from "drizzle-orm";
import { wallet, type Wallet } from "./schema.js";
import type { DbClient } from "./client.js";

export async function upsertWalletByAddress(
  db: DbClient,
  address: string
): Promise<Wallet> {
  const lower = address.toLowerCase();
  const existing = await db.select().from(wallet).where(eq(wallet.address, lower)).limit(1);
  if (existing.length > 0) return existing[0];

  const [created] = await db.insert(wallet).values({ address: lower }).returning();
  return created;
}
```

- [ ] **Step 3: Re-export from `packages/db/src/index.ts`**

```typescript
export * from "./schema.js";
export * from "./client.js";
export * from "./wallet-repo.js";
```

- [ ] **Step 4: Modify verify route to upsert wallet**

Edit `apps/web/app/api/auth/verify/route.ts` — add db client import and upsert call after signature verification:

```typescript
// ... existing imports ...
import { createDbClient, upsertWalletByAddress } from "@oryn/db";

const db = createDbClient(process.env.DATABASE_URL!);

// ... inside POST handler, after `valid` check ...
//   if (!valid) {
//     return NextResponse.json({ error: "invalid signature" }, { status: 401 });
//   }

//   ↓ insert here:
const walletRecord = await upsertWalletByAddress(
  db,
  siweMessage.address!.toLowerCase()
);

const token = await createSessionToken({
  address: walletRecord.address,
  chainId: siweMessage.chainId!,
});
// ... rest unchanged ...
```

- [ ] **Step 5: Add `DATABASE_URL` to `apps/web/.env.local`**

Append:
```
DATABASE_URL=postgres://oryn:oryn@localhost:5432/oryn_dev
```

- [ ] **Step 6: Restart dev + test**

Restart web app. Sign in via ConnectButton flow.

Verify wallet inserted:
```bash
docker exec oryn-postgres psql -U oryn -d oryn_dev -c "SELECT id, address, role, created_at FROM wallet;"
```

Expected: 1 row with your address (lowercase).

- [ ] **Step 7: Commit**

```bash
git add packages/db apps/web
git commit -m "feat(auth): upsert wallet row on successful SIWE sign-in"
```

---

## Task 11: Build `/me` protected page

**Files:**
- Create: `apps/web/lib/get-session.ts`
- Create: `apps/web/app/me/page.tsx`

- [ ] **Step 1: Create server-side session helper**

Create `apps/web/lib/get-session.ts`:

```typescript
import { cookies } from "next/headers";
import { verifySessionToken, type SessionPayload } from "./session";

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("oryn_session")?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
```

- [ ] **Step 2: Create `/me` page**

Create `apps/web/app/me/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/get-session";

export default async function MePage() {
  const session = await getSession();

  if (!session) {
    redirect("/?error=auth_required");
  }

  return (
    <main className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-cream/10">
        <Link href="/" className="font-serif text-xl">oryn</Link>
        <span className="text-xs font-mono tracking-wider text-cream/60 uppercase">
          {session.address.slice(0, 6)}…{session.address.slice(-4)}
        </span>
      </header>
      <div className="flex-1 px-6 py-12 max-w-3xl mx-auto w-full">
        <p className="text-xs tracking-[0.3em] text-cream/60 uppercase mb-4">
          Profile
        </p>
        <h1 className="font-serif text-4xl mb-6">Your wallet</h1>
        <dl className="space-y-3 font-mono text-sm">
          <div className="flex justify-between border-b border-cream/10 pb-2">
            <dt className="text-cream/60">Address</dt>
            <dd>{session.address}</dd>
          </div>
          <div className="flex justify-between border-b border-cream/10 pb-2">
            <dt className="text-cream/60">Chain ID</dt>
            <dd>{session.chainId}</dd>
          </div>
        </dl>
        <p className="text-cream/50 text-sm mt-8">
          More to come — capabilities, attestations, spending dashboard.
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Add a link to `/me` from landing when signed in**

Modify `apps/web/app/page.tsx` — pass session state to header. Simplest approach: server-fetch session, show "Dashboard" link if present.

Replace `apps/web/app/page.tsx`:

```typescript
import Link from "next/link";
import { ConnectButton } from "@/components/ConnectButton";
import { getSession } from "@/lib/get-session";

export default async function HomePage() {
  const session = await getSession();

  return (
    <main className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-cream/10">
        <span className="font-serif text-xl">oryn</span>
        <div className="flex items-center gap-4">
          {session && (
            <Link
              href="/me"
              className="text-xs font-mono tracking-wider uppercase text-cream/70 hover:text-orange"
            >
              Dashboard →
            </Link>
          )}
          <ConnectButton />
        </div>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="max-w-2xl text-center">
          <p className="text-xs tracking-[0.3em] text-cream/60 uppercase mb-4">
            A capability marketplace
          </p>
          <h1 className="font-serif text-5xl md:text-6xl leading-tight tracking-tight mb-6">
            The capability<br />marketplace<br />
            <span className="text-orange">for AI agents.</span>
          </h1>
          <p className="text-cream/70 text-lg mb-8 max-w-md mx-auto">
            Skills, knowledge, and reputation — discovered, installed, attested.
            Built on Base. Settled in USDC.
          </p>
          <div className="text-xs font-mono text-cream/50 tracking-wider">
            EST. 2026 / BUILT ON BASE
          </div>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Manual test the protected flow**

1. Open `http://localhost:3000/me` in a **fresh** incognito tab (no cookies) → should redirect to `/`
2. Go back to `/`, sign in via ConnectButton
3. Click "Dashboard →" link → should land on `/me` with your address shown
4. Stop dev server, restart it, refresh `/me` → should still work (cookie persists)

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): add protected /me page reading SIWE session"
```

---

## Task 12: Bootstrap `packages/contracts` (Foundry stub)

**Files:**
- Create: `packages/contracts/foundry.toml`
- Create: `packages/contracts/package.json`
- Create: `packages/contracts/src/.gitkeep`
- Create: `packages/contracts/test/.gitkeep`

Note: Smart contracts themselves (CapabilityRegistry, RevenueSplitter) are implemented in Plan 1D. This task only creates the empty Foundry project structure so the monorepo layout is complete.

- [ ] **Step 1: Verify Foundry is installed**

```bash
forge --version
```

If not installed (Windows):
- Install via Foundryup: https://book.getfoundry.sh/getting-started/installation
- Or use Docker: `docker run --rm -v $(pwd):/work ghcr.io/foundry-rs/foundry`

- [ ] **Step 2: Initialize Foundry project**

```bash
mkdir -p packages/contracts
cd packages/contracts
forge init --no-commit --no-git .
```

This creates `src/Counter.sol`, `test/Counter.t.sol`, `script/Counter.s.sol`, `foundry.toml`, `lib/forge-std/`, `README.md`.

- [ ] **Step 3: Remove default Counter files (we'll add real contracts in Plan 1D)**

```bash
cd packages/contracts
rm src/Counter.sol test/Counter.t.sol script/Counter.s.sol
touch src/.gitkeep test/.gitkeep
```

- [ ] **Step 4: Create `packages/contracts/package.json` to integrate with pnpm**

```json
{
  "name": "@oryn/contracts",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "build": "forge build",
    "test": "forge test",
    "fmt": "forge fmt"
  }
}
```

- [ ] **Step 5: Verify Foundry builds (empty project)**

```bash
cd packages/contracts && forge build
```

Expected: `Compiler run successful` (no contracts to compile, lib/forge-std present).

- [ ] **Step 6: Update root `.gitignore` for Foundry artifacts**

Already done in Task 1 — verify these lines exist:
```
packages/contracts/cache/
packages/contracts/out/
packages/contracts/broadcast/
```

If missing, add them.

- [ ] **Step 7: Commit**

```bash
git add packages/contracts
git commit -m "chore(contracts): bootstrap empty Foundry project structure"
```

---

## Task 13: Wire gateway `/me` endpoint with shared session verification

**Files:**
- Create: `apps/gateway/src/lib/session.ts`
- Create: `apps/gateway/src/middleware/auth.ts`
- Create: `apps/gateway/src/routes/me.ts`
- Modify: `apps/gateway/src/server.ts` (register me route)
- Modify: `apps/gateway/package.json` (add jose, @oryn/db deps)
- Test: `apps/gateway/test/auth.test.ts`

The gateway needs to verify the SAME JWT issued by the web app. Both must share the JWT secret.

- [ ] **Step 1: Install jose and @oryn/db in gateway**

```bash
cd apps/gateway && pnpm add jose @oryn/db
```

- [ ] **Step 2: Create gateway session verifier**

Create `apps/gateway/src/lib/session.ts`:

```typescript
import { jwtVerify } from "jose";
import { env } from "../env.js";

const SECRET = new TextEncoder().encode(env.JWT_SECRET);

export type SessionPayload = {
  address: string;
  chainId: number;
};

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (typeof payload.address !== "string" || typeof payload.chainId !== "number") {
      return null;
    }
    return { address: payload.address, chainId: payload.chainId };
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: Create auth middleware**

Create `apps/gateway/src/middleware/auth.ts`:

```typescript
import type { FastifyRequest, FastifyReply } from "fastify";
import { verifySessionToken, type SessionPayload } from "../lib/session.js";

declare module "fastify" {
  interface FastifyRequest {
    session?: SessionPayload;
  }
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  const cookie = req.headers.cookie ?? "";
  const match = cookie.match(/oryn_session=([^;]+)/);
  if (!match) {
    reply.code(401).send({ error: "no session" });
    return;
  }

  const session = await verifySessionToken(match[1]);
  if (!session) {
    reply.code(401).send({ error: "invalid session" });
    return;
  }

  req.session = session;
}
```

- [ ] **Step 4: Create `/me` route**

Create `apps/gateway/src/routes/me.ts`:

```typescript
import type { FastifyPluginAsync } from "fastify";
import { createDbClient, upsertWalletByAddress } from "@oryn/db";
import { requireAuth } from "../middleware/auth.js";
import { env } from "../env.js";

const db = createDbClient(env.DATABASE_URL);

export const meRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get("/me", { preHandler: requireAuth }, async (req) => {
    const session = req.session!;
    const walletRecord = await upsertWalletByAddress(db, session.address);
    return {
      address: walletRecord.address,
      role: walletRecord.role,
      displayName: walletRecord.displayName,
      chainId: session.chainId,
      createdAt: walletRecord.createdAt,
    };
  });
};
```

- [ ] **Step 5: Register route in server.ts**

Modify `apps/gateway/src/server.ts` — import and register the me route alongside health:

```typescript
import { healthRoute } from "./routes/health.js";
import { meRoute } from "./routes/me.js";

// inside buildServer():
await fastify.register(healthRoute);
await fastify.register(meRoute);
```

- [ ] **Step 6: Write the failing test**

Create `apps/gateway/test/auth.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildServer } from "../src/server.js";
import type { FastifyInstance } from "fastify";

describe("GET /me", () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await buildServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it("rejects requests with no session cookie", async () => {
    const res = await server.inject({ method: "GET", url: "/me" });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ error: "no session" });
  });

  it("rejects requests with an invalid session token", async () => {
    const res = await server.inject({
      method: "GET",
      url: "/me",
      headers: { cookie: "oryn_session=not-a-real-jwt" },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ error: "invalid session" });
  });
});
```

- [ ] **Step 7: Run test to verify it passes**

```bash
cd apps/gateway && pnpm test
```

Expected: both tests PASS.

- [ ] **Step 8: Manual end-to-end test**

1. Start Postgres: `pnpm db:up`
2. Start gateway: `cd apps/gateway && pnpm dev`
3. Start web: `cd apps/web && pnpm dev`
4. In browser, sign in at `http://localhost:3000`
5. Copy the `oryn_session` cookie value from DevTools
6. Test the gateway endpoint:

```bash
curl -i -H "Cookie: oryn_session=PASTE_VALUE_HERE" http://localhost:4000/me
```

Expected: 200 status, JSON body with `address`, `role`, `chainId`, `createdAt`.

- [ ] **Step 9: Commit**

```bash
git add apps/gateway pnpm-lock.yaml
git commit -m "feat(gateway): add /me endpoint with shared JWT session verification"
```

---

## Task 14: Add concurrent dev script + final polish

**Files:**
- Modify: root `package.json` (concurrent dev script)
- Modify: `README.md` (final setup steps)

- [ ] **Step 1: Add concurrently for parallel dev**

```bash
pnpm add -D -w concurrently
```

- [ ] **Step 2: Update root `package.json` dev script**

Replace the `dev` script in root `package.json`:

```json
"scripts": {
  "dev": "concurrently -n web,gateway -c cyan,magenta \"pnpm --filter @oryn/web dev\" \"pnpm --filter @oryn/gateway dev\"",
  "build": "pnpm -r run build",
  "test": "pnpm -r run test",
  "lint": "pnpm -r run lint",
  "db:up": "docker compose up -d postgres",
  "db:down": "docker compose down",
  "db:migrate": "pnpm --filter @oryn/db run migrate",
  "db:studio": "pnpm --filter @oryn/db run studio"
}
```

- [ ] **Step 3: Update README**

Replace `README.md` content:

```markdown
# Oryn Works

**The capability marketplace for AI agents.** Built on Base. Settled in USDC.

## Quick start

Prerequisites: Node 20+, pnpm 9+, Docker, Foundry.

```bash
# Install dependencies
pnpm install

# Copy env files
cp .env.example apps/gateway/.env
cp .env.example apps/web/.env.local
# Edit each file to set JWT_SECRET, WalletConnect Project ID, etc.

# Start Postgres
pnpm db:up

# Run migrations
pnpm db:migrate

# Start web + gateway in parallel
pnpm dev
```

Open:
- Web: http://localhost:3000
- Gateway health: http://localhost:4000/health

## Project structure

- `apps/web` — Next.js 15 frontend (port 3000)
- `apps/gateway` — Fastify backend (port 4000)
- `packages/db` — Drizzle ORM schema + client
- `packages/contracts` — Foundry smart contracts (stub; impl in Plan 1D)

## Common commands

```bash
pnpm dev          # Start web + gateway concurrently
pnpm test         # Run all tests
pnpm db:up        # Start local Postgres
pnpm db:migrate   # Apply pending migrations
pnpm db:studio    # Open Drizzle Studio (browse DB)
```

## Docs

- Design spec: `docs/superpowers/specs/2026-05-27-oryn-works-design.md`
- Phase 1A plan (this): `docs/superpowers/plans/2026-05-27-oryn-works-plan-1a-foundation.md`
```

- [ ] **Step 4: Final smoke test**

Stop any running dev servers. From a fresh terminal:

```bash
pnpm db:up
sleep 5
pnpm db:migrate
pnpm dev
```

Verify:
- Web loads at `http://localhost:3000` with brand styling
- Gateway responds at `http://localhost:4000/health`
- ConnectButton works
- Sign-in flow completes
- `/me` page accessible after sign-in
- Wallet row appears in DB

- [ ] **Step 5: Final commit**

```bash
git add package.json README.md pnpm-lock.yaml
git commit -m "chore: add concurrent dev script + finalize README"
```

---

## Acceptance criteria (Plan 1A complete when ALL pass)

- [ ] `pnpm install` completes without errors from a fresh clone
- [ ] `pnpm db:up` starts Postgres and `pg_isready` returns success
- [ ] `pnpm db:migrate` applies the wallet table migration
- [ ] `pnpm dev` starts both web (3000) and gateway (4000) concurrently
- [ ] `http://localhost:3000` renders landing page with brand styling
- [ ] Clicking "Connect Wallet" opens RainbowKit modal and connects a wallet
- [ ] "Sign in with wallet" produces a SIWE signature and stores `oryn_session` cookie
- [ ] After sign-in, `/me` page shows the connected wallet address
- [ ] `curl -H "Cookie: oryn_session=..." http://localhost:4000/me` returns wallet data
- [ ] Gateway test suite (`pnpm test` in `apps/gateway`) passes both auth tests
- [ ] Postgres `wallet` table contains the signed-in wallet row
- [ ] All commits follow conventional commits format (feat:, chore:, etc.)

---

## What's NOT in Plan 1A (saved for follow-up plans)

- Capability registry table + upload form (Plan 1B)
- Browse + discovery UI (Plan 1B)
- Capability detail page (Plan 1B)
- Gateway skill call endpoint + x402 payment (Plan 1C)
- Usage event logging (Plan 1C)
- Attestation submission (Plan 1B/1C)
- Smart contract implementation (Plan 1D)
- IPFS metadata storage (Plan 1B)
- Vector DB / Knowledge packs (Phase 3 — separate plan)
- Reputation calculation (Phase 2 — separate plan)
- Seed data + soft launch (Plan 1D)

---

## Self-review (run before handoff)

**Spec coverage from Phase 1 of design spec:**
- [✓] Web shell + landing page → Tasks 2, 11
- [✓] Wallet auth (SIWE) via wagmi → Tasks 6, 7, 8, 9, 10
- [✓] Postgres schema + Drizzle migrations → Tasks 4, 5
- [✓] Smart contracts Foundry stub → Task 12
- [✓] `wallet` table from data model spec → Task 4
- [✗] Builder upload form → defer to Plan 1B
- [✗] Discovery + search + detail pages → defer to Plan 1B
- [✗] Gateway skill call + x402 → defer to Plan 1C
- [✗] Seed 5-10 capabilities → defer to Plan 1D
- [✗] Deploy to Base Sepolia → defer to Plan 1D

Scope confirmed: this plan delivers a working SIWE auth foundation. Subsequent plans add capability surface area.

**Placeholder scan:** No "TBD" / "implement later" markers in code blocks. All commands include expected outputs. All file paths exact.

**Type consistency:** `SessionPayload` shape (`{ address: string; chainId: number }`) is identical in both `apps/web/lib/session.ts` and `apps/gateway/src/lib/session.ts`. JWT secret env var name (`JWT_SECRET`) is consistent across web `.env.local`, gateway `.env`, and `.env.example`.

---

_End of Plan 1A. After execution, proceed to Plan 1B (Capability Registry) to add upload form, browse UI, and capability detail pages._
