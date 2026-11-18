import { Router } from 'express';
import { orderController } from '../controllers/order.controller.js';
import { protect } from '../middleware/auth.js';
import { catchAsync } from '../utils/catchAsync.js';

// [L28] Orders Router (Requires Authentication)
const router = Router();

router.use(protect);

router
  .route('/')
  .post(catchAsync(orderController.create))
  .get(catchAsync(orderController.list));

router.get('/:id', catchAsync(orderController.get));
router.patch('/:id/cancel', catchAsync(orderController.cancel));

export default router;
