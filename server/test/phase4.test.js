import './helpers/mongoEnvironment.js';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { after, before, test } from 'node:test';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { io as connect } from 'socket.io-client';
import request from 'supertest';
import app from '../src/app.js';
import config from '../src/config/index.js';
import { DEV_USER_IDS } from '../src/config/constants.js';
import { bus } from '../src/events/bus.js';
import { EVENTS } from '../src/events/events.js';
import { registerListeners } from '../src/events/listeners/index.js';
import Category from '../src/models/Category.js';
import Order from '../src/models/Order.js';
import Product from '../src/models/Product.js';
import RefreshToken from '../src/models/RefreshToken.js';
import User from '../src/models/User.js';
import { initSockets } from '../src/sockets/index.js';
import { connectTestUsers, bearer } from './helpers/auth.js';

const api = request(app);
const path = '/api/v1';
const password = 'ExamplePassword12';
const address = {
  label: 'Home',
  fullName: 'Test Customer',
  phone: '9876543210',
  line1: '25 Main Street',
  city: 'Gurugram',
  state: 'Haryana',
  pincode: '122001',
};
let disconnect;
let product;
let socketServer;
let stopListeners;
let url;
const clients = new Set();

before(async () => {
  disconnect = await connectTestUsers();
  const category = await Category.create({ name: 'Rings', slug: 'rings' });
  product = await Product.create({
    name: 'Test Ring',
    category: category.id,
    price: 299,
    sku: 'F4-1',
    stock: 7,
    description: 'A simple test ring.',
    material: 'brass',
    finish: 'antique-gold',
  });
  const server = http.createServer(app);
  socketServer = initSockets(server);
  stopListeners = registerListeners(socketServer);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  url = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  for (const socket of clients) socket.disconnect();
  stopListeners?.();
  await socketServer?.close();
  await disconnect?.();
});

const auth = (method, endpoint, token) =>
  api[method](path + endpoint).set('Authorization', token);
const cookie = (response) => response.headers['set-cookie'][0].split(';', 1)[0];
const register = (email) =>
  api
    .post(path + '/auth/register')
    .send({ name: 'New Customer', email, password, role: 'admin' });
const rotate = (token) => api.post(path + '/auth/refresh').set('Cookie', token);

function event(socket, name, accept = () => true) {
  return new Promise((resolve, reject) => {
    const listener = (payload) => {
      if (!accept(payload)) return;
      clearTimeout(timeout);
      socket.off(name, listener);
      resolve(payload);
    };
    const timeout = setTimeout(() => {
      socket.off(name, listener);
      reject(new Error(`Timed out waiting for ${name}`));
    }, 3000);
    socket.on(name, listener);
  });
}

async function socket(namespace, token, expected = 'connect') {
  const peer = connect(url + namespace, {
    autoConnect: false,
    forceNew: true,
    reconnection: false,
    auth: { token },
  });
  clients.add(peer);
  const ready = event(peer, expected);
  peer.connect();
  return { peer, result: await ready };
}

const command = (peer, name, data) =>
  peer.timeout(3000).emitWithAck(name, data);

test('[L31–L36] registration hashes credentials, normalizes email and refresh rotation detects replay', async () => {
  const registration = await register(' NEW@example.test ');
  assert.equal(registration.status, 201, registration.text);
  const { user, accessToken } = registration.body.data;
  assert.equal(user.email, 'new@example.test');
  assert.equal(user.role, 'customer');
  assert.equal(user.password, undefined);
  assert.match(
    registration.headers['set-cookie'][0],
    /Path=\/api\/v1\/auth.*HttpOnly.*SameSite=Lax/
  );
  const stored = await User.collection.findOne({
    _id: new mongoose.Types.ObjectId(user.id),
  });
  assert.notEqual(stored.password, password);
  assert.equal(await bcrypt.compare(password, stored.password), true);
  assert.equal(
    (await auth('get', '/auth/me', `Bearer ${accessToken}`)).status,
    200
  );
  assert.equal(
    (
      await api
        .post(path + '/auth/refresh')
        .set('Origin', 'https://untrusted.example')
        .set('Cookie', cookie(registration))
    ).status,
    403
  );
  const allowed = await api
    .options(path + '/auth/refresh')
    .set('Origin', config.cors.origin)
    .set('Access-Control-Request-Method', 'POST');
  assert.equal(allowed.headers['access-control-allow-credentials'], 'true');
  assert.equal(
    allowed.headers['access-control-allow-origin'],
    config.cors.origin
  );
  const next = await rotate(cookie(registration));
  assert.equal(next.status, 200, next.text);
  assert.notEqual(cookie(next), cookie(registration));
  assert.equal(next.body.data.user, undefined);
  assert.equal((await rotate(cookie(registration))).status, 401);
  assert.equal((await rotate(cookie(next))).status, 401);
  const records = await RefreshToken.find({ user: user.id });
  assert.equal(records.length, 2);
  assert.ok(
    records.every(
      (record) => record.revokedAt && /^[a-f0-9]{64}$/.test(record.tokenHash)
    )
  );
  assert.ok(records.some((record) => record.replacedBy));
});

test('[L35] concurrent rotations invalidate the entire refresh family', async () => {
  const registration = await register('concurrent@example.test');
  assert.equal(registration.status, 201, registration.text);
  const responses = await Promise.all([
    rotate(cookie(registration)),
    rotate(cookie(registration)),
  ]);
  assert.deepEqual(responses.map(({ status }) => status).sort(), [200, 401]);
  assert.equal(
    (await rotate(cookie(responses.find(({ status }) => status === 200))))
      .status,
    401
  );
});

test('[L31] bad logins share an error and logout revokes the refresh family', async () => {
  const login = (email, password) =>
    api.post(path + '/auth/login').send({ email, password });
  const unknown = await login('unknown@example.test', password);
  const wrong = await login('new@example.test', 'wrong');
  assert.equal(unknown.status, 401);
  assert.deepEqual(unknown.body.error, wrong.body.error);
  const valid = await login('NEW@example.test', password);
  assert.equal(valid.status, 200);
  const result = await api
    .post(path + '/auth/logout')
    .set('Cookie', cookie(valid));
  assert.equal(result.status, 204);
  assert.match(result.headers['set-cookie'][0], /^mm_refresh=;/);
  assert.equal((await rotate(cookie(valid))).status, 401);
});

test('[L34–L37] password changes and deactivation revoke sessions; roles come from the database', async () => {
  const registration = await register('roles@example.test');
  const { user, accessToken } = registration.body.data;
  const original = `Bearer ${accessToken}`;
  const changed = await auth('patch', '/auth/password', original).send({
    currentPassword: password,
    newPassword: 'Replacement32',
  });
  assert.equal(changed.status, 200, changed.text);
  assert.equal((await auth('get', '/auth/me', original)).status, 401);
  assert.equal((await rotate(cookie(registration))).status, 401);
  const valid = `Bearer ${changed.body.data.accessToken}`;
  const expired = jwt.sign({ role: 'customer' }, config.auth.jwt.accessSecret, {
    expiresIn: -1,
    audience: 'access',
    issuer: 'metal-masala',
    subject: user.id,
  });
  assert.equal(
    (await auth('get', '/auth/me', `Bearer ${expired}`)).body.error.code,
    'TOKEN_EXPIRED'
  );
  const role = `/admin/users/${user.id}/role`;
  const status = `/admin/users/${user.id}/status`;
  assert.equal((await auth('get', '/admin/orders', valid)).status, 403);
  assert.equal(
    (await auth('patch', role, bearer('admin')).send({ role: 'manager' }))
      .status,
    200
  );
  assert.equal((await auth('get', '/admin/orders', valid)).status, 200);
  assert.equal(
    (
      await auth(
        'patch',
        `/admin/users/${DEV_USER_IDS.admin}/role`,
        bearer('admin')
      ).send({ role: 'customer' })
    ).status,
    403
  );
  assert.equal(
    (await auth('patch', status, bearer('admin')).send({ isActive: false }))
      .status,
    200
  );
  assert.equal((await auth('get', '/auth/me', valid)).status, 401);
  assert.equal((await rotate(cookie(changed))).status, 401);
  assert.equal(
    (await auth('patch', status, bearer('admin')).send({ isActive: true }))
      .status,
    200
  );
  assert.equal((await auth('get', '/auth/me', valid)).status, 401);
  const search = await auth(
    'get',
    '/admin/users?q=roles&role=manager&limit=1',
    bearer('admin')
  );
  assert.equal(search.body.meta.total, 1);
  assert.equal(search.body.data[0].id, user.id);
});

test('[L32, L37] permission matrix and account-owned resources', async () => {
  for (const [endpoint, expected] of [
    ['/products', [200, 200, 200, 200]],
    ['/users/me', [401, 200, 200, 200]],
    ['/products/export.csv', [401, 403, 200, 200]],
    ['/admin/orders', [401, 403, 200, 200]],
    ['/admin/users', [401, 403, 403, 200]],
    ['/admin/analytics/summary', [401, 403, 403, 200]],
  ]) {
    for (const [index, role] of [
      'public',
      'customer',
      'manager',
      'admin',
    ].entries()) {
      const request =
        role === 'public'
          ? api.get(path + endpoint)
          : auth('get', endpoint, bearer(role));
      assert.equal(
        (await request).status,
        expected[index],
        `${endpoint} ${role}`
      );
    }
  }
  const token = bearer('customer');
  const first = await auth('post', '/users/me/addresses', token).send(address);
  const second = await auth('post', '/users/me/addresses', token).send({
    ...address,
    label: 'Office',
    isDefault: true,
  });
  assert.equal(first.status, 201, first.text);
  assert.equal(second.status, 201, second.text);
  assert.equal(first.body.data.isDefault, true);
  assert.equal(second.body.data.isDefault, true);
  assert.equal(
    (
      await auth(
        'patch',
        `/users/me/addresses/${first.body.data.id}`,
        bearer('manager')
      ).send({ label: 'Other' })
    ).status,
    404
  );
  assert.equal(
    (await auth('delete', `/users/me/addresses/${second.body.data.id}`, token))
      .status,
    204
  );
  assert.equal(
    (await auth('get', '/users/me', token)).body.data.addresses[0].isDefault,
    true
  );
  const patch = await auth('patch', '/users/me', token).send({
    name: 'Updated Name',
    phone: '1234567890',
  });
  assert.equal(patch.body.data.name, 'Updated Name');
  assert.equal(
    (await auth('patch', '/users/me', token).send({ role: 'admin' })).status,
    422
  );
  const wishlist = `/users/me/wishlist/${product.id}`;
  for (let i = 0; i < 2; i++)
    assert.equal(
      (await auth('post', wishlist, token)).body.data.wishlist.length,
      1
    );
  assert.equal(
    (await auth('get', '/users/me/wishlist', token)).body.data[0].id,
    product.id
  );
  assert.equal((await auth('delete', wishlist, token)).status, 204);
  assert.deepEqual(
    (await auth('get', '/users/me/wishlist', token)).body.data,
    []
  );
});

test('[L41] an initial cart read and guest merge can run concurrently', async () => {
  const { body } = await register('bag-merge@example.test');
  const token = `Bearer ${body.data.accessToken}`;
  const results = await Promise.all([
    auth('get', '/cart', token),
    auth('post', '/cart/merge', token).send({
      items: [{ productId: product.id, qty: 1 }],
    }),
  ]);
  assert.deepEqual(
    results.map(({ status }) => status),
    [200, 200]
  );
  assert.equal((await auth('get', '/cart', token)).body.data.items[0].qty, 1);
});

test('[L41] stylist recommendations use the full catalogue card shape', async () => {
  const response = await api
    .post(path + '/ai/stylist')
    .send({ message: 'Suggest an antique gold ring under 500.' });
  assert.equal(response.status, 200);
  const recommendation = response.body.data.products.find(
    ({ id }) => id === product.id
  );
  assert.equal(recommendation.category.slug, 'rings');
  assert.equal(recommendation.inStock, true);
  assert.ok(Array.isArray(recommendation.images));
});

test('[L38, L40] Socket.IO enforces namespaces and ownership and bridges persisted commerce changes', async () => {
  for (const namespace of ['/account', '/admin']) {
    const { result } = await socket(namespace, undefined, 'connect_error');
    assert.equal(result.data.code, 'UNAUTHENTICATED');
  }
  const { result } = await socket(
    '/admin',
    bearer('customer').slice(7),
    'connect_error'
  );
  assert.equal(result.data.code, 'FORBIDDEN');
  const { peer: admin } = await socket('/admin', bearer('manager').slice(7));
  const { peer: customer } = await socket(
    '/account',
    bearer('customer').slice(7)
  );
  const { peer: other } = await socket('/account', bearer('admin').slice(7));
  const { peer: publicA } = await socket('/');
  const { peer: publicB } = await socket('/');
  const drop = event(publicA, 'drop:announce');
  assert.deepEqual(
    await command(admin, 'drop:publish', {
      title: 'New drop',
      message: 'A ring just landed.',
      productSlug: product.slug,
    }),
    { ok: true }
  );
  assert.equal((await drop).productSlug, product.slug);
  const room = { slug: product.slug };
  await command(publicA, 'product:join', room);
  const two = event(publicA, 'viewers:count', ({ count }) => count === 2);
  await command(publicB, 'product:join', room);
  assert.equal((await two).count, 2);
  const one = event(publicA, 'viewers:count', ({ count }) => count === 1);
  publicB.disconnect();
  assert.equal((await one).count, 1);

  const buyer = bearer('customer');
  assert.equal(
    (
      await auth('post', '/cart/merge', buyer).send({
        items: [{ productId: product.id, qty: 2 }],
      })
    ).status,
    200
  );
  const placed = event(admin, 'order:new');
  const low = event(admin, 'stock:low');
  const resultOrder = await auth('post', '/orders', buyer).send({
    shippingAddress: address,
    paymentMethod: 'cod',
  });
  assert.equal(resultOrder.status, 201, resultOrder.text);
  const orderId = resultOrder.body.data.id;
  assert.equal((await placed).orderId, orderId);
  assert.equal((await low).stock, 5);
  assert.ok(await Order.exists({ _id: orderId }));
  assert.equal(
    (await command(other, 'order:subscribe', { orderId })).code,
    'FORBIDDEN'
  );
  assert.equal(
    (await command(customer, 'order:subscribe', { orderId })).ok,
    true
  );
  const updated = event(customer, 'order:status');
  const changed = await auth(
    'patch',
    `/admin/orders/${orderId}/status`,
    bearer('manager')
  ).send({ status: 'confirmed' });
  assert.equal(changed.status, 200, changed.text);
  assert.equal((await updated).status, 'confirmed');
  assert.equal((await Order.findById(orderId)).status, 'confirmed');
  const cancelled = event(customer, 'order:status');
  assert.equal(
    (await auth('patch', `/orders/${orderId}/cancel`, buyer)).status,
    200
  );
  assert.equal((await cancelled).status, 'cancelled');
  assert.equal((await Product.findById(product.id)).stock, 7);

  const reviewEvent = once(bus, EVENTS.REVIEW_CREATED);
  assert.equal(
    (
      await auth('post', `/products/${product.id}/reviews`, buyer).send({
        rating: 5,
        title: 'A good ring',
        body: 'I liked this test ring.',
      })
    ).status,
    201
  );
  const [{ review }] = await reviewEvent;
  assert.equal(
    (await auth('delete', `/reviews/${review.id}`, bearer('manager'))).status,
    403
  );
  assert.equal(
    (await auth('delete', `/reviews/${review.id}`, bearer('admin'))).status,
    204
  );
});
