import { questions, sharedPosts } from '../content/posts';
import PostCard from './PostCard';

/** Dev-only page showing every post, grouped by question and branch. Open with ?dev=posts */
export default function PostPreview() {
  return (
    <main className="dev-posts">
      <h2>Shared · posts 01–05</h2>
      {sharedPosts.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
      {questions.map((q) =>
        q.answers.map((a) => (
          <section key={`${q.id}${a.branch}`}>
            <h2>
              {q.id} · {a.branch.toUpperCase()} — {a.label}
            </h2>
            {a.posts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </section>
        ))
      )}
    </main>
  );
}
