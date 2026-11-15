import http from './http';

export const createOrder = (fields) => http.post('/orders', fields);
export const listOrders = (params, signal) =>
  http.get('/orders', { params, signal });
export const getOrder = (id, signal, params) =>
  http.get(`/orders/${encodeURIComponent(id)}`, { signal, params });
export const cancelOrder = (id) =>
  http.patch(`/orders/${encodeURIComponent(id)}/cancel`);
