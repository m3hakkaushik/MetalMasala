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
import { mockGroups } from './api/config';
import { restoreSession } from './api/auth';
import { setApiSetup } from './api/networkReady';
import { App } from './app/App';
import './styles/base.css';
import './styles/layout.css';
import './styles/storefront.css';
import './styles/commerce.css';
import './styles/admin.css';

const root = createRoot(document.getElementById('root'));

async function prepareApi() {
  if (import.meta.env.VITE_MOCK_GROUPS !== '' && mockGroups.length) {
    const { startMocks } = await import('./mocks/browser');
    await startMocks(mockGroups);
  }
}

const apiSetup = prepareApi();
setApiSetup(apiSetup);

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
void restoreSession();

try {
  await apiSetup;
} catch (error) {
  console.error('The storefront could not start.', error);
  root.render(
    <main className="site-width empty-state">
      <h1>The storefront couldn’t start</h1>
      <p>Reload the page to try again.</p>
      <button
        type="button"
        className="button button--primary"
        onClick={() => window.location.reload()}
      >
        Reload page
      </button>
    </main>,
  );
}
