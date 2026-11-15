import { Router } from 'express';
import { createQuote } from '../controllers/pricing.controller.js';
import { validate } from '../middleware/validate.js';
import { catchAsync } from '../utils/catchAsync.js';
import { pricingBody } from '../validators/marketing.js';

const router = Router();

router.post('/quote', validate({ body: pricingBody }), catchAsync(createQuote));

export default router;
