import { reviewSchema } from '../../api/validation';
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

function updateRating(db, productId) {
  const product = db.products.find(({ id }) => id === productId);
  if (!product) return;
  const ratings = db.reviews.filter((review) => review.product === productId);
  product.ratingCount = ratings.length;
  product.ratingAverage = ratings.length
    ? Math.round(
        (ratings.reduce((sum, review) => sum + review.rating, 0) /
          ratings.length) *
          10,
      ) / 10
    : 0;
  saveDb({ products: db.products, reviews: db.reviews });
}

export const reviewsHandlers = [
  endpoint('get', '/products/:productId/reviews', ({ params, request }) => {
    const { products, reviews } = readDb();
    if (!products.some(({ id }) => id === params.productId))
      return notFound('Product');
    const query = new URL(request.url).searchParams;
    const page = Number(query.get('page') ?? 1);
    const limit = Number(query.get('limit') ?? 12);
    const sort = query.get('sort') ?? 'newest';
    if (!Number.isSafeInteger(page) || page < 1)
      return invalid('page', 'Page must be a positive whole number.');
    if (!Number.isInteger(limit) || limit < 1 || limit > 48)
      return invalid('limit', 'Limit must be between 1 and 48.');
    if (!['newest', 'rating'].includes(sort))
      return invalid('sort', 'Choose a supported sort order.');

    const matches = reviews
      .filter((review) => review.product === params.productId)
      .sort(
        (a, b) =>
          (sort === 'rating' ? b.rating - a.rating : 0) ||
          b.createdAt.localeCompare(a.createdAt),
      );
    const total = matches.length;
    const totalPages = Math.ceil(total / limit);
    return success(matches.slice((page - 1) * limit, page * limit), {
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  }),
  endpoint(
    'post',
    '/products/:productId/reviews',
    async ({ request, params }) => {
      const body = await parseBody(request, reviewSchema);
      if (body.error) return body.error;
      const db = readDb();
      const { user, error } = actor(db, request);
      if (error) return error;
      if (!db.products.some(({ id }) => id === params.productId))
        return notFound('Product');
      if (
        db.reviews.some(
          (review) =>
            review.product === params.productId && review.user.id === user.id,
        )
      ) {
        return failure(409, 'CONFLICT', 'You already reviewed this piece.');
      }
      const isVerifiedPurchase = db.orders.some(
        (order) =>
          order.user === user.id &&
          order.status === 'delivered' &&
          order.items.some((item) => item.product === params.productId),
      );
      const [first, ...rest] = user.name.split(' ');
      const displayName = rest.length
        ? first + ' ' + rest.at(-1)[0] + '.'
        : first;
      const review = {
        id: newId(),
        product: params.productId,
        user: { id: user.id, name: displayName },
        ...body.data,
        isVerifiedPurchase,
        createdAt: timestamp(),
      };
      db.reviews.push(review);
      updateRating(db, review.product);
      return success(review, { status: 201 });
    },
  ),
  endpoint('delete', '/reviews/:id', ({ request, params }) => {
    const db = readDb();
    const { user, error } = actor(db, request);
    if (error) return error;
    const review = db.reviews.find(({ id }) => id === params.id);
    if (!review) return notFound('Review');
    if (user.role !== 'admin' && user.id !== review.user.id) {
      return failure(403, 'FORBIDDEN', 'You can remove only your own review.');
    }
    db.reviews = db.reviews.filter(({ id }) => id !== review.id);
    updateRating(db, review.product);
    return noContent();
  }),
];
