"use client";
/**
 * "papers" – ResearchQ: systematic-review screening drawn as a PRISMA funnel.
 *
 *   top    : a small citation graph (8 paper nodes, dashed links, travelling
 *            dots). Papers are born at the graph nodes.
 *   middle : a wireframe funnel. Papers drift down in a loose cloud, enter the
 *            rim and spiral down the wall. The ones that are excluded peel off
 *            sideways through the wall as hollow outlines and fade out.
 *   bottom : included papers fall through the neck, turn solid and land flat
 *            on a neat pile.
 *
 * Ink language: hollow = unscreened, solid = included, fading outline = excluded,
 * dashed = citation links, dots = packets.
 */
import * as React from "react";
import * as THREE from "three";
import { useSceneFrame as useFrame } from "../three/useSceneFrame";
import { PerspectiveCamera } from "@react-three/drei";
import { InkMesh, InkLine, InkFlat, useInk } from "../three/Ink";
import { useViewProgress } from "../three/useViewProgress";

/* ------------------------------------------------------------------ layout */
const CAM_FOV = 28;
const CAM_DIR = new THREE.Vector3(0, 0.42, 1).normalize();
const LOOK_Y = 0.62;
const FIT_HALF_W = 3.5;
const FIT_HALF_H = 2.12;

const RIM_Y = 1.2; // funnel top rim
const RIM_R = 1.6;
const NECK_Y = -0.4; // where the cone meets the neck
const NECK_R = 0.24;
const NECK_BOTTOM = -0.7;
const PILE_TOP = -0.92;
const PILE_H = 0.3;
const PAPER_W = 0.26;
const PAPER_H = 0.34;
const PERIOD = 12; // seconds for one paper's life
const U_DRIFT = 0.3; // end of drift (fraction of life)
const U_NECK = 0.62; // reaches the neck
const Q_EXIT = 0.5; // excluded ones leave the funnel at this funnel-depth
const WALL_TILT = Math.atan((RIM_R - NECK_R) / (RIM_Y - NECK_Y)); // ~34°

// citation graph nodes (x, y, z) and edges
const NODES = [
  [-2.7, 2.05, -0.3],
  [-1.75, 2.45, 0.2],
  [-0.9, 2.0, -0.5],
  [0.05, 2.5, 0.1],
  [0.95, 2.05, -0.45],
  [1.9, 2.45, 0.3],
  [2.75, 2.0, -0.2],
  [0.5, 1.85, 0.6],
];
const EDGES = [
  [0, 1], [1, 2], [1, 3], [2, 3], [3, 4], [2, 7], [4, 5], [4, 7], [5, 6], [3, 5], [4, 6], [0, 2],
];

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const lerp = (a, b, k) => a + (b - a) * k;

function circlePts(r, n, y = 0) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([Math.cos(a) * r, y, Math.sin(a) * r]);
  }
  return pts;
}

function rect(x, y, w, h) {
  const s = new THREE.Shape();
  s.moveTo(x - w / 2, y - h / 2);
  s.lineTo(x + w / 2, y - h / 2);
  s.lineTo(x + w / 2, y + h / 2);
  s.lineTo(x - w / 2, y + h / 2);
  s.closePath();
  return s;
}

/** Hollow paper glyph: a frame plus a title bar and two text lines (one ShapeGeometry). */
function makePaperGlyph(w, h) {
  const t = 0.018;
  const frame = rect(0, 0, w, h);
  const hole = new THREE.Path();
  hole.moveTo(-w / 2 + t, -h / 2 + t);
  hole.lineTo(w / 2 - t, -h / 2 + t);
  hole.lineTo(w / 2 - t, h / 2 - t);
  hole.lineTo(-w / 2 + t, h / 2 - t);
  hole.closePath();
  frame.holes.push(hole);
  const bars = [
    rect(-w * 0.1, h * 0.26, w * 0.5, 0.03),
    rect(0, h * 0.04, w * 0.7, 0.016),
    rect(-w * 0.05, -h * 0.1, w * 0.6, 0.016),
    rect(-w * 0.12, -h * 0.24, w * 0.46, 0.016),
  ];
  return new THREE.ShapeGeometry([frame, ...bars]);
}

/* --------------------------------------------------------------- pieces */

function Funnel() {
  const meridians = React.useMemo(() => {
    const pts = [];
    const n = 14;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      pts.push([Math.cos(a) * RIM_R, RIM_Y, Math.sin(a) * RIM_R], [Math.cos(a) * NECK_R, NECK_Y, Math.sin(a) * NECK_R]);
      if (i % 2 === 0) pts.push([Math.cos(a) * NECK_R, NECK_Y, Math.sin(a) * NECK_R], [Math.cos(a) * NECK_R, NECK_BOTTOM, Math.sin(a) * NECK_R]);
    }
    return pts;
  }, []);
  const lip = React.useMemo(() => circlePts(RIM_R - 0.08, 56, RIM_Y - 0.02), []);
  const rings = React.useMemo(() => {
    const out = [];
    // screening stages: rings at 0, 1/3, 2/3 of the cone depth
    for (const q of [0, 0.36, 0.7]) out.push(circlePts(lerp(RIM_R, NECK_R, q), 56, lerp(RIM_Y, NECK_Y, q)));
    out.push(circlePts(NECK_R, 28, NECK_Y));
    out.push(circlePts(NECK_R, 28, NECK_BOTTOM));
    return out;
  }, []);
  return (
    <group>
      <InkLine points={meridians} segments lineWidth={0.8} opacity={0.75} />
      {rings.map((pts, i) => (
        <InkLine key={i} points={pts} lineWidth={i === 0 ? 1.3 : 0.9} opacity={i === 0 ? 1 : 0.8} />
      ))}
      {/* a faint inner rim: the funnel has a lip */}
      <InkLine points={lip} lineWidth={0.6} opacity={0.45} />
    </group>
  );
}

function Pile() {
  const w = PAPER_W + 0.06;
  const d = PAPER_H + 0.06;
  const sideLines = React.useMemo(() => {
    const pts = [];
    const n = 7;
    for (let i = 1; i < n; i++) {
      const y = PILE_TOP - PILE_H + (i / n) * PILE_H;
      const jx = (i % 2 ? 0.008 : -0.006);
      pts.push([-w / 2 + jx, y, d / 2 + 0.002], [w / 2 + jx, y, d / 2 + 0.002]);
      pts.push([w / 2 + 0.002, y, d / 2 + jx], [w / 2 + 0.002, y, -d / 2 + jx]);
    }
    return pts;
  }, [w, d]);
  const desk = React.useMemo(() => {
    const W = 1.5;
    const D = 0.95;
    const y = PILE_TOP - PILE_H - 0.004;
    return [[-W / 2, y, D / 2], [W / 2, y, D / 2], [W / 2, y, -D / 2], [-W / 2, y, -D / 2], [-W / 2, y, D / 2]];
  }, []);
  return (
    <group>
      <InkMesh position={[0, PILE_TOP - PILE_H / 2, 0]} hatch={5} strength={0.9} fill={0.08}>
        <boxGeometry args={[w, PILE_H, d]} />
      </InkMesh>
      <InkLine points={sideLines} segments lineWidth={0.7} opacity={0.7} />
      {/* the latest included paper, flush on top */}
      <InkFlat position={[0, PILE_TOP + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[PAPER_W, PAPER_H]} />
      </InkFlat>
      <InkLine points={desk} lineWidth={0.8} opacity={0.55} />
      {/* a "✓ included" tick drawn under the pile */}
      <InkLine points={[[0.35, PILE_TOP - PILE_H + 0.002, 0.22], [0.42, PILE_TOP - PILE_H + 0.002, 0.3], [0.56, PILE_TOP - PILE_H + 0.002, 0.12]]} lineWidth={1.2} />
    </group>
  );
}

function CitationGraph({ nodeGroupRef, dotsRef, edgePaths }) {
  const { ink } = useInk();
  const edgePts = React.useMemo(() => EDGES.flatMap(([a, b]) => [NODES[a], NODES[b]]), []);
  const nodeRect = React.useMemo(() => {
    const w = 0.17;
    const h = 0.22;
    return [[-w / 2, -h / 2, 0], [w / 2, -h / 2, 0], [w / 2, h / 2, 0], [-w / 2, h / 2, 0], [-w / 2, -h / 2, 0]];
  }, []);
  const nodeLines = React.useMemo(
    () => [[-0.05, 0.05, 0.001], [0.05, 0.05, 0.001], [-0.05, 0.0, 0.001], [0.04, 0.0, 0.001], [-0.05, -0.05, 0.001], [0.02, -0.05, 0.001]],
    []
  );
  return (
    <group>
      <InkLine points={edgePts} segments dashed dashSize={0.07} gapSize={0.05} lineWidth={0.8} opacity={0.75} />
      <group ref={nodeGroupRef}>
        {NODES.map((p, i) => (
          <group key={i} position={p}>
            <InkFlat paper>
              <planeGeometry args={[0.17, 0.22]} />
            </InkFlat>
            <InkLine points={nodeRect} lineWidth={1} />
            <InkLine points={nodeLines} segments lineWidth={0.7} opacity={0.8} />
          </group>
        ))}
      </group>
      <instancedMesh ref={dotsRef} args={[undefined, undefined, edgePaths.length]}>
        <circleGeometry args={[0.028, 10]} />
        <meshBasicMaterial color={ink} />
      </instancedMesh>
    </group>
  );
}

/* ----------------------------------------------------------------- scene */

export default function PapersScene({ trackRef, reduced, mobile }) {
  const view = useViewProgress(trackRef);
  const { ink, paper } = useInk();
  const N = mobile ? 30 : 60;

  const root = React.useRef();
  const camRef = React.useRef();
  const fillRef = React.useRef();
  const frameRef = React.useRef();
  const solidRef = React.useRef();
  const dotsRef = React.useRef();
  const nodeGroupRef = React.useRef();

  const glyph = React.useMemo(() => makePaperGlyph(PAPER_W, PAPER_H), []);

  const edgePaths = React.useMemo(
    () => EDGES.map(([a, b], i) => ({ a: new THREE.Vector3(...NODES[a]), b: new THREE.Vector3(...NODES[b]), phase: (i * 0.37) % 1, dir: i % 3 === 0 ? -1 : 1 })),
    []
  );

  /** per-paper deterministic parameters */
  const papers = React.useMemo(() => {
    const rnd = mulberry(1337);
    const list = [];
    for (let i = 0; i < N; i++) {
      const node = NODES[(i * 5 + 2) % NODES.length];
      const spawn = new THREE.Vector3(node[0] + (rnd() - 0.5) * 0.5, node[1] - 0.15 - rnd() * 0.3, node[2] + (rnd() - 0.5) * 0.6);
      const a0 = rnd() * Math.PI * 2;
      const r0 = RIM_R * (0.62 + rnd() * 0.3);
      list.push({
        phase: i / N + (rnd() - 0.5) * 0.01,
        spawn,
        a0,
        r0,
        spin: rnd() < 0.5 ? 1 : -1,
        included: i % 3 === 0,
        // starting orientation in the cloud (close to how it will lie on the wall, so the lerp is calm)
        rx0: -WALL_TILT + (rnd() - 0.5) * 1.4,
        ry0: Math.PI / 2 - a0 + (rnd() - 0.5) * 1.6,
        rz0: (rnd() - 0.5) * 0.5,
        sway: rnd() * Math.PI * 2,
        tumble: 0.6 + rnd() * 0.8,
      });
    }
    return list;
  }, [N]);

  React.useLayoutEffect(() => {
    const c = new THREE.Color(ink);
    const m = frameRef.current;
    if (!m) return;
    for (let i = 0; i < N; i++) m.setColorAt(i, c);
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [N, ink]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tmp = React.useMemo(
    () => ({
      v: new THREE.Vector3(),
      o: new THREE.Object3D(),
      col: new THREE.Color(),
      inkC: new THREE.Color(ink),
      paperC: new THREE.Color(paper),
      rot: { x: 0, y: 0 },
    }),
    []
  );
  React.useEffect(() => {
    tmp.inkC.set(ink);
    tmp.paperC.set(paper);
  }, [ink, paper, tmp]);

  useFrame((state, dt) => {
    const time = reduced ? 31.4 : state.clock.elapsedTime;
    const { pointer, t } = view.current;
    const { v, o, col, inkC, paperC, rot } = tmp;

    /* camera fit to the box */
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

    /* whole drawing: slow sway + pointer / scroll parallax */
    if (root.current) {
      const ty = (reduced ? 0 : 0.14 * Math.sin(time * 0.1)) + pointer.x * 0.24;
      const tx = -pointer.y * 0.08 + (t - 0.5) * 0.1;
      const k = reduced ? 1 : Math.min(1, dt * 2.5);
      rot.y += (ty - rot.y) * k;
      rot.x += (tx - rot.x) * k;
      root.current.rotation.set(rot.x, rot.y, 0);
    }

    /* citation graph: nodes breathe, dots travel the links */
    const ng = nodeGroupRef.current;
    if (ng && !reduced) {
      for (let i = 0; i < ng.children.length; i++) {
        const g = ng.children[i];
        g.position.y = NODES[i][1] + 0.04 * Math.sin(time * 0.7 + i * 1.3);
        g.rotation.y = 0.12 * Math.sin(time * 0.4 + i);
      }
    }
    const dm = dotsRef.current;
    if (dm) {
      for (let i = 0; i < edgePaths.length; i++) {
        const e = edgePaths[i];
        let u = (e.phase + (time * 0.08 * e.dir)) % 1;
        if (u < 0) u += 1;
        v.copy(e.a).lerp(e.b, u);
        o.position.copy(v);
        o.rotation.set(0, 0, 0);
        o.scale.setScalar(1);
        o.updateMatrix();
        dm.setMatrixAt(i, o.matrix);
      }
      dm.instanceMatrix.needsUpdate = true;
    }

    /* papers */
    const fm = fillRef.current;
    const frm = frameRef.current;
    const sm = solidRef.current;
    if (fm && frm && sm) {
      for (let i = 0; i < N; i++) {
        const p = papers[i];
        let u = (time / PERIOD + p.phase) % 1;
        if (u < 0) u += 1;
        let hollow = 0; // scale of the hollow glyph
        let solid = 0; // scale of the solid plane
        let fade = 0; // 0 = ink, 1 = paper
        let x = 0;
        let y = 0;
        let z = 0;
        let rx = 0;
        let ry = 0;
        let rz = 0;

        if (u < U_DRIFT) {
          // drift from its citation node to the rim
          const e = smooth(u / U_DRIFT);
          const ex = Math.cos(p.a0) * p.r0;
          const ez = Math.sin(p.a0) * p.r0;
          x = lerp(p.spawn.x, ex, e) + 0.08 * Math.sin(time * 0.9 + p.sway) * (1 - e);
          y = lerp(p.spawn.y, RIM_Y + 0.05, e);
          z = lerp(p.spawn.z, ez, e);
          rx = lerp(p.rx0 + (reduced ? 0 : 0.15 * Math.sin(time * p.tumble + p.sway)), -WALL_TILT, e);
          ry = lerp(p.ry0, Math.PI / 2 - p.a0, e);
          rz = lerp(p.rz0, 0, e);
          hollow = 1;
        } else {
          // sliding down the funnel wall in a slow vortex
          const q = (u - U_DRIFT) / (U_NECK - U_DRIFT);
          const qq = Math.min(q, 1);
          const a = p.a0 + qq * qq * 3.4 * p.spin;
          const r = lerp(p.r0, NECK_R * 0.7, qq);
          const fy = lerp(RIM_Y, NECK_Y, qq);
          if (!p.included && q > Q_EXIT) {
            // excluded: deflect out through the wall, hollow, and fade
            const ae = p.a0 + Q_EXIT * Q_EXIT * 3.4 * p.spin;
            const re = lerp(p.r0, NECK_R * 0.7, Q_EXIT);
            const s = (u - (U_DRIFT + Q_EXIT * (U_NECK - U_DRIFT))) / 0.3;
            if (s <= 1) {
              const out = s * 0.9 + s * s * 0.7;
              x = Math.cos(ae) * (re + out);
              z = Math.sin(ae) * (re + out);
              y = lerp(RIM_Y, NECK_Y, Q_EXIT) - s * s * 0.85 + s * 0.2;
              rx = -WALL_TILT + s * 1.3 * p.spin;
              ry = Math.PI / 2 - ae + s * 0.8;
              rz = s * 0.9 * p.spin;
              fade = smooth((s - 0.25) / 0.7);
              hollow = 1;
            }
          } else if (q <= 1) {
            x = Math.cos(a) * r;
            z = Math.sin(a) * r;
            y = fy;
            rx = -WALL_TILT;
            ry = Math.PI / 2 - a;
            rz = 0;
            hollow = 1;
          } else {
            // included: through the neck, turn solid, land flat on the pile
            const s = Math.min(1, (u - U_NECK) / 0.16);
            const e = smooth(s);
            const aN = p.a0 + 3.4 * p.spin;
            const rN = NECK_R * 0.6;
            x = Math.cos(aN) * rN * (1 - e);
            z = Math.sin(aN) * rN * (1 - e);
            // fall: ease-in down through the neck, soft landing
            y = lerp(NECK_Y, PILE_TOP + 0.002, s * s * (3 - 2 * s) * 0.3 + s * 0.7);
            rx = lerp(-WALL_TILT, -Math.PI / 2, e);
            ry = lerp(Math.PI / 2 - aN, 0, e);
            rz = 0;
            // the sheet keeps its outline while it falls and fills with ink from the
            // centre as it is accepted, so the neck never reads as one black column
            hollow = s < 1 ? 1 : 0;
            solid = 0.12 + 0.88 * e;
          }
        }

        o.position.set(x, y, z);
        o.rotation.set(rx, ry, rz, "YXZ");
        o.scale.setScalar(hollow || 0.0001);
        o.updateMatrix();
        fm.setMatrixAt(i, o.matrix);
        frm.setMatrixAt(i, o.matrix);
        o.scale.setScalar(solid || 0.0001);
        o.updateMatrix();
        sm.setMatrixAt(i, o.matrix);
        col.copy(inkC).lerp(paperC, fade);
        frm.setColorAt(i, col);
      }
      fm.instanceMatrix.needsUpdate = true;
      frm.instanceMatrix.needsUpdate = true;
      sm.instanceMatrix.needsUpdate = true;
      if (frm.instanceColor) frm.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group>
      <PerspectiveCamera ref={camRef} makeDefault position={[0, LOOK_Y + 2, 8]} fov={CAM_FOV} near={0.1} far={60} />
      <group ref={root}>
        <CitationGraph nodeGroupRef={nodeGroupRef} dotsRef={dotsRef} edgePaths={edgePaths} />
        <Funnel />
        <Pile />
        {/* hollow papers: paper fill (occludes) + ink frame with text bars */}
        <instancedMesh ref={fillRef} args={[undefined, undefined, N]} renderOrder={1}>
          <planeGeometry args={[PAPER_W, PAPER_H]} />
          <meshBasicMaterial color={paper} side={THREE.DoubleSide} />
        </instancedMesh>
        <instancedMesh ref={frameRef} args={[glyph, undefined, N]} renderOrder={2}>
          <meshBasicMaterial color={ink} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
        </instancedMesh>
        {/* included papers: solid ink */}
        <instancedMesh ref={solidRef} args={[undefined, undefined, N]} renderOrder={3}>
          <planeGeometry args={[PAPER_W, PAPER_H]} />
          <meshBasicMaterial color={ink} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
        </instancedMesh>
      </group>
    </group>
  );
}
