import { Router } from 'express';
import { aiController } from '../controllers/ai.controller.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { rateLimits } from '../middleware/rateLimit.js';
import { catchAsync } from '../utils/catchAsync.js';

// [L43] AI Routes (Stylist & Copywriter)
const router = Router();

router.post('/stylist', rateLimits.strict(10), catchAsync(aiController.stylist));
router.post(
  '/describe',
  protect,
  restrictTo('manager', 'admin'),
  rateLimits.strict(10),
  catchAsync(aiController.describe)
);

export default router;
