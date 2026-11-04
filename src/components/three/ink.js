/**
 * Shared "ink on paper" look for every 3D scene.
 * The whole site is monochrome: white paper, black ink. Inverted sections
 * (black paper, white ink) flip the two.
 */
import * as THREE from "three";

export const PAPER = "#ffffff";
export const INK = "#000000";

/** Returns {paper, ink} colours for a scene. */
export function palette(inverted = false) {
  return inverted ? { paper: INK, ink: PAPER } : { paper: PAPER, ink: INK };
}

/**
 * Custom hatching shader. Lit faces are flat paper; shadowed faces are
 * cross-hatched with screen-space diagonal ink lines, like an engraving.
 *
 * uniforms:
 *   uLight   – light direction (world space)
 *   uInvert  – 0 = ink on paper, 1 = paper on ink
 *   uHatch   – hatch line spacing in pixels (default 6)
 *   uStrength– 0..1 how dark the hatching gets
 *   uFill    – 0..1 base fill darkness of the whole surface (0 = pure paper)
 */
export const inkVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const inkFragmentShader = /* glsl */ `
  uniform vec3 uLight;
  uniform float uInvert;
  uniform float uHatch;
  uniform float uStrength;
  uniform float uFill;
  uniform float uOpacity;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    vec3 n = normalize(vNormal);
    float ndl = dot(n, normalize(uLight));
    // 0 = fully shadowed, 1 = fully lit
    float shade = smoothstep(-0.35, 0.75, ndl);

    float s = max(uHatch, 2.0);
    float d1 = fract((gl_FragCoord.x + gl_FragCoord.y) / s);
    float d2 = fract((gl_FragCoord.x - gl_FragCoord.y) / s);
    float line1 = step(0.55, d1);
    float line2 = step(0.55, d2);
    float line3 = step(0.6, fract(gl_FragCoord.y / s));

    float ink = 0.0;
    if (shade < 0.72) ink = max(ink, line1);
    if (shade < 0.45) ink = max(ink, line2);
    if (shade < 0.2)  ink = max(ink, line3);

    // rim darkening so silhouettes read even on white
    float rim = 1.0 - max(dot(n, normalize(vViewDir)), 0.0);
    rim = smoothstep(0.75, 1.0, rim);

    float dark = clamp(ink * uStrength + rim * 0.6 + uFill, 0.0, 1.0);
    vec3 paper = vec3(1.0);
    vec3 inkCol = vec3(0.0);
    vec3 col = mix(paper, inkCol, dark);
    col = mix(col, 1.0 - col, uInvert);
    gl_FragColor = vec4(col, uOpacity);
  }
`;

export function makeInkUniforms({ inverted = false, hatch = 6, strength = 1, fill = 0, opacity = 1 } = {}) {
  return {
    uLight: { value: new THREE.Vector3(1.2, 2.0, 1.5) },
    uInvert: { value: inverted ? 1 : 0 },
    uHatch: { value: hatch },
    uStrength: { value: strength },
    uFill: { value: fill },
    uOpacity: { value: opacity },
  };
}
