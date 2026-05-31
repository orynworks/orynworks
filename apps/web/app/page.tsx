import Link from "next/link";
import { unstable_cache } from "next/cache";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CapabilityCard } from "@/components/CapabilityCard";
import { TerminalDemo } from "@/components/TerminalDemo";
import { StatusBar } from "@/components/StatusBar";
import { EyebrowChip } from "@/components/EyebrowChip";
import { getDb } from "@/lib/db";
import { listFeaturedCapabilities, getLandingStats } from "@oryn/db";

export const revalidate = 30;

// DB reads aren't `fetch()`, so segment-level revalidate doesn't cache them.
// Wrap in unstable_cache so the home page can serve from ISR cache.
const getCachedFeatured = unstable_cache(
  async () => {
    const db = getDb();
    return listFeaturedCapabilities(db, 6);
  },
  ["landing-featured"],
  { revalidate: 30, tags: ["capabilities"] }
);

const getCachedLandingStats = unstable_cache(
  async () => {
    const db = getDb();
    return getLandingStats(db);
  },
  ["landing-stats"],
  { revalidate: 30, tags: ["capabilities", "wallets"] }
);

export default async function HomePage() {
  const [featured, stats] = await Promise.all([
    getCachedFeatured(),
    getCachedLandingStats(),
  ]);

  return (
    <main className="min-h-screen flex flex-col bg-warmdark">
      <Header showDashboardLink />
      <StatusBar />

      <section className="relative flex flex-col items-center justify-center px-6 py-16 md:py-24 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.15] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at center, rgba(232,220,200,0.55) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div
          aria-hidden
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[320px] sm:w-[480px] md:w-[640px] h-[480px] rounded-full pointer-events-none opacity-[0.18] blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(229,115,79,0.6) 0%, transparent 70%)",
          }}
        />
        <div className="relative max-w-xl text-center">
          <div className="flex justify-center mb-5">
            <EyebrowChip>A capability marketplace</EyebrowChip>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl leading-tight tracking-tight mb-5">
            The capability marketplace{" "}
            <span className="text-orange">for AI agents.</span>
          </h1>
          <p className="text-cream/70 text-base md:text-lg mb-8 max-w-xl mx-auto leading-relaxed">
            The settlement layer for AI agent capabilities. Builders publish
            skills and knowledge. Operators install with a single command.
            On-chain reputation that compounds.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <Link
              href="/browse"
              className="bg-orange text-warmdark px-6 py-3 font-mono text-xs uppercase tracking-widest hover:bg-orange-light transition-colors text-center w-full sm:w-auto"
            >
              Browse the Hub →
            </Link>
            <Link
              href="/build/new"
              className="border border-cream/30 text-cream px-6 py-3 font-mono text-xs uppercase tracking-widest hover:border-orange hover:text-orange transition-colors text-center w-full sm:w-auto"
            >
              List a capability
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-t border-cream/10 px-6 py-6">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-x-6 sm:gap-x-10 gap-y-3 text-xs font-mono uppercase tracking-widest text-cream/60">
          <span>
            <span className="text-cream font-serif text-base normal-case tracking-normal">
              {stats.totalCapabilities}
            </span>{" "}
            capabilities
          </span>
          <span className="text-cream/20">·</span>
          <span>
            <span className="text-cream font-serif text-base normal-case tracking-normal">
              {stats.totalSkills}
            </span>{" "}
            skills
          </span>
          <span className="text-cream/20">·</span>
          <span>
            <span className="text-cream font-serif text-base normal-case tracking-normal">
              {stats.totalKnowledge}
            </span>{" "}
            knowledge
          </span>
          <span className="text-cream/20">·</span>
          <span>
            <span className="text-cream font-serif text-base normal-case tracking-normal">
              {stats.totalBuilders}
            </span>{" "}
            builders
          </span>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-cream/10 px-6 py-16 max-w-5xl mx-auto w-full">
        <div className="text-center mb-12">
          <p className="text-xs tracking-[0.3em] text-cream/60 uppercase mb-2 font-mono">
            How it works
          </p>
          <h2 className="font-serif text-3xl">Three steps to a capable agent.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <p className="text-xs font-mono text-orange tracking-widest mb-3">01 · DISCOVER</p>
            <h3 className="font-serif text-xl mb-2">Browse capabilities</h3>
            <p className="text-sm text-cream/60 leading-relaxed">
              Filter skills, knowledge packs, and reputation signals by category. Find what
              your agent needs.
            </p>
          </div>
          <div>
            <p className="text-xs font-mono text-orange tracking-widest mb-3">02 · INSTALL</p>
            <h3 className="font-serif text-xl mb-2">One-line setup</h3>
            <p className="text-sm text-cream/60 leading-relaxed">
              Copy the install snippet into Claude, Cursor, or any MCP-aware client. Pay
              per use, settled instantly.
            </p>
          </div>
          <div>
            <p className="text-xs font-mono text-orange tracking-widest mb-3">03 · ATTEST</p>
            <h3 className="font-serif text-xl mb-2">Build reputation</h3>
            <p className="text-sm text-cream/60 leading-relaxed">
              Every interaction earns on-chain trust signals. Capabilities and builders grow
              their reputation as agents use them.
            </p>
          </div>
        </div>
      </section>

      {/* Terminal demo */}
      <section className="border-t border-cream/10 px-6 py-16 max-w-4xl mx-auto w-full">
        <div className="text-center mb-10">
          <p className="text-xs tracking-[0.3em] text-cream/60 uppercase mb-2 font-mono">
            Agent shell
          </p>
          <h2 className="font-serif text-3xl mb-3">Install. Run. Settle.</h2>
          <p className="text-cream/60 text-sm max-w-md mx-auto">
            How it looks from your agent&apos;s CLI.
          </p>
        </div>
        <TerminalDemo />
      </section>

      {featured.length > 0 && (
        <section className="px-6 py-16 max-w-6xl mx-auto w-full border-t border-cream/10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
            <div>
              <p className="text-xs tracking-[0.3em] text-cream/60 uppercase mb-2 font-mono">
                Featured
              </p>
              <h2 className="font-serif text-2xl sm:text-3xl">Recent capabilities</h2>
            </div>
            <Link
              href="/browse"
              className="text-xs font-mono uppercase tracking-widest text-cream/70 hover:text-orange transition-colors"
            >
              Browse all →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featured.map((cap) => (
              <CapabilityCard key={cap.id} capability={cap} />
            ))}
          </div>
        </section>
      )}

      <div className="flex-1" />

      <Footer />
    </main>
  );
}
