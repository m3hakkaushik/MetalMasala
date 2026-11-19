import './helpers/environment.js';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

function run(source, overrides) {
  return spawnSync(process.execPath, ['--input-type=module', '-e', source], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf-8',
    env: { ...process.env, ...overrides },
  });
}

test('invalid config names the field and never logs the connection string', () => {
  const result = run("await import('./src/config/index.js')", {
    PORT: 'abc',
    MONGODB_URI: 'invalid-private-connection-string',
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Invalid server configuration/);
  assert.match(result.stdout, /PORT/);
  assert.match(result.stdout, /MONGODB_URI/);
  assert.doesNotMatch(
    result.stdout + result.stderr,
    /invalid-private-connection-string/
  );
});

test('the Atlas target needs a connection string', () => {
  const result = run("await import('./src/config/index.js')", {
    DB_TARGET: 'atlas',
  });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /Required when DB_TARGET=atlas/);
});

test('production requires distinct JWT secrets and secure cookies', () => {
  const result = run("await import('./src/config/index.js')", {
    NODE_ENV: 'production', NATIVE_PORT: '4001', DATA_STORE: 'mongo',
    JWT_ACCESS_SECRET: 'a'.repeat(32), JWT_REFRESH_SECRET: 'a'.repeat(32),
    COOKIE_SECURE: 'false',
  });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /Use separate secrets/);
  assert.match(result.stdout, /COOKIE_SECURE/);
});
