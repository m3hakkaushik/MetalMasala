import { bus } from '../events/bus.js';
import { EVENTS } from '../events/events.js';
import mongoose from 'mongoose';
import { ERROR_CODES as codes } from '../config/constants.js';
import { reviewRepo } from '../repositories/mongo/review.repo.js';
import { productRepo } from '../repositories/index.js';
import Order from '../models/Order.js';
import { AppError } from '../utils/AppError.js';

// [L28] Building REST APIs with Database Integration (Review Service)

export const reviewService = {
  /**
   * List paginated reviews for a product.
   */
  async getReviews(productId, query = {}) {
    const product = await productRepo.findById(productId);
    if (!product) {
      throw new AppError(404, codes.NOT_FOUND, 'Product not found');
    }

    const { page = 1, limit = 10, sort = 'newest' } = query;
    const { items, total } = await reviewRepo.findByProduct(product.id, {
      page: Number(page),
      limit: Number(limit),
      sort,
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
   * Create product review with verified purchase check and duplicate prevention.
   */
  async createReview(productId, user, { rating, title, body }) {
    const product = await productRepo.findById(productId);
    if (!product) {
      throw new AppError(404, codes.NOT_FOUND, 'Product not found');
    }

    // Check if user already reviewed this product
    const existing = await reviewRepo.findByProductAndUser(product.id, user.id);
    if (existing) {
      throw new AppError(409, codes.CONFLICT, 'You have already reviewed this product');
    }

    // Check if user has a delivered order containing this product (verified purchase)
    const verifiedOrder = await Order.findOne({
      user: user.id,
      status: 'delivered',
      'items.product': new mongoose.Types.ObjectId(product.id),
    }).lean();

    const isVerifiedPurchase = !!verifiedOrder;

    const review = await reviewRepo.create({
      product: product.id,
      user: user.id,
      rating,
      title,
      body,
      isVerifiedPurchase,
    });

    bus.emit(EVENTS.REVIEW_CREATED, { review });

    return review;
  },

  /**
   * Delete review (owner or admin only).
   */
  async deleteReview(reviewId, user) {
    const review = await reviewRepo.findById(reviewId);
    if (!review) {
      throw new AppError(404, codes.NOT_FOUND, 'Review not found');
    }

    const isOwner = review.user && (review.user.id === user.id || review.user._id?.toString() === user.id);
    const isAdmin = user.role === 'admin';

    if (!isOwner && !isAdmin) {
      throw new AppError(403, codes.FORBIDDEN, 'You do not have permission to delete this review');
    }

    await reviewRepo.remove(reviewId);
    return true;
  },
};

export default reviewService;
