import mongoose from 'mongoose';
import Order from '../../models/Order.js';

// [L25] Introduction to Mongoose ODM
// [L28] Building REST APIs with Database Integration (Order Mongo Repository)

function formatOrder(doc) {
  if (!doc) return null;
  const order = typeof doc.toJSON === 'function' ? doc.toJSON() : { ...doc };

  if (!order.id && order._id) {
    order.id = order._id.toString();
  }
  delete order._id;
  delete order.__v;
  return order;
}

class MongoOrderRepository {
  /**
   * Create and persist a new order.
   * @param {object} data
   * @returns {Promise<object>}
   */
  async create(data) {
    const doc = await Order.create(data);
    return formatOrder(doc);
  }

  /**
   * Find order by ObjectId or unique orderNumber.
   * @param {string} idOrNumber
   * @returns {Promise<object|null>}
   */
  async findById(idOrNumber) {
    if (!idOrNumber) return null;
    let doc = null;
    if (mongoose.Types.ObjectId.isValid(idOrNumber)) {
      doc = await Order.findById(idOrNumber);
    }
    if (!doc) {
      doc = await Order.findOne({ orderNumber: idOrNumber });
    }
    return doc;
  }

  /**
   * Find customer's orders paginated and sorted newest first.
   * @param {string} userId
   * @param {object} [options]
   * @returns {Promise<{ items: Array, total: number }>}
   */
  async findByUser(userId, { page = 1, limit = 10 } = {}) {
    const query = { user: userId };
    const total = await Order.countDocuments(query);
    const skip = (Math.max(1, page) - 1) * limit;

    const docs = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const items = docs.map(formatOrder);
    return { items, total };
  }

  /**
   * Staff/Admin order listing with status filtering and text query search.
   * @param {object} params
   * @returns {Promise<{ items: Array, total: number }>}
   */
  async findAdmin({ status, q, page = 1, limit = 20 } = {}) {
    const query = {};

    if (status) {
      query.status = status;
    }

    if (q) {
      const qTrim = String(q).trim();
      query.$or = [
        { orderNumber: { $regex: qTrim, $options: 'i' } },
        { 'shippingAddress.fullName': { $regex: qTrim, $options: 'i' } },
        { 'shippingAddress.phone': { $regex: qTrim, $options: 'i' } },
      ];
    }

    const total = await Order.countDocuments(query);
    const skip = (Math.max(1, page) - 1) * limit;

    const docs = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const items = docs.map(formatOrder);
    return { items, total };
  }
}

export const orderRepo = new MongoOrderRepository();
export default orderRepo;
