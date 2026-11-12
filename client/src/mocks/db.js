import products from './data/products.json';
import categories from './data/categories.json';
import reviews from './data/reviews.json';
import users from './data/users.json';
import orders from './data/orders.json';

export const demoPasswords = {
  '65f0c0ffee0000000000a001': 'Test@1234',
  '65f0c0ffee0000000000a002': 'Manager@1234',
  '65f0c0ffee0000000000a003': 'Admin@1234',
};

const storageKey = 'metal-masala:mock-db:v1';

function readSaved() {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || '{}') ?? {};
  } catch {
    return {};
  }
}

export function readDb() {
  return {
    products: structuredClone(products),
    categories: structuredClone(categories),
    reviews: structuredClone(reviews),
    subscribers: [],
    contacts: [],
    users: structuredClone(users),
    passwords: {},
    inactiveUsers: [],
    sessions: {},
    carts: {},
    orders: structuredClone(orders),
    tracking: {},
    ...readSaved(),
  };
}

export function saveDb(patch) {
  localStorage.setItem(
    storageKey,
    JSON.stringify({ ...readSaved(), ...patch }),
  );
}

export function resetDb() {
  localStorage.removeItem(storageKey);
}
