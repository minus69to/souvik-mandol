"use client";
/**
 * Custom ink cursor with a petrol-sheen exhaust plume.
 *  - ring + dot follow the pointer (ring lags a little, grows over links)
 *  - moving emits iridescent smoke that drifts and dissolves
 *  - pressing releases a burst, like opening a fuel line
 * The ring and dot are DOM elements blended with `difference` (visible on any
 * backdrop); the plume is a 2D canvas (multiply on paper, screen on ink).
 * Only active for fine pointers; never on touch devices. If the page cannot
 * keep up, the native cursor comes back and the plume pauses.
 */
import * as React from "react";

const HOVER_SELECTOR = "a, button, [role='button'], input, textarea, select, summary, [data-cursor]";
const MAX_PARTICLES = 420;

export default function CursorFX() {
  const canvasRef = React.useRef(null);
  const ringRef = React.useRef(null);
  const dotRef = React.useRef(null);
  const [active, setActive] = React.useState(false);

  React.useEffect(() => {
    const fine = window.matchMedia?.("(pointer: fine)").matches;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!fine) return;
    setActive(true);
    document.documentElement.classList.add("cursor-fx");

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      canvas.style.width = w + "px"; canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const s = { x: -100, y: -100, rx: -100, ry: -100, px: -100, py: -100, hover: 0, hoverT: 0, down: 0, downT: 0, visible: false, hue: 0, dark: false, slow: 16, degraded: false, idleFrames: 0 };
    const ring = ringRef.current, dot = dotRef.current;
    const particles = [];
    let raf = 0;
    let last = performance.now();

    const emit = (x, y, vx, vy, n, spread, size, life) => {
      for (let i = 0; i < n; i++) {
        if (particles.length >= MAX_PARTICLES) particles.shift();
        const a = Math.random() * Math.PI * 2;
        const sp = Math.random() * spread;
        particles.push({
          x, y,
          vx: vx + Math.cos(a) * sp,
          vy: vy + Math.sin(a) * sp,
          r: size * (0.6 + Math.random() * 0.8),
          life: 0,
          max: life * (0.7 + Math.random() * 0.6),
          hue: (s.hue + Math.random() * 60) % 360,
          spin: (Math.random() - 0.5) * 0.08,
        });
      }
    };

    const onMove = (e) => {
      s.visible = true;
      s.x = e.clientX; s.y = e.clientY;
      const t = e.target;
      s.hoverT = t && t.closest && t.closest(HOVER_SELECTOR) ? 1 : 0;
      // paper or ink under the cursor? (header, black banners, contact section)
      s.dark = !!(t && t.closest && t.closest("#contact, .bg-black, header"));
      if (dot) dot.style.transform = `translate3d(${s.x}px, ${s.y}px, 0)`; // compositor-positioned, never lags
      if (reduced || s.degraded) return;
      const dx = s.x - s.px, dy = s.y - s.py;
      const speed = Math.hypot(dx, dy);
      if (s.px > -50 && speed > 0.5) {
        const n = Math.min(5, Math.floor(speed / 6) + (speed > 2 ? 1 : 0));
        // exhaust: push smoke backwards along the direction of travel, slightly upward
        emit(s.x, s.y, -dx * 0.12, -dy * 0.12 - 0.25, n, 0.7, 5 + Math.min(speed, 40) * 0.25, 55);
      }
      s.px = s.x; s.py = s.y;
    };
    const onDown = (e) => {
      s.downT = 1;
      if (reduced || s.degraded) return;
      // fuel release: a slow, soft burst
      emit(e.clientX, e.clientY, 0, -0.6, 30, 3.0, 9, 80);
    };
    const onUp = () => { s.downT = 0; };
    const onLeave = () => { s.visible = false; };
    const onEnter = () => { s.visible = true; };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    document.documentElement.addEventListener("mouseenter", onEnter);

    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      // Frame-time guard: if the page stalls, give the native cursor back.
      s.slow = s.slow * 0.9 + (now - last) * 0.1;
      last = now;
      if (s.slow > 45 && !s.degraded) {
        s.degraded = true;
        document.documentElement.classList.remove("cursor-fx");
        particles.length = 0;
        ctx.clearRect(0, 0, w, h);
      } else if (s.slow < 25 && s.degraded) {
        s.degraded = false;
        document.documentElement.classList.add("cursor-fx");
      }
      if (s.degraded) { raf = requestAnimationFrame(tick); return; }
      const k = 1 - Math.pow(0.0005, dt);
      s.rx += (s.x - s.rx) * k; s.ry += (s.y - s.ry) * k;
      s.hover += (s.hoverT - s.hover) * k; s.down += (s.downT - s.down) * k;
      s.hue = (s.hue + dt * 40) % 360;

      // ring (DOM, difference blend) follows with a little lag
      if (ring) {
        const sc = 1 + s.hover * 0.85 - s.down * 0.25;
        ring.style.transform = `translate3d(${s.rx}px, ${s.ry}px, 0) scale(${sc.toFixed(3)})`;
        ring.style.opacity = s.visible ? "1" : "0";
        ring.style.background = `rgba(255,255,255,${(0.06 + s.hover * 0.3).toFixed(3)})`;
      }
      if (dot) { dot.style.opacity = s.visible ? "1" : "0"; dot.style.transform = `translate3d(${s.x}px, ${s.y}px, 0) scale(${(1 + s.down).toFixed(2)})`; }

      // Nothing to draw? Clear once, then skip canvas work until something changes.
      if (particles.length === 0) {
        if (s.idleFrames++ === 0) ctx.clearRect(0, 0, w, h);
        raf = requestAnimationFrame(tick);
        return;
      }
      s.idleFrames = 0;
      ctx.clearRect(0, 0, w, h);
      // multiply = ink wash on paper; screen = glow on ink
      const mode = s.dark ? "screen" : "multiply";
      if (canvas.style.mixBlendMode !== mode) canvas.style.mixBlendMode = mode;

      // particles
      ctx.globalCompositeOperation = s.dark ? "lighter" : "source-over";
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += dt * 60;
        if (p.life >= p.max) { particles.splice(i, 1); continue; }
        const u = p.life / p.max;
        p.vx *= 0.96; p.vy = p.vy * 0.96 - 0.012; // drift up like warm exhaust
        p.vx += Math.sin(p.life * 0.15 + p.hue) * 0.03;
        p.x += p.vx; p.y += p.vy;
        const r = p.r * (1 + u * 2.0);
        const alpha = (1 - u) * (1 - u) * 0.34;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        const hue = (p.hue + u * 90) % 360;
        // petrol film, not neon: pastel on paper, muted glow on ink
        const L = s.dark ? 45 : 80, S = s.dark ? 70 : 60;
        g.addColorStop(0, `hsla(${hue}, ${S}%, ${L}%, ${alpha})`);
        g.addColorStop(0.55, `hsla(${(hue + 40) % 360}, ${S}%, ${L}%, ${alpha * 0.45})`);
        g.addColorStop(1, `hsla(${(hue + 80) % 360}, ${S}%, ${L}%, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      document.documentElement.removeEventListener("mouseenter", onEnter);
      document.documentElement.classList.remove("cursor-fx");
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{ position: "fixed", inset: 0, zIndex: 60, pointerEvents: "none", mixBlendMode: "multiply", display: active ? "block" : "none" }}
      />
      <div ref={ringRef} aria-hidden="true" className="cursor-ring" style={{ display: active ? "block" : "none", opacity: 0, transition: "background 0.2s" }} />
      <div ref={dotRef} aria-hidden="true" className="cursor-dot" style={{ display: active ? "block" : "none", opacity: 0 }} />
    </>
  );
}
