import { bus } from '../bus.js';
import { registerNotifications } from './notification.listener.js';
import { registerSocketListener } from './socket.listener.js';
import { registerStockListener } from './stock.listener.js';

export function registerListeners(io) {
  registerNotifications(bus);
  registerStockListener(bus);
  return registerSocketListener(bus, io);
}
