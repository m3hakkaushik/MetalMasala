import { z } from 'zod';
import { PAYMENT_METHODS } from './commerce';

const name = z.string().trim().min(2, 'Enter at least 2 characters.').max(100);
const email = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address.')
  .max(254);
const phone = z
  .string()
  .trim()
  .regex(/^\d{10}$/, 'Phone number must be 10 digits.');
const bcryptLimit = (value) => new TextEncoder().encode(value).length <= 72;
const password = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .regex(/[a-z]/i, 'Include a letter.')
  .regex(/\d/, 'Include a number.')
  .refine(bcryptLimit, 'Use at most 72 bytes.');

export const loginSchema = z.object({
  email,
  password: z
    .string()
    .min(1, 'Enter your password.')
    .refine(bcryptLimit, 'Use at most 72 bytes.'),
});
export const registerSchema = z.object({ name, email, password });
export const passwordSchema = z.object({
  currentPassword: loginSchema.shape.password,
  newPassword: password,
});
export const contactSchema = z.object({
  name,
  email,
  message: z
    .string()
    .trim()
    .min(10, 'Enter at least 10 characters.')
    .max(1000, 'Keep your message under 1,001 characters.'),
});
export const profileSchema = z.object({
  name,
  phone: z.union([phone, z.literal('')]),
});
export const addressSchema = z.object({
  label: z.string().trim().min(1, 'Enter a label for the address.').max(30),
  fullName: name,
  phone,
  line1: z.string().trim().min(1, 'Enter a street address.').max(150),
  line2: z.string().trim().max(150).optional(),
  city: z.string().trim().min(1, 'Enter a city.').max(100),
  state: z.string().trim().min(1, 'Enter a state.').max(100),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Pincode must be 6 digits.'),
  isDefault: z.boolean().optional(),
});
export const paymentSchema = z.object({
  paymentMethod: z.enum(Object.keys(PAYMENT_METHODS)),
  notes: z
    .string()
    .trim()
    .max(500, 'Keep delivery notes under 501 characters.')
    .optional(),
});
export const reviewSchema = z.object({
  rating: z.coerce
    .number()
    .int()
    .min(1, 'Choose a rating.')
    .max(5, 'Choose a rating from 1 to 5.'),
  title: z.string().trim().min(2, 'Enter a short title.').max(100),
  body: z.string().trim().min(10, 'Write at least 10 characters.').max(1000),
});
