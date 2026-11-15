import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
// Self-hosted fonts (bundled by Vite, no third-party requests): Cinzel for the brand, Jost for the UI.
import '@fontsource/cinzel/latin-400.css';
import '@fontsource-variable/jost/wght.css';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
