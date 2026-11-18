import { Router } from 'express';
import crypto from 'node:crypto';
import { productRepo } from '../repositories/json/product.repo.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { slugify } from '../utils/formatters.js';
import { productsToCsv } from '../../scripts/export-products.js';
import { MATERIALS, FINISHES, PAGINATION } from '../config/constants.js';

// [L9] Introduction to Express.js: Resource routing
// [L10] CRUD Fundamentals: Full Product CRUD with S1 repository interface
// [L11] Request & Response Handling: Params, query filters, headers, ETags, CSV streaming

const router = Router();

/**
 * Computes a weak ETag for response caching.
 * @param {string|object} content
 * @returns {string}
 */
function computeETag(content) {
  const str = typeof content === 'string' ? content : JSON.stringify(content);
  const hash = crypto.createHash('sha1').update(str).digest('hex');
  return `W/"${hash}"`;
}

/**
 * GET /products/export.csv
 * Access: manager+
 * // TODO(B2): protect + restrictTo('manager', 'admin')
 * NOTE: Defined BEFORE /products/:slug so the route is not caught by the slug parameter!
 */
router.get('/export.csv', async (req, res, next) => {
  try {
    const products = await productRepo.getAllRaw();
    const csvContent = productsToCsv(products);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="products.csv"');
    return res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /products
 * Public: Filter, search, sort, and paginate catalogue products.
 */
router.get('/', async (req, res, next) => {
  try {
    // [L11] Query parameters extraction
    const {
      page = PAGINATION.DEFAULT_PAGE,
      limit = PAGINATION.DEFAULT_LIMIT,
      sort = 'newest',
      q,
      category,
      minPrice,
      maxPrice,
      material,
      finish,
      tags,
      featured,
      newDrop,
      inStock,
    } = req.query;

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.max(1, Math.min(PAGINATION.MAX_LIMIT, parseInt(limit, 10) || PAGINATION.DEFAULT_LIMIT));

    const filter = {
      q,
      category,
      minPrice: minPrice !== undefined ? Number(minPrice) : undefined,
      maxPrice: maxPrice !== undefined ? Number(maxPrice) : undefined,
      material,
      finish,
      tags,
      featured,
      newDrop,
      inStock,
    };

    const { items, total } = await productRepo.findMany({
      filter,
      sort,
      page: parsedPage,
      limit: parsedLimit,
    });

    const totalPages = Math.ceil(total / parsedLimit) || 1;
    const meta = {
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages,
      hasNext: parsedPage < totalPages,
      hasPrev: parsedPage > 1,
    };

    // [L2, L11] ETag and Cache-Control headers
    const etag = computeETag(items);
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'public, max-age=60');

    const clientETag = req.get('If-None-Match');
    if (clientETag && (clientETag === etag || clientETag.replace(/^W\//, '') === etag.replace(/^W\//, ''))) {
      return res.status(304).end();
    }

    return sendSuccess(res, items, { meta });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /products/:slug
 * Public: Retrieve a single product by slug.
 */
router.get('/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const product = await productRepo.findBySlug(slug);

    if (!product) {
      return sendError(res, {
        status: 404,
        code: 'NOT_FOUND',
        message: `Product not found with slug: ${slug}`,
      });
    }

    // [L2, L11] ETag & Cache-Control for single product
    const etag = computeETag(product);
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'public, max-age=60');

    const clientETag = req.get('If-None-Match');
    if (clientETag && (clientETag === etag || clientETag.replace(/^W\//, '') === etag.replace(/^W\//, ''))) {
      return res.status(304).end();
    }

    return sendSuccess(res, product);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /products
 * Access: manager+
 * // TODO(B2): protect + restrictTo('manager', 'admin')
 */
router.post('/', async (req, res, next) => {
  try {
    const body = req.body;
    const details = [];

    // Validation [L11]
    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      details.push({ field: 'name', message: 'Product name is required' });
    }
    if (body.price === undefined || body.price === null || isNaN(body.price) || Number(body.price) <= 0) {
      details.push({ field: 'price', message: 'Price must be greater than 0' });
    }
    if (!body.category) {
      details.push({ field: 'category', message: 'Product category is required' });
    }
    if (body.material && !MATERIALS.includes(body.material)) {
      details.push({
        field: 'material',
        message: `Material must be one of: ${MATERIALS.join(', ')}`,
      });
    }
    if (body.finish && !FINISHES.includes(body.finish)) {
      details.push({
        field: 'finish',
        message: `Finish must be one of: ${FINISHES.join(', ')}`,
      });
    }

    if (details.length > 0) {
      return sendError(res, {
        status: 422,
        code: 'VALIDATION_ERROR',
        message: details[0].message,
        details,
      });
    }

    const targetSlug = body.slug ? slugify(body.slug) : slugify(body.name);
    const existing = await productRepo.findBySlug(targetSlug);
    if (existing) {
      return sendError(res, {
        status: 409,
        code: 'CONFLICT',
        message: `Product with slug '${targetSlug}' already exists`,
      });
    }

    const created = await productRepo.create({
      ...body,
      slug: targetSlug,
    });

    // [L2, L10] 201 Created with Location header
    return sendSuccess(res, created, {
      status: 201,
      headers: {
        Location: `/api/v1/products/${created.slug}`,
      },
      message: 'Product created successfully',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /products/:id
 * Access: manager+
 * // TODO(B2): protect + restrictTo('manager', 'admin')
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    let existing = await productRepo.findById(id);
    if (!existing) {
      existing = await productRepo.findBySlug(id);
    }

    if (!existing) {
      return sendError(res, {
        status: 404,
        code: 'NOT_FOUND',
        message: `Product not found with identifier: ${id}`,
      });
    }

    // Validation if price or enums are updated
    if (req.body.price !== undefined && (isNaN(req.body.price) || Number(req.body.price) <= 0)) {
      return sendError(res, {
        status: 422,
        code: 'VALIDATION_ERROR',
        message: 'Price must be greater than 0',
        details: [{ field: 'price', message: 'Price must be greater than 0' }],
      });
    }

    if (req.body.slug) {
      const newSlug = slugify(req.body.slug);
      if (newSlug !== existing.slug) {
        const slugOwner = await productRepo.findBySlug(newSlug);
        if (slugOwner && slugOwner.id !== existing.id) {
          return sendError(res, {
            status: 409,
            code: 'CONFLICT',
            message: `Product with slug '${newSlug}' already exists`,
          });
        }
      }
    }

    const updated = await productRepo.update(existing.id, req.body);
    return sendSuccess(res, updated, { message: 'Product updated successfully' });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /products/:id
 * Access: admin
 * // TODO(B2): protect + restrictTo('admin')
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    let existing = await productRepo.findById(id);
    if (!existing) {
      existing = await productRepo.findBySlug(id);
    }

    if (!existing) {
      return sendError(res, {
        status: 404,
        code: 'NOT_FOUND',
        message: `Product not found with identifier: ${id}`,
      });
    }

    await productRepo.remove(existing.id);
    // [L2, L10] 204 No Content with no body
    return sendSuccess(res, null, { status: 204 });
  } catch (err) {
    next(err);
  }
});

export default router;
