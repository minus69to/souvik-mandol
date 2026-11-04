"use client";
/**
 * "memory" – memory poisoning of LLM agents.
 *
 *   An agent's long-term memory drawn as a vertical ledger: nine thin blocks
 *   stacked on a plinth. Beside every block a trust ring (a partial arc whose
 *   length is the block's trust score). New memories arrive along a dashed
 *   input lane from the right: a clean one (hollow outline) stacks on top,
 *   then a poisoned one (dense hatch) forces itself into the middle of the
 *   ledger and claims a full ring of trust. A translucent scanning plane
 *   sweeps down the stack; when it reaches the poisoned block its trust ring
 *   collapses, an X is drawn over it and it is ejected sideways and fades.
 *   The gap closes, the ledger commits (sinks one slot, the oldest block is
 *   archived) and the loop repeats.
 *
 * Ink language: hollow = clean memory, hatched = poisoned, partial arc = trust,
 * dashed = data lanes / tracks, translucent wire plane = the auditor.
 */
import * as React from "react";
import * as THREE from "three";
import { useSceneFrame as useFrame } from "../three/useSceneFrame";
import { PerspectiveCamera } from "@react-three/drei";
import { InkMesh, InkLine, InkWire, useInk } from "../three/Ink";
import { useViewProgress } from "../three/useViewProgress";

/* ------------------------------------------------------------------ layout */
const CAM_FOV = 26;
const CAM_DIR = new THREE.Vector3(-0.62, 0.48, 1).normalize();
const LOOK = new THREE.Vector3(0.45, 1.12, 0);
const FIT_HALF_W = 3.0;
const FIT_HALF_H = 1.78;

const N_SLOTS = 9; // resident slots, the top one is the newest arrival
const PITCH = 0.22;
const BLOCK_W = 1.5;
const BLOCK_H = 0.12;
const BLOCK_D = 0.85;
const STACK_X = -0.55;
const Y0 = 0.1; // centre of slot 0
const POISON_SLOT = 5;
const GAP = 1.3; // pitches opened for the poisoned block
const RING_X = STACK_X - BLOCK_W / 2 - 0.32;
const RING_R = 0.09;
const ARC_SEGS = 48;
const LANE_Y = Y0 + 4.5 * PITCH; // input lane height
const AGENT_X = 2.75; // the agent that writes memories
const LANE_X0 = AGENT_X; // blocks are emitted from the agent
const WAIT_X = STACK_X + BLOCK_W / 2 + 0.95; // staging position beside the stack
const EJECT_X = 4.4;
const PERIOD = 17; // seconds per loop
const TRUST = [0.82, 0.6, 0.9, 0.7, 0.55, 0.86, 0.74, 0.64, 0.78];

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

function circlePts(r, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([Math.cos(a) * r, Math.sin(a) * r, 0]);
  }
  return pts;
}

/** Flat ring strip in the XY plane, indexed clockwise from 12 o'clock so drawRange trims the arc. */
function makeArcStrip(rIn, rOut, segs) {
  const pos = new Float32Array((segs + 1) * 6);
  const idx = [];
  for (let k = 0; k <= segs; k++) {
    const a = Math.PI / 2 - (k / segs) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    pos.set([c * rIn, s * rIn, 0, c * rOut, s * rOut, 0], k * 6);
    if (k < segs) {
      const b = k * 2;
      idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

/** Diagonal hatch segments (x + y = c) clipped to a w×h rectangle centred on the origin. */
function hatchRect(w, h, sp) {
  const segs = [];
  const hw = w / 2;
  const hh = h / 2;
  for (let c = -(hw + hh) + sp / 2; c < hw + hh; c += sp) {
    const pts = [];
    let y = c + hw;
    if (y >= -hh && y <= hh) pts.push([-hw, y]);
    y = c - hw;
    if (y >= -hh && y <= hh) pts.push([hw, y]);
    let x = c + hh;
    if (x > -hw && x < hw) pts.push([x, -hh]);
    x = c - hh;
    if (x > -hw && x < hw) pts.push([x, hh]);
    if (pts.length >= 2) segs.push(pts[0], pts[1]);
  }
  return segs;
}

/** Set the opacity of every material under a group (ink shader + Line2 + basic). */
function setGroupOpacity(obj, v) {
  obj.traverse((o) => {
    const m = o.material;
    if (!m) return;
    if (m.uniforms && m.uniforms.uOpacity) m.uniforms.uOpacity.value = v;
    else m.opacity = v;
    m.transparent = v < 1;
  });
}

/* ---------------------------------------------------------------- pieces */

function TrustRing({ groupRef, arcRef }) {
  const { ink } = useInk();
  const geo = React.useMemo(() => makeArcStrip(RING_R - 0.012, RING_R + 0.012, ARC_SEGS), []);
  const track = React.useMemo(() => circlePts(RING_R, 40), []);
  return (
    <group ref={groupRef}>
      <InkLine points={track} dashed dashSize={0.022} gapSize={0.018} lineWidth={0.7} opacity={0.45} />
      <mesh ref={arcRef} geometry={geo}>
        <meshBasicMaterial color={ink} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <Flat>
        <circleGeometry args={[0.014, 10]} />
      </Flat>
    </group>
  );
}

function CleanBlock({ groupRef }) {
  return (
    <group ref={groupRef}>
      <InkMesh hatch={5} strength={0.5}>
        <boxGeometry args={[BLOCK_W, BLOCK_H, BLOCK_D]} />
      </InkMesh>
      {/* a faint record line on the top face: the memory's "entry" */}
      <InkLine
        points={[
          [-BLOCK_W / 2 + 0.14, BLOCK_H / 2 + 0.003, -BLOCK_D / 2 + 0.16],
          [-BLOCK_W / 2 + 0.14, BLOCK_H / 2 + 0.003, BLOCK_D / 2 - 0.16],
        ]}
        lineWidth={0.8}
        opacity={0.55}
      />
    </group>
  );
}

function PoisonBlock({ groupRef, xRefs }) {
  const top = React.useMemo(
    () => hatchRect(BLOCK_W - 0.04, BLOCK_D - 0.04, 0.075).map(([x, z]) => [x, BLOCK_H / 2 + 0.003, z]),
    []
  );
  const front = React.useMemo(
    () => hatchRect(BLOCK_W - 0.02, BLOCK_H - 0.01, 0.05).map(([x, y]) => [x, y, BLOCK_D / 2 + 0.003]),
    []
  );
  const side = React.useMemo(
    () => hatchRect(BLOCK_D - 0.02, BLOCK_H - 0.01, 0.05).map(([z, y]) => [BLOCK_W / 2 + 0.003, y, z]),
    []
  );
  const strokeLen = Math.hypot(0.56, 0.36);
  const strokeAng = Math.atan2(0.36, 0.56);
  return (
    <group ref={groupRef}>
      <InkMesh hatch={5} strength={1} fill={0.18}>
        <boxGeometry args={[BLOCK_W, BLOCK_H, BLOCK_D]} />
      </InkMesh>
      <InkLine points={top} segments lineWidth={0.9} />
      <InkLine points={front} segments lineWidth={0.9} />
      <InkLine points={side} segments lineWidth={0.9} />
      {/* the X: two strokes that draw from their start points */}
      <group position={[-0.28, 0.18, BLOCK_D / 2 + 0.02]} rotation={[0, 0, -strokeAng]} ref={(el) => (xRefs.current[0] = el)}>
        <InkLine points={[[0, 0, 0], [strokeLen, 0, 0]]} lineWidth={2.2} />
      </group>
      <group position={[0.28, 0.18, BLOCK_D / 2 + 0.02]} rotation={[0, 0, Math.PI + strokeAng]} ref={(el) => (xRefs.current[1] = el)}>
        <InkLine points={[[0, 0, 0], [strokeLen, 0, 0]]} lineWidth={2.2} />
      </group>
    </group>
  );
}

function ScanPlane({ groupRef }) {
  const w = BLOCK_W + 0.6;
  const d = BLOCK_D + 0.5;
  const outline = React.useMemo(
    () => [[-w / 2, 0, -d / 2], [w / 2, 0, -d / 2], [w / 2, 0, d / 2], [-w / 2, 0, d / 2], [-w / 2, 0, -d / 2]],
    [w, d]
  );
  return (
    <group ref={groupRef}>
      <InkLine points={outline} lineWidth={1.3} opacity={0.999} />
      <InkWire rotation={[-Math.PI / 2, 0, 0]} opacity={0.16}>
        <planeGeometry args={[w, d, 8, 4]} />
      </InkWire>
      <Flat rotation={[-Math.PI / 2, 0, 0]} opacity={0.08}>
        <planeGeometry args={[w, d]} />
      </Flat>
      {/* a tiny "eye" of the auditor at the plane's near corner */}
      <Flat position={[w / 2, 0.004, d / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.035, 0.05, 16]} />
      </Flat>
    </group>
  );
}

function boxEdges(w, h, d) {
  const x = w / 2;
  const y = h / 2;
  const z = d / 2;
  const c = [[-x, -y, -z], [x, -y, -z], [x, y, -z], [-x, y, -z], [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]];
  return [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]].flatMap(([a, b]) => [c[a], c[b]]);
}

/** The agent: a wireframe cube with a core, from which memories are written. */
function Agent({ coreRef, pulseRef }) {
  const edges = React.useMemo(() => boxEdges(0.62, 0.62, 0.62), []);
  const inner = React.useMemo(() => boxEdges(0.4, 0.4, 0.4), []);
  const ring = React.useMemo(() => circlePts(0.5, 48), []);
  return (
    <group position={[AGENT_X, LANE_Y, 0]}>
      <InkLine points={edges} segments lineWidth={1.2} />
      <InkLine points={inner} segments dashed dashSize={0.03} gapSize={0.025} lineWidth={0.6} opacity={0.45} />
      <group ref={coreRef}>
        <InkMesh hatch={4} strength={1} fill={0.25}>
          <octahedronGeometry args={[0.13, 0]} />
        </InkMesh>
      </group>
      <group ref={pulseRef} visible={false}>
        <InkLine points={ring} lineWidth={0.9} opacity={0.999} />
      </group>
      {/* feet: the agent stands on a small dashed pad */}
      <InkLine points={[[-0.45, -0.34, 0.45], [0.45, -0.34, 0.45], [0.45, -0.34, -0.45], [-0.45, -0.34, -0.45], [-0.45, -0.34, 0.45]]} dashed dashSize={0.05} gapSize={0.04} lineWidth={0.7} opacity={0.45} />
    </group>
  );
}

function Plinth() {
  const w = BLOCK_W + 0.5;
  const d = BLOCK_D + 0.4;
  const y = Y0 - PITCH / 2 - 0.05;
  return (
    <group position={[STACK_X, y, 0]}>
      <InkMesh hatch={5} strength={0.9} fill={0.06}>
        <boxGeometry args={[w, 0.07, d]} />
      </InkMesh>
      <InkLine
        points={[[-w / 2 - 0.25, -0.036, d / 2 + 0.2], [w / 2 + 0.25, -0.036, d / 2 + 0.2], [w / 2 + 0.25, -0.036, -d / 2 - 0.2], [-w / 2 - 0.25, -0.036, -d / 2 - 0.2], [-w / 2 - 0.25, -0.036, d / 2 + 0.2]]}
        lineWidth={0.7}
        opacity={0.5}
      />
    </group>
  );
}

function Lane() {
  const x1 = WAIT_X - 0.55;
  return (
    <group>
      <InkLine points={[[AGENT_X - 0.36, LANE_Y, 0], [x1, LANE_Y, 0]]} dashed dashSize={0.09} gapSize={0.06} lineWidth={0.9} opacity={0.6} />
      <InkLine points={[[x1 + 0.1, LANE_Y + 0.07, 0], [x1, LANE_Y, 0], [x1 + 0.1, LANE_Y - 0.07, 0]]} lineWidth={0.9} opacity={0.6} />
      {/* ledger margin: a thin rule the trust rings hang from */}
      <InkLine points={[[RING_X, Y0 - PITCH / 2 - 0.09, 0], [RING_X, Y0 + (N_SLOTS + 0.2) * PITCH, 0]]} lineWidth={0.6} opacity={0.3} />
    </group>
  );
}

/* ----------------------------------------------------------------- scene */

export default function MemoryScene({ trackRef, reduced }) {
  const view = useViewProgress(trackRef);

  const root = React.useRef();
  const camRef = React.useRef();
  const blockRefs = React.useRef([]);
  const ringRefs = React.useRef([]);
  const arcRefs = React.useRef([]);
  const poisonRef = React.useRef();
  const poisonRingRef = React.useRef();
  const poisonArcRef = React.useRef();
  const xRefs = React.useRef([]);
  const scanRef = React.useRef();
  const coreRef = React.useRef();
  const pulseRef = React.useRef();

  const tmp = React.useMemo(
    () => ({
      v: new THREE.Vector3(),
      rot: { x: 0, y: 0 },
      op: new Array(N_SLOTS).fill(-1),
      ringOp: new Array(N_SLOTS).fill(-1),
      poisonOp: -1,
      poisonRingOp: -1,
      scanOp: -1,
      pulseOp: -1,
    }),
    []
  );

  useFrame((state, dt) => {
    // reduced: the flagged moment – poison in the stack, its ring collapsed, both X strokes drawn, scan plane paused over it
    const time = reduced ? PERIOD * 0.665 : state.clock.elapsedTime;
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
      const ty = (reduced ? 0 : 0.1 * Math.sin(time * 0.09)) + pointer.x * 0.22;
      const tx = -pointer.y * 0.08 + (t - 0.5) * 0.08;
      const k = reduced ? 1 : Math.min(1, dt * 2.5);
      rot.y += (ty - rot.y) * k;
      rot.x += (tx - rot.x) * k;
      root.current.rotation.set(rot.x, rot.y, 0);
    }

    const n = Math.floor(time / PERIOD);
    const u = time / PERIOD - n;
    const lift = smooth((u - 0.26) / 0.08) - smooth((u - 0.8) / 0.08);
    const sink = smooth((u - 0.9) / 0.09);
    const slotY = (s) => Y0 + s * PITCH + (s >= POISON_SLOT ? lift * (GAP - 1) * PITCH : 0) - sink * PITCH;
    const poisonY = Y0 + (POISON_SLOT - 0.5 + GAP / 2) * PITCH - sink * PITCH;

    /* resident + arriving blocks */
    for (let i = 0; i < N_SLOTS; i++) {
      const g = blockRefs.current[i];
      const rg = ringRefs.current[i];
      const arc = arcRefs.current[i];
      if (!g || !rg || !arc) continue;
      const slot = (((i - n) % N_SLOTS) + N_SLOTS) % N_SLOTS;
      let x = STACK_X;
      let y = slotY(slot);
      let op = 1;
      let ringOp = 1;
      let frac = TRUST[i];
      if (slot === N_SLOTS - 1) {
        // the arrival: along the lane, then up into the top slot
        if (u < 0.1) {
          const s = smooth(u / 0.1);
          x = lerp(LANE_X0, WAIT_X, s);
          y = LANE_Y;
        } else if (u < 0.2) {
          const s = smooth((u - 0.1) / 0.1);
          x = lerp(WAIT_X, STACK_X, s);
          y = lerp(LANE_Y, slotY(slot), s);
        }
        ringOp = smooth((u - 0.19) / 0.04);
        frac = TRUST[i] * smooth((u - 0.22) / 0.07);
      } else if (slot === 0) {
        // the oldest record is archived while the ledger commits
        op = 1 - smooth((u - 0.9) / 0.08);
        ringOp = op;
      }
      g.position.set(x, y, 0);
      rg.position.set(RING_X, slotY(slot), 0);
      rg.visible = ringOp > 0.01;
      arc.geometry.setDrawRange(0, Math.round(frac * ARC_SEGS) * 6);
      if (op !== tmp.op[i]) {
        setGroupOpacity(g, op);
        tmp.op[i] = op;
      }
      if (ringOp !== tmp.ringOp[i]) {
        setGroupOpacity(rg, ringOp);
        tmp.ringOp[i] = ringOp;
      }
    }

    /* the poisoned block */
    const pg = poisonRef.current;
    const prg = poisonRingRef.current;
    const parc = poisonArcRef.current;
    if (pg && prg && parc) {
      let x = LANE_X0;
      let y = LANE_Y;
      let rz = 0;
      let op = 0;
      if (u >= 0.24 && u < 0.32) {
        const s = smooth((u - 0.24) / 0.08);
        x = lerp(LANE_X0, WAIT_X, s);
        op = 1;
      } else if (u >= 0.32 && u < 0.4) {
        const s = smooth((u - 0.32) / 0.08);
        x = lerp(WAIT_X, STACK_X, s);
        y = lerp(LANE_Y, poisonY, s);
        op = 1;
      } else if (u >= 0.4 && u < 0.68) {
        x = STACK_X;
        y = poisonY;
        op = 1;
      } else if (u >= 0.68 && u < 0.82) {
        const s = (u - 0.68) / 0.14;
        x = STACK_X + (EJECT_X - STACK_X) * s * s;
        y = poisonY + 0.25 * s - 1.4 * s * s;
        rz = -0.7 * s;
        op = 1 - smooth((s - 0.35) / 0.6);
      }
      pg.position.set(x, y, 0);
      pg.rotation.set(0, 0, rz);
      pg.visible = op > 0.005;
      if (op !== tmp.poisonOp) {
        setGroupOpacity(pg, op);
        tmp.poisonOp = op;
      }
      // its trust ring: claims a full ring, then collapses when the scan reaches it
      const frac = smooth((u - 0.41) / 0.05) * (1 - smooth((u - 0.6) / 0.05));
      const ringOp = smooth((u - 0.4) / 0.03) * (1 - smooth((u - 0.7) / 0.06));
      prg.position.set(RING_X, poisonY, 0);
      prg.visible = ringOp > 0.01;
      parc.geometry.setDrawRange(0, Math.round(frac * ARC_SEGS) * 6);
      if (ringOp !== tmp.poisonRingOp) {
        setGroupOpacity(prg, ringOp);
        tmp.poisonRingOp = ringOp;
      }
      // the X draws stroke by stroke
      const s1 = smooth((u - 0.605) / 0.03);
      const s2 = smooth((u - 0.635) / 0.03);
      if (xRefs.current[0]) xRefs.current[0].scale.x = Math.max(0.001, s1);
      if (xRefs.current[1]) xRefs.current[1].scale.x = Math.max(0.001, s2);
    }

    /* the agent: its core turns, and a ring pulses out whenever it writes a memory */
    const core = coreRef.current;
    if (core) {
      core.rotation.y = reduced ? 0.6 : time * 0.5;
      core.rotation.x = 0.3;
    }
    const pulse = pulseRef.current;
    if (pulse) {
      // emissions at u = 0 (clean) and u = 0.24 (poisoned)
      const e1 = u / 0.07;
      const e2 = (u - 0.24) / 0.07;
      const e = e1 >= 0 && e1 < 1 ? e1 : e2 >= 0 && e2 < 1 ? e2 : -1;
      pulse.visible = e >= 0;
      if (e >= 0) {
        pulse.scale.setScalar(0.3 + 1.1 * e);
        const op = Math.round((1 - e) * 100) / 100;
        if (op !== tmp.pulseOp) {
          pulse.children[0].material.opacity = op;
          tmp.pulseOp = op;
        }
      }
    }

    /* the scanning plane */
    const sg = scanRef.current;
    if (sg) {
      const yTop = Y0 + (N_SLOTS + 0.9) * PITCH;
      const yBottom = Y0 - 0.55 * PITCH;
      let y;
      const yPause = poisonY + 0.13;
      if (u < 0.6) y = lerp(yTop, yPause, smooth((u - 0.44) / 0.16));
      else if (u < 0.67) y = yPause;
      else y = lerp(yPause, yBottom, smooth((u - 0.67) / 0.13));
      const vis = smooth((u - 0.44) / 0.03) * (1 - smooth((u - 0.77) / 0.04));
      const flash = u >= 0.6 && u < 0.67 ? Math.sin((Math.PI * (u - 0.6)) / 0.07) : 0;
      sg.position.set(STACK_X, y, 0);
      sg.visible = vis > 0.005;
      const op = Math.round(vis * 100) / 100;
      if (op !== tmp.scanOp || flash > 0) {
        const ch = sg.children;
        for (let k = 0; k < ch.length; k++) {
          const m = ch[k].material;
          if (!m) continue;
          const base = k === 0 ? 1 : k === 1 ? 0.16 : k === 2 ? 0.07 + 0.16 * flash : 1;
          m.opacity = base * vis;
          m.transparent = true;
        }
        tmp.scanOp = op;
      }
    }
  });

  return (
    <group>
      <PerspectiveCamera ref={camRef} makeDefault position={[3, 2.5, 6]} fov={CAM_FOV} near={0.1} far={60} />
      <group ref={root}>
        <Plinth />
        <Lane />
        <Agent coreRef={coreRef} pulseRef={pulseRef} />
        {TRUST.map((_, i) => (
          <React.Fragment key={i}>
            <CleanBlock groupRef={(el) => (blockRefs.current[i] = el)} />
            <TrustRing groupRef={(el) => (ringRefs.current[i] = el)} arcRef={(el) => (arcRefs.current[i] = el)} />
          </React.Fragment>
        ))}
        <PoisonBlock groupRef={poisonRef} xRefs={xRefs} />
        <TrustRing groupRef={poisonRingRef} arcRef={poisonArcRef} />
        <ScanPlane groupRef={scanRef} />
      </group>
    </group>
  );
}
