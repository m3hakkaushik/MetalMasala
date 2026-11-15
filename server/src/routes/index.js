import { Router } from 'express';
import categoryRouter from './category.routes.js';
import contactRouter from './contact.routes.js';
import healthRouter from './health.routes.js';
import newsletterRouter from './newsletter.routes.js';
import pricingRouter from './pricing.routes.js';
import productRouter from './product.routes.js';

const router = Router();

// [L15] Resource routers share the /api/v1 prefix applied in app.js.
router.use('/health', healthRouter);
router.use('/categories', categoryRouter);
router.use('/products', productRouter);
router.use('/newsletter', newsletterRouter);
router.use('/contact', contactRouter);
router.use('/pricing', pricingRouter);

export default router;
