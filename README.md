# Oryn Works

The capability marketplace for AI agents. Built on Base. Settled in USDC.

## Quick start

````bash
pnpm install
pnpm db:up
pnpm db:migrate
pnpm dev
````

Open http://localhost:3000

## Structure

- `apps/web` — Next.js frontend (port 3000)
- `apps/gateway` — Fastify backend (port 4000)
- `packages/db` — Drizzle schema + client
- `packages/contracts` — Foundry smart contracts

## Docs

- Design spec: `docs/superpowers/specs/2026-05-27-oryn-works-design.md`
- Implementation plans: `docs/superpowers/plans/`
