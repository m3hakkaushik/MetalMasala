import { z } from 'zod';
import { PAYMENT_METHODS } from '../config/constants.js';

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email('Enter a valid email address.'));
export const newsletterBody = z.object({ email });
export const contactBody = z.object({
  name: z.string().trim().min(1, 'Enter your name.').max(100),
  email,
  message: z
    .string()
    .trim()
    .min(10, 'Enter at least 10 characters.')
    .max(1000, 'Enter at most 1000 characters.'),
});
export const pricingBody = z.object({
  items: z.array(
    z.object({
      productId: z.string().trim().min(1, 'Choose a product.'),
      qty: z
        .number()
        .int()
        .positive('Quantity must be a positive whole number.'),
    })
  ),
  paymentMethod: z.enum(PAYMENT_METHODS),
});
