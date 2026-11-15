import { ERROR_CODES as codes } from '../config/constants.js';
import { categoryRepo } from '../repositories/json/category.repo.js';
import { AppError } from '../utils/AppError.js';
import { resolveSlug } from './catalogueSlug.js';
import { catalogueWrite } from './catalogueWrites.js';

function missing(id) {
  return new AppError(
    404,
    codes.NOT_FOUND,
    `Category not found with identifier: ${id}`
  );
}

async function byIdentifier(id) {
  const category =
    (await categoryRepo.findById(id)) ?? (await categoryRepo.findBySlug(id));
  if (!category) throw missing(id);
  return category;
}

// [L14] Reuse the Phase 1 repository for catalogue CRUD and reference checks.
export const categoryService = {
  async list() {
    const { items } = await categoryRepo.findMany();
    return items;
  },
  byIdentifier,
  create(data) {
    return catalogueWrite(async () => {
      const slug = await resolveSlug(
        categoryRepo,
        'Category',
        data.slug,
        data.name
      );
      return categoryRepo.create({ ...data, slug });
    });
  },
  update(id, patch) {
    return catalogueWrite(async () => {
      const current = await byIdentifier(id);
      const data = { ...patch };
      if (data.slug)
        data.slug = await resolveSlug(
          categoryRepo,
          'Category',
          data.slug,
          current.name,
          current.id
        );
      const updated = await categoryRepo.update(current.id, data);
      if (!updated) throw missing(id);
      return updated;
    });
  },
  remove(id) {
    return catalogueWrite(async () => {
      const current = await byIdentifier(id);
      const references = await categoryRepo.countReferencingProducts(
        current.id
      );
      if (references > 0) {
        throw new AppError(
          409,
          codes.CONFLICT,
          `Cannot delete category: ${references} product(s) still reference it`
        );
      }
      if (!(await categoryRepo.remove(current.id))) throw missing(id);
    });
  },
};
