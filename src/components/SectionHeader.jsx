import * as React from "react";

export function SectionHeader({ index, tag, headline, inverted = false, srHeadline, children }) {
  const muted = inverted ? "text-gray-400" : "text-gray-600";
  return (
    <div className={`mb-12 md:mb-16 ${inverted ? "inverted" : ""}`}>
      <div className={`flex items-center gap-4 text-xs font-mono font-bold uppercase tracking-[0.3em] ${muted} reveal`}>
        <span className={`inline-block h-[2px] w-10 ${inverted ? "bg-white" : "bg-black"}`} />
        <span>{String(index).padStart(2, "0")} · {tag}</span>
      </div>
      {!headline && srHeadline && <h2 className="sr-only">{srHeadline}</h2>}
      {headline && (
        <h2 className="sheen-text mt-5 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tighter leading-[0.95] reveal delay-100 max-w-4xl w-fit max-w-full">
          {headline}
        </h2>
      )}
      {children}
    </div>
  );
}

export function Tag({ children, inverted = false }) {
  return (
    <span className={`chip text-[11px] font-mono uppercase tracking-wider border px-2 py-1 ${inverted ? "border-white/60" : "border-black"}`}>
      {children}
    </span>
  );
}
