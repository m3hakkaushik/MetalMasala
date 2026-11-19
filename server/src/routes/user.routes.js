import { Router } from 'express';
import { z } from 'zod';
import * as users from '../controllers/user.controller.js';
import { protect, requirePermission } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { catchAsync } from '../utils/catchAsync.js';
import {
  address,
  addressPatch,
  objectId,
  profile,
  roleChange,
  statusChange,
  userQuery,
} from '../validators/users.js';

const router = Router();
const addressId = z.object({ addressId: objectId });
const productId = z.object({ productId: objectId });
router.use('/me', protect);
router.get('/me', users.me);
router.patch('/me', validate({ body: profile }), catchAsync(users.update));
router.post(
  '/me/addresses',
  validate({ body: address }),
  catchAsync(users.addAddress)
);
router.patch(
  '/me/addresses/:addressId',
  validate({ params: addressId, body: addressPatch }),
  catchAsync(users.updateAddress)
);
router.delete(
  '/me/addresses/:addressId',
  validate({ params: addressId }),
  catchAsync(users.deleteAddress)
);
router.get('/me/wishlist', catchAsync(users.wishlist));
router.post(
  '/me/wishlist/:productId',
  validate({ params: productId }),
  catchAsync(users.addWishlist)
);
router.delete(
  '/me/wishlist/:productId',
  validate({ params: productId }),
  catchAsync(users.removeWishlist)
);

export const adminUserRouter = Router();
const id = z.object({ id: objectId });
adminUserRouter.use(protect, requirePermission('user:manage'));
adminUserRouter.get(
  '/',
  validate({ query: userQuery }),
  catchAsync(users.list)
);
adminUserRouter.patch(
  '/:id/role',
  validate({ params: id, body: roleChange }),
  catchAsync(users.role)
);
adminUserRouter.patch(
  '/:id/status',
  validate({ params: id, body: statusChange }),
  catchAsync(users.status)
);

export default router;
