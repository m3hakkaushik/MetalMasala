import { ERROR_CODES } from '../config/constants.js';
import { PERMISSIONS } from '../config/permissions.js';
import { verifyAccessUser } from '../services/auth.service.js';
import { AppError } from '../utils/AppError.js';
import { catchAsync } from '../utils/catchAsync.js';

// [L36] Resolve the current account so stale role claims cannot authorize a request.
export const protect = catchAsync(async (req, _res, next) => {
  const token = req.get('authorization')?.match(/^Bearer ([^\s]+)$/i)?.[1];
  const { user } = await verifyAccessUser(token);
  req.user = user;
  next();
});

// [L17] [L32] [L37] Explicit role and permission guards share the same failure contract.
export function restrictTo(...roles) {
  return (req, _res, next) => {
    if (!req.user)
      return next(
        new AppError(401, ERROR_CODES.UNAUTHENTICATED, 'Sign in to continue')
      );
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          403,
          ERROR_CODES.FORBIDDEN,
          'You do not have permission for this action'
        )
      );
    }
    return next();
  };
}

export function requirePermission(permission) {
  return restrictTo(...PERMISSIONS[permission]);
}
