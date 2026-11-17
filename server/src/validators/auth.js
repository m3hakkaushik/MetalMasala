import { z } from 'zod';

export const name = z.string().trim().min(2).max(100);
const email = z.string().trim().toLowerCase().email().max(254);
const credentialsPassword = z
  .string()
  .min(1)
  .refine(
    (value) => Buffer.byteLength(value) <= 72,
    'Password must be at most 72 bytes.'
  );
const newPassword = credentialsPassword.pipe(
  z
    .string()
    .min(8)
    .regex(/[a-z]/i, 'Include a letter.')
    .regex(/\d/, 'Include a number.')
);

export const registration = z.object({ name, email, password: newPassword });
export const credentials = z.object({ email, password: credentialsPassword });
export const passwordChange = z.object({
  currentPassword: credentialsPassword,
  newPassword,
});
