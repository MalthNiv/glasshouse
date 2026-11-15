import { useEffect, useRef, useState } from 'react';
import type { Post } from '../content/posts';
import { attention, interactions, usePostInteraction } from '../store/interactions';
import avatar from '../../assets/post_assets/alex-portrait.png';
import './PostCard.css';

import likeIcon from '../../assets/post_assets/Like.png';
import likeFilledIcon from '../../assets/post_assets/Like-filled.png';
import commentIcon from '../../assets/post_assets/Comment.png';
import shareIcon from '../../assets/post_assets/Share.png';
import saveIcon from '../../assets/post_assets/Save.png';
import saveFilledIcon from '../../assets/post_assets/Save-filled.png';

const Icon = ({ src }: { src: string }) => (
  <img className="pc-icon" src={src} alt="" width={44} height={44} draggable={false} />
);

export interface PostCardProps {
  post: Post;
  /** Display name and handle default to Alex. */
  author?: { name: string; handle: string };
}

const VIEW_THRESHOLD = 0.5;
const VIEW_DWELL_MS = 1000;

export default function PostCard({
  post,
  author = { name: 'Alex', handle: '@alex.morgan19' },
}: PostCardProps) {
  const { liked, saved, likedComments = [] } = usePostInteraction(post.id);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const ref = useRef<HTMLElement>(null);
  const toastTimer = useRef<number>();

  // Count a view once per mount after the card is >=50% visible for 1 second.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    let timer: number | undefined;
    let counted = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        window.clearTimeout(timer);
        if (entry.isIntersecting && !counted) {
          timer = window.setTimeout(() => {
            counted = true;
            interactions.recordView(post.id);
            io.disconnect();
          }, VIEW_DWELL_MS);
        }
      },
      { threshold: VIEW_THRESHOLD }
    );
    io.observe(el);
    return () => {
      window.clearTimeout(timer);
      io.disconnect();
    };
  }, [post.id]);

  // Time on screen: the post sitting in the middle band of the viewport is the one being looked at.
  // Paused while the tab is hidden. A global flush event lets the end of the feed bank any running time.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    let since: number | null = null;
    let inBand = false;
    const flush = () => {
      if (since !== null) interactions.addDwell(post.id, performance.now() - since);
      since = null;
    };
    const resume = () => {
      if (inBand && !attention.questionInView && document.visibilityState === 'visible' && since === null) {
        since = performance.now();
      }
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        inBand = entry.isIntersecting;
        if (inBand) resume();
        else flush();
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    );
    const onVisibility = () => (document.visibilityState === 'hidden' ? flush() : resume());
    const onFlush = () => {
      flush();
      resume();
    };
    // A question coming on screen pauses the clock; it resumes when the question leaves.
    const unsubscribe = attention.subscribe(() => (attention.questionInView ? flush() : resume()));
    io.observe(el);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('glasshouse:flush', onFlush);
    return () => {
      io.disconnect();
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('glasshouse:flush', onFlush);
      flush();
    };
  }, [post.id]);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const flash = (msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2000);
  };

  const toggleComments = () => {
    if (!open) interactions.recordCommentsOpened(post.id);
    setOpen(!open);
  };

  // Front-end only: nothing is shared or copied, just the toast.
  const share = () => {
    interactions.recordShare(post.id); // local tally only
    flash('Link copied!');
  };

  const n = post.comments.length;
  const commentsId = `comments-${post.id}`;

  return (
    <article className="post-card" id={`post-${post.id}`} ref={ref}>
      <header className="pc-header">
        <img className="pc-avatar" src={avatar} alt="" />
        <div className="pc-id">
          <span className="pc-name">{author.name}</span>
          <span className="pc-handle">{author.handle}</span>
        </div>
        <span className="pc-more" aria-hidden="true">•••</span>
      </header>

      <img className="pc-photo" src={post.image} alt={post.alt} loading="lazy" decoding="async" />

      <div className="pc-actions">
        <button
          type="button"
          className={`pc-btn pc-like${liked ? ' on' : ''}`}
          aria-pressed={liked}
          aria-label={liked ? 'Unlike' : 'Like'}
          onClick={() => interactions.toggleLike(post.id)}
        >
          <Icon src={liked ? likeFilledIcon : likeIcon} />
        </button>
        <button
          type="button"
          className="pc-btn"
          aria-expanded={open}
          aria-controls={commentsId}
          aria-label={open ? 'Hide comments' : 'Show comments'}
          onClick={toggleComments}
        >
          <Icon src={commentIcon} />
        </button>
        <button type="button" className="pc-btn" aria-label="Share" onClick={share}>
          <Icon src={shareIcon} />
        </button>
        <button
          type="button"
          className={`pc-btn pc-save${saved ? ' on' : ''}`}
          aria-pressed={saved}
          aria-label={saved ? 'Remove from saved' : 'Save'}
          onClick={() => interactions.toggleSave(post.id)}
        >
          <Icon src={saved ? saveFilledIcon : saveIcon} />
        </button>
      </div>

      <div className="pc-body">
        <p className="pc-line">
          <b>alex</b> {post.caption}
        </p>

        {n > 0 && !open && (
          <button type="button" className="pc-view-comments" onClick={toggleComments}>
            View {n === 1 ? '1 comment' : `all ${n} comments`}
          </button>
        )}

        <div id={commentsId} hidden={!open}>
          {post.comments.map((cm, i) => (
            <div className="pc-comment" key={i}>
              <p className="pc-line">
                <b>{cm.user}</b> {cm.text}
              </p>
              <button
                type="button"
                className="pc-comment-like"
                aria-pressed={likedComments.includes(i)}
                aria-label={`${likedComments.includes(i) ? 'Unlike' : 'Like'} comment by ${cm.user}`}
                onClick={() => interactions.toggleCommentLike(post.id, i)}
              >
                <img
                  src={likedComments.includes(i) ? likeFilledIcon : likeIcon}
                  alt=""
                  width={24}
                  height={24}
                  draggable={false}
                />
              </button>
            </div>
          ))}
        </div>

        <time className="pc-time">{post.timestamp}</time>
      </div>

      {toast && (
        <div className="pc-toast" role="status">
          {toast}
        </div>
      )}
    </article>
  );
}
