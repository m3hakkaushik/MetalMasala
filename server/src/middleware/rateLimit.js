import { rateLimit } from 'express-rate-limit';
import config from '../config/index.js';
import { ERROR_CODES } from '../config/constants.js';
import { AppError } from '../utils/AppError.js';

// [L16] [L17] Reuse the limiter settings while keeping independent route-level counters.
export function createRateLimit({
  limit,
  windowMs = config.rateLimit.windowMs,
}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, _res, next) =>
      next(
        new AppError(
          429,
          ERROR_CODES.RATE_LIMITED,
          'Too many requests. Try again later.'
        )
      ),
  });
}

export const rateLimits = Object.freeze({
  general: createRateLimit({ limit: config.rateLimit.max }),
  strict: (limit = 5) => createRateLimit({ limit }),
});
