import { ERROR_CODES as codes } from '../config/constants.js';
import { AppError } from '../utils/AppError.js';
import { slugify } from '../utils/formatters.js';

export async function resolveSlug(repo, resource, requested, name, ownId) {
  const base = slugify(requested || name);
  if (!base) {
    const message = 'Enter a name or slug containing Latin letters or digits';
    throw new AppError(422, codes.VALIDATION_ERROR, message, [
      { field: requested ? 'slug' : 'name', message },
    ]);
  }

  const original = await repo.findBySlug(base);
  if (!original || original.id === ownId) return base;
  if (requested) {
    throw new AppError(
      409,
      codes.CONFLICT,
      `${resource} with slug '${base}' already exists`
    );
  }

  let sequence = 2;
  let candidate = `${base}-${sequence}`;
  while (await repo.findBySlug(candidate)) {
    sequence += 1;
    candidate = `${base}-${sequence}`;
  }
  return candidate;
}
