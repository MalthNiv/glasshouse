import { useState } from 'react';
import Landing from './Landing';

export default function App() {
  const [entered, setEntered] = useState(false);

  if (!entered) return <Landing onEnter={() => setEntered(true)} />;

  // Placeholder until the feed exists.
  return <main className="placeholder">Alex's profile goes here.</main>;
}
