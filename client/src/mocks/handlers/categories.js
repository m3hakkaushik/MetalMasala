import { readDb } from '../db';
import { endpoint, success } from '../http';

export const categoriesHandlers = [
  endpoint('get', '/categories', () => {
    const { categories, products } = readDb();
    return success(
      categories
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((category) => ({
          ...category,
          productCount: products.filter(
            (product) => product.category.id === category.id,
          ).length,
        })),
    );
  }),
];
