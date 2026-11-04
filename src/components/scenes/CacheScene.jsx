"use client";
/**
 * "cache" – website fingerprinting through a CPU cache side channel.
 *
 *   bottom : a CPU die, a thin hatched plate with pins. On it a grid of cache
 *            sets (16×8 hollow cells). A probe sweeps the sets in raster order
 *            and a few "hot" sets flash as the victim's page renders.
 *   middle : the measured timing trace, floating above the die as a 3-D band:
 *            a jagged polyline (latency per probe) extruded into a thin ribbon.
 *            New samples arrive at the right end and the ribbon scrolls left.
 *   right  : the trace feeds a stylised 1-D CNN – three stacked slabs with
 *            narrowing widths (conv → pool → dense) and a row of output
 *            classes. A packet travels trace → slabs → the predicted class,
 *            which turns from hollow to filled.
 *
 * Ink language: hollow = idle set, filled = accessed set, hatched = solid
 * silicon, dashed = measurement / data flow, a dot = a sample on its way.
 */
import * as React from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { InkMesh, InkMaterial, InkLine, InkFlat, useInk } from "../three/Ink";
import { useViewProgress } from "../three/useViewProgress";

/* ------------------------------------------------------------------ layout */
const CAM_FOV = 26;
const CAM_DIR = new THREE.Vector3(0.4, 0.6, 1).normalize();
const LOOK = new THREE.Vector3(0.25, 0.25, 0.0);
const FIT_HALF_W = 2.9;
const FIT_HALF_H = 1.66;

const DIE = 1.32; // half size of the die plate
const DIE_T = 0.07; // plate thickness
const PITCH = 0.15; // cache set grid pitch
const CELL = 0.105;
const GRID_Z = -0.42; // grid centre on the die (z)

const TX0 = -1.3; // trace band: left / right ends
const TX1 = 0.95;
const TY = 0.92; // baseline height above the die
const TZ = GRID_Z; // band sits above the grid
const TW = 0.16; // half depth of the band
const N_SAMPLES = 72;
const RATE = 7; // samples per second

const SLABS = [
  { y: 0.9, w: 0.95, d: 0.52 },
  { y: 1.2, w: 0.66, d: 0.42 },
  { y: 1.5, w: 0.42, d: 0.32 },
];
const SLAB_X = 1.72;
const SLAB_T = 0.07;
const OUT_Y = 1.82;
const OUT_XS = [-0.27, -0.09, 0.09, 0.27];
const OUT_R = 0.052;
const PULSE_PERIOD = 4.2;

/* -------------------------------------------------------------- helpers */
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const hash = (n) => {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** latency of probe sample `s` (integer): low noisy floor + occasional miss spikes with a tail */
function spike(s) {
  const h = hash(s * 7.13 + 3.1);
  return h > 0.91 ? ((h - 0.91) / 0.09) * 0.3 + 0.06 : 0;
}
function latency(s) {
  const base = 0.05 * Math.sin(s * 0.37) + 0.035 * Math.sin(s * 0.91 + 1.3) + 0.02 * Math.sin(s * 2.3);
  const jitter = (hash(s) - 0.5) * 0.05;
  return 0.08 + base + jitter + spike(s) + spike(s - 1) * 0.5 + spike(s - 2) * 0.22 + spike(s - 3) * 0.08;
}

function rectPts(x0, z0, x1, z1, y) {
  return [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], [x0, y, z0]];
}

/** hollow square cell lying flat (one ShapeGeometry with a hole) */
function makeCellFrame(size, t) {
  const s = new THREE.Shape();
  s.moveTo(-size / 2, -size / 2);
  s.lineTo(size / 2, -size / 2);
  s.lineTo(size / 2, size / 2);
  s.lineTo(-size / 2, size / 2);
  s.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-size / 2 + t, -size / 2 + t);
  hole.lineTo(size / 2 - t, -size / 2 + t);
  hole.lineTo(size / 2 - t, size / 2 - t);
  hole.lineTo(-size / 2 + t, size / 2 - t);
  hole.closePath();
  s.holes.push(hole);
  const g = new THREE.ShapeGeometry(s);
  g.rotateX(-Math.PI / 2);
  return g;
}

/* ---------------------------------------------------------------- pieces */

function Die({ cols, rows }) {
  const gridW = cols * PITCH;
  const gridD = rows * PITCH;
  const pins = React.useMemo(() => {
    const pts = [];
    const n = 11;
    for (let i = 0; i < n; i++) {
      const u = -DIE + 0.2 + ((2 * DIE - 0.4) * i) / (n - 1);
      const y = -DIE_T / 2;
      pts.push([u, y, DIE], [u, y, DIE + 0.14]);
      pts.push([u, y, -DIE], [u, y, -DIE - 0.14]);
      pts.push([DIE, y, u], [DIE + 0.14, y, u]);
      pts.push([-DIE, y, u], [-DIE - 0.14, y, u]);
    }
    return pts;
  }, []);
  const gridFrame = React.useMemo(() => {
    const m = 0.07;
    return rectPts(-gridW / 2 - m, GRID_Z - gridD / 2 - m, gridW / 2 + m, GRID_Z + gridD / 2 + m, 0.003);
  }, [gridW, gridD]);
  const cores = React.useMemo(() => [-0.93, -0.31, 0.31, 0.93], []);
  const bus = React.useMemo(() => {
    const pts = [];
    const zTop = GRID_Z + gridD / 2 + 0.07;
    for (const x of cores) pts.push([x, 0.004, 0.55], [x, 0.004, zTop]);
    pts.push([-1.1, 0.004, 0.45], [1.1, 0.004, 0.45]);
    return pts;
  }, [cores, gridD]);
  return (
    <group>
      {/* silicon plate: hatched sides give it thickness */}
      <InkMesh position={[0, -DIE_T / 2, 0]} hatch={5} strength={0.9} fill={0}>
        <boxGeometry args={[DIE * 2, DIE_T, DIE * 2]} />
      </InkMesh>
      <InkLine points={pins} segments lineWidth={0.8} opacity={0.7} />
      {/* inner lip + cache region frame */}
      <InkLine points={rectPts(-DIE + 0.08, -DIE + 0.08, DIE - 0.08, DIE - 0.08, 0.003)} lineWidth={0.6} opacity={0.4} />
      <InkLine points={gridFrame} lineWidth={0.9} opacity={0.75} />
      {/* four cores, and the bus that joins them to the shared cache */}
      {cores.map((x) => (
        <InkMesh key={x} position={[x, 0.04, 0.82]} hatch={4} strength={1} fill={0.05}>
          <boxGeometry args={[0.46, 0.08, 0.5]} />
        </InkMesh>
      ))}
      <InkLine points={bus} segments dashed dashSize={0.05} gapSize={0.04} lineWidth={0.8} opacity={0.6} />
    </group>
  );
}

function Cnn({ outFillRef, pulseRef }) {
  const { ink } = useInk();
  const links = React.useMemo(() => {
    const pts = [];
    for (let i = 0; i < SLABS.length - 1; i++) {
      const a = SLABS[i];
      const b = SLABS[i + 1];
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) pts.push([(sx * a.w) / 2, a.y + SLAB_T / 2, (sz * a.d) / 2], [(sx * b.w) / 2, b.y - SLAB_T / 2, (sz * b.d) / 2]);
    }
    const top = SLABS[SLABS.length - 1];
    for (const ox of OUT_XS) pts.push([ox * 0.5, top.y + SLAB_T / 2, 0], [ox, OUT_Y - OUT_R - 0.02, 0]);
    return pts;
  }, []);
  // feed from the trace end into the lowest slab
  const feed = React.useMemo(() => [[TX1, TY, TZ], [SLAB_X - SLABS[0].w / 2 - 0.08, SLABS[0].y, TZ * 0.5], [SLAB_X - SLABS[0].w / 2, SLABS[0].y, 0]], []);
  // output rings face the camera (fixed direction inside the drawing)
  const outQuat = React.useMemo(() => {
    const m = new THREE.Matrix4().lookAt(CAM_DIR, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0));
    return new THREE.Quaternion().setFromRotationMatrix(m);
  }, []);
  return (
    <group position={[SLAB_X, 0, 0]}>
      <InkLine points={feed.map(([x, y, z]) => [x - SLAB_X, y, z])} dashed dashSize={0.06} gapSize={0.045} lineWidth={0.9} opacity={0.8} />
      {SLABS.map((s, i) => (
        <InkMesh key={i} position={[0, s.y, 0]} hatch={4.5} strength={0.8} fill={0}>
          <boxGeometry args={[s.w, SLAB_T, s.d]} />
        </InkMesh>
      ))}
      <InkLine points={links} segments dashed dashSize={0.04} gapSize={0.035} lineWidth={0.7} opacity={0.55} />
      <group position={[0, OUT_Y, 0]} quaternion={outQuat}>
        {OUT_XS.map((ox) => (
          <group key={ox} position={[ox, 0, 0]}>
            <mesh>
              <ringGeometry args={[OUT_R - 0.011, OUT_R, 28]} />
              <meshBasicMaterial color={ink} side={THREE.DoubleSide} />
            </mesh>
          </group>
        ))}
        <instancedMesh ref={outFillRef} args={[undefined, undefined, OUT_XS.length]}>
          <circleGeometry args={[OUT_R - 0.016, 24]} />
          <meshBasicMaterial color={ink} side={THREE.DoubleSide} />
        </instancedMesh>
      </group>
      {/* the sample packet on its way through the classifier */}
      <InkFlat ref={pulseRef} quaternion={outQuat} renderOrder={5}>
        <circleGeometry args={[0.034, 16]} />
      </InkFlat>
    </group>
  );
}

/* ----------------------------------------------------------------- scene */

export default function CacheScene({ trackRef, reduced, mobile }) {
  const view = useViewProgress(trackRef);
  const { ink } = useInk();
  const COLS = mobile ? 10 : 16;
  const ROWS = mobile ? 6 : 8;
  const NCELL = COLS * ROWS;

  const root = React.useRef();
  const camRef = React.useRef();
  const framesRef = React.useRef();
  const fillsRef = React.useRef();
  const ribbonMeshRef = React.useRef();
  const outFillRef = React.useRef();
  const pulseRef = React.useRef();

  const cellFrame = React.useMemo(() => makeCellFrame(CELL, 0.011), []);
  const cellFill = React.useMemo(() => {
    const g = new THREE.PlaneGeometry(CELL - 0.03, CELL - 0.03);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);

  const cells = React.useMemo(() => {
    const list = [];
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const k = r * COLS + c;
        const h = hash(k * 3.7 + 11);
        list.push({
          x: (c - (COLS - 1) / 2) * PITCH,
          z: GRID_Z + (r - (ROWS - 1) / 2) * PITCH,
          k,
          hot: h > 0.82,
          rate: 0.6 + h * 1.6,
          phase: hash(k + 5) * Math.PI * 2,
        });
      }
    return list;
  }, [COLS, ROWS]);

  // static cell frames (placed once)
  React.useLayoutEffect(() => {
    const m = framesRef.current;
    if (!m) return;
    const o = new THREE.Object3D();
    for (let i = 0; i < NCELL; i++) {
      o.position.set(cells[i].x, 0.004, cells[i].z);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, [cells, NCELL]);

  /* ribbon geometry: N samples × 2 verts (back / front edge), plus the hairlines */
  const ribbon = React.useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N_SAMPLES * 2 * 3);
    const idx = [];
    for (let i = 0; i < N_SAMPLES - 1; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const RIB = 6;
    const nSeg = 2 * (N_SAMPLES - 1) + Math.floor(N_SAMPLES / RIB) + 2;
    const lines = new THREE.BufferGeometry();
    const lpos = new Float32Array(nSeg * 2 * 3);
    lines.setAttribute("position", new THREE.BufferAttribute(lpos, 3));
    return { geo, lines, RIB };
  }, []);

  // trace baseline & a small latency axis at the left end
  const traceGuides = React.useMemo(() => {
    const pts = [];
    pts.push([TX0 - 0.08, TY, TZ], [TX0 - 0.08, TY + 0.5, TZ]);
    for (let i = 0; i <= 2; i++) pts.push([TX0 - 0.08, TY + i * 0.2, TZ], [TX0 - 0.13, TY + i * 0.2, TZ]);
    pts.push([TX0 - 0.08, TY + 0.5, TZ], [TX0 - 0.11, TY + 0.44, TZ], [TX0 - 0.08, TY + 0.5, TZ], [TX0 - 0.05, TY + 0.44, TZ]);
    return pts;
  }, []);

  const pulsePath = React.useMemo(() => {
    const p = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(TX1 - 0.1, TY + 0.05, TZ),
        new THREE.Vector3(TX1, TY, TZ),
        new THREE.Vector3(SLAB_X - SLABS[0].w / 2 - 0.08, SLABS[0].y, TZ * 0.5),
        new THREE.Vector3(SLAB_X, SLABS[0].y, 0),
        new THREE.Vector3(SLAB_X, SLABS[1].y, 0),
        new THREE.Vector3(SLAB_X, SLABS[2].y, 0),
        new THREE.Vector3(SLAB_X, OUT_Y - 0.1, 0),
      ],
      false,
      "catmullrom",
      0.05
    );
    p.arcLengthDivisions = 100;
    return p;
  }, []);

  const tmp = React.useMemo(
    () => ({ v: new THREE.Vector3(), o: new THREE.Object3D(), rot: { x: 0, y: 0 } }),
    []
  );

  useFrame((state, dt) => {
    const time = reduced ? 49.77 : state.clock.elapsedTime; // reduced: a predicted class fully filled
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

    /* drawing: pointer / scroll parallax */
    if (root.current) {
      const ty = pointer.x * 0.2 + (reduced ? 0 : 0.05 * Math.sin(time * 0.11));
      const tx = -pointer.y * 0.07 + (t - 0.5) * 0.12;
      const k = reduced ? 1 : Math.min(1, dt * 2.5);
      rot.y += (ty - rot.y) * k;
      rot.x += (tx - rot.x) * k;
      root.current.rotation.set(rot.x, rot.y, 0);
    }

    /* cache sets: a raster probe sweep + hot sets flashing */
    const fm = fillsRef.current;
    if (fm) {
      const sweep = (time * 0.09) % 1;
      for (let i = 0; i < NCELL; i++) {
        const c = cells[i];
        let ph = c.k / NCELL - sweep;
        ph -= Math.floor(ph);
        let a = ph < 0.08 ? smooth(1 - ph / 0.08) : ph > 0.97 ? smooth((ph - 0.97) / 0.03) : 0;
        if (c.hot) a = Math.max(a, smooth((Math.sin(time * c.rate + c.phase) - 0.45) / 0.3));
        o.position.set(c.x, 0.006, c.z);
        o.scale.setScalar(a > 0.02 ? a : 0.0001);
        o.updateMatrix();
        fm.setMatrixAt(i, o.matrix);
      }
      fm.instanceMatrix.needsUpdate = true;
    }

    /* timing trace: samples scroll left, a new one arrives at the right */
    const { geo, lines, RIB } = ribbon;
    const pos = geo.attributes.position.array;
    const lp = lines.attributes.position.array;
    const dx = (TX1 - TX0) / (N_SAMPLES - 1);
    const head = time * RATE;
    const s0 = Math.floor(head);
    const frac = head - s0;
    let li = 0;
    const put = (x, y, z) => {
      lp[li++] = x;
      lp[li++] = y;
      lp[li++] = z;
    };
    let px = 0;
    let py = 0;
    for (let i = 0; i < N_SAMPLES; i++) {
      const s = s0 - (N_SAMPLES - 1) + i;
      const x = TX0 + (i - frac) * dx;
      // the newest sample eases up out of the baseline
      const grow = i === N_SAMPLES - 1 ? smooth(frac) : 1;
      const y = TY + latency(s) * grow;
      const b = i * 6;
      pos[b] = x; pos[b + 1] = y; pos[b + 2] = TZ - TW;
      pos[b + 3] = x; pos[b + 4] = y; pos[b + 5] = TZ + TW;
      if (i > 0) {
        put(px, py, TZ - TW); put(x, y, TZ - TW);
        put(px, py, TZ + TW); put(x, y, TZ + TW);
      }
      if (s % RIB === 0 && i > 0 && i < N_SAMPLES - 1) {
        put(x, y, TZ - TW); put(x, y, TZ + TW);
      }
      px = x;
      py = y;
    }
    // end caps
    put(pos[0], pos[1], TZ - TW); put(pos[0], pos[1], TZ + TW);
    const e = (N_SAMPLES - 1) * 6;
    put(pos[e], pos[e + 1], TZ - TW); put(pos[e], pos[e + 1], TZ + TW);
    while (li < lp.length) lp[li++] = pos[e];
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();
    lines.attributes.position.needsUpdate = true;

    /* classifier: packet travels, predicted class fills */
    const cycle = time / PULSE_PERIOD;
    const u = cycle - Math.floor(cycle);
    const active = Math.floor(cycle) % OUT_XS.length;
    const pm = pulseRef.current;
    if (pm) {
      const travel = smooth(u / 0.7);
      if (u < 0.7) {
        pulsePath.getPointAt(travel, v);
        // last stretch: slide sideways to the predicted output
        const side = smooth((travel - 0.85) / 0.15);
        pm.position.set(v.x - SLAB_X + OUT_XS[active] * side, v.y, v.z);
        pm.scale.setScalar(1);
      } else {
        pm.position.set(OUT_XS[active], OUT_Y, 0);
        pm.scale.setScalar(0.0001);
      }
    }
    const om = outFillRef.current;
    if (om) {
      for (let i = 0; i < OUT_XS.length; i++) {
        let s = 0.0001;
        if (i === active) s = 0.3 + 0.7 * smooth((u - 0.66) / 0.1);
        else if (i === (active + OUT_XS.length - 1) % OUT_XS.length) s = Math.max(0.0001, 1 - smooth(u / 0.3));
        o.position.set(OUT_XS[i], 0, 0.001);
        o.rotation.set(0, 0, 0);
        o.scale.setScalar(s);
        o.updateMatrix();
        om.setMatrixAt(i, o.matrix);
      }
      om.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      <PerspectiveCamera ref={camRef} makeDefault position={[3, 4, 7]} fov={CAM_FOV} near={0.1} far={60} />
      <group ref={root}>
        <Die cols={COLS} rows={ROWS} />
        <instancedMesh ref={framesRef} args={[cellFrame, undefined, NCELL]}>
          <meshBasicMaterial color={ink} side={THREE.DoubleSide} />
        </instancedMesh>
        <instancedMesh ref={fillsRef} args={[cellFill, undefined, NCELL]}>
          <meshBasicMaterial color={ink} side={THREE.DoubleSide} />
        </instancedMesh>
        {/* the probe: measurement line from the cache up to the trace */}
        <InkLine points={[[TX0 - 0.08, 0.01, TZ], [TX0 - 0.08, TY, TZ]]} dashed dashSize={0.05} gapSize={0.05} lineWidth={0.8} opacity={0.6} />
        <InkLine points={traceGuides} segments lineWidth={0.9} opacity={0.8} />
        <InkLine points={[[TX0, TY, TZ], [TX1, TY, TZ]]} dashed dashSize={0.04} gapSize={0.06} lineWidth={0.7} opacity={0.45} />
        <mesh ref={ribbonMeshRef} geometry={ribbon.geo}>
          <InkMaterial hatch={5} strength={0.75} fill={0} side={THREE.DoubleSide} />
        </mesh>
        <lineSegments geometry={ribbon.lines}>
          <lineBasicMaterial color={ink} />
        </lineSegments>
        <Cnn outFillRef={outFillRef} pulseRef={pulseRef} />
      </group>
    </group>
  );
}
