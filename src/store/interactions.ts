// Interaction history (likes, saves, comment likes, views...) for the final panopticon reveal.
// Kept in memory for the current page load only, so a refresh starts with a clean slate.
// It is never persisted and never touches the network.
import { useSyncExternalStore } from 'react';

export interface PostInteraction {
  liked: boolean;
  saved: boolean;
  /** Number of times the user expanded this post's comments. */
  commentsOpened: number;
  /** Number of times the post was actually seen (>=50% visible for 1s). */
  views: number;
  shares: number;
  /** Total time (ms) this post sat in the middle of the screen while the tab was visible. */
  dwellMs: number;
  /** Indexes (into the post's comments) of comments the user liked. */
  likedComments: number[];
  likedAt?: number;
  savedAt?: number;
  firstViewedAt?: number;
}

type State = Record<string, PostInteraction>;

const EMPTY: PostInteraction = { liked: false, saved: false, commentsOpened: 0, views: 0, shares: 0, dwellMs: 0, likedComments: [] };

// Earlier versions saved interactions to localStorage. Remove that leftover data once,
// so likes from old sessions can't come back.
try {
  localStorage.removeItem('glasshouse.interactions.v1');
} catch {
  /* storage unavailable: nothing to clean up */
}

let state: State = {};
const listeners = new Set<() => void>();

function commit(next: State) {
  state = next;
  listeners.forEach((l) => l());
}

function update(id: string, fn: (p: PostInteraction) => PostInteraction) {
  commit({ ...state, [id]: fn(state[id] ?? EMPTY) });
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export const interactions = {
  toggleLike: (id: string) =>
    update(id, (p) => ({ ...p, liked: !p.liked, likedAt: p.liked ? undefined : Date.now() })),
  toggleSave: (id: string) =>
    update(id, (p) => ({ ...p, saved: !p.saved, savedAt: p.saved ? undefined : Date.now() })),
  recordCommentsOpened: (id: string) =>
    update(id, (p) => ({ ...p, commentsOpened: p.commentsOpened + 1 })),
  recordView: (id: string) =>
    update(id, (p) => ({ ...p, views: p.views + 1, firstViewedAt: p.firstViewedAt ?? Date.now() })),
  toggleCommentLike: (id: string, index: number) =>
    update(id, (p) => {
      const cur = p.likedComments ?? [];
      return {
        ...p,
        likedComments: cur.includes(index) ? cur.filter((i) => i !== index) : [...cur, index],
      };
    }),
  addDwell: (id: string, ms: number) => {
    if (ms < 50) return; // ignore flicks past a post
    update(id, (p) => ({ ...p, dwellMs: (p.dwellMs ?? 0) + ms }));
  },
  recordShare: (id: string) => update(id, (p) => ({ ...p, shares: p.shares + 1 })),
  /** Everything recorded so far, keyed by post ID (for the reveal). */
  getAll: (): State => state,
  clear: () => commit({}),
};

/**
 * Which questions are currently on screen. While one is, time on screen is the question's, so
 * posts stop counting time-on-screen. (Without this, deciding on a question at the bottom of the
 * page would be credited to the post above it.)
 */
const questionsInView = new Set<string>();
const attentionListeners = new Set<() => void>();
export const attention = {
  get questionInView() {
    return questionsInView.size > 0;
  },
  setQuestionInView(id: string, inView: boolean) {
    const had = questionsInView.size > 0;
    if (inView) questionsInView.add(id);
    else questionsInView.delete(id);
    if (had !== questionsInView.size > 0) attentionListeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    attentionListeners.add(l);
    return () => {
      attentionListeners.delete(l);
    };
  },
};

/** Subscribe a component to one post's interaction state. */
export function usePostInteraction(id: string): PostInteraction {
  return useSyncExternalStore(subscribe, () => state[id] ?? EMPTY);
}
