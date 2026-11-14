import {
  loginSchema,
  passwordSchema,
  registerSchema,
} from '../../api/validation';
import { demoPasswords, readDb, saveDb } from '../db';
import { endpoint, failure, noContent, success } from '../http';
import {
  actor,
  issueSession,
  revokeUser,
  sessionHeaders,
  unauthorized,
} from '../session';
import { newId, parseBody, timestamp } from '../validation';

async function mockPasswordDigest(userId, password) {
  const bytes = new TextEncoder().encode(userId + ':' + password);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (value) =>
    value.toString(16).padStart(2, '0'),
  ).join('');
}

async function matchesPassword(db, user, password) {
  if (!user) return false;
  return db.passwords[user.id]
    ? db.passwords[user.id] === (await mockPasswordDigest(user.id, password))
    : demoPasswords[user.id] === password;
}

function sendSession(db, user, status = 200, includeUser = true, family) {
  const { refreshToken, accessToken, expiresIn } = issueSession(
    db,
    user.id,
    family,
  );
  saveDb({ sessions: db.sessions });
  const data = includeUser
    ? { user, accessToken, expiresIn }
    : { accessToken, expiresIn };
  return success(data, { status, headers: sessionHeaders(refreshToken) });
}

export const authHandlers = [
  endpoint('post', '/auth/register', async ({ request }) => {
    const { data, error } = await parseBody(request, registerSchema);
    if (error) return error;
    const id = newId();
    const digest = await mockPasswordDigest(id, data.password);
    const db = readDb();
    if (db.users.some(({ email }) => email === data.email))
      return failure(409, 'CONFLICT', 'An account already uses that email.');
    const user = {
      id,
      name: data.name,
      email: data.email,
      role: 'customer',
      phone: '',
      addresses: [],
      wishlist: [],
      createdAt: timestamp(),
    };
    db.users.push(user);
    db.passwords[user.id] = digest;
    saveDb({ users: db.users, passwords: db.passwords });
    return sendSession(db, user, 201);
  }),
  endpoint('post', '/auth/login', async ({ request }) => {
    const { data, error } = await parseBody(request, loginSchema);
    if (error) return error;
    const db = readDb();
    const user = db.users.find(({ email }) => email === data.email);
    if (
      !(await matchesPassword(db, user, data.password)) ||
      db.inactiveUsers.includes(user.id)
    ) {
      return unauthorized('Email or password is incorrect.');
    }
    return sendSession(db, user);
  }),
  endpoint('post', '/auth/refresh', ({ cookies }) => {
    const db = readDb();
    const session = db.sessions[cookies.mm_refresh];
    const user = session && db.users.find(({ id }) => id === session.userId);
    if (
      !user ||
      session.expiresAt <= Date.now() ||
      db.inactiveUsers.includes(user.id)
    )
      return unauthorized();
    if (session.rotated) {
      db.sessions = Object.fromEntries(
        Object.entries(db.sessions).filter(
          ([, stored]) => stored.family !== session.family,
        ),
      );
      saveDb({ sessions: db.sessions });
      return unauthorized();
    }
    session.rotated = true;
    return sendSession(db, user, 200, false, session.family);
  }),
  endpoint('post', '/auth/logout', ({ cookies }) => {
    const db = readDb();
    const session = db.sessions[cookies.mm_refresh];
    if (session) {
      db.sessions = Object.fromEntries(
        Object.entries(db.sessions).filter(
          ([, stored]) => stored.family !== session.family,
        ),
      );
      saveDb({ sessions: db.sessions });
    }
    return noContent(sessionHeaders('', 0));
  }),
  endpoint('get', '/auth/me', ({ request }) => {
    const { user, error } = actor(readDb(), request);
    return error ?? success({ user });
  }),
  endpoint('patch', '/auth/password', async ({ request }) => {
    const body = await parseBody(request, passwordSchema);
    if (body.error) return body.error;
    const db = readDb();
    const { user, error } = actor(db, request);
    if (error) return error;
    if (!(await matchesPassword(db, user, body.data.currentPassword)))
      return unauthorized('Current password is incorrect.');
    db.passwords[user.id] = await mockPasswordDigest(
      user.id,
      body.data.newPassword,
    );
    revokeUser(db, user.id);
    saveDb({ passwords: db.passwords, sessions: db.sessions });
    return sendSession(db, user);
  }),
];
