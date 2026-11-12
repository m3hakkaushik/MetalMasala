import { delay, http, HttpResponse } from 'msw';
import { apiUrl } from '../api/config';

const base = new URL(apiUrl, window.location.origin).href.replace(/\/$/, '');

export const endpoint = (method, path, handler) =>
  http[method](base + path, async (context) => {
    await delay(250 + Math.floor(Math.random() * 451));
    return handler(context);
  });

export function success(data, { status = 200, meta, message, headers } = {}) {
  return HttpResponse.json(
    { success: true, data, meta, message },
    { status, headers },
  );
}

export const noContent = (headers) =>
  new HttpResponse(null, { status: 204, headers });

export function failure(status, code, message, details) {
  const requestId = crypto.randomUUID();
  return HttpResponse.json(
    { success: false, error: { code, message, details }, requestId },
    { status, headers: { 'X-Request-Id': requestId } },
  );
}

export function invalid(field, message) {
  return failure(422, 'VALIDATION_ERROR', message, [{ field, message }]);
}

export function notFound(resource) {
  return failure(404, 'NOT_FOUND', `${resource} not found.`);
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
