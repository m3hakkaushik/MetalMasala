import { z } from 'zod';
import { FINISHES, MATERIALS } from './catalogue';

const trimText = (label, size) =>
  z.string().trim().min(1, `Enter ${label}.`).max(size);
const wholeNumber = (label, minimum) =>
  z.preprocess(
    (value) => (value === '' ? undefined : Number(value)),
    z
      .number({ error: `Enter ${label}.` })
      .int()
      .min(minimum),
  );

const compareAtPrice = z.preprocess(
  (value) => (value === null || value === '' ? null : Number(value)),
  z.number().int().positive().nullable(),
);
const fields = z.object({
  name: trimText('a product name', 120),
  slug: z
    .string()
    .trim()
    .refine(
      (value) => !value || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value),
      'Use lowercase words separated by hyphens.',
    )
    .optional(),
  sku: trimText('a SKU', 50),
  category: z.string().min(1, 'Choose a category.'),
  tagline: trimText('a tagline', 180),
  description: trimText('a description', 2000),
  price: wholeNumber('a price', 1),
  compareAtPrice,
  material: z.enum(Object.keys(MATERIALS), { error: 'Choose a material.' }),
  finish: z.enum(Object.keys(FINISHES), { error: 'Choose a finish.' }),
  stock: wholeNumber('stock', 0),
  tags: z.array(trimText('a tag', 40)).max(12),
  isFeatured: z.boolean(),
  isNewDrop: z.boolean(),
  images: z
    .array(
      z.object({
        url: z
          .string()
          .trim()
          .max(500)
          .refine(
            (value) => /^\/(?!\/)|^https?:\/\/[^/]+/i.test(value),
            'Enter an image path or an http(s) URL.',
          ),
        alt: trimText('image alt text', 160),
      }),
    )
    .min(1)
    .max(6),
  craft: z.object({
    artisan: trimText('an artisan or studio', 120),
    region: trimText('a region', 120),
    technique: trimText('a technique', 180),
  }),
  details: z.object({
    weightGrams: wholeNumber('the weight in grams', 1),
    lengthMm: wholeNumber('the length in millimetres', 1),
    care: trimText('care notes', 600),
  }),
});

const priceRule = ({ price, compareAtPrice: comparison }) =>
  !comparison || comparison >= price;
const priceMessage = {
  path: ['compareAtPrice'],
  message: 'Compare-at price must be at least the current price.',
};

export const productSchema = fields.refine(priceRule, priceMessage);
export const productPatchSchema = fields.partial();
export const productFormSchema = fields
  .extend({ tags: z.string().max(500) })
  .refine(priceRule, priceMessage)
  .transform(({ tags, ...product }) => ({
    ...product,
    tags: [
      ...new Set(
        tags
          .split(',')
          .map((tag) => tag.trim().toLowerCase())
          .filter(Boolean),
      ),
    ],
  }))
  .pipe(productSchema);
