"use client";

import { useState } from "react";

type Props = {
  slug: string;
  type: "skill" | "knowledge";
};

export function InstallSnippet({ slug, type }: Props) {
  const [copied, setCopied] = useState(false);
  const command =
    type === "skill"
      ? `npx oryn install ${slug}`
      : `npx oryn query ${slug} "your prompt"`;

  async function handleCopy() {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="bg-warmdark-deep border border-cream/10 px-4 py-3 flex items-center justify-between gap-3 font-mono text-sm">
      <code className="text-cream/90 truncate">{command}</code>
      <button
        onClick={handleCopy}
        className="shrink-0 text-xs font-mono uppercase tracking-wider text-cream/60 hover:text-orange transition-colors"
      >
        {copied ? "Copied ✓" : "Copy"}
      </button>
    </div>
  );
}
