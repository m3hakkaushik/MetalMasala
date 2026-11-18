// [L13] [L18] Express 4 does not forward an async controller rejection automatically.
export function catchAsync(handler) {
  return async (req, res, next, ...params) => {
    try {
      await handler(req, res, next, ...params);
    } catch (error) {
      next(error);
    }
  };
}
