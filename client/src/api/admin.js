import http from './http';

const route = (base, id) => base + '/' + encodeURIComponent(id);

export const createProduct = (fields) => http.post('/products', fields);
export const updateProduct = (id, fields) =>
  http.patch(route('/products', id), fields);
export const deleteProduct = (id) => http.delete(route('/products', id));
export const listAdminOrders = (params, signal) =>
  http.get('/admin/orders', { params, signal });
export const updateOrderStatus = (id, status) =>
  http.patch(route('/admin/orders', id) + '/status', { status });
export const listAdminUsers = (params, signal) =>
  http.get('/admin/users', { params, signal });
export const updateUserRole = (id, role) =>
  http.patch(route('/admin/users', id) + '/role', { role });
export const updateUserStatus = (id, isActive) =>
  http.patch(route('/admin/users', id) + '/status', { isActive });
export const getAnalytics = (endpoint, params, signal) =>
  http.get('/admin/analytics/' + endpoint, { params, signal });
