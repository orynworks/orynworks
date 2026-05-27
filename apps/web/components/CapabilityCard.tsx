import Link from "next/link";
import type { Capability } from "@oryn/db";

export function CapabilityCard({ capability }: { capability: Capability }) {
  const isSkill = capability.type === "skill";
  return (
    <Link
      href={`/capability/${capability.slug}`}
      className="block border border-cream/10 p-5 hover:border-orange transition-colors group"
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className={`text-[10px] font-mono uppercase tracking-widest ${
            isSkill ? "text-orange" : "text-cream/60"
          }`}
        >
          {isSkill ? "Skill" : "Knowledge"}
        </span>
        <span className="text-[10px] font-mono text-cream/40 uppercase tracking-wider">
          {capability.category}
        </span>
      </div>
      <h3 className="font-serif text-xl mb-2 group-hover:text-orange transition-colors">
        {capability.name}
      </h3>
      <p className="text-sm text-cream/60 line-clamp-2 mb-4 min-h-[2.5rem]">
        {capability.description}
      </p>
      <div className="flex items-center justify-between text-xs font-mono text-cream/50">
        <span>
          {Number(capability.priceUsdc) === 0
            ? "FREE"
            : `$${Number(capability.priceUsdc).toFixed(4)} / call`}
        </span>
        <span>v{capability.version}</span>
      </div>
    </Link>
  );
}
