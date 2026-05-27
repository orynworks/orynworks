# Oryn Works

**The capability marketplace for AI agents.** Built on Base. Settled in USDC.

## Quick start

Prerequisites: Node 20+, pnpm 9+, Foundry (for `packages/contracts`).

```bash
# Install dependencies
pnpm install

# Set up Neon Postgres (https://neon.tech free tier)
# Then copy env files and paste your Neon connection string:
cp .env.example apps/gateway/.env
cp .env.example apps/web/.env.local

# Edit both files:
# - Set DATABASE_URL to your Neon postgres connection string
# - Set JWT_SECRET (must MATCH between gateway and web .env files)
# - Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID (from https://cloud.walletconnect.com)

# Run migrations against your Neon DB
pnpm db:migrate

# Start web + gateway concurrently
pnpm dev
```

Open:
- Web: http://localhost:3000
- Gateway health: http://localhost:4000/health

## Project structure

- `apps/web` — Next.js 16 frontend (port 3000)
- `apps/gateway` — Fastify backend (port 4000)
- `packages/db` — Drizzle ORM schema + client
- `packages/contracts` — Foundry smart contracts (stub; impl in Plan 1D)

## Common commands

```bash
pnpm dev          # Start web + gateway concurrently
pnpm test         # Run all tests
pnpm db:migrate   # Apply pending migrations to your Neon DB
pnpm db:studio    # Open Drizzle Studio (browse DB)
```

## Docs

- Design spec: `docs/superpowers/specs/2026-05-27-oryn-works-design.md`
- Phase 1A plan: `docs/superpowers/plans/2026-05-27-oryn-works-plan-1a-foundation.md`
