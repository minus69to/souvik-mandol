"use client";
/**
 * Everything that pulls three.js into the bundle lives behind this file so the
 * page text hydrates first and the 3D code streams in afterwards (SceneView
 * loads it with next/dynamic).
 */
import * as React from "react";
import { View } from "@react-three/drei";
import { InkContext } from "./Ink";
import { SceneActiveContext } from "./useSceneFrame";
import { useMotionPrefs } from "./useMotionPrefs";
import { SCENE_COMPONENTS } from "../scenes/registry";

const Inner = React.memo(function Inner({ scene, trackRef, inverted, sceneProps }) {
  const Comp = SCENE_COMPONENTS[scene];
  const { reduced, mobile } = useMotionPrefs();
  if (!Comp) return null;
  return (
    <InkContext.Provider value={inverted ? INVERTED : NORMAL}>
      <React.Suspense fallback={null}>
        <Comp trackRef={trackRef} inverted={!!inverted} reduced={reduced} mobile={mobile} {...sceneProps} />
      </React.Suspense>
    </InkContext.Provider>
  );
});
const NORMAL = { inverted: false };
const INVERTED = { inverted: true };

export default function ScenePortal({ scene, trackRef, inverted, sceneProps, activeRef, visible }) {
  return (
    <View track={trackRef} visible={visible} style={{ position: "absolute", inset: 0 }}>
      <SceneActiveContext.Provider value={activeRef}>
        <Inner scene={scene} trackRef={trackRef} inverted={inverted} sceneProps={sceneProps} />
      </SceneActiveContext.Provider>
    </View>
  );
}
