export function TerminalDemo() {
  return (
    <div className="bg-warmdark-deep border border-cream/10 rounded-lg overflow-hidden shadow-2xl">
      {/* Window chrome */}
      <div className="flex items-center gap-2 px-4 py-3 bg-warmdark-light border-b border-cream/10">
        <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
        <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
        <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
        <span className="ml-3 text-xs font-mono text-cream/40 tracking-wider">
          orynworks · agent shell
        </span>
      </div>

      {/* Terminal content */}
      <div className="px-4 sm:px-6 py-6 font-mono text-[11px] sm:text-sm leading-relaxed overflow-x-auto">
        {/* Step 1: install */}
        <div>
          <span className="text-orange">$</span>{" "}
          <span className="text-cream">npx orynworks install </span>
          <span className="text-cream/90">alpha-feed</span>
        </div>
        <div className="text-cream/60 mt-1">
          <span className="text-orange">→</span> Resolving capability…
        </div>
        <div className="text-cream/60">
          <span className="text-orange">→</span> Verified on-chain at{" "}
          <span className="text-cream/80">0xB9a2…BAB5d</span>
        </div>
        <div className="text-cream/80 mt-1">
          ✓ Installed <span className="text-cream">alpha-feed@2.0.0</span>
        </div>

        <div className="h-4" />

        {/* Step 2: query */}
        <div>
          <span className="text-orange">$</span>{" "}
          <span className="text-cream">orynworks query alpha-feed \</span>
        </div>
        <div className="text-cream/90 pl-4">
          --prompt <span className="text-cream/70">"trending on base, last 24h"</span>
        </div>
        <div className="text-cream/60 mt-1">
          <span className="text-orange">→</span> Streaming response…
        </div>
        <div className="text-cream/80 pl-4 mt-1">
          · Found 12 trending tokens
        </div>
        <div className="text-cream/80 pl-4">
          · Top: <span className="text-orange">$BASE +45%</span>,{" "}
          <span className="text-orange">$AERO +23%</span>
        </div>
        <div className="text-cream/80 pl-4">
          · Confidence: <span className="text-cream">0.87</span>
        </div>
        <div className="text-cream/80 mt-1">
          ✓ <span className="text-orange">0.020 USDC</span> charged · receipt{" "}
          <span className="text-cream/60">#4f9a</span>
        </div>

        <div className="h-3" />
        <div className="flex items-center text-cream/50">
          <span className="text-orange">$</span>
          <span className="ml-2 w-2 h-4 bg-orange/80 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
