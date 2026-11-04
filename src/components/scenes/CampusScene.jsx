"use client";
/**
 * "campus" – Education: an isometric staircase of three hatched slabs rising
 * left to right – school → college → BUET.
 *
 *   slab 1 : a small gabled school with a door, two windows, a flag pole with
 *            a waving pennant and a little tree.
 *   slab 2 : a taller college with four columns, a pediment and front steps.
 *   slab 3 : the university – a clock tower with a dome and a lower wing with
 *            an arched entrance. The clock hands turn.
 *
 * A dashed path climbs the stairs from the first slab to the university door;
 * a small filled dot travels it, pauses at the door and loops. The pointer
 * tilts the whole drawing. reduced: a static pose.
 *
 * Ink language: hatched slabs = ground gained, hollow buildings = places,
 * dashed = the route, filled dot = where you are.
 */
import * as React from "react";
import * as THREE from "three";
import { useSceneFrame as useFrame } from "../three/useSceneFrame";
import { PerspectiveCamera } from "@react-three/drei";
import { InkMesh, InkLine, InkFlat } from "../three/Ink";
import { useViewProgress } from "../three/useViewProgress";

/* ------------------------------------------------------------------ layout */
const CAM_FOV = 22;
const CAM_DIR = new THREE.Vector3(-0.82, 0.66, 1.08).normalize();
const LOOK_Y = 1.1;
const LOOK_X = 0.0;
const FIT_HALF_W = 3.5;
const FIT_HALF_H = 2.25; // tall enough that the tower finial stays inside the card

const SLAB_W = 1.75;
const SLAB_D = 1.5;
const SLAB_H = [0.45, 0.85, 1.25];
const SLAB_X = [-SLAB_W, 0, SLAB_W];
const PATH_Z = 0.52;
const LOOP = 11; // seconds for one climb

const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

function rectPts(w, h, cx, cy, z) {
  return [[cx - w / 2, cy - h / 2, z], [cx + w / 2, cy - h / 2, z], [cx + w / 2, cy + h / 2, z], [cx - w / 2, cy + h / 2, z], [cx - w / 2, cy - h / 2, z]];
}
function rectSeg(w, h, cx, cy, z) {
  const p = rectPts(w, h, cx, cy, z);
  return [p[0], p[1], p[1], p[2], p[2], p[3], p[3], p[0]];
}
/** triangular prism (gable / pediment): width w, height h, depth d, apex up, centred at the base */
function prism(w, h, d) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(0, h);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
  g.translate(0, 0, -d / 2);
  return g;
}

/* ----------------------------------------------------------------- slabs */

function Slabs() {
  const risers = React.useMemo(() => {
    // little steps drawn on each riser, where the path climbs
    const pts = [];
    for (let i = 1; i < 3; i++) {
      const x = SLAB_X[i] - SLAB_W / 2 - 0.002;
      const y0 = SLAB_H[i - 1];
      for (let k = 1; k <= 3; k++) {
        const y = y0 + ((SLAB_H[i] - y0) * k) / 4;
        pts.push([x, y, PATH_Z - 0.2], [x, y, PATH_Z + 0.2]);
      }
      pts.push([x, y0, PATH_Z - 0.2], [x, SLAB_H[i], PATH_Z - 0.2]);
      pts.push([x, y0, PATH_Z + 0.2], [x, SLAB_H[i], PATH_Z + 0.2]);
    }
    return pts;
  }, []);
  const ground = React.useMemo(() => {
    const x0 = SLAB_X[0] - SLAB_W / 2 - 0.35;
    const x1 = SLAB_X[2] + SLAB_W / 2 + 0.35;
    const z0 = -SLAB_D / 2 - 0.3;
    const z1 = SLAB_D / 2 + 0.3;
    return [[x0, 0, z1], [x1, 0, z1], [x1, 0, z0], [x0, 0, z0], [x0, 0, z1]];
  }, []);
  return (
    <group>
      {SLAB_H.map((h, i) => (
        <InkMesh key={i} position={[SLAB_X[i], h / 2, 0]} hatch={6} strength={0.7} fill={0.02}>
          <boxGeometry args={[SLAB_W, h, SLAB_D]} />
        </InkMesh>
      ))}
      <InkLine points={risers} segments lineWidth={0.7} opacity={0.75} />
      <InkLine points={ground} lineWidth={0.6} opacity={0.4} dashed dashSize={0.12} gapSize={0.08} />
    </group>
  );
}

/* ------------------------------------------------------------- buildings */

function School({ flagRef }) {
  const x = SLAB_X[0] + 0.1;
  const base = SLAB_H[0];
  const w = 0.85;
  const h = 0.42;
  const d = 0.6;
  const roof = React.useMemo(() => prism(w + 0.1, 0.26, d + 0.1), [w, d]);
  const front = React.useMemo(() => {
    const z = d / 2 + 0.002;
    return [
      ...rectSeg(0.14, 0.22, 0.0, 0.11, z), // door
      ...rectSeg(0.14, 0.12, -0.27, 0.24, z), // windows
      ...rectSeg(0.14, 0.12, 0.27, 0.24, z),
      [-0.27, 0.18, z], [-0.27, 0.3, z], [-0.34, 0.24, z], [-0.2, 0.24, z],
      [0.27, 0.18, z], [0.27, 0.3, z], [0.2, 0.24, z], [0.34, 0.24, z],
    ];
  }, [d]);
  const flag = React.useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(0.26, -0.07);
    s.lineTo(0, -0.14);
    s.closePath();
    return new THREE.ShapeGeometry(s);
  }, []);
  return (
    <group position={[x, base, -0.15]}>
      <InkMesh position={[0, h / 2, 0]} hatch={6}>
        <boxGeometry args={[w, h, d]} />
      </InkMesh>
      <InkMesh position={[0, h, 0]} hatch={4} strength={1}>
        <primitive object={roof} attach="geometry" />
      </InkMesh>
      <InkLine points={front} segments lineWidth={0.7} />
      {/* chimney */}
      <InkMesh position={[-0.25, h + 0.22, -0.12]} hatch={4}>
        <boxGeometry args={[0.08, 0.2, 0.08]} />
      </InkMesh>
      {/* flag pole */}
      <group position={[-0.62, 0, 0.42]}>
        <InkLine points={[[0, 0, 0], [0, 0.95, 0]]} lineWidth={1.1} />
        <InkFlat position={[0, 0.95, 0]}>
          <sphereGeometry args={[0.018, 8, 6]} />
        </InkFlat>
        <group ref={flagRef} position={[0.01, 0.94, 0]}>
          <InkFlat>
            <primitive object={flag} attach="geometry" />
          </InkFlat>
        </group>
      </group>
      {/* a small tree */}
      <group position={[0.68, 0, 0.3]}>
        <InkMesh position={[0, 0.07, 0]} hatch={3}>
          <cylinderGeometry args={[0.02, 0.025, 0.14, 8]} />
        </InkMesh>
        <InkMesh position={[0, 0.3, 0]} hatch={5}>
          <coneGeometry args={[0.14, 0.34, 10]} />
        </InkMesh>
      </group>
    </group>
  );
}

function College() {
  const x = SLAB_X[1];
  const base = SLAB_H[1];
  const w = 1.0;
  const h = 0.66;
  const d = 0.6;
  const ped = React.useMemo(() => prism(1.14, 0.2, 0.26), []);
  const cols = [-0.36, -0.12, 0.12, 0.36];
  const sideWindows = React.useMemo(() => {
    const pts = [];
    const xx = -w / 2 - 0.002;
    for (let i = 0; i < 3; i++) {
      pts.push(...rectSeg(0.1, 0.16, 0, 0, 0).map(([a, b]) => [xx, 0.36 + b, -0.18 + i * 0.18 + a]));
    }
    return pts;
  }, [w]);
  return (
    <group position={[x, base, -0.15]}>
      <InkMesh position={[0, h / 2, 0]} hatch={6}>
        <boxGeometry args={[w, h, d]} />
      </InkMesh>
      {/* roof slab */}
      <InkMesh position={[0, h + 0.03, 0.06]} hatch={5}>
        <boxGeometry args={[w + 0.14, 0.06, d + 0.26]} />
      </InkMesh>
      {/* pediment over the portico */}
      <InkMesh position={[0, h + 0.06, d / 2 + 0.06]} hatch={4}>
        <primitive object={ped} attach="geometry" />
      </InkMesh>
      {/* portico columns */}
      {cols.map((cx) => (
        <InkMesh key={cx} position={[cx, h / 2, d / 2 + 0.12]} hatch={3} strength={0.9}>
          <cylinderGeometry args={[0.03, 0.035, h, 10]} />
        </InkMesh>
      ))}
      {/* capitals */}
      {cols.map((cx) => (
        <InkMesh key={"c" + cx} position={[cx, h - 0.02, d / 2 + 0.12]} hatch={3}>
          <boxGeometry args={[0.08, 0.035, 0.08]} />
        </InkMesh>
      ))}
      {/* doors between the middle columns */}
      <InkLine points={rectSeg(0.16, 0.3, 0, 0.15, d / 2 + 0.002)} segments lineWidth={0.8} />
      <InkLine points={[[0, 0, d / 2 + 0.003], [0, 0.3, d / 2 + 0.003]]} lineWidth={0.6} />
      <InkLine points={sideWindows} segments lineWidth={0.6} opacity={0.8} />
      {/* front steps */}
      <InkMesh position={[0, 0.03, d / 2 + 0.3]} hatch={4}>
        <boxGeometry args={[0.8, 0.06, 0.16]} />
      </InkMesh>
      <InkMesh position={[0, 0.09, d / 2 + 0.22]} hatch={4}>
        <boxGeometry args={[0.7, 0.06, 0.12]} />
      </InkMesh>
    </group>
  );
}

function University({ handsRef }) {
  const base = SLAB_H[2];
  const tx = SLAB_X[2] - 0.32;
  const tw = 0.5;
  const th = 1.15;
  const CLOCK_Y = 0.92;
  const wingW = 0.8;
  const wingH = 0.5;
  const wingD = 0.5;
  const arch = React.useMemo(() => {
    const pts = [];
    const r = 0.11;
    const z = wingD / 2 + 0.002;
    const cx = 0.05;
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * Math.PI;
      pts.push([cx + Math.cos(a) * r, 0.16 + Math.sin(a) * r, z]);
    }
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) out.push(pts[i], pts[i + 1]);
    out.push([cx - r, 0.16, z], [cx - r, 0, z], [cx + r, 0.16, z], [cx + r, 0, z]);
    // two windows on the wing
    out.push(...rectSeg(0.1, 0.14, -0.24, 0.3, z), ...rectSeg(0.1, 0.14, 0.3, 0.3, z));
    return out;
  }, []);
  const towerWindows = React.useMemo(() => {
    const pts = [];
    const z = tw / 2 + 0.002;
    for (let i = 0; i < 2; i++) pts.push(...rectSeg(0.1, 0.16, 0, 0.28 + i * 0.26, z));
    // clock ticks
    const cz = z + 0.03;
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      const r0 = k % 3 === 0 ? 0.11 : 0.135;
      pts.push([Math.cos(a) * r0, CLOCK_Y + Math.sin(a) * r0, cz], [Math.cos(a) * 0.15, CLOCK_Y + Math.sin(a) * 0.15, cz]);
    }
    return pts;
  }, []);
  return (
    <group position={[tx, base, -0.15]}>
      {/* tower */}
      <InkMesh position={[0, th / 2, 0]} hatch={6}>
        <boxGeometry args={[tw, th, tw]} />
      </InkMesh>
      <InkLine points={towerWindows} segments lineWidth={0.7} />
      {/* clock */}
      <InkMesh position={[0, CLOCK_Y, tw / 2 + 0.012]} rotation={[Math.PI / 2, 0, 0]} hatch={3}>
        <cylinderGeometry args={[0.17, 0.17, 0.024, 28]} />
      </InkMesh>
      <group ref={handsRef} position={[0, CLOCK_Y, tw / 2 + 0.03]}>
        <InkLine points={[[0, 0, 0], [0, 0.11, 0]]} lineWidth={1.3} />
        <InkLine points={[[0, 0, 0.001], [0.075, -0.03, 0.001]]} lineWidth={1.3} />
      </group>
      <InkFlat position={[0, CLOCK_Y, tw / 2 + 0.032]}>
        <circleGeometry args={[0.012, 8]} />
      </InkFlat>
      {/* belfry + dome */}
      <InkMesh position={[0, th + 0.06, 0]} hatch={4}>
        <cylinderGeometry args={[0.2, 0.26, 0.12, 12]} />
      </InkMesh>
      <InkMesh position={[0, th + 0.12, 0]} hatch={5} strength={0.9}>
        <sphereGeometry args={[0.2, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </InkMesh>
      <InkLine points={[[0, th + 0.32, 0], [0, th + 0.46, 0]]} lineWidth={1.1} />
      <InkFlat position={[0, th + 0.46, 0]}>
        <sphereGeometry args={[0.016, 8, 6]} />
      </InkFlat>
      {/* wing with arched entrance */}
      <group position={[tw / 2 + wingW / 2, 0, 0]}>
        <InkMesh position={[0, wingH / 2, 0]} hatch={6}>
          <boxGeometry args={[wingW, wingH, wingD]} />
        </InkMesh>
        <InkMesh position={[0, wingH + 0.02, 0]} hatch={5}>
          <boxGeometry args={[wingW + 0.08, 0.04, wingD + 0.08]} />
        </InkMesh>
        <InkLine points={arch} segments lineWidth={0.8} />
      </group>
      {/* a line of low shrubs along the tower front */}
      <InkLine
        points={[[-0.36, 0.06, 0.34], [-0.3, 0.14, 0.34], [-0.24, 0.06, 0.34], [-0.18, 0.14, 0.34], [-0.12, 0.06, 0.34]]}
        lineWidth={0.7}
        opacity={0.7}
      />
    </group>
  );
}

/* ------------------------------------------------------------------ path */

function makePath() {
  const y0 = SLAB_H[0] + 0.004;
  const y1 = SLAB_H[1] + 0.004;
  const y2 = SLAB_H[2] + 0.004;
  const x1 = SLAB_X[1] - SLAB_W / 2;
  const x2 = SLAB_X[2] - SLAB_W / 2;
  const doorX = SLAB_X[2] - 0.32;
  const pts = [
    new THREE.Vector3(SLAB_X[0] - SLAB_W / 2 + 0.15, y0, PATH_Z),
    new THREE.Vector3(x1 - 0.01, y0, PATH_Z),
    new THREE.Vector3(x1 - 0.01, y1, PATH_Z),
    new THREE.Vector3(x2 - 0.01, y1, PATH_Z),
    new THREE.Vector3(x2 - 0.01, y2, PATH_Z),
    new THREE.Vector3(doorX, y2, PATH_Z),
    new THREE.Vector3(doorX, y2, 0.14),
  ];
  const curve = new THREE.CurvePath();
  for (let i = 0; i < pts.length - 1; i++) curve.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
  return { curve, pts: pts.map((p) => [p.x, p.y, p.z]) };
}

/* ----------------------------------------------------------------- scene */

export default function CampusScene({ trackRef, reduced }) {
  const view = useViewProgress(trackRef);
  const root = React.useRef();
  const camRef = React.useRef();
  const dotRef = React.useRef();
  const flagRef = React.useRef();
  const handsRef = React.useRef();
  const path = React.useMemo(() => makePath(), []);
  const tmp = React.useMemo(() => ({ v: new THREE.Vector3(), p: new THREE.Vector3(), rot: { x: 0, y: 0 } }), []);

  useFrame((state, dt) => {
    const time = reduced ? 4.2 : state.clock.elapsedTime;
    const { pointer, t } = view.current;
    const { v, p, rot } = tmp;

    const cam = camRef.current;
    if (cam) {
      const aspect = cam.aspect || 1.78;
      const tanH = Math.tan((CAM_FOV * Math.PI) / 360);
      const d = Math.max(FIT_HALF_W / (tanH * aspect), FIT_HALF_H / tanH) * 1.02;
      v.copy(CAM_DIR).multiplyScalar(d);
      v.y += LOOK_Y;
      v.x += LOOK_X;
      if (cam.position.distanceToSquared(v) > 1e-6) {
        cam.position.lerp(v, reduced ? 1 : Math.min(1, dt * 6 + 0.2));
        cam.lookAt(LOOK_X, LOOK_Y, 0);
      }
    }

    /* pointer tilts the whole drawing; a very slow idle sway otherwise */
    if (root.current) {
      const ty = (reduced ? 0 : 0.06 * Math.sin(time * 0.12)) + pointer.x * 0.2;
      const tx = -pointer.y * 0.1 + (t - 0.5) * 0.1;
      const k = reduced ? 1 : Math.min(1, dt * 2.5);
      rot.y += (ty - rot.y) * k;
      rot.x += (tx - rot.x) * k;
      root.current.rotation.set(rot.x, rot.y, 0);
    }

    /* the dot climbs the path, pauses at the door, fades and restarts */
    const dot = dotRef.current;
    if (dot) {
      let u = (time / LOOP) % 1;
      if (u < 0) u += 1;
      const travel = 0.82; // fraction of the loop spent moving
      const q = Math.min(1, u / travel);
      path.curve.getPointAt(q, p);
      const rise = Math.sin(q * Math.PI * 14) * 0.012; // little hops
      dot.position.set(p.x, p.y + 0.05 + Math.abs(rise), p.z);
      let s = 1;
      if (u > travel) s = 1 - smooth((u - travel - 0.1) / 0.06); // vanish into the door
      if (u < 0.03) s = smooth(u / 0.03);
      dot.scale.setScalar(Math.max(s, 0.0001));
    }

    if (flagRef.current) {
      flagRef.current.rotation.y = reduced ? 0.3 : 0.3 + 0.25 * Math.sin(time * 1.7);
      flagRef.current.rotation.x = reduced ? 0 : 0.08 * Math.sin(time * 2.3);
    }
    if (handsRef.current) {
      const hands = handsRef.current;
      hands.children[0].rotation.z = -time * 0.5; // minute hand
      hands.children[1].rotation.z = -time * 0.5 / 12;
    }
  });

  return (
    <group>
      <PerspectiveCamera ref={camRef} makeDefault position={[-6, 6, 7]} fov={CAM_FOV} near={0.1} far={80} />
      <group ref={root}>
        <Slabs />
        <School flagRef={flagRef} />
        <College />
        <University handsRef={handsRef} />
        <InkLine points={path.pts} dashed dashSize={0.09} gapSize={0.06} lineWidth={1.1} />
        <group ref={dotRef}>
          <InkFlat>
            <sphereGeometry args={[0.055, 10, 8]} />
          </InkFlat>
        </group>
      </group>
    </group>
  );
}
