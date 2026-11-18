import crypto from 'node:crypto';
import { readStore, writeStore } from '../../utils/jsonStore.js';
import { slugify } from '../../utils/formatters.js';
import { categoryRepo } from './category.repo.js';

// [L10] CRUD Fundamentals: Product repository implementing S1 interface
// [L11] Request & Response Handling: Comprehensive query filtering, sorting, and pagination
// Persists to server/data/store/products.json

const STORE_FILE = 'products.json';

/**
 * [L13] Computes catalogue discounts and availability according to API contract §3.
 */
function applyVirtuals(product) {
  const stock = typeof product.stock === 'number' ? product.stock : 0;
  const inStock = stock > 0;
  let discountPercent = 0;
  if (product.compareAtPrice && product.compareAtPrice > product.price) {
    discountPercent = Math.round(
      ((product.compareAtPrice - product.price) / product.compareAtPrice) * 100
    );
  }

  return {
    ...product,
    stock,
    inStock,
    discountPercent,
  };
}

class ProductRepository {
  /**
   * Find many products with filtering, sorting, and pagination.
   * @param {object} params
   * @param {object} [params.filter]
   * @param {string} [params.sort='newest']
   * @param {number} [params.page=1]
   * @param {number} [params.limit=12]
   * @returns {Promise<{ items: Array, total: number }>}
   */
  async findMany({ filter = {}, sort = 'newest', page = 1, limit = 12 } = {}) {
    let products = await readStore(STORE_FILE, []);

    // 1. Text search `q` across name, tagline, description, tags
    if (filter.q) {
      const q = String(filter.q).toLowerCase().trim();
      products = products.filter((p) => {
        const inName = p.name && p.name.toLowerCase().includes(q);
        const inTagline = p.tagline && p.tagline.toLowerCase().includes(q);
        const inDescription = p.description && p.description.toLowerCase().includes(q);
        const inTags = Array.isArray(p.tags) && p.tags.some((t) => t.toLowerCase().includes(q));
        return inName || inTagline || inDescription || inTags;
      });
    }

    // 2. Category filter (comma-separated slug list, any-of)
    if (filter.category) {
      const slugs = String(filter.category)
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (slugs.length > 0) {
        products = products.filter((p) => {
          const productCatSlug = p.category?.slug?.toLowerCase();
          const productCatId = p.category?.id?.toLowerCase();
          return (
            (productCatSlug && slugs.includes(productCatSlug)) ||
            (productCatId && slugs.includes(productCatId)) ||
            (typeof p.category === 'string' && slugs.includes(p.category.toLowerCase()))
          );
        });
      }
    }

    // 3. Price range (minPrice, maxPrice)
    if (filter.minPrice !== undefined && filter.minPrice !== null && !isNaN(filter.minPrice)) {
      products = products.filter((p) => p.price >= Number(filter.minPrice));
    }
    if (filter.maxPrice !== undefined && filter.maxPrice !== null && !isNaN(filter.maxPrice)) {
      products = products.filter((p) => p.price <= Number(filter.maxPrice));
    }

    // 4. Material (comma-separated list, any-of)
    if (filter.material) {
      const materials = String(filter.material)
        .split(',')
        .map((m) => m.trim().toLowerCase())
        .filter(Boolean);
      if (materials.length > 0) {
        products = products.filter(
          (p) => p.material && materials.includes(p.material.toLowerCase())
        );
      }
    }

    // 5. Finish (comma-separated list, any-of)
    if (filter.finish) {
      const finishes = String(filter.finish)
        .split(',')
        .map((f) => f.trim().toLowerCase())
        .filter(Boolean);
      if (finishes.length > 0) {
        products = products.filter((p) => p.finish && finishes.includes(p.finish.toLowerCase()));
      }
    }

    // 6. Tags (comma-separated list, any-of)
    if (filter.tags) {
      const tags = String(filter.tags)
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
      if (tags.length > 0) {
        products = products.filter(
          (p) =>
            Array.isArray(p.tags) &&
            p.tags.some((pt) => tags.includes(pt.toLowerCase()))
        );
      }
    }

    // 7. Boolean flags (isFeatured, isNewDrop, inStock)
    if (filter.featured === true || filter.featured === 'true') {
      products = products.filter((p) => p.isFeatured === true);
    }
    if (filter.newDrop === true || filter.newDrop === 'true') {
      products = products.filter((p) => p.isNewDrop === true);
    }
    if (filter.inStock === true || filter.inStock === 'true') {
      products = products.filter((p) => (p.stock || 0) > 0);
    }

    // 8. Sorting
    switch (sort) {
      case 'price-asc':
        products.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price-desc':
        products.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'popular':
        products.sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0));
        break;
      case 'rating':
        products.sort((a, b) => (b.ratingAverage || 0) - (a.ratingAverage || 0));
        break;
      case 'newest':
      default:
        products.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        break;
    }

    const total = products.length;
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.max(1, Math.min(48, Number(limit) || 12));
    const startIndex = (safePage - 1) * safeLimit;
    const items = products.slice(startIndex, startIndex + safeLimit).map(applyVirtuals);

    return { items, total };
  }

  /**
   * Find product by ID.
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    const products = await readStore(STORE_FILE, []);
    const product = products.find((p) => p.id === id);
    return product ? applyVirtuals(product) : null;
  }

  /**
   * Find product by slug.
   * @param {string} slug
   * @returns {Promise<object|null>}
   */
  async findBySlug(slug) {
    const products = await readStore(STORE_FILE, []);
    const product = products.find((p) => p.slug === slug);
    return product ? applyVirtuals(product) : null;
  }

  /**
   * Create a new product.
   * @param {object} data
   * @returns {Promise<object>}
   */
  async create(data) {
    const products = await readStore(STORE_FILE, []);
    const slug = data.slug ? slugify(data.slug) : slugify(data.name);

    // Resolve category object if string ID or slug was provided
    let categoryObj = data.category;
    if (typeof data.category === 'string') {
      const matched = (await categoryRepo.findById(data.category)) || (await categoryRepo.findBySlug(data.category));
      if (matched) {
        categoryObj = {
          id: matched.id,
          name: matched.name,
          slug: matched.slug,
        };
      } else {
        categoryObj = {
          id: data.category,
          name: data.category,
          slug: slugify(data.category),
        };
      }
    }

    const now = new Date().toISOString();
    const defaultId = `prod-${slug || crypto.randomUUID().slice(0, 8)}`;
    const newProduct = {
      id: data.id ?? (products.some(({ id }) => id === defaultId) ? crypto.randomUUID() : defaultId),
      name: data.name,
      slug,
      tagline: data.tagline || '',
      description: data.description || '',
      price: Number(data.price),
      compareAtPrice: data.compareAtPrice ? Number(data.compareAtPrice) : null,
      currency: data.currency || 'INR',
      category: categoryObj,
      tags: Array.isArray(data.tags) ? data.tags : [],
      material: data.material || 'brass',
      finish: data.finish || 'oxidized-silver',
      images: Array.isArray(data.images) ? data.images : [],
      stock: typeof data.stock === 'number' ? data.stock : 0,
      sku: data.sku || `MM-${slug.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
      isFeatured: Boolean(data.isFeatured),
      isNewDrop: Boolean(data.isNewDrop),
      ratingAverage: typeof data.ratingAverage === 'number' ? data.ratingAverage : 0,
      ratingCount: typeof data.ratingCount === 'number' ? data.ratingCount : 0,
      soldCount: typeof data.soldCount === 'number' ? data.soldCount : 0,
      craft: data.craft || { artisan: '', region: '', technique: '' },
      details: data.details || { weightGrams: 0, lengthMm: 0, care: '' },
      createdAt: data.createdAt || now,
      updatedAt: now,
    };

    products.push(newProduct);
    await writeStore(STORE_FILE, products);
    return applyVirtuals(newProduct);
  }

  /**
   * Update an existing product by ID.
   * @param {string} id
   * @param {object} patch
   * @returns {Promise<object|null>}
   */
  async update(id, patch) {
    const products = await readStore(STORE_FILE, []);
    const index = products.findIndex((p) => p.id === id);
    if (index === -1) return null;

    const existing = products[index];

    // Category resolution if updated
    let categoryObj = existing.category;
    if (patch.category) {
      if (typeof patch.category === 'string') {
        const matched = (await categoryRepo.findById(patch.category)) || (await categoryRepo.findBySlug(patch.category));
        if (matched) {
          categoryObj = {
            id: matched.id,
            name: matched.name,
            slug: matched.slug,
          };
        } else {
          categoryObj = {
            id: patch.category,
            name: patch.category,
            slug: slugify(patch.category),
          };
        }
      } else {
        categoryObj = patch.category;
      }
    }

    const updated = {
      ...existing,
      ...patch,
      id: existing.id, // prevent changing id
      slug: patch.slug ? slugify(patch.slug) : existing.slug,
      category: categoryObj,
      price: patch.price !== undefined ? Number(patch.price) : existing.price,
      compareAtPrice: patch.compareAtPrice !== undefined ? (patch.compareAtPrice ? Number(patch.compareAtPrice) : null) : existing.compareAtPrice,
      stock: patch.stock !== undefined ? Number(patch.stock) : existing.stock,
      updatedAt: new Date().toISOString(),
    };

    products[index] = updated;
    await writeStore(STORE_FILE, products);
    return applyVirtuals(updated);
  }

  /**
   * Remove a product by ID.
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async remove(id) {
    const products = await readStore(STORE_FILE, []);
    const initialLen = products.length;
    const remaining = products.filter((p) => p.id !== id);

    if (remaining.length === initialLen) {
      return false;
    }

    await writeStore(STORE_FILE, remaining);
    return true;
  }

  /**
   * Return all products raw without pagination (for export).
   * @returns {Promise<Array>}
   */
  async getAllRaw() {
    const products = await readStore(STORE_FILE, []);
    return products.map(applyVirtuals);
  }
}

export const productRepo = new ProductRepository();
