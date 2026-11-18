import { aiHandlers } from './handlers/ai';
import { analyticsHandlers } from './handlers/analytics';
import { authHandlers } from './handlers/auth';
import { cartHandlers } from './handlers/cart';
import {
  catalogueCategoryWrites,
  catalogueProductWrites,
} from './handlers/catalogueWrite';
import { categoriesHandlers } from './handlers/categories';
import { contactHandlers } from './handlers/contact';
import { newsletterHandlers } from './handlers/newsletter';
import { adminOrderHandlers, ordersHandlers } from './handlers/orders';
import { pricingHandlers } from './handlers/pricing';
import { productExtrasHandlers, productsHandlers } from './handlers/products';
import { reviewsHandlers } from './handlers/reviews';
import { adminUserHandlers, usersHandlers } from './handlers/users';

const handlers = {
  'catalogue-extras': productExtrasHandlers,
  products: [...productsHandlers, ...catalogueProductWrites],
  categories: [...categoriesHandlers, ...catalogueCategoryWrites],
  pricing: pricingHandlers,
  newsletter: newsletterHandlers,
  contact: contactHandlers,
  reviews: reviewsHandlers,
  cart: cartHandlers,
  orders: ordersHandlers,
  admin: [...adminOrderHandlers, ...analyticsHandlers],
  ai: aiHandlers,
  auth: authHandlers,
  users: [...usersHandlers, ...adminUserHandlers],
};

export function selectMockHandlers(groups) {
  const active = new Set(
    groups.includes('all') ? Object.keys(handlers) : groups,
  );
  // B1 can switch catalogue reads/writes to Express while these B3 routes stay mocked.
  if (active.has('products')) active.add('catalogue-extras');
  return Object.entries(handlers).flatMap(([name, group]) =>
    active.has(name) ? group : [],
  );
}
