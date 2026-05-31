#!/usr/bin/env bash
# Runs once when a Codespace is created from this repo.
# Installs pnpm + Foundry, restores deps, scaffolds env templates.

set -e

echo "─────────────────────────────────────────────"
echo " Oryn Works — Codespace setup"
echo "─────────────────────────────────────────────"
echo ""

echo "[1/4] Activating pnpm via corepack..."
corepack enable
corepack prepare pnpm@10.33.2 --activate

echo ""
echo "[2/4] Installing Foundry (forge, cast, anvil)..."
if [ ! -d "$HOME/.foundry" ]; then
  curl -fsSL https://foundry.paradigm.xyz | bash
fi
export PATH="$HOME/.foundry/bin:$PATH"
"$HOME/.foundry/bin/foundryup" || true
grep -qxF 'export PATH="$HOME/.foundry/bin:$PATH"' ~/.bashrc \
  || echo 'export PATH="$HOME/.foundry/bin:$PATH"' >> ~/.bashrc

echo ""
echo "[3/4] Installing workspace dependencies..."
pnpm install --frozen-lockfile

echo ""
echo "[4/4] Scaffolding env templates (none overwritten)..."
[ -f apps/web/.env.local ]      || cp .env.example apps/web/.env.local
[ -f apps/gateway/.env ]        || cp .env.example apps/gateway/.env
[ -f packages/contracts/.env ]  || cp packages/contracts/.env.example packages/contracts/.env

echo ""
echo "─────────────────────────────────────────────"
echo " ✓ Codespace ready"
echo "─────────────────────────────────────────────"
echo ""
echo " Next steps:"
echo "   1. Fill DATABASE_URL (Neon free at https://neon.tech) in:"
echo "        apps/web/.env.local"
echo "        apps/gateway/.env"
echo ""
echo "   2. Make JWT_SECRET MATCH in both env files above."
echo ""
echo "   3. Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID (free at"
echo "      https://cloud.reown.com) in apps/web/.env.local."
echo ""
echo "   4. Run migrations:"
echo "        pnpm db:migrate"
echo ""
echo "   5. Boot web + gateway concurrently:"
echo "        pnpm dev"
echo ""
echo "   Ports 3000 (web) and 4000 (gateway) auto-forward."
echo ""
