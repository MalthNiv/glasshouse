import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { buildRecord, formatDuration, LINGER_MIN_MS } from '../engine/record';
import { buildUnseen } from '../engine/unseen';
import { interactions } from '../store/interactions';
import { session } from '../store/session';
import './Record.css';

/** How long after the closing line starts to fade in before the scene moves on (ms). */
const CLOSING_HOLD_MS = 3000;

const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const quote = (s: string) => `“${s}”`;

/** A section whose lines arrive one after another: `i` is its place in the sequence. */
function Block({ i, children }: { i: number; children: ReactNode }) {
  return (
    <section className="rc-block rc-reveal" style={{ '--i': i } as CSSProperties}>
      {children}
    </section>
  );
}

/**
 * The observation history: first, briefly, how the user read Alex; then everything the
 * app noticed. Every line comes from something that was actually recorded.
 */
export default function Record({ onComplete }: { onComplete?: () => void }) {
  // Read once: the feed is gone, so nothing changes while this screen is open.
  const data = useMemo(() => buildRecord(interactions.getAll(), session.getState()), []);
  const pathLength = data.path.length;

  // Warm the cache for the scene that follows, so its windows are ready when it appears.
  useEffect(() => {
    for (const post of buildUnseen(session.getState())) {
      const img = new Image();
      img.src = post.image;
      img.decode?.().catch(() => {});
    }
  }, []);

  // The page's own lines arrive one after another. Note when the last one has finished.
  const columnRef = useRef<HTMLDivElement>(null);
  const [revealDone, setRevealDone] = useState(prefersReducedMotion);
  useEffect(() => {
    const column = columnRef.current;
    if (revealDone || !column) return;
    const total = column.querySelectorAll('.rc-reveal').length;
    let finished = 0;
    const onEnd = (e: AnimationEvent) => {
      if ((e.target as HTMLElement).classList.contains('rc-reveal') && ++finished >= total) {
        setRevealDone(true);
      }
    };
    column.addEventListener('animationend', onEnd);
    return () => column.removeEventListener('animationend', onEnd);
  }, [revealDone]);

  // The closing line fades in when the user scrolls to it (and the page has finished appearing),
  // not on a timer: otherwise it would already be there by the time they got to it. Once it has
  // started to appear and stayed in view for a moment, move on.
  const closingRef = useRef<HTMLParagraphElement>(null);
  const [closingInView, setClosingInView] = useState(false);
  const [closingSeen, setClosingSeen] = useState(false);
  useEffect(() => {
    const el = closingRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setClosingInView(entry.isIntersecting), {
      threshold: 0.9,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (closingInView && revealDone) setClosingSeen(true);
  }, [closingInView, revealDone]);
  useEffect(() => {
    if (!closingSeen || !closingInView || !onComplete) return;
    const t = window.setTimeout(onComplete, CLOSING_HOLD_MS);
    return () => window.clearTimeout(t);
  }, [closingSeen, closingInView, onComplete]);

  // Position of each section in the reveal sequence (computed during this render only).
  let step = 0;
  const next = () => step++;

  const likedSentence = (() => {
    const p = data.likedPosts.length;
    const c = data.likedComments.length;
    if (!p && !c) return <>You didn’t like any posts or comments.</>;
    const parts: ReactNode[] = [];
    if (p) parts.push(<b key="p">{plural(p, 'post')}</b>);
    if (c) parts.push(<b key="c">{plural(c, 'comment')}</b>);
    return (
      <>
        You liked {parts[0]}
        {parts[1] && <> and {parts[1]}</>}.
      </>
    );
  })();

  const decisionTotal = data.decisions.reduce((n, d) => n + d.ms, 0);

  return (
    <main className="record">
      <div className="record-column" ref={columnRef}>
        <header className="rc-head rc-reveal" style={{ '--i': next() } as CSSProperties}>
          <p className="rc-eyebrow">GLASSHOUSE</p>
          <h1 className="rc-title">What you noticed about Alex</h1>
        </header>

        <Block i={next()}>
          {data.readings.map((r) => (
            <div className="rc-reading" key={r.question.id}>
              <span className="rc-label">{r.question.topic}</span>
              <span className="rc-answer">{r.label}</span>
            </div>
          ))}
        </Block>

        <h2 className="rc-title rc-title-2 rc-reveal" style={{ '--i': next() } as CSSProperties}>
          What we noticed
        </h2>

        <Block i={next()}>
          <p className="rc-label">Likes</p>
          <p className="rc-stat">{likedSentence}</p>
          {data.likedPosts.length > 0 && (
            <ul className="rc-list">
              {data.likedPosts.map((p) => (
                <li key={p.id}>
                  {quote(p.caption)} <span className="rc-muted">{p.timestamp}</span>
                </li>
              ))}
            </ul>
          )}
        </Block>

        <Block i={next()}>
          <p className="rc-label">Where you lingered</p>
          <p className="rc-stat">
            You looked at <b>{data.viewed}</b> of <b>{pathLength}</b> posts.
          </p>
          {data.lingered.length > 0 ? (
            <ul className="rc-list rc-rows">
              {data.lingered.map(({ post, ms }) => (
                <li key={post.id}>
                  <span>
                    {quote(post.caption)} <span className="rc-muted">{post.timestamp}</span>
                  </span>
                  <b className="rc-time">{formatDuration(ms)}</b>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rc-stat">
              You didn’t stay on any one post for more than {LINGER_MIN_MS / 1000} seconds.
            </p>
          )}
        </Block>

        <Block i={next()}>
          <p className="rc-label">Comments</p>
          <p className="rc-stat">
            {data.commentsOpenedOn > 0 ? (
              <>
                You opened the comments on <b>{data.commentsOpenedOn}</b> of <b>{pathLength}</b>{' '}
                posts.
              </>
            ) : (
              <>You didn’t open any comments.</>
            )}
          </p>
          {data.likedComments.length > 0 && (
            <>
              <p className="rc-sublabel">Comments you liked</p>
              <ul className="rc-list">
                {data.likedComments.map((c, i) => (
                  <li key={`${c.post.id}-${i}`}>
                    <b>{c.user}</b> {c.text}
                    <span className="rc-muted rc-on">on {quote(c.post.caption)}</span>
                  </li>
                ))}
              </ul>
              <p className="rc-sublabel">Whose comments</p>
              <p className="rc-stat">
                {data.commenters.map((c, i) => (
                  <span key={c.user}>
                    {i > 0 && <span className="rc-muted"> · </span>}
                    <b>{c.user}</b> <span className="rc-muted">×{c.count}</span>
                  </span>
                ))}
              </p>
            </>
          )}
        </Block>

        {data.decisions.length > 0 && (
          <Block i={next()}>
            <p className="rc-label">How long you took to decide</p>
            <ul className="rc-list rc-rows">
              {data.decisions.map(({ question, ms }) => (
                <li key={question.id}>
                  <span>{question.topic}</span>
                  <b className="rc-time">{formatDuration(ms)}</b>
                </li>
              ))}
            </ul>
            <p className="rc-stat">
              In total, <b>{formatDuration(decisionTotal)}</b> across {data.decisions.length}{' '}
              questions.
            </p>
          </Block>
        )}

        {(data.saved.length > 0 || data.shares > 0) && (
          <Block i={next()}>
            <p className="rc-label">Saved and shared</p>
            {data.saved.length > 0 && (
              <>
                <p className="rc-stat">
                  You saved <b>{plural(data.saved.length, 'post')}</b>.
                </p>
                <ul className="rc-list">
                  {data.saved.map((p) => (
                    <li key={p.id}>
                      {quote(p.caption)} <span className="rc-muted">{p.timestamp}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {data.shares > 0 && (
              <p className="rc-stat">
                You tapped share <b>{data.shares === 1 ? 'once' : `${data.shares} times`}</b>.
              </p>
            )}
          </Block>
        )}

        {data.barelyTouched && (
          <Block i={next()}>
            <p className="rc-stat">You barely touched anything. That was recorded too.</p>
          </Block>
        )}

        {/* The closing beat: it fades in once the user has scrolled to it. */}
        <section className="rc-closing">
          <p
            className={`rc-closing-line${closingSeen ? ' seen' : ''}`}
            ref={closingRef}
          >
            Did you realize that?
          </p>
        </section>
      </div>
    </main>
  );
}
