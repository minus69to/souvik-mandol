"use client";
/**
 * React Three Fiber primitives that give every scene the same ink-on-paper
 * look. Import these in scene components; do not invent new colours.
 *
 *   <InkMaterial />                     – hatched flat shading (attach as a mesh material)
 *   <InkMesh geometry=...>              – mesh with InkMaterial + black Edges outline
 *   <InkLine points=[[x,y,z],...] />    – thin ink polyline
 *   <InkWire geometry=... />            – wireframe-only mesh
 *   useInk()                            – { inverted, paper, ink } from the nearest <InkContext>
 */
import * as React from "react";
import * as THREE from "three";
import { Edges, Line } from "@react-three/drei";
import { inkVertexShader, inkFragmentShader, makeInkUniforms, palette } from "./inkShader";

export const InkContext = React.createContext({ inverted: false });

export function useInk() {
  const { inverted } = React.useContext(InkContext);
  return { inverted, ...palette(inverted) };
}

export const InkMaterial = React.forwardRef(function InkMaterial(
  { hatch = 6, strength = 1, fill = 0, opacity = 1, side = THREE.FrontSide, transparent, ...rest },
  ref
) {
  const { inverted } = useInk();
  const uniforms = React.useMemo(
    () => makeInkUniforms({ inverted, hatch, strength, fill, opacity }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  React.useEffect(() => {
    uniforms.uInvert.value = inverted ? 1 : 0;
    uniforms.uHatch.value = hatch;
    uniforms.uStrength.value = strength;
    uniforms.uFill.value = fill;
    uniforms.uOpacity.value = opacity;
  }, [inverted, hatch, strength, fill, opacity, uniforms]);
  return (
    <shaderMaterial
      ref={ref}
      attach="material"
      uniforms={uniforms}
      vertexShader={inkVertexShader}
      fragmentShader={inkFragmentShader}
      side={side}
      transparent={transparent ?? opacity < 1}
      {...rest}
    />
  );
});

/** Solid ink-shaded mesh with a crisp outline. */
export const InkMesh = React.forwardRef(function InkMesh(
  { children, outline = true, threshold = 20, lineWidth = 1, hatch, strength, fill, opacity, ...meshProps },
  ref
) {
  const { ink } = useInk();
  return (
    <mesh ref={ref} {...meshProps}>
      {children}
      <InkMaterial hatch={hatch} strength={strength} fill={fill} opacity={opacity} />
      {outline && <Edges threshold={threshold} color={ink} lineWidth={lineWidth} />}
    </mesh>
  );
});

/** Wireframe-only mesh (ink lines, no fill). */
export const InkWire = React.forwardRef(function InkWire({ children, opacity = 1, ...meshProps }, ref) {
  const { ink } = useInk();
  return (
    <mesh ref={ref} {...meshProps}>
      {children}
      <meshBasicMaterial color={ink} wireframe transparent={opacity < 1} opacity={opacity} />
    </mesh>
  );
});

/** Thin polyline in ink. `points` is an array of [x,y,z]. */
export function InkLine({ points, lineWidth = 1, dashed = false, opacity = 1, ...rest }) {
  const { ink } = useInk();
  return (
    <Line
      points={points}
      color={ink}
      lineWidth={lineWidth}
      dashed={dashed}
      transparent={opacity < 1}
      opacity={opacity}
      {...rest}
    />
  );
}

/** Flat ink fill (no shading) – useful for dots, labels, lamps. */
export function InkFlat({ children, opacity = 1, paper = false, ...meshProps }) {
  const { ink, paper: paperCol } = useInk();
  return (
    <mesh {...meshProps}>
      {children}
      <meshBasicMaterial color={paper ? paperCol : ink} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  );
}
