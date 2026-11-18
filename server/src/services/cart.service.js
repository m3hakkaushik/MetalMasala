import mongoose from 'mongoose';
import { ERROR_CODES as codes } from '../config/constants.js';
import { cartRepo } from '../repositories/mongo/cart.repo.js';
import { productRepo } from '../repositories/index.js';
import { AppError } from '../utils/AppError.js';

// [L28] Building REST APIs with Database Integration (Cart Service)

export const cartService = {
  /**
   * Get user's server-side cart.
   */
  async getCart(userId) {
    const cart = await cartRepo.findByUser(userId);
    return cart.toResponse();
  },

  /**
   * Add item to cart or increment quantity, with stock verification.
   */
  async addItem(userId, productId, qty = 1) {
    const product = await productRepo.findById(productId);
    if (!product) {
      throw new AppError(404, codes.NOT_FOUND, 'Product not found');
    }

    const cart = await cartRepo.findByUser(userId);
    const prodIdStr = product.id;
    const existingItem = cart.items.find(
      (item) => item.product._id?.toString() === prodIdStr || item.product.toString() === prodIdStr
    );

    const currentQty = existingItem ? existingItem.qty : 0;
    const requestedQty = currentQty + qty;

    if (requestedQty > product.stock) {
      throw new AppError(409, codes.OUT_OF_STOCK, `Insufficient stock for product "${product.name}"`, {
        productId: product.id,
        requested: requestedQty,
        available: product.stock,
      });
    }

    if (existingItem) {
      existingItem.qty = requestedQty;
    } else {
      cart.items.push({
        product: new mongoose.Types.ObjectId(product.id),
        qty: requestedQty,
      });
    }

    await cart.save();
    return (await cartRepo.findByUser(userId)).toResponse();
  },

  /**
   * Update quantity of a cart item. Setting qty to 0 removes the item.
   */
  async updateItem(userId, productId, qty) {
    if (qty <= 0) {
      return this.removeItem(userId, productId);
    }

    const product = await productRepo.findById(productId);
    if (!product) {
      throw new AppError(404, codes.NOT_FOUND, 'Product not found');
    }

    if (qty > product.stock) {
      throw new AppError(409, codes.OUT_OF_STOCK, `Insufficient stock for product "${product.name}"`, {
        productId: product.id,
        requested: qty,
        available: product.stock,
      });
    }

    const cart = await cartRepo.findByUser(userId);
    const prodIdStr = product.id;
    const item = cart.items.find(
      (i) => i.product._id?.toString() === prodIdStr || i.product.toString() === prodIdStr
    );

    if (!item) {
      throw new AppError(404, codes.NOT_FOUND, 'Item not found in cart');
    }

    item.qty = qty;
    await cart.save();
    return (await cartRepo.findByUser(userId)).toResponse();
  },

  /**
   * Remove item from cart.
   */
  async removeItem(userId, productId) {
    const product = await productRepo.findById(productId);
    const prodIdStr = product ? product.id : productId;

    const cart = await cartRepo.findByUser(userId);
    cart.items = cart.items.filter(
      (i) => i.product._id?.toString() !== prodIdStr && i.product.toString() !== prodIdStr
    );

    await cart.save();
    return (await cartRepo.findByUser(userId)).toResponse();
  },

  /**
   * Clear all items in user's cart.
   */
  async clearCart(userId) {
    await cartRepo.clear(userId);
    return (await cartRepo.findByUser(userId)).toResponse();
  },

  /**
   * Merge guest bag into user cart upon sign-in.
   */
  async mergeGuestCart(userId, guestItems = []) {
    const cart = await cartRepo.findByUser(userId);

    for (const guestItem of guestItems) {
      const { productId, qty = 1 } = guestItem;
      const product = await productRepo.findById(productId);
      if (!product || product.stock <= 0) continue;

      const prodIdStr = product.id;
      const existing = cart.items.find(
        (i) => i.product._id?.toString() === prodIdStr || i.product.toString() === prodIdStr
      );

      const totalQty = (existing ? existing.qty : 0) + qty;
      const cappedQty = Math.min(totalQty, product.stock);

      if (existing) {
        existing.qty = cappedQty;
      } else {
        cart.items.push({
          product: new mongoose.Types.ObjectId(product.id),
          qty: cappedQty,
        });
      }
    }

    await cart.save();
    return (await cartRepo.findByUser(userId)).toResponse();
  },
};

export default cartService;
