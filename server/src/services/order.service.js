import { bus } from '../events/bus.js';
import { EVENTS } from '../events/events.js';
import crypto from 'node:crypto';
import { ERROR_CODES as codes } from '../config/constants.js';
import { orderRepo } from '../repositories/mongo/order.repo.js';
import { cartRepo } from '../repositories/mongo/cart.repo.js';
import Product from '../models/Product.js';
import { calculateQuote } from './pricing.service.js';
import { AppError } from '../utils/AppError.js';

// [L28] Building REST APIs with Database Integration (Order Service with Atomic Concurrency Safety)

export const orderService = {
  /**
   * Create an order from the user's server-side cart.
   * Performs atomic stock decrement with compensation rollback on concurrency conflict.
   */
  async createOrder(userId, { shippingAddress, paymentMethod, notes }) {
    // 1. Load user's cart
    const cart = await cartRepo.findByUser(userId);
    if (!cart || !cart.items || cart.items.length === 0) {
      throw new AppError(400, codes.BAD_REQUEST, 'Cart is empty');
    }

    // 2. Re-fetch all products directly from database (never trust client or stale cart)
    const itemsToOrder = [];
    for (const item of cart.items) {
      const prodId = item.product?._id || item.product;
      const product = await Product.findById(prodId);
      if (!product) {
        throw new AppError(404, codes.NOT_FOUND, `Product not found with id ${prodId}`);
      }
      if (product.stock < item.qty) {
        throw new AppError(409, codes.OUT_OF_STOCK, `Insufficient stock for product "${product.name}"`, {
          productId: product._id.toString(),
          requested: item.qty,
          available: product.stock,
        });
      }
      itemsToOrder.push({
        product,
        qty: item.qty,
      });
    }

    // 3. Atomic stock decrement with compensation on failure
    const decremented = [];
    try {
      for (const { product, qty } of itemsToOrder) {
        const updateResult = await Product.updateOne(
          { _id: product._id, stock: { $gte: qty } },
          { $inc: { stock: -qty, soldCount: qty } }
        );

        if (updateResult.modifiedCount === 0) {
          throw new AppError(
            409,
            codes.OUT_OF_STOCK,
            `Stock conflict: "${product.name}" was just reserved by another customer.`
          );
        }

        decremented.push({ product, qty });
      }
    } catch (error) {
      // Compensate: rollback all successfully decremented items
      for (const item of decremented) {
        await Product.updateOne(
          { _id: item.product._id },
          { $inc: { stock: item.qty, soldCount: -item.qty } }
        );
      }
      throw error;
    }

    // 4. Compute pricing via pricing service
    const rawSubtotal = itemsToOrder.reduce((sum, { product, qty }) => sum + product.price * qty, 0);
    const quote = calculateQuote(rawSubtotal, paymentMethod);

    // 5. Freeze snapshot items
    const snapshotItems = itemsToOrder.map(({ product, qty }) => ({
      product: product._id,
      name: product.name,
      slug: product.slug,
      image: product.images?.[0]?.url || '',
      price: product.price,
      qty,
      lineTotal: product.price * qty,
    }));

    // 6. Generate unique orderNumber
    const year = new Date().getFullYear();
    let orderNumber = '';
    let savedOrder = null;
    let attempts = 0;

    while (!savedOrder && attempts < 5) {
      attempts++;
      const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
      orderNumber = `MM-${year}-${randomSuffix}`;

      // 7. Payment status
      const payment = {
        method: paymentMethod,
        status: paymentMethod === 'cod' ? 'pending' : 'paid',
        transactionId: paymentMethod === 'cod' ? undefined : `MOCK-${crypto.randomUUID()}`,
      };

      try {
        savedOrder = await orderRepo.create({
          orderNumber,
          user: userId,
          items: snapshotItems,
          shippingAddress,
          pricing: {
            subtotal: quote.subtotal,
            shipping: quote.shipping,
            codFee: quote.codFee,
            discount: quote.discount || 0,
            total: quote.total,
          },
          payment,
          status: 'placed',
          statusHistory: [
            {
              status: 'placed',
              at: new Date(),
              note: notes ? `Order placed. Customer note: ${notes}` : 'Order placed',
            },
          ],
        });
      } catch (err) {
        if (err.code === 11000 && attempts < 5) {
          continue; // Retry on duplicate orderNumber collision
        }
        throw err;
      }
    }

    bus.emit(EVENTS.ORDER_PLACED, { order: savedOrder });

    // 8. Clear user's cart
    await cartRepo.clear(userId);

    return savedOrder;
  },

  /**
   * List customer's own orders.
   */
  async getUserOrders(userId, query = {}) {
    const { page = 1, limit = 10 } = query;
    const { items, total } = await orderRepo.findByUser(userId, {
      page: Number(page),
      limit: Number(limit),
    });
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  },

  /**
   * Get single order by ID with ownership enforcement.
   */
  async getOrderById(orderId, user) {
    const order = await orderRepo.findById(orderId);
    if (!order) {
      throw new AppError(404, codes.NOT_FOUND, 'Order not found');
    }

    // Ownership check in service
    const isOwner = order.user?.toString() === user.id;
    const isStaff = ['manager', 'admin'].includes(user.role);

    if (!isOwner && !isStaff) {
      throw new AppError(403, codes.FORBIDDEN, 'You do not have permission to view this order');
    }

    return typeof order.toJSON === 'function' ? order.toJSON() : order;
  },

  /**
   * Cancel order (owner only, only if placed or confirmed) and restock inventory.
   */
  async cancelOrder(orderId, user) {
    const order = await orderRepo.findById(orderId);
    if (!order) {
      throw new AppError(404, codes.NOT_FOUND, 'Order not found');
    }

    // Ownership check
    const isOwner = order.user?.toString() === user.id;
    if (!isOwner) {
      throw new AppError(403, codes.FORBIDDEN, 'You can only cancel your own orders');
    }

    // State machine check
    if (!['placed', 'confirmed'].includes(order.status)) {
      throw new AppError(
        409,
        codes.CONFLICT,
        `Cannot cancel an order in "${order.status}" status.`
      );
    }

    const from = order.status;
    order.status = 'cancelled';
    order.statusHistory.push({
      status: 'cancelled',
      at: new Date(),
      note: 'Cancelled by customer',
    });

    // Restock all items
    for (const item of order.items) {
      await Product.updateOne(
        { _id: item.product },
        { $inc: { stock: item.qty, soldCount: -item.qty } }
      );
    }

    await order.save();

    bus.emit(EVENTS.ORDER_STATUS_CHANGED, { order, from, to: 'cancelled' });

    return typeof order.toJSON === 'function' ? order.toJSON() : order;
  },

  /**
   * Staff/Admin orders list.
   */
  async getAdminOrders(query = {}) {
    const { status, q, page = 1, limit = 20 } = query;
    const { items, total } = await orderRepo.findAdmin({
      status,
      q,
      page: Number(page),
      limit: Number(limit),
    });
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  },

  /**
   * Staff/Admin order status transition.
   */
  async updateOrderStatus(orderId, newStatus, note, _staffUser) {
    const order = await orderRepo.findById(orderId);
    if (!order) {
      throw new AppError(404, codes.NOT_FOUND, 'Order not found');
    }

    // Enforce transition rules
    if (!order.canTransitionTo(newStatus)) {
      throw new AppError(
        409,
        codes.CONFLICT,
        `Invalid status transition from "${order.status}" to "${newStatus}"`
      );
    }

    const from = order.status;
    order.status = newStatus;
    order.statusHistory.push({
      status: newStatus,
      at: new Date(),
      note: note || `Status updated to ${newStatus} by staff`,
    });

    // If staff cancelled, restock
    if (newStatus === 'cancelled') {
      for (const item of order.items) {
        await Product.updateOne(
          { _id: item.product },
          { $inc: { stock: item.qty, soldCount: -item.qty } }
        );
      }
    }

    await order.save();

    bus.emit(EVENTS.ORDER_STATUS_CHANGED, { order, from, to: newStatus });

    return typeof order.toJSON === 'function' ? order.toJSON() : order;
  },
};

export default orderService;
