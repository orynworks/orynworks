import { Suspense } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BrowseFilters } from "@/components/BrowseFilters";
import { CapabilityCard } from "@/components/CapabilityCard";
import { getSession } from "@/lib/get-session";
import { getDb } from "@/lib/db";
import { listPublishedCapabilities } from "@oryn/db";

type SearchParams = Promise<{
  type?: string;
  category?: string;
  q?: string;
}>;

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getSession();
  const params = await searchParams;

  const typeFilter =
    params.type === "skill" || params.type === "knowledge" ? params.type : undefined;

  const db = getDb();
  const capabilities = await listPublishedCapabilities(db, {
    type: typeFilter,
    category: params.category || undefined,
    search: params.q || undefined,
    limit: 60,
  });

  return (
    <main className="min-h-screen flex flex-col">
      <Header showDashboardLink={!!session} />
      <section className="flex-1 px-6 py-12 max-w-6xl mx-auto w-full">
        <div className="mb-10">
          <p className="text-xs tracking-[0.3em] text-cream/60 uppercase mb-3 font-mono">
            Browse
          </p>
          <h1 className="font-serif text-4xl mb-3">Capabilities</h1>
          <p className="text-cream/60 max-w-xl">
            Discover skills and knowledge packs for AI agents — discovered, installed, attested.
          </p>
        </div>

        <Suspense fallback={null}>
          <BrowseFilters />
        </Suspense>

        <div className="mt-8">
          {capabilities.length === 0 ? (
            <div className="border border-cream/10 px-8 py-16 text-center">
              <p className="text-cream/60 mb-2">No capabilities match these filters.</p>
              <p className="text-cream/40 text-sm">
                Try a different category or search term — or be the first to{" "}
                <a href="/build/new" className="text-orange hover:underline">
                  publish one
                </a>
                .
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs font-mono uppercase tracking-wider text-cream/40 mb-4">
                {capabilities.length} {capabilities.length === 1 ? "result" : "results"}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {capabilities.map((cap) => (
                  <CapabilityCard key={cap.id} capability={cap} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}
