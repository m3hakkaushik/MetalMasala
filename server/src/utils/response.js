// [L2] HTTP Fundamentals: Standardized response status codes and headers
// [L11] Request & Response Handling: Standard success and error envelopes (S5 Seam)

/**
 * Sends a standardized JSON success response.
 * @param {import('express').Response} res
 * @param {any} data - Response payload (object or array)
 * @param {object} options
 * @param {number} [options.status=200] - HTTP status code
 * @param {object|null} [options.meta=null] - Pagination or list metadata
 * @param {string|null} [options.message=null] - Optional human-readable message
 * @param {object} [options.headers={}] - Additional headers
 */
export function sendSuccess(res, data, { status = 200, meta = null, message = null, headers = {} } = {}) {
  if (status === 204) {
    // 204 No Content must not include a body
    return res.status(204).end();
  }

  // Set any extra custom headers
  for (const [key, value] of Object.entries(headers)) {
    res.setHeader(key, value);
  }

  const payload = {
    success: true,
    data,
  };

  if (meta !== null && meta !== undefined) {
    payload.meta = meta;
  }

  if (message !== null && message !== undefined) {
    payload.message = message;
  }

  return res.status(status).json(payload);
}

/**
 * Sends a standardized JSON error response following the API contract.
 * @param {import('express').Response} res
 * @param {object} options
 * @param {number} [options.status=500] - HTTP status code
 * @param {string} [options.code='INTERNAL_ERROR'] - Error code from contract
 * @param {string} [options.message='An unexpected error occurred']
 * @param {Array|null} [options.details=null] - Optional validation details
 * @param {string|null} [options.requestId=null]
 */
export function sendError(res, {
  status = 500,
  code = 'INTERNAL_ERROR',
  message = 'An unexpected error occurred',
  details = null,
  requestId = null,
} = {}) {
  const reqId = requestId || res.getHeader('X-Request-Id') || undefined;

  const errorPayload = {
    code,
    message,
  };

  if (Array.isArray(details) && details.length > 0) {
    errorPayload.details = details;
  }

  const payload = {
    success: false,
    error: errorPayload,
    ...(reqId ? { requestId: reqId } : {}),
  };

  return res.status(status).json(payload);
}
