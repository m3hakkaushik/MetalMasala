import { saveMessage } from '../services/contact.service.js';
import { sendSuccess } from '../utils/response.js';

export async function createContact(req, res) {
  const { id } = await saveMessage(req.validated.body);
  return sendSuccess(
    res,
    { id },
    { status: 201, message: 'Your message was sent.' }
  );
}
