import * as users from '../services/user.service.js';
import { sendSuccess } from '../utils/response.js';

export const me = (req, res) => sendSuccess(res, req.user);
export const update = async (req, res) =>
  sendSuccess(res, await users.updateProfile(req.user, req.validated.body));
export const addAddress = async (req, res) =>
  sendSuccess(res, await users.addAddress(req.user, req.validated.body), {
    status: 201,
  });
export const updateAddress = async (req, res) =>
  sendSuccess(
    res,
    await users.updateAddress(
      req.user,
      req.validated.params.addressId,
      req.validated.body
    )
  );
export const wishlist = async (req, res) =>
  sendSuccess(res, await users.wishlist(req.user));
export const addWishlist = async (req, res) =>
  sendSuccess(
    res,
    await users.addWishlist(req.user, req.validated.params.productId)
  );

export async function deleteAddress(req, res) {
  await users.deleteAddress(req.user, req.validated.params.addressId);
  return sendSuccess(res, null, { status: 204 });
}

export async function removeWishlist(req, res) {
  await users.removeWishlist(req.user, req.validated.params.productId);
  return sendSuccess(res, null, { status: 204 });
}

export async function list(req, res) {
  const { items, meta } = await users.listUsers(req.validated.query);
  return sendSuccess(res, items, { meta });
}

export const role = async (req, res) =>
  sendSuccess(
    res,
    await users.changeRole(
      req.user,
      req.validated.params.id,
      req.validated.body.role
    )
  );
export const status = async (req, res) =>
  sendSuccess(
    res,
    await users.changeStatus(
      req.user,
      req.validated.params.id,
      req.validated.body.isActive
    )
  );
