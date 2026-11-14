import { useState } from 'react';

export default function Landing({ onEnter }: { onEnter: () => void }) {
  const [leaving, setLeaving] = useState(false);

  const enter = () => {
    setLeaving(true);
    window.setTimeout(onEnter, 1200);
  };

  return (
    <main className={`landing${leaving ? ' leaving' : ''}`}>
      <div className="fog" aria-hidden="true">
        <span className="cloud c1" />
        <span className="cloud c2" />
        <span className="cloud c3" />
        <span className="cloud c4" />
        <span className="cloud c5" />
        <span className="cloud c6" />
      </div>
      <div className="frost" aria-hidden="true" />

      <div className="content">
        <h1 className="title" aria-label="Glasshouse">
          <span className="t-blur" aria-hidden="true">Glasshouse</span>
          <span className="t-sharp" aria-hidden="true">Glasshouse</span>
        </h1>
        <button className="enter" onClick={enter}>
          Step inside
        </button>
      </div>
    </main>
  );
}
