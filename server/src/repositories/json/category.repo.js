import crypto from 'node:crypto';
import { readStore, writeStore } from '../../utils/jsonStore.js';
import { slugify } from '../../utils/formatters.js';

// [L10] CRUD Fundamentals: Category repository implementing S1 interface
// Persists to server/data/store/categories.json

const STORE_FILE = 'categories.json';

/**
 * Repository interface for Categories backed by JSON file storage.
 */
class CategoryRepository {
  /**
   * Returns paginated or full list of categories.
   * @param {object} [params]
   * @param {object} [params.filter]
   * @param {string} [params.sort]
   * @param {number} [params.page]
   * @param {number} [params.limit]
   * @returns {Promise<{ items: Array, total: number }>}
   */
  async findMany({ filter = {}, sort = 'sortOrder', page = 1, limit = 100 } = {}) {
    let categories = await readStore(STORE_FILE, []);

    // Filter
    if (filter.q) {
      const q = filter.q.toLowerCase();
      categories = categories.filter(
        (c) =>
          (c.name && c.name.toLowerCase().includes(q)) ||
          (c.nameHi && c.nameHi.toLowerCase().includes(q)) ||
          (c.description && c.description.toLowerCase().includes(q))
      );
    }

    // Sort by sortOrder or specified field
    if (sort === 'name') {
      categories.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else {
      categories.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    }

    // Dynamic productCount computation from products store
    try {
      const products = await readStore('products.json', []);
      const countMap = new Map();
      for (const p of products) {
        const catId = p.category?.id || p.category;
        const catSlug = p.category?.slug;
        if (catId) countMap.set(catId, (countMap.get(catId) || 0) + 1);
        if (catSlug) countMap.set(catSlug, (countMap.get(catSlug) || 0) + 1);
      }
      categories = categories.map((c) => ({
        ...c,
        productCount: countMap.get(c.id) ?? countMap.get(c.slug) ?? c.productCount ?? 0,
      }));
    } catch {
      // Keep static count if products store cannot be read
    }

    const total = categories.length;
    const startIndex = (page - 1) * limit;
    const items = categories.slice(startIndex, startIndex + limit);

    return { items, total };
  }

  /**
   * Find a category by its ID.
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    const categories = await readStore(STORE_FILE, []);
    return categories.find((c) => c.id === id) || null;
  }

  /**
   * Find a category by its slug.
   * @param {string} slug
   * @returns {Promise<object|null>}
   */
  async findBySlug(slug) {
    const categories = await readStore(STORE_FILE, []);
    return categories.find((c) => c.slug === slug) || null;
  }

  /**
   * Create a new category.
   * @param {object} data
   * @returns {Promise<object>}
   */
  async create(data) {
    const categories = await readStore(STORE_FILE, []);

    const slug = data.slug ? slugify(data.slug) : slugify(data.name);
    const newCategory = {
      id: data.id || `cat-${slug || crypto.randomUUID().slice(0, 8)}`,
      name: data.name,
      nameHi: data.nameHi || '',
      slug,
      description: data.description || '',
      image: data.image || '',
      sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : categories.length + 1,
      productCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    categories.push(newCategory);
    await writeStore(STORE_FILE, categories);
    return newCategory;
  }

  /**
   * Update an existing category by ID.
   * @param {string} id
   * @param {object} patch
   * @returns {Promise<object|null>}
   */
  async update(id, patch) {
    const categories = await readStore(STORE_FILE, []);
    const index = categories.findIndex((c) => c.id === id);
    if (index === -1) return null;

    const existing = categories[index];
    const updated = {
      ...existing,
      ...patch,
      id: existing.id, // prevent changing id
      slug: patch.slug ? slugify(patch.slug) : existing.slug,
      updatedAt: new Date().toISOString(),
    };

    categories[index] = updated;
    await writeStore(STORE_FILE, categories);
    return updated;
  }

  /**
   * Remove a category by ID.
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async remove(id) {
    const categories = await readStore(STORE_FILE, []);
    const initialLen = categories.length;
    const remaining = categories.filter((c) => c.id !== id);

    if (remaining.length === initialLen) {
      return false;
    }

    await writeStore(STORE_FILE, remaining);
    return true;
  }

  /**
   * Check how many products reference this category (by id or slug).
   * Used for category-in-use delete protection.
   * @param {string} id
   * @returns {Promise<number>}
   */
  async countReferencingProducts(id) {
    const category = await this.findById(id);
    const products = await readStore('products.json', []);
    return products.filter((p) => {
      const catId = p.category?.id || p.category;
      const catSlug = p.category?.slug;
      return catId === id || (category && (catSlug === category.slug || catId === category.slug));
    }).length;
  }
}

export const categoryRepo = new CategoryRepository();
