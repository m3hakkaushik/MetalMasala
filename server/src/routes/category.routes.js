import { Router } from 'express';
import { categoryRepo } from '../repositories/json/category.repo.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { slugify } from '../utils/formatters.js';

// [L9] Introduction to Express.js: Router modularisation
// [L10] CRUD Fundamentals: Full Category CRUD via S1 repository interface
// [L11] Request & Response Handling: Params, status codes, Location header

const router = Router();

/**
 * GET /categories
 * Public: List all categories sorted by sortOrder with dynamically calculated productCount.
 */
router.get('/', async (req, res, next) => {
  try {
    const { items } = await categoryRepo.findMany();
    return sendSuccess(res, items);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /categories/:id
 * Public: Get a single category by ID or slug.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    let category = await categoryRepo.findById(id);
    if (!category) {
      category = await categoryRepo.findBySlug(id);
    }

    if (!category) {
      return sendError(res, {
        status: 404,
        code: 'NOT_FOUND',
        message: `Category not found with identifier: ${id}`,
      });
    }

    return sendSuccess(res, category);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /categories
 * Access: manager+
 * // TODO(B2): protect + restrictTo('manager', 'admin')
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, nameHi, slug, description, image, sortOrder } = req.body;

    // Minimal validation [L11]
    if (!name || typeof name !== 'string' || !name.trim()) {
      return sendError(res, {
        status: 422,
        code: 'VALIDATION_ERROR',
        message: 'Category name is required',
        details: [{ field: 'name', message: 'Category name is required' }],
      });
    }

    const targetSlug = slug ? slugify(slug) : slugify(name);
    const existing = await categoryRepo.findBySlug(targetSlug);
    if (existing) {
      return sendError(res, {
        status: 409,
        code: 'CONFLICT',
        message: `Category with slug '${targetSlug}' already exists`,
      });
    }

    const created = await categoryRepo.create({
      name: name.trim(),
      nameHi: nameHi?.trim() || '',
      slug: targetSlug,
      description: description?.trim() || '',
      image: image || '',
      sortOrder: typeof sortOrder === 'number' ? sortOrder : undefined,
    });

    // 201 Created with Location header [L2, L10]
    return sendSuccess(res, created, {
      status: 201,
      headers: {
        Location: `/api/v1/categories/${created.id}`,
      },
      message: 'Category created successfully',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /categories/:id
 * Access: manager+
 * // TODO(B2): protect + restrictTo('manager', 'admin')
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    let existing = await categoryRepo.findById(id);
    if (!existing) {
      existing = await categoryRepo.findBySlug(id);
    }

    if (!existing) {
      return sendError(res, {
        status: 404,
        code: 'NOT_FOUND',
        message: `Category not found with identifier: ${id}`,
      });
    }

    // Slug conflict check if updating slug
    if (req.body.slug) {
      const newSlug = slugify(req.body.slug);
      if (newSlug !== existing.slug) {
        const slugOwner = await categoryRepo.findBySlug(newSlug);
        if (slugOwner && slugOwner.id !== existing.id) {
          return sendError(res, {
            status: 409,
            code: 'CONFLICT',
            message: `Category with slug '${newSlug}' already exists`,
          });
        }
      }
    }

    const updated = await categoryRepo.update(existing.id, req.body);
    return sendSuccess(res, updated, { message: 'Category updated successfully' });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /categories/:id
 * Access: admin
 * // TODO(B2): protect + restrictTo('admin')
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    let existing = await categoryRepo.findById(id);
    if (!existing) {
      existing = await categoryRepo.findBySlug(id);
    }

    if (!existing) {
      return sendError(res, {
        status: 404,
        code: 'NOT_FOUND',
        message: `Category not found with identifier: ${id}`,
      });
    }

    // Category-in-use protection [L10]
    const referencingProducts = await categoryRepo.countReferencingProducts(existing.id);
    if (referencingProducts > 0) {
      return sendError(res, {
        status: 409,
        code: 'CONFLICT',
        message: `Cannot delete category: ${referencingProducts} product(s) still reference it`,
      });
    }

    await categoryRepo.remove(existing.id);
    // 204 No Content has no body [L2, L10]
    return sendSuccess(res, null, { status: 204 });
  } catch (err) {
    next(err);
  }
});

export default router;
