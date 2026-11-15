import config from '../config/index.js';
import { ERROR_CODES as codes } from '../config/constants.js';
import { AppError } from '../utils/AppError.js';
import { sendError } from '../utils/response.js';

function validationDetails(errors = {}) {
  return Object.entries(errors).map(([field, error]) => ({
    field: error?.path ?? field,
    message: error?.message ?? 'Invalid value',
  }));
}

// [L18] Convert upstream infrastructure errors to the stable API error contract.
export function normalizeError(error) {
  if (error instanceof AppError) return error;
  if (error?.name === 'CastError')
    return new AppError(400, codes.INVALID_ID, 'Invalid resource identifier');
  if (error?.name === 'ValidationError') {
    const details = validationDetails(error.errors);
    return new AppError(
      422,
      codes.VALIDATION_ERROR,
      details[0]?.message ?? 'Validation failed',
      details
    );
  }
  if (error?.code === 11000) {
    const fields = Object.keys(error.keyValue ?? error.keyPattern ?? {});
    return new AppError(
      409,
      codes.CONFLICT,
      fields.length
        ? `A record already uses this ${fields.join(', ')}`
        : 'Duplicate record'
    );
  }
  if (error?.name === 'TokenExpiredError')
    return new AppError(401, codes.TOKEN_EXPIRED, 'Access token expired');
  if (['JsonWebTokenError', 'NotBeforeError'].includes(error?.name)) {
    return new AppError(401, codes.UNAUTHENTICATED, 'Invalid access token');
  }
  if (error?.type === 'entity.parse.failed' || error instanceof URIError) {
    return new AppError(
      400,
      codes.BAD_REQUEST,
      error instanceof URIError
        ? 'Malformed request path'
        : 'Malformed JSON payload in request body'
    );
  }
  if (error?.type === 'entity.too.large') {
    return new AppError(413, codes.BAD_REQUEST, 'Request body exceeds 10 KB');
  }
  if (
    [
      'encoding.unsupported',
      'charset.unsupported',
      'request.size.invalid',
      'request.aborted',
    ].includes(error?.type)
  ) {
    return new AppError(
      error.status === 415 ? 415 : 400,
      codes.BAD_REQUEST,
      'Unsupported or invalid request body'
    );
  }
  return null;
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const operational = normalizeError(error);
  if (operational)
    return sendError(res, {
      ...operational,
      message: operational.message,
      requestId: req.id,
    });

  console.error(`[${req.id ?? 'no-request-id'}]`, error?.stack ?? error);
  const development = config.server.env === 'development';
  return sendError(res, {
    status: 500,
    code: codes.INTERNAL_ERROR,
    message: 'An unexpected error occurred on the server',
    requestId: req.id,
    stack: development ? error?.stack : undefined,
  });
}
