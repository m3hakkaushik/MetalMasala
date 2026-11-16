import { readDb, saveDb } from '../db';
import { rateLimit } from '../rateLimit';
import { endpoint, failure, invalid, readJson, success } from '../http';

const limit = rateLimit(5);

export const newsletterHandlers = [
  endpoint('post', '/newsletter', async ({ request }) => {
    const limited = limit();
    if (limited) return limited;
    const body = await readJson(request);
    if (body === undefined)
      return failure(
        400,
        'BAD_REQUEST',
        'The request body must be valid JSON.',
      );
    const email =
      typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return invalid('email', 'Enter a valid email address.');
    const db = readDb();
    if (db.subscribers.includes(email))
      return success({ email }, { message: 'Already on the list' });
    db.subscribers.push(email);
    saveDb({ subscribers: db.subscribers });
    return success(
      { email },
      { status: 201, message: 'You’re on the drop list.' },
    );
  }),
];
