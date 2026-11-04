import * as React from "react";

/** Renders a string with [label](url) links as React nodes. */
export function RichText({ text, linkClass = "underline decoration-2 underline-offset-4 hover:opacity-70" }) {
  const parts = String(text).split(/(\[[^\]]+\]\([^)]+\))/g);
  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (m) {
          return (
            <a key={i} href={m[2]} target="_blank" rel="noreferrer" className={linkClass}>
              {m[1]}
            </a>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}

/** Renders `text` with every key of `links` turned into an anchor. */
export function LinkedText({ text, links = {}, linkClass = "underline decoration-2 underline-offset-4 hover:opacity-70 font-semibold" }) {
  let parts = [text];
  Object.entries(links).forEach(([label, url]) => {
    parts = parts.flatMap((part) => {
      if (typeof part !== "string") return [part];
      const re = new RegExp(`(${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "g");
      return part.split(re).map((chunk, i) =>
        chunk === label ? (
          <a key={`${label}-${i}`} href={url} target="_blank" rel="noreferrer" className={linkClass}>
            {chunk}
          </a>
        ) : (
          chunk
        )
      );
    });
  });
  return <>{parts}</>;
}
