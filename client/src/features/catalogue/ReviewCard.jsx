import { Star } from 'lucide-react';

export function ReviewCard({ review, children }) {
  return (
    <article className="review-card">
      <div className="rating">
        <Star size={16} fill="currentColor" aria-hidden="true" />{' '}
        <span>{review.rating} out of 5</span>
      </div>
      <h3>{review.title}</h3>
      <p>{review.body}</p>
      <div className="review-card__byline">
        <span>{review.user.name}</span>
        {review.isVerifiedPurchase && <span>Verified purchase</span>}
      </div>
      {children}
    </article>
  );
}
