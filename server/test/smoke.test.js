import './helpers/environment.js';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { bearer, connectTestUsers } from './helpers/auth.js';
import app from '../src/app.js';
import { categoryRepo } from '../src/repositories/json/category.repo.js';
import { productRepo } from '../src/repositories/json/product.repo.js';

// [L8] API Testing & Debugging: Automated smoke test suite using node:test and supertest

describe('Metal Masala — API Smoke Test Suite [L8]', () => {
  let disconnect;
  before(async () => {
    disconnect = await connectTestUsers();
    // Ensure stores have initialized data
    await categoryRepo.findMany();
    await productRepo.findMany();
  });

  after(() => disconnect?.());

  it('GET /health returns 200 and healthy status [L5, L6]', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'healthy');
    assert.ok(res.body.data.uptime >= 0);
    assert.ok(res.body.data.os);
    assert.ok(res.body.data.os.platform);
  });

  it('GET /api/v1/health returns 200 on versioned route', async () => {
    const res = await request(app).get('/api/v1/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  it('GET /api/v1/categories returns category list with product counts [L10]', async () => {
    const res = await request(app).get('/api/v1/categories');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length > 0);
    const first = res.body.data[0];
    assert.ok(first.id);
    assert.ok(first.name);
    assert.ok(first.slug);
    assert.equal(typeof first.productCount, 'number');
  });

  it('GET /api/v1/products returns paginated products with metadata [L11]', async () => {
    const res = await request(app).get('/api/v1/products');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.meta);
    assert.equal(res.body.meta.page, 1);
    assert.equal(res.body.meta.limit, 12);
    assert.ok(res.body.meta.total > 0);
    assert.ok(res.headers.etag);
    assert.ok(res.headers['cache-control']);
  });

  it('GET /api/v1/products with filters respects query params [L11]', async () => {
    const res = await request(app).get(
      '/api/v1/products?category=jhumkas&minPrice=100&maxPrice=3000&sort=popular'
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    for (const p of res.body.data) {
      assert.ok(p.price >= 100 && p.price <= 3000);
    }
  });

  it('GET /api/v1/products/:slug returns 200 and supports ETag 304 [L2, L11]', async () => {
    const slug = 'chandni-chowk-jhumka';
    const res1 = await request(app).get(`/api/v1/products/${slug}`);
    assert.equal(res1.status, 200);
    assert.equal(res1.body.success, true);
    assert.equal(res1.body.data.slug, slug);

    const etag = res1.headers.etag;
    assert.ok(etag, 'ETag header must be present');

    // Conditional GET with If-None-Match
    const res2 = await request(app)
      .get(`/api/v1/products/${slug}`)
      .set('If-None-Match', etag);
    assert.equal(res2.status, 304);
  });

  it('GET /api/v1/products/:slug returns 404 for unknown slug [L2, L11]', async () => {
    const res = await request(app).get('/api/v1/products/does-not-exist');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });

  it('GET /api/v1/products/export.csv streams CSV file [L5, L11]', async () => {
    const res = await request(app).get('/api/v1/products/export.csv').set('Authorization', bearer('manager'));
    assert.equal(res.status, 200);
    assert.ok(res.headers['content-type'].includes('text/csv'));
    assert.ok(res.headers['content-disposition'].includes('products.csv'));
    assert.ok(res.text.includes('id,name,slug,price'));
  });

  it('POST /api/v1/products returns 422 on validation failure [L11]', async () => {
    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', bearer('manager'))
      .send({ name: '', price: -10 });
    assert.equal(res.status, 422);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(res.body.error.details));
  });

  it('DELETE /api/v1/categories/:id returns 409 when category has products [L10]', async () => {
    const res = await request(app).delete('/api/v1/categories/jhumkas').set('Authorization', bearer('admin'));
    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'CONFLICT');
    assert.ok(res.body.error.message.includes('still reference it'));
  });

  describe('Raw Node.js HTTP Server [L7]', () => {
    let nativeServer;

    before(async () => {
      const nativeModule = await import('../src/native/server.js');
      nativeServer = nativeModule.default;
    });

    after((done) => {
      if (nativeServer) {
        nativeServer.close(done);
      } else {
        done();
      }
    });

    it('GET /health on native server returns 200 [L7]', async () => {
      const res = await request(nativeServer).get('/health');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.server, 'raw-node-http');
    });

    it('GET /native/products returns products list [L7]', async () => {
      const res = await request(nativeServer).get('/native/products?limit=5');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.length, 5);
    });

    it('POST /native/echo parses request stream body [L7]', async () => {
      const payload = { test: 'stream_body', num: 42 };
      const res = await request(nativeServer)
        .post('/native/echo')
        .send(payload);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.deepEqual(res.body.echoed, payload);
    });

    it('GET /unknown on native server returns 404 [L7]', async () => {
      const res = await request(nativeServer).get('/not-found');
      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
    });

    it('POST /health returns 405 Method Not Allowed [L7]', async () => {
      const res = await request(nativeServer).post('/health');
      assert.equal(res.status, 405);
      assert.equal(res.body.success, false);
    });
  });
});
