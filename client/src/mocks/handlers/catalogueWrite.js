import { z } from 'zod';
import { productPatchSchema, productSchema } from '../../api/productFields';
import { readDb, saveDb } from '../db';
import {
  endpoint,
  failure,
  invalid,
  noContent,
  notFound,
  success,
} from '../http';
import { actor } from '../session';
import { newId, parseBody, timestamp } from '../validation';

const staff = ['admin', 'manager'];
const onlyAdmin = ['admin'];

function staffWrite(method, path, roles, callback, schema) {
  return endpoint(method, path, async ({ request, params }) => {
    const body = schema ? await parseBody(request, schema) : {};
    if (body.error) return body.error;
    const db = readDb();
    const { error } = actor(db, request, roles);
    return error ?? callback(db, params, body.data);
  });
}

function slugify(name) {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function uniqueSlug(items, base, id) {
  let candidate = base;
  let suffix = 2;
  while (items.some((item) => item.id !== id && item.slug === candidate)) {
    candidate = `${base}-${suffix++}`;
  }
  return candidate;
}

function writeProduct(db, input, current) {
  const {
    id = newId(),
    createdAt = timestamp(),
    ratingCount = 0,
    ratingAverage = 0,
    soldCount = 0,
  } = current ?? {};
  const fields = { ...current, ...input };
  const categoryId = input.category ?? current?.category.id;
  const category = db.categories.find((entry) => entry.id === categoryId);
  if (!category)
    return invalid('category', 'Choose a category from the catalogue.');
  const slug =
    input.slug ||
    (current?.slug ??
      uniqueSlug(db.products, slugify(fields.name) || 'piece', id));
  if (db.products.some((item) => item.id !== id && item.slug === slug))
    return failure(409, 'CONFLICT', 'This product slug is already in use.');
  if (db.products.some((item) => item.id !== id && item.sku === fields.sku))
    return failure(409, 'CONFLICT', 'This SKU is already in use.');
  if (fields.compareAtPrice !== null && fields.compareAtPrice < fields.price) {
    return invalid(
      'compareAtPrice',
      'Compare-at price must be at least the current price.',
    );
  }
  const product = {
    ...fields,
    id,
    slug,
    createdAt,
    updatedAt: timestamp(),
    currency: 'INR',
    ratingAverage,
    ratingCount,
    soldCount,
    category: { id: category.id, name: category.name, slug: category.slug },
    discountPercent: fields.compareAtPrice
      ? Math.round(100 - (100 * fields.price) / fields.compareAtPrice)
      : 0,
    inStock: fields.stock > 0,
  };
  db.products = current
    ? db.products.map((item) => (item.id === id ? product : item))
    : [...db.products, product];
  saveDb({ products: db.products });
  return success(
    product,
    current
      ? {}
      : { status: 201, headers: { Location: `/api/v1/products/${slug}` } },
  );
}

export const catalogueProductWrites = [
  staffWrite(
    'post',
    '/products',
    staff,
    (db, _, data) => writeProduct(db, data),
    productSchema,
  ),
  staffWrite(
    'patch',
    '/products/:id',
    staff,
    (db, params, data) => {
      const product = db.products.find(({ id }) => id === params.id);
      return product ? writeProduct(db, data, product) : notFound('Product');
    },
    productPatchSchema,
  ),
  staffWrite('delete', '/products/:id', onlyAdmin, (db, params) => {
    if (!db.products.some(({ id }) => id === params.id))
      return notFound('Product');
    const carts = Object.values(db.carts);
    for (const cart of carts) delete cart.items[params.id];
    for (const user of db.users)
      user.wishlist = user.wishlist.filter((id) => id !== params.id);
    saveDb({
      products: db.products.filter(({ id }) => id !== params.id),
      reviews: db.reviews.filter(({ product }) => product !== params.id),
      carts: db.carts,
      users: db.users,
    });
    return noContent();
  }),
];

const categorySchema = z.object({
  name: z.string().trim().min(2),
  nameHi: z.string().trim().min(1),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  description: z.string().trim().min(1),
  image: z.string().trim().min(1),
  sortOrder: z.number().int().positive(),
});

export const catalogueCategoryWrites = [
  staffWrite(
    'post',
    '/categories',
    staff,
    (db, _, data) => {
      const id = newId();
      const slug =
        data.slug ??
        uniqueSlug(db.categories, slugify(data.name) || 'collection', id);
      if (db.categories.some((item) => item.slug === slug))
        return failure(
          409,
          'CONFLICT',
          'This category slug is already in use.',
        );
      const category = { ...data, slug, id, productCount: 0 };
      db.categories.push(category);
      saveDb({ categories: db.categories });
      return success(category, { status: 201 });
    },
    categorySchema,
  ),
  staffWrite(
    'patch',
    '/categories/:id',
    staff,
    (db, params, data) => {
      const category = db.categories.find(({ id }) => id === params.id);
      if (!category) return notFound('Category');
      if (
        data.slug &&
        db.categories.some(
          (item) => item.id !== category.id && item.slug === data.slug,
        )
      ) {
        return failure(
          409,
          'CONFLICT',
          'This category slug is already in use.',
        );
      }
      Object.assign(category, data);
      const products = db.products.filter(
        (item) => item.category.id === category.id,
      );
      for (const product of products) {
        product.category = {
          id: category.id,
          name: category.name,
          slug: category.slug,
        };
      }
      category.productCount = products.length;
      saveDb({ categories: db.categories, products: db.products });
      return success(category);
    },
    categorySchema.partial(),
  ),
  staffWrite('delete', '/categories/:id', onlyAdmin, (db, params) => {
    if (!db.categories.some(({ id }) => id === params.id))
      return notFound('Category');
    if (db.products.some((product) => product.category.id === params.id))
      return failure(409, 'CONFLICT', 'Products still use this category.');
    saveDb({ categories: db.categories.filter(({ id }) => id !== params.id) });
    return noContent();
  }),
];
