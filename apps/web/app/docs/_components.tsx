import type { ReactNode } from "react";

export function Code({ children }: { children: ReactNode }) {
  return (
    <code className="bg-warmdark-light border border-cream/10 px-1.5 py-0.5 font-mono text-[0.82em] text-orange/90">
      {children}
    </code>
  );
}

export function Term({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="my-5 border border-cream/10 bg-warmdark-deep overflow-hidden shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]">
      <div className="flex items-center gap-2 px-3 py-2 bg-warmdark-light border-b border-cream/10">
        <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
        <span className="ml-3 text-[10px] font-mono text-cream/40 tracking-[0.2em] uppercase">
          {title ?? "orynworks · shell"}
        </span>
      </div>
      <pre className="px-5 py-4 overflow-x-auto font-mono text-[12.5px] leading-relaxed text-cream/85">
        <code>{children}</code>
      </pre>
    </div>
  );
}

export function SectionChip({ num }: { num: string }) {
  return (
    <span className="inline-flex items-center justify-center w-9 h-9 border border-orange/40 bg-orange/5 text-orange font-mono text-xs shrink-0">
      {num}
    </span>
  );
}

export function MiniHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="font-serif text-xl text-cream mt-8 mb-2 flex items-baseline gap-3">
      <span className="text-orange font-mono text-xs tracking-widest">{">"}</span>
      {children}
    </h3>
  );
}

export function Section({
  id,
  num,
  title,
  intro,
  children,
}: {
  id: string;
  num: string;
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="group scroll-mt-24 mb-6 border border-cream/10 hover:border-orange/25 transition-colors duration-300 bg-warmdark/40"
    >
      <div className="px-7 md:px-12 py-10 md:py-14">
        <div className="flex items-start gap-5 mb-6">
          <SectionChip num={num} />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-mono tracking-[0.3em] text-cream/40 uppercase mb-1">
              Section {num}
            </p>
            <h2 className="font-serif text-3xl md:text-4xl tracking-tight">
              {title}
            </h2>
            {intro && (
              <p className="mt-3 text-cream/65 text-sm md:text-base leading-relaxed max-w-2xl">
                {intro}
              </p>
            )}
          </div>
          <a
            href={`#${id}`}
            className="hidden md:inline-block text-cream/30 hover:text-orange transition-colors font-mono text-xs"
            aria-label={`anchor to ${title}`}
          >
            #
          </a>
        </div>
        <div className="ml-0 md:ml-14 space-y-4 text-cream/75 text-[14.5px] leading-[1.75]">
          {children}
        </div>
      </div>
    </section>
  );
}
