import config from '../../config/index.js';
import Product from '../../models/Product.js';
import { debugData } from '../../utils/logger.js';
import { EVENTS } from '../events.js';

export function registerStockListener(bus) {
  bus.on(EVENTS.ORDER_PLACED, async ({ order }) => {
    try {
      const products = await Product.find({
        _id: { $in: order.items.map(({ product }) => product) },
        stock: { $lte: config.stock.lowStockThreshold },
      });
      for (const product of products) bus.emit(EVENTS.STOCK_LOW, { product });
    } catch (error) {
      debugData(
        'Could not check stock for order %s (%s)',
        order.id,
        error.name
      );
    }
  });
}
