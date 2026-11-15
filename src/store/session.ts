// The user's path through the story: which branch they chose at each question.
// Kept in memory for the current page load only, so a refresh starts everything over.
// It is never persisted and never touches the network.
// The feed derives which posts to show from these answers, and the final reveal reads them back.
import { useSyncExternalStore } from 'react';
import type { Branch, QuestionId } from '../content/posts';

export interface QuestionAnswer {
  branch: Branch;
  answeredAt: number;
}

export interface SessionState {
  answers: Partial<Record<QuestionId, QuestionAnswer>>;
  /** When each question first scrolled into view (ms since epoch). */
  shownAt: Partial<Record<QuestionId, number>>;
}

const EMPTY: SessionState = { answers: {}, shownAt: {} };

// Earlier versions saved the path to localStorage. Remove that leftover data once,
// so an old session can't come back.
try {
  localStorage.removeItem('glasshouse.session.v1');
} catch {
  /* storage unavailable: nothing to clean up */
}

let state: SessionState = EMPTY;
const listeners = new Set<() => void>();

function commit(next: SessionState) {
  state = next;
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export const session = {
  /** Lock in a branch. Ignored if the question was already answered: shown posts never change. */
  answer: (id: QuestionId, branch: Branch) => {
    if (state.answers[id]) return;
    commit({ ...state, answers: { ...state.answers, [id]: { branch, answeredAt: Date.now() } } });
  },
  recordQuestionShown: (id: QuestionId) => {
    if (state.shownAt[id]) return;
    commit({ ...state, shownAt: { ...state.shownAt, [id]: Date.now() } });
  },
  getState: (): SessionState => state,
  clear: () => commit(EMPTY),
};

export function useSession(): SessionState {
  return useSyncExternalStore(subscribe, () => state);
}
