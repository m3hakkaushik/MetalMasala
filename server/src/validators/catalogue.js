import { z } from 'zod';
import { FINISHES, MATERIALS, PAGINATION } from '../config/constants.js';

const name = (field) => z.string().trim().min(1, `${field} name is required`);
const id = z.string().trim().min(1);
const text = z.string().trim();
const price = z
  .union([z.number(), text.min(1).transform(Number)])
  .pipe(z.number().int().min(1, 'Price must be greater than 0'));
const nonNegative = z.number().int().nonnegative();
const embeddedCategory = z.object({ id, name: text.min(1), slug: text.min(1) });

export const slugParams = z.object({ slug: id });
export const identifierParams = z.object({ id });
export const productIdParams = z.object({ productId: id });

export const categoryBody = z.object({
  name: name('Category'),
  nameHi: text.optional(),
  description: text.optional(),
  image: text.optional(),
  slug: text.optional(),
  sortOrder: nonNegative.optional(),
});
export const categoryPatch = categoryBody.partial();

export const productBody = z.object({
  name: name('Product'),
  price,
  category: z.union([id, embeddedCategory]),
  slug: text.optional(),
  tagline: text.optional(),
  description: text.optional(),
  compareAtPrice: price.nullable().optional(),
  currency: z.literal('INR').optional(),
  material: z.enum(MATERIALS).optional(),
  finish: z.enum(FINISHES).optional(),
  tags: z.array(text.min(1)).optional(),
  images: z.array(z.object({ url: text.min(1), alt: text.min(1) })).optional(),
  stock: nonNegative.optional(),
  sku: text.min(1).optional(),
  isFeatured: z.boolean().optional(),
  isNewDrop: z.boolean().optional(),
  craft: z.object({ artisan: text, region: text, technique: text }).optional(),
  details: z
    .object({
      weightGrams: z.number().nonnegative(),
      lengthMm: z.number().nonnegative(),
      care: text,
    })
    .optional(),
});
export const productPatch = productBody.partial();

const paginationValue = z
  .string()
  .regex(/^-?\d+$/, 'Use a whole number.')
  .transform(Number)
  .pipe(z.number().int());
const list = z.string().optional();
const queryPrice = z
  .string()
  .regex(/^\d+$/, 'Enter a whole price in rupees.')
  .transform(Number)
  .pipe(nonNegative)
  .optional();
const flag = z.enum(['true', 'false']).optional();

export const productQuery = z
  .object({
    page: paginationValue
      .optional()
      .transform((value) => Math.max(value || PAGINATION.DEFAULT_PAGE, 1)),
    limit: paginationValue
      .optional()
      .transform((value) =>
        Math.max(
          1,
          Math.min(value || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT)
        )
      ),
    sort: z
      .enum(['newest', 'price-asc', 'price-desc', 'popular', 'rating'])
      .default('newest'),
    q: list,
    category: list,
    minPrice: queryPrice,
    maxPrice: queryPrice,
    material: list,
    finish: list,
    tags: list,
    featured: flag,
    newDrop: flag,
    inStock: flag,
  })
  .refine(
    ({ minPrice, maxPrice }) =>
      minPrice === undefined || maxPrice === undefined || minPrice <= maxPrice,
    {
      path: ['maxPrice'],
      message: 'Maximum price must be at least the minimum.',
    }
  );
