"use client";
/**
 * "meeting" – Collaborator: an AI meeting assistant drawn as a wall of calls.
 *
 *   wall       : a 3×2 grid of thin rounded video tiles on a gentle concave
 *                arc. Each tile holds a minimal wireframe person (sphere head
 *                + shoulder dome) and a name bar.
 *   speaking   : one tile at a time is live: it nudges forward, its mic dot
 *                fills, and concentric sound rings ripple out of it.
 *   transcript : a bar under the wall scrolls bars of "text" from right to
 *                left, with a blinking caret at the writing head.
 *   record     : a small record dot blinks top-left of the wall.
 *
 * Ink language: hollow wire = people, filled dot = live signal, concentric
 * rings = broadcast, bars = text.
 */
import * as React from "react";
import * as THREE from "three";
import { useSceneFrame as useFrame } from "../three/useSceneFrame";
import { PerspectiveCamera } from "@react-three/drei";
import { InkMesh, InkLine, InkWire, InkFlat, useInk } from "../three/Ink";
import { useViewProgress } from "../three/useViewProgress";

/* ------------------------------------------------------------------ layout */
const CAM_FOV = 24;
const CAM_DIR = new THREE.Vector3(0.06, 0.2, 1).normalize();
const LOOK = new THREE.Vector3(0, -0.12, 0);
const FIT_HALF_W = 2.25;
const FIT_HALF_H = 1.36;

const TILE_W = 1.25;
const TILE_H = 0.8;
const TILE_D = 0.06;
const TILE_R = 0.07;
const GAP = 0.13;
const WALL_R = 4.6; // radius of the concave arc the columns sit on
const COL_A = 0.3; // angle between columns (rad)
const NUDGE = 0.2; // how far the speaking tile comes forward

const BAR_W = 3.7;
const BAR_H = 0.24;
const BAR_Y = -(TILE_H + GAP / 2 + 0.2 + BAR_H / 2);
const SPEAK_T = 3.4; // seconds each speaker holds the floor
const ORDER = [0, 4, 2, 5, 1, 3];
const RINGS = 3;
const RING_T = 2.2; // seconds for one ring to travel out

const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/* -------------------------------------------------------------- geometry */

function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  s.closePath();
  return s;
}

function roundedRectPts(w, h, r, n = 6, z = 0) {
  const pts = [];
  const corners = [
    [w / 2 - r, -h / 2 + r, -Math.PI / 2],
    [w / 2 - r, h / 2 - r, 0],
    [-w / 2 + r, h / 2 - r, Math.PI / 2],
    [-w / 2 + r, -h / 2 + r, Math.PI],
  ];
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= n; i++) {
      const a = a0 + (i / n) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, z]);
    }
  }
  pts.push(pts[0]);
  return pts;
}

function arcPts(r, a0, a1, n, cx = 0, cy = 0, z = 0) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, z]);
  }
  return pts;
}

function circlePts(r, n, z = 0) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([Math.cos(a) * r, Math.sin(a) * r, z]);
  }
  return pts;
}

/* tile slots: col 0..2, row 0..1 */
function slot(i) {
  const col = i % 3;
  const row = Math.floor(i / 3);
  const a = (col - 1) * COL_A;
  return {
    x: Math.sin(a) * WALL_R,
    y: (0.5 - row) * (TILE_H + GAP),
    z: WALL_R - Math.cos(a) * WALL_R,
    ry: -a,
  };
}

/* --------------------------------------------------------------- pieces */

function Person({ variant }) {
  // a few quiet variations so the six people are not clones
  const headR = 0.12 + (variant % 3) * 0.012;
  const off = ((variant * 7) % 5 - 2) * 0.05;
  const lean = ((variant * 3) % 4 - 1.5) * 0.06;
  const hair = variant % 2 === 1;
  return (
    <group position={[off, -0.06, TILE_D / 2 + 0.01]} rotation={[0, lean, 0]}>
      <InkWire position={[0, 0.14, 0]}>
        <sphereGeometry args={[headR, 9, 6]} />
      </InkWire>
      {hair && (
        <InkWire position={[0, 0.14 + headR * 0.55, -headR * 0.35]}>
          <sphereGeometry args={[headR * 0.5, 7, 4]} />
        </InkWire>
      )}
      {/* shoulders: a flattened wire dome */}
      <InkWire position={[0, -0.14, 0]} scale={[1.55, 0.95, 0.65]}>
        <sphereGeometry args={[0.24, 10, 4, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </InkWire>
    </group>
  );
}

function Tile({ index, tileRef, ringRef, micRef, geometry, faceGeometry }) {
  const { paper } = useInk();
  const s = slot(index);
  const bezel = React.useMemo(() => roundedRectPts(TILE_W - 0.09, TILE_H - 0.09, 0.05, 5, TILE_D / 2 + 0.003), []);
  // sound arcs: a ")))" pair either side of the head
  const arcs = React.useMemo(() => {
    const z = TILE_D / 2 + 0.012;
    // ±0.62 rad so the largest ring (scale 0.48) stays inside the tile bezel
    const right = arcPts(1, -0.62, 0.62, 14, 0, 0, z);
    const left = arcPts(1, Math.PI - 0.62, Math.PI + 0.62, 14, 0, 0, z);
    return [right, left];
  }, []);
  const headOff = ((index * 7) % 5 - 2) * 0.05;
  return (
    <group position={[s.x, s.y, s.z]} rotation={[0, s.ry, 0]}>
      <group ref={tileRef}>
        <InkMesh geometry={geometry} position={[0, 0, -TILE_D / 2]} hatch={5} strength={0.9} threshold={25} />
        {/* always-clean paper face so the hatch only lands on the tile sides */}
        <mesh geometry={faceGeometry} position={[0, 0, TILE_D / 2 + 0.001]}>
          <meshBasicMaterial color={paper} toneMapped={false} />
        </mesh>
        <InkLine points={bezel} lineWidth={0.7} opacity={0.6} />
        <Person variant={index} />
        {/* name bar + mic dot, bottom-left */}
        <InkFlat position={[-TILE_W / 2 + 0.26, -TILE_H / 2 + 0.1, TILE_D / 2 + 0.004]}>
          <planeGeometry args={[0.3, 0.035]} />
        </InkFlat>
        <group position={[TILE_W / 2 - 0.12, -TILE_H / 2 + 0.1, TILE_D / 2 + 0.004]}>
          <InkLine points={circlePts(0.035, 16)} lineWidth={0.8} />
          <InkFlat ref={micRef}>
            <circleGeometry args={[0.028, 14]} />
          </InkFlat>
        </group>
        {/* sound arcs (scaled + faded per frame), centred on the head */}
        <group ref={ringRef} position={[headOff, 0.08, 0]}>
          {Array.from({ length: RINGS }).map((_, k) => (
            <group key={k}>
              <InkLine points={arcs[0]} lineWidth={1} opacity={0} />
              <InkLine points={arcs[1]} lineWidth={1} opacity={0} />
            </group>
          ))}
        </group>
      </group>
    </group>
  );
}

/* ----------------------------------------------------------------- scene */

export default function MeetingScene({ trackRef, reduced, mobile }) {
  const view = useViewProgress(trackRef);
  const { ink } = useInk();

  const root = React.useRef();
  const camRef = React.useRef();
  const tileRefs = React.useRef([]);
  const ringRefs = React.useRef([]);
  const micRefs = React.useRef([]);
  const wordsRef = React.useRef();
  const caretRef = React.useRef();
  const recRef = React.useRef();

  const tileGeo = React.useMemo(() => {
    const g = new THREE.ExtrudeGeometry(roundedRect(TILE_W, TILE_H, TILE_R), { depth: TILE_D, bevelEnabled: false, curveSegments: 6 });
    g.computeVertexNormals();
    return g;
  }, []);
  const faceGeo = React.useMemo(() => new THREE.ShapeGeometry(roundedRect(TILE_W - 0.004, TILE_H - 0.004, TILE_R), 6), []);
  const barFrame = React.useMemo(() => roundedRectPts(BAR_W, BAR_H, 0.06, 5, 0), []);

  // transcript stream: word widths and gaps, deterministic
  const NW = mobile ? 28 : 44;
  const words = React.useMemo(() => {
    const list = [];
    let x = 0;
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < NW; i++) {
      const w = 0.08 + rnd() * 0.22;
      list.push({ x, w, bold: rnd() < 0.18 });
      x += w + 0.045 + (rnd() < 0.12 ? 0.08 : 0);
    }
    return { list, length: x + 0.4 };
  }, [NW]);

  const tmp = React.useMemo(() => ({ v: new THREE.Vector3(), o: new THREE.Object3D(), rot: { x: 0, y: 0 }, nudge: new Float32Array(6) }), []);

  useFrame((state, dt) => {
    const time = reduced ? 1.6 : state.clock.elapsedTime;
    const { pointer, t } = view.current;
    const { v, o, rot, nudge } = tmp;

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

    /* parallax */
    if (root.current) {
      const ty = (reduced ? 0 : 0.04 * Math.sin(time * 0.15)) + pointer.x * 0.28;
      const tx = -pointer.y * 0.1 + (t - 0.5) * 0.1;
      const k = reduced ? 1 : Math.min(1, dt * 2.5);
      rot.y += (ty - rot.y) * k;
      rot.x += (tx - rot.x) * k;
      root.current.rotation.set(rot.x, rot.y, 0);
    }

    /* who is speaking */
    const turn = Math.floor(time / SPEAK_T);
    const speaker = ORDER[((turn % ORDER.length) + ORDER.length) % ORDER.length];
    const uTurn = time - turn * SPEAK_T;

    for (let i = 0; i < 6; i++) {
      const g = tileRefs.current[i];
      if (!g) continue;
      const target = i === speaker ? 1 : 0;
      nudge[i] += (target - nudge[i]) * (reduced ? 1 : Math.min(1, dt * 4));
      g.position.z = nudge[i] * NUDGE;
      // a breath of life on every tile
      g.position.y = reduced ? 0 : 0.012 * Math.sin(time * 0.6 + i * 1.7);
      const mic = micRefs.current[i];
      if (mic) mic.scale.setScalar(0.0001 + nudge[i]);
      const rg = ringRefs.current[i];
      if (rg) {
        for (let k = 0; k < rg.children.length; k++) {
          const ring = rg.children[k];
          let s = 0;
          let op = 0;
          if (i === speaker && !reduced) {
            const u = ((uTurn + (k * RING_T) / RINGS) % RING_T) / RING_T;
            s = 0.18 + u * 0.3;
            op = Math.sin(u * Math.PI) * 0.9 * smooth(uTurn / 0.5);
          } else if (i === speaker && reduced) {
            s = 0.24 + k * 0.12;
            op = 0.85 - k * 0.25;
          }
          ring.scale.set(s || 0.0001, s || 0.0001, 1);
          for (let c = 0; c < ring.children.length; c++) {
            const line = ring.children[c];
            if (line && line.material) {
              line.material.opacity = op;
              line.material.transparent = true;
            }
          }
        }
      }
    }

    /* transcript */
    const wm = wordsRef.current;
    if (wm) {
      const speed = reduced ? 0 : 0.32;
      const head = time * speed; // how much text has been written
      const innerW = BAR_W - 0.3;
      const left = -innerW / 2;
      const right = innerW / 2;
      const L = words.length;
      for (let i = 0; i < words.list.length; i++) {
        const w = words.list[i];
        // words scroll left; the newest word sits at the right edge (the caret)
        let x0 = right - 0.08 - (((head - w.x) % L) + L) % L; // left edge of the word
        let x1 = x0 + w.w;
        // clip to the bar
        x0 = Math.max(x0, left);
        x1 = Math.min(x1, right - 0.08);
        const vis = x1 - x0;
        if (vis <= 0.005) {
          o.scale.set(0.0001, 0.0001, 1);
          o.position.set(0, 0, 0);
        } else {
          o.position.set((x0 + x1) / 2, w.bold ? 0.0 : 0.0, 0.002);
          o.scale.set(vis, w.bold ? 1.6 : 1, 1);
        }
        o.rotation.set(0, 0, 0);
        o.updateMatrix();
        wm.setMatrixAt(i, o.matrix);
      }
      wm.instanceMatrix.needsUpdate = true;
      if (caretRef.current) caretRef.current.scale.y = reduced || Math.sin(time * 6) > -0.2 ? 1 : 0.0001;
    }

    /* record dot */
    if (recRef.current) {
      const on = reduced || (time % 1.4) < 0.95;
      recRef.current.scale.setScalar(on ? 1 : 0.0001);
    }
  });

  return (
    <group>
      <PerspectiveCamera ref={camRef} makeDefault position={[0, 0.6, 7]} fov={CAM_FOV} near={0.1} far={60} />
      <group ref={root}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Tile
            key={i}
            index={i}
            geometry={tileGeo}
            faceGeometry={faceGeo}
            tileRef={(el) => (tileRefs.current[i] = el)}
            ringRef={(el) => (ringRefs.current[i] = el)}
            micRef={(el) => (micRefs.current[i] = el)}
          />
        ))}

        {/* record indicator, top-left of the wall */}
        <group position={[slot(0).x - TILE_W / 2 + 0.1, TILE_H + GAP / 2 + 0.2, slot(0).z]} rotation={[0, slot(0).ry, 0]}>
          <InkLine points={circlePts(0.07, 20)} lineWidth={0.9} />
          <InkFlat ref={recRef}>
            <circleGeometry args={[0.042, 14]} />
          </InkFlat>
          <InkFlat position={[0.27, 0, 0.001]}>
            <planeGeometry args={[0.22, 0.022]} />
          </InkFlat>
        </group>

        {/* transcript bar */}
        <group position={[0, BAR_Y, 0.1]}>
          <InkLine points={barFrame} lineWidth={1} />
          {/* speaker glyph at the left: a small filled square */}
          <InkFlat position={[-BAR_W / 2 + 0.17, 0, 0.002]}>
            <planeGeometry args={[0.07, 0.07]} />
          </InkFlat>
          <InkLine points={[[-BAR_W / 2 + 0.3, -BAR_H / 2 + 0.03, 0.002], [-BAR_W / 2 + 0.3, BAR_H / 2 - 0.03, 0.002]]} lineWidth={0.7} opacity={0.6} />
          <group position={[0.15, 0, 0]}>
            <instancedMesh ref={wordsRef} args={[undefined, undefined, NW]}>
              <planeGeometry args={[1, 0.045]} />
              <meshBasicMaterial color={ink} toneMapped={false} />
            </instancedMesh>
          </group>
          <InkFlat ref={caretRef} position={[BAR_W / 2 - 0.17, 0, 0.003]}>
            <planeGeometry args={[0.016, 0.12]} />
          </InkFlat>
        </group>
      </group>
    </group>
  );
}
