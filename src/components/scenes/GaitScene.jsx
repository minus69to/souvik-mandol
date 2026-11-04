"use client";
/**
 * "gait" – gait analysis (BSc thesis).
 *
 *   A stick figure walks in place on a treadmill, seen from the side with a
 *   little depth: the near and far limbs sit on different planes, the belt
 *   is a real deck with rollers (their spokes turn) and the ground dashes
 *   scroll backward under the feet. The legs are driven by a proper gait
 *   cycle: hip flexion ±24°, a double-bump knee curve (loading response in
 *   stance, ~60° of flexion in swing), ankle push-off, the contralateral leg
 *   half a cycle out of phase and the arms counter-swinging. Forward
 *   kinematics keeps the stance foot on the belt, which gives the natural
 *   pelvic bob for free.
 *   To the right, two framed chart panels scroll live traces of the near
 *   leg: the knee angle curve and an EMG-like burst trace (noise gated by the
 *   stance phase). Sensor patches on the thigh and shank mark where the data
 *   comes from. The pointer tilts the whole drawing so it reads as a model.
 *
 * Ink language: thin lines = links, filled dots = joints, a ring = the head,
 * dashed = belt / baseline, framed polylines = measured signals.
 */
import * as React from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { InkMesh, InkLine, useInk } from "../three/Ink";
import { useViewProgress } from "../three/useViewProgress";

/* ------------------------------------------------------------------ layout */
const CAM_FOV = 26;
const CAM_DIR = new THREE.Vector3(0.3, 0.26, 1).normalize();
const LOOK = new THREE.Vector3(0.27, 0.72, 0);
const FIT_HALF_W = 2.28;
const FIT_HALF_H = 1.2;

const CYCLE = 1.3; // seconds per gait cycle
const BELT_SPEED = 1.0;
const FIG_X = -0.72;
const ZN = 0.075; // near-side limb plane
const ZF = -0.075; // far-side limb plane
const THIGH = 0.42;
const SHANK = 0.4;
const TORSO = 0.5;
const NECK = 0.07;
const HEAD_R = 0.1;
const UARM = 0.3;
const FARM = 0.26;
const HIP_OFF = (8 * Math.PI) / 180;

const DECK_X0 = -1.78;
const DECK_X1 = 0.3;
const DECK_W = 0.7;
const ROLLER_R = 0.085;

const CHART_X = 1.62; // centre of the chart panels
const CHART_W = 1.3;
const CHART_H = 0.46;
const CHART_Y_TOP = 1.22;
const CHART_Y_BOT = 0.56;
const WINDOW = 2.3; // seconds of history shown
const N_KNEE = 96;
const N_EMG = 200;
const N_DASH = 16;

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
const rad = (d) => (d * Math.PI) / 180;
/** gaussian bump on the unit circle, centred at c with width w */
function bump(p, c, w) {
  let d = Math.abs(p - c);
  if (d > 0.5) d = 1 - d;
  return Math.exp(-(d * d) / (w * w));
}
function hash(k) {
  const h = Math.sin(k * 12.9898 + 1.3) * 43758.5453;
  return h - Math.floor(h);
}

/* ------------------------------------------------------------ gait model */
// phase p: 0 = heel strike, ~0.6 = toe off, 1 = next heel strike
const hipAngle = (p) => HIP_OFF + rad(24) * Math.cos(2 * Math.PI * p);
const kneeAngle = (p) => rad(3 + 14 * bump(p, 0.13, 0.1) + 60 * bump(p, 0.73, 0.13));
const footAngle = (p) => rad(-22 * bump(p, 0.58, 0.07) + 10 * bump(p, 0.99, 0.05) - 6 * bump(p, 0.8, 0.12));
const emgEnvelope = (p) => 0.12 + 0.9 * bump(p, 0.07, 0.07) + 0.75 * bump(p, 0.5, 0.07);
const ankleY = (h, k) => -Math.cos(h) * THIGH - Math.cos(h - k) * SHANK;

/* ----------------------------------------------------------- live traces */
// signal samplers, in panel units (-0.5..0.5), as functions of absolute time
const kneeOf = (tt) => {
  const q = ((tt / CYCLE) % 1 + 1) % 1;
  return kneeAngle(q) / rad(70) - 0.5;
};
const emgOf = (tt) => {
  const q = ((tt / CYCLE) % 1 + 1) % 1;
  const k = Math.floor(tt / 0.011);
  return emgEnvelope(q) * (hash(k) * 2 - 1) * 0.5;
};
/** Write the last WINDOW seconds of f into a Line2's interleaved segment buffer; returns the newest value. */
function writeTrace(line, n, f, scale, time) {
  if (!line) return 0;
  const attr = line.geometry.attributes.instanceStart;
  if (!attr) return 0;
  const arr = attr.data.array;
  const x0 = -CHART_W / 2 + 0.06;
  const w = CHART_W - 0.16;
  let prevX = x0;
  let prevY = f(time - WINDOW) * scale;
  let last = prevY;
  for (let i = 1; i < n; i++) {
    const x = x0 + w * (i / (n - 1));
    const y = f(time - WINDOW * (1 - i / (n - 1))) * scale;
    const b = (i - 1) * 6;
    arr[b] = prevX;
    arr[b + 1] = prevY;
    arr[b + 2] = 0.004;
    arr[b + 3] = x;
    arr[b + 4] = y;
    arr[b + 5] = 0.004;
    prevX = x;
    prevY = y;
    last = y;
  }
  attr.data.needsUpdate = true;
  return last;
}

/* ---------------------------------------------------------------- pieces */

function Dot({ r = 0.028, ...props }) {
  return (
    <Flat {...props}>
      <sphereGeometry args={[r, 10, 8]} />
    </Flat>
  );
}

function Leg({ refs, z, patches }) {
  return (
    <group ref={(el) => (refs.hip = el)} position={[0, 0, z]}>
      <InkLine points={[[0, 0, 0], [0, -THIGH, 0]]} lineWidth={2} />
      <Dot r={0.03} />
      {patches && (
        <Flat position={[0.012, -THIGH * 0.55, 0.012]}>
          <planeGeometry args={[0.07, 0.034]} />
        </Flat>
      )}
      <group ref={(el) => (refs.knee = el)} position={[0, -THIGH, 0]}>
        <InkLine points={[[0, 0, 0], [0, -SHANK, 0]]} lineWidth={2} />
        <Dot />
        {patches && (
          <Flat position={[-0.012, -SHANK * 0.42, 0.012]}>
            <planeGeometry args={[0.06, 0.03]} />
          </Flat>
        )}
        <group ref={(el) => (refs.ankle = el)} position={[0, -SHANK, 0]}>
          <InkLine points={[[-0.05, 0, 0], [0.14, 0, 0]]} lineWidth={2} />
          <Dot r={0.024} />
        </group>
      </group>
    </group>
  );
}

function Arm({ refs, z }) {
  return (
    <group ref={(el) => (refs.shoulder = el)} position={[0, TORSO, z]}>
      <InkLine points={[[0, 0, 0], [0, -UARM, 0]]} lineWidth={1.8} />
      <Dot r={0.026} />
      <group ref={(el) => (refs.elbow = el)} position={[0, -UARM, 0]}>
        <InkLine points={[[0, 0, 0], [0, -FARM, 0]]} lineWidth={1.8} />
        <Dot r={0.022} />
        <Dot r={0.022} position={[0, -FARM, 0]} />
      </group>
    </group>
  );
}

function Figure({ figRef, torsoRef, legN, legF, armN, armF }) {
  return (
    <group ref={figRef} position={[FIG_X, 0.86, 0]}>
      {/* pelvis: axle between the hips */}
      <InkLine points={[[0, 0, ZF], [0, 0, ZN]]} lineWidth={1.4} />
      <Dot r={0.034} />
      <Leg refs={legF} z={ZF} />
      <Leg refs={legN} z={ZN} patches />
      <group ref={torsoRef}>
        <InkLine points={[[0, 0, 0], [0, TORSO, 0]]} lineWidth={2.2} />
        <InkLine points={[[0, TORSO, ZF - 0.02], [0, TORSO, ZN + 0.02]]} lineWidth={1.4} />
        <Dot r={0.03} position={[0, TORSO, 0]} />
        <InkLine points={[[0, TORSO, 0], [0.012, TORSO + NECK, 0]]} lineWidth={2} />
        <Flat position={[0.02, TORSO + NECK + HEAD_R, 0]}>
          <torusGeometry args={[HEAD_R, 0.013, 8, 36]} />
        </Flat>
        {/* the face: a dot that says which way is forward */}
        <Dot r={0.014} position={[0.02 + HEAD_R * 0.55, TORSO + NECK + HEAD_R + 0.02, 0.012]} />
        <Arm refs={armF} z={ZF - 0.02} />
        <Arm refs={armN} z={ZN + 0.02} />
      </group>
    </group>
  );
}

function Treadmill({ dashRef, spokesRef }) {
  const { ink } = useInk();
  const len = DECK_X1 - DECK_X0;
  const cx = (DECK_X0 + DECK_X1) / 2;
  const spokes = React.useMemo(() => {
    const out = [];
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI;
      out.push([Math.cos(a) * ROLLER_R * 0.9, Math.sin(a) * ROLLER_R * 0.9, 0], [-Math.cos(a) * ROLLER_R * 0.9, -Math.sin(a) * ROLLER_R * 0.9, 0]);
    }
    return out;
  }, []);
  const rail = React.useMemo(
    () => [[DECK_X0 + 0.05, 0.004, -DECK_W / 2 + 0.06], [DECK_X1 - 0.05, 0.004, -DECK_W / 2 + 0.06], [DECK_X0 + 0.05, 0.004, DECK_W / 2 - 0.06], [DECK_X1 - 0.05, 0.004, DECK_W / 2 - 0.06]],
    []
  );
  return (
    <group>
      <InkMesh position={[cx, -0.045, 0]} hatch={5} strength={0.9} fill={0.04}>
        <boxGeometry args={[len, 0.09, DECK_W]} />
      </InkMesh>
      {/* belt edges */}
      <InkLine points={rail} segments lineWidth={0.7} opacity={0.5} />
      {/* rollers */}
      {[DECK_X0, DECK_X1].map((x, i) => (
        <group key={i} position={[x, -ROLLER_R + 0.004, 0]}>
          <InkMesh rotation={[Math.PI / 2, 0, 0]} hatch={4} strength={1}>
            <cylinderGeometry args={[ROLLER_R, ROLLER_R, DECK_W + 0.06, 24]} />
          </InkMesh>
          <group ref={(el) => (spokesRef.current[i] = el)} position={[0, 0, DECK_W / 2 + 0.035]}>
            <InkLine points={spokes} segments lineWidth={0.8} />
          </group>
        </group>
      ))}
      {/* scrolling ground dashes */}
      <instancedMesh ref={dashRef} args={[undefined, undefined, N_DASH]} position={[0, 0.006, 0]}>
        <planeGeometry args={[0.16, 0.04]} />
        <meshBasicMaterial color={ink} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
      {/* console: two front posts, a bar and a small panel */}
      <InkLine
        points={[[DECK_X1 - 0.02, 0, -DECK_W / 2 + 0.04], [DECK_X1 - 0.02, 0.98, -DECK_W / 2 + 0.04], [DECK_X1 - 0.02, 0, DECK_W / 2 - 0.04], [DECK_X1 - 0.02, 0.98, DECK_W / 2 - 0.04], [DECK_X1 - 0.02, 0.98, -DECK_W / 2 + 0.04], [DECK_X1 - 0.02, 0.98, DECK_W / 2 - 0.04]]}
        segments
        lineWidth={1.3}
      />
      <InkMesh position={[DECK_X1 - 0.02, 1.07, 0]} rotation={[-0.35, 0, 0]} hatch={4} strength={0.9}>
        <boxGeometry args={[0.05, 0.16, 0.34]} />
      </InkMesh>
      {/* floor shadow line under the deck */}
      <InkLine
        points={[[DECK_X0 - 0.22, -0.17, DECK_W / 2 + 0.22], [DECK_X1 + 0.22, -0.17, DECK_W / 2 + 0.22], [DECK_X1 + 0.22, -0.17, -DECK_W / 2 - 0.22], [DECK_X0 - 0.22, -0.17, -DECK_W / 2 - 0.22], [DECK_X0 - 0.22, -0.17, DECK_W / 2 + 0.22]]}
        lineWidth={0.7}
        opacity={0.45}
      />
    </group>
  );
}

function Chart({ y, lineRef, dotRef, n, lineWidth, glyph }) {
  const frame = React.useMemo(
    () => [[-CHART_W / 2, -CHART_H / 2, 0], [CHART_W / 2, -CHART_H / 2, 0], [CHART_W / 2, CHART_H / 2, 0], [-CHART_W / 2, CHART_H / 2, 0], [-CHART_W / 2, -CHART_H / 2, 0]],
    []
  );
  const pts = React.useMemo(() => Array.from({ length: n }, (_, i) => [-CHART_W / 2 + 0.06 + (CHART_W - 0.16) * (i / (n - 1)), 0, 0.004]), [n]);
  const ticks = React.useMemo(() => {
    const out = [];
    for (let i = 0; i < 5; i++) {
      const x = -CHART_W / 2 + 0.06 + (CHART_W - 0.16) * (i / 4);
      out.push([x, -CHART_H / 2, 0], [x, -CHART_H / 2 + 0.03, 0]);
    }
    return out;
  }, []);
  return (
    <group position={[CHART_X, y, 0]}>
      <Flat paper position={[0, 0, -0.002]}>
        <planeGeometry args={[CHART_W, CHART_H]} />
      </Flat>
      <InkLine points={frame} lineWidth={1} />
      <InkLine points={ticks} segments lineWidth={0.7} opacity={0.6} />
      <InkLine points={[[-CHART_W / 2 + 0.06, 0, 0.002], [CHART_W / 2 - 0.1, 0, 0.002]]} dashed dashSize={0.03} gapSize={0.03} lineWidth={0.6} opacity={0.4} />
      {/* the "now" cursor at the right edge */}
      <InkLine points={[[CHART_W / 2 - 0.1, -CHART_H / 2 + 0.03, 0.002], [CHART_W / 2 - 0.1, CHART_H / 2 - 0.03, 0.002]]} dashed dashSize={0.02} gapSize={0.02} lineWidth={0.6} opacity={0.5} />
      <InkLine ref={lineRef} points={pts} lineWidth={lineWidth} />
      <Flat ref={dotRef} position={[CHART_W / 2 - 0.1, 0, 0.006]}>
        <circleGeometry args={[0.022, 12]} />
      </Flat>
      <group position={[-CHART_W / 2 + 0.07, CHART_H / 2 - 0.08, 0.004]}>
        <InkLine points={glyph} lineWidth={1.2} />
      </group>
    </group>
  );
}

/* ----------------------------------------------------------------- scene */

export default function GaitScene({ trackRef, reduced, mobile }) {
  const view = useViewProgress(trackRef);

  const root = React.useRef();
  const camRef = React.useRef();
  const figRef = React.useRef();
  const torsoRef = React.useRef();
  const legN = React.useRef({}).current;
  const legF = React.useRef({}).current;
  const armN = React.useRef({}).current;
  const armF = React.useRef({}).current;
  const dashRef = React.useRef();
  const spokesRef = React.useRef([]);
  const kneeLine = React.useRef();
  const emgLine = React.useRef();
  const kneeDot = React.useRef();
  const emgDot = React.useRef();

  const nEmg = mobile ? N_EMG / 2 : N_EMG;
  const kneeGlyph = React.useMemo(() => [[0, 0.07, 0], [0, 0, 0], [0.09, 0, 0], [0.09, 0.02, 0], [0.06, 0.05, 0], [0.03, 0.06, 0], [0, 0.07, 0]], []);
  const emgGlyph = React.useMemo(() => [[0, 0.03, 0], [0.025, 0.03, 0], [0.04, 0.08, 0], [0.06, -0.02, 0], [0.075, 0.03, 0], [0.1, 0.03, 0]], []);

  const tmp = React.useMemo(() => ({ v: new THREE.Vector3(), o: new THREE.Object3D(), rot: { x: 0, y: 0 } }), []);

  // the trace buffers are written directly: mark them dynamic and never cull them
  React.useEffect(() => {
    for (const r of [kneeLine, emgLine]) {
      const l = r.current;
      if (!l) continue;
      l.frustumCulled = false;
      const a = l.geometry.attributes.instanceStart;
      if (a) a.data.setUsage(THREE.DynamicDrawUsage);
    }
  });

  useFrame((state, dt) => {
    const time = reduced ? CYCLE * 0.42 : state.clock.elapsedTime;
    const { pointer, t } = view.current;
    const { v, o, rot } = tmp;

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

    /* whole drawing: the pointer tilts the model, scroll adds a little pitch */
    if (root.current) {
      const ty = (reduced ? 0 : 0.08 * Math.sin(time * 0.07)) + pointer.x * 0.32;
      const tx = -pointer.y * 0.12 + (t - 0.5) * 0.08;
      const k = reduced ? 1 : Math.min(1, dt * 2.5);
      rot.y += (ty - rot.y) * k;
      rot.x += (tx - rot.x) * k;
      root.current.rotation.set(rot.x, rot.y, 0);
    }

    /* gait cycle */
    const p = ((time / CYCLE) % 1 + 1) % 1;
    const pN = p;
    const pF = (p + 0.5) % 1;
    const hN = hipAngle(pN);
    const kN = kneeAngle(pN);
    const fN = footAngle(pN);
    const hF = hipAngle(pF);
    const kF = kneeAngle(pF);
    const fF = footAngle(pF);
    const fig = figRef.current;
    if (fig) {
      // the lower foot rests on the belt: forward kinematics gives the pelvic bob
      const pelY = 0.05 - Math.min(ankleY(hN, kN), ankleY(hF, kF));
      fig.position.set(FIG_X, pelY, 0);
      fig.rotation.set(0, 0, 0.015 * Math.sin(4 * Math.PI * p + 1));
    }
    if (legN.hip) {
      legN.hip.rotation.z = hN;
      legN.knee.rotation.z = -kN;
      legN.ankle.rotation.z = fN - (hN - kN);
      legF.hip.rotation.z = hF;
      legF.knee.rotation.z = -kF;
      legF.ankle.rotation.z = fF - (hF - kF);
    }
    if (torsoRef.current) torsoRef.current.rotation.z = -0.07 + 0.015 * Math.sin(4 * Math.PI * p);
    if (armN.shoulder) {
      // arms counter-swing: the near arm follows the far leg
      armN.shoulder.rotation.z = (hF - HIP_OFF) * 0.8;
      armF.shoulder.rotation.z = (hN - HIP_OFF) * 0.8;
      armN.elbow.rotation.z = 0.32 + 0.3 * (0.5 + 0.5 * Math.cos(2 * Math.PI * pF));
      armF.elbow.rotation.z = 0.32 + 0.3 * (0.5 + 0.5 * Math.cos(2 * Math.PI * pN));
    }

    /* treadmill: dashes scroll backward, roller spokes turn */
    const dm = dashRef.current;
    if (dm) {
      const len = DECK_X1 - DECK_X0;
      const rows = 2;
      const per = N_DASH / rows;
      for (let i = 0; i < N_DASH; i++) {
        const row = i % rows;
        const k = Math.floor(i / rows);
        let u = ((k / per) - (time * BELT_SPEED) / len) % 1;
        if (u < 0) u += 1;
        const x = DECK_X0 + u * len;
        const edge = Math.min(smooth((u - 0.02) / 0.1), smooth((0.98 - u) / 0.1));
        o.position.set(x, 0, (row - 0.5) * 0.32);
        o.rotation.set(-Math.PI / 2, 0, 0);
        o.scale.set(Math.max(0.001, edge), 1, 1);
        o.updateMatrix();
        dm.setMatrixAt(i, o.matrix);
      }
      dm.instanceMatrix.needsUpdate = true;
    }
    const spokes = spokesRef.current;
    for (let i = 0; i < spokes.length; i++) if (spokes[i]) spokes[i].rotation.z = -(time * BELT_SPEED) / ROLLER_R;

    /* live traces: knee angle and EMG of the near leg, newest sample at the right */
    const ky = writeTrace(kneeLine.current, N_KNEE, kneeOf, CHART_H * 0.8, time);
    const ey = writeTrace(emgLine.current, nEmg, emgOf, CHART_H * 0.8, time);
    if (kneeDot.current) kneeDot.current.position.y = ky;
    if (emgDot.current) emgDot.current.position.y = ey;
  });

  return (
    <group>
      <PerspectiveCamera ref={camRef} makeDefault position={[2, 2, 7]} fov={CAM_FOV} near={0.1} far={60} />
      <group ref={root}>
        <Treadmill dashRef={dashRef} spokesRef={spokesRef} />
        <Figure figRef={figRef} torsoRef={torsoRef} legN={legN} legF={legF} armN={armN} armF={armF} />
        <Chart y={CHART_Y_TOP} lineRef={kneeLine} dotRef={kneeDot} n={N_KNEE} lineWidth={1.5} glyph={kneeGlyph} />
        <Chart y={CHART_Y_BOT} lineRef={emgLine} dotRef={emgDot} n={nEmg} lineWidth={1.1} glyph={emgGlyph} />
        {/* leads from the sensors to the panels */}
        <InkLine points={[[FIG_X + 0.1, 0.62, ZN + 0.02], [CHART_X - CHART_W / 2 - 0.08, 0.62, 0], [CHART_X - CHART_W / 2, CHART_Y_TOP, 0]]} dashed dashSize={0.04} gapSize={0.035} lineWidth={0.6} opacity={0.35} />
        <InkLine points={[[FIG_X + 0.1, 0.3, ZN + 0.02], [CHART_X - CHART_W / 2 - 0.16, 0.3, 0], [CHART_X - CHART_W / 2, CHART_Y_BOT, 0]]} dashed dashSize={0.04} gapSize={0.035} lineWidth={0.6} opacity={0.35} />
      </group>
    </group>
  );
}
