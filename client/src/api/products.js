import http from './http';

export const getProducts = (params, signal) =>
  http.get('/products', { params, signal });
export const getFacets = (params, signal) =>
  http.get('/products/facets', { params, signal });
export const getProduct = (slug, signal) =>
  http.get(`/products/${encodeURIComponent(slug)}`, { signal });
export const getRelated = (slug, signal) =>
  http.get(`/products/${encodeURIComponent(slug)}/related`, { signal });
