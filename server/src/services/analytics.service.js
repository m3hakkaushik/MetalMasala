import config from '../config/index.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';

// [L23] Aggregation Pipeline for Analytics & Reporting (All exclude cancelled orders)

export const analyticsService = {
  /**
   * Analytics Summary: revenue, total orders, avgOrderValue, distinct customers, lowStock items
   */
  async getSummary() {
    const pipeline = [
      { $match: { status: { $ne: 'cancelled' } } },
      {
        $facet: {
          metrics: [
            {
              $group: {
                _id: null,
                revenue: { $sum: '$pricing.total' },
                orders: { $sum: 1 },
                avgOrderValue: { $avg: '$pricing.total' },
              },
            },
          ],
          customers: [
            { $group: { _id: '$user' } },
            { $count: 'count' },
          ],
        },
      },
    ];

    const result = await Order.aggregate(pipeline);
    const metrics = result[0]?.metrics?.[0] || { revenue: 0, orders: 0, avgOrderValue: 0 };
    const customerCount = result[0]?.customers?.[0]?.count || 0;

    // Low stock query
    const lowStockDocs = await Product.find({
      stock: { $lte: config.stock.lowStockThreshold },
    })
      .select('name slug stock sku price images')
      .limit(10)
      .lean();

    const lowStock = lowStockDocs.map((p) => ({
      id: p._id.toString(),
      name: p.name,
      slug: p.slug,
      stock: p.stock,
      sku: p.sku,
      price: p.price,
      image: p.images?.[0]?.url || '',
    }));

    return {
      revenue: Math.round(metrics.revenue || 0),
      orders: metrics.orders || 0,
      avgOrderValue: Math.round(metrics.avgOrderValue || 0),
      customers: customerCount,
      lowStock,
    };
  },

  /**
   * Revenue timeline grouped by date: range = 7d | 30d | 12m
   */
  async getRevenue(range = '30d') {
    const now = new Date();
    let startDate = new Date();
    let dateFormat = '%Y-%m-%d';

    if (range === '7d') {
      startDate.setDate(now.getDate() - 7);
    } else if (range === '12m') {
      startDate.setFullYear(now.getFullYear() - 1);
      dateFormat = '%Y-%m';
    } else {
      // Default: 30d
      startDate.setDate(now.getDate() - 30);
    }

    const pipeline = [
      {
        $match: {
          status: { $ne: 'cancelled' },
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          revenue: { $sum: '$pricing.total' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          revenue: { $round: ['$revenue', 0] },
          orders: 1,
        },
      },
    ];

    return Order.aggregate(pipeline);
  },

  /**
   * Sales breakdown grouped by category
   */
  async getSalesByCategory() {
    const pipeline = [
      { $match: { status: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productDoc',
        },
      },
      { $unwind: '$productDoc' },
      {
        $lookup: {
          from: 'categories',
          localField: 'productDoc.category',
          foreignField: '_id',
          as: 'categoryDoc',
        },
      },
      { $unwind: '$categoryDoc' },
      {
        $group: {
          _id: '$categoryDoc.name',
          revenue: { $sum: '$items.lineTotal' },
          unitsSold: { $sum: '$items.qty' },
        },
      },
      { $sort: { revenue: -1 } },
      {
        $project: {
          _id: 0,
          category: '$_id',
          revenue: { $round: ['$revenue', 0] },
          unitsSold: 1,
        },
      },
    ];

    return Order.aggregate(pipeline);
  },

  /**
   * Top products by sales volume and revenue
   */
  async getTopProducts(limit = 5) {
    const pipeline = [
      { $match: { status: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          unitsSold: { $sum: '$items.qty' },
          revenue: { $sum: '$items.lineTotal' },
          name: { $first: '$items.name' },
          slug: { $first: '$items.slug' },
          image: { $first: '$items.image' },
        },
      },
      { $sort: { unitsSold: -1 } },
      { $limit: Number(limit) || 5 },
      {
        $project: {
          _id: 0,
          product: {
            id: { $toString: '$_id' },
            name: '$name',
            slug: '$slug',
            image: '$image',
          },
          unitsSold: 1,
          revenue: { $round: ['$revenue', 0] },
        },
      },
    ];

    return Order.aggregate(pipeline);
  },
};

export default analyticsService;
