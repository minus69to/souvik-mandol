"use client";
/**
 * "reel" – Movie Database: a feed reel unspooling film to a take-up reel.
 *
 *   left   : a large film reel (two flanges with five round cut-outs, hub and
 *            posts) turning slowly, its axis pointing roughly at the viewer.
 *   strip  : a film strip leaves the top of the reel edge-on, twists to face
 *            the viewer as it crosses the box, and twists back to wrap onto a
 *            smaller take-up reel on the right. Sprocket holes run along both
 *            edges, frames in the middle carry tiny hatched "images"; the
 *            whole pattern travels along the strip in step with the reels.
 *
 * Ink language: hollow rects = holes/frames, hatched bars = pictures,
 * hatched solids = reels. Pointer parallax on the whole drawing.
 */
import * as React from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { InkMesh, InkLine, useInk } from "../three/Ink";
import { useViewProgress } from "../three/useViewProgress";

/* ------------------------------------------------------------------ layout */
const CAM_FOV = 24;
const CAM_DIR = new THREE.Vector3(0.02, 0.12, 1).normalize();
const LOOK = new THREE.Vector3(0.28, -0.08, 0);
const FIT_HALF_W = 2.75;
const FIT_HALF_H = 1.55;

const BIG_C = new THREE.Vector3(-1.35, 0.0, 0);
const BIG_R = 1.0;
const BIG_AXIS = new THREE.Vector3(0.42, 0.22, 1).normalize();
const SMALL_C = new THREE.Vector3(1.95, -0.42, 0.15);
const SMALL_R = 0.48;
const SMALL_AXIS = new THREE.Vector3(0.3, 0.18, 1).normalize();
const FLANGE_GAP = 0.3; // distance between the two flanges (film width + a little)
const FILM_W = 0.42;
const SPEED = 0.26; // film speed, world units per second
const SPROCKET_PITCH = 0.115;
const FRAME_PITCH = 0.36;
const FRAME_W = 0.31;
const FRAME_H = 0.26;
const UP = new THREE.Vector3(0, 1, 0);

const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/* -------------------------------------------------------------- geometry */

function rectShape(x, y, w, h) {
  const s = new THREE.Shape();
  s.moveTo(x - w / 2, y - h / 2);
  s.lineTo(x + w / 2, y - h / 2);
  s.lineTo(x + w / 2, y + h / 2);
  s.lineTo(x - w / 2, y + h / 2);
  s.closePath();
  return s;
}
function rectPath(x, y, w, h) {
  const p = new THREE.Path();
  p.moveTo(x - w / 2, y - h / 2);
  p.lineTo(x + w / 2, y - h / 2);
  p.lineTo(x + w / 2, y + h / 2);
  p.lineTo(x - w / 2, y + h / 2);
  p.closePath();
  return p;
}
function hollowRect(w, h, t) {
  const s = rectShape(0, 0, w, h);
  s.holes.push(rectPath(0, 0, w - 2 * t, h - 2 * t));
  return s;
}
function quad(a, b, c, d) {
  const s = new THREE.Shape();
  s.moveTo(a[0], a[1]);
  s.lineTo(b[0], b[1]);
  s.lineTo(c[0], c[1]);
  s.lineTo(d[0], d[1]);
  s.closePath();
  return s;
}

/** flange: a disc with a hub hole and five round cut-outs, extruded thinly */
function makeFlange(r, holeR, holeAt, hubR, depth) {
  const s = new THREE.Shape();
  s.absarc(0, 0, r, 0, Math.PI * 2, false);
  const hub = new THREE.Path();
  hub.absarc(0, 0, hubR, 0, Math.PI * 2, true);
  s.holes.push(hub);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + Math.PI / 2;
    const h = new THREE.Path();
    h.absarc(Math.cos(a) * holeAt, Math.sin(a) * holeAt, holeR, 0, Math.PI * 2, true);
    s.holes.push(h);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 40 });
  g.translate(0, 0, -depth / 2);
  g.computeVertexNormals();
  return g;
}

/** frame glyph A: hollow frame + steep hatch bars (a "picture") */
function makeFrameA() {
  const t = 0.012;
  const shapes = [hollowRect(FRAME_W, FRAME_H, t)];
  const ih = FRAME_H - 2 * t - 0.02;
  const dx = ih * Math.tan(Math.PI / 6);
  for (let i = 0; i < 4; i++) {
    const x0 = -0.125 + i * 0.045;
    shapes.push(quad([x0, -ih / 2], [x0 + 0.011, -ih / 2], [x0 + dx + 0.011, ih / 2], [x0 + dx, ih / 2]));
  }
  return new THREE.ShapeGeometry(shapes);
}
/** frame glyph B: hollow frame + a sun, a horizon and a hatched hill */
function makeFrameB() {
  const t = 0.012;
  const shapes = [hollowRect(FRAME_W, FRAME_H, t)];
  const sun = new THREE.Shape();
  sun.absarc(0.07, 0.055, 0.03, 0, Math.PI * 2, false);
  shapes.push(sun);
  shapes.push(rectShape(0, -0.035, FRAME_W - 2 * t - 0.02, 0.008));
  // hill: three short hatch bars under a slanted roof line
  const hill = new THREE.Shape();
  hill.moveTo(-0.13, -0.1);
  hill.lineTo(-0.02, 0.0);
  hill.lineTo(0.09, -0.1);
  hill.lineTo(0.075, -0.1);
  hill.lineTo(-0.02, -0.012);
  hill.lineTo(-0.115, -0.1);
  hill.closePath();
  shapes.push(hill);
  for (let i = 0; i < 3; i++) {
    const x0 = -0.095 + i * 0.03;
    shapes.push(quad([x0, -0.095], [x0 + 0.008, -0.095], [x0 + 0.045, -0.05], [x0 + 0.037, -0.05]));
  }
  return new THREE.ShapeGeometry(shapes);
}

/** the film path and its moving frame field */
function buildStrip() {
  const eBig = UP.clone().sub(BIG_AXIS.clone().multiplyScalar(UP.dot(BIG_AXIS))).normalize();
  const eSmall = UP.clone().sub(SMALL_AXIS.clone().multiplyScalar(UP.dot(SMALL_AXIS))).normalize();
  const p0 = BIG_C.clone().add(eBig.clone().multiplyScalar(BIG_R));
  let t0 = new THREE.Vector3().crossVectors(BIG_AXIS, eBig).normalize();
  const spinBig = t0.x > 0 ? 1 : -1;
  if (t0.x < 0) t0.negate();
  const p3 = SMALL_C.clone().add(eSmall.clone().multiplyScalar(SMALL_R));
  let t3 = new THREE.Vector3().crossVectors(SMALL_AXIS, eSmall).normalize();
  const spinSmall = t3.x > 0 ? 1 : -1;
  if (t3.x < 0) t3.negate();

  const pts = [
    p0,
    p0.clone().add(t0.clone().multiplyScalar(0.55)),
    new THREE.Vector3(0.05, 0.62, 0.35),
    new THREE.Vector3(0.95, 0.12, 0.3),
    p3.clone().sub(t3.clone().multiplyScalar(0.45)),
    p3,
  ];
  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal", 0.5);
  const N = 180;
  const P = [];
  const T = [];
  const B = [];
  const Nn = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const p = curve.getPointAt(u);
    const t = curve.getTangentAt(u).normalize();
    // width direction: the reel axis at both ends, straight up across the middle
    const s1 = smooth((u - 0.03) / 0.3);
    const s2 = smooth((u - 0.68) / 0.29);
    const b = BIG_AXIS.clone().lerp(UP, s1).lerp(SMALL_AXIS, s2);
    b.sub(t.clone().multiplyScalar(b.dot(t))).normalize();
    const n = new THREE.Vector3().crossVectors(t, b).normalize();
    P.push(p);
    T.push(t);
    B.push(b);
    Nn.push(n);
  }
  const L = curve.getLength();

  // ribbon mesh
  const pos = new Float32Array((N + 1) * 2 * 3);
  const idx = [];
  for (let i = 0; i <= N; i++) {
    const a = P[i].clone().addScaledVector(B[i], FILM_W / 2);
    const c = P[i].clone().addScaledVector(B[i], -FILM_W / 2);
    pos.set([a.x, a.y, a.z, c.x, c.y, c.z], i * 6);
    if (i < N) {
      const k = i * 2;
      idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const ribbon = new THREE.BufferGeometry();
  ribbon.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  ribbon.setIndex(idx);
  ribbon.computeVertexNormals();
  const edgeA = [];
  const edgeB = [];
  for (let i = 0; i <= N; i++) {
    const a = P[i].clone().addScaledVector(B[i], FILM_W / 2);
    const c = P[i].clone().addScaledVector(B[i], -FILM_W / 2);
    edgeA.push([a.x, a.y, a.z]);
    edgeB.push([c.x, c.y, c.z]);
  }
  return { P, T, B, Nn, N, L, ribbon, edgeA, edgeB, spinBig, spinSmall };
}

/* --------------------------------------------------------------- pieces */

function Reel({ center, axis, r, spinRef, big }) {
  const quat = React.useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), axis), [axis]);
  const holeAt = r * 0.58;
  const holeR = r * 0.24;
  const hubR = r * 0.2;
  const depth = big ? 0.035 : 0.03;
  const flange = React.useMemo(() => makeFlange(r, holeR, holeAt, hubR, depth), [r, holeR, holeAt, hubR, depth]);
  const posts = React.useMemo(() => {
    const out = [];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + Math.PI / 2 + Math.PI / 5;
      out.push([Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5]);
    }
    return out;
  }, [r]);
  // a little film wound onto the hub, drawn as a few concentric rings on the near flange
  const wound = React.useMemo(() => {
    const rings = [];
    const n = big ? 4 : 3;
    for (let k = 0; k < n; k++) {
      const rr = hubR + 0.045 + k * 0.03;
      const pts = [];
      for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        pts.push([Math.cos(a) * rr, Math.sin(a) * rr, FLANGE_GAP / 2 + 0.004]);
      }
      rings.push(pts);
    }
    return rings;
  }, [hubR, big]);
  return (
    <group position={center} quaternion={quat}>
      <group ref={spinRef}>
        <InkMesh geometry={flange} position={[0, 0, FLANGE_GAP / 2]} hatch={5} strength={0.85} threshold={30} />
        <InkMesh geometry={flange} position={[0, 0, -FLANGE_GAP / 2]} hatch={5} strength={0.85} threshold={30} />
        {/* hub */}
        <InkMesh rotation={[Math.PI / 2, 0, 0]} hatch={4} strength={1} fill={0.05}>
          <cylinderGeometry args={[hubR * 0.98, hubR * 0.98, FLANGE_GAP + 0.1, 24, 1]} />
        </InkMesh>
        {/* axle tip */}
        <InkMesh position={[0, 0, FLANGE_GAP / 2 + 0.08]} rotation={[Math.PI / 2, 0, 0]} hatch={3} strength={1} fill={0.1}>
          <cylinderGeometry args={[hubR * 0.35, hubR * 0.35, 0.06, 12, 1]} />
        </InkMesh>
        {posts.map(([x, y], i) => (
          <InkMesh key={i} position={[x, y, 0]} rotation={[Math.PI / 2, 0, 0]} outline={false} hatch={3} strength={1} fill={0.15}>
            <cylinderGeometry args={[0.018, 0.018, FLANGE_GAP, 8, 1]} />
          </InkMesh>
        ))}
        {wound.map((pts, i) => (
          <InkLine key={i} points={pts} lineWidth={0.7} opacity={0.5} />
        ))}
      </group>
    </group>
  );
}

/* ----------------------------------------------------------------- scene */

export default function ReelScene({ trackRef, reduced }) {
  const view = useViewProgress(trackRef);
  const { ink, paper } = useInk();

  const root = React.useRef();
  const camRef = React.useRef();
  const bigSpin = React.useRef();
  const smallSpin = React.useRef();
  const sprocketRef = React.useRef();
  const frameARef = React.useRef();
  const frameBRef = React.useRef();

  const strip = React.useMemo(() => buildStrip(), []);
  const sprocketGeo = React.useMemo(() => new THREE.ShapeGeometry(hollowRect(0.05, 0.034, 0.008)), []);
  const frameA = React.useMemo(() => makeFrameA(), []);
  const frameB = React.useMemo(() => makeFrameB(), []);

  const N_SPROCKET = Math.ceil(strip.L / SPROCKET_PITCH) * 2 + 2;
  const N_FRAMES = Math.ceil(strip.L / FRAME_PITCH) + 1;

  const tmp = React.useMemo(
    () => ({
      v: new THREE.Vector3(),
      p: new THREE.Vector3(),
      t: new THREE.Vector3(),
      b: new THREE.Vector3(),
      n: new THREE.Vector3(),
      m: new THREE.Matrix4(),
      s: new THREE.Matrix4(),
      rot: { x: 0, y: 0 },
    }),
    []
  );

  /** sample the strip field at arc-length fraction u into tmp.p/t/b/n */
  const sampleAt = (u) => {
    const { P, T, B, Nn, N } = strip;
    const f = Math.min(Math.max(u, 0), 1) * N;
    const i = Math.min(Math.floor(f), N - 1);
    const k = f - i;
    tmp.p.copy(P[i]).lerp(P[i + 1], k);
    tmp.t.copy(T[i]).lerp(T[i + 1], k).normalize();
    tmp.b.copy(B[i]).lerp(B[i + 1], k).normalize();
    tmp.n.copy(Nn[i]).lerp(Nn[i + 1], k).normalize();
  };

  const placeInstance = (mesh, index, u, lateral, scale) => {
    sampleAt(u);
    const { p, t, b, n, m, s, v } = tmp;
    v.copy(p).addScaledVector(b, lateral);
    m.makeBasis(t, b, n);
    m.setPosition(v);
    s.makeScale(scale, scale, 1);
    m.multiply(s);
    mesh.setMatrixAt(index, m);
  };

  useFrame((state, dt) => {
    const time = reduced ? 2.3 : state.clock.elapsedTime;
    const { pointer, t } = view.current;
    const { v, rot } = tmp;

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

    /* pointer / scroll parallax */
    if (root.current) {
      const ty = (reduced ? 0 : 0.05 * Math.sin(time * 0.13)) + pointer.x * 0.3;
      const tx = -pointer.y * 0.12 + (t - 0.5) * 0.1;
      const k = reduced ? 1 : Math.min(1, dt * 2.5);
      rot.y += (ty - rot.y) * k;
      rot.x += (tx - rot.x) * k;
      root.current.rotation.set(rot.x, rot.y, 0);
    }

    /* reels turn in step with the film */
    const travelled = time * SPEED;
    if (bigSpin.current) bigSpin.current.rotation.z = (-strip.spinBig * travelled) / BIG_R;
    if (smallSpin.current) smallSpin.current.rotation.z = (-strip.spinSmall * travelled) / SMALL_R;

    /* pattern slides along the strip */
    const L = strip.L;
    const sp = sprocketRef.current;
    if (sp) {
      const n = N_SPROCKET / 2;
      for (let i = 0; i < n; i++) {
        const s = (((i * SPROCKET_PITCH + travelled) % L) + L) % L;
        const u = s / L;
        const sc = Math.min(1, smooth(u / 0.03), smooth((1 - u) / 0.03));
        placeInstance(sp, i * 2, u, FILM_W / 2 - 0.04, sc || 0.0001);
        placeInstance(sp, i * 2 + 1, u, -FILM_W / 2 + 0.04, sc || 0.0001);
      }
      sp.instanceMatrix.needsUpdate = true;
    }
    const fa = frameARef.current;
    const fb = frameBRef.current;
    if (fa && fb) {
      for (let i = 0; i < N_FRAMES; i++) {
        const s = (((i * FRAME_PITCH + travelled) % L) + L) % L;
        const u = s / L;
        const sc = Math.min(1, smooth(u / 0.04), smooth((1 - u) / 0.04));
        const isA = i % 2 === 0;
        placeInstance(fa, i, u, 0, isA ? sc || 0.0001 : 0.0001);
        placeInstance(fb, i, u, 0, isA ? 0.0001 : sc || 0.0001);
      }
      fa.instanceMatrix.needsUpdate = true;
      fb.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      <PerspectiveCamera ref={camRef} makeDefault position={[0, 0.5, 8]} fov={CAM_FOV} near={0.1} far={60} />
      <group ref={root}>
        <Reel center={BIG_C} axis={BIG_AXIS} r={BIG_R} spinRef={bigSpin} big />
        <Reel center={SMALL_C} axis={SMALL_AXIS} r={SMALL_R} spinRef={smallSpin} />

        {/* the strip: paper ribbon with ink edges */}
        <mesh geometry={strip.ribbon} renderOrder={1}>
          <meshBasicMaterial color={paper} side={THREE.DoubleSide} toneMapped={false} polygonOffset polygonOffsetFactor={2} polygonOffsetUnits={2} />
        </mesh>
        <InkLine points={strip.edgeA} lineWidth={1.1} />
        <InkLine points={strip.edgeB} lineWidth={1.1} />
        {/* sprocket holes and frames ride along the strip */}
        <instancedMesh ref={sprocketRef} args={[sprocketGeo, undefined, N_SPROCKET]} renderOrder={2}>
          <meshBasicMaterial color={ink} side={THREE.DoubleSide} toneMapped={false} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
        </instancedMesh>
        <instancedMesh ref={frameARef} args={[frameA, undefined, N_FRAMES]} renderOrder={2}>
          <meshBasicMaterial color={ink} side={THREE.DoubleSide} toneMapped={false} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
        </instancedMesh>
        <instancedMesh ref={frameBRef} args={[frameB, undefined, N_FRAMES]} renderOrder={2}>
          <meshBasicMaterial color={ink} side={THREE.DoubleSide} toneMapped={false} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
        </instancedMesh>
      </group>
    </group>
  );
}
