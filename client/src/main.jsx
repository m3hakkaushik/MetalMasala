import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/instrument-sans/latin-400.css';
import '@fontsource/instrument-sans/latin-500.css';
import '@fontsource/instrument-sans/latin-600.css';
import '@fontsource/instrument-sans/latin-700.css';
import '@fontsource/yatra-one/latin-400.css';
import '@fontsource/yatra-one/devanagari-400.css';
import '@fontsource/mukta/devanagari-400.css';
import '@fontsource/kalam/latin-400.css';
import { restoreSession } from './api/auth';
import { App } from './app/App';
import './styles/base.css';
import './styles/layout.css';
import './styles/storefront.css';
import './styles/commerce.css';
import './styles/admin.css';

const root = createRoot(document.getElementById('root'));

// [L41] Start the storefront and restore the session against the real API.
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
void restoreSession();
