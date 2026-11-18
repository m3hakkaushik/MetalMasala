import './helpers/environment.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeError } from '../src/middleware/errorHandler.js';
import { AppError } from '../src/utils/AppError.js';

const cases = [
  [{ name: 'CastError' }, 400, 'INVALID_ID'],
  [
    {
      name: 'ValidationError',
      errors: { price: { path: 'price', message: 'Price must be positive' } },
    },
    422,
    'VALIDATION_ERROR',
  ],
  [{ code: 11000, keyValue: { slug: 'secret-value' } }, 409, 'CONFLICT'],
  [{ name: 'JsonWebTokenError' }, 401, 'UNAUTHENTICATED'],
  [{ name: 'TokenExpiredError' }, 401, 'TOKEN_EXPIRED'],
  [{ type: 'entity.parse.failed' }, 400, 'BAD_REQUEST'],
  [{ type: 'entity.too.large' }, 413, 'BAD_REQUEST'],
  [new URIError('invalid path'), 400, 'BAD_REQUEST'],
];

test('maps database, JWT, and Express errors to contract codes', () => {
  for (const [error, status, code] of cases) {
    const normalized = normalizeError(error);
    assert.equal(normalized.status, status);
    assert.equal(normalized.code, code);
    assert.ok(!normalized.message.includes('secret-value'));
  }
  assert.deepEqual(normalizeError(cases[1][0]).details, [
    { field: 'price', message: 'Price must be positive' },
  ]);
});

test('keeps operational errors and rejects unknown errors from the public mapping', () => {
  const error = new AppError(404, 'NOT_FOUND', 'Missing');
  assert.equal(normalizeError(error), error);
  assert.equal(normalizeError(new Error('private details')), null);
});
