import { SORTS } from '../../api/catalogue';
import { readDb } from '../db';
import { endpoint, invalid, notFound, success } from '../http';

const lookup = {
  category: (item) => [item.category.slug],
  finish: (item) => [item.finish],
  material: (item) => [item.material],
  tags: (item) => item.tags,
};
const flags = {
  featured: 'isFeatured',
  newDrop: 'isNewDrop',
  inStock: 'inStock',
};
const sorters = {
  newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
  popular: (a, b) => b.soldCount - a.soldCount,
  rating: (a, b) => b.ratingAverage - a.ratingAverage,
};

function matching(products, query) {
  const filters = Object.entries(lookup).flatMap(([key, values]) => {
    const tokens = query
      .get(key)
      ?.split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    return tokens?.length
      ? [(item) => values(item).some((value) => tokens.includes(value))]
      : [];
  });
  for (const [key, prop] of Object.entries(flags)) {
    if (query.get(key) === 'true') filters.push((item) => item[prop]);
  }
  const search = query.get('q')?.toLowerCase().trim().split(/\s+/);
  if (search?.[0]) {
    filters.push((item) => {
      const text = [item.name, item.tagline, item.description, ...item.tags]
        .join(' ')
        .toLowerCase();
      return search.every((word) => text.includes(word));
    });
  }
  const min = query.get('minPrice');
  const max = query.get('maxPrice');
  if (min) filters.push((item) => item.price >= Number(min));
  if (max) filters.push((item) => item.price <= Number(max));
  return products.filter((item) => filters.every((match) => match(item)));
}

function validation(query) {
  for (const key of ['minPrice', 'maxPrice']) {
    if (query.has(key) && !/^\d+$/.test(query.get(key))) {
      return invalid(key, 'Enter a whole price in rupees.');
    }
  }
  if (
    query.has('minPrice') &&
    query.has('maxPrice') &&
    Number(query.get('minPrice')) > Number(query.get('maxPrice'))
  ) {
    return invalid('maxPrice', 'Maximum price must be at least the minimum.');
  }
  for (const key of Object.keys(flags)) {
    if (query.has(key) && query.get(key) !== 'true') {
      return invalid(key, 'Use true to enable this filter.');
    }
  }
}

function getFacets({ request }) {
  const query = new URL(request.url).searchParams;
  const error = validation(query);
  if (error) return error;
  const products = matching(readDb().products, query);
  function counts(key, field = 'value') {
    const tally = new Map();
    for (const item of products) {
      for (const value of lookup[key](item))
        tally.set(value, (tally.get(value) ?? 0) + 1);
    }
    return [...tally].map(([value, count]) => ({ [field]: value, count }));
  }
  const prices = products.map(({ price }) => price);
  return success({
    price: {
      min: prices.length ? Math.min(...prices) : 0,
      max: prices.length ? Math.max(...prices) : 0,
    },
    categories: counts('category', 'slug'),
    finishes: counts('finish'),
    materials: counts('material'),
    tags: counts('tags'),
  });
}

function getProducts({ request }) {
  const query = new URL(request.url).searchParams;
  const error = validation(query);
  if (error) return error;
  const page = Number(query.get('page') ?? 1);
  const limit = Number(query.get('limit') ?? 12);
  const sort = query.get('sort') ?? 'newest';
  if (!Number.isSafeInteger(page) || page < 1)
    return invalid('page', 'Page must be a positive whole number.');
  if (!Number.isInteger(limit) || limit < 1 || limit > 48)
    return invalid('limit', 'Limit must be between 1 and 48.');
  if (!Object.hasOwn(SORTS, sort))
    return invalid('sort', 'Choose a supported sort order.');
  const products = matching(readDb().products, query).sort(sorters[sort]);
  const total = products.length;
  const totalPages = Math.ceil(total / limit);
  return success(products.slice((page - 1) * limit, page * limit), {
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  });
}

export const productExtrasHandlers = [
  endpoint('get', '/products/facets', getFacets),
  endpoint('get', '/products/:slug/related', ({ params }) => {
    const { products } = readDb();
    const current = products.find(({ slug }) => slug === params.slug);
    if (!current) return notFound('Product');
    const candidates = products
      .filter(
        (item) =>
          item.id !== current.id &&
          (item.category.id === current.category.id ||
            item.tags.some((tag) => current.tags.includes(tag))),
      )
      .sort(
        (a, b) =>
          Number(b.category.id === current.category.id) -
          Number(a.category.id === current.category.id),
      );
    return success(candidates.slice(0, 8));
  }),
];

export const productsHandlers = [
  endpoint('get', '/products', getProducts),
  endpoint('get', '/products/:slug', ({ params }) => {
    const product = readDb().products.find(({ slug }) => slug === params.slug);
    return product ? success(product) : notFound('Product');
  }),
];
