import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../../src/models/User.js';
import { DEV_USER_IDS } from '../../src/config/constants.js';
import { signAccess } from '../../src/utils/jwt.js';

export const bearer = (role) =>
  `Bearer ${signAccess({ id: DEV_USER_IDS[role], role })}`;

export async function connectTestUsers() {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await User.create(
    Object.entries(DEV_USER_IDS).map(([role, _id]) => ({
      _id,
      role,
      name: `Test ${role}`,
      email: `${role}@example.test`,
      password: 'TestPassword1',
    }))
  );
  return async () => {
    await mongoose.disconnect();
    await mongo.stop();
  };
}
