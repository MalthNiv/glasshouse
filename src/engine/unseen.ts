// Which posts were withheld from this user: every post of the branches they did not choose.
// Pure and UI-free. Each question has two unseen branches of three posts, so a finished
// path withholds 18 posts. They are returned in story order.
import { questions, type Post } from '../content/posts';
import type { SessionState } from '../store/session';

export function buildUnseen(session: SessionState): Post[] {
  const unseen: Post[] = [];
  for (const question of questions) {
    const chosen = session.answers[question.id]?.branch;
    for (const answer of question.answers) {
      if (answer.branch !== chosen) unseen.push(...answer.posts);
    }
  }
  return unseen;
}

/**
 * The two unseen posts the user is invited to interact with: one from the first question's
 * unseen branches and one from the last question's, so they come from opposite ends of the story.
 * In each group, the post with the most comments wins (there is more to read and like); a tie goes
 * to the earlier post.
 */
export function pickFeatured(unseen: Post[]): Post[] {
  const best = (id: string) =>
    unseen
      .filter((p) => p.questionId === id)
      .reduce<Post | undefined>((a, p) => (!a || p.comments.length > a.comments.length ? p : a), undefined);
  const picked = [best('q1'), best('q3')].filter((p): p is Post => !!p);
  for (const p of unseen) if (picked.length < 2 && !picked.includes(p)) picked.push(p);
  return picked.slice(0, 2);
}
