import { timeout } from './deferred';
import cuid from './nested/index';
import { defer } from 'rsvp';

self.addEventListener('message', async function registration(details) {
  const config = details.data.config || { };
  const id = cuid();

  self.removeEventListener('message', registration);
  self.postMessage({ id });

  while (true) {
    await timeout(2e3);
    console.log('waited');
  }
});

export function add() {
  return 'from add...';
}
