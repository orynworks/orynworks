import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CapabilityCard } from "@/components/CapabilityCard";
import { StatusBar } from "@/components/StatusBar";
import { EyebrowChip } from "@/components/EyebrowChip";
import { getSession } from "@/lib/get-session";
import { getDb } from "@/lib/db";
import {
  getWalletByAddress,
  listCapabilitiesByBuilder,
  type Capability,
} from "@oryn/db";

type RouteParams = Promise<{ wallet: string }>;

export default async function BuilderProfilePage({
  params,
}: {
  params: RouteParams;
}) {
  const { wallet: walletParam } = await params;
  const session = await getSession();

  // Validate address format (0x followed by 40 hex chars)
  const addressRegex = /^0x[a-fA-F0-9]{40}$/;
  if (!addressRegex.test(walletParam)) {
    notFound();
  }

  const address = walletParam.toLowerCase();
  const db = getDb();
  const builder = await getWalletByAddress(db, address);

  if (!builder) {
    notFound();
  }

  const allCaps = await listCapabilitiesByBuilder(db, builder.id);
  const publishedCaps = allCaps.filter((c) => c.status === "published");

  const skillCount = publishedCaps.filter((c) => c.type === "skill").length;
  const knowledgeCount = publishedCaps.filter((c) => c.type === "knowledge").length;
  const isOwner = session?.address.toLowerCase() === address;

  const short = `${address.slice(0, 6)}…${address.slice(-4)}`;
  const joined = new Date(builder.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });

  return (
    <main className="min-h-screen flex flex-col bg-warmdark">
      <Header showDashboardLink={!!session} />
      <StatusBar />

      <section className="flex-1 px-6 py-12 max-w-6xl mx-auto w-full">
        {/* Profile header */}
        <div className="mb-10">
          <div className="mb-3">
            <EyebrowChip>Builder</EyebrowChip>
          </div>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
            <div>
              <h1 className="font-serif text-5xl mb-2">
                {builder.displayName ?? short}
              </h1>
              <p className="font-mono text-sm text-cream/50 break-all">{address}</p>
            </div>
            {isOwner && (
              <Link
                href="/build"
                className="border border-orange/40 text-orange px-5 py-2 font-mono text-xs uppercase tracking-widest hover:bg-orange hover:text-warmdark transition-colors w-fit"
              >
                Manage in dashboard →
              </Link>
            )}
          </div>

          {builder.bio && (
            <p className="text-cream/80 leading-relaxed max-w-2xl">{builder.bio}</p>
          )}

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-mono text-cream/50 uppercase tracking-wider mt-4">
            <span>Joined {joined}</span>
            {builder.twitter && (
              <a
                href={`https://x.com/${builder.twitter.replace(/^@/, "")}`}
                target="_blank"
                rel="noreferrer"
                className="text-cream/70 hover:text-orange"
              >
                @{builder.twitter.replace(/^@/, "")} ↗
              </a>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-12 max-w-2xl">
          <Stat label="Capabilities" value={publishedCaps.length} />
          <Stat label="Skills" value={skillCount} />
          <Stat label="Knowledge" value={knowledgeCount} />
        </div>

        {/* Capabilities grid */}
        <div>
          <h2 className="text-xs tracking-[0.3em] text-cream/60 uppercase mb-6 font-mono">
            Capabilities
          </h2>
          {publishedCaps.length === 0 ? (
            <div className="border border-cream/10 px-8 py-16 text-center">
              <p className="text-cream/60 mb-2">No published capabilities yet.</p>
              {isOwner && (
                <p className="text-cream/40 text-sm">
                  <Link href="/build/new" className="text-orange hover:underline">
                    Publish your first capability
                  </Link>{" "}
                  to fill this page.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {publishedCaps.map((cap: Capability) => (
                <CapabilityCard key={cap.id} capability={cap} />
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-cream/10 px-4 py-5 text-center">
      <div className="font-serif text-3xl text-cream">{value}</div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-cream/40 mt-1">
        {label}
      </div>
    </div>
  );
}
