"use client";
/**
 * Living paper behind the whole page: a height field drawn as fine contour
 * lines that dent under the cursor, press on click, ripple with scroll, and
 * invert (white ink on black) inside the contact section. Runs in its own
 * WebGL canvas below the content at 0.6x resolution (the field is smooth,
 * so the upscale reads as soft ink bleed); one fragment pass per frame.
 */
import * as React from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMotionPrefs } from "../three/useMotionPrefs";

const vert = /* glsl */ `
  void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const frag = /* glsl */ `
  precision highp float;
  uniform vec2 uRes;
  uniform float uTime;
  uniform vec2 uMouse;     // pixels, origin bottom-left
  uniform vec2 uVel;       // pixels per frame, smoothed
  uniform float uPress;    // 0..1
  uniform float uScroll;   // page scrollY in px
  uniform float uDarkTop;  // y (from top, px) where the dark zone starts
  uniform float uDarkBottom;
  uniform float uClick;    // seconds since last click (large = none)
  uniform vec2 uClickPos;
  uniform float uDpr;
  uniform float uReduced;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 3; i++) { v += a * noise(p); p = p * 2.03 + 17.0; a *= 0.5; }
    return v;
  }

  float height(vec2 p) {
    vec2 q = p / uDpr;
    float t = uTime * (1.0 - uReduced);
    float h = fbm(q * 0.0022 + vec2(t * 0.025, -t * 0.018)) * 1.6;
    h += 0.18 * sin(q.y * 0.012 + uScroll * 0.004 + t * 0.4);
    // cursor dent, elongated along the direction of travel (exhaust wake)
    vec2 d = (p - uMouse) / uDpr;
    vec2 vel = uVel / uDpr;
    float sp = length(vel);
    vec2 dir = sp > 0.01 ? vel / sp : vec2(1.0, 0.0);
    float along = dot(d, dir), across = dot(d, vec2(-dir.y, dir.x));
    float r = 150.0 + uPress * 140.0;
    float wake = exp(-(along * along) / (r * r * (1.0 + sp * 0.12)) - (across * across) / (r * r));
    float tail = exp(-(across * across) / (r * r * 0.35)) * smoothstep(0.0, -60.0, along) * exp(along / (260.0 + sp * 30.0)) * min(sp * 0.08, 1.0);
    h -= (0.9 + uPress * 1.4) * wake + 0.5 * tail;
    // click ripple
    float dc = length((p - uClickPos) / uDpr);
    float age = uClick;
    h += 0.35 * sin(dc * 0.045 - age * 9.0) * exp(-age * 1.6) * exp(-dc * 0.004) * step(age, 4.0) * (1.0 - uReduced);
    return h;
  }

  void main() {
    vec2 p = gl_FragCoord.xy;
    float h = height(p);
    float e = 1.5 * uDpr;
    vec2 g = vec2(dFdx(h), dFdy(h)); // per-pixel slope: one height() call instead of three

    // contour lines
    float levels = 9.0;
    float v = h * levels;
    float fw = max(length(g) * levels * e, 1e-4) ;
    float dist = abs(fract(v) - 0.5) / max(fw, 0.02);
    float line = 1.0 - smoothstep(0.0, 1.0, dist * 0.9);
    line *= 0.8;
    // thicker every 3rd line
    float major = step(abs(fract(v / 3.0) - 0.5), 0.5 / 3.0 * 0.5);
    line = max(line, line * major * 1.2);

    // slope hatching (fake 3D shading)
    vec3 n = normalize(vec3(-g * 90.0, 1.0));
    float ndl = dot(n, normalize(vec3(-0.5, 0.6, 0.8)));
    float shade = smoothstep(0.55, 0.95, ndl);
    float hp = fract((p.x - p.y) / (7.0 * uDpr));
    float hatch = step(0.6, hp) * (1.0 - shade) * 0.55;

    // petrol sheen in the dent
    vec2 d = (p - uMouse) / uDpr;
    float near = exp(-dot(d, d) / (140.0 * 140.0)) * (0.22 + uPress * 0.45);
    float hue = fract(h * 0.7 + uTime * 0.05 * (1.0 - uReduced));
    vec3 sheen = 0.5 + 0.5 * cos(6.2831 * (hue + vec3(0.0, 0.33, 0.67)));

    float ink = clamp(line * 0.21 + hatch * 0.06, 0.0, 1.0);
    float yTop = uRes.y - p.y;
    float dark = step(uDarkTop * uDpr, yTop) * step(yTop, uDarkBottom * uDpr);

    vec3 paper = vec3(1.0);
    vec3 col = paper - ink;
    col = mix(col, col * mix(vec3(1.0), sheen, 0.9), near * (1.0 - dark));
    // dark zone: black paper, white ink
    vec3 dcol = vec3(0.0) + ink * 2.4;
    dcol = mix(dcol, dcol + sheen * 0.35, near);
    col = mix(col, dcol, dark);
    gl_FragColor = vec4(col, 1.0);
  }
`;

function Paper({ reduced }) {
  const matRef = React.useRef();
  const { size, viewport } = useThree();
  const state = React.useRef({ mx: -9999, my: -9999, tx: -9999, ty: -9999, vx: 0, vy: 0, press: 0, pressT: 0, click: 100, cx: 0, cy: 0, ltx: 0, lty: 0, lsy: -1, idle: 0, n: 0, dark: null, live: false });
  const uniforms = React.useMemo(
    () => ({
      uRes: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(-9999, -9999) },
      uVel: { value: new THREE.Vector2(0, 0) },
      uPress: { value: 0 },
      uScroll: { value: 0 },
      uDarkTop: { value: 1e9 },
      uDarkBottom: { value: 1e9 },
      uClick: { value: 100 },
      uClickPos: { value: new THREE.Vector2(0, 0) },
      uDpr: { value: 1 },
      uReduced: { value: reduced ? 1 : 0 },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  React.useEffect(() => {
    const s = state.current;
    const onMove = (e) => { s.tx = e.clientX; s.ty = e.clientY; if (s.mx < -999) { s.mx = s.tx; s.my = s.ty; } };
    const onDown = (e) => { s.pressT = 1; s.click = 0; s.cx = e.clientX; s.cy = e.clientY; };
    const onUp = () => { s.pressT = 0; };
    const onLeave = () => { s.tx = -9999; s.ty = -9999; };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  useFrame((st, dt) => {
    const u = matRef.current?.uniforms;
    if (!u) return;
    const s = state.current;
    const dpr = viewport.dpr;
    u.uRes.value.set(size.width * dpr, size.height * dpr);
    u.uDpr.value = dpr;
    u.uTime.value += dt;
    u.uScroll.value = window.scrollY;
    const k = 1 - Math.pow(0.001, dt);
    if (s.tx > -999) {
      const nx = s.mx + (s.tx - s.mx) * k * 1.2;
      const ny = s.my + (s.ty - s.my) * k * 1.2;
      s.vx = s.vx * 0.85 + (nx - s.mx) * 0.6;
      s.vy = s.vy * 0.85 + (ny - s.my) * 0.6;
      s.mx = nx; s.my = ny;
    } else { s.vx *= 0.9; s.vy *= 0.9; }
    u.uMouse.value.set(s.mx * dpr, (size.height - s.my) * dpr);
    u.uVel.value.set(s.vx * dpr, -s.vy * dpr);
    s.press += (s.pressT - s.press) * k * 1.5;
    u.uPress.value = s.press;
    s.click += dt;
    u.uClick.value = s.click;
    u.uClickPos.value.set(s.cx * dpr, (size.height - s.cy) * dpr);
    if (!s.dark) s.dark = document.getElementById("contact");
    if (s.dark) {
      const r = s.dark.getBoundingClientRect();
      u.uDarkTop.value = r.top;
      u.uDarkBottom.value = r.bottom;
    } else {
      u.uDarkTop.value = 1e9;
      u.uDarkBottom.value = 1e9;
    }
    // Only draw when something can have changed: pointer, scroll, press, ripple, or the slow drift.
    const sy = window.scrollY;
    const moved = s.tx !== s.ltx || s.ty !== s.lty || sy !== s.lsy;
    s.ltx = s.tx; s.lty = s.ty; s.lsy = sy;
    const settling = Math.abs(s.tx - s.mx) + Math.abs(s.ty - s.my) > 0.5 || s.press > 0.01 || s.pressT || s.click < 4;
    s.idle = moved || settling ? 0 : s.idle + dt;
    const still = reduced && s.idle > 0.5 && s.live;      // reduced motion: the field is static
    const half = !reduced && s.idle > 2 && (s.n++ & 1);   // idle drift at ~30 fps
    if (!still && !half) {
      st.gl.render(st.scene, st.camera);
      if (!s.live) {
        s.live = true;
        document.documentElement.classList.add("paper-live");
      }
    }
  }, 1);

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial ref={matRef} uniforms={uniforms} vertexShader={vert} fragmentShader={frag} depthTest={false} depthWrite={false} />
    </mesh>
  );
}

export default function PaperBackground() {
  const { enabled, reduced } = useMotionPrefs();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!enabled || !mounted) return null;
  return (
    <Canvas
      id="paper-canvas"
      aria-hidden="true"
      flat
      dpr={0.6}
      onCreated={({ gl }) => {
        const el = gl.domElement;
        el.addEventListener("webglcontextlost", () => document.documentElement.classList.remove("paper-live"));
        el.addEventListener("webglcontextrestored", () => document.documentElement.classList.add("paper-live"));
      }}
      frameloop="always"
      gl={{ antialias: false, alpha: false, powerPreference: "low-power", depth: false, stencil: false }}
      style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", zIndex: 0, pointerEvents: "none" }}
      camera={{ position: [0, 0, 1] }}
    >
      <Paper reduced={reduced} />
    </Canvas>
  );
}
