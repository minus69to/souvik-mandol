"use client";
/**
 * Perspective tilt toward the cursor plus a holographic "petrol sheen" that
 * follows it. Wrap any card: <TiltCard as="article" className="...">…</TiltCard>
 * props: max (deg, default 7), sheen (bool), lift (px translateZ)
 */
import * as React from "react";
import { useMotionPrefs } from "../three/useMotionPrefs";

export default function TiltCard({ as: Tag = "div", className = "", children, max = 7, sheen = true, lift = 10, style, ...rest }) {
  const ref = React.useRef(null);
  const sheenRef = React.useRef(null);
  const { reduced } = useMotionPrefs();
  const frame = React.useRef(0);
  const target = React.useRef({ rx: 0, ry: 0, mx: 50, my: 50, on: 0 });

  const apply = React.useCallback(() => {
    frame.current = 0;
    const el = ref.current;
    if (!el) return;
    const t = target.current;
    el.style.transform = t.on
      ? `perspective(1000px) rotateX(${t.rx.toFixed(2)}deg) rotateY(${t.ry.toFixed(2)}deg) translateZ(${lift}px)`
      : "";
    if (sheenRef.current) {
      sheenRef.current.style.setProperty("--mx", `${t.mx.toFixed(1)}%`);
      sheenRef.current.style.setProperty("--my", `${t.my.toFixed(1)}%`);
      sheenRef.current.classList.toggle("is-on", !!t.on); // CSS owns the opacity per variant
    }
  }, [lift]);

  const onMove = (e) => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    // The centre is invariant under the card's own rotation; use layout size for the extent.
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const px = Math.min(1, Math.max(0, (e.clientX - cx) / (el.offsetWidth || r.width) + 0.5));
    const py = Math.min(1, Math.max(0, (e.clientY - cy) / (el.offsetHeight || r.height) + 0.5));
    const t = target.current;
    t.ry = (px - 0.5) * 2 * max;
    t.rx = -(py - 0.5) * 2 * max;
    t.mx = px * 100; t.my = py * 100; t.on = 1;
    if (!frame.current) frame.current = requestAnimationFrame(apply);
  };
  const onLeave = () => {
    const t = target.current;
    t.on = 0; t.rx = 0; t.ry = 0;
    if (!frame.current) frame.current = requestAnimationFrame(apply);
  };

  return (
    <Tag
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={`tilt ${className}`}
      style={{ transformStyle: "preserve-3d", ...style }}
      {...rest}
    >
      {children}
      {sheen && <span ref={sheenRef} aria-hidden="true" className="sheen" />}
    </Tag>
  );
}
