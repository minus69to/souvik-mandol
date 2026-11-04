"use client";
/**
 * "beacon" – the contact section: a signal mast broadcasting into the dark.
 * Always shown inverted (white ink on black paper).
 *
 *   mast      : tapering triangular lattice truss (legs, rungs, zig-zag
 *               bracing) on a small surveyed ground circle, with a short
 *               antenna rod and a filled lamp at the tip
 *   broadcast : rings born at the lamp expand outward, sink a little and
 *               fade – a radio wave rolling over the landscape
 *   plane     : a paper plane (two thin folded triangles) on a slow dashed
 *               orbit around the mast, leaving a short dashed trail
 *   envelope  : an envelope glyph (thin box + V flap) hovering by the top,
 *               tethered to the mast by a dashed line
 *
 * Pointer gives parallax; scroll drifts the camera; `reduced` freezes the
 * rings at fixed radii.
 */
import * as React from "react";
import * as THREE from "three";
import { useSceneFrame as useFrame } from "../three/useSceneFrame";
import { PerspectiveCamera } from "@react-three/drei";
import { InkMesh, InkLine, InkFlat, useInk } from "../three/Ink";
import { useViewProgress } from "../three/useViewProgress";

/* ------------------------------------------------------------------ layout */
const H = 4.1; // truss height
const R0 = 0.46; // base radius
const R1 = 0.1; // top radius
const LEVELS = 11;
const ROD = 0.5; // antenna rod above the truss
const LAMP_Y = H + ROD;
const GROUND_R = 1.15;
const ORBIT = { cx: 0, cy: 2.45, cz: 0, rx: 1.75, rz: 1.35, tilt: 0.22 };
const ENVELOPE = new THREE.Vector3(1.05, H - 0.25, 0.35);
const RINGS = 4;
const RING_PERIOD = 4.2;
const RING_MAX = 2.25;
const TRAIL = 14;
const CAM_FOV = 30;
const CAM_DIR = new THREE.Vector3(0, 0.3, 1).normalize();
const FIT_HALF_W = 2.2;
const FIT_HALF_H = 2.5;
const LOOK = new THREE.Vector3(0, 2.25, 0);

function legAt(i, y) {
  const a = Math.PI / 2 + (i * Math.PI * 2) / 3;
  const r = R0 + (R1 - R0) * (y / H);
  return [Math.cos(a) * r, y, Math.sin(a) * r];
}

function buildTruss() {
  const pts = [];
  // legs
  for (let i = 0; i < 3; i++) pts.push(legAt(i, 0), legAt(i, H));
  // rungs + zig-zag bracing on each face
  for (let k = 0; k < LEVELS; k++) {
    const y0 = (k / LEVELS) * H;
    const y1 = ((k + 1) / LEVELS) * H;
    for (let i = 0; i < 3; i++) {
      const j = (i + 1) % 3;
      pts.push(legAt(i, y0), legAt(j, y0));
      if (k % 2 === 0) pts.push(legAt(i, y0), legAt(j, y1));
      else pts.push(legAt(j, y0), legAt(i, y1));
    }
  }
  for (let i = 0; i < 3; i++) {
    const j = (i + 1) % 3;
    pts.push(legAt(i, H), legAt(j, H));
  }
  // antenna rod and a small cross-bar
  pts.push([0, H, 0], [0, LAMP_Y, 0], [-0.14, H + 0.22, 0], [0.14, H + 0.22, 0]);
  return pts;
}

function orbitPoint(u, out) {
  const a = u * Math.PI * 2;
  const x = Math.cos(a) * ORBIT.rx;
  const z = Math.sin(a) * ORBIT.rz;
  // tilt the ellipse about x, plus a gentle second-order wobble
  const y = ORBIT.cy + Math.sin(a) * ORBIT.rz * Math.tan(ORBIT.tilt) + 0.12 * Math.sin(2 * a + 0.6);
  return out.set(ORBIT.cx + x, y, ORBIT.cz + z);
}

function circlePts(r, n, y = 0) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([Math.cos(a) * r, y, Math.sin(a) * r]);
  }
  return pts;
}

function triGeometry(a, b, c) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([...a, ...b, ...c], 3));
  g.computeVertexNormals();
  return g;
}

/* ---------------------------------------------------------------- pieces */

function PaperPlane() {
  // nose points down +z; two folded wing triangles + a keel line
  const left = React.useMemo(() => triGeometry([0, 0, 0.34], [-0.21, 0.06, -0.22], [0, 0, -0.2]), []);
  const right = React.useMemo(() => triGeometry([0, 0, 0.34], [0, 0, -0.2], [0.21, 0.06, -0.22]), []);
  return (
    <group>
      <InkMesh geometry={left} hatch={5} strength={0.35} fill={0.02} threshold={1} lineWidth={1.1} />
      <InkMesh geometry={right} hatch={5} strength={0.35} fill={0.02} threshold={1} lineWidth={1.1} />
      <InkLine points={[[0, 0, 0.34], [0, -0.13, -0.18], [0, 0, -0.2]]} lineWidth={1.1} />
    </group>
  );
}

function Envelope() {
  return (
    <group>
      <InkMesh hatch={5} strength={0.5} fill={0.03}>
        <boxGeometry args={[0.52, 0.34, 0.05]} />
      </InkMesh>
      {/* V flap on the front face */}
      <InkLine points={[[-0.26, 0.17, 0.027], [0, -0.03, 0.027], [0.26, 0.17, 0.027]]} lineWidth={1} />
      {/* lower folds */}
      <InkLine points={[[-0.26, -0.17, 0.027], [-0.09, -0.07, 0.027]]} lineWidth={0.8} opacity={0.7} />
      <InkLine points={[[0.26, -0.17, 0.027], [0.09, -0.07, 0.027]]} lineWidth={0.8} opacity={0.7} />
    </group>
  );
}

/* ----------------------------------------------------------------- scene */

export default function BeaconScene({ trackRef, reduced }) {
  const view = useViewProgress(trackRef);
  const { ink, paper } = useInk();

  const trussPts = React.useMemo(buildTruss, []);
  const orbitPts = React.useMemo(() => {
    const v = new THREE.Vector3();
    const pts = [];
    for (let i = 0; i <= 96; i++) pts.push(orbitPoint(i / 96, v).toArray());
    return pts;
  }, []);
  const groundPts = React.useMemo(() => {
    const pts = [];
    // radial ticks on the ground circle
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const len = i % 6 === 0 ? 0.12 : 0.05;
      pts.push([Math.cos(a) * GROUND_R, 0, Math.sin(a) * GROUND_R], [Math.cos(a) * (GROUND_R - len), 0, Math.sin(a) * (GROUND_R - len)]);
    }
    // centre cross
    pts.push([-0.12, 0, 0], [0.12, 0, 0], [0, 0, -0.12], [0, 0, 0.12]);
    return pts;
  }, []);
  const tetherPts = React.useMemo(() => [[0.07, H - 0.05, 0.03], [ENVELOPE.x - 0.26, ENVELOPE.y - 0.08, ENVELOPE.z - 0.02]], []);

  const camRef = React.useRef();
  const root = React.useRef();
  const planeRef = React.useRef();
  const envRef = React.useRef();
  const lampRef = React.useRef();
  const ringsRef = React.useRef();
  const trailRef = React.useRef();

  const tmp = React.useMemo(
    () => ({
      v: new THREE.Vector3(),
      w: new THREE.Vector3(),
      o: new THREE.Object3D(),
      col: new THREE.Color(),
      inkC: new THREE.Color(ink),
      paperC: new THREE.Color(paper),
      rot: { x: 0, y: 0 },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  React.useEffect(() => {
    tmp.inkC.set(ink);
    tmp.paperC.set(paper);
  }, [ink, paper, tmp]);

  useFrame((state, dt) => {
    const time = reduced ? 5.0 : state.clock.elapsedTime;
    const { pointer, t } = view.current;
    const { v, w, o, col, inkC, paperC, rot } = tmp;

    // camera: fit for the box aspect, drift a little with scroll
    const cam = camRef.current;
    if (cam) {
      const aspect = cam.aspect || 0.75;
      const tanH = Math.tan((CAM_FOV * Math.PI) / 360);
      const d = Math.max(FIT_HALF_W / (tanH * aspect), FIT_HALF_H / tanH) * 1.04;
      v.copy(CAM_DIR).multiplyScalar(d).add(LOOK);
      v.y += (t - 0.5) * 0.6;
      if (cam.position.distanceToSquared(v) > 1e-6) {
        cam.position.lerp(v, reduced ? 1 : Math.min(1, dt * 6 + 0.2));
        cam.lookAt(LOOK);
      }
    }

    // parallax
    if (root.current) {
      const ty = pointer.x * 0.3 + (reduced ? 0 : 0.05 * Math.sin(time * 0.17));
      const tx = -pointer.y * 0.07;
      const k = reduced ? 1 : Math.min(1, dt * 2.5);
      rot.x += (tx - rot.x) * k;
      rot.y += (ty - rot.y) * k;
      root.current.rotation.set(rot.x, rot.y, 0);
    }

    // broadcast rings: born at the lamp, expand, sink a little, fade
    const rm = ringsRef.current;
    if (rm) {
      let burst = 0;
      for (let i = 0; i < RINGS; i++) {
        const a = reduced ? 0.12 + (i / RINGS) * 0.8 : (((time / RING_PERIOD + i / RINGS) % 1) + 1) % 1;
        const sc = 0.08 + a * RING_MAX;
        o.position.set(0, LAMP_Y - a * 0.9, 0);
        o.rotation.set(-Math.PI / 2, 0, 0);
        o.scale.set(sc, sc, 1);
        o.updateMatrix();
        rm.setMatrixAt(i, o.matrix);
        col.copy(inkC).lerp(paperC, Math.min(1, Math.pow(a, 1.1) * 1.06)); // fully paper before it resets
        rm.setColorAt(i, col);
        if (a < 0.12) burst = Math.max(burst, 1 - a / 0.12);
      }
      rm.instanceMatrix.needsUpdate = true;
      if (rm.instanceColor) rm.instanceColor.needsUpdate = true;
      if (lampRef.current) lampRef.current.scale.setScalar(1 + 0.7 * burst);
    }

    // paper plane on its orbit + dashed trail behind it
    const u = reduced ? 0.17 : time / 16;
    const pl = planeRef.current;
    if (pl) {
      orbitPoint(u, v);
      orbitPoint(u + 0.004, w);
      pl.position.copy(v);
      pl.lookAt(w);
      pl.rotateZ(-0.35 + 0.1 * Math.sin(time * 0.8)); // bank into the turn
    }
    const tm = trailRef.current;
    if (tm) {
      for (let i = 0; i < TRAIL; i++) {
        const uu = u - 0.013 - i * 0.011;
        orbitPoint(uu, v);
        orbitPoint(uu + 0.002, w);
        v.y -= 0.09;
        w.y -= 0.09;
        o.position.copy(v);
        o.lookAt(w);
        o.scale.setScalar(1);
        o.updateMatrix();
        tm.setMatrixAt(i, o.matrix);
        col.copy(inkC).lerp(paperC, Math.pow(i / TRAIL, 0.8) * 0.9);
        tm.setColorAt(i, col);
      }
      tm.instanceMatrix.needsUpdate = true;
      if (tm.instanceColor) tm.instanceColor.needsUpdate = true;
    }

    // envelope hover
    const env = envRef.current;
    if (env) {
      env.position.set(ENVELOPE.x, ENVELOPE.y + (reduced ? 0 : 0.06 * Math.sin(time * 0.9)), ENVELOPE.z);
      env.rotation.set(-0.12, -0.55 + (reduced ? 0 : 0.08 * Math.sin(time * 0.5)), 0.04);
    }
  });

  return (
    <group>
      <PerspectiveCamera ref={camRef} makeDefault position={[0, 3.8, 10]} fov={CAM_FOV} near={0.1} far={60} onUpdate={(c) => c.lookAt(LOOK)} />
      <group ref={root}>
        {/* ground: surveyed circle, inner dashed circle, ticks */}
        <InkLine points={circlePts(GROUND_R, 72)} lineWidth={1} />
        <InkLine points={circlePts(GROUND_R * 0.62, 56)} dashed dashSize={0.08} gapSize={0.06} lineWidth={0.8} opacity={0.6} />
        <InkLine points={groundPts} segments lineWidth={0.8} opacity={0.7} />
        {/* feet */}
        {[0, 1, 2].map((i) => {
          const [x, , z] = legAt(i, 0);
          return (
            <InkFlat key={i} position={[x, 0.004, z]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.05, 12]} />
            </InkFlat>
          );
        })}

        {/* lattice mast */}
        <InkLine points={trussPts} segments lineWidth={1.1} />
        {/* lamp at the tip */}
        <InkFlat ref={lampRef} position={[0, LAMP_Y, 0]}>
          <sphereGeometry args={[0.07, 12, 10]} />
        </InkFlat>

        {/* broadcast rings – base colour white so instanceColor (ink→paper fade) is not
            multiplied away when ink is black */}
        <instancedMesh ref={ringsRef} args={[undefined, undefined, RINGS]} frustumCulled={false}>
          <ringGeometry args={[0.984, 1, 72]} />
          <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
        </instancedMesh>

        {/* paper plane orbit */}
        <InkLine points={orbitPts} dashed dashSize={0.1} gapSize={0.1} lineWidth={0.7} opacity={0.3} />
        <group ref={planeRef}>
          <group scale={1.2}>
            <PaperPlane />
          </group>
        </group>
        <instancedMesh ref={trailRef} args={[undefined, undefined, TRAIL]} frustumCulled={false}>
          <boxGeometry args={[0.016, 0.016, 0.085]} />
          <meshBasicMaterial color="#ffffff" />
        </instancedMesh>

        {/* envelope + tether */}
        <InkLine points={tetherPts} dashed dashSize={0.06} gapSize={0.05} lineWidth={0.8} opacity={0.7} />
        <group ref={envRef} position={ENVELOPE.toArray()}>
          <Envelope />
        </group>
      </group>
    </group>
  );
}
