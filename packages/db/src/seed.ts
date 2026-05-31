import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { wallet, capability, type NewCapability } from "./schema.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL not set. Export it or create .env in packages/db.");
  process.exit(1);
}

// Seed builder address — recognisable, not a real wallet.
const SEED_BUILDER_ADDRESS = "0x000000000000000000000000000000000000d0ed";

// Host URL of the built-in demo capabilities. In dev this is the local gateway.
// In production these will be re-pointed to the deployed gateway URL.
const DEMO_HOST = process.env.MCP_DEMO_HOST ?? "http://localhost:4000/mcp";

type SeedCapability = Omit<NewCapability, "builderId">;

const SAMPLES: SeedCapability[] = [
  {
    slug: "echo-debug",
    type: "skill",
    name: "Echo Debug",
    description:
      "Lightweight diagnostic capability that mirrors any input back with a server-generated timestamp and request id.\n\nUse it to verify the install → call → settle loop end-to-end before plugging in real logic.",
    category: "utility",
    hostUrl: `${DEMO_HOST}/echo`,
    priceUsdc: "0",
    tokenGated: false,
    status: "published",
    version: "1.0.0",
  },
  {
    slug: "base-live-block",
    type: "skill",
    name: "Base Live Block",
    description:
      "Real-time block info for Base mainnet (chainId 8453) or Base Sepolia (84532). Returns block number, hash, timestamp, and transaction count.\n\nUseful for agents that need to time on-chain actions or display chain health.",
    category: "data",
    hostUrl: `${DEMO_HOST}/base-block`,
    priceUsdc: "0",
    tokenGated: false,
    status: "published",
    version: "1.0.0",
  },
  {
    slug: "ens-resolver",
    type: "skill",
    name: "ENS Resolver",
    description:
      "Bidirectional ENS resolution. Send `{ name: 'vitalik.eth' }` to get the address, or `{ address: '0x...' }` to reverse-resolve to the primary ENS name. Uses public Ethereum mainnet RPC.\n\nReturns `{ resolved: true|false }` so agents can fall back gracefully.",
    category: "data",
    hostUrl: `${DEMO_HOST}/ens-lookup`,
    priceUsdc: "0",
    tokenGated: false,
    status: "published",
    version: "1.0.0",
  },
  {
    slug: "github-trending",
    type: "knowledge",
    name: "GitHub Trending",
    description:
      "Top GitHub repositories created in the last 7 days, filtered by language. Returns full repo metadata: stars, description, owner, URL.\n\nLanguages supported: typescript, javascript, python, rust, go, solidity, java, swift, kotlin. Defaults to typescript.",
    category: "knowledge",
    hostUrl: `${DEMO_HOST}/github-trending`,
    priceUsdc: "0",
    tokenGated: false,
    status: "published",
    version: "1.0.0",
  },
];

async function main() {
  const sql = postgres(databaseUrl!, { max: 1 });
  const db = drizzle(sql, { schema: { wallet, capability } });

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
        bio: "Builder identity used for built-in demo capabilities maintained by the Oryn team. These are real working endpoints, not placeholders.",
        twitter: "orynworks",
      })
      .returning();
    seedBuilder = [created];
    console.log("✓ Created seed builder wallet:", SEED_BUILDER_ADDRESS);
  } else {
    console.log("✓ Seed builder wallet exists:", SEED_BUILDER_ADDRESS);
  }

  const builderId = seedBuilder[0].id;

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
