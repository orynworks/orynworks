import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { InstallSnippet } from "@/components/InstallSnippet";
import { getSession } from "@/lib/get-session";
import { getDb } from "@/lib/db";
import { getCapabilityBySlug, getUsageStats, getWalletById } from "@oryn/db";

type RouteParams = Promise<{ slug: string }>;

export default async function CapabilityDetailPage({
  params,
}: {
  params: RouteParams;
}) {
  const { slug } = await params;
  const session = await getSession();

  const db = getDb();
  const capability = await getCapabilityBySlug(db, slug);

  if (!capability || capability.status !== "published") {
    notFound();
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const stats = await getUsageStats(db, capability.id, sevenDaysAgo);

  const builder = await getWalletById(db, capability.builderId);
  const builderAddress = builder?.address ?? capability.builderId;
  const builderShort = `${builderAddress.slice(0, 6)}…${builderAddress.slice(-4)}`;
  const isOwner = session?.address.toLowerCase() === builderAddress.toLowerCase();

  const isSkill = capability.type === "skill";
  const priceLabel =
    Number(capability.priceUsdc) === 0
      ? "Free"
      : `$${Number(capability.priceUsdc).toFixed(4)} USDC`;

  return (
    <main className="min-h-screen flex flex-col">
      <Header showDashboardLink={!!session} />

      <section className="flex-1 px-6 py-12 max-w-6xl mx-auto w-full">
        {/* Breadcrumb */}
        <nav className="text-xs font-mono uppercase tracking-wider text-cream/40 mb-8">
          <Link href="/browse" className="hover:text-orange">Browse</Link>
          <span className="mx-2">/</span>
          <span>{capability.category}</span>
          <span className="mx-2">/</span>
          <span className="text-cream/70">{capability.name}</span>
        </nav>

        <div className="grid lg:grid-cols-3 gap-10">
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
              <h1 className="font-serif text-5xl leading-tight mb-3">
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
              <InstallSnippet slug={capability.slug} type={capability.type} />
              <p className="text-xs text-cream/40 mt-2 font-mono">
                Requires <code>@oryn/sdk</code>. Coming soon.
              </p>
            </section>

            <section>
              <h2 className="text-xs tracking-[0.3em] text-cream/60 uppercase mb-4 font-mono">
                Usage (last 7d)
              </h2>
              <div className="grid grid-cols-3 gap-3 text-center">
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
              <div className="flex justify-between">
                <span className="text-cream/50 font-mono uppercase text-[10px] tracking-wider">
                  Builder
                </span>
                <Link
                  href={`/profile/${builderAddress}`}
                  className="font-mono text-cream/80 hover:text-orange"
                >
                  {builderShort}
                </Link>
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
