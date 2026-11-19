import { bus } from '../events/bus.js';
import { EVENTS } from '../events/events.js';
import { createHash, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import config from '../config/index.js';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import { ERROR_CODES as codes } from '../config/constants.js';
import { AppError } from '../utils/AppError.js';
import {
  credentialVersion,
  signAccess,
  signRefresh,
  verifyAccess,
  verifyRefresh,
} from '../utils/jwt.js';

const invalidSession = () =>
  new AppError(401, codes.UNAUTHENTICATED, 'Sign in to continue');
const badCredentials = () =>
  new AppError(401, codes.UNAUTHENTICATED, 'Invalid email or password');
const tokenHash = (token) => createHash('sha256').update(token).digest('hex');
const dummyPassword = bcrypt.hashSync(randomUUID(), config.auth.bcryptRounds);

export function requireUserStore() {
  if (mongoose.connection.readyState !== 1) {
    throw new AppError(
      503,
      codes.INTERNAL_ERROR,
      'Account service is temporarily unavailable'
    );
  }
}

function tokenMatches(user, claims) {
  // JWT iat is only precise to a second. This version invalidates same-second tokens as well.
  return user?.isActive && credentialVersion(user) === claims.version;
}

export async function verifyAccessUser(token) {
  if (!token) throw invalidSession();
  const claims = verifyAccess(token);
  requireUserStore();
  const user = await User.findById(claims.sub);
  if (!tokenMatches(user, claims)) throw invalidSession();
  return { user, expiresAt: claims.exp * 1000 };
}

async function createSession(user, audit, family = randomUUID()) {
  const refreshToken = signRefresh(user, family);
  const { exp } = verifyRefresh(refreshToken);
  const record = await RefreshToken.create({
    ...audit,
    user: user.id,
    family,
    expiresAt: new Date(exp * 1000),
    tokenHash: tokenHash(refreshToken),
  });
  return {
    record,
    refreshToken,
    accessToken: signAccess(user),
    expiresIn: config.auth.jwt.accessExpires,
  };
}

const revoke = (filter) =>
  RefreshToken.updateMany(
    { ...filter, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );

export const revokeUserSessions = (user) => revoke({ user });

// [L31] Authentication creates a customer identity and a distinct refresh session.
export async function register({ name, email, password }, audit) {
  const user = await User.create({ name, email, password, role: 'customer' });
  bus.emit(EVENTS.USER_REGISTERED, { user: user.toJSON() });
  return { user, ...(await createSession(user, audit)) };
}

export async function login({ email, password }, audit) {
  const user = await User.findOne({ email }).select('+password');
  const matches = user
    ? await user.comparePassword(password)
    : await bcrypt.compare(password, dummyPassword);
  if (!matches || !user?.isActive) throw badCredentials();
  return { user, ...(await createSession(user, audit)) };
}

// [L35] A conditional update chooses one winner, including on standalone MongoDB.
export async function refresh(token, audit) {
  let claims;
  try {
    claims = verifyRefresh(token);
  } catch {
    throw invalidSession();
  }
  const previous = await RefreshToken.findOne({
    tokenHash: tokenHash(token),
    family: claims.family,
  });
  if (!previous) throw invalidSession();
  if (previous.revokedAt) {
    await revoke({ family: previous.family });
    throw invalidSession();
  }

  const user = await User.findById(claims.sub);
  if (!tokenMatches(user, claims)) throw invalidSession();
  const next = await createSession(user, audit, previous.family);
  let updated;
  try {
    updated = await RefreshToken.updateOne(
      { _id: previous.id, revokedAt: null },
      { $set: { revokedAt: new Date(), replacedBy: next.record.id } }
    );
  } catch (error) {
    await revoke({ _id: next.record.id });
    throw error;
  }
  if (updated.modifiedCount !== 1) {
    await revoke({ family: previous.family });
    throw invalidSession();
  }
  return next;
}

export async function logout(token) {
  if (!token || mongoose.connection.readyState !== 1) return;
  const record = await RefreshToken.findOne({ tokenHash: tokenHash(token) });
  if (record) await revoke({ family: record.family });
}

export async function changePassword(
  id,
  { currentPassword, newPassword },
  audit
) {
  const user = await User.findById(id).select('+password');
  if (!user?.isActive || !(await user.comparePassword(currentPassword)))
    throw badCredentials();
  user.password = newPassword;
  user.markModified('password');
  await user.save();
  bus.emit(EVENTS.ACCOUNT_CHANGED, { userId: user.id });
  await revokeUserSessions(user.id);
  return { user, ...(await createSession(user, audit)) };
}
