import mongoose from 'mongoose';
import Category from '../../models/Category.js';
import Product from '../../models/Product.js';
import { slugify } from '../../utils/formatters.js';

// [L22] Query Operations in MongoDB
// [L28] Building REST APIs with Database Integration (Category Mongo Repository)

class MongoCategoryRepository {
  /**
   * Returns paginated or full list of categories with product counts.
   * @param {object} [params]
   * @returns {Promise<{ items: Array, total: number }>}
   */
  async findMany({ filter = {}, sort = 'sortOrder', page = 1, limit = 100 } = {}) {
    const match = {};
    if (filter.q) {
      const q = String(filter.q).trim();
      match.$or = [
        { name: { $regex: q, $options: 'i' } },
        { nameHi: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ];
    }

    const sortStage = sort === 'name' ? { name: 1 } : { sortOrder: 1 };

    // [L23] Aggregation: Lookup productCount dynamically per category
    const pipeline = [
      { $match: match },
      { $sort: sortStage },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: 'category',
          as: 'prods',
        },
      },
      {
        $addFields: {
          productCount: { $size: '$prods' },
        },
      },
      {
        $project: {
          prods: 0,
        },
      },
    ];

    const allCategories = await Category.aggregate(pipeline);
    const total = allCategories.length;
    const startIndex = (page - 1) * limit;
    const paginated = allCategories.slice(startIndex, startIndex + limit);

    const items = paginated.map((c) => ({
      ...c,
      id: c._id.toString(),
      _id: undefined,
      __v: undefined,
    }));

    return { items, total };
  }

  /**
   * Find category by its MongoDB ObjectId or string id.
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    if (!id) return null;
    let category = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      category = await Category.findById(id).lean();
    }
    if (!category) {
      category = await Category.findOne({ slug: id }).lean();
    }
    if (!category) return null;

    const count = await Product.countDocuments({ category: category._id });
    return {
      ...category,
      id: category._id.toString(),
      productCount: count,
      _id: undefined,
      __v: undefined,
    };
  }

  /**
   * Find category by slug.
   * @param {string} slug
   * @returns {Promise<object|null>}
   */
  async findBySlug(slug) {
    if (!slug) return null;
    const category = await Category.findOne({ slug }).lean();
    if (!category) return null;
    const count = await Product.countDocuments({ category: category._id });
    return {
      ...category,
      id: category._id.toString(),
      productCount: count,
      _id: undefined,
      __v: undefined,
    };
  }

  /**
   * Create a new category.
   * @param {object} data
   * @returns {Promise<object>}
   */
  async create(data) {
    const slug = data.slug ? slugify(data.slug) : slugify(data.name);
    const count = await Category.countDocuments();
    const sortOrder = typeof data.sortOrder === 'number' ? data.sortOrder : count + 1;

    const category = await Category.create({
      ...data,
      slug,
      sortOrder,
    });
    const obj = category.toJSON();
    return { ...obj, productCount: 0 };
  }

  /**
   * Update category by ID.
   * @param {string} id
   * @param {object} patch
   * @returns {Promise<object|null>}
   */
  async update(id, patch) {
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { slug: id };
    const updateData = { ...patch };
    if (patch.slug) updateData.slug = slugify(patch.slug);

    const updated = await Category.findOneAndUpdate(query, updateData, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updated) return null;
    const productCount = await Product.countDocuments({ category: updated._id });
    return {
      ...updated,
      id: updated._id.toString(),
      productCount,
      _id: undefined,
      __v: undefined,
    };
  }

  /**
   * Remove category by ID.
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async remove(id) {
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { slug: id };
    const res = await Category.deleteOne(query);
    return res.deletedCount > 0;
  }

  /**
   * Count products referencing this category.
   * @param {string} id
   * @returns {Promise<number>}
   */
  async countReferencingProducts(id) {
    const category = await this.findById(id);
    if (!category) return 0;
    return Product.countDocuments({
      $or: [
        { category: category.id },
        { category: category._id },
        { category: category.slug },
      ],
    });
  }
}

export const categoryRepo = new MongoCategoryRepository();
export default categoryRepo;
