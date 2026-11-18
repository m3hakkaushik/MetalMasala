import { subscribe } from '../services/newsletter.service.js';
import { sendSuccess } from '../utils/response.js';

export async function createSubscription(req, res) {
  const { record, created } = await subscribe(req.validated.body);
  return sendSuccess(
    res,
    { email: record.email },
    {
      status: created ? 201 : 200,
      message: created ? 'You’re on the drop list.' : 'Already on the list',
    }
  );
}
