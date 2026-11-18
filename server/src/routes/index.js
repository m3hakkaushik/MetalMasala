import { Router } from 'express';
import categoryRouter from './category.routes.js';
import contactRouter from './contact.routes.js';
import healthRouter from './health.routes.js';
import newsletterRouter from './newsletter.routes.js';
import pricingRouter from './pricing.routes.js';
import productRouter from './product.routes.js';
import reviewRouter from './review.routes.js';
import cartRouter from './cart.routes.js';
import orderRouter from './order.routes.js';
import adminOrderRouter from './adminOrder.routes.js';
import analyticsRouter from './analytics.routes.js';
import aiRouter from './ai.routes.js';

const router = Router();

// [L15] Resource routers share the /api/v1 prefix applied in app.js.
// [L28] Commerce and Analytics routes (B3: Reviews, Cart, Orders, Admin Analytics, AI)
router.use('/health', healthRouter);
router.use('/categories', categoryRouter);
router.use('/products', productRouter);
router.use('/reviews', reviewRouter);
router.use('/cart', cartRouter);
router.use('/orders', orderRouter);
router.use('/admin/orders', adminOrderRouter);
router.use('/admin/analytics', analyticsRouter);
router.use('/ai', aiRouter);
router.use('/newsletter', newsletterRouter);
router.use('/contact', contactRouter);
router.use('/pricing', pricingRouter);

export default router;
