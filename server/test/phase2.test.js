import './helpers/environment.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import request from 'supertest';
import app from '../src/app.js';
import {
  contactRepo,
  subscriberRepo,
} from '../src/repositories/json/records.repo.js';

const api = request(app);
const at = '/api/v1';
const staff = (method, uri, role = 'manager') =>
  api[method](at + uri).set('x-dev-role', role);

function checkError(response, status, code) {
  assert.equal(response.status, status);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error.code, code);
  assert.ok(response.headers['x-request-id']);
  assert.equal(response.body.requestId, response.headers['x-request-id']);
}

test('correlation headers cover malformed JSON, unknown routes, and oversized bodies', async () => {
  checkError(await api.get(at + '/absent'), 404, 'NOT_FOUND');
  checkError(
    await api
      .post(at + '/contact')
      .type('json')
      .send('{ broken'),
    400,
    'BAD_REQUEST'
  );
  checkError(
    await api.post(at + '/contact').send({ message: 'x'.repeat(11_000) }),
    413,
    'BAD_REQUEST'
  );
  checkError(
    await api.get(at + '/products?minPrice=800&maxPrice=500'),
    422,
    'VALIDATION_ERROR'
  );

  const preflight = await api
    .options(at + '/newsletter')
    .set('Origin', 'http://localhost:5173')
    .set('Access-Control-Request-Method', 'POST');
  assert.equal(preflight.status, 204);
  assert.ok(preflight.headers['x-request-id']);
  assert.equal(
    preflight.headers['access-control-allow-origin'],
    'http://localhost:5173'
  );
  assert.equal(preflight.headers['x-content-type-options'], 'nosniff');
});

test('role checks precede validation and reserve catalogue deletion for admins', async () => {
  checkError(await api.post(at + '/products').send({}), 403, 'FORBIDDEN');
  checkError(
    await staff('post', '/products').send({}),
    422,
    'VALIDATION_ERROR'
  );
  checkError(
    await staff('get', '/products/export.csv', 'toString'),
    401,
    'UNAUTHENTICATED'
  );
  checkError(
    await staff('delete', '/products/chandni-chowk-jhumka'),
    403,
    'FORBIDDEN'
  );
  checkError(
    await api.get(at + '/products/example-id/reviews'),
    501,
    'INTERNAL_ERROR'
  );
});

test('concurrent catalogue creates preserve all writes and enforce normalized slugs', async () => {
  const product = {
    name: 'Phase Two Test Ring',
    category: 'rings',
    price: 899,
  };
  const responses = await Promise.all([
    staff('post', '/products').send(product),
    staff('post', '/products').send(product),
  ]);
  assert.ok(
    responses.every((response) => response.status === 201),
    JSON.stringify(responses.map((r) => r.body))
  );
  assert.deepEqual(responses.map(({ body }) => body.data.slug).sort(), [
    'phase-two-test-ring',
    'phase-two-test-ring-2',
  ]);
  const original = responses.find(
    ({ body }) => body.data.slug === 'phase-two-test-ring'
  ).body.data;

  const patch = await staff('patch', '/products/' + original.id).send({
    slug: 'renamed-test-ring',
  });
  assert.equal(patch.status, 200);
  checkError(
    await staff('post', '/products').send({
      ...product,
      slug: 'Renamed Test Ring',
    }),
    409,
    'CONFLICT'
  );

  const replacement = await staff('post', '/products').send(product);
  assert.equal(replacement.status, 201);
  assert.notEqual(replacement.body.data.id, original.id);
  const removed = await staff(
    'delete',
    '/products/' + replacement.body.data.id,
    'admin'
  );
  assert.equal(removed.status, 204);
  assert.equal(removed.text, '');
});

test('newsletter registration is normalized, idempotent, and rate-limited', async () => {
  const results = await Promise.all([
    api.post(at + '/newsletter').send({ email: ' SIGNUP@EXAMPLE.TEST ' }),
    api.post(at + '/newsletter').send({ email: 'signup@example.test' }),
  ]);
  assert.deepEqual(results.map(({ status }) => status).sort(), [200, 201]);
  assert.equal(
    results.find(({ status }) => status === 200).body.message,
    'Already on the list'
  );
  assert.equal((await subscriberRepo.findMany()).total, 1);
  for (let attempt = 0; attempt < 3; attempt++) {
    checkError(
      await api.post(at + '/newsletter').send({ email: 'bad' }),
      422,
      'VALIDATION_ERROR'
    );
  }
  checkError(
    await api.post(at + '/newsletter').send({ email: 'bad' }),
    429,
    'RATE_LIMITED'
  );
});

test('contact persists a validated submission and uses its own rate limit', async () => {
  const result = await api.post(at + '/contact').send({
    name: 'Demo Customer',
    email: 'customer@example.test',
    message: 'Can you confirm how this piece is made?',
  });
  assert.equal(result.status, 201);
  const record = await contactRepo.findById(result.body.data.id);
  assert.equal(record.name, 'Demo Customer');
  assert.equal(record.email, 'customer@example.test');
  checkError(
    await api.post(at + '/contact').send({ message: 'Short' }),
    422,
    'VALIDATION_ERROR'
  );
  checkError(
    await api.post(at + '/contact').send({ message: 'Short' }),
    422,
    'VALIDATION_ERROR'
  );
  checkError(
    await api.post(at + '/contact').send({ message: 'Short' }),
    429,
    'RATE_LIMITED'
  );
});

test('pricing looks up product IDs and ignores prices supplied by callers', async () => {
  const product = (await api.get(at + '/products/chandni-chowk-jhumka')).body
    .data;
  const quote = await api.post(at + '/pricing/quote').send({
    items: [{ productId: product.id, qty: 1, price: 1 }],
    paymentMethod: 'cod',
  });
  assert.equal(quote.status, 200);
  assert.equal(quote.body.data.subtotal, 799);
  assert.equal(quote.body.data.total, 927);

  for (const items of [
    [{ productId: 'unknown', qty: 1 }],
    [{ productId: product.id, qty: 0 }],
  ]) {
    const invalid = await api
      .post(at + '/pricing/quote')
      .send({ items, paymentMethod: 'upi_mock' });
    checkError(invalid, 422, 'VALIDATION_ERROR');
    assert.ok(invalid.body.error.details[0].field.startsWith('items.0.'));
  }
});
