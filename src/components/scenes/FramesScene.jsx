"use client";
/**
 * "frames" – Art Gallery: a gallery wall receding in perspective with five
 * hung frames, a floor line and a bench.
 *
 *   each frame : an extruded picture frame with a paper mat and a different
 *                procedural ink artwork – diagonal hatch with a hollow sun,
 *                a halftone dot field, off-centre rings, a wireframe bust on a
 *                plinth, and a row of bars.
 *   the visit  : a track light slides along the ceiling and parks above one
 *                frame at a time; its wireframe cone comes on, a dashed pool of
 *                light appears on the wall and a five-star rating (tiny
 *                tetrahedra, filled vs hollow) pops in beneath the frame. The
 *                camera dollies gently along the wall to follow it (ping-pong).
 *
 * Ink language: hollow frames, hatched profiles, dashed light, filled = rated.
 */
import * as React from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { InkMesh, InkLine, InkFlat, InkWire, useInk } from "../three/Ink";
import { useViewProgress } from "../three/useViewProgress";

/* ------------------------------------------------------------------ layout */
const CAM_FOV = 30;
const CAM_DIR = new THREE.Vector3(0.0, 0.1, 1).normalize();
const LOOK_Y = 0.98;
const FIT_HALF_W = 4.05;
const FIT_HALF_H = 1.55;
const WALL_ROT = 0.42; // the wall recedes to the right
const CEIL_Y = 2.45;
const FRAME_Y = 1.4;
const DWELL = 4.6; // seconds spent per frame (travel + stay)
const TRAVEL = 1.5;

/** x along the wall, outer width, outer height, rating, art kind */
const FRAMES = [
  { x: -2.85, w: 1.1, h: 0.84, stars: 4, art: "hatch" },
  { x: -1.5, w: 0.76, h: 1.0, stars: 5, art: "dots" },
  { x: -0.08, w: 0.98, h: 0.98, stars: 3, art: "rings" },
  { x: 1.38, w: 0.88, h: 1.14, stars: 5, art: "bust" },
  { x: 2.82, w: 1.2, h: 0.76, stars: 4, art: "bars" },
];
const SEQ = [0, 1, 2, 3, 4, 3, 2, 1]; // ping-pong visiting order

const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

function rectPts(w, h, z = 0, cx = 0, cy = 0) {
  return [
    [cx - w / 2, cy - h / 2, z],
    [cx + w / 2, cy - h / 2, z],
    [cx + w / 2, cy + h / 2, z],
    [cx - w / 2, cy + h / 2, z],
    [cx - w / 2, cy - h / 2, z],
  ];
}
function circlePts(r, n, z = 0, cx = 0, cy = 0, ry = r) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * ry, z]);
  }
  return pts;
}

/* ------------------------------------------------------------- artworks */

function ArtHatch({ w, h }) {
  const z = 0.002;
  const lines = React.useMemo(() => {
    const pts = [];
    const step = 0.075;
    for (let c = -(w + h); c <= w + h; c += step) {
      // line x - y = c clipped to the rect
      const cand = [];
      const xs = [-w / 2, w / 2];
      const ys = [-h / 2, h / 2];
      for (const x of xs) {
        const y = x - c;
        if (y >= -h / 2 && y <= h / 2) cand.push([x, y]);
      }
      for (const y of ys) {
        const x = y + c;
        if (x > -w / 2 && x < w / 2) cand.push([x, y]);
      }
      if (cand.length >= 2) pts.push([cand[0][0], cand[0][1], z], [cand[1][0], cand[1][1], z]);
    }
    return pts;
  }, [w, h]);
  return (
    <group>
      <InkLine points={lines} segments lineWidth={0.6} opacity={0.75} />
      <InkFlat paper position={[w * 0.18, h * 0.16, z + 0.001]}>
        <circleGeometry args={[Math.min(w, h) * 0.2, 28]} />
      </InkFlat>
      <InkLine points={circlePts(Math.min(w, h) * 0.2, 36, z + 0.002, w * 0.18, h * 0.16)} lineWidth={1} />
      <InkLine points={[[-w / 2, -h * 0.22, z + 0.002], [w / 2, -h * 0.22, z + 0.002]]} lineWidth={1.1} />
    </group>
  );
}

function ArtDots({ w, h }) {
  const { ink } = useInk();
  const ref = React.useRef();
  const nx = 6;
  const ny = 7;
  React.useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    let i = 0;
    for (let a = 0; a < nx; a++) {
      for (let b = 0; b < ny; b++) {
        const x = (a / (nx - 1) - 0.5) * (w - 0.08);
        const y = (b / (ny - 1) - 0.5) * (h - 0.08);
        const d = Math.hypot(x / w, y / h) * 2.2;
        const s = Math.max(0.15, 1.1 - d * d * 1.3);
        o.position.set(x, y, 0.002);
        o.scale.setScalar(s);
        o.updateMatrix();
        m.setMatrixAt(i++, o.matrix);
      }
    }
    m.instanceMatrix.needsUpdate = true;
  }, [w, h]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, nx * ny]}>
      <circleGeometry args={[0.032, 12]} />
      <meshBasicMaterial color={ink} />
    </instancedMesh>
  );
}

function ArtRings({ w, h }) {
  const rings = React.useMemo(() => {
    const out = [];
    const rmax = Math.min(w, h) * 0.46;
    for (let i = 0; i < 6; i++) {
      const r = rmax * (0.18 + (i / 5) * 0.82);
      out.push(circlePts(r, 48, 0.002, -i * 0.012, i * 0.02));
    }
    return out;
  }, [w, h]);
  return (
    <group>
      {rings.map((p, i) => (
        <InkLine key={i} points={p} lineWidth={i === 2 ? 1.6 : 0.8} />
      ))}
      <InkFlat position={[0, 0, 0.003]}>
        <circleGeometry args={[0.025, 12]} />
      </InkFlat>
    </group>
  );
}

function ArtBust({ w, h }) {
  return (
    <group position={[0, -h * 0.12, 0.06]}>
      {/* head */}
      <InkWire position={[0, 0.3, 0]} rotation={[0, 0.3, 0]} opacity={0.9}>
        <sphereGeometry args={[0.13, 10, 8]} />
      </InkWire>
      {/* neck */}
      <InkWire position={[0, 0.14, 0]} opacity={0.9}>
        <cylinderGeometry args={[0.045, 0.055, 0.1, 8, 1, true]} />
      </InkWire>
      {/* shoulders */}
      <InkWire position={[0, 0.03, 0]} opacity={0.9}>
        <cylinderGeometry args={[0.2, 0.22, 0.12, 10, 1, true, Math.PI, Math.PI]} />
      </InkWire>
      <InkWire position={[0, 0.03, 0]} opacity={0.9}>
        <cylinderGeometry args={[0.2, 0.22, 0.12, 10, 1, true, 0, Math.PI]} />
      </InkWire>
      {/* plinth */}
      <InkMesh position={[0, -0.08, 0]} hatch={4}>
        <boxGeometry args={[0.3, 0.1, 0.14]} />
      </InkMesh>
      <InkLine points={[[-0.16, -0.13, 0.08], [0.16, -0.13, 0.08]]} lineWidth={1} />
    </group>
  );
}

function ArtBars({ w, h }) {
  const bars = React.useMemo(() => {
    const n = 9;
    const out = [];
    const bw = (w - 0.1) / n;
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + 0.05 + bw * (i + 0.5);
      const hh = (0.25 + 0.75 * Math.abs(Math.sin(i * 1.3 + 0.4))) * (h - 0.12);
      out.push({ x, w: bw * 0.62, h: hh, filled: i % 3 !== 1 });
    }
    return out;
  }, [w, h]);
  return (
    <group>
      <InkLine points={[[-w / 2 + 0.03, -h / 2 + 0.06, 0.002], [w / 2 - 0.03, -h / 2 + 0.06, 0.002]]} lineWidth={1} />
      {bars.map((b, i) =>
        b.filled ? (
          <InkFlat key={i} position={[b.x, -h / 2 + 0.06 + b.h / 2, 0.002]}>
            <planeGeometry args={[b.w, b.h]} />
          </InkFlat>
        ) : (
          <InkLine key={i} points={rectPts(b.w, b.h, 0.002, b.x, -h / 2 + 0.06 + b.h / 2)} lineWidth={0.9} />
        )
      )}
    </group>
  );
}

/* ----------------------------------------------------------------- frame */

function Frame({ x, w, h, art }) {
  const depth = 0.07;
  const border = 0.07;
  const geo = React.useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, -h / 2);
    s.lineTo(w / 2, -h / 2);
    s.lineTo(w / 2, h / 2);
    s.lineTo(-w / 2, h / 2);
    s.closePath();
    const hole = new THREE.Path();
    hole.moveTo(-w / 2 + border, -h / 2 + border);
    hole.lineTo(w / 2 - border, -h / 2 + border);
    hole.lineTo(w / 2 - border, h / 2 - border);
    hole.lineTo(-w / 2 + border, h / 2 - border);
    hole.closePath();
    s.holes.push(hole);
    return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
  }, [w, h]);
  const iw = w - border * 2;
  const ih = h - border * 2;
  const aw = iw - 0.14;
  const ah = ih - 0.14;
  const Art = art === "hatch" ? ArtHatch : art === "dots" ? ArtDots : art === "rings" ? ArtRings : art === "bust" ? ArtBust : ArtBars;
  return (
    <group position={[x, FRAME_Y, 0]}>
      <InkMesh hatch={4} strength={0.9}>
        <primitive object={geo} attach="geometry" />
      </InkMesh>
      {/* mat, recessed inside the frame */}
      <InkFlat paper position={[0, 0, 0.03]}>
        <planeGeometry args={[iw, ih]} />
      </InkFlat>
      <group position={[0, 0, 0.031]}>
        <InkLine points={rectPts(aw, ah, 0.001)} lineWidth={0.8} />
        <Art w={aw} h={ah} />
      </group>
      {/* hanging wire */}
      <InkLine points={[[-w * 0.3, h / 2, 0.02], [0, h / 2 + 0.22, 0.02], [w * 0.3, h / 2, 0.02]]} lineWidth={0.5} opacity={0.6} />
      <InkFlat position={[0, h / 2 + 0.225, 0.02]}>
        <circleGeometry args={[0.012, 8]} />
      </InkFlat>
    </group>
  );
}

/* --------------------------------------------------------------- the room */

function Room() {
  const L = -3.7;
  const R = 3.7;
  const lines = React.useMemo(
    () => [
      // wall–floor and wall–ceiling edges
      [L, 0, 0], [R, 0, 0],
      [L, CEIL_Y, 0], [R, CEIL_Y, 0],
      // skirting
      [L, 0.09, 0.012], [R, 0.09, 0.012],
      // wall ends
      [L, 0, 0], [L, CEIL_Y, 0],
      [R, 0, 0], [R, CEIL_Y, 0],
      // floor edges running towards the viewer
      [L, 0, 0], [L, 0, 2.6],
      [R, 0, 0], [R, 0, 2.6],
      [L, 0, 2.6], [R, 0, 2.6],
      // light track
      [L + 0.3, CEIL_Y, 0.6], [R - 0.3, CEIL_Y, 0.6],
    ],
    []
  );
  const boards = React.useMemo(() => {
    const pts = [];
    for (let x = L + 0.6; x < R; x += 0.6) pts.push([x, 0, 0], [x, 0, 2.6]);
    return pts;
  }, []);
  return (
    <group>
      <InkLine points={lines} segments lineWidth={0.9} opacity={0.85} />
      <InkLine points={boards} segments lineWidth={0.5} opacity={0.3} />
    </group>
  );
}

function Bench() {
  return (
    <group position={[-0.1, 0, 1.35]} rotation={[0, 0.0, 0]}>
      <InkMesh position={[0, 0.44, 0]} hatch={5}>
        <boxGeometry args={[1.5, 0.08, 0.42]} />
      </InkMesh>
      <InkMesh position={[-0.6, 0.2, 0]} hatch={5}>
        <boxGeometry args={[0.06, 0.4, 0.36]} />
      </InkMesh>
      <InkMesh position={[0.6, 0.2, 0]} hatch={5}>
        <boxGeometry args={[0.06, 0.4, 0.36]} />
      </InkMesh>
      <InkLine points={[[-0.6, 0.04, 0.19], [0.6, 0.04, 0.19]]} lineWidth={0.6} opacity={0.5} />
    </group>
  );
}

/** Track light: lamp + wireframe cone + dashed light pool. Positioned per frame. */
function Spot({ lampRef, coneRef, poolRef }) {
  const pool = React.useMemo(() => circlePts(0.8, 48, 0.012, 0, 0, 0.7), []);
  return (
    <group>
      <group ref={lampRef} position={[0, CEIL_Y, 0.6]}>
        <InkMesh position={[0, -0.09, 0]} hatch={4}>
          <cylinderGeometry args={[0.07, 0.1, 0.16, 14]} />
        </InkMesh>
        <InkLine points={[[0, 0, 0], [0, -0.02, 0]]} lineWidth={1} />
        <group ref={coneRef} position={[0, -0.14, 0]}>
          <InkWire position={[0, -0.6, 0]} opacity={0.26}>
            <coneGeometry args={[0.55, 1.2, 12, 1, true]} />
          </InkWire>
        </group>
      </group>
      <group ref={poolRef} position={[0, FRAME_Y - 0.05, 0]}>
        <InkLine points={pool} dashed dashSize={0.06} gapSize={0.05} lineWidth={0.8} opacity={0.6} />
      </group>
    </group>
  );
}

function Stars({ starsRef }) {
  return (
    <group ref={starsRef}>
      {[0, 1, 2, 3, 4].map((i) => (
        <group key={i} position={[(i - 2) * 0.15, 0, 0]}>
          <group name="filled">
            <InkFlat>
              <tetrahedronGeometry args={[0.065]} />
            </InkFlat>
          </group>
          <group name="hollow">
            <InkWire>
              <tetrahedronGeometry args={[0.065]} />
            </InkWire>
          </group>
        </group>
      ))}
    </group>
  );
}

/* ----------------------------------------------------------------- scene */

export default function FramesScene({ trackRef, reduced }) {
  const view = useViewProgress(trackRef);
  const camRef = React.useRef();
  const wallRef = React.useRef();
  const lampRef = React.useRef();
  const coneRef = React.useRef();
  const poolRef = React.useRef();
  const starsRef = React.useRef();

  const tmp = React.useMemo(
    () => ({ v: new THREE.Vector3(), rot: { x: 0, y: 0 }, dolly: 0, lampX: FRAMES[0].x, starBase: new Array(5).fill(0) }),
    []
  );

  useFrame((state, dt) => {
    const time = reduced ? DWELL * 2 + 3.2 : state.clock.elapsedTime;
    const { pointer, t } = view.current;
    const { v, rot } = tmp;

    /* visiting schedule (ping-pong) */
    const total = SEQ.length * DWELL;
    let tt = time % total;
    if (tt < 0) tt += total;
    const step = Math.floor(tt / DWELL);
    const local = tt - step * DWELL;
    const cur = FRAMES[SEQ[step]];
    const prev = FRAMES[SEQ[(step + SEQ.length - 1) % SEQ.length]];
    const travel = smooth(local / TRAVEL); // 0..1 during the move
    const stay = smooth((local - TRAVEL) / 0.5); // on once arrived
    const lampX = lerp(prev.x, cur.x, travel);

    /* camera: fit to the box and dolly along the wall */
    const cam = camRef.current;
    if (cam) {
      const aspect = cam.aspect || 1.78;
      const tanH = Math.tan((CAM_FOV * Math.PI) / 360);
      const d = Math.max(FIT_HALF_W / (tanH * aspect), FIT_HALF_H / tanH) * 1.02;
      const dolly = lampX * 0.08 * Math.cos(WALL_ROT); // gentle: the end frames must stay inside the box
      tmp.dolly += (dolly - tmp.dolly) * (reduced ? 1 : Math.min(1, dt * 2));
      v.copy(CAM_DIR).multiplyScalar(d);
      v.y += LOOK_Y;
      v.x += tmp.dolly;
      cam.position.copy(v);
      cam.lookAt(tmp.dolly, LOOK_Y, 0);
    }

    /* the wall: parallax from the pointer and scroll */
    if (wallRef.current) {
      const ty = WALL_ROT + pointer.x * 0.12 + (reduced ? 0 : 0.02 * Math.sin(time * 0.17));
      const tx = -pointer.y * 0.05 + (t - 0.5) * 0.08;
      const k = reduced ? 1 : Math.min(1, dt * 2.5);
      rot.y += (ty - rot.y) * k;
      rot.x += (tx - rot.x) * k;
      wallRef.current.rotation.set(rot.x, rot.y, 0);
    }

    /* track light slides, cone fades (scale) while moving, pool breathes */
    if (lampRef.current) lampRef.current.position.x = lampX;
    if (coneRef.current) {
      const on = Math.max(stay, 0.08);
      coneRef.current.scale.set(on, 1, on);
      // aim the cone at the frame: tilt towards the wall
      coneRef.current.rotation.x = 0.36;
    }
    if (poolRef.current) {
      const s = stay * (1 + (reduced ? 0 : 0.02 * Math.sin(time * 1.3)));
      poolRef.current.position.x = cur.x;
      poolRef.current.position.y = FRAME_Y - 0.04;
      // sized to the frame but kept inside the wall ends and under the ceiling
      poolRef.current.scale.set(Math.max(s, 0.0001) * (cur.w / 1.2), Math.max(s, 0.0001) * (cur.h / 0.8) * 1.05, 1);
    }

    /* stars beneath the visited frame, popping in one by one */
    const sg = starsRef.current;
    if (sg) {
      sg.position.set(cur.x, FRAME_Y - cur.h / 2 - 0.17, 0.06);
      for (let i = 0; i < 5; i++) {
        const g = sg.children[i];
        const u = (local - TRAVEL - 0.15 - i * 0.14) / 0.35;
        const e = u <= 0 ? 0 : u >= 1 ? 1 : 1 + 0.4 * Math.sin(u * Math.PI) - (1 - u) * (1 - u); // small overshoot
        const s = Math.max(e, 0.0001);
        const filled = i < cur.stars;
        g.children[0].scale.setScalar(filled ? s : 0.0001);
        g.children[1].scale.setScalar(filled ? 0.0001 : s);
        g.rotation.y = reduced ? 0.6 : time * 0.6 + i * 0.5;
        g.rotation.x = 0.4;
      }
    }
  });

  return (
    <group>
      <PerspectiveCamera ref={camRef} makeDefault position={[0, 1.5, 7]} fov={CAM_FOV} near={0.1} far={60} />
      <group ref={wallRef} rotation={[0, WALL_ROT, 0]}>
        <Room />
        {FRAMES.map((f) => (
          <Frame key={f.x} {...f} />
        ))}
        <Bench />
        <Spot lampRef={lampRef} coneRef={coneRef} poolRef={poolRef} />
        <Stars starsRef={starsRef} />
      </group>
    </group>
  );
}
