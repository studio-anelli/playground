"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * NOISE-BUILT TYPE — Variant 2 (wrap-back force) + extensions
 * - Canvas renders ONLY inside glyph mask (no visible noise outside)
 * - Particles may drift outside, but are softly steered back in
 * - Noise modes: gaussian (static jitter), liquid (flow), turbulence (curlier flow)
 * - Noise scale controls spatial frequency of the field
 * - Mouse interaction: repel / attract / disturb
 * - Attraction ramps up the longer you hold (slowly involving nearby letters)
 */

const CW = 1800;
const CH = 550;

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  homeX: number;
  homeY: number;
  seed: number;
};

type NoiseType = "gaussian" | "liquid" | "turbulence";
type MouseMode = "repel" | "attract" | "disturb";

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rand = (a: number, b: number) => a + Math.random() * (b - a);

function hash2(x: number, y: number) {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function makeOffscreen(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  return { c, ctx };
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // UI
  const [text, setText] = useState("NOISE TYPE");
  const [fontFamily, setFontFamily] = useState(
    "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial"
  );
  const [fontWeight, setFontWeight] = useState(700);
  const [fontSize, setFontSize] = useState(220);
  const [tracking, setTracking] = useState(0);

  const [density, setDensity] = useState(4200);
  const [leakiness, setLeakiness] = useState(0.55);
  const [noiseType, setNoiseType] = useState<NoiseType>("liquid");
  const [noiseScale, setNoiseScale] = useState(0.85); // 0.2..2.5
  const [turbulence, setTurbulence] = useState(0.55);

  const [mouseMode, setMouseMode] = useState<MouseMode>("repel");
  const [mouseStrength, setMouseStrength] = useState(0.65);

  const [bg, setBg] = useState("#0b0c10");
  const [fg, setFg] = useState("#f2f2f2");

  const rafRef = useRef<number | null>(null);
  const tRef = useRef(0);

  // mask refs
  const maskRef = useRef<Uint8ClampedArray | null>(null);
  const maskWRef = useRef(CW);
  const maskHRef = useRef(CH);

  // particles
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: CW * 0.5, y: CH * 0.5, down: false, hold: 0 });

  // Build glyph mask whenever text/font changes
  useEffect(() => {
    const { ctx: octx } = makeOffscreen(CW, CH);
    octx.clearRect(0, 0, CW, CH);

    octx.save();
    octx.fillStyle = "#fff";
    octx.textAlign = "center";
    octx.textBaseline = "middle";
    octx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

    const s = (text || "").toString();
    if (tracking === 0) {
      octx.fillText(s, CW / 2, CH / 2 + 10);
    } else {
      const chars = [...s];
      const widths = chars.map((ch) => octx.measureText(ch).width);
      const total =
        widths.reduce((acc, w) => acc + w, 0) +
        tracking * Math.max(0, chars.length - 1);
      let x = CW / 2 - total / 2;
      const y = CH / 2 + 10;
      for (let i = 0; i < chars.length; i++) {
        const ch = chars[i];
        const w = widths[i];
        octx.fillText(ch, x + w / 2, y);
        x += w + tracking;
      }
    }
    octx.restore();

    const img = octx.getImageData(0, 0, CW, CH);
    maskRef.current = img.data;
    maskWRef.current = CW;
    maskHRef.current = CH;

    const inside = (x: number, y: number) => {
      const ix = Math.floor(x);
      const iy = Math.floor(y);
      if (ix < 0 || iy < 0 || ix >= CW || iy >= CH) return false;
      const idx = (iy * CW + ix) * 4 + 3;
      return img.data[idx] > 16;
    };

    const sampleInside = (): { x: number; y: number } => {
      for (let k = 0; k < 3000; k++) {
        const x = rand(0, CW);
        const y = rand(0, CH);
        if (inside(x, y)) return { x, y };
      }
      return { x: CW / 2, y: CH / 2 };
    };

    const N = Math.max(600, Math.floor(density));
    const ps: Particle[] = [];
    for (let i = 0; i < N; i++) {
      const p = sampleInside();
      ps.push({
        x: p.x + rand(-1, 1),
        y: p.y + rand(-1, 1),
        vx: rand(-0.25, 0.25),
        vy: rand(-0.25, 0.25),
        homeX: p.x,
        homeY: p.y,
        seed: Math.random() * 9999,
      });
    }
    particlesRef.current = ps;
  }, [text, fontFamily, fontWeight, fontSize, tracking, density]);

  // Mouse
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const rectPos = () => el.getBoundingClientRect();
    const toCanvas = (e: PointerEvent) => {
      const r = rectPos();
      const x = ((e.clientX - r.left) / r.width) * CW;
      const y = ((e.clientY - r.top) / r.height) * CH;
      return { x, y };
    };

    const onMove = (e: PointerEvent) => {
      const p = toCanvas(e);
      mouseRef.current.x = p.x;
      mouseRef.current.y = p.y;
    };
    const onDown = (e: PointerEvent) => {
      el.setPointerCapture(e.pointerId);
      mouseRef.current.down = true;
      onMove(e);
    };
    const onUp = (e: PointerEvent) => {
      mouseRef.current.down = false;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {}
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);

    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  // Animation loop
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d")!;
    cvs.width = CW;
    cvs.height = CH;

    const inside = (x: number, y: number) => {
      const data = maskRef.current;
      if (!data) return false;
      const ix = Math.floor(x);
      const iy = Math.floor(y);
      if (ix < 0 || iy < 0 || ix >= maskWRef.current || iy >= maskHRef.current)
        return false;
      const idx = (iy * maskWRef.current + ix) * 4 + 3;
      return data[idx] > 16;
    };

    const nearestInside = (x: number, y: number, rMax: number) => {
      const steps = 16;
      for (let r = 2; r <= rMax; r += 2) {
        for (let i = 0; i < steps; i++) {
          const a = (i / steps) * Math.PI * 2;
          const nx = x + Math.cos(a) * r;
          const ny = y + Math.sin(a) * r;
          if (inside(nx, ny)) return { x: nx, y: ny };
        }
      }
      return null as null | { x: number; y: number };
    };

    // Curl-ish vector field (cheap): gradient of hash noise, take perpendicular
    const flowVec = (x: number, y: number, t: number, scale: number, type: NoiseType, seed: number) => {
      const f = 0.008 * scale;
      const tt = t * 0.25;
      const eps = 12 / scale;

      const n = (xx: number, yy: number) => hash2(xx * f + seed, yy * f + tt);

      if (type === "gaussian") {
        // minimal coherent motion; mostly “grain” jitter
        const gx = n(x + 37.1, y - 12.7) * 2 - 1;
        const gy = n(x - 19.4, y + 44.2) * 2 - 1;
        return { x: gx * 0.35, y: gy * 0.35 };
      }

      // gradient
      const nx1 = n(x + eps, y);
      const nx0 = n(x - eps, y);
      const ny1 = n(x, y + eps);
      const ny0 = n(x, y - eps);
      const dx = nx1 - nx0;
      const dy = ny1 - ny0;

      // perpendicular => curl direction
      let vx = -dy;
      let vy = dx;
      const mag = Math.hypot(vx, vy) || 1;
      vx /= mag;
      vy /= mag;

      if (type === "liquid") {
        return { x: vx, y: vy };
      }

      // turbulence: add another octave and slight wobble
      const f2 = f * 1.9;
      const n2 = (xx: number, yy: number) => hash2(xx * f2 - seed * 0.7, yy * f2 + tt * 1.4);
      const nx12 = n2(x + eps * 0.7, y);
      const nx02 = n2(x - eps * 0.7, y);
      const ny12 = n2(x, y + eps * 0.7);
      const ny02 = n2(x, y - eps * 0.7);
      const dx2 = nx12 - nx02;
      const dy2 = ny12 - ny02;

      let vx2 = -dy2;
      let vy2 = dx2;
      const mag2 = Math.hypot(vx2, vy2) || 1;
      vx2 /= mag2;
      vy2 /= mag2;

      // blend octaves
      const bx = vx * 0.55 + vx2 * 0.45;
      const by = vy * 0.55 + vy2 * 0.45;
      const bmag = Math.hypot(bx, by) || 1;
      return { x: bx / bmag, y: by / bmag };
    };

    const frame = () => {
      const t = (tRef.current += 1 / 60);
      const ps = particlesRef.current;
      const m = mouseRef.current;

      // update hold ramp (for long-press attraction)
      if (m.down) m.hold = clamp(m.hold + 1 / 60, 0, 4.0);
      else m.hold = clamp(m.hold - 2.2 / 60, 0, 4.0);

      ctx.clearRect(0, 0, CW, CH);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, CW, CH);
      ctx.fillStyle = fg;

      const dt = 1;
      const baseDrag = 0.92;
      const leak = clamp(leakiness, 0, 1);

      // wrap-back strength (always on)
      const wrapK = lerp(0.22, 0.06, leak);
      const homeK = lerp(0.011, 0.004, leak);

      // noise
      const turb = clamp(turbulence, 0, 1);
      const scale = clamp(noiseScale, 0.2, 2.5);
      const flowKBase = noiseType === "gaussian" ? 0.06 : lerp(0.06, 0.26, turb);
      const flowK = flowKBase * (noiseType === "turbulence" ? 1.25 : 1.0);

      // mouse
      const ms = clamp(mouseStrength, 0, 1);
      const baseR = lerp(90, 170, ms);
      const baseK = lerp(0.16, 0.68, ms);

      // long-press ramp: grows radius + strength gradually
      const ramp = smoothstep(0.0, 3.0, m.hold);
      const mouseR = baseR * (1 + 1.25 * ramp);
      const mouseK = baseK * (1 + 1.6 * ramp);

      // make wrap search radius slightly bigger under strong turbulence
      const wrapSearchR = 28 + Math.floor(18 * turb);

      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];

        // --- Noise / flow ---
        const fv = flowVec(p.x, p.y, t, scale, noiseType, p.seed * 0.001);
        p.vx += fv.x * flowK;
        p.vy += fv.y * flowK;

        // --- Mouse interaction ---
        const dxm = p.x - m.x;
        const dym = p.y - m.y;
        const d2 = dxm * dxm + dym * dym;
        const r2 = mouseR * mouseR;
        if (d2 < r2) {
          const d = Math.sqrt(d2) || 1;
          const f = 1 - d / mouseR;
          const w = mouseK * f * f;

          if (mouseMode === "repel") {
            p.vx += (dxm / d) * w;
            p.vy += (dym / d) * w;
          } else if (mouseMode === "attract") {
            p.vx -= (dxm / d) * w;
            p.vy -= (dym / d) * w;

            // Slowly involve nearby letters by shifting home points toward the mouse.
            // This is subtle and only grows with long press.
            if (m.down) {
              const homePull = 0.0015 + 0.007 * ramp;
              p.homeX = lerp(p.homeX, m.x, homePull);
              p.homeY = lerp(p.homeY, m.y, homePull);
            }
          } else {
            // disturb: tangential swirl + a bit of radial jitter
            const tx = -dym / d;
            const ty = dxm / d;
            const swirl = w * 0.85;
            p.vx += tx * swirl;
            p.vy += ty * swirl;

            const jitter = w * 0.35;
            p.vx += (hash2(p.seed + t * 2.3, p.x * 0.01) * 2 - 1) * jitter;
            p.vy += (hash2(p.seed - t * 2.3, p.y * 0.01) * 2 - 1) * jitter;
          }
        }

        // --- Home spring (keeps legibility) ---
        p.vx += (p.homeX - p.x) * homeK;
        p.vy += (p.homeY - p.y) * homeK;

        // integrate
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // drag
        p.vx *= baseDrag;
        p.vy *= baseDrag;

        // --- Wrap-back constraint (Variant 2) ---
        if (!inside(p.x, p.y)) {
          const hit = nearestInside(p.x, p.y, wrapSearchR);
          if (hit) {
            const dx = hit.x - p.x;
            const dy = hit.y - p.y;

            // slightly nonlinear: stronger when further out
            const outMag = clamp(Math.hypot(dx, dy) / wrapSearchR, 0, 1);
            const k = wrapK * (0.65 + 0.85 * outMag);

            p.vx += dx * k;
            p.vy += dy * k;

            // keep homes coherent near boundary, but don’t collapse everything to the edge
            p.homeX = lerp(p.homeX, hit.x, 0.02);
            p.homeY = lerp(p.homeY, hit.y, 0.02);
          } else {
            p.vx += (p.homeX - p.x) * (wrapK * 1.6);
            p.vy += (p.homeY - p.y) * (wrapK * 1.6);
          }

          p.x = clamp(p.x, -40, CW + 40);
          p.y = clamp(p.y, -40, CH + 40);
        } else {
          // tiny drift to avoid looking like a perfect “fill”
          const drift = smoothstep(0.0, 1.0, turb) * 0.004;
          p.homeX = lerp(p.homeX, p.x, drift);
          p.homeY = lerp(p.homeY, p.y, drift);
        }

        // Draw ONLY inside
        if (inside(p.x, p.y)) ctx.fillRect(p.x, p.y, 1, 1);
      }

      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [bg, fg, leakiness, turbulence, mouseStrength, mouseMode, noiseType, noiseScale]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#111318",
        color: "#f3f3f3",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        padding: 16,
        boxSizing: "border-box",
      }}
    >
      <div style={{ width: "min(1200px, 100%)" }}>
        <div
          style={{
            background: "#1a1f27",
            border: "1px solid #2b3442",
            borderRadius: 14,
            padding: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
          }}
        >
          <div
            style={{
              width: "100%",
              aspectRatio: `${CW} / ${CH}`,
              background: "#0b0c10",
              borderRadius: 10,
              overflow: "hidden",
              border: "1px solid #2b3442",
            }}
          >
            <canvas
              ref={canvasRef}
              style={{ width: "100%", height: "100%", display: "block" }}
            />
          </div>

          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: "repeat(12, 1fr)",
              gap: 10,
              alignItems: "end",
            }}
          >
            <div style={{ gridColumn: "span 6" }}>
              <label style={{ display: "block", fontSize: 12, opacity: 0.85, marginBottom: 6 }}>
                Text
              </label>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type something"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #2b3442",
                  background: "#0f131a",
                  color: "#f3f3f3",
                  outline: "none",
                  fontSize: 14,
                }}
              />
            </div>

            <div style={{ gridColumn: "span 3" }}>
              <label style={{ display: "block", fontSize: 12, opacity: 0.85, marginBottom: 6 }}>
                Noise type
              </label>
              <select
                value={noiseType}
                onChange={(e) => setNoiseType(e.target.value as NoiseType)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #2b3442",
                  background: "#0f131a",
                  color: "#f3f3f3",
                  outline: "none",
                  fontSize: 14,
                }}
              >
                <option value="gaussian">gaussian</option>
                <option value="liquid">liquid</option>
                <option value="turbulence">turbulence</option>
              </select>
            </div>

            <div style={{ gridColumn: "span 3" }}>
              <label style={{ display: "block", fontSize: 12, opacity: 0.85, marginBottom: 6 }}>
                Mouse
              </label>
              <select
                value={mouseMode}
                onChange={(e) => setMouseMode(e.target.value as MouseMode)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #2b3442",
                  background: "#0f131a",
                  color: "#f3f3f3",
                  outline: "none",
                  fontSize: 14,
                }}
              >
                <option value="repel">repel</option>
                <option value="attract">attract (hold grows)</option>
                <option value="disturb">disturb</option>
              </select>
            </div>

            <div style={{ gridColumn: "span 3" }}>
              <label style={{ display: "block", fontSize: 12, opacity: 0.85, marginBottom: 6 }}>
                Density ({density})
              </label>
              <input
                type="range"
                min={800}
                max={16000}
                step={50}
                value={density}
                onChange={(e) => setDensity(parseInt(e.target.value, 10))}
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ gridColumn: "span 3" }}>
              <label style={{ display: "block", fontSize: 12, opacity: 0.85, marginBottom: 6 }}>
                Leakiness ({leakiness.toFixed(2)})
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={leakiness}
                onChange={(e) => setLeakiness(parseFloat(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ gridColumn: "span 3" }}>
              <label style={{ display: "block", fontSize: 12, opacity: 0.85, marginBottom: 6 }}>
                Noise scale ({noiseScale.toFixed(2)})
              </label>
              <input
                type="range"
                min={0.2}
                max={2.5}
                step={0.01}
                value={noiseScale}
                onChange={(e) => setNoiseScale(parseFloat(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ gridColumn: "span 3" }}>
              <label style={{ display: "block", fontSize: 12, opacity: 0.85, marginBottom: 6 }}>
                Turbulence ({turbulence.toFixed(2)})
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={turbulence}
                onChange={(e) => setTurbulence(parseFloat(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ gridColumn: "span 3" }}>
              <label style={{ display: "block", fontSize: 12, opacity: 0.85, marginBottom: 6 }}>
                Mouse strength ({mouseStrength.toFixed(2)})
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={mouseStrength}
                onChange={(e) => setMouseStrength(parseFloat(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ gridColumn: "span 2" }}>
              <label style={{ display: "block", fontSize: 12, opacity: 0.85, marginBottom: 6 }}>
                Font size ({fontSize}px)
              </label>
              <input
                type="range"
                min={80}
                max={320}
                step={1}
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ gridColumn: "span 2" }}>
              <label style={{ display: "block", fontSize: 12, opacity: 0.85, marginBottom: 6 }}>
                Weight ({fontWeight})
              </label>
              <input
                type="range"
                min={300}
                max={900}
                step={50}
                value={fontWeight}
                onChange={(e) => setFontWeight(parseInt(e.target.value, 10))}
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ gridColumn: "span 2" }}>
              <label style={{ display: "block", fontSize: 12, opacity: 0.85, marginBottom: 6 }}>
                Tracking ({tracking}px)
              </label>
              <input
                type="range"
                min={-8}
                max={40}
                step={1}
                value={tracking}
                onChange={(e) => setTracking(parseInt(e.target.value, 10))}
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ gridColumn: "span 3" }}>
              <label style={{ display: "block", fontSize: 12, opacity: 0.85, marginBottom: 6 }}>
                FG
              </label>
              <input
                type="color"
                value={fg}
                onChange={(e) => setFg(e.target.value)}
                style={{
                  width: "100%",
                  height: 40,
                  borderRadius: 10,
                  border: "1px solid #2b3442",
                  background: "#0f131a",
                }}
              />
            </div>

            <div style={{ gridColumn: "span 3" }}>
              <label style={{ display: "block", fontSize: 12, opacity: 0.85, marginBottom: 6 }}>
                BG
              </label>
              <input
                type="color"
                value={bg}
                onChange={(e) => setBg(e.target.value)}
                style={{
                  width: "100%",
                  height: 40,
                  borderRadius: 10,
                  border: "1px solid #2b3442",
                  background: "#0f131a",
                }}
              />
            </div>

            <div style={{ gridColumn: "span 12" }}>
              <label style={{ display: "block", fontSize: 12, opacity: 0.75, marginBottom: 6 }}>
                Font family (CSS)
              </label>
              <input
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #2b3442",
                  background: "#0f131a",
                  color: "#f3f3f3",
                  outline: "none",
                  fontSize: 13,
                }}
              />
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
                Tip: hold mouse down to ramp the effect (especially in attract). Outside the glyph remains invisible.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
