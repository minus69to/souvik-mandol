"use client";
import * as React from "react";
import { useFrame } from "@react-three/fiber";

/** Ref-like object: `.current` is false while the view is far off-screen or hidden. */
export const SceneActiveContext = React.createContext({ current: true });

/**
 * Drop-in replacement for R3F's useFrame that is skipped while the scene's
 * view is far outside the viewport (see SceneView). Scenes import it as
 * `useFrame` so their code reads like plain R3F.
 */
export function useSceneFrame(callback, priority) {
  const active = React.useContext(SceneActiveContext);
  useFrame((state, delta, frame) => {
    if (active.current) callback(state, delta, frame);
  }, priority);
}
