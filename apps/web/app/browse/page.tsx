import { Suspense } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BrowseFilters } from "@/components/BrowseFilters";
import { CapabilityCard } from "@/components/CapabilityCard";
import { StatusBar } from "@/components/StatusBar";
import { EyebrowChip } from "@/components/EyebrowChip";
import { getDb } from "@/lib/db";
import {
  listPublishedCapabilities,
  countPublishedCapabilities,
  type ListFilters,
  type SortMode,
  type PriceFilter,
} from "@oryn/db";

type SearchParams = Promise<{
  type?: string;
  category?: string;
  q?: string;
  sort?: string;
  price?: string;
  builder?: string;
  page?: string;
}>;

const PAGE_SIZE = 15;

export const revalidate = 30;

function parseSort(raw: string | undefined): SortMode | undefined {
  if (raw === "popular" || raw === "price-asc" || raw === "price-desc" || raw === "recent") return raw;
  return undefined;
}
function parsePrice(raw: string | undefined): PriceFilter | undefined {
  if (raw === "free" || raw === "paid") return raw;
  return undefined;
}
function parsePage(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const typeFilter =
    params.type === "skill" || params.type === "knowledge" ? params.type : undefined;
  const sort = parseSort(params.sort);
  const price = parsePrice(params.price);
  const builderAddress = params.builder?.startsWith("0x") ? params.builder : undefined;
  const page = parsePage(params.page);
  const offset = (page - 1) * PAGE_SIZE;

  const queryFilters: ListFilters = {
    type: typeFilter,
    category: params.category || undefined,
    search: params.q || undefined,
    sort,
    price,
    builderAddress,
  };

  const db = getDb();
  const [capabilities, total] = await Promise.all([
    listPublishedCapabilities(db, {
      ...queryFilters,
      limit: PAGE_SIZE,
      offset,
    }),
    countPublishedCapabilities(db, queryFilters),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIdx = total === 0 ? 0 : offset + 1;
  const endIdx = Math.min(offset + capabilities.length, total);

  function buildPageUrl(targetPage: number): string {
    const next = new URLSearchParams();
    if (params.type) next.set("type", params.type);
    if (params.category) next.set("category", params.category);
    if (params.q) next.set("q", params.q);
    if (params.sort) next.set("sort", params.sort);
    if (params.price) next.set("price", params.price);
    if (params.builder) next.set("builder", params.builder);
    if (targetPage > 1) next.set("page", String(targetPage));
    const qs = next.toString();
    return qs ? `/browse?${qs}` : "/browse";
  }

  return (
    <main className="min-h-screen flex flex-col bg-warmdark">
      <Header showDashboardLink />
      <StatusBar />
      <section className="flex-1 px-6 py-12 max-w-6xl mx-auto w-full">
        <div className="mb-10">
          <div className="mb-4">
            <EyebrowChip>Browse</EyebrowChip>
          </div>
          <h1 className="font-serif text-3xl md:text-4xl mb-3">Capabilities</h1>
          <p className="text-cream/60 max-w-xl">
            Skills and knowledge packs to extend your AI agent.
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
                Try a different category or search term, or be the first to{" "}
                <a href="/build/new" className="text-orange hover:underline">
                  publish one
                </a>
                .
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4 text-xs font-mono uppercase tracking-wider text-cream/40">
                <span>
                  {startIdx}–{endIdx} of {total} {total === 1 ? "result" : "results"}
                </span>
                {totalPages > 1 && (
                  <span>
                    page {safePage} / {totalPages}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {capabilities.map((cap) => (
                  <CapabilityCard key={cap.id} capability={cap} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-center gap-2 mt-10">
                  {safePage > 1 ? (
                    <Link
                      href={buildPageUrl(safePage - 1)}
                      className="border border-cream/20 hover:border-orange hover:text-orange text-cream/70 px-4 py-2 font-mono text-xs uppercase tracking-wider transition-colors"
                    >
                      ← prev
                    </Link>
                  ) : (
                    <span className="border border-cream/10 text-cream/30 px-4 py-2 font-mono text-xs uppercase tracking-wider cursor-not-allowed">
                      ← prev
                    </span>
                  )}

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                    const active = p === safePage;
                    return (
                      <Link
                        key={p}
                        href={buildPageUrl(p)}
                        className={`min-w-9 text-center px-3 py-2 font-mono text-xs uppercase tracking-wider transition-colors border ${
                          active
                            ? "bg-orange text-warmdark border-orange"
                            : "border-cream/15 text-cream/60 hover:border-orange hover:text-orange"
                        }`}
                      >
                        {p}
                      </Link>
                    );
                  })}

                  {safePage < totalPages ? (
                    <Link
                      href={buildPageUrl(safePage + 1)}
                      className="border border-cream/20 hover:border-orange hover:text-orange text-cream/70 px-4 py-2 font-mono text-xs uppercase tracking-wider transition-colors"
                    >
                      next →
                    </Link>
                  ) : (
                    <span className="border border-cream/10 text-cream/30 px-4 py-2 font-mono text-xs uppercase tracking-wider cursor-not-allowed">
                      next →
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}
