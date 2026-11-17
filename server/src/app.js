import cookieParser from 'cookie-parser';
import express from 'express';
import path from 'node:path';
import apiRouter from './routes/index.js';
import healthRouter from './routes/health.routes.js';
import { requestId } from './middleware/requestId.js';
import { consoleLogger, requestLogger } from './middleware/requestLogger.js';
import { security } from './middleware/security.js';
import { rateLimits } from './middleware/rateLimit.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

const publicDir = path.resolve(import.meta.dirname, '../public');
const app = express();

// [L1] [L9] [L12] Assemble the HTTP pipeline separately from the server listener.
// [L16] Application middleware, built-in parsers, static serving, and resource routers.
app.use(requestId, requestLogger, ...consoleLogger, ...security);
app.use(
  cookieParser(),
  express.json({ limit: '10kb' }),
  express.urlencoded({ extended: true, limit: '10kb' })
);

// Keep infrastructure probes available independently of API rate limits.
app.use('/health', healthRouter);
app.use('/api/v1', rateLimits.general, apiRouter);
app.use(express.static(publicDir));

// [L18] Matching routes finish first; unknown routes and other failures converge here.
app.use(notFound);
app.use(errorHandler);

export default app;
