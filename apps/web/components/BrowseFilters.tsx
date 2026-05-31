"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useEffect, useTransition } from "react";

const CATEGORIES = [
  { value: "", label: "All categories" },
  { value: "data", label: "Data" },
  { value: "action", label: "Action" },
  { value: "knowledge", label: "Knowledge" },
  { value: "utility", label: "Utility" },
];

const SORTS = [
  { value: "", label: "Sort: Recent" },
  { value: "popular", label: "Sort: Popular" },
  { value: "price-asc", label: "Sort: Price ↑" },
  { value: "price-desc", label: "Sort: Price ↓" },
];

const PRICES = [
  { value: "", label: "All" },
  { value: "free", label: "Free" },
  { value: "paid", label: "Paid" },
];

export function BrowseFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const currentType = searchParams.get("type") ?? "";
  const currentCategory = searchParams.get("category") ?? "";
  const currentSearch = searchParams.get("q") ?? "";
  const currentSort = searchParams.get("sort") ?? "";
  const currentPrice = searchParams.get("price") ?? "";
  const currentBuilder = searchParams.get("builder") ?? "";

  const [searchInput, setSearchInput] = useState(currentSearch);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchInput === currentSearch) return;
      updateParams({ q: searchInput || null, page: null });
    }, 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    // any filter change resets pagination to page 1
    if (!("page" in updates)) params.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="space-y-4">
      {/* Type tabs */}
      <div className="flex items-center gap-1 border-b border-cream/10">
        {[
          { value: "", label: "All" },
          { value: "skill", label: "Skills" },
          { value: "knowledge", label: "Knowledge" },
        ].map((tab) => {
          const active = currentType === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => updateParams({ type: tab.value || null })}
              className={`px-4 py-2 text-xs font-mono uppercase tracking-widest border-b-2 -mb-[2px] transition-colors ${
                active
                  ? "text-cream border-orange"
                  : "text-cream/50 border-transparent hover:text-cream/80"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
        {pending && (
          <span className="ml-auto text-[10px] text-cream/40 font-mono uppercase">
            loading…
          </span>
        )}
      </div>

      {/* Sort + Price + Category + Search */}
      <div className="grid grid-cols-1 sm:grid-cols-[auto_auto_auto_1fr] gap-3 items-stretch">
        <select
          value={currentSort}
          onChange={(e) => updateParams({ sort: e.target.value || null })}
          className="bg-warmdark-light border border-cream/15 px-3 py-2 text-cream text-xs font-mono uppercase tracking-wider focus:outline-none focus:border-orange"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        {/* Price segmented */}
        <div className="flex items-stretch border border-cream/15 bg-warmdark-light">
          {PRICES.map((p) => {
            const active = currentPrice === p.value;
            return (
              <button
                key={p.value}
                onClick={() => updateParams({ price: p.value || null })}
                className={`px-3 py-2 text-[11px] font-mono uppercase tracking-wider transition-colors ${
                  active
                    ? "bg-orange text-warmdark"
                    : "text-cream/60 hover:text-cream"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <select
          value={currentCategory}
          onChange={(e) => updateParams({ category: e.target.value || null })}
          className="bg-warmdark-light border border-cream/15 px-3 py-2 text-cream text-xs font-mono uppercase tracking-wider focus:outline-none focus:border-orange"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search capabilities…"
          className="bg-warmdark-light border border-cream/15 px-3 py-2 text-cream text-sm font-sans focus:outline-none focus:border-orange"
        />
      </div>

      {/* Builder chip (URL-set, with clear) */}
      {currentBuilder && (
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-cream/40 uppercase tracking-wider">filtered by builder</span>
          <span className="inline-flex items-center gap-2 px-2 py-1 border border-orange/40 bg-orange/5 text-orange">
            {currentBuilder.slice(0, 6)}…{currentBuilder.slice(-4)}
            <button
              onClick={() => updateParams({ builder: null })}
              className="text-orange/60 hover:text-orange"
              aria-label="clear builder filter"
            >
              ✕
            </button>
          </span>
        </div>
      )}
    </div>
  );
}
