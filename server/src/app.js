import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import config from './config/index.js';
import { requestLogger } from './utils/logger.js';
import { sendError } from './utils/response.js';
import apiRouter from './routes/index.js';
import healthRouter from './routes/health.routes.js';

// [L1] Introduction to Backend Development: Layered Express app (Routes -> Repositories -> JSON Store)
// [L9] Introduction to Express.js: Application skeleton, middleware pipeline, static serving, and CORS

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

const app = express();

// 1. Cross-Origin Resource Sharing (CORS) configured for frontend client
app.use(
  cors({
    origin: config.clientOrigin,
    credentials: true,
  })
);

// 2. Body parsers with size limit
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// 3. Static asset serving [L9]
app.use(express.static(publicDir));

// 4. Request logging and X-Request-Id header [L5, L8]
app.use(requestLogger);

// 5. System Health endpoint at root /health for infrastructure probes
app.use('/health', healthRouter);

// 6. Mount Versioned API routes under /api/v1
app.use('/api/v1', apiRouter);

// 7. 404 Route Not Found handler
app.use((req, res) => {
  return sendError(res, {
    status: 404,
    code: 'NOT_FOUND',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// 8. Global Express Error Handler
app.use((err, req, res, _next) => {
  // Catch syntax errors from malformed JSON bodies
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return sendError(res, {
      status: 400,
      code: 'BAD_REQUEST',
      message: 'Malformed JSON payload in request body',
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = config.isProduction && statusCode === 500
    ? 'An unexpected error occurred on the server'
    : err.message || 'Internal server error';

  return sendError(res, {
    status: statusCode,
    code: err.code || 'INTERNAL_ERROR',
    message,
    details: err.details || null,
  });
});

export default app;
