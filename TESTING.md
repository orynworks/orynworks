# Pre-mainnet E2E walkthrough — Base Sepolia

> Run this checklist start-to-finish before deploying contracts or web to mainnet.
> Goal: verify every leg of the loop works against real Sepolia contracts and
> the real DB. If any step fails, fix before mainnet — once contracts deploy,
> rollbacks are expensive.

Expected runtime: ~30 minutes if everything goes well.

---

## 0. Prerequisites

You need:

- [ ] Node 20+ and pnpm installed
- [ ] A Sepolia-funded wallet (the same one you used for contract deploy is fine, or a fresh wallet for "builder" identity)
- [ ] A second wallet to play "operator" (optional but cleaner)
- [ ] Sepolia ETH for gas in both wallets: ~0.01 ETH each (https://www.alchemy.com/faucets/base-sepolia or https://faucet.quicknode.com/base/sepolia)
- [ ] Sepolia USDC for paid-capability tests: ~0.10 USDC (use the Circle testnet faucet or swap)
- [ ] MetaMask (or any wallet extension) with Base Sepolia network added
- [ ] `apps/web/.env.local` and `apps/gateway/.env` populated (see `apps/web/.env.local` for the canonical example)

---

## 1. Boot local stack

In three terminals:

```bash
# Terminal 1 — DB watch (rebuild on schema change)
cd packages/db && pnpm dev

# Terminal 2 — Web app
cd apps/web && pnpm dev
# → http://localhost:3000

# Terminal 3 — Gateway
cd apps/gateway && pnpm dev
# → http://localhost:4000
```

Quick sanity:

- [ ] Open http://localhost:3000 — landing renders, no console errors
- [ ] `curl http://localhost:4000/health` returns 200
- [ ] Browse page http://localhost:3000/browse shows seed capabilities

---

## 2. Sign in as builder

- [ ] Switch wallet to Base Sepolia
- [ ] Header right shows ghost "SIGN IN" button
- [ ] Click → wallet popup → connect → SIGN sign-in message
- [ ] Header pill now shows `• 0xAbcd…1234 ▾`
- [ ] Refresh the page → still signed in (persistence works)

If the SIGN IN button still shows after refresh, the server-side session prop
isn't reaching ConnectButton. Check `apps/web/lib/get-session.ts`.

---

## 3. Publish a capability (on-chain register)

Go to http://localhost:3000/build/new and fill the form:

```
Name: E2E Test Skill
Slug: e2e-test-skill-<your-initials>   (must be unique on-chain)
Type: Skill (MCP server)
Category: Utility
Description: End-to-end test capability for the Sepolia walkthrough.
Host URL: https://httpbin.org/post           (echo server — safe upstream)
Price (USDC per call): 0                     (start free; we'll test paid next)
```

Click **Publish capability**.

Expected sequence (watch the button label):

1. **Confirm in wallet…** — MetaMask popup with `register(slugHash, 0, 0, metadataHash)` call
2. Approve in wallet → tx broadcasts
3. **Confirming on Base…** — button shows `tx 0xabcd1234…`
4. **Finalizing…** — server verifies on-chain entry matches DB intent
5. Redirect to `/capability/e2e-test-skill-<your-initials>`

Verify:

- [ ] Detail page renders with the data you entered
- [ ] On-chain: open BaseScan for the registry contract, search your slug hash, confirm entry exists with your wallet as `builder`
- [ ] DB: the row has `onchain_hash` set (not NULL)

Failure modes to expect:

- **"Slug already taken"** → pick a more unique slug
- **"Transaction reverted on-chain"** → slug already on-chain (try unique)
- **"Host points to a private/internal address"** → SSRF guard worked, choose a real URL

---

## 4. Call the capability via gateway (free)

Without the SDK (curl flow):

```bash
COOKIE=$(grep oryn_session ~/.config/your-browser/cookies | awk '{print $7}')
# or simpler: copy from browser devtools Application → Cookies

curl -X POST http://localhost:4000/v1/skills/e2e-test-skill-<initials>/call \
  -H "Content-Type: application/json" \
  -H "Cookie: oryn_session=$COOKIE" \
  -d '{"prompt":"hello"}'
```

Expected: 200 with `data` echoed from httpbin.

Or via SDK:

```bash
cd packages/sdk
node dist/cli.js call e2e-test-skill-<initials> \
  --prompt "hello" \
  --gateway http://localhost:4000 \
  --auth "$COOKIE"
```

Verify:

- [ ] Response 200 with `ok: true`
- [ ] DB: `usage_event` row inserted with `success=true`, `billed=true`, `cost_usdc=0`
- [ ] No `settled_tx` value (free events don't settle, but they show in builder stats)

---

## 5. Publish a paid capability + x402 flow

Repeat step 3 with `Price = 0.01` and a different slug.

Then attempt to call without `X-Payment` header:

```bash
curl -X POST http://localhost:4000/v1/skills/e2e-test-paid/call \
  -H "Content-Type: application/json" \
  -H "Cookie: oryn_session=$COOKIE" \
  -d '{"prompt":"hello"}'
```

Expected: **402 Payment Required** with x402 challenge in `WWW-Authenticate`
header. The body should include `priceUsdc`, `protocol: "x402"`.

For the full paid flow you'd build an EIP-712 payload, sign it, and retry. For
this walkthrough, just confirm the 402 response — the x402 sign-and-retry path
is the SDK's job later.

Verify:

- [ ] 402 returned with correct price
- [ ] `WWW-Authenticate: X402 realm="oryn", amount="0.0100"` header present

---

## 6. Settlement worker

Force at least one billable usage event by signing a valid x402 payment or by
manually setting `usage_event.billed=true` in the DB for a real cost row, then:

```bash
cd apps/gateway && pnpm settle
# OR direct: node dist/workers/settlement.js
```

Expected log output:

```
[settlement] approving USDC max-uint256        (only on first run)
[settlement] settled 0xABcd...1234: 0.0100 USDC tx=0xdeadbeef... (1 events)
[settlement] done — succeeded=1 failed=0 reconciled=0
```

Verify:

- [ ] `usage_event.settled=true`, `settled_tx=0x...`
- [ ] On-chain: `RevenueEscrow.builderBalance(yourBuilderAddress)` shows your share (90% of paid amount)
- [ ] On-chain: `RevenueEscrow.protocolTreasury()` shows 10% of paid amount

Run the worker again — should print `[settlement] nothing to settle` (idempotency).

Simulate a crash mid-flight:
- Set `settled_tx = 'lock:fake-uuid'` on a row manually
- Run worker → should reconcile (release stuck lock) and proceed

---

## 7. Builder claims earnings

In the browser:

- [ ] Go to http://localhost:3000/build
- [ ] EarningsCard at top shows `Claimable balance: 0.0090 USDC`
- [ ] Lifetime earnings: `0.0090 USDC · 90% builder share`
- [ ] Click **CLAIM TO WALLET**
- [ ] MetaMask popup: `RevenueEscrow.claim()` call
- [ ] Approve → wait confirmation
- [ ] Card shows "Claimed successfully" + balance updates to 0
- [ ] On-chain: builder wallet's USDC balance increased by claim amount

---

## 8. Negative tests (security)

- [ ] Try to publish with `Host URL = http://localhost:8080` → should error "private/internal address"
- [ ] Try to publish with `Host URL = http://10.0.0.1/api` → same error
- [ ] Try to call a non-existent slug → 404
- [ ] Try to call a paid capability with `X-Payment` payload signed by wrong wallet → 402 with error reason
- [ ] Try to fake a DB row without going through on-chain register → server action verifies, rejects

---

## Sign-off checklist

When all of the above pass, you can deploy to mainnet:

- [ ] All 8 sections green
- [ ] CANON.md vocabulary rules still match production copy
- [ ] No `localhost` / `127.0.0.1` references in user-facing strings
- [ ] DB cleanup of any leftover test capabilities (delete via Neon SQL or republish to use real data)
- [ ] `.env.local` mainnet placeholders ready to fill in post-deploy
- [ ] Tag the commit: `git tag pre-mainnet-rc1`

Then proceed to mainnet contract deploy.
