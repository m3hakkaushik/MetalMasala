import { Router } from 'express';
import healthRouter from './health.routes.js';
import categoryRouter from './category.routes.js';
import productRouter from './product.routes.js';

// [L9] Introduction to Express.js: Central router index mounting resource sub-routers

const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/categories', categoryRouter);
apiRouter.use('/products', productRouter);

export default apiRouter;
