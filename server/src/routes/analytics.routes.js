import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller.js';
import { protect, requirePermission } from '../middleware/auth.js';
import { catchAsync } from '../utils/catchAsync.js';

// [L23] Admin Analytics Routes (Protected, restricted to admin)
const router = Router();

router.use(protect, requirePermission('analytics:read'));

router.get('/summary', catchAsync(analyticsController.getSummary));
router.get('/revenue', catchAsync(analyticsController.getRevenue));
router.get('/sales-by-category', catchAsync(analyticsController.getSalesByCategory));
router.get('/top-products', catchAsync(analyticsController.getTopProducts));

export default router;
