"use client";
import * as React from "react";
import { useFrame } from "@react-three/fiber";

/**
 * Per-frame scroll progress of the DOM element a scene is drawn into.
 * Returns a ref whose .current holds:
 *   t        – 0 when the element's centre is at the bottom of the viewport,
 *              1 when it is at the top (0.5 = centred). Clamped to [-0.5, 1.5].
 *   visible  – fraction of the element currently inside the viewport (0..1)
 *   pointer  – {x,y} in -1..1 relative to the element (last known mouse position)
 * Read it inside useFrame; never put it in React state.
 */
export function useViewProgress(trackRef) {
  const data = React.useRef({ t: 0.5, visible: 1, pointer: { x: 0, y: 0 } });
  React.useEffect(() => {
    const el = trackRef?.current;
    if (!el) return;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      data.current.pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      data.current.pointer.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [trackRef]);
  useFrame(() => {
    const el = trackRef?.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    const centre = r.top + r.height / 2;
    const t = 1 - centre / vh;
    data.current.t = Math.max(-0.5, Math.min(1.5, t));
    const top = Math.max(r.top, 0);
    const bottom = Math.min(r.bottom, vh);
    data.current.visible = Math.max(0, Math.min(1, (bottom - top) / Math.max(1, Math.min(r.height, vh))));
  });
  return data;
}
