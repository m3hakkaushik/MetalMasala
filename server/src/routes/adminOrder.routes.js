import { Router } from 'express';
import { orderController } from '../controllers/order.controller.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { catchAsync } from '../utils/catchAsync.js';

// [L28] Admin Orders Router (Requires manager or admin role)
const router = Router();

router.use(protect, restrictTo('manager', 'admin'));

router.get('/', catchAsync(orderController.listAdmin));
router.patch('/:id/status', catchAsync(orderController.updateStatus));

export default router;
