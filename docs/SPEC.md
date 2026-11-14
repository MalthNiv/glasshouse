# Glasshouse — Implementation Requirements & Branching Content Model

Companion to the project brief. Part 1 fixes the technical requirements. Part 2 defines the branching content model, which is the core of the project.

---

## Part 1 — Implementation Requirements

### 1.1 Stack (decisions, not options)

| Concern | Choice | Reason |
|---|---|---|
| Build | Vite + React 18 + TypeScript (strict) | Fast, simple, static deploy |
| State | Zustand, with `persist` middleware to `localStorage` | Small, easy to serialize the session log |
| Motion | Framer Motion for UI transitions | Cinematic page-level transitions |
| Panopticon scene | **CSS 3D transforms** (`perspective`, `rotateY`, `translateZ`) | Windows are real HTML, so text stays crisp, accessible and responsive. No WebGL fallback is needed. Revisit R3F only if time remains. |
| Styling | CSS Modules + CSS variables for theme | Phase-driven theming is done by swapping variables |
| Content | Typed TS modules in `src/content/` (no CMS, no backend) | Predefined branches, type-checked |
| Tests | Vitest for the selection engine only | The engine is pure, so unit tests are cheap and valuable |
| Backend | None. No network calls after load. | Matches the privacy promise |

### 1.2 Project structure

```
src/
  content/
    facets.ts        // Facet definitions
    slots.ts         // Slots + variants (the feed)
    prompts.ts       // Interpretation prompts
    reveal.ts        // Reveal templates + unseen-window content
  engine/
    types.ts         // All shared types (Part 2)
    lean.ts          // Lean vector math
    select.ts        // Variant selection
    echo.ts          // Language echo / token substitution
    phase.ts         // Phase transitions
    reveal.ts        // Builds the observation record from the log
  store/session.ts   // Zustand store + event log
  screens/
    Landing.tsx  Feed.tsx  Suspicion.tsx  Record.tsx
    Panopticon.tsx  Reflection.tsx
  components/        // Post, PromptCard, Window, ConsentNote, etc.
docs/SPEC.md
```

The engine must be **pure and UI-free**: `(state, content) → next view`. All branching logic lives in `engine/`, and screens only render its output.

### 1.3 Screen flow (state machine)

```
landing → feed(act1) → feed(act2) → feed(act3) → suspicion → record → panopticon → reflection
                                                                                     │
                                                              replay → reset → feed(act1)
```

- `phase` is a single enum in the store. Transitions go only through `engine/phase.ts`, with no ad-hoc `setPhase` calls from components.
- Browser back is disabled or ignored after `suspicion`, since the reversal is one-way. Replay is the only way back.
- Reloading mid-session restores state from `localStorage`. The landing page offers "continue" or "begin again".

### 1.4 Consent and transparency (non-negotiable)

- The landing page states, in one calm line under the CTA: *"Alex is a fictional, simulated person. This experience records your clicks and choices on this page, stored only in your browser."*
- A persistent small "ⓘ" in the feed opens the same text. It must stay reachable in every phase before the reveal.
- All data stays in `localStorage`. No analytics, no network requests, no third-party scripts at runtime.
- A visible "Clear my data" control on the reflection screen. Replay also clears the log.
- No tracking outside the app: no cursor tracking off-page, no device or fingerprint data. Track only the event types in §2.7.

### 1.5 Tracking

Every tracked interaction appends to one append-only `events[]` log (schema in §2.7). All reveal content derives from this log and the lean vector. Nothing in the reveal may be invented. Every line shown to the user about them must trace to a real event. This keeps the reversal credible.

### 1.6 Visual and interaction requirements

- **Landing:** near-black, one lit window motif, copy fades in line by line (*"Everyone has a window. Step inside. See what you find."*). Single CTA.
- **Feed (familiar):** a believable social profile: avatar, bio, post grid and post detail view. Phase-based theme drift is subtle: the feed starts warm and neutral, and slowly shifts hue, contrast and spacing toward the user's dominant facet (CSS variables, ≤ 8% change per act). The user should not consciously notice.
- **Prompts:** appear inline between posts as a soft card, not a modal. At most one per 2–3 posts. They are never blocking: the user may skip, and a skip is itself logged.
- **Suspicion:** the feed is interrupted by a single line, *"You've learned a lot about Alex. Or have you?"*, with a "Continue" affordance. Subtle glitches (a post flickers to its other variant for ~200 ms) are allowed once.
- **Record:** the user's own log is presented in the feed's visual language (same typography and cards), with Alex's content replaced by the user's. Lines appear sequentially, then the three reversal lines.
- **Panopticon (centerpiece):** see §1.7.
- **Reflection:** the final question, then **Replay** and **Clear my data / Exit**.
- **Responsive:** works from 360px to desktop. On mobile the panopticon uses fewer windows visible at once (see §1.7).
- **Accessibility:** keyboard-operable throughout, visible focus, `aria-live` for revealed text, WCAG AA contrast, and `prefers-reduced-motion` support. Under reduced motion, the panopticon becomes a static ring with cross-fades and no rotation.
- **Performance:** first load < 200 KB JS gzipped excluding images. Images are lazy-loaded and use compressed WebP or abstract SVG/gradient art. No photos of real people. Use illustration, silhouettes, objects and places.

### 1.7 Panopticon scene requirements

- A stage container with `perspective: 1200px`. A `ring` element rotates about the Y axis. N windows (default 6, one per facet) are placed at `rotateY(i·360/N) translateZ(R)`.
- The camera sits at the center, so the user is "inside the ring". Windows face inward. Add a central watchtower silhouette or a pool of light at the user's position.
- **Phase A, the unseen:** the ring slowly rotates. Each window shows a *hidden variant* (§2.8): lit, with a short caption and image. The user's dominant facet window is dim or locked, since that is the version they saw. Hovering or tapping a window brings it to the front.
- **Phase B, the turn:** over ~2.5 s the windows rotate on their own Y axes (`rotateY(180deg)` flip, inverted from inward to outward) so that each now faces the user. Their content swaps to **fragments of the user's own record** (§2.9). Light shifts from warm to cold. A subtle vignette tightens.
- **Phase C, the text:** the key lines appear in sequence: *"You saw one version of Alex. There were others." → "You weren't just looking through the windows." → **"You were standing in one."*** Then advance to reflection.
- Mobile (< 640px): show 3 windows around the arc at a time, rotating through the six.
- Total scene length 25–40 s with the user able to proceed at their own pace (a "Continue" appears after each beat). Do not auto-skip text.

---

## Part 2 — Branching Content Model

### 2.1 Core idea

Alex is **one stable character with several true facets**. The branching never changes who Alex is. It changes **which facet of Alex gets shown**. The model is:

> **Slots × Variants.** The feed is a fixed sequence of *slots*. Each slot has several *variants*, one per facet, all plausible readings of the same moment. The engine shows exactly one variant per slot, chosen by the user's *lean vector*. The variants not shown become the unseen windows in the final scene.

This gives the project its central guarantee: every hidden window is real content that was *actually withheld* from this user at a specific moment.

### 2.2 Facets

```ts
type Facet =
  | 'lonely'        // isolated, withdrawn, longing
  | 'joyful'        // delighted, playful, warm
  | 'independent'   // self-contained, deliberate, choosing solitude
  | 'social'        // connected, surrounded, in demand
  | 'vulnerable'    // hurting, tender, overwhelmed
  | 'uncertain';    // searching, unsure, mid-change

const FACETS: Facet[] = ['lonely','joyful','independent','social','vulnerable','uncertain'];
```

Several pairs are deliberately **ambiguous twins**, like `lonely` vs `independent` and `joyful` vs `uncertain`. The same image and a nearly identical caption can read as either, and that is how users project.

### 2.3 Core types

```ts
type Phase =
  | 'landing' | 'feed' | 'suspicion' | 'record'
  | 'panopticon' | 'reflection';

type Act = 1 | 2 | 3;

interface Variant {
  id: string;                    // e.g. 'p03.lonely'
  facet: Facet;
  caption: string;               // may contain echo tokens, see §2.6
  media: { kind: 'image' | 'svg'; src: string; alt: string };
  comments?: { author: string; text: string }[];   // 0–3 short comments, also facet-tinted
  meta?: { time: string; place?: string };         // e.g. '2:14 AM', 'Library, 3rd floor'
  ambiguity: number;             // 0..1, how readable it is as other facets (for design QA)
  unseenLine: string;            // short fragment for the panopticon window if this was withheld
}

interface Slot {
  id: string;                    // 'p03'
  act: Act;
  order: number;                 // position in feed within act
  neutralVariant: string;        // variant id: the ambiguous default shown when lean is weak
  variants: Variant[];           // exactly one per facet (6)
  prompt?: string;               // prompt id attached AFTER this slot is opened
}

interface Option {
  id: string;
  label: string;                 // what the user sees
  weights: Partial<Record<Facet, number>>;   // -1..+1 contribution, see §2.4
  echoWord?: string;             // word the system may later echo, e.g. 'alone'
}

interface Prompt {
  id: string;
  question: string;              // 'What do you think Alex meant?'
  kind: 'choice' | 'scale' | 'freetext';
  options?: Option[];            // for choice and scale
  keywordMap?: Record<string, Partial<Record<Facet, number>>>; // freetext → facet nudges
  skippable: true;
}
```

### 2.4 The lean vector (what the system believes about the user's judgment)

```ts
type Lean = Record<Facet, number>;   // raw accumulated score, starts at 0 for all facets
```

Lean is updated **only** by these events:

| Event | Update |
|---|---|
| Answer a choice or scale prompt | `lean[f] += option.weights[f] * W_PROMPT` (W_PROMPT = 3) |
| Free-text answer | Each keyword hit adds `keywordMap` weights * W_PROMPT. If no hits, add nothing and still store the text for echo. |
| Open a post | `lean[v.facet] += W_OPEN` (0.5), where `v` is the **shown** variant. *This is the feedback loop*: seeing a variant reinforces its facet. |
| Dwell ≥ 6 s on a post | `lean[v.facet] += W_DWELL` (0.5) |
| Open Alex's bio or highlights | small bump to `independent` or `vulnerable` per content tag |
| Skip a prompt | No lean change. Logged as `prompt_skip`. |

Derived values:

```ts
norm[f]   = max(lean[f], 0) / max(Σ max(lean[g],0), ε)   // 0..1 shares, sums to 1
dominant  = argmax(lean)   // null until lean max ≥ 3 (one real prompt answer)
margin    = norm[top1] - norm[top2]
```

Starting every user at zero means the **first posts are the same for everyone**. That shared baseline is also what makes the later divergence perceptible on replay.

### 2.5 Variant selection (the distortion engine)

For each slot as it is about to be shown (**lazily, at render time, then frozen**):

```ts
const DISTORTION: Record<Act, number> = { 1: 0.15, 2: 0.55, 3: 0.9 };

function pickVariant(slot, lean, act, seed): Variant {
  if (!dominant) return neutral(slot);                // no signal yet → neutral
  const d = DISTORTION[act];
  // score each facet: personal lean weighted by distortion, plus a neutral baseline
  const score = (v) =>
      d * norm[v.facet]
    + (1 - d) * (v.id === slot.neutralVariant ? 1 : 0)
    + jitter(seed, slot.id, v.id) * 0.02;             // deterministic tie-break
  return argmax(slot.variants, score);
}
```

Rules:

1. **Freeze on first render.** Once a slot's variant is chosen it is stored in `shownVariants[slotId]` and never changes. This keeps the log honest, since the user cannot "see" something different later. The one exception is the single sanctioned flicker in Suspicion (§1.6).
2. **Act 1** (≈4 slots): near-neutral. Variants are mostly ambiguous. The user forms a first read.
3. **Act 2** (≈4 slots): lean visibly shapes captions and comments, and the first echo tokens appear.
4. **Act 3** (≈3 slots): strong reinforcement. Alex's posts closely match the user's reading, including their own words.
5. **Never contradict outright.** The engine only reinforces. It never shows the opposite facet. If a user reads Alex as lonely, they get lonelier Alex, not a sudden joyful Alex. The joy is saved for the panopticon.
6. **Weak-signal fallback.** If `margin < 0.1`, show the neutral variant even in Act 3, then bias toward the facet of whichever post the user opened last.
7. **Sparse grid (optional, Act 2+).** Posts not yet opened in the profile grid also resolve lazily when first rendered in view.

### 2.6 Language echo

Captions, comments and some UI strings may contain tokens that the engine fills from the user's own words:

| Token | Source |
|---|---|
| `{{echo.word}}` | The most recent `echoWord` from a chosen option, or the most frequent freetext keyword |
| `{{echo.phrase}}` | A trimmed (≤ 6 words) fragment of the user's last free-text answer |
| `{{echo.facetAdj}}` | A stock adjective for `dominant`, from a lookup (`lonely`, `quiet`, `sure of herself`) |

Rules:
- Tokens are only filled in **Act 2–3 variants** of the dominant facet. In Act 1 they resolve to a safe neutral fallback or are omitted.
- Every variant using a token must have a `fallbackCaption` (field on `Variant`) that reads naturally if the token cannot be resolved (empty freetext, skip, etc.).
- Echo is subtle. At most 1 echo per post, and no direct quoting like "You said…". A caption might read: *"nobody's {{echo.word}}, it's just a Tuesday"*. The user should half-notice that Alex sounds like them.
- Sanitize freetext: strip HTML, cap at 80 chars, filter profanity and slurs from echoes only (the raw text is still kept for the user's own record).
- Every echo that gets used is logged (`echo_used`) so the Record can acknowledge it truthfully.

### 2.7 Event log schema

```ts
type EventBase = { t: number; phase: Phase; act?: Act };   // t = ms since session start

type SessionEvent = EventBase & (
  | { type: 'post_open';     slotId: string; variantId: string; facet: Facet }
  | { type: 'post_dwell';    slotId: string; ms: number }
  | { type: 'post_close';    slotId: string }
  | { type: 'prompt_shown';  promptId: string; afterSlotId: string }
  | { type: 'prompt_answer'; promptId: string; optionId?: string; text?: string }
  | { type: 'prompt_skip';   promptId: string }
  | { type: 'profile_view';  section: 'bio' | 'highlights' | 'grid' }
  | { type: 'echo_used';     variantId: string; token: string; value: string }
  | { type: 'variant_shown'; slotId: string; variantId: string; facet: Facet; distortion: number }
);
```

`variant_shown` is the key event. It records the exact moment the engine picked what the user would see, along with the distortion level, and it is what the Record and Panopticon read from.

Store shape:

```ts
interface SessionState {
  version: 1;
  seed: string;                              // random per run, for deterministic jitter
  phase: Phase;
  act: Act;
  lean: Lean;
  shownVariants: Record<string, string>;     // slotId → variantId
  answers: Record<string, { optionId?: string; text?: string }>;
  events: SessionEvent[];
  priorRuns: { dominant: Facet | null; endedAt: number }[];  // for replay
}
```

### 2.8 Unseen content (feeds the panopticon)

At the end of the feed compute **withheld variants**:

```ts
withheld = slots.flatMap(s => s.variants.filter(v => v.id !== shownVariants[s.id]))
```

Select the 6 windows, one per facet:

1. For each facet `f`, pick the withheld variant of that facet with the **highest `ambiguity`-weighted emotional strength** from Act 2–3 slots (content authors mark one `windowHero: true` per facet where they have a preferred pick).
2. The user's `dominant` facet window is the only one that was *seen*. Render it as **dim with a "you saw this" mark**, as a counterpoint. Include its real shown caption from the user's own history.
3. The other five windows are lit and show `unseenLine` and the image of a variant the user **never** saw.
4. If a facet *was* shown in places via neutral variants, still pick from what remains withheld. The window caption should say when it was withheld (e.g. *"2:14 AM — you never saw this"*). The `variant_shown` log gives the proof.

Minimum content bar: every facet needs ≥ 2 withheld candidates across Acts 2–3, regardless of user path. This is achievable because each slot has all six variants and only one is shown.

### 2.9 Observation record and reversal fragments

`engine/reveal.ts` turns the log into **observation fragments** using templates. Each fragment is a short string plus the event IDs that justify it.

```ts
interface Fragment { text: string; evidence: number[] }  // indexes into events[]
```

Example templates, each only emitted if its condition is true:

| Condition | Template |
|---|---|
| `count(post_open)` ≥ 1 | `You opened {n} of Alex's posts.` |
| first `post_open` | `The first thing you looked at was {slot.title} at {t}.` |
| `dominant` exists | `By your third answer, you'd decided Alex was {facetAdj}.` |
| dwell outlier | `You stayed on one post for {s} seconds. {slot.title}.` |
| a skipped prompt | `You chose not to answer once. That was recorded too.` |
| `echo_used` | `Alex started to sound like you: "{value}".` |
| fastest answer | `You answered "{prompt}" in {s} seconds.` |
| unopened posts | `You never opened {n} posts. They were there.` |

Rules:
- Show 6–8 fragments in the Record screen, then reuse a subset of 6 on the panopticon windows in Phase B. Rank by emotional specificity: echoes, dwell outliers and skipped prompts first, generic counts last.
- If the user did almost nothing, the Record says so honestly (*"You barely touched anything. That was recorded too."*). Never fabricate.
- No judgment language. Fragments describe behavior and never characterize the user's personality ("you are judgmental" is forbidden). This follows the brief's "avoid moralizing".

### 2.10 Phase triggers

| Transition | Condition |
|---|---|
| `landing → feed` | CTA clicked |
| Act 1 → 2 | Slots 1–4 opened ≥ 3 **and** ≥ 1 prompt answered or skipped |
| Act 2 → 3 | Act 2 slots opened ≥ 3 **and** ≥ 2 prompts answered in total |
| Act 3 → suspicion | Act 3 slots opened ≥ 2, **or** total post opens ≥ 9, **or** 6 minutes elapsed (a safety valve so a user cannot loiter forever) |
| `suspicion → record` | "Continue" |
| `record → panopticon` | "Continue" after the reversal lines |
| `panopticon → reflection` | After the final line, via "Continue" |
| `reflection → feed` | Replay |

If the user answers no prompts at all, the engine still advances using open counts. Their `dominant` stays `null`, the feed stays neutral, and the Record is honest about it.

### 2.11 Content authoring minimums (for the prototype)

- **11 slots**: Act 1 × 4, Act 2 × 4, Act 3 × 3
- **6 variants per slot** (66 variants). If writing 66 distinct variants is too heavy, the fallback is: share one image per slot across all variants and vary only caption, comments and meta. The images are the expensive part.
- **5–6 prompts**: 2 in Act 1 (one `choice`, one `scale`), 2 in Act 2, 1 freetext in Act 3. Prompt wording comes straight from the brief ("What do you think Alex meant?", "How would you describe Alex?", "What kind of person do you think Alex is?").
- **Authoring rules for Act 1:** each variant must be plausibly readable as at least 2 facets. An `ambiguity` score ≥ 0.5 is required in Act 1. This is checked by a dev-time validator.
- **Alex's fixed facts** (never branch): a college student, a handful of recurring settings (library, bike route, shared kitchen, rooftop), a consistent voice (lowercase, dry, observational). Facets are *moods and framings of the same life*, never contradictory facts. Do not vary basic facts like major, roommate count or hometown across variants.
- **Example slot** (`p03`, Act 1, image: a table set for one at a window):
  - `lonely`: "dinner for one again. the quiet gets loud around 7"
  - `independent`: "dinner for one. best company i've had all week"
  - `joyful`: "made the thing from the video. it worked!! eating it all myself"
  - `social`: "saved a seat for everyone. everyone was busy. their loss, honestly"
  - `vulnerable`: "ate standing up. didn't have the energy to sit"
  - `uncertain`: "not sure if this counts as dinner or just a decision"
  - Neutral default: `independent` or `uncertain`, whichever Act 1 needs to keep ambiguity high.

### 2.12 Validation and tests

Dev-time validator (`npm run validate:content`) must fail on:
- A slot without exactly one variant per facet
- A missing `neutralVariant`, `unseenLine` or `fallbackCaption` on a variant that uses a token
- An Act 1 variant with `ambiguity < 0.5`
- A facet without ≥ 2 withheld candidates in Acts 2–3
- An echo token in an Act 1 variant

Vitest cases for the engine:
1. A fresh user gets neutral variants for all of Act 1.
2. Answering `lonely`-weighted options and opening posts yields `lonely` variants in Act 3.
3. `margin < 0.1` yields neutral variants.
4. A frozen variant never changes after being shown.
5. Two different users produce different `shownVariants`, and both have a full set of 6 windows.
6. Zero-interaction users still reach `reflection` without errors.
7. Same seed plus same events gives the same output (determinism).

### 2.13 Replay

- Replay clears `events`, `lean`, `shownVariants` and `answers`, and keeps `priorRuns`.
- On replay, a quiet bias is applied: Act 1 neutral defaults tilt **away** from the previous `dominant` (e.g. a prior `lonely` makes Alex's neutral lean `independent`). So the user is likelier to find a different Alex without being told why.
- Feed UI copy changes nowhere on replay. Only the content differs.
- Clear-my-data wipes `priorRuns` as well.

---

## Acceptance criteria (prototype is "done" when)

- [ ] A user can go landing → reflection in 6–10 minutes without errors, on mobile and desktop.
- [ ] Two users with opposite interpretations see visibly different Act 3 feeds.
- [ ] No post's variant ever changes after it has been shown, except for the single sanctioned flicker.
- [ ] Every sentence on the Record and panopticon back side is traceable to a logged event.
- [ ] The panopticon shows 6 windows, 5 of them real unseen content, then turns them to face the user.
- [ ] The consent line is present on the landing page and stays reachable until the reveal.
- [ ] No network requests after initial asset load. All data lives in `localStorage` and can be cleared.
- [ ] `prefers-reduced-motion` and keyboard navigation work through the whole flow.
- [ ] Content validator and engine tests pass.
