import { Server } from 'socket.io';
import { z } from 'zod';
import config from '../config/index.js';
import { ERROR_CODES as codes } from '../config/constants.js';
import { PERMISSIONS } from '../config/permissions.js';
import Order from '../models/Order.js';
import { normalizeError } from '../middleware/errorHandler.js';
import { verifyAccessUser } from '../services/auth.service.js';
import { AppError } from '../utils/AppError.js';
import { objectId } from '../validators/users.js';

const slug = z
  .string()
  .max(120)
  .regex(/^[a-z\d]+(?:-[a-z\d]+)*$/);
const productRoom = z.object({ slug });
const orderRoom = z.object({
  orderId: objectId.transform((id) => id.toLowerCase()),
});
const drop = z.object({
  title: z.string().trim().min(1).max(80),
  message: z.string().trim().min(1).max(240),
  productSlug: slug.optional(),
});

function socketError(error) {
  const normalized = normalizeError(error);
  return {
    code: normalized?.code ?? codes.INTERNAL_ERROR,
    message: normalized?.message ?? 'Realtime request failed',
  };
}

function onCommand(socket, event, schema, handler) {
  socket.on(event, async (payload, callback) => {
    const reply = typeof callback === 'function' ? callback : () => {};
    const result = schema.safeParse(payload);
    if (!result.success)
      return reply({
        ok: false,
        code: codes.VALIDATION_ERROR,
        message: 'Invalid event payload',
      });
    try {
      await handler(result.data);
      reply({ ok: true });
    } catch (error) {
      reply({ ok: false, ...socketError(error) });
    }
  });
}

function authorize(permission) {
  return async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const { user, expiresAt } = await verifyAccessUser(
        typeof token === 'string' ? token : undefined
      );
      if (permission && !PERMISSIONS[permission].includes(user.role)) {
        throw new AppError(403, codes.FORBIDDEN, 'Staff access required');
      }
      socket.data.userId = user.id;
      socket.data.expiresAt = expiresAt;
      next();
    } catch (error) {
      const data = socketError(error);
      next(Object.assign(new Error(data.message), { data }));
    }
  };
}

function bindAccount(socket) {
  socket.join(`user:${socket.data.userId}`);
  // Reconnect with a new token when the current credential expires.
  let expiry;
  function checkExpiry() {
    const delay = socket.data.expiresAt - Date.now();
    if (delay <= 0) {
      socket.emit('session:expired');
      socket.disconnect();
      return;
    }
    expiry = setTimeout(checkExpiry, Math.min(delay, 2_147_483_647));
    expiry.unref();
  }
  socket.once('disconnect', () => clearTimeout(expiry));
  checkExpiry();
}

// [L40] Serve all three namespaces on the existing HTTP listener.
export function initSockets(httpServer) {
  const { cors } = config;
  const io = new Server(httpServer, {
    cors,
    allowRequest: (req, done) =>
      done(null, !req.headers.origin || req.headers.origin === cors.origin),
    maxHttpBufferSize: 10 * 1024,
  });
  const storefront = io.of('/');
  const account = io.of('/account');
  const admin = io.of('/admin');

  storefront.on('connection', (socket) => {
    function broadcast(productSlug) {
      const room = `product:${productSlug}`;
      storefront
        .to(room)
        .emit('viewers:count', {
          slug: productSlug,
          count: storefront.adapter.rooms.get(room)?.size ?? 0,
        });
    }
    onCommand(socket, 'product:join', productRoom, async ({ slug }) => {
      const previous = socket.data.product;
      if (previous && previous !== slug) {
        await socket.leave(`product:${previous}`);
        broadcast(previous);
      }
      await socket.join(`product:${slug}`);
      socket.data.product = slug;
      broadcast(slug);
    });
    onCommand(socket, 'product:leave', productRoom, async ({ slug }) => {
      if (socket.data.product !== slug) return;
      await socket.leave(`product:${slug}`);
      delete socket.data.product;
      broadcast(slug);
    });
    socket.on('disconnect', () => {
      if (socket.data.product) broadcast(socket.data.product);
    });
  });

  account.use(authorize());
  account.on('connection', (socket) => {
    bindAccount(socket);
    onCommand(socket, 'order:subscribe', orderRoom, async ({ orderId }) => {
      const order = await Order.findById(orderId).select('user').lean();
      if (!order) throw new AppError(404, codes.NOT_FOUND, 'Order not found');
      if (String(order.user) !== socket.data.userId)
        throw new AppError(
          403,
          codes.FORBIDDEN,
          'You can only follow your own orders'
        );
      if (socket.data.order && socket.data.order !== orderId)
        await socket.leave(`order:${socket.data.order}`);
      if (!socket.connected) return;
      await socket.join(`order:${orderId}`);
      socket.data.order = orderId;
    });
    onCommand(socket, 'order:unsubscribe', orderRoom, async ({ orderId }) => {
      if (socket.data.order !== orderId) return;
      await socket.leave(`order:${orderId}`);
      delete socket.data.order;
    });
  });

  admin.use(authorize('drop:publish'));
  admin.on('connection', (socket) => {
    bindAccount(socket);
    socket.join('admins');
    onCommand(socket, 'drop:publish', drop, async (announcement) => {
      const { user } = await verifyAccessUser(socket.handshake.auth.token);
      if (!PERMISSIONS['drop:publish'].includes(user.role))
        throw new AppError(403, codes.FORBIDDEN, 'Staff access required');
      if (Date.now() - (socket.data.lastDrop ?? 0) < 5000)
        throw new AppError(
          429,
          codes.RATE_LIMITED,
          'Wait before publishing another drop'
        );
      socket.data.lastDrop = Date.now();
      storefront.emit('drop:announce', announcement);
    });
  });
  return io;
}
