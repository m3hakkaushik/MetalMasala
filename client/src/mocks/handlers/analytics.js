import { LOW_STOCK_THRESHOLD } from '../../api/catalogue';
import { readDb } from '../db';
import { endpoint, invalid, success } from '../http';
import { actor } from '../session';

function analytics(path, getData) {
  return endpoint('get', '/admin/analytics/' + path, ({ request }) => {
    const db = readDb();
    const { error } = actor(db, request, ['admin']);
    if (error) return error;
    const orders = db.orders.filter((order) => order.status !== 'cancelled');
    return getData(db, orders, new URL(request.url).searchParams);
  });
}

function revenueSeries(orders, range) {
  const now = new Date();
  const day = 86_400_000;
  const months = range === '12m';
  const count = range === '7d' ? 7 : range === '30d' ? 30 : 12;
  const groups = new Map(
    Array.from({ length: count }, (_, i) => {
      const offset = count - i - 1;
      const date = months
        ? new Date(
            Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1),
          )
        : new Date(now.getTime() - offset * day);
      const key = date.toISOString().slice(0, months ? 7 : 10);
      return [key, { date: key, revenue: 0, orders: 0 }];
    }),
  );
  for (const order of orders) {
    const item = groups.get(order.createdAt.slice(0, months ? 7 : 10));
    if (!item) continue;
    item.revenue += order.pricing.total;
    item.orders++;
  }
  return [...groups.values()];
}

function groupSales(orders, key, data) {
  const groups = new Map();
  for (const order of orders) {
    for (const item of order.items) {
      const groupKey = key(item);
      if (!groupKey) continue;
      if (!groups.has(groupKey))
        groups.set(groupKey, { ...data(item), unitsSold: 0, revenue: 0 });
      const group = groups.get(groupKey);
      group.revenue += item.lineTotal;
      group.unitsSold += item.qty;
    }
  }
  return [...groups.values()].sort((a, b) => b.revenue - a.revenue);
}

export const analyticsHandlers = [
  analytics('summary', (db, orders) => {
    const revenue = orders.reduce((sum, order) => sum + order.pricing.total, 0);
    return success({
      revenue,
      orders: orders.length,
      avgOrderValue: orders.length ? Math.round(revenue / orders.length) : 0,
      customers: db.users.filter(({ role }) => role === 'customer').length,
      lowStock: db.products
        .filter(({ stock }) => stock <= LOW_STOCK_THRESHOLD)
        .sort((a, b) => a.stock - b.stock)
        .map(({ id, slug, name, stock }) => ({ id, slug, name, stock })),
    });
  }),
  analytics('revenue', (_, orders, params) => {
    const range = params.get('range') ?? '30d';
    return ['7d', '30d', '12m'].includes(range)
      ? success(revenueSeries(orders, range))
      : invalid('range', 'Choose 7d, 30d, or 12m.');
  }),
  analytics('sales-by-category', (db, orders) => {
    const byProduct = new Map(
      db.products.map((product) => [product.id, product.category.name]),
    );
    return success(
      groupSales(
        orders,
        (item) => byProduct.get(item.product),
        (item) => ({ category: byProduct.get(item.product) }),
      ),
    );
  }),
  analytics('top-products', (_, orders, params) => {
    const limit = Number(params.get('limit') ?? 5);
    if (!Number.isInteger(limit) || limit < 1 || limit > 48)
      return invalid('limit', 'Choose a limit between 1 and 48.');
    const groups = groupSales(
      orders,
      ({ product }) => product,
      ({ product, name, slug, image }) => ({
        product: { id: product, name, slug, image },
      }),
    );
    return success(groups.slice(0, limit));
  }),
];
