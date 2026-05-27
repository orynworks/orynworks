"use client";

import { useState, useTransition } from "react";
import { createCapabilityAction, type ActionResult } from "@/app/build/new/actions";
import { toSlug } from "@/lib/slug";

export function CapabilityForm() {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [tokenGated, setTokenGated] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(toSlug(value));
  }

  function handleSlugChange(value: string) {
    setSlug(toSlug(value));
    setSlugTouched(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("slug", slug);
    if (!tokenGated) formData.delete("requiredToken");
    startTransition(async () => {
      const res = await createCapabilityAction(formData);
      setResult(res);
    });
  }

  const fieldError = (key: string) =>
    result && !result.ok ? result.fieldErrors?.[key] : undefined;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Name */}
      <div>
        <label className="block text-xs font-mono uppercase tracking-wider text-cream/70 mb-2">
          Name *
        </label>
        <input
          name="name"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          required
          placeholder="e.g., Aeon Research Pack"
          className="w-full bg-warmdark-light border border-cream/15 px-4 py-3 text-cream font-sans focus:outline-none focus:border-orange"
        />
        {fieldError("name") && <p className="text-xs text-orange mt-1">{fieldError("name")}</p>}
      </div>

      {/* Slug */}
      <div>
        <label className="block text-xs font-mono uppercase tracking-wider text-cream/70 mb-2">
          Slug *
        </label>
        <input
          name="slug"
          value={slug}
          onChange={(e) => handleSlugChange(e.target.value)}
          required
          placeholder="e.g., aeon-research-pack"
          className="w-full bg-warmdark-light border border-cream/15 px-4 py-3 text-cream font-mono text-sm focus:outline-none focus:border-orange"
        />
        <p className="text-xs text-cream/40 mt-1 font-mono">
          oryn.works/capability/{slug || "your-slug"}
        </p>
        {fieldError("slug") && <p className="text-xs text-orange mt-1">{fieldError("slug")}</p>}
      </div>

      {/* Type + Category (2-col grid) */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-cream/70 mb-2">
            Type *
          </label>
          <select
            name="type"
            required
            defaultValue="skill"
            className="w-full bg-warmdark-light border border-cream/15 px-4 py-3 text-cream font-sans focus:outline-none focus:border-orange"
          >
            <option value="skill">Skill (MCP server)</option>
            <option value="knowledge">Knowledge pack</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-cream/70 mb-2">
            Category *
          </label>
          <select
            name="category"
            required
            defaultValue="utility"
            className="w-full bg-warmdark-light border border-cream/15 px-4 py-3 text-cream font-sans focus:outline-none focus:border-orange"
          >
            <option value="data">Data</option>
            <option value="action">Action</option>
            <option value="knowledge">Knowledge</option>
            <option value="utility">Utility</option>
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-mono uppercase tracking-wider text-cream/70 mb-2">
          Description *
        </label>
        <textarea
          name="description"
          required
          rows={5}
          placeholder="What does this capability do? Markdown supported."
          className="w-full bg-warmdark-light border border-cream/15 px-4 py-3 text-cream font-sans focus:outline-none focus:border-orange resize-y"
        />
        {fieldError("description") && (
          <p className="text-xs text-orange mt-1">{fieldError("description")}</p>
        )}
      </div>

      {/* Host URL */}
      <div>
        <label className="block text-xs font-mono uppercase tracking-wider text-cream/70 mb-2">
          Host URL *
        </label>
        <input
          name="hostUrl"
          type="url"
          required
          placeholder="https://your-mcp-server.com/sse"
          className="w-full bg-warmdark-light border border-cream/15 px-4 py-3 text-cream font-mono text-sm focus:outline-none focus:border-orange"
        />
        <p className="text-xs text-cream/40 mt-1">
          MCP server endpoint or knowledge pack URI
        </p>
        {fieldError("hostUrl") && <p className="text-xs text-orange mt-1">{fieldError("hostUrl")}</p>}
      </div>

      {/* Price */}
      <div>
        <label className="block text-xs font-mono uppercase tracking-wider text-cream/70 mb-2">
          Price (USDC per call)
        </label>
        <input
          name="priceUsdc"
          defaultValue="0"
          placeholder="0.001"
          className="w-full bg-warmdark-light border border-cream/15 px-4 py-3 text-cream font-mono text-sm focus:outline-none focus:border-orange"
        />
        {fieldError("priceUsdc") && <p className="text-xs text-orange mt-1">{fieldError("priceUsdc")}</p>}
      </div>

      {/* Token gating */}
      <div>
        <label className="flex items-center gap-2 text-sm text-cream/80">
          <input
            type="checkbox"
            name="tokenGated"
            checked={tokenGated}
            onChange={(e) => setTokenGated(e.target.checked)}
            className="accent-orange"
          />
          Token-gated capability
        </label>
        {tokenGated && (
          <input
            name="requiredToken"
            placeholder="0x… (ERC-20 or ERC-721 contract address)"
            className="w-full mt-3 bg-warmdark-light border border-cream/15 px-4 py-3 text-cream font-mono text-sm focus:outline-none focus:border-orange"
          />
        )}
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="bg-orange text-warmdark px-7 py-3 font-mono text-xs uppercase tracking-widest hover:bg-orange-light transition-colors disabled:opacity-50"
        >
          {pending ? "Publishing…" : "Publish capability"}
        </button>
        {result && !result.ok && (
          <p className="text-xs text-orange">{result.error}</p>
        )}
      </div>
    </form>
  );
}
