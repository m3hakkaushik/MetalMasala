import { aiService } from '../services/ai.service.js';
import { sendSuccess } from '../utils/response.js';

// [L43] AI Controllers
export const aiController = {
  async stylist(req, res) {
    const { message, history } = req.body;
    const result = await aiService.stylist({ message, history });
    return sendSuccess(res, result);
  },

  async describe(req, res) {
    const result = await aiService.describe(req.body);
    return sendSuccess(res, result);
  },
};

export default aiController;
