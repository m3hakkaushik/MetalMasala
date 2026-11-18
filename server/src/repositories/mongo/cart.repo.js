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
    const criteria = { user: userId };
    const cart = await Cart.findOne(criteria).populate('items.product', 'name slug price images stock');
    if (cart) return cart;

    // The bag GET and guest merge can arrive together immediately after sign-in.
    return Cart.findOneAndUpdate(criteria, { $setOnInsert: { items: [] } }, {
      upsert: true, returnDocument: 'after',
    }).populate('items.product', 'name slug price images stock');
  }

  /**
   * Clear all items in user's cart.
   * @param {string} userId
   * @returns {Promise<object>}
   */
  async clear(userId) {
    return Cart.findOneAndUpdate({ user: userId }, { $set: { items: [] } }, {
      upsert: true, returnDocument: 'after',
    });
  }
}

export const cartRepo = new MongoCartRepository();
export default cartRepo;
