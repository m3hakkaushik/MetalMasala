import http from './http';

export const getCategories = (signal) => http.get('/categories', { signal });
