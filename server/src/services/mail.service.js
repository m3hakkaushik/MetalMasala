import { debugData } from '../utils/logger.js';

// Local demo delivery. Log the rendered message without contact details or session data.
export function sendMail({ userId, subject, text }) {
  debugData('Mail demo for user %s — %s — %s', userId, subject, text);
}
