import { useEffect, useMemo, useRef } from 'react';
import './InteractiveBackground.css';

// Builds a smooth flowing wave path sampled from a sine curve. Kept as plain
// point sampling (no bezier math) so it stays easy to read and tweak.
function buildWavePath(width, height, amplitude, frequency, phase, baseline) {
  const steps = 48;
  const points = [];
  for (let i = 0; i <= steps; i += 1) {
    const x = (width / steps) * i;
    const y = baseline + Math.sin((i / steps) * Math.PI * 2 * frequency + phase) * amplitude;
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return `M${points.join(' L')}`;
}

const WAVE_WIDTH = 800;

// Each entry renders as its own <svg> layer: a handful of thin, overlapping
// lines drifting at a different speed/opacity to fake depth.
// Palette: brand violet (#8b5cf6) as the primary tint, a warm gold thread
// (#D4AF37, matching the `gold` token) as the print-industry accent, and
// soft neutral gray to keep it light rather than saturated.
const WAVE_LAYERS = [
  {
    height: 220,
    driftDuration: 46,
    opacity: 0.5,
    lines: [
      { amplitude: 16, frequency: 1.1, phase: 0, baseline: 70, color: 'rgba(139, 92, 246, 0.24)', width: 1.4 },
      { amplitude: 12, frequency: 1.4, phase: 1.4, baseline: 120, color: 'rgba(148, 155, 168, 0.26)', width: 1.1 },
      { amplitude: 10, frequency: 0.9, phase: 2.6, baseline: 165, color: 'rgba(212, 175, 55, 0.2)', width: 1 },
    ],
  },
  {
    height: 200,
    driftDuration: 62,
    opacity: 0.35,
    lines: [
      { amplitude: 14, frequency: 0.8, phase: 0.6, baseline: 60, color: 'rgba(167, 139, 250, 0.24)', width: 1 },
      { amplitude: 9, frequency: 1.6, phase: 2.1, baseline: 110, color: 'rgba(212, 175, 55, 0.16)', width: 1 },
    ],
  },
  {
    height: 180,
    driftDuration: 34,
    opacity: 0.22,
    lines: [
      { amplitude: 8, frequency: 1.3, phase: 3.1, baseline: 90, color: 'rgba(139, 92, 246, 0.18)', width: 0.9 },
      { amplitude: 11, frequency: 0.7, phase: 1.1, baseline: 140, color: 'rgba(148, 155, 168, 0.2)', width: 0.9 },
    ],
  },
];

function WaveLayer({ layer, top }) {
  const paths = useMemo(
    () =>
      layer.lines.map((line) => ({
        ...line,
        d: buildWavePath(WAVE_WIDTH, layer.height, line.amplitude, line.frequency, line.phase, line.baseline),
      })),
    [layer]
  );

  const svgMarkup = (
    <svg viewBox={`0 0 ${WAVE_WIDTH} ${layer.height}`} preserveAspectRatio="none">
      {paths.map((line, i) => (
        <path key={i} d={line.d} fill="none" stroke={line.color} strokeWidth={line.width} strokeLinecap="round" />
      ))}
    </svg>
  );

  return (
    <div
      className="ib-wave-layer"
      style={{ top, height: layer.height, '--ib-wave-opacity': layer.opacity }}
    >
      <div className="ib-wave-track" style={{ '--ib-drift-duration': `${layer.driftDuration}s` }}>
        {svgMarkup}
        {svgMarkup}
      </div>
    </div>
  );
}

// Small deterministic pseudo-random generator so the dot field stays stable
// across re-renders instead of jumping around on every render.
function seededRandom(seed) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

function useDots(count) {
  return useMemo(() => {
    const rand = seededRandom(42);
    return Array.from({ length: count }, (_, i) => {
      const size = 2 + rand() * 2.5;
      const violet = i % 2 === 0;
      return {
        id: i,
        top: `${(rand() * 100).toFixed(1)}%`,
        left: `${(rand() * 100).toFixed(1)}%`,
        size,
        opacity: 0.25 + rand() * 0.35,
        color: violet ? 'rgba(139, 92, 246, 0.5)' : 'rgba(212, 175, 55, 0.45)',
        drift: i % 3 === 0,
        duration: 7 + rand() * 8,
      };
    });
  }, [count]);
}

export default function InteractiveBackground() {
  const rootRef = useRef(null);
  const rafRef = useRef(null);
  const dots = useDots(30);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return undefined;

    function applyOffset(mx, my) {
      root.style.setProperty('--ib-mx', mx.toFixed(3));
      root.style.setProperty('--ib-my', my.toFixed(3));
    }

    function handleMouseMove(e) {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const rect = root.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const relX = (e.clientX - rect.left) / rect.width - 0.5;
        const relY = (e.clientY - rect.top) / rect.height - 0.5;
        applyOffset(Math.max(-0.5, Math.min(0.5, relX)), Math.max(-0.5, Math.min(0.5, relY)));
      });
    }

    function handleLeave() {
      applyOffset(0, 0);
    }

    function handleMouseOut(e) {
      if (!e.relatedTarget) handleLeave();
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseout', handleMouseOut);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseOut);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div ref={rootRef} className="ib-root" aria-hidden="true">
      <div className="ib-blob ib-blob-violet">
        <div className="ib-blob-inner" />
      </div>
      <div className="ib-blob ib-blob-slate">
        <div className="ib-blob-inner" />
      </div>
      <div className="ib-blob ib-blob-gold">
        <div className="ib-blob-inner" />
      </div>

      <div className="ib-waves">
        {WAVE_LAYERS.map((layer, i) => (
          <WaveLayer key={i} layer={layer} top={`${18 + i * 22}%`} />
        ))}
      </div>

      <div className="ib-dots">
        {dots.map((dot) => (
          <span
            key={dot.id}
            className={`ib-dot${dot.drift ? ' ib-dot-drift' : ''}`}
            style={{
              top: dot.top,
              left: dot.left,
              width: dot.size,
              height: dot.size,
              opacity: dot.opacity,
              '--ib-dot-color': dot.color,
              '--ib-dot-duration': `${dot.duration}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
