// Turns what was recorded during the session into the observation history.
// Pure and UI-free: (interactions, answers) -> data. Every field is a fact that was actually
// recorded; nothing is inferred or invented, and nothing characterizes the user.
import { getPostsFor, questions, sharedPosts, type Post, type Question } from '../content/posts';
import type { PostInteraction } from '../store/interactions';
import type { SessionState } from '../store/session';

/** A post must hold the middle of the screen at least this long to count as "lingered on". */
export const LINGER_MIN_MS = 3000;
/** How many lingered-on posts to list. */
const LINGER_TOP = 3;

export interface RecordData {
  /** How the user read Alex at each question. */
  readings: { question: Question; label: string }[];
  /** Posts the user was shown, in order. */
  path: Post[];
  /** Posts that were actually seen (visible long enough to count as a view). */
  viewed: number;
  likedPosts: Post[];
  likedComments: { post: Post; user: string; text: string }[];
  /** Whose comments were liked, most first. */
  commenters: { user: string; count: number }[];
  /** On how many posts the user opened the comments. */
  commentsOpenedOn: number;
  /** The posts held longest on screen, longest first. */
  lingered: { post: Post; ms: number }[];
  saved: Post[];
  shares: number;
  /** Time between a question coming into view and the answer, per question. */
  decisions: { question: Question; ms: number }[];
  /** True when the user did almost nothing the app could observe. */
  barelyTouched: boolean;
}

export function buildRecord(
  all: Record<string, PostInteraction | undefined>,
  session: SessionState
): RecordData {
  const readings: RecordData['readings'] = [];
  const decisions: RecordData['decisions'] = [];
  const path: Post[] = [...sharedPosts];

  for (const question of questions) {
    const answer = session.answers[question.id];
    if (!answer) continue;
    const label = question.answers.find((a) => a.branch === answer.branch)?.label ?? '';
    readings.push({ question, label });
    path.push(...getPostsFor(question.id, answer.branch));
    const shownAt = session.shownAt[question.id];
    if (shownAt !== undefined && answer.answeredAt >= shownAt) {
      decisions.push({ question, ms: answer.answeredAt - shownAt });
    }
  }

  const likedPosts: Post[] = [];
  const likedComments: RecordData['likedComments'] = [];
  const saved: Post[] = [];
  const lingered: RecordData['lingered'] = [];
  let viewed = 0;
  let commentsOpenedOn = 0;
  let shares = 0;

  for (const post of path) {
    const it = all[post.id];
    if (!it) continue;
    if (it.views > 0) viewed++;
    if (it.liked) likedPosts.push(post);
    if (it.saved) saved.push(post);
    if (it.commentsOpened > 0) commentsOpenedOn++;
    shares += it.shares;
    for (const i of [...(it.likedComments ?? [])].sort((a, b) => a - b)) {
      const c = post.comments[i];
      if (c) likedComments.push({ post, user: c.user, text: c.text });
    }
    if ((it.dwellMs ?? 0) >= LINGER_MIN_MS) lingered.push({ post, ms: it.dwellMs });
  }
  lingered.sort((a, b) => b.ms - a.ms);

  const counts = new Map<string, number>();
  for (const c of likedComments) counts.set(c.user, (counts.get(c.user) ?? 0) + 1);
  const commenters = [...counts.entries()]
    .map(([user, count]) => ({ user, count }))
    .sort((a, b) => b.count - a.count || a.user.localeCompare(b.user));

  const barelyTouched =
    likedPosts.length === 0 &&
    likedComments.length === 0 &&
    saved.length === 0 &&
    shares === 0 &&
    commentsOpenedOn === 0 &&
    lingered.length === 0;

  return {
    readings,
    path,
    viewed,
    likedPosts,
    likedComments,
    commenters,
    commentsOpenedOn,
    lingered: lingered.slice(0, LINGER_TOP),
    saved,
    shares,
    decisions,
    barelyTouched,
  };
}

/** 4.2s, 38s, 1m 12s */
export function formatDuration(ms: number): string {
  const s = ms / 1000;
  if (s < 10) return `${s.toFixed(1)}s`;
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${Math.round(s - m * 60)}s`;
}
