import config from '../config/index.js';
import * as jsonProduct from './json/product.repo.js';
import * as mongoProduct from './mongo/product.repo.js';
import * as jsonCategory from './json/category.repo.js';
import * as mongoCategory from './mongo/category.repo.js';
import * as jsonRecords from './json/records.repo.js';
import * as mongoRecords from './mongo/records.repo.js';

// [L28] Building REST APIs with Database Integration (Repository Layer Dispatcher)
const isMongo = () => config.server.dataStore === 'mongo';

export const productRepo = new Proxy({}, {
  get: (_target, prop) => (isMongo() ? mongoProduct.productRepo[prop] : jsonProduct.productRepo[prop]),
});

export const categoryRepo = new Proxy({}, {
  get: (_target, prop) => (isMongo() ? mongoCategory.categoryRepo[prop] : jsonCategory.categoryRepo[prop]),
});

export const subscriberRepo = new Proxy({}, {
  get: (_target, prop) => (isMongo() ? mongoRecords.subscriberRepo[prop] : jsonRecords.subscriberRepo[prop]),
});

export const contactRepo = new Proxy({}, {
  get: (_target, prop) => (isMongo() ? mongoRecords.contactRepo[prop] : jsonRecords.contactRepo[prop]),
});

export { reviewRepo } from './mongo/review.repo.js';
export { cartRepo } from './mongo/cart.repo.js';
export { orderRepo } from './mongo/order.repo.js';
