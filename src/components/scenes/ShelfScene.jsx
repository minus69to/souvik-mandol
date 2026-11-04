"use client";
/**
 * "shelf" – Insomniyuck, a personal memory archive, drawn as two shelf planks
 * holding the things memories are made of:
 *
 *   top plank    : a row of books (one leaning), a camera with its lens, a film
 *                  reel standing on edge, a mountain postcard propped at the back.
 *   bottom plank : two books lying flat, a running shoe, a coffee cup with steam,
 *                  a second short run of books with one leaning on the last.
 *
 * A slow light sweep travels along the shelves: as it passes an object the
 * object is briefly "filled" with solid ink, then settles back to hatched –
 * a memory recalled, then put away. Everything bobs very gently.
 * Ink language: hatched = archived, filled = recalled, dashed = the sweep.
 */
import * as React from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { InkMesh, InkLine, InkFlat } from "../three/Ink";
import { useViewProgress } from "../three/useViewProgress";

/* ------------------------------------------------------------------ layout */
const CAM_FOV = 28;
const CAM_DIR = new THREE.Vector3(-0.36, 0.3, 1).normalize();
const LOOK_Y = 0.2;
const FIT_HALF_W = 3.1;
const FIT_HALF_H = 1.62;

const PLANK_W = 5.6;
const PLANK_T = 0.09;
const PLANK_D = 1.15;
const TOP_Y = 0.78; // top surface of the upper plank
const BOT_Y = -0.62; // top surface of the lower plank
const SWEEP_PERIOD = 13; // seconds for one pass
const SWEEP_FROM = -3.4;
const SWEEP_TO = 3.4;
const SWEEP_WIDTH = 0.42;

const lerp = (a, b, k) => a + (b - a) * k;

function circlePts(r, n, axis = "z", off = [0, 0, 0]) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const c = Math.cos(a) * r;
    const s = Math.sin(a) * r;
    if (axis === "z") pts.push([off[0] + c, off[1] + s, off[2]]);
    else if (axis === "y") pts.push([off[0] + c, off[1], off[2] + s]);
    else pts.push([off[0], off[1] + c, off[2] + s]);
  }
  return pts;
}

/** Marks a group as a sweep target: all InkMaterials inside get filled as the light passes. */
function Sweepable({ children, position, rotation, bob = 1 }) {
  return (
    <group position={position} rotation={rotation} userData={{ sweep: true, bob, baseY: position ? position[1] : 0 }}>
      {children}
    </group>
  );
}

/* --------------------------------------------------------------- objects */

function Plank({ y }) {
  const brackets = React.useMemo(() => {
    const out = [];
    for (const x of [-2.25, 2.25]) {
      const dir = x < 0 ? 1 : -1;
      const yb = y - PLANK_T;
      out.push([x, yb, 0], [x, yb - 0.42, 0], [x, yb - 0.42, 0], [x + 0.34 * dir, yb, 0]);
    }
    return out;
  }, [y]);
  return (
    <group>
      <InkMesh position={[0, y - PLANK_T / 2, 0]} hatch={5} strength={0.95} fill={0.04}>
        <boxGeometry args={[PLANK_W, PLANK_T, PLANK_D]} />
      </InkMesh>
      {/* wood grain hint on the front edge */}
      <InkLine
        points={[
          [-2.6, y - PLANK_T * 0.55, PLANK_D / 2 + 0.002],
          [2.6, y - PLANK_T * 0.55, PLANK_D / 2 + 0.002],
        ]}
        lineWidth={0.5}
        opacity={0.35}
      />
      <InkLine points={brackets} segments lineWidth={0.9} opacity={0.8} />
    </group>
  );
}

function Standards() {
  const pts = React.useMemo(() => {
    const out = [];
    for (const x of [-2.78, 2.78]) {
      out.push([x, -1.25, -0.3], [x, 1.5, -0.3]);
      for (let y = -1.1; y < 1.5; y += 0.2) out.push([x - 0.03, y, -0.3], [x + 0.03, y, -0.3]);
    }
    return out;
  }, []);
  return <InkLine points={pts} segments lineWidth={0.7} opacity={0.55} />;
}

function Book({ w, h, d = 0.5, lean = 0, x, y, bob, hatch = 6, strength = 1 }) {
  // rest the lowest corner on the plank surface
  const cy = y + (h / 2) * Math.cos(lean) + (w / 2) * Math.abs(Math.sin(lean));
  const spine = React.useMemo(() => {
    const z = d / 2 + 0.002;
    return [
      [-w * 0.3, h * 0.3, z],
      [w * 0.3, h * 0.3, z],
      [-w * 0.3, h * 0.22, z],
      [w * 0.3, h * 0.22, z],
      [-w * 0.3, -h * 0.3, z],
      [w * 0.3, -h * 0.3, z],
    ];
  }, [w, h, d]);
  return (
    <Sweepable position={[x, cy, 0]} rotation={[0, 0, lean]} bob={bob}>
      <InkMesh hatch={hatch} strength={strength}>
        <boxGeometry args={[w, h, d]} />
      </InkMesh>
      <InkLine points={spine} segments lineWidth={0.6} opacity={0.75} />
      {/* page block: a thin lighter band along the top */}
      <InkLine points={[[-w / 2 + 0.01, h / 2 - 0.012, d / 2 + 0.002], [w / 2 - 0.01, h / 2 - 0.012, d / 2 + 0.002]]} lineWidth={0.5} opacity={0.5} />
    </Sweepable>
  );
}

function FlatBooks({ x, y }) {
  return (
    <Sweepable position={[x, y, 0]} bob={0.5}>
      <InkMesh position={[0, 0.045, 0]} rotation={[0, 0.12, 0]} hatch={6}>
        <boxGeometry args={[0.6, 0.09, 0.44]} />
      </InkMesh>
      <InkMesh position={[0.05, 0.13, -0.02]} rotation={[0, -0.08, 0]} hatch={6}>
        <boxGeometry args={[0.52, 0.08, 0.4]} />
      </InkMesh>
      <InkMesh position={[-0.02, 0.2, 0.02]} rotation={[0, 0.2, 0]} hatch={6}>
        <boxGeometry args={[0.46, 0.06, 0.34]} />
      </InkMesh>
    </Sweepable>
  );
}

function Camera({ x, y }) {
  const bw = 0.62;
  const bh = 0.36;
  const bd = 0.26;
  return (
    <Sweepable position={[x, y + bh / 2, 0.05]} rotation={[0, 0.3, 0]} bob={0.8}>
      <InkMesh hatch={5}>
        <boxGeometry args={[bw, bh, bd]} />
      </InkMesh>
      {/* lens barrel */}
      <InkMesh position={[0.04, 0, bd / 2 + 0.09]} rotation={[Math.PI / 2, 0, 0]} hatch={4}>
        <cylinderGeometry args={[0.15, 0.16, 0.18, 24]} />
      </InkMesh>
      <InkLine points={circlePts(0.1, 32, "z", [0.04, 0, bd / 2 + 0.181])} lineWidth={0.9} />
      <InkLine points={circlePts(0.05, 24, "z", [0.04, 0, bd / 2 + 0.182])} lineWidth={0.7} />
      <InkFlat position={[0.04, 0, bd / 2 + 0.183]}>
        <circleGeometry args={[0.022, 16]} />
      </InkFlat>
      {/* viewfinder hump + shutter button */}
      <InkMesh position={[-0.04, bh / 2 + 0.05, -0.02]} hatch={5}>
        <boxGeometry args={[0.2, 0.1, 0.16]} />
      </InkMesh>
      <InkMesh position={[0.2, bh / 2 + 0.025, 0.02]} hatch={4}>
        <cylinderGeometry args={[0.03, 0.03, 0.05, 12]} />
      </InkMesh>
      {/* grip hatch on the body */}
      <InkLine
        points={[
          [-0.25, 0.1, bd / 2 + 0.002],
          [-0.25, -0.12, bd / 2 + 0.002],
          [-0.2, 0.1, bd / 2 + 0.002],
          [-0.2, -0.12, bd / 2 + 0.002],
        ]}
        segments
        lineWidth={0.6}
        opacity={0.7}
      />
      {/* strap lug */}
      <InkLine points={circlePts(0.03, 12, "x", [-bw / 2 - 0.002, 0.1, 0])} lineWidth={0.7} />
    </Sweepable>
  );
}

function FilmReel({ x, y, spinRef }) {
  const r = 0.3;
  const holes = React.useMemo(() => {
    const out = [];
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5;
      out.push(circlePts(0.07, 18, "z", [Math.cos(a) * 0.16, Math.sin(a) * 0.16, 0.032]));
    }
    return out;
  }, []);
  const spokes = React.useMemo(() => {
    const out = [];
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5 + Math.PI / 3;
      out.push([Math.cos(a) * 0.06, Math.sin(a) * 0.06, 0.032], [Math.cos(a) * 0.27, Math.sin(a) * 0.27, 0.032]);
    }
    return out;
  }, []);
  return (
    <Sweepable position={[x, y + r + 0.003, 0.05]} rotation={[-0.12, -0.2, 0]} bob={0.5}>
      <group ref={spinRef}>
        <InkMesh rotation={[Math.PI / 2, 0, 0]} hatch={4} strength={0.9}>
          <cylinderGeometry args={[r, r, 0.06, 32]} />
        </InkMesh>
        <InkLine points={circlePts(0.22, 40, "z", [0, 0, 0.032])} lineWidth={0.6} opacity={0.6} />
        <InkLine points={circlePts(0.05, 16, "z", [0, 0, 0.033])} lineWidth={0.9} />
        {holes.map((h, i) => (
          <InkLine key={i} points={h} lineWidth={0.8} />
        ))}
        <InkLine points={spokes} segments lineWidth={0.6} opacity={0.7} />
      </group>
      {/* a strip of film trailing from the reel */}
      <InkLine
        points={[
          [r - 0.02, -0.1, 0.0],
          [r + 0.18, -r + 0.02, 0.02],
          [r + 0.5, -r - 0.003, 0.04],
        ]}
        lineWidth={1}
      />
      <InkLine
        points={[
          [r + 0.1, -r + 0.18, 0.0],
          [r + 0.26, -r - 0.003, 0.03],
          [r + 0.5, -r - 0.003, 0.03],
        ]}
        lineWidth={1}
      />
    </Sweepable>
  );
}

function Postcard({ x, y }) {
  const w = 0.62;
  const h = 0.42;
  const tilt = -0.22;
  const art = React.useMemo(() => {
    const z = 0.012;
    // two mountains, a sun, a horizon
    return [
      [-w * 0.42, -h * 0.2, z], [-w * 0.18, h * 0.2, z],
      [-w * 0.18, h * 0.2, z], [0.0, -h * 0.2, z],
      [-w * 0.1, -h * 0.2, z], [w * 0.14, h * 0.32, z],
      [w * 0.14, h * 0.32, z], [w * 0.42, -h * 0.2, z],
      [-w * 0.42, -h * 0.2, z], [w * 0.42, -h * 0.2, z],
      // snow cap
      [w * 0.06, h * 0.12, z], [w * 0.14, h * 0.32, z],
      [w * 0.14, h * 0.32, z], [w * 0.22, h * 0.12, z],
      [w * 0.06, h * 0.12, z], [w * 0.1, h * 0.06, z],
      [w * 0.1, h * 0.06, z], [w * 0.16, h * 0.1, z],
      [w * 0.16, h * 0.1, z], [w * 0.22, h * 0.12, z],
    ];
  }, [w, h]);
  const cy = y + (h / 2) * Math.cos(tilt);
  return (
    <Sweepable position={[x, cy, -0.3 + Math.sin(-tilt) * 0]} rotation={[tilt, -0.06, 0]} bob={0.4}>
      <InkMesh hatch={6} strength={0.8}>
        <boxGeometry args={[w, h, 0.02]} />
      </InkMesh>
      <InkLine points={art} segments lineWidth={0.8} />
      <InkLine points={circlePts(0.05, 20, "z", [-w * 0.3, h * 0.27, 0.012])} lineWidth={0.7} />
      {/* stamp */}
      <InkLine
        points={[
          [w * 0.28, h * 0.42, 0.012], [w * 0.44, h * 0.42, 0.012], [w * 0.44, h * 0.26, 0.012], [w * 0.28, h * 0.26, 0.012], [w * 0.28, h * 0.42, 0.012],
        ]}
        lineWidth={0.5}
        opacity={0.5}
      />
    </Sweepable>
  );
}

function Shoe({ x, y }) {
  const { upper, sole } = React.useMemo(() => {
    // side profile, heel at -x, toe at +x, extruded across z
    const u = new THREE.Shape();
    u.moveTo(-0.4, 0.06);
    u.lineTo(0.4, 0.06);
    u.bezierCurveTo(0.47, 0.07, 0.47, 0.13, 0.4, 0.16);
    u.bezierCurveTo(0.3, 0.18, 0.18, 0.2, 0.08, 0.24);
    u.bezierCurveTo(0.0, 0.28, -0.04, 0.33, -0.1, 0.34);
    u.bezierCurveTo(-0.2, 0.36, -0.3, 0.4, -0.37, 0.36);
    u.bezierCurveTo(-0.44, 0.31, -0.44, 0.15, -0.4, 0.06);
    const so = new THREE.Shape();
    so.moveTo(-0.44, 0);
    so.lineTo(0.42, 0);
    so.bezierCurveTo(0.5, 0.0, 0.5, 0.075, 0.42, 0.072);
    so.lineTo(-0.44, 0.065);
    so.lineTo(-0.44, 0);
    const opt = { bevelEnabled: false, curveSegments: 10 };
    const ug = new THREE.ExtrudeGeometry(u, { ...opt, depth: 0.3 });
    ug.translate(0, 0, -0.15);
    const sg = new THREE.ExtrudeGeometry(so, { ...opt, depth: 0.32 });
    sg.translate(0, 0, -0.16);
    return { upper: ug, sole: sg };
  }, []);
  const laces = React.useMemo(() => {
    const pts = [];
    for (let i = 0; i < 4; i++) {
      const xx = 0.1 - i * 0.065;
      const yy = 0.235 + i * 0.028;
      pts.push([xx, yy + 0.004, -0.07], [xx + 0.03, yy + 0.014, 0.07]);
      pts.push([xx + 0.03, yy + 0.004, -0.07], [xx, yy + 0.014, 0.07]);
    }
    return pts;
  }, []);
  const stripe = React.useMemo(
    () => [
      [-0.3, 0.18, 0.152], [-0.12, 0.13, 0.152], [0.1, 0.17, 0.152],
    ],
    []
  );
  return (
    <Sweepable position={[x, y, 0.1]} rotation={[0, -0.38, 0]} bob={0.5}>
      <InkMesh hatch={3} strength={1} fill={0.1}>
        <primitive object={sole} attach="geometry" />
      </InkMesh>
      <InkMesh hatch={6} strength={0.9}>
        <primitive object={upper} attach="geometry" />
      </InkMesh>
      <InkLine points={laces} segments lineWidth={0.8} />
      <InkLine points={stripe} lineWidth={1.1} />
      {/* heel tab and collar line */}
      <InkLine points={[[-0.3, 0.3, 0.152], [-0.1, 0.28, 0.152]]} lineWidth={0.6} opacity={0.6} />
    </Sweepable>
  );
}

function Cup({ x, y, steamRef }) {
  const steam = React.useMemo(() => {
    const out = [];
    for (const dx of [-0.05, 0.05]) {
      const pts = [];
      for (let i = 0; i <= 10; i++) {
        const u = i / 10;
        pts.push([dx + Math.sin(u * Math.PI * 2 + dx * 20) * 0.03, 0.36 + u * 0.34, 0]);
      }
      out.push(pts);
    }
    return out;
  }, []);
  return (
    <Sweepable position={[x, y, 0.05]} bob={0.3}>
      <InkMesh position={[0, 0.17, 0]} hatch={5}>
        <cylinderGeometry args={[0.17, 0.14, 0.34, 24]} />
      </InkMesh>
      {/* the rim and the coffee surface */}
      <InkLine points={circlePts(0.14, 32, "y", [0, 0.31, 0])} lineWidth={0.7} opacity={0.7} />
      <InkFlat position={[0, 0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.14, 24]} />
      </InkFlat>
      {/* handle */}
      <InkMesh position={[0.21, 0.17, 0]} rotation={[0, 0, 0]} hatch={4}>
        <torusGeometry args={[0.085, 0.025, 8, 20, Math.PI * 2]} />
      </InkMesh>
      <group ref={steamRef}>
        {steam.map((p, i) => (
          <InkLine key={i} points={p} dashed dashSize={0.04} gapSize={0.03} lineWidth={0.8} opacity={0.6} />
        ))}
      </group>
    </Sweepable>
  );
}

function SweepLine({ sweepRef }) {
  return (
    <group ref={sweepRef}>
      <InkLine points={[[0, -1.3, 0.62], [0, 1.55, 0.62]]} dashed dashSize={0.06} gapSize={0.06} lineWidth={0.7} opacity={0.28} />
    </group>
  );
}

/* ----------------------------------------------------------------- scene */

export default function ShelfScene({ trackRef, reduced }) {
  const view = useViewProgress(trackRef);
  const root = React.useRef();
  const camRef = React.useRef();
  const sweepRef = React.useRef();
  const spinRef = React.useRef();
  const steamRef = React.useRef();
  const targets = React.useRef(null); // [{group, mats:[{mat, base}], x, baseY, bob, phase}]

  const tmp = React.useMemo(() => ({ v: new THREE.Vector3(), rot: { x: 0, y: 0 } }), []);

  const collect = React.useCallback(() => {
    const list = [];
    if (!root.current) return list;
    root.current.traverse((g) => {
      if (!g.userData || !g.userData.sweep) return;
      const mats = [];
      g.traverse((o) => {
        if (o.isMesh && o.material && o.material.uniforms && o.material.uniforms.uFill) {
          mats.push({ mat: o.material, base: o.material.uniforms.uFill.value });
        }
      });
      list.push({ group: g, mats, x: g.position.x, baseY: g.position.y, bob: g.userData.bob ?? 1, phase: g.position.x * 1.7 + g.position.y * 3.1 });
    });
    return list;
  }, []);

  useFrame((state, dt) => {
    const time = reduced ? 7.6 : state.clock.elapsedTime;
    const { pointer, t } = view.current;
    const { v, rot } = tmp;

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

    if (root.current) {
      const ty = (reduced ? 0 : 0.05 * Math.sin(time * 0.13)) + pointer.x * 0.18;
      const tx = -pointer.y * 0.07 + (t - 0.5) * 0.12;
      const k = reduced ? 1 : Math.min(1, dt * 2.5);
      rot.y += (ty - rot.y) * k;
      rot.x += (tx - rot.x) * k;
      root.current.rotation.set(rot.x, rot.y, 0);
    }

    if (!targets.current || targets.current.length === 0) targets.current = collect();

    /* the light sweep */
    let u = (time / SWEEP_PERIOD) % 1;
    if (u < 0) u += 1;
    // ease at the ends so it lingers slightly off-shelf before returning
    const sx = lerp(SWEEP_FROM, SWEEP_TO, u);
    if (sweepRef.current) {
      sweepRef.current.position.x = sx;
      sweepRef.current.visible = !reduced;
    }
    const list = targets.current;
    for (let i = 0; i < list.length; i++) {
      const it = list[i];
      const dxs = (it.x - sx) / SWEEP_WIDTH;
      const glow = reduced ? 0 : Math.exp(-dxs * dxs);
      for (let m = 0; m < it.mats.length; m++) {
        const e = it.mats[m];
        e.mat.uniforms.uFill.value = lerp(e.base, 0.92, glow);
      }
      const bobY = reduced ? 0 : 0.012 * it.bob * Math.sin(time * 0.9 + it.phase) + glow * 0.03 * it.bob;
      it.group.position.y = it.baseY + bobY;
    }

    if (spinRef.current && !reduced) spinRef.current.rotation.z -= dt * 0.25;
    if (steamRef.current) {
      steamRef.current.rotation.y = reduced ? 0 : 0.25 * Math.sin(time * 0.6);
      steamRef.current.position.y = reduced ? 0 : 0.02 * Math.sin(time * 1.1);
      steamRef.current.scale.x = reduced ? 1 : 1 + 0.12 * Math.sin(time * 0.8 + 1);
    }
  });

  return (
    <group>
      <PerspectiveCamera ref={camRef} makeDefault position={[-1.5, 1.4, 7]} fov={CAM_FOV} near={0.1} far={60} />
      <group ref={root}>
        <Standards />
        <Plank y={TOP_Y} />
        <Plank y={BOT_Y} />

        {/* top plank, left: the books */}
        <Book x={-2.42} y={TOP_Y} w={0.17} h={0.62} bob={0.6} />
        <Book x={-2.23} y={TOP_Y} w={0.14} h={0.7} bob={0.7} hatch={5} />
        <Book x={-2.06} y={TOP_Y} w={0.16} h={0.56} bob={0.5} />
        <Book x={-1.88} y={TOP_Y} w={0.13} h={0.66} bob={0.8} hatch={7} />
        <Book x={-1.71} y={TOP_Y} w={0.18} h={0.6} bob={0.6} />
        <Book x={-1.5} y={TOP_Y} w={0.12} h={0.72} bob={0.7} hatch={5} />
        <Book x={-1.18} y={TOP_Y} w={0.15} h={0.64} bob={0.5} lean={0.42} />

        <Camera x={-0.25} y={TOP_Y} />
        <FilmReel x={0.75} y={TOP_Y} spinRef={spinRef} />
        <Postcard x={1.95} y={TOP_Y} />

        {/* bottom plank */}
        <FlatBooks x={-2.1} y={BOT_Y} />
        <Shoe x={-0.95} y={BOT_Y} />
        <Cup x={0.35} y={BOT_Y} steamRef={steamRef} />
        <Book x={1.25} y={BOT_Y} w={0.16} h={0.6} bob={0.6} hatch={5} />
        <Book x={1.44} y={BOT_Y} w={0.13} h={0.68} bob={0.7} />
        <Book x={1.62} y={BOT_Y} w={0.17} h={0.54} bob={0.5} hatch={7} />
        <Book x={1.99} y={BOT_Y} w={0.14} h={0.62} bob={0.6} lean={0.4} />

        <SweepLine sweepRef={sweepRef} />
      </group>
    </group>
  );
}
