import { quoteCart } from '../services/pricing.service.js';
import { sendSuccess } from '../utils/response.js';

export async function createQuote(req, res) {
  return sendSuccess(res, await quoteCart(req.validated.body));
}
