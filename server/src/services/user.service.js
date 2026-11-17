import { bus } from '../events/bus.js';
import { EVENTS } from '../events/events.js';
import { ERROR_CODES as codes } from '../config/constants.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { revokeUserSessions } from './auth.service.js';

const notFound = (resource) =>
  new AppError(404, codes.NOT_FOUND, `${resource} not found`);
const forbidden = (message) => new AppError(403, codes.FORBIDDEN, message);

export async function updateProfile(user, changes) {
  user.set(changes);
  return user.save();
}

// [L32] Addresses and wishlists are scoped to the authenticated user's document.
function setDefault(addresses, preferred) {
  const selected =
    preferred ?? addresses.find(({ isDefault }) => isDefault) ?? addresses[0];
  for (const address of addresses)
    address.isDefault = address.id === selected?.id;
}

export async function addAddress(user, data) {
  if (user.addresses.length >= 5) {
    throw new AppError(
      422,
      codes.VALIDATION_ERROR,
      'You can save up to five addresses.'
    );
  }
  user.addresses.push(data);
  const address = user.addresses.at(-1);
  setDefault(user.addresses, data.isDefault ? address : undefined);
  await user.save();
  return address;
}

export async function updateAddress(user, addressId, data) {
  const address = user.addresses.id(addressId);
  if (!address) throw notFound('Address');
  address.set(data);
  setDefault(user.addresses, data.isDefault ? address : undefined);
  await user.save();
  return address;
}

export async function deleteAddress(user, addressId) {
  user.addresses.pull(addressId);
  setDefault(user.addresses);
  await user.save();
}

export async function wishlist(user) {
  const products = await Product.find({ _id: { $in: user.wishlist } }).populate(
    'category',
    'name slug'
  );
  const byId = new Map(products.map((product) => [product.id, product]));
  return user.wishlist.map((id) => byId.get(String(id))).filter(Boolean);
}

export async function addWishlist(user, productId) {
  if (!(await Product.exists({ _id: productId }))) throw notFound('Product');
  if (!user.wishlist.some((id) => id.equals(productId))) {
    user.wishlist.push(productId);
    await user.save();
  }
  return { wishlist: user.wishlist };
}

export async function removeWishlist(user, productId) {
  user.wishlist.pull(productId);
  await user.save();
}

export async function listUsers({ q, role, page, limit }) {
  const filter = role ? { role } : {};
  if (q) {
    const pattern = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: pattern }, { email: pattern }];
  }
  const [items, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

async function targetUser(id) {
  const selected = await User.findById(id);
  if (!selected) throw notFound('User');
  return selected;
}

export async function changeRole(actor, id, role) {
  const user = await targetUser(id);
  if (user.id === actor.id && role !== 'admin')
    throw forbidden('You cannot change your own admin role.');
  if (user.role !== role) {
    user.role = role;
    await user.save();
    bus.emit(EVENTS.ACCOUNT_CHANGED, { userId: user.id });
  }
  return user;
}

export async function changeStatus(actor, id, isActive) {
  const user = await targetUser(id);
  if (user.id === actor.id && !isActive)
    throw forbidden('You cannot deactivate your own account.');
  if (user.isActive !== isActive) {
    user.isActive = isActive;
    if (!isActive) user.invalidateCredentials();
    await user.save();
    bus.emit(EVENTS.ACCOUNT_CHANGED, { userId: user.id });
  }
  if (!isActive) await revokeUserSessions(user.id);
  return user;
}
