"use client";
/**
 * "network" – the BRTC adaptive-traffic platform drawn as a live topology.
 *
 *   centre : on-premise server (hatched rack) + broker/database cylinder,
 *            operator tablet floating beside it on a dashed link
 *   ring   : private fibre loop (closed, slightly irregular polyline)
 *   4x     : junction cluster on the ring – STM32 controller chip, Jetson
 *            edge-vision unit, camera on a pole, countdown panel, signal head
 *   links  : dashed spokes controller→server with an mTLS padlock, local
 *            device links, packets (filled dots) travelling everywhere,
 *            heartbeat rings expanding at each controller and at the server
 *
 * Ink language: live lamps filled, server hatched, links thin, data dashed.
 */
import * as React from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera, RoundedBox } from "@react-three/drei";
import { InkMesh, InkMaterial, InkLine, InkFlat, useInk } from "../three/Ink";
import { useViewProgress } from "../three/useViewProgress";

/* ------------------------------------------------------------------ layout */
const RX = 4.6; // fibre ring half-width
const RZ = 2.25; // fibre ring half-depth
const THETAS = [0.66, Math.PI - 0.66, Math.PI + 0.66, -0.66];
const SERVER = new THREE.Vector3(-0.5, 0, -0.1);
const SERVER_SIZE = [0.62, 1.55, 0.56];
const DB = new THREE.Vector3(0.58, 0, 0.38);
const TABLET = new THREE.Vector3(2.15, 1.35, 1.05);
const UP = new THREE.Vector3(0, 1, 0);

function ringPoint(th, out = new THREE.Vector3()) {
  const m = 1 + 0.05 * Math.sin(3 * th + 0.7) + 0.035 * Math.sin(5 * th + 2.1);
  return out.set(RX * Math.cos(th) * m, 0, RZ * Math.sin(th) * m);
}

/** Polyline with arc-length lookup (used for ring + every link). */
class Path {
  constructor(pts, closed = false) {
    this.pts = closed ? [...pts, pts[0]] : pts;
    this.cum = [0];
    let L = 0;
    for (let i = 1; i < this.pts.length; i++) {
      L += this.pts[i].distanceTo(this.pts[i - 1]);
      this.cum.push(L);
    }
    this.len = L;
  }
  at(u, out) {
    u = ((u % 1) + 1) % 1;
    const d = u * this.len;
    let lo = 0;
    let hi = this.cum.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (this.cum[mid] <= d) lo = mid;
      else hi = mid;
    }
    const seg = this.cum[hi] - this.cum[lo] || 1;
    return out.copy(this.pts[lo]).lerp(this.pts[hi], (d - this.cum[lo]) / seg);
  }
}

function circlePts(r, n, y = 0, cx = 0, cz = 0) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, y, cz + Math.sin(a) * r]);
  }
  return pts;
}

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

/** Builds the whole static layout once. */
function buildLayout() {
  const ringPts = [];
  const N = 120;
  for (let i = 0; i < N; i++) ringPts.push(ringPoint((i / N) * Math.PI * 2));
  const ring = new Path(ringPts, true);

  const serverBase = SERVER.clone().setY(0.03);
  const clusters = THETAS.map((th, k) => {
    const c = ringPoint(th);
    const out = new THREE.Vector3(c.x / RX, 0, c.z / RZ).normalize();
    const right = new THREE.Vector3(-out.z, 0, out.x);
    const at = (a, b) => c.clone().addScaledVector(out, a).addScaledVector(right, b);
    const chip = c.clone();
    const jetson = at(0.62, -0.42);
    const camPole = at(0.3, 0.58);
    const panel = at(0.92, 0.22);
    const signal = at(1.0, -0.3);
    const camTop = camPole.clone().setY(1.05);
    // camera points at the junction (the chip) from its pole
    const camDir = chip.clone().setY(0.1).sub(camTop).normalize();
    const camQ = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().lookAt(camTop, chip.clone().setY(0.1), UP)
    );
    const apex = camTop.clone().addScaledVector(camDir, 0.24);
    const fovA = chip.clone().addScaledVector(right, 0.32).addScaledVector(out, -0.08);
    const fovB = chip.clone().addScaledVector(right, -0.26).addScaledVector(out, -0.22);
    const spoke = new Path([chip.clone().setY(0.03), serverBase.clone()]);
    const lock = chip.clone().lerp(serverBase, 0.42).setY(0.22);
    const local = [jetson, camPole, panel, signal].map(
      (p) => new Path([chip.clone().setY(0.04), p.clone().setY(0.04)])
    );
    return { k, th, c, out, right, chip, jetson, camPole, camTop, camQ, apex, fovA, fovB, panel, signal, spoke, lock, local };
  });

  const tabletLink = new Path([TABLET.clone().add(new THREE.Vector3(-0.25, -0.1, -0.1)), SERVER.clone().setY(SERVER_SIZE[1] - 0.1)]);
  return { ring, clusters, tabletLink, serverBase };
}

/* --------------------------------------------------------------- pieces */

function Server() {
  const { ink } = useInk();
  const [w, h, d] = SERVER_SIZE;
  const rackLines = React.useMemo(() => {
    const pts = [];
    const z = SERVER.z + d / 2 + 0.004;
    for (let i = 0; i < 9; i++) {
      const y = 0.16 + i * 0.15;
      pts.push([SERVER.x - w / 2 + 0.05, y, z], [SERVER.x + w / 2 - 0.05, y, z]);
    }
    return pts;
  }, [w, d]);
  const ledRef = React.useRef();
  React.useLayoutEffect(() => {
    const m = ledRef.current;
    if (!m) return;
    const o = new THREE.Object3D();
    for (let i = 0; i < 9; i++) {
      o.position.set(SERVER.x + w / 2 - 0.09, 0.235 + i * 0.15, SERVER.z + d / 2 + 0.006);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, [w, d]);
  return (
    <group>
      {/* on-premise rack – hatched */}
      <InkMesh position={[SERVER.x, h / 2, SERVER.z]} hatch={4} strength={1} fill={0.06}>
        <boxGeometry args={[w, h, d]} />
      </InkMesh>
      <InkLine points={rackLines} segments lineWidth={0.9} opacity={0.85} />
      <instancedMesh ref={ledRef} args={[undefined, undefined, 9]}>
        <circleGeometry args={[0.022, 10]} />
        <meshBasicMaterial color={ink} />
      </instancedMesh>
      {/* broker / database cylinder */}
      <InkMesh position={[DB.x, 0.42, DB.z]} hatch={6} strength={0.55} fill={0.02} threshold={40}>
        <cylinderGeometry args={[0.34, 0.34, 0.84, 28]} />
      </InkMesh>
      <InkLine points={circlePts(0.34, 40, 0.56, DB.x, DB.z)} lineWidth={0.9} />
      <InkLine points={circlePts(0.34, 40, 0.28, DB.x, DB.z)} lineWidth={0.9} />
      {/* server ↔ broker */}
      <InkLine points={[[SERVER.x + w / 2, 0.5, SERVER.z + 0.1], [DB.x - 0.34, 0.5, DB.z - 0.08]]} lineWidth={1} />
    </group>
  );
}

function Tablet() {
  const outline = React.useMemo(() => roundedRectPts(0.64, 0.44, 0.06), []);
  const screen = React.useMemo(() => roundedRectPts(0.54, 0.34, 0.02, 2), []);
  const screenLines = React.useMemo(() => {
    const pts = [];
    for (let i = 0; i < 4; i++) {
      const y = 0.11 - i * 0.075;
      pts.push([-0.22, y, 0.022], [-0.22 + 0.2 + (i % 2) * 0.14, y, 0.022]);
    }
    return pts;
  }, []);
  return (
    <group position={TABLET.toArray()} rotation={[-0.3, -0.55, 0.06]}>
      <RoundedBox args={[0.64, 0.44, 0.036]} radius={0.06} smoothness={3}>
        <InkMaterial hatch={5} strength={0.8} fill={0.02} />
      </RoundedBox>
      <InkLine points={outline} lineWidth={1} position={[0, 0, 0.019]} />
      <InkLine points={screen} lineWidth={0.8} position={[0, 0, 0.02]} />
      <InkLine points={screenLines} segments lineWidth={0.8} opacity={0.7} />
      {/* a tiny live junction map on the screen */}
      <InkLine points={circlePts(0.09, 24, 0).map(([x, , z]) => [0.12 + x, -0.02 + z, 0.022])} lineWidth={0.7} opacity={0.8} />
      <InkFlat position={[0.12, -0.02, 0.023]}>
        <circleGeometry args={[0.016, 10]} />
      </InkFlat>
      <InkFlat position={[0.19, 0.04, 0.023]}>
        <circleGeometry args={[0.012, 8]} />
      </InkFlat>
      <InkFlat position={[0.05, 0.03, 0.023]}>
        <circleGeometry args={[0.012, 8]} />
      </InkFlat>
      <InkFlat position={[0.08, -0.09, 0.023]}>
        <circleGeometry args={[0.012, 8]} />
      </InkFlat>
    </group>
  );
}

function Padlock({ position }) {
  return (
    <group position={position.toArray()}>
      <InkMesh position={[0, 0, 0]} hatch={4} strength={0.9} fill={0.12}>
        <boxGeometry args={[0.17, 0.14, 0.07]} />
      </InkMesh>
      <InkFlat position={[0, 0.07, 0]}>
        <torusGeometry args={[0.055, 0.011, 6, 16, Math.PI]} />
      </InkFlat>
      <InkFlat paper position={[0, -0.005, 0.037]}>
        <circleGeometry args={[0.022, 10]} />
      </InkFlat>
      <InkFlat paper position={[0, -0.03, 0.037]}>
        <planeGeometry args={[0.016, 0.04]} />
      </InkFlat>
    </group>
  );
}

function Cluster({ c, lampRef, barRef }) {
  const chip = c.chip;
  return (
    <group>
      {/* STM32 controller chip */}
      <InkMesh position={[chip.x, 0.045, chip.z]} hatch={5} strength={0.75} fill={0.04}>
        <boxGeometry args={[0.46, 0.075, 0.46]} />
      </InkMesh>
      <InkLine points={roundedRectPts(0.3, 0.3, 0.02, 2).map(([x, y]) => [chip.x + x, 0.085, chip.z + y])} lineWidth={0.8} opacity={0.8} />
      <InkFlat position={[chip.x - 0.17, 0.086, chip.z + 0.17]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.022, 10]} />
      </InkFlat>

      {/* Jetson edge-vision unit: box + lens */}
      <InkMesh position={[c.jetson.x, 0.12, c.jetson.z]} hatch={5} strength={0.75} fill={0.03}>
        <boxGeometry args={[0.34, 0.24, 0.26]} />
      </InkMesh>
      <InkMesh position={[c.jetson.x, 0.13, c.jetson.z + 0.13 + 0.035]} rotation={[Math.PI / 2, 0, 0]} hatch={4} strength={0.9} fill={0.08} threshold={40}>
        <cylinderGeometry args={[0.07, 0.07, 0.07, 18]} />
      </InkMesh>
      <InkFlat position={[c.jetson.x, 0.13, c.jetson.z + 0.13 + 0.071]}>
        <circleGeometry args={[0.035, 14]} />
      </InkFlat>
      <InkLine
        points={[
          [c.jetson.x - 0.12, 0.245, c.jetson.z - 0.1], [c.jetson.x - 0.12, 0.245, c.jetson.z + 0.1],
          [c.jetson.x - 0.04, 0.245, c.jetson.z - 0.1], [c.jetson.x - 0.04, 0.245, c.jetson.z + 0.1],
          [c.jetson.x + 0.04, 0.245, c.jetson.z - 0.1], [c.jetson.x + 0.04, 0.245, c.jetson.z + 0.1],
          [c.jetson.x + 0.12, 0.245, c.jetson.z - 0.1], [c.jetson.x + 0.12, 0.245, c.jetson.z + 0.1],
        ]}
        segments
        lineWidth={0.7}
        opacity={0.7}
      />

      {/* camera: cone on a pole, looking at the junction */}
      <group position={c.camTop.toArray()} quaternion={c.camQ}>
        <InkMesh position={[0, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]} hatch={4} strength={0.9} fill={0.05} threshold={50}>
          <coneGeometry args={[0.085, 0.26, 14]} />
        </InkMesh>
        <InkFlat position={[0, 0, -0.04]}>
          <sphereGeometry args={[0.03, 8, 6]} />
        </InkFlat>
      </group>

      {/* countdown panel on a post */}
      <group position={[c.panel.x, 0.62, c.panel.z]}>
        <InkMesh hatch={5} strength={0.7} fill={0.02}>
          <boxGeometry args={[0.36, 0.26, 0.035]} />
        </InkMesh>
        <InkLine points={roundedRectPts(0.3, 0.2, 0.015, 2).map(([x, y]) => [x, y, 0.019])} lineWidth={0.8} opacity={0.8} />
        {/* draining bar: scaled per frame */}
        <group position={[-0.13, -0.05, 0.02]}>
          <InkFlat ref={barRef} position={[0.13, 0, 0]}>
            <planeGeometry args={[0.26, 0.035]} />
          </InkFlat>
        </group>
        <InkLine points={[[-0.13, -0.05, 0.021], [0.13, -0.05, 0.021]]} lineWidth={0.7} opacity={0.6} />
        {/* two digit boxes (hollow) */}
        <InkLine points={[[-0.085, 0.02, 0.021], [-0.015, 0.02, 0.021], [-0.015, 0.085, 0.021], [-0.085, 0.085, 0.021], [-0.085, 0.02, 0.021]]} lineWidth={0.7} opacity={0.8} />
        <InkLine points={[[0.015, 0.02, 0.021], [0.085, 0.02, 0.021], [0.085, 0.085, 0.021], [0.015, 0.085, 0.021], [0.015, 0.02, 0.021]]} lineWidth={0.7} opacity={0.8} />
      </group>

      {/* signal head on a pole */}
      <group position={[c.signal.x, 0.98, c.signal.z]}>
        <InkMesh hatch={5} strength={0.8} fill={0.04}>
          <boxGeometry args={[0.17, 0.46, 0.13]} />
        </InkMesh>
        {/* hood */}
        <InkLine points={[[-0.085, 0.23, 0.065], [-0.085, 0.23, 0.12], [0.085, 0.23, 0.12], [0.085, 0.23, 0.065]]} lineWidth={0.8} />
        {/* live lamp – filled disk, moved per frame */}
        <InkFlat ref={lampRef} position={[0, 0.14, 0.067]}>
          <circleGeometry args={[0.043, 16]} />
        </InkFlat>
      </group>
    </group>
  );
}

/* ----------------------------------------------------------------- scene */

export default function NetworkScene({ trackRef, reduced, mobile }) {
  const view = useViewProgress(trackRef);
  const { ink, paper } = useInk();
  const L = React.useMemo(buildLayout, []);

  const root = React.useRef();
  const tabletRef = React.useRef();
  const packetsRef = React.useRef();
  const pulsesRef = React.useRef();
  const lampRefs = React.useRef([]);
  const barRefs = React.useRef([]);

  /* ---- static instanced sets: pins, poles, lamp rings ---- */
  const pinsRef = React.useRef();
  const polesRef = React.useRef();
  const lampRingsRef = React.useRef();
  const PINS_PER_SIDE = 5;
  const pinCount = L.clusters.length * 4 * PINS_PER_SIDE;

  React.useLayoutEffect(() => {
    const o = new THREE.Object3D();
    // pins
    const pins = pinsRef.current;
    if (pins) {
      let i = 0;
      for (const c of L.clusters) {
        for (let s = 0; s < 4; s++) {
          const ang = (s * Math.PI) / 2;
          const dx = Math.cos(ang);
          const dz = Math.sin(ang);
          for (let p = 0; p < PINS_PER_SIDE; p++) {
            const t = (p - (PINS_PER_SIDE - 1) / 2) * 0.075;
            o.position.set(c.chip.x + dx * 0.265 - dz * t, 0.03, c.chip.z + dz * 0.265 + dx * t);
            o.rotation.set(0, -ang, 0);
            o.updateMatrix();
            pins.setMatrixAt(i++, o.matrix);
          }
        }
      }
      pins.instanceMatrix.needsUpdate = true;
    }
    // poles (camera, panel, signal)
    const poles = polesRef.current;
    if (poles) {
      let i = 0;
      for (const c of L.clusters) {
        const list = [
          [c.camPole, 1.05],
          [c.panel, 0.49],
          [c.signal, 0.75],
        ];
        for (const [p, h] of list) {
          o.position.set(p.x, h / 2, p.z);
          o.rotation.set(0, 0, 0);
          o.scale.set(1, h, 1);
          o.updateMatrix();
          poles.setMatrixAt(i++, o.matrix);
        }
      }
      poles.instanceMatrix.needsUpdate = true;
      o.scale.set(1, 1, 1);
    }
    // hollow lamp rings (3 per head)
    const rings = lampRingsRef.current;
    if (rings) {
      let i = 0;
      for (const c of L.clusters) {
        for (let l = 0; l < 3; l++) {
          o.position.set(c.signal.x, 0.98 + 0.14 - l * 0.14, c.signal.z + 0.066);
          o.rotation.set(0, 0, 0);
          o.updateMatrix();
          rings.setMatrixAt(i++, o.matrix);
        }
      }
      rings.instanceMatrix.needsUpdate = true;
    }
  }, [L]);

  /* ---- packets ---- */
  const packets = React.useMemo(() => {
    const list = [];
    const nRing = mobile ? 10 : 20;
    for (let i = 0; i < nRing; i++) list.push({ path: L.ring, phase: i / nRing + (i % 3) * 0.013, speed: 0.55, dir: i % 4 === 0 ? -1 : 1 });
    L.clusters.forEach((c, k) => {
      const nS = mobile ? 2 : 3;
      for (let i = 0; i < nS; i++) list.push({ path: c.spoke, phase: i / nS + k * 0.07, speed: 0.75, dir: i === nS - 1 ? -1 : 1 });
      c.local.forEach((p, j) => {
        if (mobile && j % 2) return;
        list.push({ path: p, phase: (j * 0.31 + k * 0.17) % 1, speed: 0.5, dir: j % 2 ? -1 : 1 });
      });
    });
    list.push({ path: L.tabletLink, phase: 0.2, speed: 0.6, dir: 1 });
    list.push({ path: L.tabletLink, phase: 0.7, speed: 0.6, dir: -1 });
    return list;
  }, [L, mobile]);

  /* ---- static line sets ---- */
  const ringPts = React.useMemo(() => L.ring.pts.map((p) => p.toArray()), [L]);
  const spokePts = React.useMemo(() => L.clusters.flatMap((c) => c.spoke.pts.map((p) => p.toArray())), [L]);
  const localPts = React.useMemo(() => L.clusters.flatMap((c) => c.local.flatMap((p) => p.pts.map((q) => q.toArray()))), [L]);
  const fovPts = React.useMemo(
    () => L.clusters.flatMap((c) => [c.apex.toArray(), c.fovA.toArray(), c.apex.toArray(), c.fovB.toArray()]),
    [L]
  );
  const tabletPts = React.useMemo(() => L.tabletLink.pts.map((p) => p.toArray()), [L]);

  /* ---- per-frame ---- */
  const tmp = React.useMemo(() => ({ v: new THREE.Vector3(), o: new THREE.Object3D(), col: new THREE.Color(), inkC: new THREE.Color(), paperC: new THREE.Color(), rot: { x: 0, y: 0 } }), []);
  React.useEffect(() => {
    tmp.inkC.set(ink);
    tmp.paperC.set(paper);
  }, [ink, paper, tmp]);

  const PULSE_PER = 3; // rings per cluster: 2 at chip, 1 at server
  const pulseCount = L.clusters.length * PULSE_PER;

  useFrame((state, dt) => {
    const time = reduced ? 7.3 : state.clock.elapsedTime;
    const { pointer, t } = view.current;
    const { v, o, col, inkC, paperC, rot } = tmp;

    // whole topology: gentle sway, pointer tilt, scroll tilt, breathing
    if (root.current) {
      const ty = (reduced ? 0 : 0.16 * Math.sin(time * 0.11)) + pointer.x * 0.22;
      const tx = -pointer.y * 0.09 + (t - 0.5) * 0.12;
      const k = reduced ? 1 : Math.min(1, dt * 2.5);
      rot.y += (ty - rot.y) * k;
      rot.x += (tx - rot.x) * k;
      root.current.rotation.set(rot.x, rot.y, 0);
      const s = 1 + (reduced ? 0 : 0.008 * Math.sin(time * 0.7));
      root.current.scale.setScalar(s);
    }
    if (tabletRef.current && !reduced) {
      tabletRef.current.position.y = 0.04 * Math.sin(time * 0.9 + 1);
      tabletRef.current.rotation.z = 0.02 * Math.sin(time * 0.6);
    }

    // packets
    const pm = packetsRef.current;
    if (pm) {
      for (let i = 0; i < packets.length; i++) {
        const p = packets[i];
        const u = p.phase + (p.dir * time * p.speed) / p.path.len;
        p.path.at(u, v);
        o.position.copy(v);
        o.rotation.set(0, 0, 0);
        o.scale.setScalar(1);
        o.updateMatrix();
        pm.setMatrixAt(i, o.matrix);
      }
      pm.instanceMatrix.needsUpdate = true;
    }

    // heartbeat pulses: rings expand at the controller, then at the server
    const hm = pulsesRef.current;
    if (hm) {
      const period = 4.6;
      let i = 0;
      for (let k = 0; k < L.clusters.length; k++) {
        const c = L.clusters[k];
        const ph = (((time - k * 1.15) / period) % 1 + 1) % 1;
        for (let r = 0; r < PULSE_PER; r++) {
          let a = 0; // 0..1 progress of this ring, <0 or >1 = hidden
          let cx = c.chip.x;
          let cz = c.chip.z;
          let base = 0.22;
          let grow = 0.75;
          if (r === 0) a = ph / 0.5;
          else if (r === 1) a = (ph - 0.12) / 0.5;
          else {
            a = (ph - 0.58) / 0.36;
            cx = L.serverBase.x;
            cz = L.serverBase.z;
            base = 0.4;
            grow = 0.55;
          }
          const vis = a >= 0 && a <= 1;
          const sc = vis ? base + a * grow : 0.0001;
          o.position.set(cx, 0.015, cz);
          o.rotation.set(-Math.PI / 2, 0, 0);
          o.scale.set(sc, sc, 1);
          o.updateMatrix();
          hm.setMatrixAt(i, o.matrix);
          col.copy(inkC).lerp(paperC, vis ? Math.pow(a, 1.4) * 0.9 : 1);
          hm.setColorAt(i, col);
          i++;
        }
      }
      hm.instanceMatrix.needsUpdate = true;
      if (hm.instanceColor) hm.instanceColor.needsUpdate = true;
    }

    // signal heads: which lamp is live, countdown bar drains through the phase
    for (let k = 0; k < L.clusters.length; k++) {
      const cyc = 10;
      const ph = (((time + k * 2.6) / cyc) % 1 + 1) % 1;
      // red 0..0.5, green 0.5..0.9, amber 0.9..1
      let lamp;
      let f;
      if (ph < 0.5) { lamp = 0; f = ph / 0.5; }
      else if (ph < 0.9) { lamp = 2; f = (ph - 0.5) / 0.4; }
      else { lamp = 1; f = (ph - 0.9) / 0.1; }
      const lr = lampRefs.current[k];
      if (lr) lr.position.y = 0.14 - lamp * 0.14;
      const br = barRefs.current[k];
      if (br) {
        const s = Math.max(0.02, 1 - f);
        br.scale.x = s;
        br.position.x = 0.13 * s;
      }
    }
  });

  return (
    <group>
      <PerspectiveCamera makeDefault position={[0, 7.0, 10.6]} fov={30} near={0.1} far={60} onUpdate={(c) => c.lookAt(0, 0.25, 0)} />
      <group ref={root} position={[0, -0.1, 0]}>
        <group>
          {/* private fibre ring */}
          <InkLine points={ringPts} lineWidth={1.4} />
          {/* controller → server spokes (dashed = data) */}
          <InkLine points={spokePts} segments dashed dashSize={0.12} gapSize={0.07} lineWidth={0.9} opacity={0.85} />
          {/* local device links */}
          <InkLine points={localPts} segments lineWidth={0.8} opacity={0.6} />
          {/* camera fields of view */}
          <InkLine points={fovPts} segments dashed dashSize={0.06} gapSize={0.05} lineWidth={0.7} opacity={0.55} />
          {/* tablet → server */}
          <InkLine points={tabletPts} dashed dashSize={0.1} gapSize={0.07} lineWidth={0.9} opacity={0.8} />

          <Server />
          <group ref={tabletRef}>
            <Tablet />
          </group>

          {L.clusters.map((c, k) => (
            <Cluster
              key={k}
              c={c}
              lampRef={(el) => (lampRefs.current[k] = el)}
              barRef={(el) => (barRefs.current[k] = el)}
            />
          ))}
          {L.clusters.map((c, k) => (
            <Padlock key={`lock${k}`} position={c.lock} />
          ))}

          {/* chip pins */}
          <instancedMesh ref={pinsRef} args={[undefined, undefined, pinCount]}>
            <boxGeometry args={[0.07, 0.028, 0.03]} />
            <meshBasicMaterial color={ink} />
          </instancedMesh>
          {/* poles */}
          <instancedMesh ref={polesRef} args={[undefined, undefined, L.clusters.length * 3]}>
            <cylinderGeometry args={[0.016, 0.02, 1, 6]} />
            <meshBasicMaterial color={ink} />
          </instancedMesh>
          {/* hollow lamps */}
          <instancedMesh ref={lampRingsRef} args={[undefined, undefined, L.clusters.length * 3]}>
            <torusGeometry args={[0.046, 0.007, 5, 20]} />
            <meshBasicMaterial color={ink} />
          </instancedMesh>
          {/* packets */}
          <instancedMesh ref={packetsRef} args={[undefined, undefined, packets.length]}>
            <sphereGeometry args={[0.036, 7, 5]} />
            <meshBasicMaterial color={ink} />
          </instancedMesh>
          {/* heartbeat rings */}
          <instancedMesh ref={pulsesRef} args={[undefined, undefined, pulseCount]}>
            <ringGeometry args={[0.97, 1, 48]} />
            <meshBasicMaterial color={ink} side={THREE.DoubleSide} />
          </instancedMesh>
        </group>
      </group>
    </group>
  );
}
