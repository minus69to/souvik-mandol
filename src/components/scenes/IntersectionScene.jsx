"use client";
/**
 * HERO SCENE — "intersection"
 * A tilted top-down ink drawing of a four-way Dhaka intersection with a live,
 * queue-based adaptive signal controller. Vehicles (instanced boxes) drive in,
 * queue bumper-to-bumper on red and flow through on green. One camera pole with
 * a dashed vision cone watches the north approach; a countdown bar under each
 * active signal head shrinks as the green runs out. The camera orbits slowly,
 * follows the pointer a little and tilts to a plan view as the hero scrolls away.
 */
import * as React from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { InkMesh, InkLine, InkFlat, useInk } from "../three/Ink";
import { useViewProgress } from "../three/useViewProgress";

/* ------------------------------------------------------------------ layout */
const RW = 3.1; // road half width (edge to centre line)
const L = 26; // approach length from entry to intersection centre
const ZEBRA = 1.3; // zebra crossing depth
const S_STOP = L - RW - 0.55 - ZEBRA; // stop line, measured along the approach
const LANE_LAT = [1.0, 2.4]; // lane centres, lateral offset from road centre
const MEDIAN_HALF = 0.32;
const EXT = 7; // road drawn this far beyond the vehicle entry so it runs off-frame
const FADE = 2.6; // vehicles scale in/out over this distance at the two road ends

// approach a: vehicles enter at `entry`, travel along `d`; traffic keeps LEFT (Dhaka).
const APPROACHES = [0, 1, 2, 3].map((a) => {
  const dx = [0, -1, 0, 1][a];
  const dz = [1, 0, -1, 0][a];
  return { d: [dx, dz], left: [dz, -dx], entry: [-dx * L, -dz * L] };
});

const pt = (a, s, lat, y = 0) => {
  const { d, left, entry } = APPROACHES[a];
  return [entry[0] + d[0] * s + left[0] * lat, y, entry[1] + d[1] * s + left[1] * lat];
};

/* ------------------------------------------------------------- simulation */
const TYPES = [
  { len: 1.35, w: 0.72, h: 0.5, vmax: 4.2, p: 0.5 }, // car
  { len: 0.9, w: 0.52, h: 0.58, vmax: 2.9, p: 0.25 }, // rickshaw
  { len: 1.1, w: 0.6, h: 0.62, vmax: 3.3, p: 0.15 }, // CNG auto
  { len: 2.7, w: 0.92, h: 0.98, vmax: 3.4, p: 0.1 }, // bus
];
const ACCEL = 2.0;
const DECEL = 3.6;
const MIN_GAP = 0.38;
const GREEN_MIN = 4;
const GREEN_MAX = 12;
const AMBER = 1.6;
const ALL_RED = 1.5;

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

function createSim(count, seed = 7) {
  const rng = mulberry(seed);
  const lanes = APPROACHES.map(() => [[], []]); // lanes[a][lane] sorted: index 0 = lead
  const vehicles = [];
  const ctrl = { phase: 0, state: "G", timer: 7, total: 7, demand: [0, 0] };
  const sim = { vehicles, lanes, ctrl, time: 0, weights: [1, 1, 1, 1] };

  const pickType = () => {
    let r = rng();
    for (const t of TYPES) {
      if (r < t.p) return t;
      r -= t.p;
    }
    return TYPES[0];
  };
  const pickApproach = () => {
    const w = sim.weights;
    let r = rng() * (w[0] + w[1] + w[2] + w[3]);
    for (let a = 0; a < 4; a++) {
      if (r < w[a]) return a;
      r -= w[a];
    }
    return 3;
  };
  const spawn = (v) => {
    const t = pickType();
    v.len = t.len;
    v.w = t.w;
    v.h = t.h;
    v.vmax = t.vmax * (0.9 + rng() * 0.2);
    v.a = pickApproach();
    v.lane = rng() < 0.5 ? 0 : 1;
    const list = lanes[v.a][v.lane];
    const tail = list[list.length - 1];
    v.s = tail ? Math.min(-0.8, tail.s - tail.len / 2 - v.len / 2 - 0.7 - rng() * 1.5) : -0.8 - rng() * 4;
    v.v = tail ? Math.min(tail.v, v.vmax) : v.vmax * 0.7;
    v.queued = 0;
    v.commit = 0;
    list.push(v);
  };

  for (let i = 0; i < count; i++) {
    const v = { s: 0, v: 0, len: 1, w: 1, h: 1, vmax: 1, a: 0, lane: 0, queued: 0, commit: 0 };
    vehicles.push(v);
    spawn(v);
  }

  const lampFor = (a) => {
    if (ctrl.phase !== a % 2) return 0; // red
    return ctrl.state === "G" ? 2 : ctrl.state === "A" ? 1 : 0;
  };

  const demandOf = (phase) => {
    let best = 0;
    for (let a = phase; a < 4; a += 2) {
      let d = 0;
      for (let l = 0; l < 2; l++) {
        for (const v of lanes[a][l]) {
          if (v.s < S_STOP && v.s > S_STOP - 17) d += v.v < 0.3 ? 1 : 0.5;
        }
      }
      best = Math.max(best, d);
    }
    return best;
  };

  sim.lampFor = lampFor;
  sim.queuedOnRed = () => {
    let n = 0;
    for (const v of vehicles) if (v.a % 2 !== ctrl.phase) n += v.queued;
    return n;
  };
  sim.step = (dt) => {
    sim.time += dt;
    // slowly drifting demand so the controller visibly re-allocates green time
    const ns = 0.5 + 0.3 * Math.sin(sim.time / 14);
    const ew = 1 - ns;
    sim.weights[0] = ns * 1.15;
    sim.weights[2] = ns * 0.9;
    sim.weights[1] = ew * 1.05;
    sim.weights[3] = ew;

    // --- controller
    ctrl.timer -= dt;
    if (ctrl.timer <= 0) {
      if (ctrl.state === "G") {
        ctrl.state = "A";
        ctrl.timer = AMBER;
        // amber onset: each vehicle on the green approaches decides once — stop, or go if it
        // could not stop comfortably before the line (the classic dilemma-zone rule)
        for (let a = ctrl.phase; a < 4; a += 2) {
          for (let l = 0; l < 2; l++) {
            for (const v of lanes[a][l]) {
              const toStop = S_STOP - (v.s + v.len / 2);
              v.commit = toStop < (v.v * v.v) / (2 * DECEL) + 0.6 ? 1 : 0;
            }
          }
        }
      } else if (ctrl.state === "A") {
        ctrl.state = "R";
        ctrl.timer = ALL_RED;
      } else {
        ctrl.phase = 1 - ctrl.phase;
        ctrl.demand[0] = demandOf(0);
        ctrl.demand[1] = demandOf(1);
        const g = 3.5 + 1.05 * ctrl.demand[ctrl.phase];
        ctrl.total = Math.max(GREEN_MIN, Math.min(GREEN_MAX, g));
        ctrl.timer = ctrl.total;
        ctrl.state = "G";
      }
    }

    // --- vehicles
    for (let a = 0; a < 4; a++) {
      const lamp = lampFor(a);
      for (let l = 0; l < 2; l++) {
        const list = lanes[a][l];
        for (let i = 0; i < list.length; i++) {
          const v = list[i];
          const front = v.s + v.len / 2;
          let gap = Infinity;
          if (i > 0) {
            const lead = list[i - 1];
            gap = lead.s - lead.len / 2 - front - MIN_GAP;
          }
          const toStop = S_STOP - front;
          if (toStop < -0.45) v.commit = 0; // through the line: decision no longer matters
          const proceed = lamp === 2 || v.commit === 1;
          // hold the constraint a little past the line so a few cm of overshoot cannot free the car
          if (!proceed && toStop > -0.45) gap = Math.min(gap, Math.max(0, toStop));
          let target = v.vmax;
          if (gap < 0.03) target = 0;
          else if (gap < Infinity) target = Math.min(v.vmax, Math.sqrt(2 * DECEL * gap));
          const dv = target - v.v;
          v.v += Math.max(-DECEL * dt, Math.min(ACCEL * dt, dv));
          if (v.v < 0) v.v = 0;
          v.s += v.v * dt;
          v.queued = v.v < 0.25 && v.s < S_STOP ? 1 : 0;
        }
        // leader exits → respawn at a tail
        while (list.length && list[0].s > 2 * L + 1.5) {
          const v = list.shift();
          spawn(v);
        }
      }
    }
  };
  return sim;
}

/* ------------------------------------------------------- vehicle shader */
const vehVert = /* glsl */ `
  attribute float aState;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying float vState;
  void main() {
    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * (mat3(instanceMatrix) * normal));
    vViewDir = normalize(-mvPosition.xyz);
    vState = aState;
    gl_Position = projectionMatrix * mvPosition;
  }
`;
const vehFrag = /* glsl */ `
  uniform float uInvert;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying float vState;
  void main() {
    vec3 n = normalize(vNormal);
    float ndl = dot(n, normalize(vec3(1.2, 2.0, 1.5)));
    float shade = smoothstep(-0.35, 0.75, ndl);
    float s = 5.0;
    float d1 = fract((gl_FragCoord.x + gl_FragCoord.y) / s);
    float d2 = fract((gl_FragCoord.x - gl_FragCoord.y) / s);
    float l1 = step(0.5, d1);
    float l2 = step(0.5, d2);
    float ink = 0.0;
    if (shade < 0.42) ink = max(ink, l1 * 0.75);
    if (shade < 0.18) ink = max(ink, l2 * 0.75);
    // queued vehicles are "inked in": cross-hatched on every face
    float q = vState;
    ink = max(ink, q * max(l1, l2 * step(shade, 0.6)));
    float rim = 1.0 - max(dot(n, normalize(vViewDir)), 0.0);
    rim = smoothstep(0.85, 1.0, rim);
    float dark = clamp(ink + rim * 0.4, 0.0, 1.0);
    vec3 col = mix(vec3(1.0), vec3(0.0), dark);
    col = mix(col, 1.0 - col, uInvert);
    gl_FragColor = vec4(col, 1.0);
  }
`;

/* ------------------------------------------------------------- drawing */
function useRoadLines() {
  return React.useMemo(() => {
    const solid = []; // pairs
    const thick = [];
    const dashes = [];
    const push = (arr, p, q) => arr.push(p, q);

    for (let a = 0; a < 4; a++) {
      // road edge (incoming half) from entry to the corner
      push(solid, pt(a, -EXT, RW), pt(a, L - RW, RW));
      // lane divider (dashed) up to the stop line
      push(dashes, pt(a, -EXT, 1.7), pt(a, S_STOP - 0.2, 1.7));
      // stop line across incoming half
      push(thick, pt(a, S_STOP, MEDIAN_HALF + 0.05, 0.004), pt(a, S_STOP, RW - 0.05, 0.004));
      // zebra crossing: hollow stripes across the full road
      const n = 8;
      const stripe = 0.42;
      const span = 2 * (RW - 0.15);
      const gapW = (span - n * stripe) / (n - 1);
      const s0 = S_STOP + 0.55;
      const s1 = s0 + ZEBRA;
      for (let i = 0; i < n; i++) {
        const lat0 = -(RW - 0.15) + i * (stripe + gapW);
        const lat1 = lat0 + stripe;
        push(solid, pt(a, s0, lat0, 0.002), pt(a, s0, lat1, 0.002));
        push(solid, pt(a, s1, lat0, 0.002), pt(a, s1, lat1, 0.002));
        push(solid, pt(a, s0, lat0, 0.002), pt(a, s1, lat0, 0.002));
        push(solid, pt(a, s0, lat1, 0.002), pt(a, s1, lat1, 0.002));
        // light hatch inside every other stripe
        if (i % 2 === 0) {
          for (let k = 1; k < 4; k++) {
            const f = k / 4;
            push(solid, pt(a, s0 + f * ZEBRA, lat0, 0.002), pt(a, s0 + f * ZEBRA, lat1, 0.002));
          }
        }
      }
      // signal pole (vertical line) on the left at the stop line
      const pole = pt(a, S_STOP, RW + 0.55);
      push(solid, pole, [pole[0], 2.4, pole[2]]);
      // a little base ring footprint for the pole
      push(solid, [pole[0] - 0.18, 0, pole[2] - 0.18], [pole[0] + 0.18, 0, pole[2] + 0.18]);
      push(solid, [pole[0] + 0.18, 0, pole[2] - 0.18], [pole[0] - 0.18, 0, pole[2] + 0.18]);
    }

    // intersection corners: small kerb returns
    for (let a = 0; a < 4; a++) {
      const c = pt(a, L - RW, RW);
      const n = APPROACHES[(a + 3) % 4]; // road to the left shares this corner
      void n;
      push(solid, c, [c[0], 0.08, c[2]]);
    }

    // camera pole (vision unit) watching approach 0
    const camBase = pt(0, S_STOP - 1.4, RW + 1.25);
    const camTop = [camBase[0], 4.3, camBase[2]];
    push(solid, camBase, camTop);
    // controller cabinet link
    const cab = pt(0, S_STOP - 1.4, RW + 2.2);
    const cone = [];
    push(cone, [camTop[0], 3.9, camTop[2]], [cab[0], 0.9, cab[2]]);
    // vision footprint on the incoming lanes of approach 0
    const fs0 = S_STOP - 11.5;
    const fs1 = S_STOP - 1.2;
    const fl0 = MEDIAN_HALF + 0.1;
    const fl1 = RW - 0.1;
    const corners = [pt(0, fs0, fl0, 0.003), pt(0, fs0, fl1, 0.003), pt(0, fs1, fl1, 0.003), pt(0, fs1, fl0, 0.003)];
    for (let i = 0; i < 4; i++) {
      push(cone, corners[i], corners[(i + 1) % 4]);
      push(cone, [camTop[0], 4.05, camTop[2]], corners[i]);
    }
    return { solid, thick, dashes, cone, camTop, camBase, cab };
  }, []);
}

function Medians() {
  const items = React.useMemo(
    () =>
      APPROACHES.map((ap, a) => {
        const len = L - RW - 1.1 + EXT;
        const c = pt(a, len / 2 - EXT, 0, 0.09);
        return { key: a, pos: c, rot: Math.atan2(ap.d[0], ap.d[1]), len };
      }),
    []
  );
  return items.map((m) => (
    <InkMesh key={m.key} position={m.pos} rotation={[0, m.rot, 0]} hatch={4} strength={0.55}>
      <boxGeometry args={[MEDIAN_HALF * 2, 0.18, m.len]} />
    </InkMesh>
  ));
}

function Blocks() {
  // simple building footprints on the four corners, hatched low boxes
  const items = React.useMemo(() => {
    const out = [];
    const specs = [
      { x: RW + 4.6, z: RW + 3.2, w: 3.4, d: 2.6, h: 1.1 },
      { x: RW + 3.0, z: RW + 7.4, w: 2.4, d: 3.0, h: 0.7 },
      { x: RW + 7.4, z: RW + 7.2, w: 2.2, d: 2.2, h: 1.5 },
    ];
    [-1, 1].forEach((sx) =>
      [-1, 1].forEach((sz) =>
        specs.forEach((b, i) => {
          // vary heights per corner so the skyline is not symmetric
          const h = b.h * (0.75 + ((sx + 2 * sz + i * 3 + 9) % 5) * 0.12);
          out.push({ key: `${sx}${sz}${i}`, pos: [sx * b.x, h / 2, sz * b.z], size: [b.w, h, b.d] });
        })
      )
    );
    return out;
  }, []);
  return items.map((b) => (
    <InkMesh key={b.key} position={b.pos} hatch={8} strength={0.18}>
      <boxGeometry args={b.size} />
    </InkMesh>
  ));
}

function SignalHead({ a, discRefs, barRefs }) {
  const { d } = APPROACHES[a];
  const base = pt(a, S_STOP, RW + 0.55);
  const rotY = Math.atan2(-d[0], -d[1]); // lamp face looks back at incoming traffic
  const lampY = [0.32, 0, -0.32];
  return (
    <group position={[base[0], 2.25, base[2]]} rotation={[0, rotY, 0]} scale={[1.6, 1.6, 1.6]}>
      <InkMesh hatch={4} strength={0.6}>
        <boxGeometry args={[0.46, 1.22, 0.22]} />
      </InkMesh>
      {lampY.map((y, i) => (
        <group key={i} position={[0, y, 0.115]}>
          <InkFlat>
            <ringGeometry args={[0.1, 0.135, 28]} />
          </InkFlat>
          <group ref={(el) => (discRefs.current[a * 3 + i] = el)} position={[0, 0, 0.004]}>
            <InkFlat>
              <circleGeometry args={[0.135, 28]} />
            </InkFlat>
          </group>
        </group>
      ))}
      {/* countdown bar under the head: scales from the left as green runs out */}
      <group position={[-0.5, -0.86, 0.1]}>
        <InkLine
          points={[
            [0, -0.06, 0],
            [1, -0.06, 0],
            [1, 0.06, 0],
            [0, 0.06, 0],
            [0, -0.06, 0],
          ]}
          lineWidth={1}
        />
        <group ref={(el) => (barRefs.current[a] = el)}>
          <InkFlat position={[0.5, 0, 0.002]}>
            <planeGeometry args={[1, 0.12]} />
          </InkFlat>
        </group>
      </group>
    </group>
  );
}

function CameraUnit({ camTop, camBase, cab, pulseRefs }) {
  const { d } = APPROACHES[0];
  const rotY = Math.atan2(-d[0], -d[1]);
  return (
    <group>
      {/* camera body on the pole, tilted down at the approach */}
      <group position={[camTop[0], 4.05, camTop[2]]} rotation={[0, rotY, 0]}>
        <InkMesh rotation={[0.55, 0, 0]} hatch={4} strength={0.7}>
          <boxGeometry args={[0.34, 0.3, 0.62]} />
        </InkMesh>
        <InkMesh position={[0, -0.18, 0.4]} rotation={[0.55, 0, 0]} hatch={3}>
          <cylinderGeometry args={[0.11, 0.09, 0.2, 16]} />
        </InkMesh>
        {/* broadcast rings: concentric, expanding */}
        {[0, 1, 2].map((i) => (
          <group key={i} ref={(el) => (pulseRefs.current[i] = el)} rotation={[-Math.PI / 2, 0, 0]}>
            <InkLine
              points={Array.from({ length: 33 }, (_, k) => [Math.cos((k / 32) * Math.PI * 2), Math.sin((k / 32) * Math.PI * 2), 0])}
              lineWidth={1}
              opacity={0.9}
              transparent
            />
          </group>
        ))}
      </group>
      {/* controller cabinet */}
      <InkMesh position={[cab[0], 0.45, cab[2]]} rotation={[0, rotY, 0]} hatch={4} strength={0.8}>
        <boxGeometry args={[0.55, 0.9, 0.38]} />
      </InkMesh>
      <InkFlat position={[camBase[0], 0.001, camBase[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.14, 0.2, 20]} />
      </InkFlat>
    </group>
  );
}

/* ------------------------------------------------------------------ scene */
export default function IntersectionScene({ trackRef, inverted, reduced, mobile }) {
  const { ink } = useInk();
  const view = useViewProgress(trackRef);
  const count = mobile ? 22 : 42;
  const sim = React.useMemo(() => {
    const s = createSim(count, 11);
    // pre-warm ≈ 20 s, then run on (≤ 60 s more) until a clear queue is waiting on the red
    // approaches mid-green, so the very first frame already shows the controller at work
    for (let i = 0; i < 20 * 30; i++) s.step(1 / 30);
    for (let i = 0; i < 60 * 30; i++) {
      const c = s.ctrl;
      if (c.state === "G" && c.timer > 1.5 && c.total - c.timer > 2.5 && s.queuedOnRed() >= (mobile ? 3 : 6)) break;
      s.step(1 / 30);
    }
    return s;
  }, [count, mobile]);

  const lines = useRoadLines();
  const camRef = React.useRef();
  const bodyRef = React.useRef();
  const hullRef = React.useRef();
  const discRefs = React.useRef([]);
  const barRefs = React.useRef([]);
  const pulseRefs = React.useRef([]);
  const dummy = React.useMemo(() => new THREE.Object3D(), []);
  const camState = React.useRef({ dist: 0, az: 0.62, el: 0.82 });

  const geo = React.useMemo(() => {
    const g = new THREE.BoxGeometry(1, 1, 1);
    g.setAttribute("aState", new THREE.InstancedBufferAttribute(new Float32Array(count), 1));
    return g;
  }, [count]);
  const uniforms = React.useMemo(() => ({ uInvert: { value: inverted ? 1 : 0 } }), []); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    uniforms.uInvert.value = inverted ? 1 : 0;
  }, [inverted, uniforms]);

  const writeInstances = React.useCallback(() => {
    const body = bodyRef.current;
    const hull = hullRef.current;
    if (!body || !hull) return;
    const state = geo.getAttribute("aState");
    const o = 0.035; // outline thickness (world units)
    const vehicles = sim.vehicles;
    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      const { d, left, entry } = APPROACHES[v.a];
      // scale in at the entry and out at the exit so nothing pops at the road ends
      let k = Math.min(1, Math.max(0, v.s / FADE)) * Math.min(1, Math.max(0, (2 * L - v.s) / FADE));
      k = k * k * (3 - 2 * k);
      const lat = LANE_LAT[v.lane];
      dummy.position.set(entry[0] + d[0] * v.s + left[0] * lat, (v.h * k) / 2, entry[1] + d[1] * v.s + left[1] * lat);
      dummy.rotation.set(0, Math.atan2(d[0], d[1]), 0);
      dummy.scale.set(v.w * k, v.h * k, v.len * k);
      dummy.updateMatrix();
      body.setMatrixAt(i, dummy.matrix);
      if (k > 0) dummy.scale.set((v.w + 2 * o) * k, (v.h + 2 * o) * k, (v.len + 2 * o) * k);
      dummy.position.y = (v.h * k) / 2 + 0.01;
      dummy.updateMatrix();
      hull.setMatrixAt(i, dummy.matrix);
      state.array[i] = v.queued;
    }
    body.instanceMatrix.needsUpdate = true;
    hull.instanceMatrix.needsUpdate = true;
    state.needsUpdate = true;
  }, [sim, geo, dummy]);

  const writeSignals = React.useCallback(() => {
    const { ctrl } = sim;
    for (let a = 0; a < 4; a++) {
      const lamp = sim.lampFor(a);
      for (let i = 0; i < 3; i++) {
        const g = discRefs.current[a * 3 + i];
        if (g) g.visible = i === lamp;
      }
      const bar = barRefs.current[a];
      if (bar) {
        const active = lamp === 2;
        bar.visible = active;
        if (active) bar.scale.x = Math.max(0.001, ctrl.timer / ctrl.total);
      }
    }
  }, [sim]);

  const setPulses = React.useCallback((e) => {
    const rings = pulseRefs.current;
    for (let i = 0; i < rings.length; i++) {
      const g = rings[i];
      if (!g) continue;
      const f = (e * 0.45 + i / 3) % 1;
      const r = 0.22 + f * 0.85;
      g.scale.set(r, r, 1);
      g.position.y = 0.2 + f * 0.1;
      g.visible = f < 0.9;
      const m = g.children[0] && g.children[0].material;
      if (m) m.opacity = 0.9 * (1 - f);
    }
  }, []);

  // first paint: queues already present (and a sensible static pose for reduced motion)
  React.useLayoutEffect(() => {
    writeInstances();
    writeSignals();
    setPulses(0.4);
  });

  const target = React.useMemo(() => new THREE.Vector3(0, 0.4, 0), []);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const { t, pointer } = view.current;
    if (!reduced) {
      sim.step(dt);
      writeInstances();
      writeSignals();
      // broadcast rings on the camera unit
      const e = state.clock.elapsedTime;
      setPulses(e);
    }

    // camera: slow orbit + pointer parallax + scroll tilt-to-plan
    const cam = camRef.current;
    if (!cam) return;
    const cs = camState.current;
    const scroll = Math.max(0, Math.min(1, (t - 0.5) / 0.5));
    const ease = scroll * scroll * (3 - 2 * scroll);
    if (!reduced) cs.az += dt * 0.05;
    const az = cs.az + pointer.x * 0.16;
    const el = THREE.MathUtils.lerp(0.84, 1.38, ease) + pointer.y * 0.09;
    const fovHalf = Math.tan((cam.fov * Math.PI) / 360);
    const aspect = cam.aspect || 1.5;
    const need = Math.max(13.6 / fovHalf, 15.2 / (fovHalf * aspect));
    const wantDist = need * (1 + 0.32 * ease);
    cs.dist = cs.dist === 0 ? wantDist : THREE.MathUtils.lerp(cs.dist, wantDist, 0.08);
    const ce = Math.cos(el);
    cam.position.set(cs.dist * ce * Math.sin(az), cs.dist * Math.sin(el), cs.dist * ce * Math.cos(az));
    cam.lookAt(target);
  });

  return (
    <group>
      <PerspectiveCamera ref={camRef} makeDefault position={[14, 20, 22]} fov={34} near={0.5} far={200} />

      {/* ground drawing */}
      <InkLine points={lines.solid} segments lineWidth={1.1} />
      <InkLine points={lines.thick} segments lineWidth={3} />
      <InkLine points={lines.dashes} segments dashed dashSize={1.1} gapSize={0.7} lineWidth={1.1} />
      <InkLine points={lines.cone} segments dashed dashSize={0.28} gapSize={0.2} lineWidth={1.2} opacity={0.85} />
      <Medians />
      <Blocks />

      {/* signals */}
      {[0, 1, 2, 3].map((a) => (
        <SignalHead key={a} a={a} discRefs={discRefs} barRefs={barRefs} />
      ))}
      <CameraUnit camTop={lines.camTop} camBase={lines.camBase} cab={lines.cab} pulseRefs={pulseRefs} />

      {/* vehicles: paper body with hatched shading + ink inverted-hull outline */}
      <instancedMesh ref={hullRef} args={[undefined, undefined, count]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={ink} side={THREE.BackSide} />
      </instancedMesh>
      <instancedMesh ref={bodyRef} args={[undefined, undefined, count]} frustumCulled={false}>
        <primitive object={geo} attach="geometry" />
        <shaderMaterial uniforms={uniforms} vertexShader={vehVert} fragmentShader={vehFrag} />
      </instancedMesh>
    </group>
  );
}
