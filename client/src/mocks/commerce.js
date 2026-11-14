import { FALLBACK_FREE_SHIPPING_THRESHOLD } from '../api/catalogue';
import { nextStatuses } from '../api/commerce';
import { newId, timestamp } from './validation';

export function quotePricing(subtotal, paymentMethod) {
  const freeShippingThreshold = FALLBACK_FREE_SHIPPING_THRESHOLD;
  const amountToFreeShipping = Math.max(0, freeShippingThreshold - subtotal);
  const shipping = amountToFreeShipping ? 79 : 0;
  const codFee = paymentMethod === 'cod' ? 49 : 0;
  return {
    subtotal,
    shipping,
    codFee,
    discount: 0,
    total: subtotal + shipping + codFee,
    freeShippingThreshold,
    amountToFreeShipping,
  };
}

export function userCart(db, userId) {
  return db.carts[userId] ?? { id: newId(), items: {} };
}

export function cartView(db, cart) {
  const items = Object.entries(cart.items).flatMap(([id, qty]) => {
    const product = db.products.find((entry) => entry.id === id);
    if (!product) return [];
    return [
      {
        product: {
          id,
          name: product.name,
          slug: product.slug,
          price: product.price,
          image: product.images[0]?.url ?? '',
          stock: product.stock,
        },
        qty,
        lineTotal: qty * product.price,
      },
    ];
  });
  return {
    id: cart.id,
    items,
    totals: {
      itemCount: items.reduce((sum, item) => sum + item.qty, 0),
      subtotal: items.reduce((sum, item) => sum + item.lineTotal, 0),
    },
  };
}

export function changeOrderStatus(db, order, status, note) {
  if (!nextStatuses(order.status).includes(status)) return false;
  const at = timestamp();
  if (status === 'cancelled') {
    for (const item of order.items) {
      const product = db.products.find(({ id }) => id === item.product);
      if (!product) continue;
      product.stock += item.qty;
      product.inStock = true;
      product.soldCount = Math.max(0, product.soldCount - item.qty);
      product.updatedAt = at;
    }
    if (order.payment.status === 'paid') order.payment.status = 'refunded';
  }
  if (status === 'delivered' && order.payment.method === 'cod')
    order.payment.status = 'paid';
  order.status = status;
  order.updatedAt = at;
  order.statusHistory.push({ status, at, ...(note ? { note } : {}) });
  db.tracking[order.id] = Date.now();
  return true;
}

const digits = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
export function orderNumber(existing) {
  let number;
  do {
    const code = Array.from(
      crypto.getRandomValues(new Uint8Array(6)),
      (value) => digits[value % digits.length],
    ).join('');
    number = `MM-${new Date().getFullYear()}-${code}`;
  } while (existing.some(({ orderNumber: current }) => current === number));
  return number;
}
