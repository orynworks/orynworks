"use client";

import { usePathname } from "next/navigation";

// Terminal-style status strip placed under the main Header on every page.
// Mirrors the chrome of /docs to give the whole site a single brand surface.
export function StatusBar() {
  const pathname = usePathname();
  const path = pathname === "/" ? "/" : pathname;

  return (
    <div className="border-b border-cream/10 bg-warmdark-light">
      <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.25em] text-cream/40">
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-1.5 rounded-full bg-orange animate-pulse" />
          <span>orynworks</span>
          <span className="text-cream/20">·</span>
          <span className="text-cream/70">{path}</span>
        </div>
        <div className="hidden md:flex items-center gap-4">
          <span>main</span>
          <span className="text-cream/20">·</span>
          <span>base mainnet</span>
          <span className="text-cream/20">·</span>
          <span className="text-cream/60">live</span>
        </div>
      </div>
    </div>
  );
}
