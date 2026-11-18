import { Router } from 'express';
import { cartController } from '../controllers/cart.controller.js';
import { protect } from '../middleware/auth.js';
import { catchAsync } from '../utils/catchAsync.js';

// [L28] Cart Routes (Requires Login)
const router = Router();

router.use(protect);

router
  .route('/')
  .get(catchAsync(cartController.get))
  .delete(catchAsync(cartController.clear));

router.post('/items', catchAsync(cartController.addItem));
router.post('/merge', catchAsync(cartController.merge));

router
  .route('/items/:productId')
  .patch(catchAsync(cartController.updateItem))
  .delete(catchAsync(cartController.removeItem));

export default router;
