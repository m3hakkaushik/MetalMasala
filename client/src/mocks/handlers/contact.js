import { contactSchema } from '../../api/validation';
import { readDb, saveDb } from '../db';
import { rateLimit } from '../rateLimit';
import { endpoint, success } from '../http';
import { newId, parseBody, timestamp } from '../validation';

const limit = rateLimit(3);

export const contactHandlers = [
  endpoint('post', '/contact', async ({ request }) => {
    const limited = limit();
    if (limited) return limited;
    const body = await parseBody(request, contactSchema);
    if (body.error) return body.error;
    const { contacts } = readDb();
    const id = newId();
    contacts.push({ id, ...body.data, createdAt: timestamp() });
    saveDb({ contacts });
    return success({ id }, { status: 201, message: 'Your message was sent.' });
  }),
];
