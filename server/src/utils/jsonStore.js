import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { debugData } from './logger.js';

// [L5] Core Node.js Modules:
// - `path` and `url` to construct absolute paths
// - `fs/promises` for atomic writes (write temp file + rename)
// - `crypto` for unique temp file naming

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const STORE_DIR = path.resolve(__dirname, '../../data/store');
export const SEED_DIR = path.resolve(__dirname, '../../data/seed');

let storeDirEnsured = false;
async function ensureStoreDir() {
  if (storeDirEnsured) return;
  await fs.mkdir(STORE_DIR, { recursive: true });
  storeDirEnsured = true;
}

// Simple mutex queue per file to prevent write-race conditions
const writeLocks = new Map();

/**
 * Reads a JSON file from the store. If missing, attempts to initialize from seed.
 * @param {string} filename - e.g. 'products.json'
 * @param {any} [defaultData=[]]
 * @returns {Promise<any>}
 */
export async function readStore(filename, defaultData = []) {
  await ensureStoreDir();
  const storePath = path.join(STORE_DIR, filename);

  try {
    const raw = await fs.readFile(storePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      // Check if seed file exists to auto-populate
      const seedPath = path.join(SEED_DIR, filename);
      try {
        const seedRaw = await fs.readFile(seedPath, 'utf-8');
        const seedData = JSON.parse(seedRaw);
        await writeStore(filename, seedData);
        debugData('Initialized store from seed for %s', filename);
        return seedData;
      } catch {
        debugData('Seed not found for %s, using default', filename);
        await writeStore(filename, defaultData);
        return defaultData;
      }
    }
    throw err;
  }
}

/**
 * Writes data to a JSON store file atomically.
 * Writes to a temporary file first, then renames it over the target file.
 * @param {string} filename - e.g. 'products.json'
 * @param {any} data
 */
export async function writeStore(filename, data) {
  await ensureStoreDir();
  const storePath = path.join(STORE_DIR, filename);
  const tempPath = path.join(
    STORE_DIR,
    `${filename}.tmp.${Date.now()}.${crypto.randomUUID().slice(0, 8)}`
  );

  const prevLock = writeLocks.get(filename) || Promise.resolve();

  const writeOperation = async () => {
    const serialized = JSON.stringify(data, null, 2);
    // Write to temp file first
    await fs.writeFile(tempPath, serialized, 'utf-8');
    // Atomic rename replaces the destination file completely
    await fs.rename(tempPath, storePath);
    debugData('Atomic write completed for %s (%d bytes)', filename, serialized.length);
  };

  const nextLock = prevLock.then(writeOperation, writeOperation);
  writeLocks.set(filename, nextLock);

  return nextLock;
}
