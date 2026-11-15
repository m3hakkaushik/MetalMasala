import { z } from 'zod';
import { ORDER_FLOW } from '../../api/commerce';
import { addressSchema, paymentSchema } from '../../api/validation';
import {
  cartView,
  changeOrderStatus,
  orderNumber,
  quotePricing,
  userCart,
} from '../commerce';
import { readDb, saveDb } from '../db';
import { endpoint, failure, notFound, success } from '../http';
import { actor } from '../session';
import {
  newId,
  pageOptions,
  paginate,
  parseBody,
  timestamp,
} from '../validation';

const shipment = addressSchema.omit({ isDefault: true });
const orderSchema = paymentSchema.extend({ shippingAddress: shipment });
const staff = ['manager', 'admin'];
const newestFirst = (a, b) => b.createdAt.localeCompare(a.createdAt);

function orderDetails(db, id, request, allowStaff = true) {
  const { user, error } = actor(db, request);
  if (error) return { error };
  const order = db.orders.find((item) => item.id === id);
  if (!order) return { error: notFound('Order') };
  if (order.user !== user.id && (!allowStaff || !staff.includes(user.role))) {
    return {
      error: failure(
        403,
        'FORBIDDEN',
        'This order belongs to another account.',
      ),
    };
  }
  return { order };
}

function pageOrders(orders, request) {
  const options = pageOptions(request);
  if (options.error) return options.error;
  const result = paginate(orders.sort(newestFirst), options);
  return success(result.items, { meta: result.meta });
}

export const ordersHandlers = [
  endpoint('get', '/orders', ({ request }) => {
    const db = readDb();
    const { user, error } = actor(db, request);
    if (error) return error;
    return pageOrders(
      db.orders.filter((order) => order.user === user.id),
      request,
    );
  }),
  endpoint('post', '/orders', async ({ request }) => {
    const body = await parseBody(request, orderSchema);
    if (body.error) return body.error;
    const db = readDb();
    const { user, error } = actor(db, request);
    if (error) return error;
    const cart = userCart(db, user.id);
    if (!Object.keys(cart.items).length)
      return failure(400, 'BAD_REQUEST', 'Your bag is empty.');
    const lines = cartView(db, cart);
    const unavailable = Object.entries(cart.items).flatMap(
      ([productId, qty]) => {
        const current = db.products.find(({ id }) => id === productId);
        return !current || current.stock < qty
          ? [{ productId, stock: current?.stock ?? 0 }]
          : [];
      },
    );
    if (unavailable.length)
      return failure(
        409,
        'OUT_OF_STOCK',
        'Some pieces in your bag are no longer available in those quantities.',
        unavailable,
      );

    const at = timestamp();
    const items = lines.items.map(({ product, qty, lineTotal }) => ({
      product: product.id,
      name: product.name,
      slug: product.slug,
      image: product.image,
      price: product.price,
      qty,
      lineTotal,
    }));
    for (const item of items) {
      const product = db.products.find(({ id }) => id === item.product);
      product.stock -= item.qty;
      product.inStock = product.stock > 0;
      product.soldCount += item.qty;
      product.updatedAt = at;
    }
    const { shippingAddress, paymentMethod, notes } = body.data;
    const { subtotal, shipping, codFee, discount, total } = quotePricing(
      lines.totals.subtotal,
      paymentMethod,
    );
    const order = {
      id: newId(),
      orderNumber: orderNumber(db.orders),
      items,
      shippingAddress,
      pricing: { subtotal, shipping, codFee, discount, total },
      payment: {
        method: paymentMethod,
        status: paymentMethod === 'cod' ? 'pending' : 'paid',
        transactionId:
          paymentMethod === 'cod' ? null : `MOCK-${crypto.randomUUID()}`,
      },
      status: 'placed',
      statusHistory: [{ status: 'placed', at, note: 'Order placed' }],
      user: user.id,
      createdAt: at,
      updatedAt: at,
      ...(notes ? { notes } : {}),
    };
    db.orders.push(order);
    cart.items = {};
    db.carts[user.id] = cart;
    saveDb({ orders: db.orders, products: db.products, carts: db.carts });
    return success(order, { status: 201 });
  }),
  endpoint('get', '/orders/:id', ({ params, request }) => {
    const db = readDb();
    const { order, error } = orderDetails(db, params.id, request);
    if (error) return error;
    if (new URL(request.url).searchParams.get('demoTrack') === 'true') {
      const anchor = db.tracking[order.id];
      const next = ORDER_FLOW[ORDER_FLOW.indexOf(order.status) + 1];
      if (
        anchor &&
        Date.now() - anchor >= 15_000 &&
        order.status !== 'cancelled' &&
        next
      ) {
        changeOrderStatus(db, order, next, 'Demo tracking update');
        saveDb({ tracking: db.tracking, orders: db.orders });
      } else if (!anchor) {
        db.tracking[order.id] = Date.now();
        saveDb({ tracking: db.tracking });
      }
    }
    return success(order);
  }),
  endpoint('patch', '/orders/:id/cancel', ({ params, request }) => {
    const db = readDb();
    const { order, error } = orderDetails(db, params.id, request, false);
    if (error) return error;
    if (!changeOrderStatus(db, order, 'cancelled', 'Cancelled by customer')) {
      return failure(
        409,
        'CONFLICT',
        'Only placed or confirmed orders can be cancelled.',
      );
    }
    saveDb({ orders: db.orders, products: db.products, tracking: db.tracking });
    return success(order);
  }),
];

const statusSchema = z.object({
  status: z.enum([...ORDER_FLOW, 'cancelled']),
  note: z.string().trim().max(300).optional(),
});
export const adminOrderHandlers = [
  endpoint('get', '/admin/orders', ({ request }) => {
    const db = readDb();
    const { error } = actor(db, request, staff);
    if (error) return error;
    const query = new URL(request.url).searchParams;
    const status = query.get('status');
    const q = query.get('q')?.trim().toLowerCase();
    const users = new Map(db.users.map((user) => [user.id, user]));
    return pageOrders(
      db.orders.filter(
        (order) =>
          (!status || order.status === status) &&
          (!q ||
            order.orderNumber.toLowerCase().includes(q) ||
            users.get(order.user)?.email.includes(q)),
      ),
      request,
    );
  }),
  endpoint('patch', '/admin/orders/:id/status', async ({ params, request }) => {
    const body = await parseBody(request, statusSchema);
    if (body.error) return body.error;
    const db = readDb();
    const { error } = actor(db, request, staff);
    if (error) return error;
    const order = db.orders.find(({ id }) => id === params.id);
    if (!order) return notFound('Order');
    if (!changeOrderStatus(db, order, body.data.status, body.data.note))
      return failure(409, 'CONFLICT', 'This order can’t move to that status.');
    saveDb({ orders: db.orders, products: db.products, tracking: db.tracking });
    return success(order);
  }),
];
