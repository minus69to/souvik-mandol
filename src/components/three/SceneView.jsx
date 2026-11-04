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
 *   sceneProps  – extra props forwarded to the scene component
 */
import * as React from "react";
import { View } from "@react-three/drei";
import { InkContext } from "./Ink";
import { useMotionPrefs } from "./useMotionPrefs";
import { SCENE_COMPONENTS } from "../scenes/registry";

function Inner({ scene, trackRef, inverted, sceneProps }) {
  const Comp = SCENE_COMPONENTS[scene];
  const { reduced, mobile } = useMotionPrefs();
  if (!Comp) return null;
  return (
    <InkContext.Provider value={{ inverted: !!inverted }}>
      <React.Suspense fallback={null}>
        <Comp trackRef={trackRef} inverted={!!inverted} reduced={reduced} mobile={mobile} {...sceneProps} />
      </React.Suspense>
    </InkContext.Provider>
  );
}

export default function SceneView({ scene, inverted = false, interactive = false, fallback = null, sceneProps, className = "", style, children, ...rest }) {
  const ref = React.useRef(null);
  const { enabled } = useMotionPrefs();
  // Positioned by the caller (absolute/fixed/sticky) or relative by default.
  const positioned = /\b(absolute|fixed|sticky|relative)\b/.test(className);
  return (
    <div
      ref={ref}
      className={`${positioned ? "" : "relative "}${className}`}
      style={{ pointerEvents: interactive ? "auto" : "none", touchAction: interactive ? "pan-y" : "auto", ...style }}
      data-scene={scene}
      {...rest}
    >
      {enabled ? (
        <View track={ref} style={{ position: "absolute", inset: 0 }}>
          <Inner scene={scene} trackRef={ref} inverted={inverted} sceneProps={sceneProps} />
        </View>
      ) : (
        fallback
      )}
      {children}
    </div>
  );
}
