import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { wallet, capability, type NewCapability } from "./schema.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL not set. Export it or create .env in packages/db.");
  process.exit(1);
}

// Recognizable seed builder address (DO NOT use a real wallet)
const SEED_BUILDER_ADDRESS = "0x000000000000000000000000000000000000d0ed";

type SeedCapability = Omit<NewCapability, "builderId">;

const SAMPLES: SeedCapability[] = [
  {
    slug: "deep-research",
    type: "skill",
    name: "Deep Research",
    description:
      "Multi-source research toolchain: deep-dive a topic, summarize across 10+ sources, structure findings with citations.\n\nReturns markdown with quoted excerpts and source URLs.",
    category: "knowledge",
    hostUrl: "https://deep-research.example.com/mcp",
    priceUsdc: "0.015",
    tokenGated: false,
    status: "published",
    version: "1.2.0",
  },
  {
    slug: "base-tx-skill",
    type: "skill",
    name: "Base Transaction Composer",
    description:
      "Compose, simulate, and submit transactions on Base. Supports ERC-20 transfer, swap, and bridge primitives. Returns signed payloads ready for x402 settlement.",
    category: "action",
    hostUrl: "https://base-tx.example.com/mcp",
    priceUsdc: "0",
    tokenGated: false,
    status: "published",
    version: "0.9.1",
  },
  {
    slug: "alpha-feed-dataset",
    type: "knowledge",
    name: "Alpha Feed Dataset",
    description:
      "Curated daily feed of high-signal posts and announcements from 200+ vetted accounts across DeFi, infra, and AI agents on Base. Vector-indexed for relevance search.",
    category: "knowledge",
    hostUrl: "ipfs://bafybeie4alphafeeddatasetexample0001",
    priceUsdc: "0.02",
    tokenGated: false,
    status: "published",
    version: "2.0.0",
  },
  {
    slug: "onchain-identity",
    type: "skill",
    name: "On-chain Identity Resolver",
    description:
      "Resolve ENS, Basenames, Farcaster handles, Lens handles to wallet addresses (and back). Caches results for 12h. Reads on-chain only — no off-chain trust.",
    category: "data",
    hostUrl: "https://identity.example.com/mcp",
    priceUsdc: "0",
    tokenGated: false,
    status: "published",
    version: "1.0.0",
  },
  {
    slug: "twitter-mentions-watcher",
    type: "skill",
    name: "Twitter Mentions Watcher",
    description:
      "Polls Twitter for new mentions of a target handle. Returns a normalized stream of posts with author, timestamp, and engagement signals. Useful for agent auto-reply pipelines.",
    category: "data",
    hostUrl: "https://mentions.example.com/mcp",
    priceUsdc: "0.008",
    tokenGated: false,
    status: "published",
    version: "0.4.2",
  },
  {
    slug: "smart-contract-summarizer",
    type: "skill",
    name: "Smart Contract Summarizer",
    description:
      "Given a contract address, fetches source from Basescan, produces a plain-English summary of what the contract does, flags risks (proxy/upgrade patterns, owner privileges).",
    category: "utility",
    hostUrl: "https://contract-summary.example.com/mcp",
    priceUsdc: "0.012",
    tokenGated: false,
    status: "published",
    version: "1.1.0",
  },
  {
    slug: "base-dex-quotes",
    type: "skill",
    name: "Base DEX Quote Aggregator",
    description:
      "Live quote aggregation across Uniswap, Aerodrome, Velodrome, and Baseswap. Returns the best route with gas estimate. Read-only (does not submit).",
    category: "data",
    hostUrl: "https://dex-quotes.example.com/mcp",
    priceUsdc: "0",
    tokenGated: false,
    status: "published",
    version: "0.7.0",
  },
  {
    slug: "agent-playbook-vault",
    type: "knowledge",
    name: "Agent Playbook Vault",
    description:
      "Library of vetted agent patterns: research, trading, social, monitoring, content production. Each pattern includes prompt template, expected tools, and known failure modes.",
    category: "knowledge",
    hostUrl: "ipfs://bafybeie4playbookvaultexample0001",
    priceUsdc: "0",
    tokenGated: false,
    status: "published",
    version: "1.0.0",
  },
];

async function main() {
  const sql = postgres(databaseUrl!, { max: 1 });
  const db = drizzle(sql, { schema: { wallet, capability } });

  // Upsert seed builder wallet
  let seedBuilder = await db
    .select()
    .from(wallet)
    .where(eq(wallet.address, SEED_BUILDER_ADDRESS))
    .limit(1);

  if (seedBuilder.length === 0) {
    const [created] = await db
      .insert(wallet)
      .values({
        address: SEED_BUILDER_ADDRESS,
        displayName: "Oryn Seed",
        bio: "Sample builder for development and demos. Capabilities listed under this account are placeholders.",
        twitter: "orynworks",
      })
      .returning();
    seedBuilder = [created];
    console.log("✓ Created seed builder wallet:", SEED_BUILDER_ADDRESS);
  } else {
    console.log("✓ Seed builder wallet exists:", SEED_BUILDER_ADDRESS);
  }

  const builderId = seedBuilder[0].id;

  // Insert each sample (idempotent)
  let createdCount = 0;
  let skippedCount = 0;
  for (const sample of SAMPLES) {
    const existing = await db
      .select()
      .from(capability)
      .where(eq(capability.slug, sample.slug))
      .limit(1);

    if (existing.length > 0) {
      console.log(`  - skip: ${sample.slug} (already exists)`);
      skippedCount++;
      continue;
    }

    await db.insert(capability).values({ ...sample, builderId });
    console.log(`  + create: ${sample.slug}`);
    createdCount++;
  }

  console.log(`\n✓ Seed complete: ${createdCount} created, ${skippedCount} skipped.`);
  await sql.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
