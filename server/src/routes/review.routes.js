import { Router } from 'express';
import { ERROR_CODES } from '../config/constants.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../utils/AppError.js';
import { productIdParams } from '../validators/catalogue.js';

// [L15] [L16] Router-level validation can see the product ID inherited from the parent route.
const router = Router({ mergeParams: true });
router.use(validate({ params: productIdParams }));

function pendingReview(_req, _res, next) {
  next(
    new AppError(
      501,
      ERROR_CODES.INTERNAL_ERROR,
      'Product reviews are scheduled for Phase 3'
    )
  );
}

router.route('/').get(pendingReview).post(protect, pendingReview);

export default router;
