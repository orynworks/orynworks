"use client";

import { useState } from "react";

type Props = {
  slug: string;
  type: "skill" | "knowledge";
};

export function InstallSnippet({ slug }: Props) {
  const [copied, setCopied] = useState(false);
  const command = `npx oryn install ${slug}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="border border-cream/10 bg-warmdark-deep overflow-hidden shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]">
      <div className="flex items-center gap-2 px-3 py-2 bg-warmdark-light border-b border-cream/10">
        <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
        <span className="ml-3 text-[10px] font-mono text-cream/40 tracking-[0.2em] uppercase">
          install · {slug}
        </span>
        <button
          onClick={handleCopy}
          className="ml-auto text-[10px] font-mono uppercase tracking-[0.2em] text-cream/50 hover:text-orange transition-colors"
        >
          {copied ? "copied ✓" : "copy"}
        </button>
      </div>
      <div className="px-5 py-4 font-mono text-[13px] text-cream/85 flex items-center gap-3">
        <span className="text-orange">$</span>
        <code className="truncate">{command}</code>
      </div>
    </div>
  );
}
