# Glasshouse — Implementation Requirements & Branching Content Model

Companion to the project brief. Part 1 fixes the technical requirements. Part 2 defines the branching content model, which is the core of the project.

**Status key:** ✅ built · 🟡 partly built · ⬜ not started.

> **Revision note.** An earlier draft modeled Alex as six emotional "facets" selected by a hidden lean vector and distortion engine. That has been replaced. The user now answers three explicit midpoint questions, each answer picks one of three fixed branches (a/b/c), and every branch is a hand-authored set of three posts from one true timeline. There is no scoring, no variant distortion and no language echo.

---

## Part 1 — Implementation Requirements

### 1.1 Stack

| Concern | Choice | Status |
|---|---|---|
| Build | Vite + React 18 + TypeScript (strict) | ✅ |
| State | Small custom store built on `useSyncExternalStore`, held in memory only (nothing is persisted). No state library. Zustand remains an option if the store grows. | ✅ interactions store · ⬜ session/phase store |
| Motion | CSS animation for now. Framer Motion is optional for page-level transitions and is not installed. | 🟡 |
| Panopticon scene | **CSS 3D transforms** (`perspective`, `rotateY`, `translateZ`). Windows are real HTML, so text stays crisp, accessible and responsive. No WebGL. | ⬜ |
| Styling | Plain CSS. Global `styles.css` holds the landing and theme. Each component has its own scoped stylesheet (e.g. `PostCard.css`, everything under `.post-card`). | ✅ |
| Type | **Cinzel Regular** for the wordmark and brand, **Jost** for everything else (CTAs, questions, answers, feed UI), per `assets/font-breakdown.png`. Self-hosted through `@fontsource/cinzel` and `@fontsource-variable/jost`, so there are no third-party font requests. | ✅ |
| Content | Typed TS modules in `src/content/` (no CMS, no backend) | ✅ |
| Tests | Vitest for pure logic only: branch lookup, phase transitions and the reveal builder. | ⬜ |
| Backend | None. No network calls after load. | ✅ |

### 1.2 Project structure

```
assets/post_assets/        // 32 post photos (img-1…img-5, img-6a…img-14c), avatars, post-example.png
src/
  content/
    posts.ts        ✅ all posts, questions, branch lookups
    reveal.ts       ⬜ reveal templates + unseen-window copy
  engine/           ⬜ pure and UI-free: (state, content) → next view
    phase.ts        //   phase transitions
    feed.ts         //   which posts/question come next, given answers
    reveal.ts       //   builds the observation record from the event log
  store/
    interactions.ts ✅ per-post likes, saves, comment opens, views, shares
    session.ts      ⬜ phase, answers, event log
  components/
    PostCard.tsx    ✅ the one reusable post component
    PostPreview.tsx ✅ dev-only page (?dev=posts) showing every post
    QuestionCard, Window, ConsentNote …   ⬜
  Landing.tsx       ✅
  screens/          ⬜ Feed, Suspicion, Record, Panopticon, Reflection
docs/SPEC.md
```

All branching logic lives in `engine/` and screens only render its output. The engine must be pure and testable.

### 1.3 Screen flow (state machine)

```
landing → feed (shared) → Q1 → feed (act 2) → Q2 → feed (act 3) → Q3 → feed (act 4)
        → suspicion → record → panopticon → reflection
                                                 │
                                    replay → reset → feed (shared)
```

- `phase` is a single enum in the session store. Transitions go only through `engine/phase.ts`, with no ad-hoc `setPhase` calls from components.
- Browser back is disabled or ignored after `suspicion`, since the reversal is one-way. Replay is the only way back.
- **Nothing is saved between page loads.** A refresh starts the whole experience over: back to the landing screen, with no answers, likes, saves or history. All state lives in memory only.
- The questions are asked inline in the feed, after the posts that prompt them (see §2.3).

### 1.4 Consent and transparency (non-negotiable)

- The landing page states, in one calm line under the CTA: *"Alex is a fictional, simulated person. This experience records your clicks and choices on this page, stored only in your browser."* ⬜ **Not yet on the landing page.**
- A persistent small "ⓘ" in the feed opens the same text. It must stay reachable in every phase before the reveal. ⬜
- All data stays in memory in the browser, and nothing is saved between page loads (no `localStorage`). No analytics, no network requests, no third-party scripts at runtime.
- A visible "Clear my data" control on the reflection screen. Replay also clears the log. (`interactions.clear()` exists.)
- No tracking outside the app: no cursor tracking off-page, no device or fingerprint data. Track only the event types in §2.6.

### 1.5 Tracking

Everything the reveal says about the user must trace to something actually recorded. Nothing in the reveal may be invented.

Two layers:

1. **Per-post counters** ✅ (`store/interactions.ts`): `liked`, `saved`, `commentsOpened`, `views`, `shares`, plus `likedAt`, `savedAt` and `firstViewedAt`. These are held in memory and reset when the page is refreshed. Views count once per card mount, after ≥50% of the card is visible for 1 second.
2. **Append-only event log** ⬜ (§2.6): timestamped events. Counters alone cannot support "the first thing you looked at was…" or "you answered in 4 seconds", so the session store must add the log. The counters can then be derived from it, or kept alongside it.

### 1.6 Visual and interaction requirements

- **Landing** ✅: a frosted-glass pane with drifting fog, the title resolving from blur, and a single "Step inside" CTA that fades out into the feed.
- **Post card** ✅: black, Instagram-style, matching the Figma export (`post-example.png`): rounded corners, 44 px avatar, bold name with grey handle, `•••` menu, outline heart / comment / share on the left and bookmark on the right, caption, comments, and an uppercase grey timestamp. Photos are displayed as 1:1 squares, cropped from the top, because the `img-12a`, `img-13a` and `img-14b` exports include white padding below the picture.
- **Post behavior** ✅: heart toggles liked (red, filled), bookmark toggles saved, comment icon (or "View all N comments") expands and collapses comments, share uses `navigator.share` with a clipboard fallback. State is per post ID.
- **Feed** ✅: one continuous black surface, running the full height of the page with square top and bottom edges, of `PostCard`s modeled on scrolling Instagram (see `assets/insta-example.mp4`): posts are not boxed or divided, and each header simply follows the previous post's date with a modest gap. A soft light-blue glow surrounds the column. The five shared posts are followed by Q1 inline in the column; answering reveals that branch's three posts below it, then Q2, then Q3, and nothing below an unanswered question is shown.
- **Opening transition** ✅ (`components/OpeningTransition`, ~10 s, click or Esc skips): after "Step inside", a wall of tilted profile cards (a still of the first frame of `assets/glasshouse-opening.gif`, shipped as `assets/opening_assets/opening-wall.webp`) fades in over the fog. The wall drifts and tilts during a short hold, then the camera accelerates toward the position of the real first post while a spotlight blooms on Alex's card, the blurred edges rush past faster than the sharp center (parallax) and everything sinks into the dark, then the real feed fades in and the overlay dissolves, so the first post appears to come out of the card. It is rebuilt in CSS instead of playing the GIF, which is 26 MB and runs at about 7 fps. `?dev=opening` replays it directly. Under reduced motion it is skipped.
- **Fog lift** 🟡: the background is the unfogged panopticon photo under a CSS fog (`components/Backdrop`, density 0–1). The opening screen starts dense and eases to a resting level. In the feed, the fog gradually lifts as the user scrolls and is only partly lifted at the last post (it stays fairly dense), so the user realizes they are inside the panopticon. Progress is the position of the deepest post in view along the user's 14-post path (not page height, which grows as questions are answered), the lift never reverses (`ratchet`), and the early posts stay foggy (`curve`). The tuning constants are in `App.tsx`. The transition from the last post into the final reveal is ⬜.
- **Questions** ✅ (`components/QuestionCard`): inline in the post column as plain type on the black surface (no card or bordered buttons): a short hairline, the question in a classic serif, and the three answers as lettered lines. Not skippable, and an answer is final: the chosen option is checked, the others dim and lock, and the three posts of that branch ease in below (the feed nudges the first one into view). Each answer and the time the question first came into view are stored in `store/session.ts`.
- **Suspicion** ✅ (`components/EndCard`): the feed ends the way Instagram ends one, with a check mark and *"You’re all caught up"*, centred below the last post. Once the user has actually reached it (on screen, not merely mounted) and 1.5 s have passed, a button appears: **"Or are you?"**. It leads into the observation history, at the user's own pace.
- **Record** ✅ (`screens/Record`, data from `engine/record.ts`): the feed fades out and the observation history appears in the same black column and glow, its lines arriving one after another. First, briefly, how the user read Alex: their answer to each question, under a short topic. Then everything that was noticed: **likes** (posts and comments, with which ones), **where they lingered** (how many posts were looked at and the posts that held the middle of the screen longest, ≥ 3 s, top 3), **comments** (on how many posts the comments were opened, which comments were liked, and whose), **how long they took to decide** on each question (from the question coming into view to the answer, plus the total), and **saved and shared**. Every line comes from something recorded; if the user did almost nothing it says so (*"You barely touched anything. That was recorded too."*). No judgment language. It ends on a centred closing line with only a little room around it and nothing above it: *"Did you realize that?"*, which fades in (about 2 s) when the user scrolls to it, once the rest of the page has finished appearing, so it is not already there when they arrive. The panopticon that follows is ⬜.
- **Panopticon** ✅ (`screens/Panopticon`, posts from `engine/unseen.ts`): the user's last scene, in five parts. After *"Did you realize that?"* the realization moment plays: the observation screen fades to black and holds in darkness for a beat; then the lights come up, the fog clears completely over about 7 s on a slow-then-sudden curve, a wash of light floods in from the dome, and the camera creeps in toward the middle of the building. (1) **The reveal:** the clear building, with nothing in it yet. (2) **Interact, left:** an unseen post comes in from the left in its own rounded card, which the user can really interact with (like, comments, comment likes, save, share), with a message on the right and, after about 2 s, a **Continue** button. (3) **Interact, right:** the mirror: a different unseen post from the right, the message and button on the left. The two featured posts come from opposite ends of the story (the unseen post with the most comments among the first question's unseen branches, and among the last question's). (4) **Two rows:** the remaining 16 unseen posts in two rows, top and bottom, sliding slowly in opposite directions (about 19 px/s), forever, with the middle left clear. Every window is exactly the same height, whatever its caption, and the windows are kept small and near the screen edges so the middle has plenty of room (about 340 px clear on a laptop). After about 5 s, *"Was the glass ever clear?"* appears in the middle; about 3 s later *"You decide."* arrives, larger and heavier than the question (about 56 px against 38 px on a laptop), with a strong glow that slowly swells and settles, and coming out of a blur, while the question steps back to half brightness. (5) **The ending:** about 6.5 s later the rows and words fade away and the fog comes back (density 0.95, over about 9 s), then the experience ends the way it began, on the blurred-to-sharp **"Glasshouse"** wordmark with **"Thank you for visiting"** emerging beneath it, set in Cinzel (the wordmark's own face) like the brand eyebrow. Each unseen post says when it was made and *"you never saw this"*. On phones the card stacks above its message and the part scrolls. Under reduced motion the rows stay still. `?dev=panopticon` opens the scene directly with a sample path, and `&stage=one|two|rows|finale` jumps to a part. There is no replay or clear-data control yet (the Reflection screen is ⬜).
- **Reflection** ⬜: the final question, then **Replay** and **Clear my data / Exit**.
- **Responsive:** works from 360 px to desktop. The post card is `width: 100%`, `max-width: 482px`.
- **Accessibility:** keyboard-operable throughout, visible focus, `aria-pressed` and `aria-expanded` on post controls ✅, `aria-live` for revealed text, WCAG AA contrast, and `prefers-reduced-motion` support. Under reduced motion, the panopticon becomes a static ring with cross-fades and no rotation.
- **Performance:** the photos are 600–800 KB each, so images must be lazy-loaded ✅ and should be recompressed to WebP before launch. JS is currently ~52 KB gzipped, within the < 200 KB budget.
- **Characters:** Alex and everyone depicted are fictional characters. Keep a visible fictional-person disclosure (§1.4).

### 1.7 Panopticon scene requirements

- A stage container with `perspective: 1200px`. A `ring` element rotates about the Y axis. N windows are placed at `rotateY(i·360/N) translateZ(R)`.
- The camera sits at the center, so the user is "inside the ring". Windows face inward. Add a central watchtower silhouette or a pool of light at the user's position.
- **Window count:** default **6**, one per *unseen branch*. The user takes one branch at each of three questions, which leaves two unseen branches per question (see §2.7). Mobile (< 640 px) shows 3 windows at a time, rotating through the six.
- **Phase A, the unseen:** the ring slowly rotates. Each window shows a *real post the user never saw*, in the card's own visual language, with its real caption, comments and timestamp. Hovering or tapping a window brings it to the front.
- **Phase B, the turn:** over ~2.5 s the windows rotate on their own Y axes (`rotateY(180deg)`) so that each now faces the user. Their content swaps to **fragments of the user's own record** (§2.8). Light shifts from warm to cold. A subtle vignette tightens.
- **Phase C, the text:** the key lines appear in sequence: *"You saw one version of Alex. There were others." → "You weren't just looking through the windows." → **"You were standing in one."*** Then advance to reflection.
- Total scene length is 25–40 s, with the user able to proceed at their own pace (a "Continue" after each beat). Do not auto-skip text.

---

## Part 2 — Branching Content Model

### 2.1 Core idea

Alex is a 21-year-old college student who is social, creative, introspective, occasionally insecure and often funny without trying to be. Her friends are getting busier, her own responsibilities are growing, and she is working through conflicting feelings about friendship, work/life balance and academic integrity.

> **All 32 posts belong to one true, consistent timeline.** Glasshouse does not change who Alex is or what happened. It changes **which true posts the user is shown**, based on how the user interprets her. The posts they are not shown become the unseen windows in the final scene.

The guarantee: every hidden window is real content that was actually withheld from this user at a specific moment.

**Recurring characters**

| Character | Role |
|---|---|
| **Jamie** | Best friend since freshman year. Outgoing, busy with a campus performance group. The friendship is changing, but they still care. |
| **Maya** | Roommate. Funny, supportive. The person Alex is most herself around. |
| **Priya** | Design-project partner. They spend long hours preparing for a student exhibition. |

**Questions the posts should raise:** Is something wrong between Alex and Jamie? Why is she so stressed when her life seems to be going well? Why is she skipping class so much?

### 2.2 Structure: shared posts, then three questions

| Group | Posts | Shown to |
|---|---|---|
| **Act 1 — shared** | `p01`–`p05` | Everyone, in order |
| **Q1 → Act 2** | `p06x`–`p08x` | Branch chosen at Q1 |
| **Q2 → Act 3** | `p09x`–`p11x` | Branch chosen at Q2 |
| **Q3 → Act 4** | `p12x`–`p14x` | Branch chosen at Q3 |

`x` is the branch letter `a`, `b` or `c`. That makes 5 shared posts plus 27 branch posts (3 questions × 3 branches × 3 posts) = **32 posts**. Photos are `assets/post_assets/img-<n>.jpg` (e.g. `img-1.jpg`, `img-6a.jpg`, `img-14c.jpg`).

Each user sees 5 + 3 + 3 + 3 = **14 posts**. The other **18** are withheld.

**Prototype rule:** show at most three reinforcing posts on any one path. The rest are saved for the reveal.

Branch choice at each question is **independent**. Q2 and Q3 do not depend on the earlier answers, so there are 27 possible paths and each question's three branches are always the same posts. (If a later design wants dependencies, change `getPostsFor` and add a test.)

### 2.3 Questions and branches

**Act 1 (`p01`–`p05`)** is intentionally ambiguous. It establishes Alex's personality and leaves room for assumptions. `p05` ("genuinely just wanted to rot today", Friday night) is the turning point.

**Q1 (after `p05`)**: *"Wasn't it Jamie's birthday on Friday? Why's Alex at home?"*

| Branch | Answer | Posts |
|---|---|---|
| A | Maybe she isn't feeling well | `p06a` `p07a` `p08a` |
| B | Something might've happened between them | `p06b` `p07b` `p08b` |
| C | She might be busy with other things | `p06c` `p07c` `p08c` |

**Q2 (after `p08x`)**: *"Well, her exhibition seems to have gone well, so why was she so stressed before?"*

| Branch | Answer | Posts |
|---|---|---|
| A | She might not like studying design | `p09a` `p10a` `p11a` |
| B | She was probably just overwhelmed | `p09b` `p10b` `p11b` |
| C | It could be some kind of other drama going on | `p09c` `p10c` `p11c` |

**Q3 (after `p11x`)**: *"Wow okay Alex seems to be living the life. I haven't seen her in class though."*

| Branch | Answer | Posts |
|---|---|---|
| A | I guess she's just skipping | `p12a` `p13a` `p14a` |
| B | She's probably got a full-time offer after grad | `p12b` `p13b` `p14b` |
| C | She's just naturally smart | `p12c` `p13c` `p14c` |

**Authoring intent:**
- Each branch's posts should read as ordinary things Alex would post, while *reinforcing* the interpretation the user picked.
- Act 3 captions and comments are intentionally a little unsettling. The user should start to feel Alex is echoing their own reading.
- Alex's voice stays consistent: lowercase, dry, observational. Basic facts (who her friends are, where she studies) never change between branches.

### 2.4 Core types (as implemented in `src/content/posts.ts`)

```ts
type Branch = 'a' | 'b' | 'c';
type QuestionId = 'q1' | 'q2' | 'q3';

interface PostComment { user: string; text: string }

interface Post {
  id: string;                 // 'p01'…'p05' shared, 'p06a'…'p14c' branch
  act: 1 | 2 | 3 | 4;
  questionId?: QuestionId;    // branch posts only
  branch?: Branch;            // branch posts only
  image: string;              // bundled URL from assets/post_assets
  alt: string;
  caption: string;            // exact text, never edited
  comments: PostComment[];    // exact, predefined
  timestamp: string;          // e.g. 'Three weeks ago', 'Saturday night'
}

interface Answer   { branch: Branch; label: string; posts: Post[] }   // 3 posts
interface Question { id: QuestionId; afterPostId: string; prompt: string; answers: Answer[] }
```

Lookups: `sharedPosts`, `questions`, `questionsById`, `allPosts`, `postsById`, and `getPostsFor(questionId, branch)`.

`afterPostId` is `'p05'` for Q1. For Q2 and Q3 it is the prefix `'p08'` or `'p11'`, because the last post depends on the branch. The engine matches on that prefix.

### 2.5 Session state

```ts
interface SessionState {
  version: 1;
  phase: Phase;
  answers: Partial<Record<QuestionId, Branch>>;   // the user's chosen branch per question
  events: SessionEvent[];                          // append-only log (§2.6)
  priorRuns: { answers: Partial<Record<QuestionId, Branch>>; endedAt: number }[];
}
type Phase = 'landing' | 'feed' | 'suspicion' | 'record' | 'panopticon' | 'reflection';
```

- The shown posts are derived from `answers`, so there is no separate frozen-variant map. A post is never swapped after being shown, which keeps the log honest.
- Per-post counters (likes, saves, comment likes, views) live in the separate `interactions` store ✅, in memory only, so they reset on refresh.
- Answers are held in memory by `store/session.ts` as `{ answers: { q1: { branch, answeredAt } … }, shownAt: { q1: ms … } }`. They are not persisted, so a refresh clears the path.
- Both stores are memory-only. Each deletes its old `localStorage` key once on load so data from earlier builds cannot come back.

### 2.6 Event log schema ⬜

```ts
type EventBase = { t: number; phase: Phase };   // t = ms since session start

type SessionEvent = EventBase & (
  | { type: 'post_view';        postId: string }                          // ≥50% visible for 1 s
  | { type: 'post_like';        postId: string; on: boolean }
  | { type: 'post_save';        postId: string; on: boolean }
  | { type: 'comments_open';    postId: string }
  | { type: 'comments_close';   postId: string }
  | { type: 'post_share';       postId: string }
  | { type: 'question_shown';   questionId: QuestionId }
  | { type: 'question_answer';  questionId: QuestionId; branch: Branch }
);
```

Only these event types may be tracked. Today the interactions store records the counters but not the log. The log is the next addition.

### 2.7 Unseen content (feeds the panopticon)

After the feed, compute the withheld posts:

```ts
withheld = questions.flatMap(q =>
  q.answers.filter(a => a.branch !== answers[q.id])    // 2 unseen branches per question
);                                                      // → 6 unseen branches, 18 posts
```

Pick **one post per unseen branch** as that branch's window, giving 6 windows. Authors may mark a preferred pick per branch with a `windowHero` flag, and the default is the branch's middle post. Each window shows the post's real photo, caption, comments and timestamp, and notes that it was never shown to this user (e.g. *"Saturday night — you never saw this"*). The log (`question_answer`) is the proof.

The user's chosen branches are not windows. They appear in the Record and on the turned windows.

### 2.8 Observation record and reversal fragments

`engine/reveal.ts` turns the log into **fragments** using templates. Each is a short string plus the event indexes that justify it.

```ts
interface Fragment { text: string; evidence: number[] }   // indexes into events[]
```

Each template is emitted only if its condition is true:

| Condition | Template |
|---|---|
| any `post_view` | `You looked at {n} of Alex's posts.` |
| first `post_view` | `The first thing you looked at was "{caption}".` |
| `post_like` | `You liked {n} posts. The first was "{caption}".` |
| `post_save` | `You saved "{caption}" to look at later.` |
| `comments_open` | `You opened the comments on {n} posts. You read what her friends said.` |
| most-reopened post | `You went back to the comments on "{caption}" {n} times.` |
| `question_answer` | `When asked why Alex was at home, you said: "{answer label}".` |
| fastest or slowest answer | `You answered in {s} seconds.` |
| withheld posts | `There were {n} posts you never saw. They were there.` |

Rules:
- Show 6–8 fragments in the Record, then reuse a subset of 6 on the turned panopticon windows. Rank specific behavior first (re-opened comments, saves, likes) and generic counts last.
- If the user did almost nothing, the Record says so honestly (*"You barely touched anything. That was recorded too."*). Never fabricate.
- No judgment language. Fragments describe behavior and never characterize the user's personality. This follows the brief's "avoid moralizing".

### 2.9 Phase triggers

| Transition | Condition |
|---|---|
| `landing → feed` | CTA clicked |
| shared posts → Q1 | After `p05` is reached |
| Q1 / Q2 / Q3 → next posts | A branch is chosen |
| Act 4 → `suspicion` | All three posts of the Q3 branch have been reached, **or** 6 minutes elapsed (safety valve so a user cannot loiter forever) |
| `suspicion → record` | "Continue" |
| `record → panopticon` | "Continue" after the reversal lines |
| `panopticon → reflection` | After the final line, via "Continue" |
| `reflection → feed` | Replay |

Reaching a post means it has been scrolled into view, not that the user interacted with it. A user who interacts with nothing still reaches `reflection`, and the Record is honest about it.

### 2.10 Replay

- Replay clears the interaction counters, the event log and `answers`, and keeps `priorRuns`.
- On replay, the same posts and questions appear, and only the user's choices differ. Nothing in the UI copy changes.
- Optional, to be decided: show on replay which branches were taken last time, so the user can deliberately explore the others.
- Clear-my-data wipes `priorRuns` as well.

### 2.11 Validation and tests

A dev-time content check (`npm run validate:content`) should fail on:
- A question without exactly three answers (a, b, c), or an answer without exactly three posts
- A post id that doesn't match its question, branch or order
- A post without an image, caption or timestamp
- A duplicate post id, or an `afterPostId` that matches no post

Vitest cases for the pure logic:
1. `getPostsFor` returns the right three posts for all nine question/branch pairs.
2. Every user's visible posts plus withheld posts equal all 32, with no overlap.
3. Withheld windows always number 6 for any answer combination.
4. A zero-interaction user still reaches `reflection` without errors.
5. The reveal builder emits only fragments whose conditions hold, and each fragment's evidence indexes are valid.
6. Replay clears counters and log but keeps `priorRuns`.

---

## Acceptance criteria (prototype is "done" when)

- [x] A single reusable `PostCard` renders every post, matching the Figma design.
- [x] Likes, saves, comment expansion and views are tracked per post ID in memory, with no network calls, and reset on refresh.
- [ ] A user can go landing → reflection in 6–10 minutes without errors, on mobile and desktop.
- [ ] Two users who choose opposite answers at each question see entirely different posts after the shared five.
- [ ] No post ever changes after it has been shown.
- [ ] Every sentence on the Record and on the panopticon back side is traceable to a logged event.
- [ ] The panopticon shows 6 windows of real unseen posts, then turns them to face the user.
- [ ] The consent line is present on the landing page and stays reachable until the reveal.
- [ ] No network requests after initial asset load. All data lives in memory only, and nothing is saved between page loads.
- [ ] `prefers-reduced-motion` and keyboard navigation work through the whole flow.
- [ ] Content validator and logic tests pass.

## Open decisions

1. **What is the "true" story?** The timeline is consistent, but the reveal doesn't yet say what actually happened with Jamie, the exhibition stress or the missed classes. Decide whether the reflection resolves it or leaves it open.
2. **Branch dependencies:** are Q2 and Q3 independent of earlier answers, as specified in §2.2, or should earlier answers shape later branches?
3. **Replay:** should the previous branches be visible on replay (§2.10)?
4. **Window picks:** use the middle post of each unseen branch, or hand-pick a `windowHero` per branch (§2.7)?
