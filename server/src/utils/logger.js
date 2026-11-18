import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import util from 'node:util';
import createDebug from 'debug';

// [L5] Core Node.js Modules:
// 1. `path` and `url` for ESM directory resolution (__dirname replacement)
// 2. `fs/promises` for atomic writes and append-only access log
// 3. `util.format` for log string formatting
// [L8] API Testing & Debugging: debug namespaces (mm:boot, mm:http, mm:data)

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logDir = path.resolve(__dirname, '../../logs');
const accessLogPath = path.join(logDir, 'access.log');

export const debugBoot = createDebug('mm:boot');
export const debugHttp = createDebug('mm:http');
export const debugData = createDebug('mm:data');

let logDirEnsured = false;
async function ensureLogDir() {
  if (logDirEnsured) return;
  try {
    await fs.mkdir(logDir, { recursive: true });
    logDirEnsured = true;
  } catch (err) {
    console.error('Failed to create log directory:', err);
  }
}

/**
 * Appends a log entry to the access log file asynchronously.
 * @param {string} entry
 */
export async function appendAccessLog(entry) {
  try {
    await ensureLogDir();
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${entry}\n`;
    await fs.appendFile(accessLogPath, line, 'utf-8');
  } catch (err) {
    debugHttp('Failed to write to access log: %s', util.inspect(err));
  }
}
