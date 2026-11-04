"use client";
// STUB – replaced by the real "bias" scene.
import * as React from "react";
import { useFrame } from "@react-three/fiber";
import { InkMesh } from "../three/Ink";

export default function BiasScene({ reduced }) {
  const ref = React.useRef();
  useFrame((_, dt) => {
    if (ref.current && !reduced) ref.current.rotation.y += dt * 0.6;
  });
  return (
    <group>
      <InkMesh ref={ref} rotation={[0.5, 0.4, 0]}>
        <boxGeometry args={[1.6, 1.6, 1.6]} />
      </InkMesh>
    </group>
  );
}
