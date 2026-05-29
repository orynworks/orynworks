# Oryn Works — Plan 1D: Contracts + Deploy + Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Deploy smart contracts to Base, deploy app to Vercel + Railway, seed mainnet capabilities, and execute soft launch on Crypto Twitter. After Plan 1D: Oryn Works is **live at `oryn.works`** with real on-chain settlement, public access, and announcement tweet.

**Scope boundary:** Plan 1D is the **production deployment + launch** layer. After this plan, Phase 2-5 work begins (reputation, knowledge packs, premium tiers, ecosystem).

**Tech stack additions:**
- Foundry (already installed, contracts stub from Plan 1A Task 12)
- Vercel CLI for web deploy
- Railway CLI (or dashboard deploy) for gateway
- `@fastify/rate-limit` for gateway rate limiting
- Settlement worker (BullMQ or simple cron)

---

## Task 0 — Plan 1C polish carryovers (~30 min)

Important items flagged in Plan 1C final review.

### Task 0.1: Add rate limiting to gateway

**File:** `apps/gateway/src/server.ts`

- [ ] `cd apps/gateway && pnpm add @fastify/rate-limit`
- [ ] Register plugin in `buildServer()`:
  ```typescript
  await fastify.register(import("@fastify/rate-limit"), {
    max: 60,          // 60 requests
    timeWindow: "1 minute",
    keyGenerator: (req) => {
      // Prefer session address for authenticated requests, else IP
      return req.session?.address ?? req.ip;
    },
  });
  ```
- [ ] Commit: `feat(gateway): add rate limit 60 req/min per session/IP`

### Task 0.2: Add upstream fetch timeout

**Files:** `apps/gateway/src/routes/skills.ts`, `apps/gateway/src/routes/knowledge.ts`

Replace bare `fetch(cap.hostUrl, {...})` with:
```typescript
const upstream = await fetch(cap.hostUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: bodyString,
  signal: AbortSignal.timeout(30_000), // 30s
});
```

Catch `AbortError` specifically:
```typescript
} catch (e) {
  if (e instanceof Error && e.name === "TimeoutError") {
    errorCode = "upstream_timeout";
  } else {
    errorCode = e instanceof Error ? e.message.slice(0, 100) : "fetch_failed";
  }
  success = false;
}
```

- [ ] Commit: `fix(gateway): add 30s upstream fetch timeout with TimeoutError handling`

### Task 0.3: x402 nonce replay protection

**Files:** `apps/gateway/src/middleware/x402.ts`, new table

Schema addition in `packages/db/src/schema.ts`:
```typescript
export const x402Nonce = pgTable("x402_nonce", {
  signature: text("signature").primaryKey(),
  usedAt: timestamp("used_at", { withTimezone: true }).notNull().defaultNow(),
});
```

Generate + apply migration `0003_*.sql`.

In `verifyX402`, BEFORE returning success, check + insert nonce:
```typescript
// After successful signature recovery:
try {
  await db.insert(x402Nonce).values({ signature: payload.signature });
} catch {
  return { ok: false, status: 402, reason: "signature already used" };
}
```

(Use unique constraint violation as "already used" detection.)

Pass `db` into `verifyX402` or refactor to keep it inline in the route handler.

- [ ] Add table + migration
- [ ] Wire nonce check
- [ ] Commit: `feat(gateway): x402 replay protection via consumed nonce table`

### Task 0.4: Spending stat label correction on /me

**File:** `apps/web/app/me/page.tsx`

Currently shows `Calls = usageEvents.length` (max 10 from recent) — misleading label. Change to "Recent" or query a real total via a new repo helper:

Add to `packages/db/src/usage-repo.ts`:
```typescript
export async function getOperatorTotalCalls(
  db: DbClient,
  callerAddress: string
): Promise<number> {
  const rows = await db
    .select({ total: count() })
    .from(usageEvent)
    .where(eq(usageEvent.callerAddress, callerAddress.toLowerCase()));
  return Number(rows[0]?.total ?? 0);
}
```

Use in /me page for the "Calls" stat instead of `usageEvents.length`.

- [ ] Commit: `fix(web): show true total calls (not recent slice) in /me dashboard`

### Task 0.5: Add usage_event indexes

**File:** New migration `0003_*.sql` (or `0004_*.sql` if 0003 was used by x402_nonce)

Drizzle doesn't easily generate indexes from schema — write SQL directly:
```sql
CREATE INDEX IF NOT EXISTS idx_usage_event_capability_created
  ON usage_event (capability_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_event_caller_created
  ON usage_event (caller_address, created_at DESC);
```

Either add via raw SQL migration file or use Drizzle's `index()` syntax in schema and regenerate.

- [ ] Commit: `perf(db): add indexes on usage_event for dashboard queries`

---

## Task 1 — Implement CapabilityRegistry.sol

**File:** `packages/contracts/src/CapabilityRegistry.sol`

Minimal on-chain registry: store capability metadata hash + builder + price. Off-chain DB remains source of truth for full metadata.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CapabilityRegistry {
    enum CapType { Skill, Knowledge }
    enum Status { Active, Deprecated }

    struct Capability {
        bytes32 slug;
        address builder;
        uint256 priceUSDC;  // 6 decimals
        CapType capType;
        Status status;
        bytes32 metadataHash;  // hash of off-chain metadata JSON
        uint256 createdAt;
    }

    mapping(bytes32 => Capability) public capabilities;
    address public owner;

    event CapabilityRegistered(bytes32 indexed slug, address indexed builder, CapType capType, uint256 priceUSDC);
    event CapabilityUpdated(bytes32 indexed slug, uint256 priceUSDC, bytes32 metadataHash);
    event CapabilityDeprecated(bytes32 indexed slug);
    event OwnerUpdated(address indexed oldOwner, address indexed newOwner);

    error AlreadyRegistered();
    error NotBuilder();
    error NotFound();
    error NotOwner();

    constructor(address _owner) {
        owner = _owner;
    }

    modifier onlyBuilder(bytes32 slug) {
        if (capabilities[slug].builder != msg.sender) revert NotBuilder();
        _;
    }

    function register(
        bytes32 slug,
        uint256 priceUSDC,
        CapType capType,
        bytes32 metadataHash
    ) external {
        if (capabilities[slug].builder != address(0)) revert AlreadyRegistered();
        capabilities[slug] = Capability({
            slug: slug,
            builder: msg.sender,
            priceUSDC: priceUSDC,
            capType: capType,
            status: Status.Active,
            metadataHash: metadataHash,
            createdAt: block.timestamp
        });
        emit CapabilityRegistered(slug, msg.sender, capType, priceUSDC);
    }

    function update(bytes32 slug, uint256 priceUSDC, bytes32 metadataHash) external onlyBuilder(slug) {
        capabilities[slug].priceUSDC = priceUSDC;
        capabilities[slug].metadataHash = metadataHash;
        emit CapabilityUpdated(slug, priceUSDC, metadataHash);
    }

    function deprecate(bytes32 slug) external onlyBuilder(slug) {
        capabilities[slug].status = Status.Deprecated;
        emit CapabilityDeprecated(slug);
    }

    function getCapability(bytes32 slug) external view returns (Capability memory) {
        Capability memory cap = capabilities[slug];
        if (cap.builder == address(0)) revert NotFound();
        return cap;
    }

    function setOwner(address newOwner) external {
        if (msg.sender != owner) revert NotOwner();
        address oldOwner = owner;
        owner = newOwner;
        emit OwnerUpdated(oldOwner, newOwner);
    }
}
```

**Test file:** `packages/contracts/test/CapabilityRegistry.t.sol`

- [ ] Test: register a capability, verify storage + event
- [ ] Test: double-register reverts with `AlreadyRegistered`
- [ ] Test: update only by builder, others revert
- [ ] Test: deprecate only by builder
- [ ] Test: getCapability for non-existent reverts with `NotFound`
- [ ] Test: setOwner only by current owner
- [ ] Run `forge test`, all pass
- [ ] Commit: `feat(contracts): CapabilityRegistry with builder-gated update/deprecate`

---

## Task 2 — Implement RevenueEscrow.sol

**File:** `packages/contracts/src/RevenueEscrow.sol`

Builders' USDC accumulates here; they claim via `claim()`. Protocol takes 10% on settlement.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract RevenueEscrow {
    IERC20 public immutable usdc;
    address public owner;
    uint256 public protocolTreasury;
    mapping(address => uint256) public builderBalance;

    uint256 public constant BUILDER_BPS = 9000; // 90.00%
    uint256 public constant PROTOCOL_BPS = 1000; // 10.00%

    event Settled(address indexed builder, uint256 amountUSDC, uint256 builderShare, uint256 protocolShare);
    event Claimed(address indexed builder, uint256 amountUSDC);
    event ProtocolWithdrawn(address indexed to, uint256 amountUSDC);
    event OwnerUpdated(address indexed oldOwner, address indexed newOwner);

    error InsufficientBalance();
    error NotOwner();
    error TransferFailed();

    constructor(address _usdc, address _owner) {
        usdc = IERC20(_usdc);
        owner = _owner;
    }

    /// @notice Settle a batch of payments to a builder. Caller must approve USDC first.
    function settle(address builder, uint256 amountUSDC) external {
        if (!usdc.transferFrom(msg.sender, address(this), amountUSDC)) revert TransferFailed();
        uint256 builderShare = (amountUSDC * BUILDER_BPS) / 10000;
        uint256 protocolShare = amountUSDC - builderShare;
        builderBalance[builder] += builderShare;
        protocolTreasury += protocolShare;
        emit Settled(builder, amountUSDC, builderShare, protocolShare);
    }

    function claim() external {
        uint256 amt = builderBalance[msg.sender];
        if (amt == 0) revert InsufficientBalance();
        builderBalance[msg.sender] = 0;
        if (!usdc.transfer(msg.sender, amt)) revert TransferFailed();
        emit Claimed(msg.sender, amt);
    }

    function withdrawProtocol(address to, uint256 amount) external {
        if (msg.sender != owner) revert NotOwner();
        if (amount > protocolTreasury) revert InsufficientBalance();
        protocolTreasury -= amount;
        if (!usdc.transfer(to, amount)) revert TransferFailed();
        emit ProtocolWithdrawn(to, amount);
    }

    function setOwner(address newOwner) external {
        if (msg.sender != owner) revert NotOwner();
        address oldOwner = owner;
        owner = newOwner;
        emit OwnerUpdated(oldOwner, newOwner);
    }
}
```

**Test file:** `packages/contracts/test/RevenueEscrow.t.sol`

- [ ] Mock USDC ERC20 helper
- [ ] Test: settle splits 90/10, balances increment
- [ ] Test: claim transfers builder's accumulated USDC, resets balance
- [ ] Test: claim with 0 balance reverts
- [ ] Test: withdrawProtocol only by owner
- [ ] Test: setOwner only by owner
- [ ] Run `forge test`, all pass (4 cumulative test files now)
- [ ] Commit: `feat(contracts): RevenueEscrow with 90/10 split, pull-based claim`

---

## Task 3 — Foundry deployment script

**File:** `packages/contracts/script/Deploy.s.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {CapabilityRegistry} from "../src/CapabilityRegistry.sol";
import {RevenueEscrow} from "../src/RevenueEscrow.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPK = vm.envUint("PRIVATE_KEY");
        address owner = vm.envAddress("PROTOCOL_OWNER");
        address usdc = vm.envAddress("USDC_ADDRESS");

        vm.startBroadcast(deployerPK);

        CapabilityRegistry registry = new CapabilityRegistry(owner);
        RevenueEscrow escrow = new RevenueEscrow(usdc, owner);

        vm.stopBroadcast();

        console.log("CapabilityRegistry:", address(registry));
        console.log("RevenueEscrow:", address(escrow));
    }
}
```

Add `console` import via `forge-std/console.sol`.

Add deploy script entry in `packages/contracts/package.json`:
```json
"deploy:sepolia": "forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC --broadcast --verify --etherscan-api-key $BASESCAN_API_KEY",
"deploy:mainnet": "forge script script/Deploy.s.sol --rpc-url $BASE_RPC --broadcast --verify --etherscan-api-key $BASESCAN_API_KEY"
```

- [ ] Commit: `chore(contracts): add Foundry deploy script for Sepolia + mainnet`

---

## Task 4 — Deploy to Base Sepolia + integration test

### Step 1: Set up testnet env

Create `packages/contracts/.env` (gitignored):
```
PRIVATE_KEY=0x...  # generate fresh deployer wallet, fund with Sepolia ETH
PROTOCOL_OWNER=0x...  # user's wallet (Plan 1A signed in with)
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e  # Base Sepolia USDC
BASE_SEPOLIA_RPC=https://sepolia.base.org
BASESCAN_API_KEY=...  # from https://basescan.org/myapikey
```

User obtains:
- Fresh deployer wallet (we can generate via `cast wallet new`)
- Sepolia ETH from https://www.alchemy.com/faucets/base-sepolia
- BaseScan API key

### Step 2: Deploy

```bash
cd packages/contracts && forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC --broadcast --verify --etherscan-api-key $BASESCAN_API_KEY
```

Capture deployed addresses, paste into root README / .env.example.

### Step 3: Smoke test on Sepolia

Use cast to interact:
```bash
# Register a test capability
cast send $REGISTRY_ADDRESS "register(bytes32,uint256,uint8,bytes32)" \
  $(cast --to-bytes32 "test-skill") 1000 0 $(cast --to-bytes32 "dummyhash") \
  --rpc-url $BASE_SEPOLIA_RPC --private-key $PRIVATE_KEY

# Read back
cast call $REGISTRY_ADDRESS "getCapability(bytes32)" $(cast --to-bytes32 "test-skill") --rpc-url $BASE_SEPOLIA_RPC
```

- [ ] Verify contracts on BaseScan Sepolia
- [ ] Commit: `chore(contracts): record Base Sepolia deployment addresses`

---

## Task 5 — Settlement worker (off-chain → on-chain)

**File:** `apps/gateway/src/workers/settlement.ts`

Cron worker that:
1. Reads `usage_event` rows where `billed=true AND settled=false`
2. Groups by builder
3. Calls `RevenueEscrow.settle(builder, totalAmount)` on-chain
4. Marks rows `settled=true` with `settledTx` hash

Schema addition:
- Add `settled boolean default false` + `settledTx text` columns to `usage_event`
- Generate migration

### Implementation

```typescript
import { createPublicClient, createWalletClient, http, parseUnits } from "viem";
import { base, baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { getDb } from "../lib/db.js";
import { env } from "../env.js";
import { usageEvent, capability, wallet } from "@oryn/db";
import { eq, and, sql } from "drizzle-orm";

const ESCROW_ABI = [
  {
    name: "settle",
    type: "function",
    inputs: [{ name: "builder", type: "address" }, { name: "amountUSDC", type: "uint256" }],
    stateMutability: "nonpayable",
  },
] as const;

const USDC_ABI = [
  {
    name: "approve",
    type: "function",
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;

export async function runSettlement() {
  // Implementation: aggregate unsettled billed=true rows by builder,
  // approve USDC, call settle() per builder, mark rows settled=true.
}
```

(Full implementation in subagent execution. Pattern: settle in batches, idempotent, retry on failure.)

### Step: Add cron entry

For Railway: register as a separate worker process OR include as a setInterval in main server (simpler for MVP).

For MVP, simplest: trigger settlement when usage_event count crosses threshold (e.g., every 100 unsettled rows), OR just run manually post-launch.

- [ ] Add schema columns + migration
- [ ] Implement worker
- [ ] Trigger via cron or threshold
- [ ] Commit: `feat(gateway): settlement worker for off-chain → on-chain push`

---

## Task 6 — Vercel + Railway deploy

### Step 1: Vercel deploy (web)

```bash
cd "c:/Users/ridzk/Music/claude code/basedeploy2"
npm i -g vercel  # if not installed
vercel link  # link to a new Vercel project named "oryn-works"
vercel env add DATABASE_URL  # paste Neon connection string
vercel env add JWT_SECRET  # paste the same secret used in dev
vercel env add NEXT_PUBLIC_GATEWAY_URL  # https://gateway.oryn.works (Railway URL once deployed)
vercel env add NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
vercel env add NEXT_PUBLIC_BASE_CHAIN_ID  # 8453 for mainnet
vercel env add NEXT_PUBLIC_BASE_SEPOLIA_CHAIN_ID  # 84532
vercel --prod
```

Set project root to `apps/web` (or use a `vercel.json` at repo root pointing build to apps/web).

### Step 2: Set up `apps/web/vercel.json`

```json
{
  "buildCommand": "cd ../.. && pnpm install && pnpm --filter @oryn/db run build && pnpm --filter @oryn/web run build",
  "outputDirectory": ".next",
  "installCommand": "echo 'install handled in buildCommand'"
}
```

### Step 3: Railway deploy (gateway)

- Sign up at https://railway.app
- New project → "Deploy from GitHub repo" (push repo to GitHub first)
- Service: `apps/gateway`
- Build command: `pnpm install && pnpm --filter @oryn/db run build && pnpm --filter @oryn/gateway run build`
- Start command: `pnpm --filter @oryn/gateway run start`
- Add env vars: DATABASE_URL, JWT_SECRET, PORT (Railway sets), WEB_ORIGIN (Vercel domain), X402_CHAIN_ID, NODE_ENV=production
- Generate Railway domain or attach custom (api.oryn.works)

### Step 4: Configure custom domain `oryn.works`

- Buy `oryn.works` (Namecheap, Porkbun, etc.)
- Add to Vercel: Settings → Domains → Add `oryn.works` and `www.oryn.works`
- Update DNS A/CNAME records per Vercel instructions
- Wait for SSL auto-provision

### Step 5: Test deployed app end-to-end

- Open https://oryn.works
- Connect wallet
- Sign in
- Browse capabilities (seed data should still be in Neon)
- Try a skill call via curl with Bearer JWT:
  ```bash
  curl -X POST https://api.oryn.works/v1/skills/aeon-research-pack/call \
    -H "Authorization: Bearer $JWT" \
    -H "Content-Type: application/json" \
    -d '{"prompt": "test"}'
  ```

- [ ] Verify all production routes
- [ ] Commit: `docs: add deployment URLs and post-launch verification checklist`

---

## Task 7 — Base mainnet deploy + seed mainnet

### Step 1: Deploy contracts to mainnet

```bash
cd packages/contracts && forge script script/Deploy.s.sol --rpc-url $BASE_RPC --broadcast --verify --etherscan-api-key $BASESCAN_API_KEY
```

Use `USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` (Base mainnet USDC).

Set `PROTOCOL_OWNER` to a multisig if available; for solo dev, user's primary wallet.

### Step 2: Update gateway env to point to mainnet

`X402_CHAIN_ID=8453` already default.

Set new env in Railway: `REGISTRY_ADDRESS`, `ESCROW_ADDRESS`, `USDC_ADDRESS` (mainnet).

### Step 3: Re-seed if Neon was reset

The seed script idempotently inserts. Just re-run if needed.

- [ ] Deploy contracts mainnet
- [ ] Verify on BaseScan mainnet
- [ ] Update Railway env
- [ ] Commit: `chore: record Base mainnet deployment addresses`

---

## Task 8 — Soft launch announcement

### Step 1: Prepare pinned tweet

```
introducing oryn — the capability marketplace for AI agents.

🧩 skills (mcp servers) + 📚 knowledge packs + 🪪 on-chain reputation
🟦 built on @base · settled in USDC
🛠 builders publish, operators install, agents level up

→ oryn.works

soft launch is live. early builders welcome.
```

### Step 2: Thread (optional)

3-5 follow-up tweets:
1. Problem: AI agents need access to specialized capabilities, but discovery is fragmented + payment is friction-heavy
2. Solution: Oryn = one marketplace, wallet auth, USDC per call, on-chain reputation
3. For builders: publish a skill, earn USDC per call (90/10 split)
4. For operators: discover, install, attest. Skills become composable
5. CTA: visit `oryn.works`, follow `@orynworks`, drop a Discord link

### Step 3: Submit to Aeon ecosystem map

If applicable: open a PR to add Oryn to the Aeon `ECOSYSTEM.md` per the agent-economy community norms.

### Step 4: Light marketing seed

- DM 3-5 friendly builders to seed first non-Oryn capabilities
- Post in 1-2 relevant Discord servers (Base, AI agents)

- [ ] Tweet posted
- [ ] Pinned to profile
- [ ] Domain LIVE at oryn.works
- [ ] No commits — this is a manual ops task

---

## Acceptance criteria (Plan 1D complete when ALL pass)

- [ ] Task 0 polish (5 commits)
- [ ] CapabilityRegistry.sol + tests pass
- [ ] RevenueEscrow.sol + tests pass
- [ ] Foundry deploy script works locally
- [ ] Contracts deployed to Base Sepolia, verified on BaseScan
- [ ] Settlement worker code shipped (manual trigger OK for MVP)
- [ ] Vercel deploys `apps/web` to `oryn.works`
- [ ] Railway deploys `apps/gateway` to a public URL (api.oryn.works ideally)
- [ ] Custom domain `oryn.works` resolves with SSL
- [ ] Contracts deployed to Base mainnet, verified
- [ ] All env vars set correctly in production
- [ ] End-to-end test: sign in → browse → install → settled USDC visible on-chain (with manual settlement trigger if needed)
- [ ] Soft launch tweet posted from `@orynworks`

---

## What's NOT in Plan 1D (Phase 2+)

- ❌ Attestation submission UI (Phase 2)
- ❌ Reputation score computation (Phase 2)
- ❌ Vector DB for knowledge (Phase 3)
- ❌ Subscription tiers / token gating (Phase 4)
- ❌ Aeon official integration (Phase 5)
- ❌ SDK + CLI (Phase 5)

---

_End of Plan 1D. After execution, Oryn Works is LIVE. Phase 2 onwards is iteration._
