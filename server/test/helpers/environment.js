import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const store = mkdtempSync(path.join(tmpdir(), 'metal-masala-test-'));
import './mongoEnvironment.js';

process.env.PORT = '4000';
process.env.NATIVE_PORT = '0';
process.env.MONGODB_URI = '';
process.env.MONGODB_URI_LOCAL = 'mongodb://127.0.0.1:27017/metal_masala';
process.env.DATA_STORE = 'json';
process.env.DATA_STORE_DIR = store;
process.env.LOG_LEVEL = 'silent';
process.env.DB_TARGET = 'local';
process.env.RATE_LIMIT_MAX = '100';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';
process.env.FREE_SHIPPING_THRESHOLD = '999';
process.env.SHIPPING_FEE = '79';
process.env.COD_FEE = '49';

process.on('exit', () => rmSync(store, { recursive: true, force: true }));
