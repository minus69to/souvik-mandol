"use client";
import * as React from "react";

let cached = null;
function detect() {
  if (typeof window === "undefined") return { enabled: false, reduced: false, mobile: false };
  if (cached) return cached;
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const mobile = window.matchMedia?.("(max-width: 768px)").matches ?? false;
  let webgl = false;
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    webgl = !!gl;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webgl = false;
  }
  const forced = new URLSearchParams(window.location.search).get("3d");
  const enabled = forced === "off" ? false : forced === "on" ? true : webgl;
  cached = { enabled, reduced, mobile };
  return cached;
}

/**
 * { enabled, reduced, mobile }
 *  enabled – WebGL available and not disabled (?3d=off)
 *  reduced – user prefers reduced motion: scenes should idle, not animate
 *  mobile  – narrow viewport: scenes should lower particle counts
 */
export function useMotionPrefs() {
  const [prefs, setPrefs] = React.useState({ enabled: false, reduced: false, mobile: false });
  React.useEffect(() => setPrefs(detect()), []);
  return prefs;
}
