"use client";
/**
 * ONE WebGL canvas for the whole page. It sits fixed behind the content and
 * every <SceneView> on the page renders into its own rectangle of it via
 * drei's View portals. This keeps dozens of 3D glyphs cheap: one context,
 * only visible views are drawn.
 */
import * as React from "react";
import { Canvas } from "@react-three/fiber";
import { View } from "@react-three/drei";

export default function SceneCanvas() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return (
    <Canvas
      id="scene-canvas"
      aria-hidden="true"
      eventSource={typeof document !== "undefined" ? document.body : undefined}
      eventPrefix="client"
      flat
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance", preserveDrawingBuffer: false }}
      style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", pointerEvents: "none", zIndex: 20 }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
      }}
    >
      <View.Port />
    </Canvas>
  );
}
