import http from './http';
const current = '/users/me';
const addresses = current + '/addresses';
const wishlist = current + '/wishlist';
const routeItem = (path, id) => path + '/' + encodeURIComponent(id);

export const getProfile = (signal) => http.get(current, { signal });
export const updateProfile = (fields) => http.patch(current, fields);
export const createAddress = (data) => http.post(addresses, data);
export const updateAddress = (id, data) =>
  http.patch(routeItem(addresses, id), data);
export const deleteAddress = (id) => http.delete(routeItem(addresses, id));
export const getWishlist = (signal) => http.get(wishlist, { signal });
export const addWishlist = (id) => http.post(routeItem(wishlist, id));
export const removeWishlist = (id) => http.delete(routeItem(wishlist, id));
