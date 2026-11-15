import { Router } from 'express';
import { productController } from '../controllers/product.controller.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { productService } from '../services/product.service.js';
import { catchAsync } from '../utils/catchAsync.js';
import {
  identifierParams,
  productBody,
  productPatch,
  productQuery,
  slugParams,
} from '../validators/catalogue.js';
import reviewsRouter from './review.routes.js';

const router = Router();

// [L15] Mount specific routes before the slug parameter and preload a product once per detail request.
router.get(
  '/export.csv',
  protect,
  restrictTo('manager', 'admin'),
  catchAsync(productController.exportCsv)
);
router.use('/:productId/reviews', reviewsRouter);
router.param(
  'slug',
  catchAsync(async (req, _res, next, slug) => {
    req.product = await productService.bySlug(slug);
    next();
  })
);

router
  .route('/')
  .get(validate({ query: productQuery }), catchAsync(productController.list))
  // [L17] Check staff access before validating a write payload.
  .post(
    protect,
    restrictTo('manager', 'admin'),
    validate({ body: productBody }),
    catchAsync(productController.create)
  );

router.get('/:slug', validate({ params: slugParams }), productController.get);

router
  .route('/:id')
  // [L17] Staff access is checked before the patch body is validated.
  .patch(
    protect,
    restrictTo('manager', 'admin'),
    validate({ params: identifierParams, body: productPatch }),
    catchAsync(productController.update)
  )
  // [L17] Admin access is required before the resource is looked up.
  .delete(
    protect,
    restrictTo('admin'),
    validate({ params: identifierParams }),
    catchAsync(productController.remove)
  );

export default router;
