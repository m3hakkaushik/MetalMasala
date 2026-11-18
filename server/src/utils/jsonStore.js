import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import config from '../config/index.js';
import { debugData } from './logger.js';
import { createSerialQueue } from './serialQueue.js';

// [L5] Store files are written to a temporary path and replaced with an atomic rename.
export const STORE_DIR = config.server.storeDir;
export const SEED_DIR = path.resolve(import.meta.dirname, '../../data/seed');
const serialize = createSerialQueue();

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf-8'));
}

async function replaceStore(filename, data) {
  await fs.mkdir(STORE_DIR, { recursive: true });
  const target = path.join(STORE_DIR, filename);
  const temporary = `${target}.tmp.${randomUUID()}`;
  try {
    const json = JSON.stringify(data, null, 2);
    await fs.writeFile(temporary, json, 'utf-8');
    await fs.rename(temporary, target);
    debugData(
      'Atomic write completed for %s (%d bytes)',
      filename,
      Buffer.byteLength(json)
    );
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

async function readOrSeed(filename, defaultData) {
  try {
    return await readJson(path.join(STORE_DIR, filename));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  let data;
  try {
    data = await readJson(path.join(SEED_DIR, filename));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    data = defaultData;
  }
  await replaceStore(filename, data);
  return data;
}

export async function readStore(filename, defaultData = []) {
  try {
    return await readJson(path.join(STORE_DIR, filename));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    // A concurrent first reader may have already installed the seed by the time this acquires the queue.
    return serialize(filename, () => readOrSeed(filename, defaultData));
  }
}

export function writeStore(filename, data) {
  return serialize(filename, () => replaceStore(filename, data));
}

// [L14] Write APIs keep read-modify-write in the same queue so simultaneous signups cannot overwrite one another.
export function updateStore(filename, mutate) {
  return serialize(filename, async () => {
    const records = await readOrSeed(filename, []);
    const { result, changed = true } = mutate(records);
    if (changed) await replaceStore(filename, records);
    return result;
  });
}
