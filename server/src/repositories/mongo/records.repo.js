import Subscriber from '../../models/Subscriber.js';
import ContactMessage from '../../models/ContactMessage.js';

// [L25] Introduction to Mongoose ODM
// [L28] Building REST APIs with Database Integration (Records Mongo Repository)

export const subscriberRepo = {
  async findById(id) {
    const doc = await Subscriber.findById(id).lean();
    if (!doc) return null;
    return { ...doc, id: doc._id.toString(), _id: undefined, __v: undefined };
  },

  async create(data) {
    const doc = await Subscriber.create(data);
    return doc.toJSON();
  },

  /**
   * Idempotent subscriber registration using unique email index
   */
  async createIfAbsent(match, data) {
    const existing = await Subscriber.findOne(match).lean();
    if (existing) {
      return {
        record: { ...existing, id: existing._id.toString(), _id: undefined, __v: undefined },
        created: false,
      };
    }

    try {
      const doc = await Subscriber.create(data);
      return {
        record: doc.toJSON(),
        created: true,
      };
    } catch (err) {
      // Handle race condition on duplicate email
      if (err.code === 11000) {
        const found = await Subscriber.findOne(match).lean();
        return {
          record: { ...found, id: found._id.toString(), _id: undefined, __v: undefined },
          created: false,
        };
      }
      throw err;
    }
  },

  async remove(id) {
    const res = await Subscriber.deleteOne({ _id: id });
    return res.deletedCount > 0;
  },
};

export const contactRepo = {
  async findById(id) {
    const doc = await ContactMessage.findById(id).lean();
    if (!doc) return null;
    return { ...doc, id: doc._id.toString(), _id: undefined, __v: undefined };
  },

  async create(data) {
    const doc = await ContactMessage.create(data);
    return doc.toJSON();
  },

  async remove(id) {
    const res = await ContactMessage.deleteOne({ _id: id });
    return res.deletedCount > 0;
  },
};
