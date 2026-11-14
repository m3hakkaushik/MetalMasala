import { z } from 'zod';
import { cartView, userCart } from '../commerce';
import { readDb, saveDb } from '../db';
import { endpoint, failure, noContent, notFound, success } from '../http';
import { actor } from '../session';
import { parseBody } from '../validation';

const addition = z.object({
  productId: z.string().min(1),
  qty: z.number().int().positive(),
});
const quantity = z.object({ qty: z.number().int().nonnegative() });
const merge = z.object({ items: z.array(addition) });

function stockError(product) {
  return failure(
    409,
    'OUT_OF_STOCK',
    `Only ${product.stock} of ${product.name} available.`,
    [{ productId: product.id, stock: product.stock }],
  );
}

function cartEndpoint(method, path, action, schema) {
  return endpoint(method, path, async ({ request, params }) => {
    const body = schema ? await parseBody(request, schema) : {};
    if (body.error) return body.error;
    const db = readDb();
    const { user, error } = actor(db, request);
    if (error) return error;
    const cart = userCart(db, user.id);
    const outcome = action({ db, cart, params, body: body.data });
    if (outcome instanceof Response) return outcome;
    db.carts[user.id] = cart;
    saveDb({ carts: db.carts });
    return outcome === 'empty' ? noContent() : success(cartView(db, cart));
  });
}

export const cartHandlers = [
  cartEndpoint('get', '/cart', () => {}),
  cartEndpoint(
    'post',
    '/cart/items',
    ({ db, cart, body }) => {
      const product = db.products.find(({ id }) => id === body.productId);
      if (!product) return notFound('Product');
      const next = (cart.items[product.id] ?? 0) + body.qty;
      if (next > product.stock) return stockError(product);
      cart.items[product.id] = next;
    },
    addition,
  ),
  cartEndpoint(
    'patch',
    '/cart/items/:productId',
    ({ db, cart, params, body }) => {
      if (!Object.hasOwn(cart.items, params.productId))
        return notFound('Bag item');
      if (body.qty === 0) {
        delete cart.items[params.productId];
        return;
      }
      const product = db.products.find(({ id }) => id === params.productId);
      if (!product) return notFound('Product');
      if (body.qty > product.stock) return stockError(product);
      cart.items[params.productId] = body.qty;
    },
    quantity,
  ),
  cartEndpoint('delete', '/cart/items/:productId', ({ cart, params }) => {
    delete cart.items[params.productId];
    return 'empty';
  }),
  cartEndpoint('delete', '/cart', ({ cart }) => {
    cart.items = {};
    return 'empty';
  }),
  cartEndpoint(
    'post',
    '/cart/merge',
    ({ db, cart, body }) => {
      for (const { productId, qty } of body.items) {
        const product = db.products.find(({ id }) => id === productId);
        if (!product || !product.stock) continue;
        cart.items[productId] = Math.min(
          product.stock,
          (cart.items[productId] ?? 0) + qty,
        );
      }
    },
    merge,
  ),
];
