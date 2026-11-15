import { useEffect, useRef, useState } from 'react';
import './EndCard.css';

/** How long the user has been looking at "You're all caught up" before the button appears (ms). */
const BUTTON_DELAY_MS = 1500;

/**
 * The end of the feed, the way Instagram ends one: "You're all caught up". A moment after the
 * user has actually reached it, a button appears that leads into the observation history.
 */
export default function EndCard({ onContinue }: { onContinue: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  const [showButton, setShowButton] = useState(false);

  // The delay starts when the card is on screen, not when it is mounted below the fold.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.6,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || showButton) return;
    const t = window.setTimeout(() => setShowButton(true), BUTTON_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [inView, showButton]);

  return (
    <section className="end" ref={ref} aria-label="End of Alex's posts">
      <svg className="end-check" viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M14.5 25.2l7 7 12-14.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p className="end-line">You’re all caught up</p>
      {/* The space is reserved, so nothing jumps when the button arrives. */}
      <div className="end-slot" aria-live="polite">
        {showButton && (
          <button type="button" className="end-btn" onClick={onContinue}>
            Or are you?
          </button>
        )}
      </div>
    </section>
  );
}
