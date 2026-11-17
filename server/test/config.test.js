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

test('the development role stub refuses an admin header in production', () => {
  const result = run(
    `
    import { protect } from './src/middleware/auth.js';
    const request = { get: () => 'admin' };
    protect(request, {}, (error) => {
      if (error?.status !== 501 || error.code !== 'UNAUTHENTICATED' || request.user) {
        process.exitCode = 1;
      }
    });
  `,
    { NODE_ENV: 'production', NATIVE_PORT: '4001' }
  );
  assert.equal(result.status, 0, result.stdout + result.stderr);
});
