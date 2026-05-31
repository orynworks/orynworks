// Orange chip eyebrow — replaces plain uppercase tracking-[0.3em] eyebrows
// across the site for a more "built object" feel that matches /docs.

export function EyebrowChip({
  children,
  size = "md",
}: {
  children: React.ReactNode;
  size?: "sm" | "md";
}) {
  const padding = size === "sm" ? "px-2 py-0.5" : "px-2 py-1";
  const text = size === "sm" ? "text-[9px]" : "text-[10px]";
  return (
    <span
      className={`inline-flex items-center gap-2 ${padding} ${text} font-mono tracking-[0.3em] text-orange uppercase border border-orange/30 bg-orange/5`}
    >
      <span className="w-1 h-1 rounded-full bg-orange" />
      {children}
    </span>
  );
}
