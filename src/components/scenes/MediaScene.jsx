"use client";
/**
 * "media" – CineRead: a cross-media recommendation agent.
 *
 *   centre : the agent – a geodesic wireframe sphere with a filled core and a
 *            chat bubble whose three dots "type".
 *   orbit  : three media glyphs on tilted rings – a clapperboard that claps,
 *            an open book whose page turns, a TV whose screen scans.
 *   links  : dashed agent→glyph lines carrying travelling dots; every few
 *            seconds one glyph↔glyph link lights up with a dot and a ring
 *            pulse: a cross-media match (film → book → series).
 *
 * Ink language: hollow = structure, hatched = objects, dashed = data,
 * filled dots = packets, expanding rings = a match being announced.
 */
import * as React from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera, RoundedBox } from "@react-three/drei";
import { InkMesh, InkMaterial, InkWire, InkLine, InkFlat, useInk } from "../three/Ink";
import { useViewProgress } from "../three/useViewProgress";

/* ------------------------------------------------------------------ layout */
const CAM_FOV = 28;
const CAM_DIR = new THREE.Vector3(0, 0.34, 1).normalize();
const LOOK_Y = -0.3;
const FIT_HALF_W = 3.2;
const FIT_HALF_H = 1.72;
const ORBIT_R = 1.95;
// ring tilts (euler x, z) and the glyph's angular speed / start angle
const RINGS = [
  { rx: 0.16, rz: 0.0, speed: 0.1, a0: 0.35 },
  { rx: 0.3, rz: 0.36, speed: 0.1, a0: 2.45 },
  { rx: 0.3, rz: -0.36, speed: 0.1, a0: 4.55 },
];
const GLYPH_SCALE = 1.2;
const MATCH_PERIOD = 7; // seconds per cross-media match
const PAIRS = [
  [0, 1],
  [1, 2],
  [2, 0],
];
const DOTS_PER_LINK = 3;

const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

function roundedRectPts(w, h, r, n = 5) {
  const pts = [];
  const cs = [
    [w / 2 - r, h / 2 - r, 0],
    [-w / 2 + r, h / 2 - r, Math.PI / 2],
    [-w / 2 + r, -h / 2 + r, Math.PI],
    [w / 2 - r, -h / 2 + r, (3 * Math.PI) / 2],
  ];
  for (const [cx, cy, a0] of cs) {
    for (let i = 0; i <= n; i++) {
      const a = a0 + (i / n) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0]);
    }
  }
  pts.push(pts[0]);
  return pts;
}

function circlePts(r, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([Math.cos(a) * r, 0, Math.sin(a) * r]);
  }
  return pts;
}

/* --------------------------------------------------------------- pieces */

function Agent({ coreRef, bubbleDotsRef }) {
  const bubble = React.useMemo(() => roundedRectPts(0.62, 0.36, 0.1), []);
  const equator = React.useMemo(() => circlePts(0.56, 48), []);
  const tail = React.useMemo(() => [[-0.22, -0.18, 0], [-0.3, -0.34, 0], [-0.1, -0.18, 0]], []);
  return (
    <group>
      {/* geodesic shell */}
      <InkWire opacity={0.9}>
        <icosahedronGeometry args={[0.56, 1]} />
      </InkWire>
      {/* paper core so the shell reads as a solid ball, with an ink nucleus */}
      <InkFlat paper>
        <sphereGeometry args={[0.46, 18, 12]} />
      </InkFlat>
      <InkFlat ref={coreRef}>
        <sphereGeometry args={[0.1, 12, 8]} />
      </InkFlat>
      <InkLine points={equator} lineWidth={1} opacity={0.9} />
      {/* chat bubble */}
      <group position={[0.78, 0.86, 0.3]}>
        <InkFlat paper position={[0, 0, -0.002]}>
          <planeGeometry args={[0.6, 0.34]} />
        </InkFlat>
        <InkLine points={bubble} lineWidth={1.1} />
        <InkLine points={tail} lineWidth={1.1} />
        <group ref={bubbleDotsRef}>
          {[-0.14, 0, 0.14].map((x, i) => (
            <InkFlat key={i} position={[x, 0, 0.002]}>
              <circleGeometry args={[0.038, 12]} />
            </InkFlat>
          ))}
        </group>
      </group>
    </group>
  );
}

function Clapper({ slabRef }) {
  const stripes = React.useMemo(() => {
    const pts = [];
    for (let k = 0; k < 5; k++) {
      const x = 0.04 + k * 0.115;
      pts.push([x, 0.0, 0.03], [x + 0.06, 0.1, 0.03]);
    }
    return pts;
  }, []);
  const boardStripes = React.useMemo(() => {
    const pts = [];
    for (let k = 0; k < 5; k++) {
      const x = -0.26 + k * 0.115;
      pts.push([x, 0.12, 0.03], [x + 0.06, 0.21, 0.03]);
    }
    return pts;
  }, []);
  const text = React.useMemo(
    () => [[-0.22, 0.03, 0.03], [0.02, 0.03, 0.03], [-0.22, -0.05, 0.03], [0.14, -0.05, 0.03], [-0.22, -0.13, 0.03], [0.06, -0.13, 0.03]],
    []
  );
  return (
    <group>
      <InkMesh hatch={5} strength={0.8} fill={0.06}>
        <boxGeometry args={[0.6, 0.44, 0.05]} />
      </InkMesh>
      <InkLine points={boardStripes} segments lineWidth={1} />
      <InkLine points={[[-0.3, 0.1, 0.03], [0.3, 0.1, 0.03]]} lineWidth={0.8} opacity={0.7} />
      <InkLine points={text} segments lineWidth={0.8} opacity={0.75} />
      {/* hinged slab */}
      <group ref={slabRef} position={[-0.3, 0.23, 0]}>
        <InkMesh position={[0.3, 0.05, 0]} hatch={5} strength={0.8} fill={0.06}>
          <boxGeometry args={[0.6, 0.1, 0.05]} />
        </InkMesh>
        <InkLine points={stripes} segments lineWidth={1} />
      </group>
      {/* hinge pin */}
      <InkFlat position={[-0.3, 0.23, 0.03]}>
        <circleGeometry args={[0.022, 10]} />
      </InkFlat>
    </group>
  );
}

/** One static book page, hinged at the spine (module-level so React keeps its identity). */
function BookPage({ side, children }) {
  return (
    <group rotation={[0, side * 0.62, 0]}>
      <group position={[-side * 0.19, 0, 0]}>
        <InkMesh hatch={6} strength={0.3} fill={0.0}>
          <planeGeometry args={[0.36, 0.48]} />
        </InkMesh>
        {children}
      </group>
    </group>
  );
}

function Book({ turnRef }) {
  const pageLines = React.useMemo(() => {
    const pts = [];
    for (let i = 0; i < 7; i++) {
      const y = 0.16 - i * 0.05;
      const len = 0.2 + ((i * 7) % 5) * 0.015;
      pts.push([-0.13, y, 0.004], [-0.13 + len, y, 0.004]);
    }
    return pts;
  }, []);
  return (
    <group rotation={[0.9, 0, 0]}>
      {/* covers */}
      <group rotation={[0, 0.62, 0]}>
        <InkMesh position={[-0.19, -0.014, 0]} hatch={5} strength={0.7} fill={0.06}>
          <boxGeometry args={[0.38, 0.024, 0.5]} />
        </InkMesh>
      </group>
      <group rotation={[0, -0.62, 0]}>
        <InkMesh position={[0.19, -0.014, 0]} hatch={5} strength={0.7} fill={0.06}>
          <boxGeometry args={[0.38, 0.024, 0.5]} />
        </InkMesh>
      </group>
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <BookPage side={1}>
          <InkLine points={pageLines} segments lineWidth={0.8} opacity={0.8} />
        </BookPage>
        <BookPage side={-1}>
          <InkLine points={pageLines} segments lineWidth={0.8} opacity={0.8} />
        </BookPage>
        {/* the page that turns: hinged at the spine */}
        <group ref={turnRef} rotation={[0, -0.62, 0]}>
          <group position={[0.19, 0, 0]}>
            <InkMesh hatch={6} strength={0.3} fill={0.0}>
              <planeGeometry args={[0.36, 0.48]} />
            </InkMesh>
            <InkLine points={pageLines} segments lineWidth={0.8} opacity={0.8} />
          </group>
        </group>
        {/* spine */}
        <InkLine points={[[0, -0.24, 0], [0, 0.24, 0]]} lineWidth={1.2} />
      </group>
    </group>
  );
}

function Screen({ scanRef }) {
  const outline = React.useMemo(() => roundedRectPts(0.64, 0.44, 0.06), []);
  const screen = React.useMemo(() => roundedRectPts(0.54, 0.34, 0.02, 2), []);
  const antenna = React.useMemo(
    () => [[-0.04, 0.22, 0], [-0.22, 0.52, 0], [0.04, 0.22, 0], [0.24, 0.5, 0], [-0.12, -0.22, 0], [-0.17, -0.32, 0], [0.12, -0.22, 0], [0.17, -0.32, 0]],
    []
  );
  const play = React.useMemo(() => [[-0.05, 0.07, 0.044], [0.07, 0, 0.044], [-0.05, -0.07, 0.044], [-0.05, 0.07, 0.044]], []);
  return (
    <group>
      <RoundedBox args={[0.64, 0.44, 0.08]} radius={0.06} smoothness={3}>
        <InkMaterial hatch={6} strength={0.6} fill={0.03} />
      </RoundedBox>
      <InkLine points={outline} lineWidth={1.1} position={[0, 0, 0.041]} />
      <InkLine points={screen} lineWidth={0.8} position={[0, 0, 0.042]} />
      <InkLine points={antenna} segments lineWidth={1} />
      <InkFlat position={[-0.22, 0.52, 0]}>
        <circleGeometry args={[0.025, 10]} />
      </InkFlat>
      <InkFlat position={[0.24, 0.5, 0]}>
        <circleGeometry args={[0.025, 10]} />
      </InkFlat>
      <InkLine points={play} lineWidth={1} />
      {/* progress bar with a moving head */}
      <InkLine points={[[-0.22, -0.12, 0.044], [0.22, -0.12, 0.044]]} lineWidth={0.8} opacity={0.7} />
      <InkFlat ref={scanRef} position={[-0.22, -0.12, 0.045]}>
        <circleGeometry args={[0.022, 10]} />
      </InkFlat>
    </group>
  );
}

/* ----------------------------------------------------------------- scene */

export default function MediaScene({ trackRef, reduced, mobile }) {
  const view = useViewProgress(trackRef);
  const { ink } = useInk();

  const root = React.useRef();
  const camRef = React.useRef();
  const coreRef = React.useRef();
  const bubbleDotsRef = React.useRef();
  const slabRef = React.useRef();
  const turnRef = React.useRef();
  const scanRef = React.useRef();
  const glyphRefs = React.useRef([]);
  const linksRef = React.useRef();
  const matchRef = React.useRef();
  const dotsRef = React.useRef();
  const matchDotRef = React.useRef();
  const pulseRef = React.useRef();

  const ringPts = React.useMemo(() => circlePts(ORBIT_R, 96), []);
  const pulsePts = React.useMemo(() => circlePts(1, 40), []);

  const nDots = mobile ? 2 : DOTS_PER_LINK;
  const dotCount = RINGS.length * nDots;

  // geometry buffers for the dynamic dashed links
  const linkPos = React.useMemo(() => new Float32Array(RINGS.length * 2 * 3), []);
  const matchPos = React.useMemo(() => new Float32Array(2 * 3), []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tmp = React.useMemo(
    () => ({
      v: new THREE.Vector3(),
      w: new THREE.Vector3(),
      o: new THREE.Object3D(),
      e: new THREE.Euler(),
      q: new THREE.Quaternion(),
      pos: RINGS.map(() => new THREE.Vector3()),
      la: new THREE.Vector3(),
      lb: new THREE.Vector3(),
      w2: new THREE.Vector3(),
      rot: { x: 0, y: 0 },
    }),
    []
  );

  useFrame((state, dt) => {
    const time = reduced ? 13.2 : state.clock.elapsedTime;
    const { pointer, t } = view.current;
    const { v, w, o, e, q, pos, rot, la, lb, w2 } = tmp;

    /* camera fit */
    const cam = camRef.current;
    if (cam) {
      const aspect = cam.aspect || 1.78;
      const tanH = Math.tan((CAM_FOV * Math.PI) / 360);
      const d = Math.max(FIT_HALF_W / (tanH * aspect), FIT_HALF_H / tanH) * 1.02;
      v.copy(CAM_DIR).multiplyScalar(d);
      v.y += LOOK_Y;
      if (cam.position.distanceToSquared(v) > 1e-6) {
        cam.position.lerp(v, reduced ? 1 : Math.min(1, dt * 6 + 0.2));
        cam.lookAt(0, LOOK_Y, 0);
      }
    }

    /* whole drawing: slow turn + parallax */
    if (root.current) {
      const ty = (reduced ? 0 : 0.12 * Math.sin(time * 0.09)) + pointer.x * 0.26;
      const tx = -pointer.y * 0.1 + (t - 0.5) * 0.12;
      const k = reduced ? 1 : Math.min(1, dt * 2.5);
      rot.y += (ty - rot.y) * k;
      rot.x += (tx - rot.x) * k;
      root.current.rotation.set(rot.x, rot.y, 0);
    }

    /* agent: core breathes, bubble dots type */
    if (coreRef.current) {
      const s = 1 + (reduced ? 0 : 0.22 * Math.sin(time * 1.6));
      coreRef.current.scale.setScalar(s);
    }
    const bd = bubbleDotsRef.current;
    if (bd) {
      for (let i = 0; i < bd.children.length; i++) {
        const ph = ((time * 1.4 - i * 0.33) % 1 + 1) % 1;
        const s = 0.55 + 0.45 * Math.max(0, Math.sin(ph * Math.PI));
        bd.children[i].scale.setScalar(reduced ? (i === 1 ? 1 : 0.6) : s);
      }
    }

    /* glyphs move along their tilted rings, facing the camera */
    for (let i = 0; i < RINGS.length; i++) {
      const r = RINGS[i];
      const a = r.a0 + time * r.speed;
      v.set(Math.cos(a) * ORBIT_R, 0, Math.sin(a) * ORBIT_R);
      e.set(r.rx, 0, r.rz);
      q.setFromEuler(e);
      v.applyQuaternion(q);
      pos[i].copy(v);
      const g = glyphRefs.current[i];
      if (g) {
        g.position.copy(v);
        g.scale.setScalar(GLYPH_SCALE);
        // undo the root tilt so glyphs stay upright, add a slow idle turn
        g.rotation.set(0.22 - rot.x * 0.6 + 0.06 * Math.sin(time * 0.5 + i), -rot.y + 0.3 * Math.sin(time * 0.33 + i * 2), 0);
      }
    }

    /* glyph internals */
    if (slabRef.current) {
      // the clapper: opens slowly, snaps shut, every 5 s
      const ph = ((time / 5) % 1 + 1) % 1;
      const open = ph < 0.8 ? smooth(ph / 0.8) * 0.5 : 0.5 * (1 - smooth((ph - 0.8) / 0.08));
      slabRef.current.rotation.z = reduced ? 0.35 : open;
    }
    if (turnRef.current) {
      // the book: a page turns every 6 s
      const ph = ((time / 6) % 1 + 1) % 1;
      const k = reduced ? 0.45 : ph < 0.45 ? smooth(ph / 0.45) : 1;
      const vis = reduced || ph < 0.5;
      turnRef.current.rotation.y = -0.62 - k * (Math.PI - 1.24);
      turnRef.current.scale.setScalar(vis ? 1 : 0.0001);
    }
    if (scanRef.current) {
      const ph = ((time / 8) % 1 + 1) % 1;
      scanRef.current.position.x = -0.22 + 0.44 * (reduced ? 0.4 : ph);
    }

    /* dashed links agent → glyph */
    const lk = linksRef.current;
    if (lk) {
      for (let i = 0; i < RINGS.length; i++) {
        w.copy(pos[i]).normalize();
        la.copy(w).multiplyScalar(0.6); // leave the sphere surface
        lb.copy(pos[i]).addScaledVector(w, -0.42 * GLYPH_SCALE); // stop short of the glyph
        linkPos[i * 6] = la.x;
        linkPos[i * 6 + 1] = la.y;
        linkPos[i * 6 + 2] = la.z;
        linkPos[i * 6 + 3] = lb.x;
        linkPos[i * 6 + 4] = lb.y;
        linkPos[i * 6 + 5] = lb.z;
      }
      lk.geometry.attributes.position.needsUpdate = true;
      lk.computeLineDistances();
      lk.material.dashOffset = -time * 0.25;
    }

    /* dots travelling outward on the links */
    const dm = dotsRef.current;
    if (dm) {
      let k = 0;
      for (let i = 0; i < RINGS.length; i++) {
        for (let j = 0; j < nDots; j++) {
          const u = ((time * 0.18 + j / nDots + i * 0.11) % 1 + 1) % 1;
          w.copy(pos[i]).normalize();
          lb.copy(pos[i]).addScaledVector(w, -0.42 * GLYPH_SCALE);
          v.copy(w).multiplyScalar(0.6).lerp(lb, u);
          o.position.copy(v);
          o.scale.setScalar(1);
          o.updateMatrix();
          dm.setMatrixAt(k++, o.matrix);
        }
      }
      dm.instanceMatrix.needsUpdate = true;
    }

    /* cross-media match: one pair at a time */
    const mk = matchRef.current;
    if (mk) {
      const cycle = Math.floor(time / MATCH_PERIOD);
      const ph = (time - cycle * MATCH_PERIOD) / MATCH_PERIOD;
      const [ia, ib] = PAIRS[((cycle % PAIRS.length) + PAIRS.length) % PAIRS.length];
      const A = pos[ia];
      const B = pos[ib];
      w.copy(B).sub(A).normalize();
      v.copy(A).addScaledVector(w, 0.42 * GLYPH_SCALE);
      const Bs = w2.copy(B).addScaledVector(w, -0.42 * GLYPH_SCALE);
      matchPos[0] = v.x;
      matchPos[1] = v.y;
      matchPos[2] = v.z;
      matchPos[3] = Bs.x;
      matchPos[4] = Bs.y;
      matchPos[5] = Bs.z;
      mk.geometry.attributes.position.needsUpdate = true;
      mk.computeLineDistances();
      const env = smooth(ph / 0.12) * (1 - smooth((ph - 0.62) / 0.16));
      mk.material.opacity = reduced ? 1 : env;
      mk.material.dashOffset = -time * 0.4;
      // the matching dot flies A → B
      const md = matchDotRef.current;
      if (md) {
        const u = smooth((ph - 0.12) / 0.4);
        md.position.copy(v).lerp(Bs, reduced ? 0.6 : u);
        md.scale.setScalar(env > 0.01 ? 1 : 0.0001);
      }
      // a ring pulse at B when the dot arrives
      const pr = pulseRef.current;
      if (pr) {
        const pp = (ph - 0.5) / 0.3;
        const on = pp >= 0 && pp <= 1;
        pr.position.copy(B);
        pr.scale.setScalar(on ? 0.3 + pp * 0.7 : 0.0001);
        pr.material.opacity = on ? 1 - pp : 0;
        pr.quaternion.copy(state.camera.quaternion);
        if (root.current) pr.quaternion.premultiply(q.copy(root.current.quaternion).invert());
        pr.rotateX(Math.PI / 2);
        if (reduced) {
          pr.scale.setScalar(0.55);
          pr.material.opacity = 0.7;
        }
      }
    }
  });

  return (
    <group>
      <PerspectiveCamera ref={camRef} makeDefault position={[0, 3, 7]} fov={CAM_FOV} near={0.1} far={60} />
      <group ref={root}>
        <Agent coreRef={coreRef} bubbleDotsRef={bubbleDotsRef} />

        {/* orbit rings */}
        {RINGS.map((r, i) => (
          <group key={i} rotation={[r.rx, 0, r.rz]}>
            <InkLine points={ringPts} lineWidth={0.8} opacity={0.6} />
          </group>
        ))}

        {/* glyphs */}
        <group ref={(el) => (glyphRefs.current[0] = el)}>
          <Clapper slabRef={slabRef} />
        </group>
        <group ref={(el) => (glyphRefs.current[1] = el)}>
          <Book turnRef={turnRef} />
        </group>
        <group ref={(el) => (glyphRefs.current[2] = el)}>
          <Screen scanRef={scanRef} />
        </group>

        {/* dashed links agent → glyph (dynamic) */}
        <lineSegments ref={linksRef}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[linkPos, 3]} />
          </bufferGeometry>
          <lineDashedMaterial color={ink} dashSize={0.1} gapSize={0.07} transparent opacity={0.85} />
        </lineSegments>
        <instancedMesh ref={dotsRef} args={[undefined, undefined, dotCount]}>
          <sphereGeometry args={[0.035, 8, 6]} />
          <meshBasicMaterial color={ink} />
        </instancedMesh>

        {/* cross-media match link */}
        <lineSegments ref={matchRef}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[matchPos, 3]} />
          </bufferGeometry>
          <lineDashedMaterial color={ink} dashSize={0.06} gapSize={0.05} transparent opacity={0} />
        </lineSegments>
        <InkFlat ref={matchDotRef}>
          <sphereGeometry args={[0.055, 10, 8]} />
        </InkFlat>
        <lineLoop ref={pulseRef}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[new Float32Array(pulsePts.slice(0, -1).flat()), 3]} />
          </bufferGeometry>
          <lineBasicMaterial color={ink} transparent opacity={0} />
        </lineLoop>
      </group>
    </group>
  );
}
