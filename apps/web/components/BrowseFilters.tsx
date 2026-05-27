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

export function BrowseFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const currentType = searchParams.get("type") ?? "";
  const currentCategory = searchParams.get("category") ?? "";
  const currentSearch = searchParams.get("q") ?? "";

  const [searchInput, setSearchInput] = useState(currentSearch);

  // Debounce search input
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchInput === currentSearch) return;
      updateParams({ q: searchInput || null });
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
            Loading…
          </span>
        )}
      </div>

      {/* Category + search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={currentCategory}
          onChange={(e) => updateParams({ category: e.target.value || null })}
          className="bg-warmdark-light border border-cream/15 px-4 py-2 text-cream text-sm font-mono focus:outline-none focus:border-orange"
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
          className="flex-1 bg-warmdark-light border border-cream/15 px-4 py-2 text-cream text-sm font-sans focus:outline-none focus:border-orange"
        />
      </div>
    </div>
  );
}
