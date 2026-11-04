"use client";
/** Scroll progress line under the header + ink wipe on first load. */
import * as React from "react";

export function ScrollProgress() {
  const ref = React.useRef(null);
  React.useEffect(() => {
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const p = max > 0 ? window.scrollY / max : 0;
        if (ref.current) ref.current.style.transform = `scaleX(${p})`;
      });
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); cancelAnimationFrame(raf); };
  }, []);
  return <div ref={ref} aria-hidden="true" className="fixed top-16 left-0 h-[3px] w-full origin-left bg-black z-50 scale-x-0 mix-blend-difference" style={{ background: "white" }} />;
}

export function IntroWipe() {
  // Rendered in the static HTML so it covers the very first paint; an inline
  // script in <head> adds html.no-intro (repeat visit / reduced motion) which hides it.
  const [show, setShow] = React.useState(true);
  React.useEffect(() => {
    const t = setTimeout(() => setShow(false), 1600);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <div aria-hidden="true" className="intro-wipe fixed inset-0 z-[55] bg-black text-white flex items-center justify-center pointer-events-none">
      <div className="intro-name font-mono text-xs uppercase tracking-[0.5em]">Souvik Mandol</div>
    </div>
  );
}

export function LocalTime({ timeZone = "Asia/Dhaka", label = "Dhaka" }) {
  const [t, setT] = React.useState("");
  React.useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone });
    const tick = () => setT(fmt.format(new Date()));
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, [timeZone]);
  return <span suppressHydrationWarning>{label} · {t || "--:--"} local</span>;
}
