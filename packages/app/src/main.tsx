import React from 'react';
import ReactDOM from 'react-dom/client';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Missing #root element');
}

// In dev, aggressively unregister any existing service workers so stale caches
// cannot cause a blank screen when switching between preview/build/dev.
// BUT keep the MSW service worker if in demo mode.
if (import.meta.env.DEV && import.meta.env.VITE_DEMO_MODE !== 'true' && 'serviceWorker' in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) => Promise.all(registrations.map((r) => r.unregister())))
    .catch(() => {
      // Best-effort only.
    });
}

const root = ReactDOM.createRoot(rootEl);

function FatalError({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  return (
    <div style={{ padding: 20, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}>
      <h2 style={{ marginBottom: 12, color: '#FF5252' }}>App failed to start</h2>
      <div style={{ whiteSpace: 'pre-wrap', color: '#FFFFFF', marginBottom: 12 }}>{message}</div>
      {stack && <pre style={{ whiteSpace: 'pre-wrap', color: '#B0BEC5' }}>{stack}</pre>}
      <p style={{ marginTop: 16, color: '#B0BEC5' }}>
        Tip: open DevTools Console for the full error.
      </p>
    </div>
  );
}

async function startApp() {
  // Initialize demo mode if enabled (MSW mock API)
  if (import.meta.env.VITE_DEMO_MODE === 'true') {
    const { initDemoMode } = await import('./mocks');
    await initDemoMode();
  }

  root.render(
    <React.StrictMode>
      <div style={{ padding: 20, color: '#B0BEC5' }}>Starting...</div>
    </React.StrictMode>
  );

  try {
    const [{ config }, { default: App }] = await Promise.all([import('./wagmi'), import('./App')]);
    const Router = import.meta.env.VITE_DEMO_MODE === 'true' ? HashRouter : BrowserRouter;
    root.render(
      <React.StrictMode>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <Router>
              <App />
            </Router>
          </QueryClientProvider>
        </WagmiProvider>
      </React.StrictMode>
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Fatal app bootstrap error:', error);
    root.render(
      <React.StrictMode>
        <FatalError error={error} />
      </React.StrictMode>
    );
  }
}

startApp();
