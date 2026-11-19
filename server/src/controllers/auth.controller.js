import config from '../config/index.js';
import * as auth from '../services/auth.service.js';
import { sendSuccess } from '../utils/response.js';

const cookie = 'mm_refresh';
const settings = {
  ...config.auth.cookie,
  httpOnly: true,
  path: '/api/v1/auth',
};
const audit = (req) => ({
  ip: req.ip,
  userAgent: req.get('user-agent')?.slice(0, 512),
});

function sendSession(
  res,
  { user, accessToken, expiresIn, refreshToken },
  status = 200
) {
  res.cookie(cookie, refreshToken, {
    ...settings,
    maxAge: config.auth.jwt.refreshExpires * 1000,
  });
  return sendSuccess(
    res,
    { ...(user && { user }), accessToken, expiresIn },
    { status }
  );
}

export const register = async (req, res) =>
  sendSession(res, await auth.register(req.validated.body, audit(req)), 201);
export const login = async (req, res) =>
  sendSession(res, await auth.login(req.validated.body, audit(req)));
export const refresh = async (req, res) =>
  sendSession(res, await auth.refresh(req.cookies[cookie], audit(req)));
export const me = (req, res) => sendSuccess(res, { user: req.user });
export const password = async (req, res) =>
  sendSession(
    res,
    await auth.changePassword(req.user.id, req.validated.body, audit(req))
  );

export async function logout(req, res) {
  res.clearCookie(cookie, settings);
  await auth.logout(req.cookies[cookie]);
  return sendSuccess(res, null, { status: 204 });
}
