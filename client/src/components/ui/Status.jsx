import { AlertCircle } from 'lucide-react';
import { Button } from './Button';

export function RequestError({ error, retry }) {
  return (
    <div className="request-error" role="alert">
      <p>
        <AlertCircle size={18} />{' '}
        {error?.message ?? 'The request failed. Please try again.'}
      </p>
      {retry && (
        <Button variant="outline" onClick={retry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function ProductSkeletons({ count = 4 }) {
  return (
    <div className="product-grid" role="status" aria-label="Loading pieces">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="skeleton-card" aria-hidden="true">
          <div />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}
