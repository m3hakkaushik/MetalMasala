import { z } from 'zod';
import { addressSchema, profileSchema } from '../../api/validation';
import { readDb, saveDb } from '../db';
import { endpoint, failure, noContent, notFound, success } from '../http';
import { actor, revokeUser } from '../session';
import { newId, pageOptions, paginate, parseBody } from '../validation';

function privateEndpoint(method, path, callback, { schema, roles } = {}) {
  return endpoint(method, path, async ({ request, params }) => {
    const body = schema ? await parseBody(request, schema) : {};
    if (body.error) return body.error;
    const db = readDb();
    const { user, error } = actor(db, request, roles);
    return error ?? callback({ request, params, db, user, data: body.data });
  });
}

function commitUsers(db) {
  saveDb({ users: db.users });
}

function makeDefault(addresses, id) {
  for (const address of addresses) address.isDefault = address.id === id;
}

export const usersHandlers = [
  privateEndpoint('get', '/users/me', ({ user }) => success(user)),
  privateEndpoint(
    'patch',
    '/users/me',
    ({ user, db, data }) => {
      Object.assign(user, data);
      commitUsers(db);
      return success(user);
    },
    { schema: profileSchema.partial() },
  ),
  privateEndpoint(
    'post',
    '/users/me/addresses',
    ({ db, user, data }) => {
      if (user.addresses.length >= 5)
        return failure(
          422,
          'VALIDATION_ERROR',
          'You can save up to five addresses.',
        );
      const address = {
        ...data,
        id: newId(),
        isDefault: user.addresses.length === 0 || Boolean(data.isDefault),
      };
      user.addresses.push(address);
      if (address.isDefault) makeDefault(user.addresses, address.id);
      commitUsers(db);
      return success(address, { status: 201 });
    },
    { schema: addressSchema },
  ),
  privateEndpoint(
    'patch',
    '/users/me/addresses/:addressId',
    ({ db, user, params, data }) => {
      const address = user.addresses.find(({ id }) => id === params.addressId);
      if (!address) return notFound('Address');
      Object.assign(address, data);
      if (address.isDefault) makeDefault(user.addresses, address.id);
      if (!user.addresses.some(({ isDefault }) => isDefault))
        user.addresses[0].isDefault = true;
      commitUsers(db);
      return success(address);
    },
    { schema: addressSchema.partial() },
  ),
  privateEndpoint(
    'delete',
    '/users/me/addresses/:addressId',
    ({ db, user, params }) => {
      user.addresses = user.addresses.filter(
        ({ id }) => id !== params.addressId,
      );
      if (
        user.addresses.length &&
        !user.addresses.some(({ isDefault }) => isDefault)
      ) {
        user.addresses[0].isDefault = true;
      }
      commitUsers(db);
      return noContent();
    },
  ),
  privateEndpoint('get', '/users/me/wishlist', ({ user, db }) =>
    success(db.products.filter(({ id }) => user.wishlist.includes(id))),
  ),
  privateEndpoint(
    'post',
    '/users/me/wishlist/:productId',
    ({ db, user, params }) => {
      if (!db.products.some(({ id }) => id === params.productId))
        return notFound('Product');
      if (!user.wishlist.includes(params.productId)) {
        user.wishlist.push(params.productId);
        commitUsers(db);
      }
      return success({ wishlist: user.wishlist });
    },
  ),
  privateEndpoint(
    'delete',
    '/users/me/wishlist/:productId',
    ({ db, user, params }) => {
      user.wishlist = user.wishlist.filter((id) => id !== params.productId);
      commitUsers(db);
      return noContent();
    },
  ),
];

const roles = ['admin'];
const roleSchema = z.object({ role: z.enum(['customer', 'manager', 'admin']) });
const statusSchema = z.object({ isActive: z.boolean() });
const adminView = (db, user) => ({
  ...user,
  isActive: !db.inactiveUsers.includes(user.id),
});

export const adminUserHandlers = [
  privateEndpoint(
    'get',
    '/admin/users',
    ({ db, request }) => {
      const options = pageOptions(request);
      if (options.error) return options.error;
      const q = options.query.get('q')?.trim().toLowerCase();
      const role = options.query.get('role');
      const users = db.users.filter(
        (user) =>
          (!role || user.role === role) &&
          (!q || `${user.name} ${user.email}`.toLowerCase().includes(q)),
      );
      const result = paginate(users, options);
      return success(
        result.items.map((user) => adminView(db, user)),
        { meta: result.meta },
      );
    },
    { roles },
  ),
  privateEndpoint(
    'patch',
    '/admin/users/:id/role',
    ({ db, user, params, data }) => {
      const selected = db.users.find(({ id }) => id === params.id);
      if (!selected) return notFound('User');
      if (selected.id === user.id && data.role !== 'admin')
        return failure(
          403,
          'FORBIDDEN',
          'You can’t change your own admin role.',
        );
      selected.role = data.role;
      commitUsers(db);
      return success(adminView(db, selected));
    },
    { roles, schema: roleSchema },
  ),
  privateEndpoint(
    'patch',
    '/admin/users/:id/status',
    ({ db, params, data }) => {
      const selected = db.users.find(({ id }) => id === params.id);
      if (!selected) return notFound('User');
      db.inactiveUsers = db.inactiveUsers.filter((id) => id !== selected.id);
      if (!data.isActive) {
        db.inactiveUsers.push(selected.id);
        revokeUser(db, selected.id);
      }
      saveDb({ inactiveUsers: db.inactiveUsers, sessions: db.sessions });
      return success(adminView(db, selected));
    },
    { roles, schema: statusSchema },
  ),
];
