import http from './http';

export const quoteBag = (items, paymentMethod, signal) =>
  http.post('/pricing/quote', { items, paymentMethod }, { signal });
