import { createSerialQueue } from '../utils/serialQueue.js';

const serialize = createSerialQueue();

// [L14] Serialize catalogue mutations across both JSON collections while checking slugs and references.
export const catalogueWrite = (operation) => serialize('catalogue', operation);
