"use client";
/**
 * "neural" – certifications: a classic multilayer perceptron, drawn in ink.
 *
 *   Four layers (5 · 7 · 7 · 3) of small spheres held in faint sheet frames,
 *   fully connected by hairlines. A forward pass travels left to right:
 *   packets run along each gap, the next layer fills, the gap's connections
 *   dim. The output picks a class, then a dashed backward pulse (backprop)
 *   runs the gaps in reverse and the layers go hollow again, ready for the
 *   next pass. Slow rotation and pointer parallax.
 *
 * Ink language: hollow wire sphere = inactive unit, filled = activated,
 * thin solid line = weight, dashed = gradient, dots = activations in flight.
 */
import * as React from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { InkLine, useInk } from "../three/Ink";
import { useViewProgress } from "../three/useViewProgress";

/* ------------------------------------------------------------------ layout */
const CAM_FOV = 28;
const CAM_DIR = new THREE.Vector3(0.28, 0.32, 1).normalize();
const LOOK = new THREE.Vector3(0, 0, 0);
const FIT_HALF_W = 2.5;
const FIT_HALF_H = 1.58;

const LAYERS = [5, 7, 7, 3];
const LAYER_X = [-1.85, -0.62, 0.62, 1.85];
const SPACING = 0.36;
const NODE_R = 0.078;
const PERIOD = 9; // seconds for forward + backward pass

/* schedule (seconds within one period) */
const FWD_GAP = 1.1; // one gap's forward travel
const FWD_START = 0.4;
const HOLD = 0.9;
const BWD_GAP = 1.0;
const BWD_START = FWD_START + FWD_GAP * 3 + HOLD; // 4.6
const REST_START = BWD_START + BWD_GAP * 3; // 7.6

const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/** node positions: layers along x, units spread in y, a slight bow in z so the sheet has depth */
function layoutNodes() {
  const nodes = [];
  LAYERS.forEach((n, l) => {
    for (let i = 0; i < n; i++) {
      const y = (i - (n - 1) / 2) * SPACING;
      const z = -0.06 * (y * y);
      nodes.push({ l, i, x: LAYER_X[l], y, z });
    }
  });
  return nodes;
}

export default function NeuralScene({ trackRef, reduced }) {
  const view = useViewProgress(trackRef);
  const { ink } = useInk();

  const root = React.useRef();
  const camRef = React.useRef();
  const hollowRef = React.useRef();
  const solidRef = React.useRef();
  const packetsRef = React.useRef();
  const gapRefs = React.useRef([]);
  const gradRefs = React.useRef([]);

  const nodes = React.useMemo(layoutNodes, []);
  const NN = nodes.length;

  /** per-gap edge lists and flat point arrays */
  const gaps = React.useMemo(() => {
    const out = [];
    for (let g = 0; g < LAYERS.length - 1; g++) {
      const a = nodes.filter((n) => n.l === g);
      const b = nodes.filter((n) => n.l === g + 1);
      const edges = [];
      const pts = [];
      for (const na of a)
        for (const nb of b) {
          edges.push({ a: new THREE.Vector3(na.x, na.y, na.z), b: new THREE.Vector3(nb.x, nb.y, nb.z) });
          pts.push([na.x, na.y, na.z], [nb.x, nb.y, nb.z]);
        }
      out.push({ edges, pts });
    }
    return out;
  }, [nodes]);
  const NP = gaps.reduce((s, g) => s + g.edges.length, 0);

  /** faint sheet frame behind every layer, input stubs and output brackets */
  const frames = React.useMemo(() => {
    const pts = [];
    LAYERS.forEach((n, l) => {
      const x = LAYER_X[l];
      const h = ((n - 1) / 2) * SPACING + 0.22;
      const d = 0.34;
      pts.push([x, -h, -d], [x, h, -d], [x, h, -d], [x, h, d], [x, h, d], [x, -h, d], [x, -h, d], [x, -h, -d]);
    });
    return pts;
  }, []);
  const stubs = React.useMemo(() => {
    const pts = [];
    for (const n of nodes) {
      if (n.l === 0) pts.push([n.x - 0.5, n.y, n.z], [n.x - NODE_R - 0.03, n.y, n.z]);
      if (n.l === LAYERS.length - 1) pts.push([n.x + NODE_R + 0.03, n.y, n.z], [n.x + 0.5, n.y, n.z]);
    }
    return pts;
  }, [nodes]);
  const arrowTips = React.useMemo(() => {
    const pts = [];
    for (const n of nodes) {
      if (n.l === LAYERS.length - 1) {
        const x = n.x + 0.5;
        pts.push([x, n.y, n.z], [x - 0.08, n.y + 0.05, n.z], [x, n.y, n.z], [x - 0.08, n.y - 0.05, n.z]);
      }
      if (n.l === 0) {
        const x = n.x - 0.5;
        pts.push([x - 0.0, n.y, n.z], [x - 0.06, n.y, n.z]);
      }
    }
    return pts;
  }, [nodes]);

  React.useLayoutEffect(() => {
    const m = hollowRef.current;
    if (!m) return;
    const o = new THREE.Object3D();
    for (let i = 0; i < NN; i++) {
      o.position.set(nodes[i].x, nodes[i].y, nodes[i].z);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, [nodes, NN]);

  const tmp = React.useMemo(
    () => ({
      v: new THREE.Vector3(),
      o: new THREE.Object3D(),
      rot: { x: 0, y: 0 },
      lit: new Float32Array(LAYERS.length),
      gapOp: new Float32Array(LAYERS.length - 1),
      gradOp: new Float32Array(LAYERS.length - 1),
    }),
    []
  );

  useFrame((state, dt) => {
    const time = reduced ? 0 : state.clock.elapsedTime;
    const { pointer, t } = view.current;
    const { v, o, rot, lit, gapOp, gradOp } = tmp;

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

    /* slow rotation + parallax */
    if (root.current) {
      const ty = (reduced ? -0.22 : 0.34 * Math.sin(time * 0.13) - 0.1) + pointer.x * 0.22;
      const tx = -pointer.y * 0.1 + (t - 0.5) * 0.12;
      const k = reduced ? 1 : Math.min(1, dt * 2.5);
      rot.y += (ty - rot.y) * k;
      rot.x += (tx - rot.x) * k;
      root.current.rotation.set(rot.x, rot.y, 0);
    }

    /* schedule */
    const s = time % PERIOD;
    let active = -1; // which gap carries packets, and their progress
    let travel = 0;
    let predicted = -1;
    for (let l = 0; l < LAYERS.length; l++) lit[l] = 0;
    for (let g = 0; g < gapOp.length; g++) {
      gapOp[g] = 0.28;
      gradOp[g] = 0;
    }
    if (reduced) {
      // static: first two layers lit, first gap active
      lit[0] = 1;
      lit[1] = 1;
      gapOp[0] = 0.85;
    } else if (s < BWD_START) {
      /* forward pass */
      lit[0] = smooth(s / 0.4);
      for (let g = 0; g < 3; g++) {
        const g0 = FWD_START + g * FWD_GAP;
        const u = (s - g0) / FWD_GAP;
        if (u >= 0 && u < 1) {
          active = g;
          travel = u;
          gapOp[g] = 0.9;
        } else if (u >= 1) gapOp[g] = 0.28 + 0.3 * (1 - smooth((u - 1) * 1.5));
        lit[g + 1] = smooth((s - (g0 + FWD_GAP * 0.8)) / 0.3);
      }
      if (s > FWD_START + FWD_GAP * 3 - 0.1) predicted = 1;
    } else if (s < REST_START) {
      /* backward pass: dashed gradient runs the gaps in reverse; layers go hollow */
      predicted = 1;
      for (let l = 0; l < LAYERS.length; l++) lit[l] = 1;
      for (let k = 0; k < 3; k++) {
        const g = 2 - k;
        const g0 = BWD_START + k * BWD_GAP;
        const u = (s - g0) / BWD_GAP;
        if (u >= 0 && u < 1) {
          gradOp[g] = u < 0.2 ? smooth(u / 0.2) : u > 0.75 ? 1 - smooth((u - 0.75) / 0.25) : 1;
          lit[g + 1] = 1 - smooth(u / 0.5);
        } else if (u >= 1) lit[g + 1] = 0;
        if (u >= 0.4 && g === 2) predicted = -1;
      }
      lit[0] = 1 - smooth((s - (REST_START - 0.6)) / 0.5);
    } else {
      /* rest: everything hollow */
    }

    /* nodes: solid fill scales with lit[layer] */
    const sm = solidRef.current;
    if (sm) {
      for (let i = 0; i < NN; i++) {
        const n = nodes[i];
        let k = lit[n.l];
        if (n.l === LAYERS.length - 1 && predicted >= 0) k = n.i === predicted ? 1.35 * k : 0.45 * k;
        o.position.set(n.x, n.y, n.z);
        o.scale.setScalar(k > 0.01 ? k : 0.0001);
        o.updateMatrix();
        sm.setMatrixAt(i, o.matrix);
      }
      sm.instanceMatrix.needsUpdate = true;
    }

    /* connection opacities */
    for (let g = 0; g < gaps.length; g++) {
      const line = gapRefs.current[g];
      if (line) line.material.opacity = gapOp[g];
      const grad = gradRefs.current[g];
      if (grad) {
        grad.material.opacity = gradOp[g];
        grad.visible = gradOp[g] > 0.01;
        grad.material.dashOffset = time * 0.9; // dashes crawl backward (b → a)
      }
    }

    /* packets along the active gap */
    const pm = packetsRef.current;
    if (pm) {
      let idx = 0;
      for (let g = 0; g < gaps.length; g++) {
        const edges = gaps[g].edges;
        for (let e = 0; e < edges.length; e++) {
          const ed = edges[e];
          let sc = 0.0001;
          if (g === active) {
            const stagger = ((e * 7) % 11) / 11 * 0.18;
            const u = (travel - stagger) / 0.82;
            if (u > 0 && u < 1) {
              v.copy(ed.a).lerp(ed.b, u);
              sc = Math.sin(u * Math.PI) * 0.7 + 0.3;
            } else v.copy(ed.b);
          } else v.copy(ed.a);
          o.position.copy(v);
          o.scale.setScalar(sc);
          o.updateMatrix();
          pm.setMatrixAt(idx++, o.matrix);
        }
      }
      pm.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      <PerspectiveCamera ref={camRef} makeDefault position={[2, 2, 8]} fov={CAM_FOV} near={0.1} far={60} />
      <group ref={root}>
        <InkLine points={frames} segments lineWidth={0.6} opacity={0.3} />
        <InkLine points={stubs} segments lineWidth={0.8} opacity={0.6} />
        <InkLine points={arrowTips} segments lineWidth={0.9} opacity={0.8} />
        {gaps.map((g, i) => (
          <InkLine
            key={`w${i}`}
            ref={(el) => (gapRefs.current[i] = el)}
            points={g.pts}
            segments
            lineWidth={0.7}
            opacity={0.28}
            transparent
          />
        ))}
        {gaps.map((g, i) => (
          <InkLine
            key={`g${i}`}
            ref={(el) => (gradRefs.current[i] = el)}
            points={g.pts}
            segments
            dashed
            dashSize={0.07}
            gapSize={0.07}
            lineWidth={1.5}
            opacity={0}
            transparent
            renderOrder={3}
          />
        ))}
        {/* units: hollow wire sphere + solid core that fills on activation */}
        <instancedMesh ref={hollowRef} args={[undefined, undefined, NN]}>
          <sphereGeometry args={[NODE_R, 8, 6]} />
          <meshBasicMaterial color={ink} wireframe transparent opacity={0.7} />
        </instancedMesh>
        <instancedMesh ref={solidRef} args={[undefined, undefined, NN]} renderOrder={2}>
          <sphereGeometry args={[NODE_R * 0.8, 12, 9]} />
          <meshBasicMaterial color={ink} />
        </instancedMesh>
        {/* activations in flight */}
        <instancedMesh ref={packetsRef} args={[undefined, undefined, NP]} renderOrder={4}>
          <sphereGeometry args={[0.028, 6, 5]} />
          <meshBasicMaterial color={ink} depthTest={false} />
        </instancedMesh>
      </group>
    </group>
  );
}
