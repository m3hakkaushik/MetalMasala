import config from '../config/index.js';
import { ERROR_CODES as codes } from '../config/constants.js';
import { productRepo, categoryRepo } from '../repositories/index.js';
import { productsToCsv } from '../../scripts/export-products.js';
import { AppError } from '../utils/AppError.js';
import { slugify } from '../utils/formatters.js';
import { resolveSlug } from './catalogueSlug.js';
import { catalogueWrite } from './catalogueWrites.js';

const isLowStock = (stock) => stock <= config.stock.lowStockThreshold;

async function categorySnapshot(category) {
  if (typeof category !== 'string') return category;
  const found =
    (await categoryRepo.findById(category)) ??
    (await categoryRepo.findBySlug(category));
  // B1 stored unknown string references as a display snapshot. Existing clients and records can still use them.
  if (!found) return { id: category, name: category, slug: slugify(category) };
  return { id: found.id, name: found.name, slug: found.slug };
}

function checkCompareAtPrice(product) {
  if (product.compareAtPrice == null || product.compareAtPrice >= product.price)
    return;
  const message = 'Compare-at price must be at least the current price';
  throw new AppError(422, codes.VALIDATION_ERROR, message, [
    { field: 'compareAtPrice', message },
  ]);
}

function missing(identifier) {
  return new AppError(
    404,
    codes.NOT_FOUND,
    `Product not found with identifier: ${identifier}`
  );
}

async function byIdentifier(id) {
  const product =
    (await productRepo.findById(id)) ?? (await productRepo.findBySlug(id));
  if (!product) throw missing(id);
  return product;
}

// [L12] [L13] Business rules live here. The repository implements filter and sort operations for JSON.
export const productService = {
  async list({ page, limit, sort, ...filter }) {
    const { items, total } = await productRepo.findMany({
      filter,
      sort,
      page,
      limit,
    });
    const totalPages = Math.ceil(total / limit) || 1;
    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  },
  async bySlug(slug) {
    const product = await productRepo.findBySlug(slug);
    if (!product)
      throw new AppError(
        404,
        codes.NOT_FOUND,
        `Product not found with slug: ${slug}`
      );
    return product;
  },
  create(data) {
    return catalogueWrite(async () => {
      checkCompareAtPrice(data);
      const slug = await resolveSlug(
        productRepo,
        'Product',
        data.slug,
        data.name
      );
      const category = await categorySnapshot(data.category);
      return productRepo.create({ ...data, slug, category });
    });
  },
  update(id, patch) {
    return catalogueWrite(async () => {
      const current = await byIdentifier(id);
      const data = { ...patch };
      checkCompareAtPrice({ ...current, ...data });
      if (data.slug)
        data.slug = await resolveSlug(
          productRepo,
          'Product',
          data.slug,
          current.name,
          current.id
        );
      if (data.category) data.category = await categorySnapshot(data.category);
      const updated = await productRepo.update(current.id, data);
      if (!updated) throw missing(id);
      return updated;
    });
  },
  remove(id) {
    return catalogueWrite(async () => {
      const { id: productId } = await byIdentifier(id);
      if (!(await productRepo.remove(productId))) throw missing(id);
    });
  },
  async exportCsv() {
    const products = await productRepo.getAllRaw();
    return productsToCsv(products);
  },
  // [L23] Facets aggregation for catalogue sidebar filters
  async getFacets(filter) {
    if (typeof productRepo.getFacets === 'function') {
      return productRepo.getFacets(filter);
    }
    return {
      price: { min: 299, max: 2499 },
      categories: [],
      finishes: [],
      materials: [],
      tags: [],
    };
  },
  // [L28] Related products by category and tags
  async getRelated(slug, limit = 8) {
    if (typeof productRepo.findRelated === 'function') {
      return productRepo.findRelated(slug, limit);
    }
    const current = await this.bySlug(slug);
    const { items } = await productRepo.findMany({ limit: limit + 1 });
    return items.filter((p) => p.slug !== current.slug).slice(0, limit);
  },
  isLowStock,
};
