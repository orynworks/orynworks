import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { InstallSnippet } from "@/components/InstallSnippet";
import { StatusBar } from "@/components/StatusBar";
import { getDb } from "@/lib/db";
import { getCapabilityExample } from "@/lib/capability-examples";
import {
  getCapabilityBySlug,
  getUsageStats,
  getWalletById,
  listPublishedCapabilities,
} from "@oryn/db";

type RouteParams = Promise<{ slug: string }>;

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  // Pre-render all published capability slugs at build time.
  // Defensive: if the DB is unreachable during build, fall back to
  // empty list and let ISR generate pages on first request.
  try {
    const db = getDb();
    const caps = await listPublishedCapabilities(db, { limit: 200 });
    return caps.map((c) => ({ slug: c.slug }));
  } catch {
    return [];
  }
}

// DB reads are not `fetch()` calls, so the segment-level `revalidate = 60`
// does NOT cache them on its own. Wrap each read in `unstable_cache` so the
// page can actually be served from cache between requests.
const getCachedCapabilityBySlug = unstable_cache(
  async (slug: string) => {
    const db = getDb();
    return getCapabilityBySlug(db, slug);
  },
  ["capability-by-slug"],
  { revalidate: 60, tags: ["capabilities"] }
);

const getCachedUsageStats = unstable_cache(
  async (capabilityId: string) => {
    const db = getDb();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return getUsageStats(db, capabilityId, sevenDaysAgo);
  },
  ["capability-usage-stats"],
  { revalidate: 60, tags: ["usage"] }
);

const getCachedBuilderById = unstable_cache(
  async (builderId: string) => {
    const db = getDb();
    return getWalletById(db, builderId);
  },
  ["wallet-by-id"],
  { revalidate: 300, tags: ["wallets"] }
);

export default async function CapabilityDetailPage({
  params,
}: {
  params: RouteParams;
}) {
  const { slug } = await params;

  const capability = await getCachedCapabilityBySlug(slug);

  if (!capability || capability.status !== "published") {
    notFound();
  }

  const [stats, builder] = await Promise.all([
    getCachedUsageStats(capability.id),
    getCachedBuilderById(capability.builderId),
  ]);
  const builderAddress = builder?.address ?? capability.builderId;
  const builderShort = `${builderAddress.slice(0, 6)}…${builderAddress.slice(-4)}`;
  // isOwner determined client-side via wallet — keep server render cacheable
  const isOwner = false;

  const isSkill = capability.type === "skill";
  const priceLabel =
    Number(capability.priceUsdc) === 0
      ? "Free"
      : `$${Number(capability.priceUsdc).toFixed(4)} USDC`;

  return (
    <main className="min-h-screen flex flex-col bg-warmdark">
      <Header showDashboardLink />
      <StatusBar />

      <section className="flex-1 px-6 py-12 max-w-6xl mx-auto w-full">
        {/* Breadcrumb */}
        <nav className="flex flex-wrap text-xs font-mono uppercase tracking-wider text-cream/40 mb-8">
          <Link href="/browse" className="hover:text-orange">Browse</Link>
          <span className="mx-2">/</span>
          <span>{capability.category}</span>
          <span className="mx-2">/</span>
          <span className="text-cream/70">{capability.name}</span>
        </nav>

        <div className="grid lg:grid-cols-3 gap-6 md:gap-10">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            <header>
              <div className="flex items-center gap-3 mb-4">
                <span
                  className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 border ${
                    isSkill
                      ? "text-orange border-orange/40"
                      : "text-cream/70 border-cream/30"
                  }`}
                >
                  {isSkill ? "Skill" : "Knowledge"}
                </span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-cream/50 px-2 py-1 border border-cream/15">
                  {capability.category}
                </span>
                {capability.tokenGated && (
                  <span className="text-[10px] font-mono uppercase tracking-widest text-orange px-2 py-1 border border-orange/40">
                    Token-gated
                  </span>
                )}
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl leading-tight mb-3">
                {capability.name}
              </h1>
              <p className="text-sm font-mono text-cream/50">
                {capability.slug}
              </p>
            </header>

            <section>
              <h2 className="text-xs tracking-[0.3em] text-cream/60 uppercase mb-4 font-mono">
                About
              </h2>
              <div className="text-cream/80 leading-relaxed whitespace-pre-line">
                {capability.description}
              </div>
            </section>

            <section>
              <h2 className="text-xs tracking-[0.3em] text-cream/60 uppercase mb-4 font-mono">
                How to use
              </h2>
              <InstallSnippet
                slug={capability.slug}
                type={capability.type}
                mcpPath={getCapabilityExample(capability.slug)?.mcpPath}
                exampleBody={getCapabilityExample(capability.slug)?.exampleBody}
              />
              <p className="text-xs text-cream/40 mt-3 font-mono">
                Need help wiring it up? See the{" "}
                <Link
                  href="/docs"
                  className="text-cream/70 hover:text-orange underline-offset-4 hover:underline"
                >
                  docs
                </Link>
                .
              </p>
            </section>

            <section>
              <h2 className="text-xs tracking-[0.3em] text-cream/60 uppercase mb-4 font-mono">
                Usage (last 7d)
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                <div className="border border-cream/10 px-4 py-5">
                  <div className="font-serif text-2xl text-cream">
                    {stats.totalCalls === 0 ? "—" : stats.totalCalls}
                  </div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-cream/40 mt-1">
                    Calls
                  </div>
                </div>
                <div className="border border-cream/10 px-4 py-5">
                  <div className="font-serif text-2xl text-cream">
                    {stats.totalCalls === 0
                      ? "—"
                      : `${(stats.successRate * 100).toFixed(0)}%`}
                  </div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-cream/40 mt-1">
                    Success
                  </div>
                </div>
                <div className="border border-cream/10 px-4 py-5">
                  <div className="font-serif text-2xl text-cream">
                    {stats.avgLatencyMs === null
                      ? "—"
                      : `${Math.round(stats.avgLatencyMs)} ms`}
                  </div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-cream/40 mt-1">
                    Avg latency
                  </div>
                </div>
              </div>
              <p className="text-xs text-cream/40 mt-2 font-mono">
                {stats.totalCalls === 0
                  ? "No usage yet."
                  : "Last 7 days · Updated in real-time."}
              </p>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            <div className="border border-cream/15 p-5">
              <p className="text-xs font-mono uppercase tracking-wider text-cream/50 mb-2">
                Price
              </p>
              <p className="font-serif text-3xl">
                {priceLabel}
                {Number(capability.priceUsdc) > 0 && (
                  <span className="text-sm text-cream/40 ml-2 font-mono">
                    / {isSkill ? "call" : "query"}
                  </span>
                )}
              </p>
            </div>

            <div className="border border-cream/15 p-5 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-cream/50 font-mono uppercase text-[10px] tracking-wider">
                  Builder
                </span>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/profile/${builderAddress}`}
                    className="font-mono text-cream/80 hover:text-orange"
                  >
                    {builderShort}
                  </Link>
                  <Link
                    href={`/browse?builder=${builderAddress}`}
                    className="text-[10px] font-mono uppercase tracking-wider text-cream/40 hover:text-orange transition-colors border-l border-cream/15 pl-2"
                    title="See all their capabilities"
                  >
                    all →
                  </Link>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-cream/50 font-mono uppercase text-[10px] tracking-wider">
                  Version
                </span>
                <span className="font-mono text-cream/80">
                  v{capability.version}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-cream/50 font-mono uppercase text-[10px] tracking-wider">
                  Status
                </span>
                <span className="font-mono text-cream/80 capitalize">
                  {capability.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-cream/50 font-mono uppercase text-[10px] tracking-wider">
                  Published
                </span>
                <span className="font-mono text-cream/80">
                  {new Date(capability.createdAt).toLocaleDateString()}
                </span>
              </div>
              {capability.tokenGated && capability.requiredToken && (
                <div className="flex justify-between pt-3 border-t border-cream/10">
                  <span className="text-cream/50 font-mono uppercase text-[10px] tracking-wider">
                    Required token
                  </span>
                  <span className="font-mono text-cream/80 text-xs">
                    {capability.requiredToken.slice(0, 6)}…{capability.requiredToken.slice(-4)}
                  </span>
                </div>
              )}
            </div>

            {isOwner && (
              <Link
                href="/build"
                className="block text-center border border-orange/40 text-orange px-6 py-3 font-mono text-xs uppercase tracking-widest hover:bg-orange hover:text-warmdark transition-colors"
              >
                Manage in dashboard →
              </Link>
            )}
          </aside>
        </div>
      </section>

      <Footer />
    </main>
  );
}
