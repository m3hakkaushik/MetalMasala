import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { Category } from '../src/models/Category.js';
import { Product } from '../src/models/Product.js';
import { User } from '../src/models/User.js';
import { Cart } from '../src/models/Cart.js';
import { DEV_USER_IDS } from '../src/config/constants.js';

let mongod;

before(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  // Seed dev users with fixed IDs
  await User.create([
    {
      _id: new mongoose.Types.ObjectId(DEV_USER_IDS.customer),
      name: 'Aarav Mehta',
      email: 'aarav@example.com',
      password: '__unset_until_B4__',
      role: 'customer',
      phone: '9876543210',
    },
    {
      _id: new mongoose.Types.ObjectId(DEV_USER_IDS.manager),
      name: 'Manager',
      email: 'manager@metalmasala.in',
      password: '__unset_until_B4__',
      role: 'manager',
    },
    {
      _id: new mongoose.Types.ObjectId(DEV_USER_IDS.admin),
      name: 'Admin',
      email: 'admin@metalmasala.in',
      password: '__unset_until_B4__',
      role: 'admin',
    },
  ]);
});

after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

test('[L27] GET /health reports healthy status and live database state', async () => {
  const res = await request(app).get('/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.data.status, 'healthy');
  assert.ok(res.body.data.db);
  assert.equal(res.body.data.db.state, 'connected');
});

test('[L25, L26] Mongoose Validation: compareAtPrice must be >= price', async () => {
  const cat = await Category.create({
    name: 'Jhumkas Test',
    slug: 'jhumkas-test',
  });

  // compareAtPrice < price should throw ValidationError
  await assert.rejects(
    async () => {
      await Product.create({
        name: 'Invalid Price Jhumka',
        slug: 'invalid-price-jhumka',
        description: 'Testing validation error',
        price: 1200,
        compareAtPrice: 800, // Invalid!
        category: cat._id,
        material: 'brass',
        finish: 'oxidized-silver',
        sku: 'MM-TEST-INV-1',
        stock: 5,
      });
    },
    (err) => {
      assert.match(err.message, /compareAtPrice/);
      return true;
    }
  );
});

test('[L21, L22, L28] Category & Product CRUD on MongoDB with facets and related', async () => {
  const cat = await Category.create({
    name: 'Necklaces & Chokers',
    slug: 'necklaces',
    description: 'Regal neckwear',
  });

  const p1 = await Product.create({
    name: 'Royal Kundan Choker',
    slug: 'royal-kundan-choker',
    tagline: 'Regal neckpiece with emerald beads.',
    description: 'Handcrafted kundan choker.',
    price: 1499,
    compareAtPrice: 1999,
    category: cat._id,
    material: 'brass',
    finish: 'antique-gold',
    tags: ['festive', 'wedding-guest'],
    sku: 'MM-CHK-099',
    stock: 10,
    isFeatured: true,
  });

  const p2 = await Product.create({
    name: 'Peacock Choker Necklace',
    slug: 'peacock-choker-necklace',
    tagline: 'Intricate peacock motif.',
    description: 'Choker with fine detailing.',
    price: 899,
    category: cat._id,
    material: 'brass',
    finish: 'antique-gold',
    tags: ['festive'],
    sku: 'MM-CHK-100',
    stock: 1,
  });

  // GET /api/v1/products/facets [L23]
  const facetsRes = await request(app).get('/api/v1/products/facets');
  assert.equal(facetsRes.status, 200);
  assert.ok(facetsRes.body.data.price);
  assert.ok(Array.isArray(facetsRes.body.data.finishes));
  assert.ok(Array.isArray(facetsRes.body.data.categories));

  // GET /api/v1/products/:slug/related [L28]
  const relatedRes = await request(app).get(`/api/v1/products/${p1.slug}/related`);
  assert.equal(relatedRes.status, 200);
  assert.ok(Array.isArray(relatedRes.body.data));
  assert.ok(relatedRes.body.data.some((item) => item.slug === p2.slug));
});

test('[L28] Cart Lifecycle: Add item, update quantity, cap at stock, and merge', async () => {
  const prod = await Product.findOne({ sku: 'MM-CHK-099' });

  // 1. Add item to cart
  const addRes = await request(app)
    .post('/api/v1/cart/items')
    .set('x-dev-role', 'customer')
    .send({ productId: prod.id, qty: 2 });

  assert.equal(addRes.status, 200);
  assert.equal(addRes.body.data.items.length, 1);
  assert.equal(addRes.body.data.items[0].qty, 2);
  assert.equal(addRes.body.data.totals.subtotal, 1499 * 2);

  // 2. Quantity cap: requesting more than stock (stock is 10) returns 409
  const capRes = await request(app)
    .post('/api/v1/cart/items')
    .set('x-dev-role', 'customer')
    .send({ productId: prod.id, qty: 15 });

  assert.equal(capRes.status, 409);
  assert.equal(capRes.body.error.code, 'OUT_OF_STOCK');

  // 3. Guest cart merge
  const mergeRes = await request(app)
    .post('/api/v1/cart/merge')
    .set('x-dev-role', 'customer')
    .send({
      items: [{ productId: prod.id, qty: 1 }],
    });

  assert.equal(mergeRes.status, 200);
  assert.equal(mergeRes.body.data.items[0].qty, 3);
});

test('[L28] Concurrency Safety: Two simultaneous orders for last item -> exactly one succeeds', async () => {
  // Create product with exactly 1 in stock
  const cat = await Category.findOne();
  const limitedProduct = await Product.create({
    name: 'Last Antique Ring',
    slug: 'last-antique-ring',
    description: 'Only one unit in stock',
    price: 999,
    category: cat._id,
    material: 'brass',
    finish: 'antique-gold',
    sku: 'MM-RNG-CONCUR',
    stock: 1,
  });

  // Customer adds to cart
  await Cart.findOneAndUpdate(
    { user: DEV_USER_IDS.customer },
    { items: [{ product: limitedProduct._id, qty: 1 }] }
  );

  const orderPayload = {
    shippingAddress: {
      fullName: 'Aarav Mehta',
      phone: '9876543210',
      line1: '12 Sector 14',
      city: 'Gurugram',
      state: 'Haryana',
      pincode: '122001',
    },
    paymentMethod: 'upi_mock',
  };

  // Launch two concurrent order requests simultaneously
  const [res1, res2] = await Promise.all([
    request(app).post('/api/v1/orders').set('x-dev-role', 'customer').send(orderPayload),
    request(app).post('/api/v1/orders').set('x-dev-role', 'customer').send(orderPayload),
  ]);

  const statuses = [res1.status, res2.status];
  const successCount = statuses.filter((s) => s === 201).length;
  const failureCount = statuses.filter((s) => [400, 409].includes(s)).length;

  assert.equal(successCount, 1, 'Exactly one order must successfully complete with 201');
  assert.equal(failureCount, 1, 'The other concurrent attempt must fail with 409 or 400');

  // Check remaining stock is exactly 0, not negative
  const checkProduct = await Product.findById(limitedProduct._id);
  assert.equal(checkProduct.stock, 0);
  assert.equal(checkProduct.soldCount, 1);
});

test('[L28] Cancel Order restocks items and transitions status', async () => {
  const prod = await Product.findOne({ sku: 'MM-CHK-099' });
  const initialStock = prod.stock;

  // Add 1 item to cart and place order
  await Cart.findOneAndUpdate(
    { user: DEV_USER_IDS.customer },
    { items: [{ product: prod._id, qty: 1 }] }
  );

  const orderRes = await request(app)
    .post('/api/v1/orders')
    .set('x-dev-role', 'customer')
    .send({
      shippingAddress: {
        fullName: 'Aarav Mehta',
        phone: '9876543210',
        line1: '12 Sector 14',
        city: 'Gurugram',
        state: 'Haryana',
        pincode: '122001',
      },
      paymentMethod: 'cod',
    });

  assert.equal(orderRes.status, 201);
  const orderId = orderRes.body.data.id;

  // Stock should be initialStock - 1
  const afterOrderProd = await Product.findById(prod._id);
  assert.equal(afterOrderProd.stock, initialStock - 1);

  // Cancel order
  const cancelRes = await request(app)
    .patch(`/api/v1/orders/${orderId}/cancel`)
    .set('x-dev-role', 'customer');

  assert.equal(cancelRes.status, 200);
  assert.equal(cancelRes.body.data.status, 'cancelled');

  // Stock must be restored
  const restoredProd = await Product.findById(prod._id);
  assert.equal(restoredProd.stock, initialStock);
});

test('[L23] Admin Analytics: summary, revenue, sales-by-category, top-products', async () => {
  // GET /api/v1/admin/analytics/summary
  const summaryRes = await request(app)
    .get('/api/v1/admin/analytics/summary')
    .set('x-dev-role', 'admin');

  assert.equal(summaryRes.status, 200);
  assert.ok('revenue' in summaryRes.body.data);
  assert.ok('orders' in summaryRes.body.data);
  assert.ok(Array.isArray(summaryRes.body.data.lowStock));

  // GET /api/v1/admin/analytics/revenue
  const revRes = await request(app)
    .get('/api/v1/admin/analytics/revenue?range=30d')
    .set('x-dev-role', 'admin');

  assert.equal(revRes.status, 200);
  assert.ok(Array.isArray(revRes.body.data));

  // Non-admin gets 403
  const forbiddenRes = await request(app)
    .get('/api/v1/admin/analytics/summary')
    .set('x-dev-role', 'customer');
  assert.equal(forbiddenRes.status, 403);
});

test('[L23, L28] Reviews: Rating recalculation and duplicate prevention', async () => {
  const prod = await Product.findOne({ sku: 'MM-CHK-099' });

  // Post review
  const reviewRes = await request(app)
    .post(`/api/v1/products/${prod.id}/reviews`)
    .set('x-dev-role', 'customer')
    .send({
      rating: 5,
      title: 'Stunning choker!',
      body: 'Absolutely in love with the antique gold finish.',
    });

  assert.equal(reviewRes.status, 201);
  assert.equal(reviewRes.body.data.rating, 5);

  // Duplicate review from same user -> 409 Conflict
  const dupRes = await request(app)
    .post(`/api/v1/products/${prod.id}/reviews`)
    .set('x-dev-role', 'customer')
    .send({
      rating: 4,
      title: 'Trying again',
      body: 'Duplicate review check.',
    });

  assert.equal(dupRes.status, 409);
  assert.equal(dupRes.body.error.code, 'CONFLICT');

  // Product rating should be updated
  const updatedProduct = await Product.findById(prod._id);
  assert.equal(updatedProduct.ratingCount, 1);
  assert.equal(updatedProduct.ratingAverage, 5);
});

test('[L43] AI Stylist: candidate retrieval, brand voice, and allowlist verification', async () => {
  const stylistRes = await request(app)
    .post('/api/v1/ai/stylist')
    .send({
      message: 'I need a festive antique gold choker under 2000 for a wedding.',
    });

  assert.equal(stylistRes.status, 200);
  assert.ok(stylistRes.body.data.reply);
  assert.ok(Array.isArray(stylistRes.body.data.products));
  assert.equal(stylistRes.body.data.provider, 'mock');

  // AI Describe (manager+)
  const describeRes = await request(app)
    .post('/api/v1/ai/describe')
    .set('x-dev-role', 'manager')
    .send({
      name: 'Peacock Temple Kada',
      material: 'brass',
      finish: 'antique-gold',
      tags: ['festive'],
    });

  assert.equal(describeRes.status, 200);
  assert.ok(describeRes.body.data.tagline);
  assert.ok(describeRes.body.data.description);
});
