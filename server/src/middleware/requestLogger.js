import morgan from 'morgan';
import config from '../config/index.js';
import { appendAccessLog, debugHttp } from '../utils/logger.js';

const format = config.log.format;
export const consoleLogger = format === 'silent' ? [] : [morgan(format)];

// [L16] Record request metadata only. [L33] Never log bodies or auth headers.
export function requestLogger(req, res, next) {
  if (format !== 'silent') {
    const start = performance.now();
    res.on('finish', () => {
      const duration = Math.round(performance.now() - start);
      const line = `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms [requestId=${req.id}]`;
      debugHttp(line);
      void appendAccessLog(line);
    });
  }
  next();
}
