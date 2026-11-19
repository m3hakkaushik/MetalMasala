import { EVENTS } from '../events.js';

export function registerSocketListener(bus, io) {
  const admins = io.of('/admin');
  const account = io.of('/account');
  const listeners = {
    [EVENTS.ORDER_PLACED]: ({ order }) =>
      admins.to('admins').emit('order:new', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        total: order.pricing.total,
      }),
    [EVENTS.ORDER_STATUS_CHANGED]: ({ order, to }) => {
      const { at, note } = order.statusHistory.at(-1);
      const update = { orderId: order.id, status: to, at };
      account.to(`order:${order.id}`).emit('order:status', { ...update, note });
      admins.to('admins').emit('order:status', update);
    },
    [EVENTS.STOCK_LOW]: ({ product }) =>
      admins.to('admins').emit('stock:low', {
        productId: product.id,
        name: product.name,
        stock: product.stock,
      }),
    [EVENTS.ACCOUNT_CHANGED]: ({ userId }) => {
      account.in(`user:${userId}`).disconnectSockets();
      admins.in(`user:${userId}`).disconnectSockets();
    },
  };
  for (const [event, listener] of Object.entries(listeners))
    bus.on(event, listener);
  return () => {
    for (const [event, listener] of Object.entries(listeners))
      bus.off(event, listener);
  };
}
