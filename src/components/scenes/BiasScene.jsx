"use client";
/**
 * "bias" – political bias in LLM-rewritten Bengali news.
 *
 *   A balance scale drawn as an instrument: plinth, pillar with a knife-edge
 *   fulcrum, a pivot ring, a beam with a needle over a small dial, and two
 *   thin pan discs hanging on three-string bridles. Above the pivot floats a
 *   wireframe box with a tiny net inside – the LLM. News sheets wait upright
 *   in a rack on the left, travel along a dashed lane into the box, and come
 *   out rewritten: their evenly spaced text bars leave shifted and denser.
 *   Each rewritten sheet flutters down into one of the pans; the beam tilts
 *   with the load difference and slowly recovers as the sheets fade. Every
 *   so often a human-evaluation check mark appears over a landed sheet.
 *
 * Ink language: evenly spaced bars = original text, dense shifted bars =
 * rewritten text, dashed = data lane, wire box = the model, a tick = a human.
 */
import * as React from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { InkMesh, InkLine, useInk } from "../three/Ink";
import { useViewProgress } from "../three/useViewProgress";

/* ------------------------------------------------------------------ layout */
const CAM_FOV = 26;
const CAM_DIR = new THREE.Vector3(0.42, 0.3, 1).normalize();
const LOOK = new THREE.Vector3(-0.22, 1.28, 0);
const FIT_HALF_W = 2.5;
const FIT_HALF_H = 1.68;

const PIVOT_Y = 1.5;
const BEAM_HALF = 1.2;
const STRING_L = 0.72;
const PAN_R = 0.36;
const BOX = { x: 0, y: 2.25, w: 0.82, h: 0.56, d: 0.56 };
const LANE_Y = BOX.y;
const TRAY_X = -1.95;
const TRAY_Y = LANE_Y - 0.32;
const BOX_IN_X = -0.43;
const BOX_OUT_X = 0.43;
const SHEET_W = 0.3;
const SHEET_H = 0.4;

const K = 6; // sheets per loop
const PERIOD = 21;
const STAGGER = PERIOD / K;
const T_BOX_IN = 1.5;
const T_BOX_OUT = 2.7;
const T_LAND = 4.5;
const T_FADE = 8.5;
const LIFE = 10.5;
const SIDES = [1, 1, -1, 1, 1, -1]; // +1 = the right (+x) pan: the rewrite leans one way
const CHECKED = [true, false, false, true, false, false];
const AMP = 0.07; // radians of tilt per sheet
const MAX_TILT = 0.21;

/* --------------------------------------------------------------- helpers */

/** Flat fill in true paper/ink: the shared canvas tone-maps basic materials, which greys pure white. */
function Flat({ children, opacity = 1, paper = false, ...meshProps }) {
  const { ink, paper: paperCol } = useInk();
  return (
    <mesh {...meshProps}>
      {children}
      <meshBasicMaterial color={paper ? paperCol : ink} transparent={opacity < 1} opacity={opacity} toneMapped={false} />
    </mesh>
  );
}
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const lerp = (a, b, k) => a + (b - a) * k;

function rect(x, y, w, h) {
  const s = new THREE.Shape();
  s.moveTo(x - w / 2, y - h / 2);
  s.lineTo(x + w / 2, y - h / 2);
  s.lineTo(x + w / 2, y + h / 2);
  s.lineTo(x - w / 2, y + h / 2);
  s.closePath();
  return s;
}

function rectPts(w, h, z = 0) {
  return [[-w / 2, -h / 2, z], [w / 2, -h / 2, z], [w / 2, h / 2, z], [-w / 2, h / 2, z], [-w / 2, -h / 2, z]];
}

function boxEdges(w, h, d) {
  const x = w / 2;
  const y = h / 2;
  const z = d / 2;
  const c = [
    [-x, -y, -z], [x, -y, -z], [x, y, -z], [-x, y, -z],
    [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z],
  ];
  const e = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  return e.flatMap(([a, b]) => [c[a], c[b]]);
}

/** Load response of the beam to a sheet that landed dt seconds ago. */
function loadResponse(dt) {
  if (dt <= 0) return 0;
  return (1 - Math.exp(-dt / 0.3)) * Math.exp(-dt / 6) * (1 + 0.3 * Math.exp(-dt / 1.4) * Math.cos(dt * 7));
}

function setOpacity(rec, v) {
  for (const key of ["paper", "outline", "barsA", "barsB", "check"]) {
    const o = rec[key];
    if (!o || !o.material) continue;
    o.material.opacity = v;
    o.material.transparent = true;
  }
}

/* ---------------------------------------------------------------- pieces */

function Scale({ beamRef, hangLRef, hangRRef }) {
  const dial = React.useMemo(() => {
    const pts = [];
    const r = 0.34;
    for (let i = 0; i <= 24; i++) {
      const a = -Math.PI / 2 + lerp(-0.45, 0.45, i / 24);
      pts.push([Math.cos(a) * r, Math.sin(a) * r, 0]);
    }
    return pts;
  }, []);
  const ticks = React.useMemo(() => {
    const out = [];
    for (let k = -2; k <= 2; k++) {
      const a = -Math.PI / 2 + k * 0.2;
      const l = k === 0 ? 0.08 : 0.045;
      out.push([Math.cos(a) * 0.34, Math.sin(a) * 0.34, 0], [Math.cos(a) * (0.34 + l), Math.sin(a) * (0.34 + l), 0]);
    }
    return out;
  }, []);
  const bridle = React.useMemo(() => {
    const out = [];
    for (let k = 0; k < 3; k++) {
      const a = Math.PI / 2 + (k * Math.PI * 2) / 3;
      out.push([0, 0, 0], [Math.cos(a) * PAN_R * 0.92, -STRING_L, Math.sin(a) * PAN_R * 0.92]);
    }
    return out;
  }, []);

  const renderHang = (hangRef) => (
    <group ref={hangRef}>
      <InkLine points={bridle} segments lineWidth={0.8} />
      <Flat>
        <circleGeometry args={[0.022, 12]} />
      </Flat>
      <InkMesh position={[0, -STRING_L - 0.012, 0]} hatch={4} strength={0.9}>
        <cylinderGeometry args={[PAN_R, PAN_R, 0.024, 48]} />
      </InkMesh>
      {/* a faint inner circle so the pan reads as a dish */}
      <InkLine
        points={Array.from({ length: 41 }, (_, i) => {
          const a = (i / 40) * Math.PI * 2;
          return [Math.cos(a) * PAN_R * 0.78, -STRING_L + 0.002, Math.sin(a) * PAN_R * 0.78];
        })}
        lineWidth={0.6}
        opacity={0.45}
      />
    </group>
  );

  return (
    <group>
      {/* plinth + base */}
      <InkMesh position={[0, 0.025, 0]} hatch={5} strength={0.9} fill={0.06}>
        <boxGeometry args={[1.7, 0.05, 0.8]} />
      </InkMesh>
      <InkMesh position={[0, 0.09, 0]} hatch={5} strength={0.9}>
        <boxGeometry args={[1.2, 0.08, 0.56]} />
      </InkMesh>
      {/* pillar and knife-edge fulcrum */}
      <InkMesh position={[0, 0.13 + (PIVOT_Y - 0.26) / 2, 0]} hatch={5} strength={0.9}>
        <boxGeometry args={[0.09, PIVOT_Y - 0.26, 0.09]} />
      </InkMesh>
      <InkMesh position={[0, PIVOT_Y - 0.13 + 0.07, 0]} hatch={4} strength={1}>
        <coneGeometry args={[0.11, 0.14, 4]} />
      </InkMesh>
      {/* dial on the pillar face */}
      <group position={[0, PIVOT_Y, 0.06]}>
        <InkLine points={dial} lineWidth={0.8} opacity={0.75} />
        <InkLine points={ticks} segments lineWidth={0.8} opacity={0.75} />
      </group>
      {/* beam, needle, pivot ring – rotates about the pivot */}
      <group ref={beamRef} position={[0, PIVOT_Y, 0]}>
        <InkMesh hatch={4} strength={1}>
          <boxGeometry args={[BEAM_HALF * 2, 0.045, 0.07]} />
        </InkMesh>
        <InkLine points={[[0, 0, 0.07], [0, -0.3, 0.07]]} lineWidth={1.4} />
        <Flat position={[0, 0, 0.075]}>
          <ringGeometry args={[0.04, 0.062, 24]} />
        </Flat>
        <Flat position={[0, 0, 0.076]}>
          <circleGeometry args={[0.014, 12]} />
        </Flat>
        {/* end hooks */}
        <InkLine points={[[-BEAM_HALF, 0.023, 0], [-BEAM_HALF, -0.05, 0], [BEAM_HALF, 0.023, 0], [BEAM_HALF, -0.05, 0]]} segments lineWidth={1} />
      </group>
      {renderHang(hangLRef)}
      {renderHang(hangRRef)}
    </group>
  );
}

function ModelBox({ netRef, ringRef }) {
  const edges = React.useMemo(() => boxEdges(BOX.w, BOX.h, BOX.d), []);
  const net = React.useMemo(() => {
    const cols = [-0.24, 0, 0.24];
    const rows = [-0.15, 0, 0.15];
    const nodes = [];
    const links = [];
    for (const x of cols) for (const y of rows) nodes.push([x, y, 0]);
    for (let c = 0; c < 2; c++) for (const y1 of rows) for (const y2 of rows) links.push([cols[c], y1, 0], [cols[c + 1], y2, 0]);
    return { nodes, links };
  }, []);
  const ring = React.useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 48; i++) pts.push([Math.cos((i / 48) * Math.PI * 2) * 0.5, Math.sin((i / 48) * Math.PI * 2) * 0.5, 0]);
    return pts;
  }, []);
  return (
    <group position={[BOX.x, BOX.y, 0]}>
      <InkLine points={edges} segments lineWidth={1.2} />
      <InkLine points={[[0, -BOX.h / 2, 0], [0, PIVOT_Y + 0.09 - BOX.y, 0]]} dashed dashSize={0.04} gapSize={0.035} lineWidth={0.7} opacity={0.4} />
      {/* inner dashed box: the model's context window */}
      <InkLine points={boxEdges(BOX.w * 0.8, BOX.h * 0.76, BOX.d * 0.76)} segments dashed dashSize={0.03} gapSize={0.025} lineWidth={0.6} opacity={0.4} />
      <group ref={netRef} position={[0, 0, -0.18]}>
        <InkLine points={net.links} segments lineWidth={0.6} opacity={0.5} />
        {net.nodes.map((p, i) => (
          <Flat key={i} position={p}>
            <circleGeometry args={[0.02, 10]} />
          </Flat>
        ))}
      </group>
      <group ref={ringRef} visible={false}>
        <InkLine points={ring} lineWidth={0.9} opacity={0.999} />
      </group>
    </group>
  );
}

function Rack() {
  const outline = React.useMemo(() => rectPts(SHEET_W, SHEET_H), []);
  const bars = React.useMemo(
    () => [-0.12, -0.04, 0.04, 0.12].flatMap((y) => [[-0.1, y, 0.002], [0.1, y, 0.002]]),
    []
  );
  const tray = React.useMemo(() => {
    const w = SHEET_W + 0.16;
    const h = SHEET_H + 0.16;
    return [[-w / 2, -0.016, h / 2], [w / 2, -0.016, h / 2], [w / 2, -0.016, -h / 2], [-w / 2, -0.016, -h / 2], [-w / 2, -0.016, h / 2]];
  }, []);
  return (
    <group position={[TRAY_X, TRAY_Y, 0]}>
      {/* in-tray: a pile of unread sheets */}
      <InkLine points={tray} lineWidth={1} />
      <InkLine points={[tray[0], [tray[0][0], 0.09, tray[0][2]], tray[3], [tray[3][0], 0.09, tray[3][2]]]} segments lineWidth={1} />
      {[0, 1, 2, 3].map((i) => (
        <group key={i} position={[0.012 * Math.sin(i * 2.1), i * 0.014, 0.012 * Math.cos(i * 1.3)]} rotation={[-Math.PI / 2, 0, 0.06 * Math.sin(i * 1.7)]}>
          <Flat paper>
            <planeGeometry args={[SHEET_W, SHEET_H]} />
          </Flat>
          <InkLine points={outline} lineWidth={0.9} />
          {i === 3 && <InkLine points={bars} segments lineWidth={0.7} opacity={0.7} />}
        </group>
      ))}
    </group>
  );
}

function Lane() {
  const x0 = TRAY_X + 0.42;
  const x1 = BOX_IN_X - 0.25;
  return (
    <group>
      <InkLine points={[[x0, LANE_Y, 0], [x1, LANE_Y, 0]]} dashed dashSize={0.08} gapSize={0.05} lineWidth={0.9} opacity={0.6} />
      <InkLine points={[[x1 - 0.09, LANE_Y + 0.06, 0], [x1, LANE_Y, 0], [x1 - 0.09, LANE_Y - 0.06, 0]]} lineWidth={0.9} opacity={0.6} />
    </group>
  );
}

function Sheet({ rec, glyphA, glyphB, outline, check }) {
  const { ink, paper } = useInk();
  return (
    <group ref={(el) => (rec.g = el)} visible={false}>
      <mesh ref={(el) => (rec.paper = el)} renderOrder={1}>
        <planeGeometry args={[SHEET_W, SHEET_H]} />
        <meshBasicMaterial color={paper} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <InkLine ref={(el) => (rec.outline = el)} points={outline} lineWidth={1} renderOrder={2} />
      <mesh ref={(el) => (rec.barsA = el)} geometry={glyphA} position={[0, 0, 0.003]} renderOrder={2}>
        <meshBasicMaterial color={ink} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh ref={(el) => (rec.barsB = el)} geometry={glyphB} position={[0, 0, 0.003]} renderOrder={2} visible={false}>
        <meshBasicMaterial color={ink} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <group ref={(el) => (rec.checkG = el)} visible={false}>
        <InkLine ref={(el) => (rec.check = el)} points={check} lineWidth={2.6} opacity={0.999} />
      </group>
    </group>
  );
}

/* ----------------------------------------------------------------- scene */

export default function BiasScene({ trackRef, reduced }) {
  const view = useViewProgress(trackRef);

  const root = React.useRef();
  const camRef = React.useRef();
  const beamRef = React.useRef();
  const hangLRef = React.useRef();
  const hangRRef = React.useRef();
  const netRef = React.useRef();
  const ringRef = React.useRef();
  const recs = React.useMemo(() => Array.from({ length: K }, () => ({ op: -1 })), []);

  const outline = React.useMemo(() => rectPts(SHEET_W, SHEET_H, 0.003), []);
  const check = React.useMemo(() => [[-0.11, 0.0, 0], [-0.035, -0.08, 0], [0.13, 0.11, 0]], []);
  // original: evenly spaced bars; rewritten: denser, shifted, uneven
  const glyphA = React.useMemo(
    () => new THREE.ShapeGeometry([0.13, 0.065, 0, -0.065, -0.13].map((y, i) => rect(-0.02 + (i === 4 ? -0.04 : 0), y, i === 4 ? 0.14 : 0.21, 0.018))),
    []
  );
  const glyphB = React.useMemo(
    () =>
      new THREE.ShapeGeometry(
        [
          rect(0.02, 0.14, 0.2, 0.026),
          rect(-0.03, 0.095, 0.16, 0.014),
          rect(0.04, 0.055, 0.18, 0.014),
          rect(0.0, 0.015, 0.22, 0.02),
          rect(0.05, -0.03, 0.14, 0.014),
          rect(-0.02, -0.07, 0.2, 0.014),
          rect(0.03, -0.11, 0.16, 0.02),
          rect(-0.05, -0.15, 0.1, 0.014),
        ]
      ),
    []
  );

  const tmp = React.useMemo(() => ({ v: new THREE.Vector3(), rot: { x: 0, y: 0 }, ringOp: -1 }), []);

  useFrame((state, dt) => {
    const time = reduced ? 19.3 : state.clock.elapsedTime;
    const { pointer, t } = view.current;
    const { v, rot } = tmp;

    /* camera fit to the box */
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

    /* whole drawing: slow sway + pointer / scroll parallax */
    if (root.current) {
      const ty = (reduced ? 0 : 0.1 * Math.sin(time * 0.08)) + pointer.x * 0.24;
      const tx = -pointer.y * 0.07 + (t - 0.5) * 0.08;
      const k = reduced ? 1 : Math.min(1, dt * 2.5);
      rot.y += (ty - rot.y) * k;
      rot.x += (tx - rot.x) * k;
      root.current.rotation.set(rot.x, rot.y, 0);
    }

    /* beam angle from every landing in this and the previous loop */
    let angle = 0;
    for (let i = 0; i < K; i++) {
      const dtl = (((time - i * STAGGER - T_LAND) % PERIOD) + PERIOD) % PERIOD;
      // a load on the +x pan pulls that end down, i.e. a negative (clockwise) beam angle
      angle -= SIDES[i] * AMP * (loadResponse(dtl) + loadResponse(dtl + PERIOD));
    }
    angle = Math.max(-MAX_TILT, Math.min(MAX_TILT, angle));
    if (reduced) angle = -0.16;
    if (beamRef.current) beamRef.current.rotation.z = angle;
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    const hl = hangLRef.current;
    const hr = hangRRef.current;
    if (hl) hl.position.set(-BEAM_HALF * ca, PIVOT_Y - BEAM_HALF * sa - 0.05, 0);
    if (hr) hr.position.set(BEAM_HALF * ca, PIVOT_Y + BEAM_HALF * sa - 0.05, 0);

    /* sheets */
    let inBox = 0;
    let lastExit = 99;
    for (let i = 0; i < K; i++) {
      const rec = recs[i];
      const g = rec.g;
      if (!g) continue;
      const age = (((time - i * STAGGER) % PERIOD) + PERIOD) % PERIOD;
      if (age >= LIFE) {
        g.visible = false;
        continue;
      }
      g.visible = true;
      const side = SIDES[i];
      const panX = side * BEAM_HALF * ca;
      const panY = PIVOT_Y + side * BEAM_HALF * sa - 0.05 - STRING_L + 0.004 + 0.012 * (i % 3);
      const jx = 0.05 * Math.sin(i * 2.3);
      const jz = 0.06 * Math.cos(i * 1.7);
      let x = 0;
      let y = LANE_Y;
      let z = 0;
      let rx = 0;
      let ry = 0;
      let rz = 0;
      let rewritten = false;
      let op = 1;
      if (age < T_BOX_IN) {
        const s = smooth(age / T_BOX_IN);
        const up = smooth(age / 0.55);
        x = lerp(TRAY_X, BOX_IN_X, s);
        y = lerp(TRAY_Y + 0.06, LANE_Y, up) + 0.06 * Math.sin(s * Math.PI);
        rx = (-Math.PI / 2) * (1 - up);
        rz = 0.1 * (1 - s);
      } else if (age < T_BOX_OUT) {
        const s = (age - T_BOX_IN) / (T_BOX_OUT - T_BOX_IN);
        x = lerp(BOX_IN_X, BOX_OUT_X, s);
        rewritten = s > 0.5;
        inBox = 1;
        y = LANE_Y + 0.006 * Math.sin(time * 40);
      } else if (age < T_LAND) {
        const s = (age - T_BOX_OUT) / (T_LAND - T_BOX_OUT);
        const e = smooth(s);
        x = lerp(BOX_OUT_X + 0.25, panX + jx, e) + 0.12 * Math.sin(s * Math.PI * 2.5) * (1 - s);
        y = lerp(LANE_Y, panY, s < 0.2 ? s * s * 2.5 * 0.1 : 0.01 + (s - 0.2) / 0.8 * 0.99 * (1 - 0.3 * (1 - s)));
        z = lerp(0, jz, e);
        rx = (-Math.PI / 2) * smooth((s - 0.1) / 0.8);
        rz = 0.4 * Math.sin(s * Math.PI * 2) * (1 - s);
        ry = 0.3 * Math.sin(s * Math.PI * 1.5) * (1 - s) + e * 0.2 * side;
        rewritten = true;
        if (age - T_BOX_OUT < lastExit) lastExit = age - T_BOX_OUT;
      } else {
        x = panX + jx;
        y = panY;
        z = jz;
        rx = -Math.PI / 2;
        ry = 0.2 * side;
        rewritten = true;
        op = 1 - smooth((age - T_FADE) / (LIFE - T_FADE));
      }
      g.position.set(x, y, z);
      g.rotation.set(rx, ry, rz, "YXZ");
      rec.barsA.visible = !rewritten;
      rec.barsB.visible = rewritten;
      // human evaluation: a check mark over some landed sheets
      const cg = rec.checkG;
      if (cg) {
        const cs = CHECKED[i] ? smooth((age - T_LAND - 0.5) / 0.35) : 0;
        cg.visible = cs > 0.001;
        if (cg.visible) {
          cg.scale.setScalar(cs);
          // keep the tick upright and facing the viewer while the sheet lies flat
          cg.position.set(0, 0, 0.22);
          cg.rotation.set(Math.PI / 2, -0.2 * side, 0);
        }
      }
      const q = Math.round(op * 100) / 100;
      if (q !== rec.op) {
        setOpacity(rec, q);
        rec.op = q;
      }
    }

    /* the model "thinks" while a sheet is inside; a ring broadcasts each rewrite */
    const net = netRef.current;
    if (net) {
      const k = reduced ? 1 : Math.min(1, dt * 6);
      const target = 1 + 0.18 * inBox * (0.7 + 0.3 * Math.sin(time * 9));
      net.scale.setScalar(net.scale.x + (target - net.scale.x) * k);
    }
    const ring = ringRef.current;
    if (ring) {
      const show = lastExit < 1.0;
      ring.visible = show;
      if (show) {
        const s = lastExit / 1.0;
        ring.scale.setScalar(0.5 + 1.4 * s);
        const op = Math.round((1 - s) * 100) / 100;
        if (op !== tmp.ringOp) {
          ring.children[0].material.opacity = op;
          tmp.ringOp = op;
        }
      }
    }
  });

  return (
    <group>
      <PerspectiveCamera ref={camRef} makeDefault position={[2.5, 3, 6]} fov={CAM_FOV} near={0.1} far={60} />
      <group ref={root}>
        <Scale beamRef={beamRef} hangLRef={hangLRef} hangRRef={hangRRef} />
        <ModelBox netRef={netRef} ringRef={ringRef} />
        <Rack />
        <Lane />
        {recs.map((rec, i) => (
          <Sheet key={i} rec={rec} glyphA={glyphA} glyphB={glyphB} outline={outline} check={check} />
        ))}
      </group>
    </group>
  );
}
