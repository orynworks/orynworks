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
# Edit each file to set JWT_SECRET (must match between gateway and web), WalletConnect Project ID, etc.

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

- `apps/web` — Next.js 16 frontend (port 3000)
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
- Phase 1A plan: `docs/superpowers/plans/2026-05-27-oryn-works-plan-1a-foundation.md`
