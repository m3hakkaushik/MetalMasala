import { Router } from 'express';
import { createSubscription } from '../controllers/newsletter.controller.js';
import { rateLimits } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { catchAsync } from '../utils/catchAsync.js';
import { newsletterBody } from '../validators/marketing.js';

const router = Router();

// [L17] Count attempts before body validation and persistence.
router.post(
  '/',
  rateLimits.strict(),
  validate({ body: newsletterBody }),
  catchAsync(createSubscription)
);

export default router;
