import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';

const { accessSecret, refreshSecret, accessExpires, refreshExpires } =
  config.auth.jwt;
const issuer = 'metal-masala';
const algorithm = 'HS256';

export const credentialVersion = (user) =>
  user.passwordChangedAt?.getTime() ?? 0;

// [L34] decode only parses claims. verify also authenticates the signature and checks expiration.
function sign(user, type, payload, secret, expiresIn) {
  return jwt.sign({ ...payload, version: credentialVersion(user) }, secret, {
    algorithm,
    issuer,
    subject: user.id,
    audience: type,
    expiresIn,
    jwtid: randomUUID(),
  });
}

const verify = (token, audience, secret) =>
  jwt.verify(token, secret, { algorithms: [algorithm], issuer, audience });

export const signAccess = (user) =>
  sign(user, 'access', { role: user.role }, accessSecret, accessExpires);
export const signRefresh = (user, family) =>
  sign(user, 'refresh', { family }, refreshSecret, refreshExpires);
export const verifyAccess = (token) => verify(token, 'access', accessSecret);
export const verifyRefresh = (token) => verify(token, 'refresh', refreshSecret);
