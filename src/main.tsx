import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { applyTheme, getTheme } from './lib/theme';
import './index.css';

applyTheme(getTheme()); /* antes de pintar: evita el parpadeo claro/oscuro */

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
