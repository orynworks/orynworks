import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CapabilityCard } from "@/components/CapabilityCard";
import { getSession } from "@/lib/get-session";
import { getDb } from "@/lib/db";
import { getWalletByAddress, listCapabilitiesByBuilder } from "@oryn/db";

type RouteParams = Promise<{ wallet: string }>;

function isValidAddress(input: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(input);
}

export default async function BuilderProfilePage({ params }: { params: RouteParams }) {
  const { wallet: walletParam } = await params;
  if (!isValidAddress(walletParam)) {
    notFound();
  }

  const session = await getSession();
  const db = getDb();
  const builder = await getWalletByAddress(db, walletParam);

  if (!builder) {
    notFound();
  }

  const capabilities = await listCapabilitiesByBuilder(db, builder.id);
  const published = capabilities.filter((c) => c.status === "published");

  const skillsCount = published.filter((c) => c.type === "skill").length;
  const knowledgeCount = published.filter((c) => c.type === "knowledge").length;

  const addressShort = `${builder.address.slice(0, 6)}…${builder.address.slice(-4)}`;
  const isMe = session?.address.toLowerCase() === builder.address.toLowerCase();

  return (
    <main className="min-h-screen flex flex-col">
      <Header showDashboardLink={!!session} />

      <section className="flex-1 px-6 py-12 max-w-5xl mx-auto w-full">
        <p className="text-xs tracking-[0.3em] text-cream/60 uppercase mb-3 font-mono">
          Builder
        </p>

        <div className="border border-cream/10 p-6 mb-10">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-serif text-3xl mb-2">
                {builder.displayName ?? addressShort}
              </h1>
              <p className="font-mono text-xs text-cream/50 break-all">
                {builder.address}
              </p>
              {builder.bio && (
                <p className="text-cream/70 text-sm mt-4 max-w-md">{builder.bio}</p>
              )}
              {builder.twitter && (
                <a
                  href={`https://twitter.com/${builder.twitter.replace("@", "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-mono text-orange hover:underline mt-3 inline-block"
                >
                  @{builder.twitter.replace("@", "")} ↗
                </a>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 text-center min-w-[300px]">
              <div className="border border-cream/10 px-3 py-3">
                <div className="font-serif text-2xl text-cream">{published.length}</div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-cream/40 mt-1">
                  Published
                </div>
              </div>
              <div className="border border-cream/10 px-3 py-3">
                <div className="font-serif text-2xl text-cream">{skillsCount}</div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-cream/40 mt-1">
                  Skills
                </div>
              </div>
              <div className="border border-cream/10 px-3 py-3">
                <div className="font-serif text-2xl text-cream">{knowledgeCount}</div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-cream/40 mt-1">
                  Knowledge
                </div>
              </div>
            </div>
          </div>

          {isMe && (
            <p className="text-xs font-mono text-cream/40 mt-6 pt-4 border-t border-cream/10">
              This is your public profile. Edit profile info via dashboard (coming Plan 1B+).
            </p>
          )}
        </div>

        <div>
          <p className="text-xs tracking-[0.3em] text-cream/60 uppercase mb-4 font-mono">
            Capabilities
          </p>
          {published.length === 0 ? (
            <div className="border border-cream/10 px-8 py-16 text-center">
              <p className="text-cream/60 mb-2">No published capabilities yet.</p>
              <p className="text-cream/40 text-sm">
                This builder hasn't shipped anything to the marketplace.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {published.map((cap) => (
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
