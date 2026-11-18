import { cartService } from '../services/cart.service.js';
import { sendSuccess } from '../utils/response.js';

// [L28] Cart Controllers
export const cartController = {
  async get(req, res) {
    const cart = await cartService.getCart(req.user.id);
    return sendSuccess(res, cart);
  },

  async addItem(req, res) {
    const { productId, qty } = req.body;
    const cart = await cartService.addItem(req.user.id, productId, qty);
    return sendSuccess(res, cart, {
      message: 'Item added to bag',
    });
  },

  async updateItem(req, res) {
    const { productId } = req.params;
    const { qty } = req.body;
    const cart = await cartService.updateItem(req.user.id, productId, qty);
    return sendSuccess(res, cart, {
      message: 'Cart updated',
    });
  },

  async removeItem(req, res) {
    const { productId } = req.params;
    const cart = await cartService.removeItem(req.user.id, productId);
    return sendSuccess(res, cart, {
      message: 'Item removed from bag',
    });
  },

  async clear(req, res) {
    const cart = await cartService.clearCart(req.user.id);
    return sendSuccess(res, cart, {
      message: 'Cart cleared',
    });
  },

  async merge(req, res) {
    const { items = [] } = req.body;
    const cart = await cartService.mergeGuestCart(req.user.id, items);
    return sendSuccess(res, cart, {
      message: 'Cart merged successfully',
    });
  },
};

export default cartController;
