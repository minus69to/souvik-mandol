"use client";
/**
 * Drop-in 3D viewport. Renders a <div> (styled by you) and draws the given
 * scene into exactly that rectangle of the shared canvas.
 *
 *   <SceneView scene="cache" className="h-48" />
 *   <SceneView scene="intersection" inverted interactive />
 *
 * props:
 *   scene       – key from scenes/registry.js
 *   inverted    – black paper / white ink
 *   interactive – let pointer events reach the 3D scene (default false)
 *   fallback    – node shown when 3D is disabled (default: nothing)
 *   sceneProps  – extra props forwarded to the scene component (keep the object stable)
 *
 * Scenes far outside the viewport (or display:none) are neither drawn nor
 * simulated: an IntersectionObserver flips `visible` and the SceneActiveContext
 * flag that useSceneFrame checks.
 */
import * as React from "react";
import dynamic from "next/dynamic";
import { useMotionPrefs } from "./useMotionPrefs";

const ScenePortal = dynamic(() => import("./ScenePortal"), { ssr: false });

export default function SceneView({ scene, inverted = false, interactive = false, fallback = null, sceneProps, className = "", style, children, ...rest }) {
  const ref = React.useRef(null);
  const activeRef = React.useRef(true);
  const [near, setNear] = React.useState(true);
  const { enabled } = useMotionPrefs();

  React.useEffect(() => {
    const el = ref.current;
    if (!el || !enabled || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => {
        activeRef.current = entry.isIntersecting;
        setNear(entry.isIntersecting);
      },
      { rootMargin: "60% 0px 60% 0px", threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [enabled]);

  // Positioned by the caller (absolute/fixed/sticky) or relative by default.
  const positioned = /\b(absolute|fixed|sticky|relative)\b/.test(className);
  return (
    <div
      ref={ref}
      className={`${positioned ? "" : "relative "}${className}`}
      style={{ pointerEvents: interactive ? "auto" : "none", touchAction: interactive ? "pan-y" : "auto", ...style }}
      data-scene={scene}
      aria-hidden="true"
      {...rest}
    >
      {enabled ? (
        <ScenePortal scene={scene} trackRef={ref} inverted={inverted} sceneProps={sceneProps} activeRef={activeRef} visible={near} />
      ) : (
        fallback
      )}
      {children}
    </div>
  );
}
