import { apiUrl } from '../api/config';
import { failure } from './http';

export const accessLifeSeconds = 15 * 60;
export const refreshLifeSeconds = 7 * 24 * 60 * 60;
const accessTokens = new Map();
const authPath =
  new URL(apiUrl, window.location.origin).pathname.replace(/\/$/, '') + '/auth';

export function sessionHeaders(value, maxAge = refreshLifeSeconds) {
  return {
    'Set-Cookie': `mm_refresh=${value}; Path=${authPath}; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`,
  };
}

export function unauthorized(message = 'Sign in to continue.') {
  return failure(401, 'UNAUTHENTICATED', message);
}

export function actor(db, request, roles) {
  const token = request.headers
    .get('Authorization')
    ?.match(/^Bearer (.+)$/)?.[1];
  const session = accessTokens.get(token);
  const user = session && db.users.find(({ id }) => id === session.userId);
  if (!user || db.inactiveUsers.includes(user.id))
    return { error: unauthorized() };
  if (session.expiresAt <= Date.now()) {
    return { error: failure(401, 'TOKEN_EXPIRED', 'Your session expired.') };
  }
  if (roles && !roles.includes(user.role)) {
    return {
      error: failure(
        403,
        'FORBIDDEN',
        'Your account doesn’t have permission for this action.',
      ),
    };
  }
  return { user };
}

export function issueSession(db, userId, family = crypto.randomUUID()) {
  const refreshToken = crypto.randomUUID();
  const accessToken = crypto.randomUUID();
  const now = Date.now();
  accessTokens.set(accessToken, {
    userId,
    expiresAt: now + accessLifeSeconds * 1000,
  });
  db.sessions = Object.fromEntries(
    Object.entries(db.sessions).filter(
      ([, session]) => session.expiresAt > now,
    ),
  );
  db.sessions[refreshToken] = {
    userId,
    family,
    expiresAt: now + refreshLifeSeconds * 1000,
  };
  return { refreshToken, accessToken, expiresIn: accessLifeSeconds };
}

export function revokeUser(db, userId) {
  for (const [token, session] of Object.entries(db.sessions)) {
    if (session.userId === userId) delete db.sessions[token];
  }
  for (const [token, session] of accessTokens) {
    if (session.userId === userId) accessTokens.delete(token);
  }
}
