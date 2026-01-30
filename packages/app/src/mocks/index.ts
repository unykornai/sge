/**
 * Demo Mode Initialization
 * 
 * Starts MSW service worker in demo mode for GitHub Pages.
 * Call this before React renders.
 */

export async function initDemoMode(): Promise<void> {
  // Only enable in demo mode
  if (import.meta.env.VITE_DEMO_MODE !== 'true') {
    console.log('[SGE] Demo mode disabled');
    return;
  }

  console.log('[SGE] 🎭 Demo mode enabled - starting mock API');

  const { worker } = await import('./browser');
  
  await worker.start({
    onUnhandledRequest: 'bypass', // Don't mock unhandled requests (static assets, etc.)
    serviceWorker: {
      url: '/mockServiceWorker.js',
    },
  });

  console.log('[SGE] ✓ Mock API ready');
}

export default initDemoMode;
