"use client";
/**
 * "gradcap" – GradPilot: planning study abroad, drawn as a map table.
 *
 *   above  : a mortarboard (board + skull cap + button + tassel) hovering and
 *            slowly rocking over the table, with a dashed shadow beneath it.
 *   table  : a paper map plane with faint dashed latitude curves. One filled
 *            "home" dot at the front-left; four slim university towers
 *            (column + pointed roof) scattered across the plane.
 *   arcs   : dashed great-circle arcs rise from home to every tower. A tiny
 *            paper plane flies one arc at a time; on arrival a ring pulses at
 *            the tower, the plane folds away and re-appears at home on the
 *            next arc.
 *
 * Ink language: dashed = routes, filled dot = origin, ring pulse = arrival,
 * hatched solids = objects.
 */
import * as React from "react";
import * as THREE from "three";
import { useSceneFrame as useFrame } from "../three/useSceneFrame";
import { PerspectiveCamera } from "@react-three/drei";
import { InkMesh, InkLine, InkFlat } from "../three/Ink";
import { useViewProgress } from "../three/useViewProgress";

/* ------------------------------------------------------------------ layout */
const CAM_FOV = 26;
const CAM_DIR = new THREE.Vector3(0.1, 0.56, 1).normalize();
const LOOK = new THREE.Vector3(0.05, 0.52, -0.1);
const FIT_HALF_W = 2.75;
const FIT_HALF_H = 1.75;

const MAP_W = 4.7; // x
const MAP_D = 2.7; // z
const HOME = new THREE.Vector3(-1.78, 0, 0.82);
const TOWERS = [
  new THREE.Vector3(1.8, 0, 0.42),
  new THREE.Vector3(1.25, 0, -0.9),
  new THREE.Vector3(-1.0, 0, -0.82),
  new THREE.Vector3(0.45, 0, 0.62),
];
const TOWER_H = 0.62;
const TOWER_W = 0.2;
const ROOF_H = 0.28;

const CAP_Y = 1.62; // hover height of the mortarboard centre
const BOARD = 1.05; // board side
const BOARD_T = 0.05;
const CAP_X = 0.1;
const CAP_R = 0.32; // skull cap radius
const CAP_H = 0.24;
const TASSEL_Z = BOARD / Math.SQRT2 + 0.03;

const FLIGHT = 4.2; // seconds per arc
const DWELL = 1.2; // seconds between flights (ring pulse + re-fold at home)
const CYCLE = FLIGHT + DWELL;

const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/* -------------------------------------------------------------- geometry */

function arcCurve(a, b) {
  const mid = a.clone().lerp(b, 0.5);
  mid.y = 0.22 + a.distanceTo(b) * 0.2;
  return new THREE.QuadraticBezierCurve3(a.clone(), mid, b.clone());
}

/** Folded paper plane: two wings and a keel. Nose points along +z. */
function makePlaneGeometry() {
  const N = [0, 0, 0.17];
  const TL = [-0.095, 0.012, -0.1];
  const TR = [0.095, 0.012, -0.1];
  const TC = [0, 0, -0.07];
  const K = [0, -0.055, -0.085];
  const tris = [
    [N, TL, TC],
    [N, TC, TR],
    [N, TC, K],
    [N, K, TC],
  ];
  const pos = new Float32Array(tris.flat(2));
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

function circlePts(r, n, y = 0) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([Math.cos(a) * r, y, Math.sin(a) * r]);
  }
  return pts;
}

/* --------------------------------------------------------------- pieces */

function MapTable() {
  const border = React.useMemo(() => {
    const x = MAP_W / 2;
    const z = MAP_D / 2;
    return [[-x, 0, z], [x, 0, z], [x, 0, -z], [-x, 0, -z], [-x, 0, z]];
  }, []);
  // faint "latitude" curves and a couple of "coastlines" on the paper
  const latitudes = React.useMemo(() => {
    const out = [];
    for (let k = 0; k < 3; k++) {
      const pts = [];
      const z0 = -MAP_D / 2 + (MAP_D * (k + 1)) / 4;
      for (let i = 0; i <= 40; i++) {
        const x = -MAP_W / 2 + (MAP_W * i) / 40;
        pts.push([x, 0.001, z0 + 0.14 * Math.sin(x * 1.3 + k * 1.7)]);
      }
      out.push(pts);
    }
    return out;
  }, []);
  const coast = React.useMemo(() => {
    const out = [];
    const blobs = [
      [-0.9, -0.2, 0.55, 0.38, 0.3],
      [1.2, -0.3, 0.6, 0.42, 1.9],
      [-0.3, 0.75, 0.42, 0.26, 4.1],
    ];
    for (const [cx, cz, rx, rz, ph] of blobs) {
      const pts = [];
      for (let i = 0; i <= 48; i++) {
        const a = (i / 48) * Math.PI * 2;
        const w = 1 + 0.16 * Math.sin(a * 3 + ph) + 0.09 * Math.sin(a * 5 + ph * 2);
        pts.push([cx + Math.cos(a) * rx * w, 0.001, cz + Math.sin(a) * rz * w]);
      }
      out.push(pts);
    }
    return out;
  }, []);
  return (
    <group>
      <InkLine points={border} lineWidth={1.1} />
      {latitudes.map((pts, i) => (
        <InkLine key={`lat${i}`} points={pts} dashed dashSize={0.05} gapSize={0.07} lineWidth={0.6} opacity={0.35} />
      ))}
      {coast.map((pts, i) => (
        <InkLine key={`c${i}`} points={pts} lineWidth={0.6} opacity={0.3} />
      ))}
    </group>
  );
}

function Tower({ position, index }) {
  const base = React.useMemo(() => {
    const s = TOWER_W * 0.95;
    return [[-s, 0.002, s], [s, 0.002, s], [s, 0.002, -s], [-s, 0.002, -s], [-s, 0.002, s]];
  }, []);
  const windows = React.useMemo(() => {
    const pts = [];
    const f = TOWER_W / 2 + 0.003;
    for (let i = 0; i < 3; i++) {
      const y = 0.16 + i * 0.15;
      pts.push([-0.05, y, f], [0.05, y, f]);
    }
    return pts;
  }, []);
  return (
    <group position={position}>
      <InkLine points={base} lineWidth={0.7} opacity={0.6} />
      <InkMesh position={[0, TOWER_H / 2, 0]} hatch={5} strength={0.9}>
        <boxGeometry args={[TOWER_W, TOWER_H, TOWER_W]} />
      </InkMesh>
      <InkLine points={windows} segments lineWidth={0.8} opacity={0.85} />
      <InkMesh position={[0, TOWER_H + ROOF_H / 2, 0]} rotation={[0, Math.PI / 4, 0]} hatch={4} strength={1} fill={0.06}>
        <coneGeometry args={[TOWER_W * 0.78, ROOF_H, 4, 1]} />
      </InkMesh>
      {/* a tiny pennant on every other tower */}
      {index % 2 === 0 && (
        <InkLine
          points={[[0, TOWER_H + ROOF_H, 0], [0, TOWER_H + ROOF_H + 0.16, 0], [0.1, TOWER_H + ROOF_H + 0.12, 0], [0, TOWER_H + ROOF_H + 0.08, 0]]}
          lineWidth={0.8}
        />
      )}
    </group>
  );
}

function Mortarboard({ capRef, tasselRef }) {
  const tasselPts = React.useMemo(() => {
    const top = BOARD_T / 2 + 0.06;
    const c = BOARD / Math.SQRT2;
    return [[0, top, 0], [0, top, c], [0, top - 0.42, c + 0.03]];
  }, []);
  return (
    <group ref={capRef} position={[CAP_X, CAP_Y, 0]}>
      {/* skull cap: a short open cylinder under the board */}
      <InkMesh position={[0, -CAP_H / 2 - BOARD_T / 2 + 0.01, 0]} hatch={5} strength={0.95} fill={0.04}>
        <cylinderGeometry args={[CAP_R, CAP_R * 1.04, CAP_H, 28, 1]} />
      </InkMesh>
      {/* the board, rotated so a corner faces the viewer */}
      <group rotation={[0, Math.PI / 4, 0]}>
        <InkMesh hatch={6} strength={0.9}>
          <boxGeometry args={[BOARD, BOARD_T, BOARD]} />
        </InkMesh>
      </group>
      {/* button */}
      <InkFlat position={[0, BOARD_T / 2 + 0.03, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.06, 12]} />
      </InkFlat>
      {/* tassel: cord to the corner, then hanging, with a knot and fringe */}
      <group ref={tasselRef}>
        <InkLine points={tasselPts} lineWidth={1.2} />
        <InkFlat position={[0, BOARD_T / 2 + 0.06 - 0.42, BOARD / Math.SQRT2 + 0.03]}>
          <sphereGeometry args={[0.035, 10, 8]} />
        </InkFlat>
        <InkLine
          points={[
            [0, BOARD_T / 2 + 0.06 - 0.44, TASSEL_Z], [-0.04, BOARD_T / 2 + 0.06 - 0.58, TASSEL_Z],
            [0, BOARD_T / 2 + 0.06 - 0.44, TASSEL_Z], [0, BOARD_T / 2 + 0.06 - 0.6, TASSEL_Z + 0.02],
            [0, BOARD_T / 2 + 0.06 - 0.44, TASSEL_Z], [0.04, BOARD_T / 2 + 0.06 - 0.58, TASSEL_Z],
          ]}
          segments
          lineWidth={0.9}
        />
      </group>
    </group>
  );
}

/* ----------------------------------------------------------------- scene */

export default function GradcapScene({ trackRef, reduced }) {
  const view = useViewProgress(trackRef);

  const root = React.useRef();
  const camRef = React.useRef();
  const capRef = React.useRef();
  const tasselRef = React.useRef();
  const shadowRef = React.useRef();
  const planeRef = React.useRef();
  const ringRefs = React.useRef([]);

  const arcs = React.useMemo(() => TOWERS.map((t) => arcCurve(HOME, t)), []);
  const arcPts = React.useMemo(() => arcs.map((c) => c.getPoints(48).map((p) => [p.x, p.y, p.z])), [arcs]);
  const planeGeo = React.useMemo(() => makePlaneGeometry(), []);
  const ringPts = React.useMemo(() => circlePts(1, 40, 0.004), []);
  const shadowPts = React.useMemo(() => circlePts(1, 48, 0.003), []);

  const tmp = React.useMemo(
    () => ({ v: new THREE.Vector3(), p: new THREE.Vector3(), q: new THREE.Vector3(), rot: { x: 0, y: 0 } }),
    []
  );

  useFrame((state, dt) => {
    const time = reduced ? 1.9 : state.clock.elapsedTime;
    const { pointer, t } = view.current;
    const { v, p, q, rot } = tmp;

    /* camera fit */
    const cam = camRef.current;
    if (cam) {
      const aspect = cam.aspect || 1.78;
      const tanH = Math.tan((CAM_FOV * Math.PI) / 360);
      const d = Math.max(FIT_HALF_W / (tanH * aspect), FIT_HALF_H / tanH) * 1.02;
      v.copy(CAM_DIR).multiplyScalar(d).add(LOOK);
      if (cam.position.distanceToSquared(v) > 1e-6) {
        cam.position.lerp(v, reduced ? 1 : Math.min(1, dt * 6 + 0.2));
        cam.lookAt(LOOK);
      }
    }

    /* whole drawing: pointer / scroll parallax */
    if (root.current) {
      const ty = (reduced ? 0 : 0.05 * Math.sin(time * 0.12)) + pointer.x * 0.22;
      const tx = -pointer.y * 0.07 + (t - 0.5) * 0.08;
      const k = reduced ? 1 : Math.min(1, dt * 2.5);
      rot.y += (ty - rot.y) * k;
      rot.x += (tx - rot.x) * k;
      root.current.rotation.set(rot.x, rot.y, 0);
    }

    /* mortarboard: hover, rock, slow yaw; tassel swings a touch behind */
    const cap = capRef.current;
    if (cap) {
      const bob = reduced ? 0 : 0.07 * Math.sin(time * 0.9);
      cap.position.y = CAP_Y + bob;
      cap.rotation.set(0.07 * Math.sin(time * 0.55), 0.35 * Math.sin(time * 0.21), 0.09 * Math.sin(time * 0.7 + 1));
      if (tasselRef.current) tasselRef.current.rotation.x = 0.1 * Math.sin(time * 0.7 - 0.6);
      const sh = shadowRef.current;
      if (sh) {
        const s = 0.5 - bob * 0.5;
        sh.scale.set(s * 1.2, 1, s);
        sh.rotation.y = cap.rotation.y;
      }
    }

    /* paper plane: one arc at a time */
    const pl = planeRef.current;
    if (pl) {
      const cyc = Math.floor(time / CYCLE);
      const arcIdx = ((cyc % arcs.length) + arcs.length) % arcs.length;
      const u = time - cyc * CYCLE;
      const curve = arcs[arcIdx];
      if (u < FLIGHT) {
        const f = u / FLIGHT;
        const e = f * f * (3 - 2 * f) * 0.35 + f * 0.65; // soft take-off and landing
        curve.getPoint(e, p);
        curve.getPoint(Math.min(1, e + 0.01), q);
        pl.position.copy(p);
        pl.lookAt(q);
        // a little bank into the turn
        pl.rotateZ(0.35 * Math.sin(f * Math.PI));
        // unfold at take-off, fold away on landing
        const sc = Math.min(1, smooth(f / 0.08), smooth((1 - f) / 0.08));
        pl.scale.setScalar(0.0001 + sc * 1.3);
      } else {
        pl.scale.setScalar(0.0001);
      }
      // arrival ring at the tower
      for (let i = 0; i < ringRefs.current.length; i++) {
        const r = ringRefs.current[i];
        if (!r) continue;
        let s = 0;
        let op = 0;
        if (i === arcIdx && u >= FLIGHT - 0.2) {
          const g = (u - (FLIGHT - 0.2)) / (DWELL + 0.2);
          s = 0.08 + g * 0.5;
          op = Math.max(0, 1 - g) * 0.9;
        }
        if (reduced) {
          s = 0;
          op = 0;
        }
        r.scale.set(s || 0.0001, 1, s || 0.0001);
        const line = r.children[0];
        if (line && line.material) {
          line.material.opacity = op;
          line.material.transparent = true;
        }
      }
    }
  });

  return (
    <group>
      <PerspectiveCamera ref={camRef} makeDefault position={[1, 4, 6]} fov={CAM_FOV} near={0.1} far={60} />
      <group ref={root}>
        <MapTable />
        {/* home */}
        <InkFlat position={[HOME.x, 0.004, HOME.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.075, 20]} />
        </InkFlat>
        <InkLine points={circlePts(0.15, 32, 0.003).map(([x, y, z]) => [x + HOME.x, y, z + HOME.z])} lineWidth={0.8} opacity={0.7} />
        <InkLine points={circlePts(0.24, 40, 0.003).map(([x, y, z]) => [x + HOME.x, y, z + HOME.z])} dashed dashSize={0.04} gapSize={0.04} lineWidth={0.6} opacity={0.45} />
        {/* routes */}
        {arcPts.map((pts, i) => (
          <InkLine key={i} points={pts} dashed dashSize={0.07} gapSize={0.05} lineWidth={0.9} opacity={0.8} />
        ))}
        {/* universities */}
        {TOWERS.map((p, i) => (
          <Tower key={i} position={p} index={i} />
        ))}
        {/* arrival rings */}
        {TOWERS.map((p, i) => (
          <group key={`r${i}`} position={[p.x, 0, p.z]} ref={(el) => (ringRefs.current[i] = el)}>
            <InkLine points={ringPts} lineWidth={1} opacity={0} />
          </group>
        ))}
        {/* the plane */}
        <InkMesh ref={planeRef} geometry={planeGeo} hatch={3} strength={0.45} threshold={10} lineWidth={1} />
        {/* mortarboard and its dashed shadow on the map */}
        <group ref={shadowRef} position={[CAP_X, 0, 0]}>
          <InkLine points={shadowPts} dashed dashSize={0.06} gapSize={0.05} lineWidth={0.7} opacity={0.5} />
        </group>
        <Mortarboard capRef={capRef} tasselRef={tasselRef} />
      </group>
    </group>
  );
}
