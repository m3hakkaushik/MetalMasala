import { orderService } from '../services/order.service.js';
import { sendSuccess } from '../utils/response.js';

// [L28] Order Controllers
export const orderController = {
  async create(req, res) {
    const { shippingAddress, paymentMethod, notes } = req.body;
    const order = await orderService.createOrder(req.user.id, {
      shippingAddress,
      paymentMethod,
      notes,
    });
    return sendSuccess(res, order, {
      status: 201,
      message: 'Order placed successfully',
    });
  },

  async list(req, res) {
    const { items, meta } = await orderService.getUserOrders(req.user.id, req.query);
    return sendSuccess(res, items, { meta });
  },

  async get(req, res) {
    const { id } = req.params;
    const order = await orderService.getOrderById(id, req.user);
    return sendSuccess(res, order);
  },

  async cancel(req, res) {
    const { id } = req.params;
    const order = await orderService.cancelOrder(id, req.user);
    return sendSuccess(res, order, {
      message: 'Order cancelled successfully',
    });
  },

  async listAdmin(req, res) {
    const { items, meta } = await orderService.getAdminOrders(req.query);
    return sendSuccess(res, items, { meta });
  },

  async updateStatus(req, res) {
    const { id } = req.params;
    const { status, note } = req.body;
    const order = await orderService.updateOrderStatus(id, status, note, req.user);
    return sendSuccess(res, order, {
      message: `Order status updated to ${status}`,
    });
  },
};

export default orderController;
