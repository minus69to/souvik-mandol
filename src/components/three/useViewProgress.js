"use client";
import * as React from "react";
import { useFrame } from "@react-three/fiber";
import { SceneActiveContext } from "./useSceneFrame";

const mouse = { x: -1, y: -1, listeners: 0 };
function onMove(e) {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
}

/**
 * Per-frame scroll progress of the DOM element a scene is drawn into.
 * Returns a ref whose .current holds:
 *   t        – 0 when the element's centre is at the bottom of the viewport,
 *              1 when it is at the top (0.5 = centred). Clamped to [-0.5, 1.5].
 *   visible  – fraction of the element currently inside the viewport (0..1)
 *   pointer  – {x,y} in -1..1 relative to the element (last known mouse position)
 * Read it inside useFrame; never put it in React state.
 * Nothing is measured while the scene is inactive (far off-screen).
 */
export function useViewProgress(trackRef) {
  const data = React.useRef({ t: 0.5, visible: 1, pointer: { x: 0, y: 0 } });
  const active = React.useContext(SceneActiveContext);
  React.useEffect(() => {
    if (mouse.listeners++ === 0) window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      if (--mouse.listeners === 0) window.removeEventListener("pointermove", onMove);
    };
  }, []);
  useFrame(() => {
    const el = trackRef?.current;
    if (!el || !active.current) return;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const vh = window.innerHeight || 1;
    const centre = r.top + r.height / 2;
    const t = 1 - centre / vh;
    const d = data.current;
    d.t = Math.max(-0.5, Math.min(1.5, t));
    const top = Math.max(r.top, 0);
    const bottom = Math.min(r.bottom, vh);
    d.visible = Math.max(0, Math.min(1, (bottom - top) / Math.max(1, Math.min(r.height, vh))));
    if (mouse.x >= 0) {
      d.pointer.x = ((mouse.x - r.left) / r.width) * 2 - 1;
      d.pointer.y = -(((mouse.y - r.top) / r.height) * 2 - 1);
    }
  });
  return data;
}
