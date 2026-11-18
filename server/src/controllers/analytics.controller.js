import { analyticsService } from '../services/analytics.service.js';
import { sendSuccess } from '../utils/response.js';

// [L23] Admin Analytics Controllers
export const analyticsController = {
  async getSummary(_req, res) {
    const summary = await analyticsService.getSummary();
    return sendSuccess(res, summary);
  },

  async getRevenue(req, res) {
    const { range } = req.query;
    const revenue = await analyticsService.getRevenue(range);
    return sendSuccess(res, revenue);
  },

  async getSalesByCategory(_req, res) {
    const sales = await analyticsService.getSalesByCategory();
    return sendSuccess(res, sales);
  },

  async getTopProducts(req, res) {
    const { limit } = req.query;
    const top = await analyticsService.getTopProducts(limit);
    return sendSuccess(res, top);
  },
};

export default analyticsController;
