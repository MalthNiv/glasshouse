import type { CSSProperties } from 'react';
import unfogged from '../../assets/panopticon_assets/panopticon-unfogged.png';
import './Backdrop.css';

export interface BackdropProps {
  /**
   * How foggy the scene is, from 0 (the unfogged photo, fully clear) to 1
   * (fully fogged, matching panopticon-fogged.png). Changes ease over ~2.5s,
   * so it can be animated by simply updating the prop.
   */
  density?: number;
  /** Drift speed multiplier. 1 is the default pace, 0 is still, 2 is twice as fast. */
  speed?: number;
  /** Seconds a density change takes to ease in. Default 2.5. */
  fadeSeconds?: number;
  /** CSS easing for density changes. Default 'ease'. */
  curve?: string;
  /** How far the photo is pushed in (1 = none, slightly above 1 hides the blurred edge). */
  zoom?: number;
  /** Seconds a change of zoom takes. */
  zoomSeconds?: number;
  /** How much the fog thins and thickens on its own, 0 (steady) to 1. Default 0.16. */
  breathe?: number;
  /** Seconds for one thin-to-thick swing. Default 11. */
  breatheSeconds?: number;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * Fixed full-screen background: the unfogged panopticon photo with a
 * CSS-only fog on top. Everything else renders above it.
 */
export default function Backdrop({
  density = 1,
  speed = 1,
  fadeSeconds = 2.5,
  curve = 'ease',
  zoom = 1.02,
  zoomSeconds = 10,
  breathe = 0.16,
  breatheSeconds = 11,
}: BackdropProps) {
  const style = {
    '--fog-density': clamp(density, 0, 1),
    '--fog-speed': clamp(speed, 0.05, 4),
    '--fog-breathe': clamp(breathe, 0, 1),
    '--fog-breathe-s': `${Math.max(1, breatheSeconds)}s`,
    '--fog-ease': `${Math.max(0, fadeSeconds)}s ${curve}`,
    '--bd-zoom': clamp(zoom, 1, 1.6),
    '--bd-zoom-ease': `${Math.max(0, zoomSeconds)}s ease-out`,
  } as CSSProperties;

  return (
    <div className="backdrop" aria-hidden="true" style={style}>
      <div className="backdrop-photo" style={{ backgroundImage: `url(${unfogged})` }} />
      <div className="fog">
        <div className="fog-veil" />
        <div className="fog-clouds">
          <span className="fog-blob b1" />
          <span className="fog-blob b2" />
          <span className="fog-blob b3" />
          <span className="fog-blob b4" />
          <span className="fog-blob b5" />
        </div>
        <div className="fog-wisps w1" />
        <div className="fog-wisps w2" />
        <div className="fog-grain" />
      </div>
    </div>
  );
}
