import http from './http';

export const getReviews = (productId, params, signal) =>
  http.get(`/products/${encodeURIComponent(productId)}/reviews`, {
    params,
    signal,
  });

export const writeReview = (productId, fields) =>
  http.post(`/products/${encodeURIComponent(productId)}/reviews`, fields);
export const deleteReview = (reviewId) =>
  http.delete(`/reviews/${encodeURIComponent(reviewId)}`);
