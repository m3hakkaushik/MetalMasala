import { setupWorker } from 'msw/browser';
import { resetDb } from './db';
import { selectMockHandlers } from './registry';

export async function startMocks(groups) {
  if (new URLSearchParams(window.location.search).get('resetMocks') === '1')
    resetDb();
  const enabledHandlers = selectMockHandlers(groups);
  if (!enabledHandlers.length) return;
  const worker = setupWorker(...enabledHandlers);
  await worker.start({ onUnhandledRequest: 'bypass', quiet: true });
}
