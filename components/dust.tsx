"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Particle = {
  x: number;
  y: number;
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  size: number;
  hue: number;
  scale: number;
  angle: number;
};

type DustTab = "mode" | "particles" | "field";
type Placement = "inside" | "outside";
type DustShape = "dot" | "square" | "line" | "mix";

const PALETTES = [
  { background: "#0b73f6", foreground: "#f5f1e9", panel: "rgba(5, 45, 105, .72)" },
  { background: "#f12d87", foreground: "#fff8e8", panel: "rgba(100, 16, 55, .7)" },
  { background: "#f4e52d", foreground: "#151515", panel: "rgba(76, 70, 8, .68)" },
  { background: "#35df83", foreground: "#101510", panel: "rgba(9, 72, 40, .68)" },
];

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let result = Math.imul(state ^ (state >>> 15), 1 | state);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="dust-control">
      <span>{label}</span>
      <input
        className="immersive-slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <output>{Number.isInteger(value) ? value : value.toFixed(2)}</output>
    </label>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="dust-segment-row">
      <span>{label}</span>
      <div className="dust-segments">
        {options.map((option) => (
          <button
            type="button"
            key={option}
            aria-pressed={value === option}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Dust() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const maskRef = useRef<ImageData | null>(null);
  const sizeRef = useRef({ width: 1280, height: 720 });
  const pointerRef = useRef({ x: 0, y: 0, active: false });
  const frameRef = useRef(0);

  const [text, setText] = useState("DUST");
  const [blend, setBlend] = useState(0.42);
  const [placement, setPlacement] = useState<Placement>("inside");
  const [shape, setShape] = useState<DustShape>("dot");
  const [density, setDensity] = useState(520);
  const [particleSize, setParticleSize] = useState(2.8);
  const [noise, setNoise] = useState(1.15);
  const [speed, setSpeed] = useState(0.72);
  const [spring, setSpring] = useState(0.035);
  const [pointerForce, setPointerForce] = useState(2.1);
  const [pointerRadius, setPointerRadius] = useState(130);
  const [collision, setCollision] = useState(0.72);
  const [trail, setTrail] = useState(0.08);
  const [seed, setSeed] = useState(888);
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<DustTab>("mode");
  const [panelOpen, setPanelOpen] = useState(true);

  const palette = PALETTES[paletteIndex];

  const rebuild = useCallback(() => {
    const { width, height } = sizeRef.current;
    if (width < 2 || height < 2) return;

    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = Math.floor(width);
    maskCanvas.height = Math.floor(height);
    const maskContext = maskCanvas.getContext("2d", { willReadFrequently: true });
    if (!maskContext) return;

    const fontSize = clamp(width / Math.max(3.2, text.length * 0.72), 120, height * 0.56);
    maskContext.clearRect(0, 0, width, height);
    maskContext.fillStyle = "#000";
    maskContext.textAlign = "center";
    maskContext.textBaseline = "middle";
    maskContext.font = `900 ${fontSize}px Arial, Helvetica, sans-serif`;
    maskContext.fillText(text.trim() || "DUST", width / 2, height / 2);
    const mask = maskContext.getImageData(0, 0, Math.floor(width), Math.floor(height));
    maskRef.current = mask;

    const random = seeded(seed);
    const points: Particle[] = [];
    const marginX = width * 0.08;
    const marginY = height * 0.17;
    let attempts = 0;

    while (points.length < density && attempts < density * 500) {
      attempts += 1;
      const x = marginX + random() * (width - marginX * 2);
      const y = marginY + random() * (height - marginY * 2);
      const alpha = mask.data[(Math.floor(y) * mask.width + Math.floor(x)) * 4 + 3];
      const accepted = placement === "inside" ? alpha > 16 : alpha <= 16;
      if (!accepted) continue;

      points.push({
        x,
        y,
        ox: x,
        oy: y,
        vx: (random() - 0.5) * 0.5,
        vy: (random() - 0.5) * 0.5,
        size: particleSize * (0.55 + random() * 1.15),
        hue: random() * 42,
        scale: 1,
        angle: random() * Math.PI * 2,
      });
    }
    particlesRef.current = points;
  }, [density, particleSize, placement, seed, text]);

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;

    const resize = () => {
      const rect = stage.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      sizeRef.current = { width: rect.width, height: rect.height };
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      rebuild();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(stage);
    resize();
    return () => observer.disconnect();
  }, [rebuild]);

  useEffect(() => rebuild(), [rebuild]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let previous = performance.now();
    const tick = (now: number) => {
      const dt = clamp((now - previous) / 16.667, 0.25, 2);
      previous = now;
      const { width, height } = sizeRef.current;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      context.globalCompositeOperation = "source-over";
      context.globalAlpha = trail === 0 ? 1 : clamp(0.11 + trail * 0.9, 0.11, 1);
      context.fillStyle = palette.background;
      context.fillRect(0, 0, width, height);
      context.globalAlpha = 1;

      const particles = particlesRef.current;
      const mask = maskRef.current;
      const time = now * 0.00045;
      const reactAmount = blend;
      const distortAmount = 1 - blend;

      const cells = new Map<string, number[]>();
      const cellSize = Math.max(12, particleSize * 5.5);
      if (reactAmount > 0.02) {
        particles.forEach((particle, index) => {
          const key = `${Math.floor(particle.x / cellSize)},${Math.floor(particle.y / cellSize)}`;
          const bucket = cells.get(key);
          if (bucket) bucket.push(index);
          else cells.set(key, [index]);
        });
      }

      particles.forEach((particle, index) => {
        const waveX = Math.sin(particle.oy * 0.018 + time * 2.3 + particle.hue) + Math.cos(particle.x * 0.011 - time);
        const waveY = Math.cos(particle.ox * 0.015 - time * 1.7) + Math.sin(particle.y * 0.013 + time * 1.2);
        particle.vx += waveX * noise * 0.018 * distortAmount * dt;
        particle.vy += waveY * noise * 0.018 * distortAmount * dt;

        particle.vx += (particle.ox - particle.x) * spring * (0.35 + distortAmount) * dt;
        particle.vy += (particle.oy - particle.y) * spring * (0.35 + distortAmount) * dt;

        const pointer = pointerRef.current;
        if (pointer.active) {
          const dx = particle.x - pointer.x;
          const dy = particle.y - pointer.y;
          const distance = Math.hypot(dx, dy) || 1;
          if (distance < pointerRadius) {
            const force = (1 - distance / pointerRadius) * pointerForce;
            particle.vx += (dx / distance) * force * (0.35 + distortAmount) * dt;
            particle.vy += (dy / distance) * force * (0.35 + distortAmount) * dt;
          }
        }

        if (reactAmount > 0.02) {
          const cx = Math.floor(particle.x / cellSize);
          const cy = Math.floor(particle.y / cellSize);
          for (let gx = cx - 1; gx <= cx + 1; gx += 1) {
            for (let gy = cy - 1; gy <= cy + 1; gy += 1) {
              const neighbours = cells.get(`${gx},${gy}`) || [];
              for (const neighbourIndex of neighbours) {
                if (neighbourIndex <= index) continue;
                const other = particles[neighbourIndex];
                const dx = particle.x - other.x;
                const dy = particle.y - other.y;
                const distance = Math.hypot(dx, dy) || 0.001;
                const radius = (particle.size + other.size) * 2.4;
                if (distance < radius) {
                  const push = (1 - distance / radius) * collision * reactAmount;
                  const nx = dx / distance;
                  const ny = dy / distance;
                  particle.vx += nx * push;
                  particle.vy += ny * push;
                  other.vx -= nx * push;
                  other.vy -= ny * push;
                  particle.scale = Math.min(4.5, particle.scale + 0.025 * reactAmount);
                  other.scale = Math.min(4.5, other.scale + 0.025 * reactAmount);
                  particle.hue = (particle.hue + 1.4) % 42;
                  other.hue = (other.hue + 1.4) % 42;
                }
              }
            }
          }
        }

        particle.vx *= Math.pow(0.91 - speed * 0.025, dt);
        particle.vy *= Math.pow(0.91 - speed * 0.025, dt);
        const previousX = particle.x;
        const previousY = particle.y;
        particle.x += particle.vx * speed * dt;
        particle.y += particle.vy * speed * dt;
        particle.angle += (particle.vx + particle.vy) * 0.012;
        particle.scale += (1 - particle.scale) * 0.008 * dt;

        if (mask) {
          const mx = Math.floor(particle.x);
          const my = Math.floor(particle.y);
          const inBounds = mx >= 0 && my >= 0 && mx < mask.width && my < mask.height;
          const inside = inBounds && mask.data[(my * mask.width + mx) * 4 + 3] > 16;
          const valid = placement === "inside" ? inside : !inside;
          if (!valid && reactAmount > 0.08) {
            particle.x = previousX;
            particle.y = previousY;
            particle.vx *= -0.72 * reactAmount;
            particle.vy *= -0.72 * reactAmount;
          }
        }

        if (particle.x < 0 || particle.x > width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > height) particle.vy *= -1;

        const type = shape === "mix" ? (["dot", "square", "line"] as const)[index % 3] : shape;
        const drawSize = particle.size * particle.scale;
        context.save();
        context.translate(particle.x, particle.y);
        context.rotate(particle.angle);
        context.fillStyle = palette.foreground;
        context.strokeStyle = palette.foreground;
        context.lineWidth = Math.max(1, particle.size * 0.48);
        if (type === "dot") {
          context.beginPath();
          context.arc(0, 0, drawSize, 0, Math.PI * 2);
          context.fill();
        } else if (type === "square") {
          context.fillRect(-drawSize, -drawSize, drawSize * 2, drawSize * 2);
        } else {
          context.beginPath();
          context.moveTo(-drawSize * 2.6, 0);
          context.lineTo(drawSize * 2.6, 0);
          context.stroke();
        }
        context.restore();
      });

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [blend, collision, noise, palette, particleSize, placement, pointerForce, pointerRadius, shape, speed, spring, trail]);

  const updatePointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    pointerRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      active: true,
    };
  };

  return (
    <div
      className="dust-app"
      style={{
        "--dust-bg": palette.background,
        "--dust-fg": palette.foreground,
        "--dust-panel": palette.panel,
      } as React.CSSProperties}
    >
      <div className="dust-stage" ref={stageRef}>
        <canvas
          ref={canvasRef}
          onPointerMove={updatePointer}
          onPointerEnter={updatePointer}
          onPointerLeave={() => { pointerRef.current.active = false; }}
          aria-label="DUST particle field"
        />
      </div>

      <aside className={`dust-panel ${panelOpen ? "" : "is-closed"}`}>
        <header className="dust-panel-header">
          <span>DUST / Engine</span>
          <button type="button" onClick={() => setPanelOpen((open) => !open)} aria-label={panelOpen ? "Collapse controls" : "Open controls"}>
            {panelOpen ? "×" : "+"}
          </button>
        </header>

        {panelOpen && (
          <>
            <nav className="dust-tabs" aria-label="DUST controls">
              {(["mode", "particles", "field"] as DustTab[]).map((tab) => (
                <button key={tab} type="button" aria-pressed={activeTab === tab} onClick={() => setActiveTab(tab)}>{tab}</button>
              ))}
            </nav>
            <div className="dust-panel-body">
              {activeTab === "mode" && (
                <>
                  <div className="dust-mode-readout">
                    <span>{blend < 0.2 ? "Distort" : blend > 0.8 ? "React" : "Hybrid"}</span>
                    <strong>{Math.round(blend * 100)}%</strong>
                  </div>
                  <Slider label="Distort / React" value={blend} min={0} max={1} step={0.01} onChange={setBlend} />
                  <Segmented label="Boundary" value={placement} options={["inside", "outside"] as const} onChange={setPlacement} />
                  <p className="dust-note">Distort follows a noise field and the pointer. React enforces the glyph boundary and activates particle collisions.</p>
                </>
              )}

              {activeTab === "particles" && (
                <>
                  <Slider label="Density" value={density} min={80} max={900} step={10} onChange={setDensity} />
                  <Slider label="Size" value={particleSize} min={0.8} max={9} step={0.1} onChange={setParticleSize} />
                  <Segmented label="Shape" value={shape} options={["dot", "square", "line", "mix"] as const} onChange={setShape} />
                  <Slider label="Collision" value={collision} min={0} max={2.5} step={0.01} onChange={setCollision} />
                  <button className="dust-wide-button" type="button" onClick={() => setSeed((value) => value + 1)}>Reseed particles</button>
                </>
              )}

              {activeTab === "field" && (
                <>
                  <Slider label="Noise" value={noise} min={0} max={4} step={0.01} onChange={setNoise} />
                  <Slider label="Speed" value={speed} min={0.1} max={2.2} step={0.01} onChange={setSpeed} />
                  <Slider label="Return" value={spring} min={0} max={0.12} step={0.001} onChange={setSpring} />
                  <Slider label="Pointer radius" value={pointerRadius} min={20} max={320} step={1} onChange={setPointerRadius} />
                  <Slider label="Pointer force" value={pointerForce} min={-5} max={5} step={0.05} onChange={setPointerForce} />
                  <Slider label="Trails" value={trail} min={0} max={1} step={0.01} onChange={setTrail} />
                </>
              )}
            </div>
          </>
        )}
      </aside>

      <div className="dust-bottom-bar">
        <label className="dust-text-input">
          <span>Text</span>
          <input value={text} onChange={(event) => setText(event.target.value.slice(0, 16))} aria-label="DUST text" />
        </label>
        <div className="dust-mode-buttons" aria-label="Behaviour presets">
          <button type="button" aria-pressed={blend === 0} onClick={() => setBlend(0)}>Distort</button>
          <button type="button" aria-pressed={blend === 0.5} onClick={() => setBlend(0.5)}>Hybrid</button>
          <button type="button" aria-pressed={blend === 1} onClick={() => setBlend(1)}>React</button>
        </div>
        <button className="dust-palette" type="button" onClick={() => setPaletteIndex((value) => (value + 1) % PALETTES.length)}>Colour</button>
      </div>
    </div>
  );
}
