import { Router } from 'express';
import { categoryController } from '../controllers/category.controller.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { catchAsync } from '../utils/catchAsync.js';
import {
  categoryBody,
  categoryPatch,
  identifierParams,
} from '../validators/catalogue.js';

const router = Router();

router
  .route('/')
  .get(catchAsync(categoryController.list))
  // [L17] Validate new categories after the staff role check.
  .post(
    protect,
    restrictTo('manager', 'admin'),
    validate({ body: categoryBody }),
    catchAsync(categoryController.create)
  );

router
  .route('/:id')
  .get(
    validate({ params: identifierParams }),
    catchAsync(categoryController.get)
  )
  // [L17] Validate the patch after the staff role check.
  .patch(
    protect,
    restrictTo('manager', 'admin'),
    validate({ params: identifierParams, body: categoryPatch }),
    catchAsync(categoryController.update)
  )
  // [L17] Check admin access before counting category references.
  .delete(
    protect,
    restrictTo('admin'),
    validate({ params: identifierParams }),
    catchAsync(categoryController.remove)
  );

export default router;
