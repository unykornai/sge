/**
 * MSW Browser Worker Setup
 * 
 * Initializes the service worker for intercepting API requests in demo mode.
 */

import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

// Create the worker
export const worker = setupWorker(...handlers);

// Export for conditional initialization
export default worker;
