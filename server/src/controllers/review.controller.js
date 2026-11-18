import { reviewService } from '../services/review.service.js';
import { sendSuccess } from '../utils/response.js';

// [L28] Review Controllers
export const reviewController = {
  async list(req, res) {
    const { productId } = req.params;
    const { items, meta } = await reviewService.getReviews(productId, req.query);
    return sendSuccess(res, items, { meta });
  },

  async create(req, res) {
    const { productId } = req.params;
    const { rating, title, body } = req.body;
    const review = await reviewService.createReview(productId, req.user, {
      rating,
      title,
      body,
    });
    return sendSuccess(res, review, {
      status: 201,
      message: 'Review submitted successfully',
    });
  },

  async remove(req, res) {
    const { id } = req.params;
    await reviewService.deleteReview(id, req.user);
    return sendSuccess(res, null, { status: 204 });
  },
};

export default reviewController;
