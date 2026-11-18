import mongoose from 'mongoose';
import Review from '../../models/Review.js';

// [L23] Compound Index Querying
// [L28] Building REST APIs with Database Integration (Review Mongo Repository)

function formatReview(doc) {
  if (!doc) return null;
  const review = typeof doc.toJSON === 'function' ? doc.toJSON() : { ...doc };

  if (review.user && typeof review.user === 'object') {
    review.user = {
      id: review.user._id ? review.user._id.toString() : review.user.id,
      name: review.user.name || 'Verified Customer',
    };
  }

  if (!review.id && review._id) {
    review.id = review._id.toString();
  }
  delete review._id;
  delete review.__v;
  return review;
}

class MongoReviewRepository {
  /**
   * Find paginated reviews for a product.
   * @param {string} productId
   * @param {object} [options]
   * @returns {Promise<{ items: Array, total: number }>}
   */
  async findByProduct(productId, { page = 1, limit = 10, sort = 'newest' } = {}) {
    const query = { product: productId };
    const sortObj = sort === 'rating' ? { rating: -1, createdAt: -1 } : { createdAt: -1 };

    const total = await Review.countDocuments(query);
    const skip = (Math.max(1, page) - 1) * limit;

    const docs = await Review.find(query)
      .populate('user', 'name _id')
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .lean();

    const items = docs.map(formatReview);
    return { items, total };
  }

  /**
   * Find single review by product and user to prevent duplicate reviews.
   * @param {string} productId
   * @param {string} userId
   * @returns {Promise<object|null>}
   */
  async findByProductAndUser(productId, userId) {
    const doc = await Review.findOne({ product: productId, user: userId })
      .populate('user', 'name _id')
      .lean();
    return formatReview(doc);
  }

  /**
   * Find review by ID.
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await Review.findById(id).populate('user', 'name _id').lean();
    return formatReview(doc);
  }

  /**
   * Create review and trigger rating recalculation.
   * @param {object} data
   * @returns {Promise<object>}
   */
  async create(data) {
    const doc = await Review.create(data);
    const populated = await Review.findById(doc._id).populate('user', 'name _id').lean();
    return formatReview(populated);
  }

  /**
   * Remove review by ID and trigger rating recalculation.
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async remove(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return false;
    const doc = await Review.findByIdAndDelete(id);
    return !!doc;
  }
}

export const reviewRepo = new MongoReviewRepository();
export default reviewRepo;
