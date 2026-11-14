import http from './http';

export const getCart = (signal) => http.get('/cart', { signal });
export const addCartItem = (productId, qty) =>
  http.post('/cart/items', { productId, qty });
export const updateCartItem = (id, qty) =>
  http.patch(`/cart/items/${encodeURIComponent(id)}`, { qty });
export const removeCartItem = (id) =>
  http.delete(`/cart/items/${encodeURIComponent(id)}`);
export const mergeCart = (items) => http.post('/cart/merge', { items });
