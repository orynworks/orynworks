"use client";

import { useState } from "react";

type Props = {
  slug: string;
  type: "skill" | "knowledge";
  mcpPath?: string;
  exampleBody?: string;
};

type TerminalProps = {
  label: string;
  command: string;
  multiline?: boolean;
};

function Terminal({ label, command, multiline = false }: TerminalProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="border border-cream/10 bg-warmdark-deep overflow-hidden shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]">
      <div className="flex items-center gap-2 px-2 sm:px-3 py-2 bg-warmdark-light border-b border-cream/10">
        <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
        <span className="ml-3 text-[10px] font-mono text-cream/40 tracking-[0.2em] uppercase truncate">
          {label}
        </span>
        <button
          onClick={handleCopy}
          className="ml-auto shrink-0 text-[10px] font-mono uppercase tracking-[0.2em] text-cream/50 hover:text-orange transition-colors"
        >
          {copied ? "copied ✓" : "copy"}
        </button>
      </div>
      <div className="px-5 py-4 font-mono text-[13px] text-cream/85 flex items-start gap-3 overflow-x-auto">
        <span className="text-orange shrink-0">$</span>
        <code
          className={
            multiline
              ? "whitespace-pre"
              : "whitespace-nowrap"
          }
        >
          {command}
        </code>
      </div>
    </div>
  );
}

export function InstallSnippet({ slug, type, mcpPath, exampleBody }: Props) {
  const installCommand = `npx orynworks install ${slug}`;

  // Only render the curl block when we have an mcpPath. The capability detail
  // page passes this in from CALL_EXAMPLES; if a slug isn't in the map we
  // gracefully degrade to just the install command.
  const showCurl = Boolean(mcpPath && exampleBody);
  const verbSegment = type === "skill" ? "skills" : "knowledge";
  const actionSegment = type === "skill" ? "call" : "query";
  const curlCommand = showCurl
    ? `curl -X POST https://api.oryn.works/v1/${verbSegment}/${mcpPath}/${actionSegment} \\
    -H "Content-Type: application/json" \\
    -d '${exampleBody}'`
    : "";

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-cream/45">
          1 · install for your MCP client
        </p>
        <Terminal label={`install · ${slug}`} command={installCommand} />
      </div>

      {showCurl && (
        <div className="space-y-2">
          <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-cream/45">
            2 · or call it directly with curl
          </p>
          <Terminal
            label={`${actionSegment} · ${mcpPath}`}
            command={curlCommand}
            multiline
          />
        </div>
      )}
    </div>
  );
}
