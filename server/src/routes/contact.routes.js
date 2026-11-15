import { Router } from 'express';
import { createContact } from '../controllers/contact.controller.js';
import { rateLimits } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { catchAsync } from '../utils/catchAsync.js';
import { contactBody } from '../validators/marketing.js';

const router = Router();

// [L17] The contact form has its own stricter allowance.
router.post(
  '/',
  rateLimits.strict(3),
  validate({ body: contactBody }),
  catchAsync(createContact)
);

export default router;
