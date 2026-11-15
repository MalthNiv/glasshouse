import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import PostCard from '../components/PostCard';
import type { Post } from '../content/posts';
import { buildUnseen, pickFeatured } from '../engine/unseen';
import { session } from '../store/session';
import './Panopticon.css';

/**
 * The unseen, in five parts:
 *   reveal  the building, clear, with nothing in it yet
 *   one     an unseen post comes in on the left, in its own card the user can interact with;
 *           a message on the right and a button to continue
 *   two     the same, mirrored: a post from the right, the message on the left
 *   rows    the rest of the unseen posts in two rows moving in opposite directions, then
 *           "Was the glass ever clear?" / "You decide."
 *   finale  the glass fogs up again, and the experience ends on "Glasshouse" and a thank you
 */
type Stage = 'reveal' | 'one' | 'two' | 'rows' | 'finale';

const REVEAL_MS = 6500; // the building is clear; the first card comes in after this
const EXIT_MS = 900; // a featured card fades out this long after "Continue"
const BUTTON_MS = 2200; // "Continue" appears this long after a card comes in
const QUESTION_MS = 5000; // in the rows: the question appears this long after they begin
const ANSWER_MS = 3200; // ... and "You decide." this long after the question
const FOG_UP_MS = 6500; // ... and the fog comes back this long after that (time to take in "You decide.")
const FINALE_MS = 4500; // ... and the closing title follows this long after the fog starts

/** What is said beside each featured post. Edit the copy here. */
const COPY = [
  {
    title: 'This one was hidden from you.',
    body: 'It is part of the same story you just read. It was never shown to you. Look closer: like it, open the comments.',
  },
  {
    title: 'And this one.',
    body: 'Another path through Alex’s story would have shown it to you. Take your time.',
  },
];

const STAGES: Stage[] = ['reveal', 'one', 'two', 'rows', 'finale'];
// ?dev=panopticon&stage=rows jumps straight to a part, for testing.
const startStage = (): Stage => {
  const s = new URLSearchParams(window.location.search).get('stage') as Stage | null;
  return s && STAGES.includes(s) ? s : 'reveal';
};

export default function Panopticon({ onFog }: { onFog?: () => void }) {
  const { featured, rest } = useMemo(() => {
    const unseen = buildUnseen(session.getState());
    const featured = pickFeatured(unseen);
    return { featured, rest: unseen.filter((p) => !featured.includes(p)) };
  }, []);

  const [stage, setStage] = useState<Stage>(startStage);
  const [leaving, setLeaving] = useState(false);
  const [beat, setBeat] = useState(0); // in the rows: 1 the question, 2 "You decide.", 3 fogging up

  const fogRef = useRef(onFog);
  fogRef.current = onFog;

  // The scene fills the screen; only a featured card scrolls (on small screens).
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prev;
    };
  }, []);

  // reveal -> the first card
  useEffect(() => {
    if (stage !== 'reveal') return;
    const t = window.setTimeout(() => setStage('one'), REVEAL_MS);
    return () => window.clearTimeout(t);
  }, [stage]);

  // The rows' timeline: question, answer, fog back, finale.
  useEffect(() => {
    if (stage !== 'rows') return;
    setBeat(0);
    const a = QUESTION_MS;
    const b = a + ANSWER_MS;
    const c = b + FOG_UP_MS;
    const ids = [
      window.setTimeout(() => setBeat(1), a),
      window.setTimeout(() => setBeat(2), b),
      window.setTimeout(() => {
        setBeat(3);
        fogRef.current?.();
      }, c),
      window.setTimeout(() => setStage('finale'), c + FINALE_MS),
    ];
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [stage]);

  // "Continue": fade the card out, then bring in the next part.
  const goTo = (next: Stage) => {
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(() => {
      setLeaving(false);
      setStage(next);
    }, EXIT_MS);
  };

  return (
    <main className={`pano stage-${stage}`} aria-label="Posts you never saw">
      <div className="pano-vignette" aria-hidden="true" />
      <div className="pano-flash" aria-hidden="true" />

      {stage === 'one' && (
        <Featured
          key="one"
          post={featured[0]}
          side="left"
          copy={COPY[0]}
          leaving={leaving}
          onContinue={() => goTo('two')}
        />
      )}
      {stage === 'two' && (
        <Featured
          key="two"
          post={featured[1]}
          side="right"
          copy={COPY[1]}
          leaving={leaving}
          onContinue={() => goTo('rows')}
        />
      )}

      {stage === 'rows' && (
        <>
          <div className={`pano-rows${beat >= 3 ? ' fading' : ''}`}>
            <Row posts={rest.filter((_, i) => i % 2 === 0)} className="pr-top" />
            <Row posts={rest.filter((_, i) => i % 2 === 1)} className="pr-bottom" />
          </div>
          <div className={`pano-text${beat >= 3 ? ' fading' : ''}`} aria-live="polite">
            <div className="pano-text-inner">
              {beat >= 1 && (
                <p className={`pano-q${beat >= 2 ? ' dim' : ''}`}>Was the glass ever clear?</p>
              )}
              {beat >= 2 && <p className="pano-a">You decide.</p>}
            </div>
          </div>
        </>
      )}

      {stage === 'finale' && (
        <div className="pano-finale">
          <h1 className="title" aria-label="Glasshouse">
            <span className="t-blur" aria-hidden="true">Glasshouse</span>
            <span className="t-sharp" aria-hidden="true">Glasshouse</span>
          </h1>
          <p className="pano-thanks">Thank you for visiting</p>
        </div>
      )}
    </main>
  );
}

/** One unseen post in its own rounded card, with a message and a button to continue beside it. */
function Featured({
  post,
  side,
  copy,
  leaving,
  onContinue,
}: {
  post: Post;
  side: 'left' | 'right';
  copy: { title: string; body: string };
  leaving: boolean;
  onContinue: () => void;
}) {
  const [showButton, setShowButton] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setShowButton(true), BUTTON_MS);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className={`pf pf-${side}${leaving ? ' leaving' : ''}`}>
      <div className="pf-inner">
        <div className="pf-card">
          <PostCard post={post} />
        </div>
        <div className="pf-msg">
          <p className="pf-tag">{post.timestamp} · you never saw this</p>
          <h2 className="pf-title">{copy.title}</h2>
          <p className="pf-body">{copy.body}</p>
          {/* The space is reserved, so nothing jumps when the button arrives. */}
          <div className="pf-slot" aria-live="polite">
            {showButton && (
              <button type="button" className="pf-btn" onClick={onContinue}>
                Continue
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * A row of posts sliding sideways, forever. The set is repeated three times, so the row never has
 * a gap at the end of its loop, and the track slides by exactly one set. The second row runs the
 * same animation backwards.
 */
function Row({ posts, className }: { posts: Post[]; className: string }) {
  return (
    <div className={`pr ${className}`} style={{ '--n': posts.length } as CSSProperties}>
      <div className="pr-track">
        {[0, 1, 2].flatMap((copy) =>
          posts.map((post) => (
            <article className="pr-win" key={`${copy}-${post.id}`} aria-hidden={copy > 0}>
              <img src={post.image} alt={copy === 0 ? post.alt : ''} draggable={false} />
              <div className="pr-meta">
                <p className="pr-tag">{post.timestamp} · you never saw this</p>
                <p className="pr-cap">{post.caption}</p>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
