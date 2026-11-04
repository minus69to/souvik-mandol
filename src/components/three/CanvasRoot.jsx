"use client";
import dynamic from "next/dynamic";
import { useMotionPrefs } from "./useMotionPrefs";

const SceneCanvas = dynamic(() => import("./SceneCanvas"), { ssr: false });

/** Mounts the single shared WebGL canvas (skipped when 3D is disabled). */
export default function CanvasRoot() {
  const { enabled } = useMotionPrefs();
  if (!enabled) return null;
  return <SceneCanvas />;
}
