import config from '../config/index.js';
import { DEV_USER_IDS, ERROR_CODES, ROLES } from '../config/constants.js';
import { AppError } from '../utils/AppError.js';

// STUB until B4 — replaced by JWT verification.
export function protect(req, res, next) {
  if (config.server.env === 'production') {
    return next(
      new AppError(
        501,
        ERROR_CODES.UNAUTHENTICATED,
        'Authentication is unavailable in this environment'
      )
    );
  }

  const role = req.get('x-dev-role') ?? 'customer';
  if (!ROLES.includes(role)) {
    return next(
      new AppError(401, ERROR_CODES.UNAUTHENTICATED, 'Unknown development role')
    );
  }
  req.user = { id: DEV_USER_IDS[role], role };
  return next();
}

// [L17] The role check is shared by the development and eventual JWT implementations.
export function restrictTo(...roles) {
  return (req, res, next) => {
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
