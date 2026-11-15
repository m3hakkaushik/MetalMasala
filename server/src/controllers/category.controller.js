import { categoryService } from '../services/category.service.js';
import { sendSuccess } from '../utils/response.js';

// [L12] [L14] Controllers keep HTTP status and headers separate from repository access.
export const categoryController = {
  async list(_req, res) {
    return sendSuccess(res, await categoryService.list());
  },
  async get(req, res) {
    return sendSuccess(
      res,
      await categoryService.byIdentifier(req.validated.params.id)
    );
  },
  async create(req, res) {
    const category = await categoryService.create(req.validated.body);
    return sendSuccess(res, category, {
      status: 201,
      headers: { Location: `/api/v1/categories/${category.id}` },
      message: 'Category created successfully',
    });
  },
  async update(req, res) {
    const category = await categoryService.update(
      req.validated.params.id,
      req.validated.body
    );
    return sendSuccess(res, category, {
      message: 'Category updated successfully',
    });
  },
  async remove(req, res) {
    await categoryService.remove(req.validated.params.id);
    return sendSuccess(res, null, { status: 204 });
  },
};
