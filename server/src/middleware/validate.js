import { AppError } from '../utils/AppError.js';
import { ERROR_CODES } from '../config/constants.js';

// [L16] [L17] Pass normalized inputs to controllers and send Zod failures to the error middleware.
export function validate(schemas) {
  return (req, res, next) => {
    const details = [];
    const input = {};
    for (const [source, schema] of Object.entries(schemas)) {
      const result = schema.safeParse(req[source] ?? {});
      if (result.success) {
        input[source] = result.data;
        continue;
      }
      for (const issue of result.error.issues) {
        details.push({
          field: issue.path.join('.') || source,
          message: issue.message,
        });
      }
    }
    if (details.length) {
      return next(
        new AppError(
          422,
          ERROR_CODES.VALIDATION_ERROR,
          details[0].message,
          details
        )
      );
    }
    req.validated = { ...req.validated, ...input };
    return next();
  };
}
