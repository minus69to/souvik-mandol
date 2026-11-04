"use client";
/**
 * "skills" – the skill set drawn as a star chart / molecule in ink.
 *
 *   hubs       : seven wireframe icosahedra (one per skill category) on a
 *                slightly irregular ring in 3D, each with a filled nucleus
 *   satellites : the individual skills – small filled dots orbiting their hub
 *                on two tilted orbit planes, tethered to it by thin spokes
 *   links      : a few dashed chords between related hubs
 *   chart      : faint concentric guide rings on the ground with degree
 *                ticks, and a dashed drop-line from every hub to the plane
 *
 * Motion: satellites orbit slowly, hubs spin on their own axis, the whole
 * constellation turns; the pointer steers the rotation and swells the hub it
 * hovers over. `reduced` renders a static pose.
 */
import * as React from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { InkWire, InkLine, InkFlat, useInk } from "../three/Ink";
import { useViewProgress } from "../three/useViewProgress";

/* ------------------------------------------------------------------ layout */
const COUNTS = [10, 9, 10, 5, 7, 9, 5];
const HUB_R = 0.5;
const RING_R = 3.0;
const GROUND_Y = -1.9;
const CAM_FOV = 24;
const CAM_DIR = new THREE.Vector3(0, 0.82, 1).normalize();
const FIT_HALF_W = 5.7;
const FIT_HALF_H = 3.7;
const LOOK_Y = -1.0; // look a little below the ring so the ground chart is not clipped
const LINKS = [[0, 2], [1, 4], [3, 6], [5, 1], [2, 5], [6, 3]];
const GROUND_RINGS = [1.3, 2.3, 3.3, 4.3];
const UP = new THREE.Vector3(0, 1, 0);
const X = new THREE.Vector3(1, 0, 0);

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function basisFromNormal(n) {
  const u = new THREE.Vector3().crossVectors(n, Math.abs(n.y) < 0.9 ? UP : X).normalize();
  const w = new THREE.Vector3().crossVectors(n, u).normalize();
  return { n, u, w };
}

function buildLayout(mobile) {
  const rand = rng(1137);
  const hubs = COUNTS.map((n, i) => {
    const a = (i / COUNTS.length) * Math.PI * 2 + (rand() - 0.5) * 0.4;
    const r = RING_R + (rand() - 0.5) * 0.8;
    const y = (rand() - 0.5) * 1.1;
    const pos = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
    const n0 = new THREE.Vector3(rand() - 0.5, 0.55 + rand() * 0.5, rand() - 0.5).normalize();
    const n1 = new THREE.Vector3(rand() - 0.5, -(0.2 + rand() * 0.5), rand() - 0.5).normalize();
    const planes = [basisFromNormal(n0), basisFromNormal(n1)];
    const count = mobile ? Math.ceil(n / 2) : n;
    const sats = [];
    for (let k = 0; k < count; k++) {
      sats.push({
        plane: k % 2,
        r: 0.78 + rand() * 0.7,
        phase: rand() * Math.PI * 2,
        speed: (0.1 + rand() * 0.14) * (rand() < 0.3 ? -1 : 1),
        size: 0.6 + rand() * 0.8,
      });
    }
    return {
      pos,
      planes,
      sats,
      spin: (0.08 + rand() * 0.1) * (i % 2 ? -1 : 1),
      tilt: [rand() * 0.8, rand() * Math.PI, rand() * 0.5],
      orbitR: [0.95 + rand() * 0.25, 1.05 + rand() * 0.3],
    };
  });
  return hubs;
}

function circleOn(center, u, w, r, n = 48) {
  const pts = [];
  const p = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = ((i + 1) / n) * Math.PI * 2;
    p.copy(center).addScaledVector(u, r * Math.cos(a0)).addScaledVector(w, r * Math.sin(a0));
    pts.push(p.toArray());
    p.copy(center).addScaledVector(u, r * Math.cos(a1)).addScaledVector(w, r * Math.sin(a1));
    pts.push(p.toArray());
  }
  return pts;
}

/* ----------------------------------------------------------------- scene */

export default function SkillsScene({ trackRef, reduced, mobile }) {
  const view = useViewProgress(trackRef);
  const { ink } = useInk();
  const hubs = React.useMemo(() => buildLayout(mobile), [mobile]);
  const satCount = React.useMemo(() => hubs.reduce((s, h) => s + h.sats.length, 0), [hubs]);

  const camRef = React.useRef();
  const root = React.useRef();
  const satsRef = React.useRef();
  const hubRefs = React.useRef([]);
  const hubScale = React.useRef(COUNTS.map(() => 1));

  /* spokes hub→satellite: one raw line-segment set updated per frame */
  const spokeGeo = React.useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(satCount * 6), 3));
    return g;
  }, [satCount]);

  /* static ink */
  const orbitPts = React.useMemo(
    () => hubs.flatMap((h) => h.planes.flatMap((p, i) => circleOn(h.pos, p.u, p.w, h.orbitR[i], 56))),
    [hubs]
  );
  const linkPts = React.useMemo(() => LINKS.flatMap(([a, b]) => [hubs[a].pos.toArray(), hubs[b].pos.toArray()]), [hubs]);
  const dropPts = React.useMemo(
    () => hubs.flatMap((h) => [[h.pos.x, h.pos.y - HUB_R, h.pos.z], [h.pos.x, GROUND_Y, h.pos.z]]),
    [hubs]
  );
  const groundPts = React.useMemo(() => {
    const c = new THREE.Vector3(0, GROUND_Y, 0);
    const u = new THREE.Vector3(1, 0, 0);
    const w = new THREE.Vector3(0, 0, 1);
    const pts = GROUND_RINGS.flatMap((r) => circleOn(c, u, w, r, 96));
    // degree ticks on the outer ring, longer every 30°
    const R = GROUND_RINGS[GROUND_RINGS.length - 1];
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      const len = i % 6 === 0 ? 0.22 : 0.09;
      pts.push([Math.cos(a) * R, GROUND_Y, Math.sin(a) * R], [Math.cos(a) * (R + len), GROUND_Y, Math.sin(a) * (R + len)]);
    }
    // crosshair through the centre
    pts.push([-GROUND_RINGS[0], GROUND_Y, 0], [GROUND_RINGS[0], GROUND_Y, 0], [0, GROUND_Y, -GROUND_RINGS[0]], [0, GROUND_Y, GROUND_RINGS[0]]);
    return pts;
  }, []);

  /* ground marks under each hub */
  const marksRef = React.useRef();
  React.useLayoutEffect(() => {
    const m = marksRef.current;
    if (!m) return;
    const o = new THREE.Object3D();
    hubs.forEach((h, i) => {
      o.position.set(h.pos.x, GROUND_Y + 0.002, h.pos.z);
      o.rotation.set(-Math.PI / 2, 0, 0);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [hubs]);

  const tmp = React.useMemo(
    () => ({ v: new THREE.Vector3(), p: new THREE.Vector3(), o: new THREE.Object3D(), rot: { x: 0, y: 0.4 }, spinY: 0.4 }),
    []
  );

  useFrame((state, dt) => {
    const time = reduced ? 11.0 : state.clock.elapsedTime;
    const step = reduced ? 0 : Math.min(dt, 0.05);
    const { pointer, t } = view.current;
    const { v, p, o, rot } = tmp;

    // camera fits the drawing to whatever aspect the box has
    const cam = camRef.current;
    if (cam) {
      const aspect = cam.aspect || 1.67;
      const tanH = Math.tan((CAM_FOV * Math.PI) / 360);
      const d = Math.max(FIT_HALF_W / (tanH * aspect), FIT_HALF_H / tanH) * 1.08;
      v.copy(CAM_DIR).multiplyScalar(d);
      v.y += 0.15;
      if (cam.position.distanceToSquared(v) > 1e-6) {
        cam.position.lerp(v, reduced ? 1 : Math.min(1, dt * 6 + 0.2));
        cam.lookAt(0, LOOK_Y, 0);
      }
    }

    // constellation: slow turn, steered by the pointer; tilt follows pointer.y + scroll
    if (root.current) {
      tmp.spinY += step * (0.045 + pointer.x * 0.07);
      const ty = tmp.spinY;
      const tx = -pointer.y * 0.14 + (t - 0.5) * 0.12;
      const k = reduced ? 1 : Math.min(1, dt * 2.5);
      rot.x += (tx - rot.x) * k;
      rot.y += (ty - rot.y) * k;
      root.current.rotation.set(rot.x, rot.y, 0);
    }

    // hubs: spin, and swell when the pointer is near (screen-space distance)
    for (let i = 0; i < hubs.length; i++) {
      const g = hubRefs.current[i];
      if (!g) continue;
      const h = hubs[i];
      g.rotation.y = h.tilt[1] + time * h.spin;
      g.rotation.x = h.tilt[0] + 0.15 * Math.sin(time * 0.3 + i);
      let target = 1;
      if (cam) {
        g.getWorldPosition(p).project(cam);
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        target = 1 + 0.28 * Math.max(0, 1 - dist / 0.22);
      }
      const s = hubScale.current;
      s[i] += (target - s[i]) * (reduced ? 1 : Math.min(1, dt * 5));
      g.scale.setScalar(s[i]);
    }

    // satellites + spokes
    const sm = satsRef.current;
    const pos = spokeGeo.attributes.position.array;
    if (sm) {
      let i = 0;
      for (let hi = 0; hi < hubs.length; hi++) {
        const h = hubs[hi];
        const swell = hubScale.current[hi];
        for (let k = 0; k < h.sats.length; k++) {
          const s = h.sats[k];
          const pl = h.planes[s.plane];
          const a = s.phase + time * s.speed;
          const r = s.r * (0.85 + 0.15 * swell);
          v.copy(h.pos).addScaledVector(pl.u, r * Math.cos(a)).addScaledVector(pl.w, r * Math.sin(a));
          o.position.copy(v);
          o.scale.setScalar(s.size);
          o.updateMatrix();
          sm.setMatrixAt(i, o.matrix);
          // spoke from the hub surface to the dot
          p.copy(v).sub(h.pos).normalize();
          const j = i * 6;
          pos[j] = h.pos.x + p.x * HUB_R * 0.55 * swell;
          pos[j + 1] = h.pos.y + p.y * HUB_R * 0.55 * swell;
          pos[j + 2] = h.pos.z + p.z * HUB_R * 0.55 * swell;
          pos[j + 3] = v.x;
          pos[j + 4] = v.y;
          pos[j + 5] = v.z;
          i++;
        }
      }
      sm.instanceMatrix.needsUpdate = true;
      spokeGeo.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group>
      <PerspectiveCamera ref={camRef} makeDefault position={[0, 6, 9.5]} fov={CAM_FOV} near={0.1} far={60} onUpdate={(c) => c.lookAt(0, LOOK_Y, 0)} />
      <group ref={root}>
        {/* star-chart ground */}
        <InkLine points={groundPts} segments lineWidth={0.7} opacity={0.28} />
        <InkLine points={dropPts} segments dashed dashSize={0.08} gapSize={0.07} lineWidth={0.7} opacity={0.35} />
        <instancedMesh ref={marksRef} args={[undefined, undefined, hubs.length]}>
          <ringGeometry args={[0.07, 0.1, 20]} />
          <meshBasicMaterial color={ink} transparent opacity={0.5} side={THREE.DoubleSide} />
        </instancedMesh>

        {/* inter-hub links */}
        <InkLine points={linkPts} segments dashed dashSize={0.14} gapSize={0.1} lineWidth={0.8} opacity={0.5} />

        {/* orbit guides */}
        <InkLine points={orbitPts} segments lineWidth={0.6} opacity={0.17} />

        {/* hubs */}
        {hubs.map((h, i) => (
          <group key={i} position={h.pos.toArray()} ref={(el) => (hubRefs.current[i] = el)}>
            <InkWire>
              <icosahedronGeometry args={[HUB_R, 0]} />
            </InkWire>
            <InkFlat>
              <sphereGeometry args={[0.075, 10, 8]} />
            </InkFlat>
          </group>
        ))}

        {/* spokes */}
        <lineSegments geometry={spokeGeo} frustumCulled={false}>
          <lineBasicMaterial color={ink} transparent opacity={0.6} />
        </lineSegments>

        {/* satellites */}
        <instancedMesh ref={satsRef} args={[undefined, undefined, satCount]} frustumCulled={false}>
          <sphereGeometry args={[0.046, 8, 6]} />
          <meshBasicMaterial color={ink} />
        </instancedMesh>
      </group>
    </group>
  );
}
