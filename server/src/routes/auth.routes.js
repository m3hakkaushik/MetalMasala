import { Router } from 'express';
import config from '../config/index.js';
import { ERROR_CODES } from '../config/constants.js';
import * as auth from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.js';
import { rateLimits } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { requireUserStore } from '../services/auth.service.js';
import { AppError } from '../utils/AppError.js';
import { catchAsync } from '../utils/catchAsync.js';
import {
  credentials,
  passwordChange,
  registration,
} from '../validators/auth.js';

const router = Router();
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  const origin = req.get('origin');
  if (origin && origin !== config.cors.origin) {
    return next(
      new AppError(403, ERROR_CODES.FORBIDDEN, 'Untrusted request origin')
    );
  }
  return next();
});
const online = (_req, _res, next) => {
  requireUserStore();
  next();
};

router.post(
  '/register',
  rateLimits.strict(),
  online,
  validate({ body: registration }),
  catchAsync(auth.register)
);
router.post(
  '/login',
  rateLimits.strict(),
  online,
  validate({ body: credentials }),
  catchAsync(auth.login)
);
router.post(
  '/refresh',
  rateLimits.strict(30),
  online,
  catchAsync(auth.refresh)
);
router.post('/logout', catchAsync(auth.logout));
router.get('/me', protect, auth.me);
router.patch(
  '/password',
  protect,
  rateLimits.strict(),
  validate({ body: passwordChange }),
  catchAsync(auth.password)
);

export default router;
