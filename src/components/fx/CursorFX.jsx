"use client";
/**
 * Custom ink cursor with a petrol-sheen exhaust plume.
 *  - ring + dot follow the pointer (ring lags a little, grows over links)
 *  - moving emits iridescent smoke that drifts and dissolves
 *  - pressing releases a burst, like opening a fuel line
 * Drawn on a 2D canvas with mix-blend-mode: difference so it reads on both
 * paper and ink. Only active for fine pointers; never on touch devices.
 */
import * as React from "react";

const HOVER_SELECTOR = "a, button, [role='button'], input, textarea, select, summary, [data-cursor]";
const MAX_PARTICLES = 420;

export default function CursorFX() {
  const canvasRef = React.useRef(null);
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

    const s = { x: -100, y: -100, rx: -100, ry: -100, px: -100, py: -100, hover: 0, hoverT: 0, down: 0, downT: 0, visible: false, hue: 0, dark: false };
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
      if (reduced) return;
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
      if (reduced) return;
      // fuel release: a slow, rich burst
      emit(e.clientX, e.clientY, 0, -0.6, 46, 3.2, 9, 80);
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
      last = now;
      const k = 1 - Math.pow(0.0005, dt);
      s.rx += (s.x - s.rx) * k; s.ry += (s.y - s.ry) * k;
      s.hover += (s.hoverT - s.hover) * k; s.down += (s.downT - s.down) * k;
      s.hue = (s.hue + dt * 40) % 360;

      ctx.clearRect(0, 0, w, h);
      // multiply = ink wash on paper; screen = glow on ink
      const mode = s.dark ? "screen" : "multiply";
      if (canvas.style.mixBlendMode !== mode) canvas.style.mixBlendMode = mode;
      const inkCol = s.dark ? "255,255,255" : "0,0,0";

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
        const L = s.dark ? 55 : 72;
        g.addColorStop(0, `hsla(${hue}, 90%, ${L}%, ${alpha})`);
        g.addColorStop(0.55, `hsla(${(hue + 40) % 360}, 85%, ${L}%, ${alpha * 0.45})`);
        g.addColorStop(1, `hsla(${(hue + 80) % 360}, 85%, ${L}%, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
      }

      // cursor
      ctx.globalCompositeOperation = "source-over";
      if (s.visible) {
        const ringR = 14 + s.hover * 12 + s.down * -4;
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = `rgba(${inkCol},0.95)`;
        ctx.fillStyle = `rgba(${inkCol},${0.06 + s.hover * 0.22})`;
        ctx.beginPath(); ctx.arc(s.rx, s.ry, ringR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        // crosshair ticks when hovering
        if (s.hover > 0.05) {
          const t = s.hover * 5;
          ctx.beginPath();
          ctx.moveTo(s.rx - ringR - t, s.ry); ctx.lineTo(s.rx - ringR + 3, s.ry);
          ctx.moveTo(s.rx + ringR - 3, s.ry); ctx.lineTo(s.rx + ringR + t, s.ry);
          ctx.moveTo(s.rx, s.ry - ringR - t); ctx.lineTo(s.rx, s.ry - ringR + 3);
          ctx.moveTo(s.rx, s.ry + ringR - 3); ctx.lineTo(s.rx, s.ry + ringR + t);
          ctx.stroke();
        }
        ctx.fillStyle = `rgba(${inkCol},1)`;
        ctx.beginPath(); ctx.arc(s.x, s.y, 3 + s.down * 3, 0, Math.PI * 2); ctx.fill();
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
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: "fixed", inset: 0, zIndex: 60, pointerEvents: "none", mixBlendMode: "multiply", display: active ? "block" : "none" }}
    />
  );
}
