import { useCallback, useEffect, useRef, useState } from 'react';
import Landing from './Landing';
import Feed from './screens/Feed';
import Record from './screens/Record';
import Panopticon from './screens/Panopticon';
import { session } from './store/session';
import Backdrop from './components/Backdrop';
import OpeningTransition, { preloadOpening } from './components/OpeningTransition';
import PostPreview from './components/PostPreview';
import { sharedPosts } from './content/posts';

const dev = new URLSearchParams(window.location.search).get('dev');
const devPosts = dev === 'posts';

type Phase = 'landing' | 'opening' | 'feed' | 'record' | 'panopticon';

// Fog amount is 0 (clear photo) to 1 (densest).
const FOG = {
  // Opening screen: starts dense, then thins to `rest`.
  start: 1,
  rest: 0.95,
  clearDelayMs: 500,
  clearSeconds: 5,

  // Feed: fog lifts from `rest` to `end` as the user scrolls to the last post.
  end: 0.78,
  // >1 keeps the early posts foggy and lifts faster toward the end.
  curve: 1.5,
  // How quickly the backdrop catches up to scroll position.
  scrollFadeSeconds: 1.2,
  // Once lifted, the fog never comes back if the user scrolls up again.
  ratchet: true,

  // The unseen: the moment of realization. The page fades to black and holds there for a beat,
  // then the lights come up, the fog clears completely (not a trace of it) on a slow-then-sudden
  // curve, and the camera creeps in toward the middle of the building.
  toSceneMs: 1800, // the scene is mounted (hidden by the black) this long after the click
  clearAtMs: 3000, // the black lifts and the fog starts to clear
  reveal: 0, // fog density once cleared: none
  revealSeconds: 7,
  revealCurve: 'cubic-bezier(0.65, 0, 0.25, 1)',
  revealZoom: 1.1,
  revealZoomSeconds: 12,

  // The end: the glass fogs up again, the way it was when the user arrived.
  endFog: 0.95,
  endFogSeconds: 9,
};

// ?dev=panopticon jumps straight to the scene, with a sample path (B, C, A) already chosen.
if (dev === 'panopticon') {
  session.answer('q1', 'b');
  session.answer('q2', 'c');
  session.answer('q3', 'a');
}

export default function App() {
  // ?dev=opening starts directly in the transition, to replay it without the landing screen.
  const [phase, setPhase] = useState<Phase>(
    dev === 'opening' ? 'opening' : dev === 'panopticon' ? 'panopticon' : 'landing'
  );
  const [revealed, setRevealed] = useState(false); // feed fades in during the transition
  const [leaving, setLeaving] = useState(false); // feed fades out on the way to the record
  const [recordLeaving, setRecordLeaving] = useState(false); // record fades out on the way to the unseen
  const [blackout, setBlackout] = useState(dev === 'panopticon'); // the screen is held in darkness
  const [cleared, setCleared] = useState(false); // the fog has been told to clear completely
  const [refogged, setRefogged] = useState(false); // ... and then to come back for the ending
  const onFog = useCallback(() => setRefogged(true), []);
  const movingOn = useRef(false);
  const [intro, setIntro] = useState(FOG.start);
  const [progress, setProgress] = useState(0); // 0..1 through the feed

  // Opening reveal: begin dense, then thin out to the resting level.
  useEffect(() => {
    const t = window.setTimeout(() => setIntro(FOG.rest), FOG.clearDelayMs);
    return () => window.clearTimeout(t);
  }, []);

  // Have the transition's art and the first post ready before "Step inside" is clicked.
  useEffect(() => preloadOpening([sharedPosts[0].image]), []);

  // Stable so the memoized Feed doesn't re-render on every fog change.
  const onProgress = useCallback((p: number) => {
    const q = Math.round(p * 100) / 100;
    setProgress((prev) => (FOG.ratchet ? Math.max(prev, q) : q));
  }, []);
  const onReveal = useCallback(() => setRevealed(true), []);
  const onDone = useCallback(() => setPhase('feed'), []);
  // Feed -> observation history: fade the feed out, bank any running time-on-screen, then switch.
  const onFinish = useCallback(() => {
    setLeaving(true);
    window.setTimeout(() => {
      window.dispatchEvent(new Event('glasshouse:flush'));
      window.scrollTo({ top: 0, behavior: 'instant' });
      setPhase('record');
    }, 1100);
  }, []);

  if (devPosts) return <PostPreview />;

  const inFeed = phase !== 'landing';
  // Observation history -> the unseen: fade to black, hold, then bring the light up on the scene.
  const onRecordComplete = useCallback(() => {
    if (movingOn.current) return;
    movingOn.current = true;
    setRecordLeaving(true);
    setBlackout(true);
    window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'instant' });
      setPhase('panopticon');
    }, FOG.toSceneMs);
    window.setTimeout(() => {
      setCleared(true);
      setBlackout(false);
    }, FOG.clearAtMs);
  }, []);

  // ?dev=panopticon plays the same lights-up moment straight away.
  useEffect(() => {
    if (dev !== 'panopticon') return;
    const t = window.setTimeout(() => {
      setCleared(true);
      setBlackout(false);
    }, 1200);
    return () => window.clearTimeout(t);
  }, []);

  const density = refogged
    ? FOG.endFog
    : cleared
    ? FOG.reveal
    : inFeed
    ? FOG.rest + (FOG.end - FOG.rest) * Math.pow(progress, FOG.curve)
    : intro;

  return (
    <>
      {/* One persistent backdrop so it doesn't reset when the screen changes. */}
      <Backdrop
        density={density}
        fadeSeconds={
          refogged ? FOG.endFogSeconds : cleared ? FOG.revealSeconds : inFeed ? FOG.scrollFadeSeconds : FOG.clearSeconds
        }
        curve={cleared ? FOG.revealCurve : 'ease'}
        zoom={cleared ? FOG.revealZoom : 1.02}
        zoomSeconds={FOG.revealZoomSeconds}
      />
      {phase === 'landing' && <Landing onEnter={() => setPhase('opening')} />}
      {/* The feed mounts as soon as the transition starts (so the camera can aim at the
          real first post) but stays invisible until the transition reveals it. */}
      {(phase === 'opening' || phase === 'feed') && (
        <div className={`feed-stage${revealed && !leaving ? ' on' : ''}`}>
          <Feed onProgress={onProgress} onFinish={onFinish} />
        </div>
      )}
      {phase === 'record' && (
        <div className={`phase-wrap${recordLeaving ? ' leaving' : ''}`}>
          <Record onComplete={onRecordComplete} />
        </div>
      )}
      {phase === 'panopticon' && <Panopticon onFog={onFog} />}
      {phase === 'opening' && <OpeningTransition onReveal={onReveal} onDone={onDone} />}
      {/* Held over everything for the beat of darkness before the lights come up. */}
      <div className={`blackout${blackout ? ' on' : ''}`} aria-hidden="true" />
    </>
  );
}
