import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { ReviewCard } from './ReviewCard';
import { useLocation } from 'react-router-dom';
import { deleteReview, getReviews } from '../../api/reviews';
import { loginPath } from '../../app/Access';
import { useAuth } from '../../stores/auth.store';
import { ReviewForm } from './ReviewForm';
import { Button } from '../../components/ui/Button';
import { RequestError } from '../../components/ui/Status';

export function Reviews({ productId }) {
  const user = useAuth((state) => state.user);
  const location = useLocation();
  const queryClient = useQueryClient();
  async function changed() {
    await Promise.all(
      ['reviews', 'product', 'products', 'shop', 'related', 'home-reviews'].map(
        (key) => queryClient.invalidateQueries({ queryKey: [key] }),
      ),
    );
  }
  const remove = useMutation({ mutationFn: deleteReview, onSuccess: changed });
  const reviews = useInfiniteQuery({
    queryKey: ['reviews', productId],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      getReviews(productId, { page: pageParam, limit: 6 }, signal),
    getNextPageParam: ({ meta }) => (meta.hasNext ? meta.page + 1 : undefined),
  });
  const entries = reviews.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <section className="reviews" aria-labelledby="reviews-heading" id="reviews">
      <h2 id="reviews-heading">Reviews</h2>
      {reviews.isPending && <p role="status">Loading reviews…</p>}
      {reviews.isError && (
        <RequestError error={reviews.error} retry={reviews.refetch} />
      )}
      {reviews.isSuccess && entries.length === 0 && <p>No reviews yet.</p>}
      <div className="review-grid">
        {entries.map((review) => (
          <ReviewCard key={review.id} review={review}>
            {(user?.id === review.user.id || user?.role === 'admin') && (
              <button
                type="button"
                className="text-link"
                onClick={() => remove.mutate(review.id)}
                disabled={remove.isPending}
                aria-label={`Remove review: ${review.title}`}
              >
                Remove review
              </button>
            )}
          </ReviewCard>
        ))}
      </div>
      {reviews.hasNextPage && (
        <Button
          variant="outline"
          disabled={reviews.isFetchingNextPage}
          onClick={() => reviews.fetchNextPage()}
        >
          {reviews.isFetchingNextPage ? 'Loading…' : 'More reviews'}
        </Button>
      )}
      {remove.isError && <RequestError error={remove.error} />}
      {user ? (
        <details className="review-editor">
          <summary>Write a review</summary>
          <ReviewForm productId={productId} saved={changed} />
        </details>
      ) : (
        <Button
          variant="outline"
          to={loginPath({ ...location, hash: '#reviews' })}
        >
          Sign in to write a review
        </Button>
      )}
    </section>
  );
}
