import { ERROR_CODES } from '../config/constants.js';
import { AppError } from '../utils/AppError.js';

// [L18] An unmatched path enters the same error path as a missing resource.
export function notFound(req, res, next) {
  next(
    new AppError(404, ERROR_CODES.NOT_FOUND, `Cannot ${req.method} ${req.path}`)
  );
}
