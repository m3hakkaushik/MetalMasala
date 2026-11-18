import mongoose from 'mongoose';
import Product from '../../models/Product.js';
import Category from '../../models/Category.js';
import { slugify } from '../../utils/formatters.js';

// [L22] Query Operations in MongoDB
// [L23] Aggregation Pipeline (Facets)
// [L28] Building REST APIs with Database Integration (Product Mongo Repository)

export function formatProduct(doc) {
  if (!doc) return null;
  const product = typeof doc.toJSON === 'function' ? doc.toJSON() : { ...doc };

  // Format category to contract shape { id, name, slug }
  if (product.category && typeof product.category === 'object') {
    product.category = {
      id: product.category._id ? product.category._id.toString() : product.category.id,
      name: product.category.name,
      slug: product.category.slug,
    };
  }

  // Ensure id is present
  if (!product.id && product._id) {
    product.id = product._id.toString();
  }
  delete product._id;
  delete product.__v;

  // Compute virtuals if plain object
  if (product.inStock === undefined) {
    product.inStock = (product.stock || 0) > 0;
  }
  if (product.discountPercent === undefined) {
    product.discountPercent =
      product.compareAtPrice && product.compareAtPrice > product.price
        ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
        : 0;
  }

  return product;
}

class MongoProductRepository {
  /**
   * Find products matching catalogue filters, sort options, and pagination.
   * @param {object} params
   * @returns {Promise<{ items: Array, total: number }>}
   */
  async findMany({ filter = {}, sort = 'newest', page = 1, limit = 12 } = {}) {
    const query = {};
    const sortObj = {};
    let isTextSearch = false;

    // 1. Text search `q` [L22]
    if (filter.q) {
      isTextSearch = true;
      query.$text = { $search: String(filter.q).trim() };
    }

    // 2. Category filter (comma-separated slugs or ids) [L22]
    if (filter.category) {
      const slugs = String(filter.category)
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

      if (slugs.length > 0) {
        const categories = await Category.find({
          $or: [
            { slug: { $in: slugs } },
            { _id: { $in: slugs.filter((s) => mongoose.Types.ObjectId.isValid(s)) } },
          ],
        }).select('_id');
        const catIds = categories.map((c) => c._id);
        query.category = { $in: catIds };
      }
    }

    // 3. Price range [L22]
    if (filter.minPrice !== undefined || filter.maxPrice !== undefined) {
      query.price = {};
      if (filter.minPrice !== undefined && !isNaN(Number(filter.minPrice))) {
        query.price.$gte = Number(filter.minPrice);
      }
      if (filter.maxPrice !== undefined && !isNaN(Number(filter.maxPrice))) {
        query.price.$lte = Number(filter.maxPrice);
      }
    }

    // 4. Material filter [L22]
    if (filter.material) {
      const materials = String(filter.material)
        .split(',')
        .map((m) => m.trim().toLowerCase())
        .filter(Boolean);
      if (materials.length > 0) {
        query.material = { $in: materials };
      }
    }

    // 5. Finish filter [L22]
    if (filter.finish) {
      const finishes = String(filter.finish)
        .split(',')
        .map((f) => f.trim().toLowerCase())
        .filter(Boolean);
      if (finishes.length > 0) {
        query.finish = { $in: finishes };
      }
    }

    // 6. Tags filter [L22]
    if (filter.tags) {
      const tags = String(filter.tags)
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
      if (tags.length > 0) {
        query.tags = { $in: tags };
      }
    }

    // 7. Boolean flags [L22]
    if (filter.featured === true || filter.featured === 'true') {
      query.isFeatured = true;
    }
    if (filter.newDrop === true || filter.newDrop === 'true') {
      query.isNewDrop = true;
    }
    if (filter.inStock === true || filter.inStock === 'true') {
      query.stock = { $gt: 0 };
    }

    // Sort mappings
    if (sort === 'price-asc') {
      sortObj.price = 1;
    } else if (sort === 'price-desc') {
      sortObj.price = -1;
    } else if (sort === 'popular') {
      sortObj.soldCount = -1;
    } else if (sort === 'rating') {
      sortObj.ratingAverage = -1;
    } else if (isTextSearch && !sort) {
      sortObj.score = { $meta: 'textScore' };
    } else {
      sortObj.createdAt = -1;
    }

    const total = await Product.countDocuments(query);
    const skip = (Math.max(1, page) - 1) * limit;

    let dbQuery = Product.find(query);
    if (isTextSearch && sortObj.score) {
      dbQuery = dbQuery.select({ score: { $meta: 'textScore' } });
    }

    const docs = await dbQuery
      .populate('category', 'name slug _id')
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .lean();

    const items = docs.map(formatProduct);
    return { items, total };
  }

  /**
   * Find product by ID or slug.
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    if (!id) return null;
    let product = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      product = await Product.findById(id).populate('category', 'name slug _id').lean();
    }
    if (!product) {
      product = await Product.findOne({ slug: id }).populate('category', 'name slug _id').lean();
    }
    return formatProduct(product);
  }

  /**
   * Find product by slug.
   * @param {string} slug
   * @returns {Promise<object|null>}
   */
  async findBySlug(slug) {
    if (!slug) return null;
    const product = await Product.findOne({ slug })
      .populate('category', 'name slug _id')
      .lean();
    return formatProduct(product);
  }

  /**
   * Create product.
   * @param {object} data
   * @returns {Promise<object>}
   */
  async create(data) {
    let categoryId = data.category;
    if (typeof categoryId === 'object' && categoryId.id) {
      categoryId = categoryId.id;
    }
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      const cat = await Category.findOne({ slug: categoryId });
      if (cat) categoryId = cat._id;
    }

    const slug = data.slug ? slugify(data.slug) : slugify(data.name);

    const doc = await Product.create({
      ...data,
      category: categoryId,
      slug,
    });

    const populated = await Product.findById(doc._id)
      .populate('category', 'name slug _id')
      .lean();

    return formatProduct(populated);
  }

  /**
   * Update product by ID.
   * @param {string} id
   * @param {object} patch
   * @returns {Promise<object|null>}
   */
  async update(id, patch) {
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { slug: id };
    const updateData = { ...patch };

    if (patch.category) {
      let categoryId = patch.category;
      if (typeof categoryId === 'object' && categoryId.id) categoryId = categoryId.id;
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        const cat = await Category.findOne({ slug: categoryId });
        if (cat) categoryId = cat._id;
      }
      updateData.category = categoryId;
    }

    if (patch.slug) updateData.slug = slugify(patch.slug);

    const updated = await Product.findOneAndUpdate(query, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('category', 'name slug _id')
      .lean();

    return formatProduct(updated);
  }

  /**
   * Remove product by ID.
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async remove(id) {
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { slug: id };
    const res = await Product.deleteOne(query);
    return res.deletedCount > 0;
  }

  /**
   * Find related products (same category first, then shared tags, excluding self, max limit).
   * @param {string} slug
   * @param {number} [limit=8]
   * @returns {Promise<Array>}
   */
  async findRelated(slug, limit = 8) {
    const current = await this.findBySlug(slug);
    if (!current) return [];

    const categoryId = current.category?.id || current.category?._id;
    const query = {
      _id: { $ne: new mongoose.Types.ObjectId(current.id) },
      $or: [
        { category: categoryId },
        { tags: { $in: current.tags || [] } },
      ],
    };

    const related = await Product.find(query)
      .populate('category', 'name slug _id')
      .sort({ ratingAverage: -1, soldCount: -1 })
      .limit(limit)
      .lean();

    return related.map(formatProduct);
  }

  /**
   * [L23] Aggregation Pipeline for Facets (/products/facets).
   * @param {object} filter
   * @returns {Promise<object>}
   */
  async getFacets(filter = {}) {
    const match = {};

    if (filter.category) {
      const slugs = String(filter.category).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
      const categories = await Category.find({ slug: { $in: slugs } }).select('_id');
      match.category = { $in: categories.map((c) => c._id) };
    }
    if (filter.material) {
      const materials = String(filter.material).split(',').map((m) => m.trim().toLowerCase()).filter(Boolean);
      match.material = { $in: materials };
    }
    if (filter.finish) {
      const finishes = String(filter.finish).split(',').map((f) => f.trim().toLowerCase()).filter(Boolean);
      match.finish = { $in: finishes };
    }
    if (filter.tags) {
      const tags = String(filter.tags).split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
      match.tags = { $in: tags };
    }
    if (filter.featured === true || filter.featured === 'true') {
      match.isFeatured = true;
    }
    if (filter.newDrop === true || filter.newDrop === 'true') {
      match.isNewDrop = true;
    }
    if (filter.inStock === true || filter.inStock === 'true') {
      match.stock = { $gt: 0 };
    }

    const facetsResult = await Product.aggregate([
      { $match: match },
      {
        $facet: {
          price: [
            {
              $group: {
                _id: null,
                min: { $min: '$price' },
                max: { $max: '$price' },
              },
            },
            { $project: { _id: 0, min: { $ifNull: ['$min', 0] }, max: { $ifNull: ['$max', 0] } } },
          ],
          categories: [
            {
              $lookup: {
                from: 'categories',
                localField: 'category',
                foreignField: '_id',
                as: 'cat',
              },
            },
            { $unwind: '$cat' },
            {
              $group: {
                _id: '$cat.slug',
                count: { $sum: 1 },
              },
            },
            { $project: { _id: 0, slug: '$_id', count: 1 } },
            { $sort: { count: -1 } },
          ],
          finishes: [
            {
              $group: {
                _id: '$finish',
                count: { $sum: 1 },
              },
            },
            { $project: { _id: 0, value: '$_id', count: 1 } },
            { $sort: { count: -1 } },
          ],
          materials: [
            {
              $group: {
                _id: '$material',
                count: { $sum: 1 },
              },
            },
            { $project: { _id: 0, value: '$_id', count: 1 } },
            { $sort: { count: -1 } },
          ],
          tags: [
            { $unwind: '$tags' },
            {
              $group: {
                _id: '$tags',
                count: { $sum: 1 },
              },
            },
            { $project: { _id: 0, value: '$_id', count: 1 } },
            { $sort: { count: -1 } },
          ],
        },
      },
    ]);

    const res = facetsResult[0] || {};
    return {
      price: res.price?.[0] || { min: 0, max: 0 },
      categories: res.categories || [],
      finishes: res.finishes || [],
      materials: res.materials || [],
      tags: res.tags || [],
    };
  }

  /**
   * Return all products for CSV export.
   * @returns {Promise<Array>}
   */
  async getAllRaw() {
    const docs = await Product.find()
      .populate('category', 'name slug _id')
      .sort({ createdAt: -1 })
      .lean();
    return docs.map(formatProduct);
  }
}

export const productRepo = new MongoProductRepository();
export default productRepo;
