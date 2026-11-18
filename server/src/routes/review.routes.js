import { Router } from 'express';
import mongoose from 'mongoose';
import config from '../config/index.js';
import { ERROR_CODES } from '../config/constants.js';
import { reviewController } from '../controllers/review.controller.js';
import { protect } from '../middleware/auth.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/AppError.js';

// [L28] Product Reviews Router
const router = Router({ mergeParams: true });

function reviewStoreGuard(handler) {
  return (req, res, next) => {
    if (mongoose.connection.readyState !== 1 && config.server.dataStore !== 'mongo') {
      return next(
        new AppError(
          501,
          ERROR_CODES.INTERNAL_ERROR,
          'Product reviews are scheduled for Phase 3'
        )
      );
    }
    return handler(req, res, next);
  };
}

router
  .route('/')
  .get(reviewStoreGuard(catchAsync(reviewController.list)))
  .post(protect, reviewStoreGuard(catchAsync(reviewController.create)));

router
  .route('/:id')
  .delete(protect, reviewStoreGuard(catchAsync(reviewController.remove)));

export default router;
