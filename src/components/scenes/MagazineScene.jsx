"use client";
/**
 * "magazine" – Magazine Works: AI-generated magazine pages.
 *
 *   desk    : a thin slab. On it an open spread – a fanned stack of pages on
 *             the right (waiting), a fanned stack on the left (done), the
 *             spine between them. A fanned pile of finished issues sits at
 *             the back-left.
 *   AI      : a small wireframe icosahedron hovers above the right page and
 *             emits dashed lines into it; the page's text bars and hatched
 *             image block draw in progressively.
 *   turn    : when the page is complete it lifts at the spine, flips over and
 *             lands on the left stack. The static pages beneath are laid out
 *             so the dynamic page coincides with them at both ends of its
 *             cycle, making the loop seamless.
 *
 * Ink language: thin bars = text, hatched rectangle = image, dashed = data,
 * wireframe = the model.
 */
import * as React from "react";
import * as THREE from "three";
import { useSceneFrame as useFrame } from "../three/useSceneFrame";
import { PerspectiveCamera } from "@react-three/drei";
import { InkMesh, InkWire, InkLine, InkFlat, useInk } from "../three/Ink";
import { useViewProgress } from "../three/useViewProgress";

/* ------------------------------------------------------------------ layout */
const CAM_FOV = 28;
const CAM_DIR = new THREE.Vector3(0.12, 0.8, 1).normalize();
const LOOK = new THREE.Vector3(0.05, 0.16, 0.05);
const FIT_HALF_W = 2.55;
const FIT_HALF_H = 1.42;

const W = 1.0; // page width (x)
const D = 1.3; // page depth (z)
const TH = 0.014; // page thickness
const SPINE_X = 0.25;
const N_RIGHT = 7;
const N_LEFT = 6;
const DESK = [4.1, 0.05, 2.5];
const TOP = N_RIGHT * TH; // top of the right stack = hinge height + TH
const HINGE_Y = TOP - TH;
const AI_POS = new THREE.Vector3(SPINE_X + 0.62, 1.12, 0.05);
const PERIOD = 10;
const U_GEN = 0.52; // generation ends
const U_FLIP0 = 0.6; // flip starts
const U_FLIP1 = 0.88; // flip ends

const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/** Layout A: the page the AI generates. Bars in page-local coords (x from spine, z). */
const LAYOUT_A = (() => {
  const bars = [];
  // image block top-left: hatch lines inside a 0.4 x 0.34 rect
  const bx = 0.12;
  const bz = -0.5;
  const bw = 0.4;
  const bd = 0.34;
  const hatch = [];
  for (let k = 1; k < 8; k++) {
    const s = (k / 8) * (bw + bd);
    const x0 = bx + Math.max(0, s - bd);
    const z0 = bz + Math.min(s, bd);
    const x1 = bx + Math.min(s, bw);
    const z1 = bz + Math.max(0, s - bw);
    hatch.push([x0, z0, x1, z1]);
  }
  // headline right of the image
  bars.push([0.58, -0.48, 0.34, 0.03]);
  bars.push([0.58, -0.41, 0.26, 0.03]);
  // text rows right of the image
  for (let i = 0; i < 4; i++) bars.push([0.58, -0.33 + i * 0.05, 0.3 - (i % 3) * 0.04, 0.014]);
  // two columns below
  for (let i = 0; i < 9; i++) {
    bars.push([0.12, -0.08 + i * 0.058, 0.38 - ((i * 5) % 4) * 0.03, 0.014]);
    bars.push([0.56, -0.08 + i * 0.058, 0.34 - ((i * 3) % 4) * 0.03, 0.014]);
  }
  return { block: [bx, bz, bw, bd], hatch, bars };
})();

/** Layout B: a finished page (static). */
function layoutBPoints(mirror = 1, y = 0) {
  const pts = [];
  const X = (x) => mirror * x;
  // headline
  pts.push([X(0.12), y, -0.52], [X(0.78), y, -0.52]);
  pts.push([X(0.12), y, -0.47], [X(0.6), y, -0.47]);
  // three columns of text
  for (let c = 0; c < 2; c++) {
    const x0 = 0.12 + c * 0.44;
    for (let i = 0; i < 12; i++) {
      const z = -0.36 + i * 0.05;
      if (c === 1 && i > 6) break;
      pts.push([X(x0), y, z], [X(x0 + 0.34 - ((i * 7 + c) % 4) * 0.03), y, z]);
    }
  }
  // image block bottom-right with hatch
  const bx = 0.56;
  const bz = 0.02;
  const bw = 0.34;
  const bd = 0.44;
  pts.push([X(bx), y, bz], [X(bx + bw), y, bz], [X(bx + bw), y, bz], [X(bx + bw), y, bz + bd], [X(bx + bw), y, bz + bd], [X(bx), y, bz + bd], [X(bx), y, bz + bd], [X(bx), y, bz]);
  for (let k = 1; k < 9; k++) {
    const s = (k / 9) * (bw + bd);
    pts.push([X(bx + Math.max(0, s - bd)), y, bz + Math.min(s, bd)], [X(bx + Math.min(s, bw)), y, bz + Math.max(0, s - bw)]);
  }
  return pts;
}

function hatchLines(bx, bz, bw, bd, y, n) {
  const pts = [];
  for (let k = 1; k < n; k++) {
    const s = (k / n) * (bw + bd);
    pts.push([bx + Math.max(0, s - bd), y, bz + Math.min(s, bd)], [bx + Math.min(s, bw), y, bz + Math.max(0, s - bw)]);
  }
  return pts;
}

function blockOutline(bx, bz, bw, bd, y) {
  return [[bx, y, bz], [bx + bw, y, bz], [bx + bw, y, bz + bd], [bx, y, bz + bd], [bx, y, bz]];
}

/* --------------------------------------------------------------- pieces */

function Page({ y, fan, side, children, hatch = 6, strength = 0.5 }) {
  // fanned about the spine-front corner
  return (
    <group position={[SPINE_X, y, D / 2]} rotation={[0, fan, 0]}>
      <group position={[(side * W) / 2, TH / 2, -D / 2]}>
        <InkMesh hatch={hatch} strength={strength} fill={0.0}>
          <boxGeometry args={[W, TH, D]} />
        </InkMesh>
        {children}
      </group>
    </group>
  );
}

function Desk() {
  return (
    <group>
      <InkMesh position={[0, -DESK[1] / 2, 0]} hatch={6} strength={0.3} fill={0.02}>
        <boxGeometry args={DESK} />
      </InkMesh>
    </group>
  );
}

function FinishedPile() {
  const cover = React.useMemo(() => {
    const pts = [];
    pts.push([-0.32, 0.001, -0.45], [0.2, 0.001, -0.45]);
    pts.push([-0.32, 0.001, -0.38], [0.05, 0.001, -0.38]);
    for (let i = 0; i < 5; i++) pts.push([-0.32, 0.001, 0.2 + i * 0.05], [-0.32 + 0.3 - (i % 2) * 0.06, 0.001, 0.2 + i * 0.05]);
    return pts;
  }, []);
  const issues = [
    [0, -0.18],
    [1, 0.12],
    [2, -0.05],
    [3, 0.22],
  ];
  return (
    <group position={[-1.45, 0, -0.55]}>
      {issues.map(([i, a]) => (
        <group key={i} position={[0, i * 0.045 + 0.0225, 0]} rotation={[0, a, 0]}>
          <InkMesh hatch={5} strength={0.75} fill={0.04}>
            <boxGeometry args={[0.8, 0.045, 1.05]} />
          </InkMesh>
          {i === 3 && (
            <group position={[0, 0.0225, 0]}>
              <InkLine points={cover} segments lineWidth={0.9} opacity={0.85} />
              <InkLine points={hatchLines(-0.11, -0.26, 0.42, 0.42, 0.002, 7)} segments lineWidth={0.8} opacity={0.9} />
              <InkLine points={blockOutline(-0.11, -0.26, 0.42, 0.42, 0.003)} lineWidth={0.9} />
            </group>
          )}
        </group>
      ))}
    </group>
  );
}

/* ----------------------------------------------------------------- scene */

export default function MagazineScene({ trackRef, reduced, mobile }) {
  const view = useViewProgress(trackRef);
  const { ink } = useInk();

  const root = React.useRef();
  const camRef = React.useRef();
  const hingeRef = React.useRef();
  const barsRef = React.useRef();
  const aiRef = React.useRef();
  const linesRef = React.useRef();
  const dotsRef = React.useRef();

  const barGeo = React.useMemo(() => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), []);
  // every drawable element of layout A in draw order: [x0, z0, x1, z1, thickness]
  const strokes = React.useMemo(() => {
    const list = [];
    const [bx, bz, bw, bd] = LAYOUT_A.block;
    // block outline first
    list.push([bx, bz, bx + bw, bz, 0.012], [bx + bw, bz, bx + bw, bz + bd, 0.012], [bx + bw, bz + bd, bx, bz + bd, 0.012], [bx, bz + bd, bx, bz, 0.012]);
    for (const h of LAYOUT_A.hatch) list.push([...h, 0.01]);
    for (const [x, z, len, t] of LAYOUT_A.bars) list.push([x, z, x + len, z, t]);
    return list;
  }, []);
  const nStrokes = strokes.length;
  const layoutBLeft = React.useMemo(() => layoutBPoints(-1, TH / 2 + 0.001), []);
  const layoutBBack = React.useMemo(() => layoutBPoints(1, -TH / 2 - 0.001), []);
  const blockA = React.useMemo(() => blockOutline(...LAYOUT_A.block, TH / 2 + 0.001), []);

  const nDots = mobile ? 2 : 4;
  const linePos = React.useMemo(() => new Float32Array(3 * 2 * 3), []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tmp = React.useMemo(
    () => ({ v: new THREE.Vector3(), w: new THREE.Vector3(), tip: new THREE.Vector3(), o: new THREE.Object3D(), rot: { x: 0, y: 0 } }),
    []
  );

  useFrame((state, dt) => {
    const time = reduced ? 3.4 : state.clock.elapsedTime;
    const { pointer, t } = view.current;
    const { v, w, tip, o, rot } = tmp;

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

    /* whole drawing: parallax */
    if (root.current) {
      const ty = (reduced ? 0 : 0.08 * Math.sin(time * 0.1)) + pointer.x * 0.22;
      const tx = -pointer.y * 0.08 + (t - 0.5) * 0.1;
      const k = reduced ? 1 : Math.min(1, dt * 2.5);
      rot.y += (ty - rot.y) * k;
      rot.x += (tx - rot.x) * k;
      root.current.rotation.set(rot.x, rot.y, 0);
    }

    /* cycle */
    let u = (time / PERIOD) % 1;
    if (u < 0) u += 1;
    const gen = reduced ? 0.72 : Math.min(1, u / U_GEN);
    const flip = reduced ? 0 : smooth((u - U_FLIP0) / (U_FLIP1 - U_FLIP0));
    const theta = flip * Math.PI;

    if (hingeRef.current) hingeRef.current.rotation.z = theta;

    /* strokes draw in */
    const bm = barsRef.current;
    let tipX = strokes[0][0];
    let tipZ = strokes[0][1];
    if (bm) {
      const per = 1 / nStrokes;
      for (let i = 0; i < nStrokes; i++) {
        const [x0, z0, x1, z1, th] = strokes[i];
        const k = Math.min(1, Math.max(0, (gen - i * per) / per));
        const kk = k * k * (3 - 2 * k);
        const dx = x1 - x0;
        const dz = z1 - z0;
        const len = Math.hypot(dx, dz) * kk;
        if (kk > 0 && kk < 1) {
          tipX = x0 + dx * kk;
          tipZ = z0 + dz * kk;
        } else if (kk >= 1) {
          tipX = x1;
          tipZ = z1;
        }
        o.position.set(x0 + (dx * kk) / 2, TH + 0.002, z0 + (dz * kk) / 2);
        o.rotation.set(0, -Math.atan2(dz, dx), 0);
        o.scale.set(Math.max(len, 0.0001), 1, th);
        o.updateMatrix();
        bm.setMatrixAt(i, o.matrix);
      }
      bm.instanceMatrix.needsUpdate = true;
    }

    /* the AI: hover, spin, lean toward the page while generating */
    const ai = aiRef.current;
    const active = reduced ? 1 : gen < 1 ? smooth(u / 0.05) : Math.max(0, 1 - (u - U_GEN) / 0.08);
    if (ai) {
      ai.position.set(AI_POS.x, AI_POS.y + (reduced ? 0 : 0.05 * Math.sin(time * 1.1)), AI_POS.z);
      ai.rotation.set(time * 0.25, time * 0.4, 0);
      const s = 1 + 0.06 * active * Math.sin(time * 3);
      ai.scale.setScalar(s);
    }

    /* dashed lines from the AI into the page: to the stroke tip, the image block, and the far corner */
    const lk = linesRef.current;
    if (lk) {
      const [bx, bz, bw, bd] = LAYOUT_A.block;
      const targets = [
        [SPINE_X + tipX, TOP + 0.002, tipZ],
        [SPINE_X + bx + bw / 2, TOP + 0.002, bz + bd / 2],
        [SPINE_X + W - 0.08, TOP + 0.002, D / 2 - 0.1],
      ];
      for (let i = 0; i < 3; i++) {
        linePos[i * 6] = AI_POS.x;
        linePos[i * 6 + 1] = AI_POS.y - 0.12;
        linePos[i * 6 + 2] = AI_POS.z;
        linePos[i * 6 + 3] = targets[i][0];
        linePos[i * 6 + 4] = targets[i][1];
        linePos[i * 6 + 5] = targets[i][2];
      }
      lk.geometry.attributes.position.needsUpdate = true;
      lk.computeLineDistances();
      lk.material.opacity = 0.85 * active;
      lk.material.dashOffset = -time * 0.5;
      lk.visible = active > 0.01;
      // packets falling along the tip line
      const dm = dotsRef.current;
      if (dm) {
        tip.set(targets[0][0], targets[0][1], targets[0][2]);
        w.set(AI_POS.x, AI_POS.y - 0.12, AI_POS.z);
        for (let j = 0; j < nDots; j++) {
          const k = ((time * 0.45 + j / nDots) % 1 + 1) % 1;
          v.copy(w).lerp(tip, k);
          o.position.copy(v);
          o.rotation.set(0, 0, 0);
          o.scale.setScalar(active > 0.01 ? 1 : 0.0001);
          o.updateMatrix();
          dm.setMatrixAt(j, o.matrix);
        }
        dm.instanceMatrix.needsUpdate = true;
      }
    }
  });

  return (
    <group>
      <PerspectiveCamera ref={camRef} makeDefault position={[0.5, 4, 5]} fov={CAM_FOV} near={0.1} far={60} />
      <group ref={root}>
        <Desk />
        <FinishedPile />

        {/* right stack (waiting): fanned, blank except the top which carries the block outline */}
        {Array.from({ length: N_RIGHT }, (_, i) => (
          <Page key={`r${i}`} y={i * TH} fan={(i - N_RIGHT + 1) * 0.028} side={1}>
            {i === N_RIGHT - 1 && <InkLine points={blockA.map(([x, y, z]) => [x - W / 2, y, z])} lineWidth={0.9} opacity={0.9} />}
          </Page>
        ))}

        {/* left stack (done): fanned the other way, top page shows layout B */}
        {Array.from({ length: N_LEFT }, (_, i) => (
          <Page key={`l${i}`} y={i * TH} fan={-(i - N_LEFT + 1) * 0.028} side={-1}>
            {i === N_LEFT - 1 && <InkLine points={layoutBLeft.map(([x, y, z]) => [x + W / 2, y, z])} segments lineWidth={0.9} opacity={0.9} />}
          </Page>
        ))}

        {/* spine */}
        <InkLine points={[[SPINE_X, TOP + 0.003, -D / 2], [SPINE_X, TOP + 0.003, D / 2]]} lineWidth={1.2} />

        {/* the dynamic page: hinged at the spine, front = generated layout A, back = layout B */}
        <group ref={hingeRef} position={[SPINE_X, HINGE_Y, 0]}>
          <group position={[W / 2, TH / 2, 0]}>
            <InkMesh hatch={6} strength={0.5} fill={0.0}>
              <boxGeometry args={[W, TH, D]} />
            </InkMesh>
            <InkLine points={layoutBBack.map(([x, y, z]) => [x - W / 2, y, z])} segments lineWidth={0.9} opacity={0.9} />
          </group>
          <instancedMesh ref={barsRef} args={[barGeo, undefined, nStrokes]} position={[0, 0, 0]}>
            <meshBasicMaterial color={ink} side={THREE.DoubleSide} />
          </instancedMesh>
        </group>

        {/* the AI */}
        <group ref={aiRef} position={AI_POS.toArray()}>
          <InkWire>
            <icosahedronGeometry args={[0.2, 0]} />
          </InkWire>
          <InkFlat>
            <sphereGeometry args={[0.045, 10, 8]} />
          </InkFlat>
        </group>
        <lineSegments ref={linesRef}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[linePos, 3]} />
          </bufferGeometry>
          <lineDashedMaterial color={ink} dashSize={0.06} gapSize={0.045} transparent opacity={0.85} />
        </lineSegments>
        <instancedMesh ref={dotsRef} args={[undefined, undefined, nDots]}>
          <sphereGeometry args={[0.022, 8, 6]} />
          <meshBasicMaterial color={ink} />
        </instancedMesh>
      </group>
    </group>
  );
}
