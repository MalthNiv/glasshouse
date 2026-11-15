import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import wall from '../../assets/opening_assets/opening-wall.webp';
import './OpeningTransition.css';

/**
 * Landing -> first post transition, rebuilt in CSS from the opening GIF:
 * hold on a wall of tilted profile cards, push the camera toward the centre
 * card while the rest defocuses and sinks into the dark, then dissolve into
 * the real feed. The push ends exactly where the real first post sits, so the
 * post appears to come out of the card the camera was heading for.
 */

/** Timeline in ms, from the start of the transition. Keep in sync with the CSS keyframes. */
export const OPENING_MS = { total: 10000, reveal: 6800 };

/** Where Alex's card sits inside opening-wall.webp, as fractions of the image. */
const CARD = { cx: 0.493, cy: 0.526, w: 0.2635 };
const IMAGE_ASPECT = 16 / 9;

/** The first post, whose position the camera heads for. */
const FIRST_POST_ID = 'post-p01';

/** Warm the cache while the user is still on the landing screen. */
export function preloadOpening(extra: string[] = []) {
  for (const src of [wall, ...extra]) {
    const img = new Image();
    img.src = src;
    img.decode?.().catch(() => {});
  }
}

interface Props {
  /** The feed should start fading in now. */
  onReveal: () => void;
  /** The overlay is finished and can be removed. */
  onDone: () => void;
}

const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export default function OpeningTransition({ onReveal, onDone }: Props) {
  const [reduced] = useState(prefersReducedMotion);
  const [skipping, setSkipping] = useState(false);
  const [vars, setVars] = useState<CSSProperties | null>(null);
  const cb = useRef({ onReveal, onDone });
  cb.current = { onReveal, onDone };

  // Aim the camera: work out where the wall's card is on screen and where the
  // real first post is, then move/scale the wall so the former lands on the latter.
  useLayoutEffect(() => {
    if (reduced) return;
    window.scrollTo(0, 0);
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // The image is drawn with object-fit: cover.
    const pw = Math.max(vw, vh * IMAGE_ASPECT);
    const ph = pw / IMAGE_ASPECT;
    const ox = (vw - pw) / 2 + CARD.cx * pw;
    const oy = (vh - ph) / 2 + CARD.cy * ph;
    const cardW = CARD.w * pw;

    const post = document.getElementById(FIRST_POST_ID)?.getBoundingClientRect();
    const tx = post ? post.left + post.width / 2 : vw / 2;
    const ty = post ? post.top + Math.min(post.height, vh) / 2 : vh / 2;
    const targetW = post ? post.width : 482;

    setVars({
      '--ot-ox': `${ox}px`,
      '--ot-oy': `${oy}px`,
      '--ot-tx': `${tx - ox}px`,
      '--ot-ty': `${ty - oy}px`,
      // A decisive push-in even where the card is already close to post-sized.
      '--ot-s': Math.max(1.25, targetW / cardW),
    } as CSSProperties);
  }, [reduced]);

  // Timeline + scroll lock.
  useEffect(() => {
    if (reduced) {
      cb.current.onReveal();
      cb.current.onDone();
      return;
    }
            const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = 'hidden';

    const reveal = window.setTimeout(() => cb.current.onReveal(), OPENING_MS.reveal);
    const done = window.setTimeout(() => cb.current.onDone(), OPENING_MS.total);
    return () => {
      window.clearTimeout(reveal);
      window.clearTimeout(done);
      html.style.overflow = prevOverflow;
    };
  }, [reduced]);

  // Click or Escape skips ahead.
  useEffect(() => {
    if (reduced || skipping) return;
    const skip = () => {
      setSkipping(true);
      cb.current.onReveal();
      window.setTimeout(() => cb.current.onDone(), 500);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && skip();
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', skip);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', skip);
    };
  }, [reduced, skipping]);

  if (reduced || !vars) return null;

  return (
    <div className={`ot${skipping ? ' skip' : ''}`} style={vars} aria-hidden="true">
      <div className="ot-cam">
        <img className="ot-plate" src={wall} alt="" draggable={false} />
        {/* Same image, blurred, visible only away from the centre card: depth of field. */}
        <img className="ot-plate ot-dof" src={wall} alt="" draggable={false} />
        <div className="ot-glow" />
      </div>
      <div className="ot-vignette" />
      <div className="ot-dim" />
    </div>
  );
}
