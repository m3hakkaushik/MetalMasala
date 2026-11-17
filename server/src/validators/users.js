import { z } from 'zod';
import { ROLES } from '../config/constants.js';
import { name } from './auth.js';

const text = (max) => z.string().trim().min(1).max(max);
const phone = z
  .string()
  .trim()
  .regex(/^\d{10}$/, 'Use a 10-digit phone number.');
const role = z.enum(ROLES);
export const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Invalid identifier.');
export const profile = z.strictObject({
  name: name.optional(),
  phone: z.union([phone, z.literal('')]).optional(),
});
export const address = z.strictObject({
  label: text(40).optional(),
  fullName: name,
  phone,
  line1: text(150),
  line2: z.string().trim().max(150).optional(),
  city: text(100),
  state: text(100),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Use a six-digit PIN code.'),
  isDefault: z.boolean().optional(),
});
export const addressPatch = address.partial();
export const userQuery = z.object({
  q: z.string().trim().max(100).optional(),
  role: role.optional(),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export const roleChange = z.strictObject({ role });
export const statusChange = z.strictObject({ isActive: z.boolean() });
