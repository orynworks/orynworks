import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { EarningsCard } from "@/components/EarningsCard";
import { StatusBar } from "@/components/StatusBar";
import { EyebrowChip } from "@/components/EyebrowChip";
import { getSession } from "@/lib/get-session";
import { getDb } from "@/lib/db";
import {
  listCapabilitiesByBuilder,
  getWalletByAddress,
  upsertWalletByAddress,
  getCapabilityRevenue,
  getUsageStats,
  getBuilderEarnings,
} from "@oryn/db";

export default async function BuildDashboardPage() {
  const session = await getSession();

  if (!session) {
    return (
      <main className="min-h-screen flex flex-col bg-warmdark">
        <Header showDashboardLink={false} />
        <StatusBar />
        <section className="flex-1 flex items-center justify-center px-6 py-20">
          <div className="text-center max-w-md">
            <div className="flex justify-center mb-4">
              <EyebrowChip>Build</EyebrowChip>
            </div>
            <h1 className="font-serif text-4xl mb-4">Sign in to publish.</h1>
            <p className="text-cream/60 text-sm mb-8">
              Connect your wallet and sign in to manage your capabilities, view revenue,
              and publish new skills or knowledge packs.
            </p>
            <Link
              href="/"
              className="inline-block bg-orange text-warmdark px-6 py-3 font-mono text-xs uppercase tracking-widest hover:bg-orange-light transition-colors"
            >
              ← Back to home
            </Link>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  const db = getDb();
  let walletRecord = await getWalletByAddress(db, session.address);
  if (!walletRecord) {
    // Fallback: shouldn't happen post-sign-in (verify route upserts) but safe
    walletRecord = await upsertWalletByAddress(db, session.address);
  }
  const myCapabilities = await listCapabilitiesByBuilder(db, walletRecord.id);
  const earnings = await getBuilderEarnings(db, walletRecord.id);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const capsWithStats = await Promise.all(
    myCapabilities.map(async (cap) => {
      const [revenue, stats] = await Promise.all([
        getCapabilityRevenue(db, cap.id),
        getUsageStats(db, cap.id, sevenDaysAgo),
      ]);
      return { ...cap, revenue, stats };
    })
  );

  return (
    <main className="min-h-screen flex flex-col bg-warmdark">
      <Header showDashboardLink />
      <StatusBar />
      <section className="flex-1 px-6 py-12 max-w-5xl mx-auto w-full">
        <div className="flex items-baseline justify-between mb-8">
          <div>
            <div className="mb-3">
              <EyebrowChip>Build</EyebrowChip>
            </div>
            <h1 className="font-serif text-4xl">Your capabilities</h1>
          </div>
          <Link
            href="/build/new"
            className="bg-orange text-warmdark px-6 py-3 font-mono text-xs uppercase tracking-widest hover:bg-orange-light transition-colors"
          >
            + Publish new
          </Link>
        </div>

        {capsWithStats.length > 0 && (
          <EarningsCard lifetimeBuilderShareUsdc={earnings.builderShareUsdc} />
        )}

        {capsWithStats.length === 0 ? (
          <div className="border border-cream/10 px-8 py-16 text-center">
            <p className="text-cream/60 mb-4">No capabilities yet.</p>
            <p className="text-cream/40 text-sm">
              Publish your first Skill (MCP server URL) or Knowledge pack.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {capsWithStats.map((cap) => (
              <li key={cap.id} className="border border-cream/10 px-5 py-4">
                <div className="flex items-baseline justify-between mb-3">
                  <Link
                    href={`/capability/${cap.slug}`}
                    className="font-serif text-lg hover:text-orange"
                  >
                    {cap.name}
                  </Link>
                  <span className="text-xs font-mono text-cream/60">
                    ${Number(cap.priceUsdc).toFixed(4)}/
                    {cap.type === "skill" ? "call" : "query"}
                  </span>
                </div>
                <p className="text-xs font-mono text-cream/50 mb-3">
                  {cap.slug} · {cap.type} · {cap.category} · {cap.status}
                </p>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <p className="font-mono text-cream/80">
                      ${Number(cap.revenue).toFixed(4)}
                    </p>
                    <p className="text-[10px] font-mono text-cream/40 uppercase">
                      Revenue
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-cream/80">{cap.stats.totalCalls}</p>
                    <p className="text-[10px] font-mono text-cream/40 uppercase">
                      Calls 7d
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-cream/80">
                      {cap.stats.totalCalls === 0
                        ? "—"
                        : `${(cap.stats.successRate * 100).toFixed(0)}%`}
                    </p>
                    <p className="text-[10px] font-mono text-cream/40 uppercase">
                      Success
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <Footer />
    </main>
  );
}
