import Cart from '../../models/Cart.js';

// [L25] Introduction to Mongoose ODM
// [L28] Building REST APIs with Database Integration (Cart Mongo Repository)

class MongoCartRepository {
  /**
   * Find or create cart for a given user.
   * @param {string} userId
   * @returns {Promise<object>}
   */
  async findByUser(userId) {
    let cart = await Cart.findOne({ user: userId }).populate(
      'items.product',
      'name slug price images stock'
    );

    if (!cart) {
      cart = await Cart.create({ user: userId, items: [] });
    }

    return cart;
  }

  /**
   * Clear all items in user's cart.
   * @param {string} userId
   * @returns {Promise<object>}
   */
  async clear(userId) {
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = await Cart.create({ user: userId, items: [] });
    } else {
      cart.items = [];
      await cart.save();
    }
    return cart;
  }
}

export const cartRepo = new MongoCartRepository();
export default cartRepo;
