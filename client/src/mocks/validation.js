import { failure, readJson } from './http';

export async function parseBody(request, schema) {
  const body = await readJson(request);
  if (body === undefined) {
    return {
      error: failure(
        400,
        'BAD_REQUEST',
        'The request body must be valid JSON.',
      ),
    };
  }
  const parsed = schema.safeParse(body);
  if (parsed.success) return { data: parsed.data };

  const details = parsed.error.issues.map(({ path, message }) => ({
    field: path.join('.'),
    message,
  }));
  return {
    error: failure(422, 'VALIDATION_ERROR', details[0].message, details),
  };
}

export const newId = () => crypto.randomUUID().replaceAll('-', '').slice(0, 24);
export const timestamp = () => new Date().toISOString();

export function pageOptions(request, defaultLimit = 12) {
  const query = new URL(request.url).searchParams;
  const page = Number(query.get('page') ?? 1);
  const limit = Number(query.get('limit') ?? defaultLimit);
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 48
  ) {
    return {
      error: failure(
        422,
        'VALIDATION_ERROR',
        'Use a positive page number and a limit of up to 48.',
      ),
    };
  }
  return { page, limit, query };
}

export function paginate(items, { page, limit }) {
  const total = items.length;
  const totalPages = Math.ceil(total / limit);
  return {
    items: items.slice((page - 1) * limit, page * limit),
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}
