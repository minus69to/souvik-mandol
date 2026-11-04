import * as React from "react";

export function SectionHeader({ index, tag, headline, inverted = false, children }) {
  const muted = inverted ? "text-gray-500" : "text-gray-400";
  return (
    <div className="mb-12 md:mb-16">
      <div className={`flex items-center gap-4 text-xs font-mono font-bold uppercase tracking-[0.3em] ${muted} reveal`}>
        <span className={`inline-block h-[2px] w-10 ${inverted ? "bg-white" : "bg-black"}`} />
        <span>{String(index).padStart(2, "0")} · {tag}</span>
      </div>
      {headline && (
        <h2 className="mt-5 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tighter leading-[0.95] reveal delay-100 max-w-4xl">
          {headline}
        </h2>
      )}
      {children}
    </div>
  );
}

export function Tag({ children, inverted = false }) {
  return (
    <span className={`text-[11px] font-mono uppercase tracking-wider border px-2 py-1 ${inverted ? "border-white/60" : "border-black"}`}>
      {children}
    </span>
  );
}
