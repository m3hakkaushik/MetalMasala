import { randomUUID } from 'node:crypto';

// [L16] Generate an ID before any middleware can return or reject the request.
export function requestId(req, res, next) {
  req.id = randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
}
