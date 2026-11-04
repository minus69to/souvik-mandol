"use client";
/** Pulls its child a little toward the cursor while it is nearby. */
import * as React from "react";
import { useMotionPrefs } from "../three/useMotionPrefs";

export default function Magnetic({ children, strength = 0.35, radius = 90, className = "" }) {
  const ref = React.useRef(null);
  const { reduced } = useMotionPrefs();
  React.useEffect(() => {
    const el = ref.current;
    if (!el || reduced || !window.matchMedia?.("(pointer: fine)").matches) return;
    let raf = 0;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const dx = e.clientX - cx, dy = e.clientY - cy;
      const d = Math.hypot(dx, dy);
      const reach = radius + Math.max(r.width, r.height) / 2;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (d < reach) {
          const f = (1 - d / reach) * strength;
          el.style.transform = `translate(${(dx * f).toFixed(1)}px, ${(dy * f).toFixed(1)}px)`;
        } else el.style.transform = "";
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => { window.removeEventListener("pointermove", onMove); cancelAnimationFrame(raf); };
  }, [reduced, strength, radius]);
  return <div ref={ref} className={`inline-block transition-transform duration-200 ease-out ${className}`}>{children}</div>;
}
