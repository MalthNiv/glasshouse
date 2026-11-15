import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  getPostsFor,
  questions,
  sharedPosts,
  type Branch,
  type Post,
  type Question,
} from '../content/posts';
import PostCard from '../components/PostCard';
import QuestionCard from '../components/QuestionCard';
import EndCard from '../components/EndCard';
import { session, useSession, type SessionState } from '../store/session';
import './Feed.css';

export interface FeedProps {
  /**
   * Called as the user scrolls, with how far through the story they are:
   * 0 at the start, 1 at the last post of the path. Based on post position,
   * not page height, because the feed grows as questions are answered.
   */
  onProgress?: (progress: number) => void;
  /** The user finished the last post and chose to continue to the observation history. */
  onFinish?: () => void;
}

type Item = { kind: 'post'; post: Post } | { kind: 'question'; question: Question };

/** Every user's path has this many posts: the shared ones plus one branch per question. */
const STORY_POSTS =
  sharedPosts.length + questions.reduce((n, q) => n + q.answers[0].posts.length, 0);

/**
 * The feed as a flat list: the shared posts, then each question followed by the
 * posts of the branch the user chose. It stops at the first unanswered question.
 */
function buildItems(answers: SessionState['answers']): Item[] {
  const items: Item[] = sharedPosts.map((post) => ({ kind: 'post', post }));
  for (const question of questions) {
    items.push({ kind: 'question', question });
    const answer = answers[question.id];
    if (!answer) break;
    for (const post of getPostsFor(question.id, answer.branch)) items.push({ kind: 'post', post });
  }
  return items;
}

const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

function Feed({ onProgress, onFinish }: FeedProps) {
  const { answers } = useSession();
  const items = useMemo(() => buildItems(answers), [answers]);
  const postIds = useMemo(
    () => items.flatMap((i) => (i.kind === 'post' ? [i.post.id] : [])),
    [items]
  );
  /** Posts that appeared because the user just answered (they ease in). */
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set());

  // Always call the latest callback / post list without re-subscribing the scroll listener.
  const cb = useRef(onProgress);
  cb.current = onProgress;
  const idsRef = useRef(postIds);
  idsRef.current = postIds;
  const measureRef = useRef<() => void>(() => {});

  const onAnswer = (question: Question, branch: Branch) => {
    session.answer(question.id, branch);
    const next = getPostsFor(question.id, branch);
    setFresh(new Set(next.map((p) => p.id)));
    // Nudge the first new post into view so the user keeps passively scrolling.
    window.setTimeout(() => {
      const el = document.getElementById(`post-${next[0].id}`);
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      if (top > window.innerHeight * 0.55) {
        window.scrollBy({
          top: top - window.innerHeight * 0.4,
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        });
      }
    }, 450);
  };

  // Honor shared links like #post-p06a
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView();
  }, []);

  // Story progress from scroll position (throttled to one update per frame).
  useEffect(() => {
    let frame = 0;
    let last = -1;

    const measure = () => {
      frame = 0;
      const anchor = window.innerHeight * 0.85;
      // The deepest post that has come into view, and how far through it the anchor is.
      let idx = -1;
      let frac = 0;
      for (let i = 0; i < idsRef.current.length; i++) {
        const el = document.getElementById(`post-${idsRef.current[i]}`);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top >= anchor) break;
        idx = i;
        frac = Math.min(1, Math.max(0, (anchor - r.top) / r.height));
      }
      let p = idx < 0 ? 0 : Math.min(1, (idx + frac) / STORY_POSTS);
      // Finished the whole story and reached the bottom: fully through.
      const atBottom = document.documentElement.scrollHeight - window.innerHeight - window.scrollY < 4;
      if (atBottom && idsRef.current.length === STORY_POSTS) p = 1;
      if (Math.abs(p - last) >= 0.002 || p === 0 || p === 1) {
        last = p;
        cb.current?.(p);
      }
    };
    measureRef.current = measure;
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // New posts appear without any scrolling, so re-measure when the list grows.
  useEffect(() => {
    measureRef.current();
  }, [postIds.length]);

  return (
    <main className="feed">
      <div className="feed-column">
        {items.map((item) =>
          item.kind === 'post' ? (
            <div key={item.post.id} className={fresh.has(item.post.id) ? 'feed-enter' : undefined}>
              <PostCard post={item.post} />
            </div>
          ) : (
            <QuestionCard
              key={`q-${item.question.id}`}
              question={item.question}
              chosen={answers[item.question.id]?.branch}
              onAnswer={(branch) => onAnswer(item.question, branch)}
            />
          )
        )}
        {/* After the last post of the path, lead into the observation history. */}
        {answers[questions[questions.length - 1].id] && onFinish && <EndCard onContinue={onFinish} />}
      </div>
    </main>
  );
}

// memo: App re-renders as the fog changes, but the feed itself shouldn't.
export default memo(Feed);
