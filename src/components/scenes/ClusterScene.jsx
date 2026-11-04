"use client";
/**
 * "cluster" – the published paper: 27 countries as points in a 3-D feature
 * space, grouped into three clusters.
 *
 *   Each cluster has its own ink encoding – filled dots, hollow rings, small
 *   hatched cubes – and a wireframe sphere at its centroid with hairlines
 *   tying every member to it. A faint axis tripod with tick marks frames the
 *   space and a translucent wireframe regression plane cuts through the
 *   clouds. The whole space turns slowly; the pointer tilts it. Points
 *   breathe gently around their positions and the centroids pulse.
 *
 * Ink language: filled / hollow / hatched = cluster membership, wire sphere
 * = centroid, hairline = assignment, grid = fitted model.
 */
import * as React from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { InkMesh, InkWire, InkLine, useInk } from "../three/Ink";
import { useViewProgress } from "../three/useViewProgress";

/* ------------------------------------------------------------------ layout */
const CAM_FOV = 28;
const CAM_DIR = new THREE.Vector3(0.5, 0.32, 1).normalize();
const LOOK = new THREE.Vector3(0.0, -0.3, 0);
const FIT_HALF_W = 2.5;
const FIT_HALF_H = 1.9;

const N_PER = 9; // countries per cluster → 27
const CENTROIDS = [
  new THREE.Vector3(-1.0, 0.28, -0.35),
  new THREE.Vector3(0.95, 0.5, 0.3),
  new THREE.Vector3(0.1, -0.52, 0.55),
];
const SPREAD = [0.9, 1.0, 0.85];
const CENTROID_R = 0.23;
// regression plane: y = a·x + b·z + c (fitted "by eye" through the centroids)
const PLANE_A = 0.2;
const PLANE_B = -0.45;
const PLANE_C = 0.12;
const AX = new THREE.Vector3(-1.6, -1.0, -1.1); // axis origin corner
const AX_LEN = [3.2, 1.8, 2.2];

const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
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

/* ---------------------------------------------------------------- pieces */

function Tripod() {
  const pts = React.useMemo(() => {
    const out = [];
    const dirs = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
    const ticks = [new THREE.Vector3(0, 0, 0.07), new THREE.Vector3(0.07, 0, 0), new THREE.Vector3(0.07, 0, 0)];
    for (let a = 0; a < 3; a++) {
      const d = dirs[a];
      const end = AX.clone().addScaledVector(d, AX_LEN[a]);
      out.push(AX.toArray(), end.toArray());
      // arrow head
      const back = end.clone().addScaledVector(d, -0.12);
      out.push(end.toArray(), back.clone().addScaledVector(ticks[a], 0.6).toArray());
      out.push(end.toArray(), back.clone().addScaledVector(ticks[a], -0.6).toArray());
      // tick marks
      for (let s = 0.4; s < AX_LEN[a] - 0.2; s += 0.4) {
        const p = AX.clone().addScaledVector(d, s);
        out.push(p.clone().addScaledVector(ticks[a], -0.5).toArray(), p.clone().addScaledVector(ticks[a], 0.5).toArray());
      }
    }
    return out;
  }, []);
  // a faint floor grid on the x–z base plane
  const floor = React.useMemo(() => {
    const out = [];
    for (let i = 1; i <= 4; i++) {
      const x = AX.x + (AX_LEN[0] * i) / 5;
      const z = AX.z + (AX_LEN[2] * i) / 5;
      out.push([x, AX.y, AX.z], [x, AX.y, AX.z + AX_LEN[2] - 0.15]);
      out.push([AX.x, AX.y, z], [AX.x + AX_LEN[0] - 0.15, AX.y, z]);
    }
    return out;
  }, []);
  return (
    <group>
      <InkLine points={pts} segments lineWidth={0.9} opacity={0.75} />
      <InkLine points={floor} segments lineWidth={0.5} opacity={0.22} />
    </group>
  );
}

function RegressionPlane() {
  const geo = React.useMemo(() => {
    const W = 3.0;
    const D = 2.0;
    const g = new THREE.PlaneGeometry(W, D, 1, 1);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      p.setY(i, PLANE_A * x + PLANE_B * z + PLANE_C);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const border = React.useMemo(() => {
    const W = 3.0;
    const D = 2.0;
    const c = [[-W / 2, -D / 2], [W / 2, -D / 2], [W / 2, D / 2], [-W / 2, D / 2], [-W / 2, -D / 2]];
    return c.map(([x, z]) => [x, PLANE_A * x + PLANE_B * z + PLANE_C + 0.002, z]);
  }, []);
  const grid = React.useMemo(() => {
    const W = 3.0;
    const D = 2.0;
    const out = [];
    const y = (x, z) => PLANE_A * x + PLANE_B * z + PLANE_C + 0.002;
    for (let i = 1; i < 8; i++) {
      const x = -W / 2 + (W * i) / 8;
      out.push([x, y(x, -D / 2), -D / 2], [x, y(x, D / 2), D / 2]);
    }
    for (let j = 1; j < 5; j++) {
      const z = -D / 2 + (D * j) / 5;
      out.push([-W / 2, y(-W / 2, z), z], [W / 2, y(W / 2, z), z]);
    }
    return out;
  }, []);
  return (
    <group>
      <InkMesh geometry={geo} outline={false} hatch={7} strength={0.3} fill={0} opacity={0.22} renderOrder={1} />
      <InkLine points={grid} segments lineWidth={0.6} opacity={0.3} />
      <InkLine points={border} lineWidth={0.9} opacity={0.55} />
    </group>
  );
}

/* ----------------------------------------------------------------- scene */

export default function ClusterScene({ trackRef, reduced }) {
  const view = useViewProgress(trackRef);
  const { ink } = useInk();

  const root = React.useRef();
  const camRef = React.useRef();
  const dotsRef = React.useRef();
  const ringsRef = React.useRef();
  const cubeRefs = React.useRef([]);
  const centroidRefs = React.useRef([]);
  const linkGeo = React.useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N_PER * 3 * 2 * 3), 3));
    return g;
  }, []);

  /** 27 countries: deterministic scatter around the three centroids */
  const points = React.useMemo(() => {
    const rnd = mulberry(2024);
    const list = [];
    for (let c = 0; c < 3; c++)
      for (let i = 0; i < N_PER; i++) {
        // gaussian-ish offset
        const g = () => (rnd() + rnd() + rnd() - 1.5) * 0.8;
        const off = new THREE.Vector3(g(), g() * 0.75, g()).multiplyScalar(SPREAD[c]);
        if (off.length() < 0.3) off.setLength(0.3 + rnd() * 0.15);
        if (off.length() > 0.62) off.setLength(0.62);
        list.push({
          c,
          base: CENTROIDS[c].clone().add(off),
          ph: rnd() * Math.PI * 2,
          rate: 0.35 + rnd() * 0.4,
          amp: 0.02 + rnd() * 0.025,
          spin: (rnd() - 0.5) * 0.5,
        });
      }
    return list;
  }, []);

  const tmp = React.useMemo(
    () => ({
      v: new THREE.Vector3(),
      o: new THREE.Object3D(),
      q: new THREE.Quaternion(),
      qw: new THREE.Quaternion(),
      rot: { x: 0, y: 0 },
      spin: 0,
    }),
    []
  );

  useFrame((state, dt) => {
    const time = reduced ? 0 : state.clock.elapsedTime;
    const { pointer, t } = view.current;
    const { v, o, q, qw, rot } = tmp;

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

    /* slow turn + pointer tilt */
    const g = root.current;
    if (g) {
      if (!reduced) tmp.spin += dt * 0.09;
      const ty = (reduced ? 0.35 : 0.35 + tmp.spin) + pointer.x * 0.25;
      const tx = -pointer.y * 0.16 + (t - 0.5) * 0.14;
      const k = reduced ? 1 : Math.min(1, dt * 2.5);
      rot.y += (ty - rot.y) * k;
      rot.x += (tx - rot.x) * k;
      g.rotation.set(rot.x, rot.y, 0);
      // billboard rotation for flat markers, expressed in the drawing's local frame
      g.updateWorldMatrix(true, false);
      g.getWorldQuaternion(qw);
      q.copy(qw).invert();
      if (cam) q.multiply(cam.quaternion);
    }

    /* points: breathe around their positions; links follow */
    const lp = linkGeo.attributes.position.array;
    const dm = dotsRef.current;
    const rm = ringsRef.current;
    let di = 0;
    let ri = 0;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      v.copy(p.base);
      if (!reduced) {
        v.x += Math.sin(time * p.rate + p.ph) * p.amp;
        v.y += Math.sin(time * p.rate * 1.3 + p.ph * 2) * p.amp;
        v.z += Math.cos(time * p.rate * 0.8 + p.ph) * p.amp;
      }
      const b = i * 6;
      const c = CENTROIDS[p.c];
      lp[b] = v.x; lp[b + 1] = v.y; lp[b + 2] = v.z;
      lp[b + 3] = c.x; lp[b + 4] = c.y; lp[b + 5] = c.z;
      if (p.c === 0 && dm) {
        o.position.copy(v);
        o.quaternion.copy(q);
        o.scale.setScalar(1);
        o.updateMatrix();
        dm.setMatrixAt(di++, o.matrix);
      } else if (p.c === 1 && rm) {
        o.position.copy(v);
        o.quaternion.copy(q);
        o.scale.setScalar(1);
        o.updateMatrix();
        rm.setMatrixAt(ri++, o.matrix);
      } else if (p.c === 2) {
        const cube = cubeRefs.current[i - 2 * N_PER];
        if (cube) {
          cube.position.copy(v);
          cube.rotation.set(0.5 + p.ph * 0.1, time * p.spin + p.ph, 0.3);
        }
      }
    }
    linkGeo.attributes.position.needsUpdate = true;
    if (dm) dm.instanceMatrix.needsUpdate = true;
    if (rm) rm.instanceMatrix.needsUpdate = true;

    /* centroids pulse softly, each on its own beat */
    for (let c = 0; c < 3; c++) {
      const m = centroidRefs.current[c];
      if (!m) continue;
      const s = reduced ? 1 : 1 + 0.08 * Math.sin(time * 0.9 + c * 2.1);
      m.scale.setScalar(s);
      m.rotation.y = reduced ? 0 : time * 0.15;
    }
  });

  return (
    <group>
      <PerspectiveCamera ref={camRef} makeDefault position={[3, 3, 7]} fov={CAM_FOV} near={0.1} far={60} />
      <group ref={root}>
        <Tripod />
        <RegressionPlane />
        {/* assignments: hairline from each country to its centroid */}
        <lineSegments geometry={linkGeo}>
          <lineBasicMaterial color={ink} transparent opacity={0.5} />
        </lineSegments>
        {/* centroids */}
        {CENTROIDS.map((c, i) => (
          <InkWire key={i} ref={(el) => (centroidRefs.current[i] = el)} position={c} opacity={0.7}>
            <icosahedronGeometry args={[CENTROID_R, 1]} />
          </InkWire>
        ))}
        {/* cluster A: filled dots */}
        <instancedMesh ref={dotsRef} args={[undefined, undefined, N_PER]} renderOrder={2}>
          <circleGeometry args={[0.068, 20]} />
          <meshBasicMaterial color={ink} side={THREE.DoubleSide} />
        </instancedMesh>
        {/* cluster B: hollow rings */}
        <instancedMesh ref={ringsRef} args={[undefined, undefined, N_PER]} renderOrder={2}>
          <ringGeometry args={[0.054, 0.072, 24]} />
          <meshBasicMaterial color={ink} side={THREE.DoubleSide} />
        </instancedMesh>
        {/* cluster C: small hatched cubes */}
        {points.slice(2 * N_PER).map((p, i) => (
          <InkMesh key={i} ref={(el) => (cubeRefs.current[i] = el)} position={p.base} hatch={3} strength={1} fill={0.28} lineWidth={0.8}>
            <boxGeometry args={[0.14, 0.14, 0.14]} />
          </InkMesh>
        ))}
      </group>
    </group>
  );
}
