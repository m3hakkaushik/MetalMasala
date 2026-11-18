#!/usr/bin/env node

/**
 * // [L5] Core Node.js Modules: stream.pipeline, zlib, readline, fs
 * Exports products from store/seed to CSV and compresses it using gzip.
 */

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import zlib from 'node:zlib';
import readline from 'node:readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_PATH = path.resolve(__dirname, '../data/store/products.json');
const SEED_PATH = path.resolve(__dirname, '../data/seed/products.json');
const EXPORT_DIR = path.resolve(__dirname, '../data/export');

/**
 * Escapes a field for CSV format.
 * @param {any} val
 * @returns {string}
 */
export function escapeCsv(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts a list of product objects into a CSV string.
 * @param {Array<object>} products
 * @returns {string}
 */
export function productsToCsv(products) {
  const headers = [
    'id',
    'name',
    'slug',
    'price',
    'compareAtPrice',
    'category',
    'stock',
    'inStock',
    'material',
    'finish',
    'ratingAverage',
    'ratingCount',
    'soldCount',
    'sku',
    'createdAt',
  ];

  const lines = [headers.join(',')];

  for (const p of products) {
    const row = [
      escapeCsv(p.id),
      escapeCsv(p.name),
      escapeCsv(p.slug),
      escapeCsv(p.price),
      escapeCsv(p.compareAtPrice ?? ''),
      escapeCsv(p.category?.name || p.category?.slug || p.category || ''),
      escapeCsv(p.stock ?? 0),
      escapeCsv(p.inStock ?? (p.stock > 0)),
      escapeCsv(p.material || ''),
      escapeCsv(p.finish || ''),
      escapeCsv(p.ratingAverage ?? 0),
      escapeCsv(p.ratingCount ?? 0),
      escapeCsv(p.soldCount ?? 0),
      escapeCsv(p.sku || ''),
      escapeCsv(p.createdAt || ''),
    ];
    lines.push(row.join(','));
  }

  return lines.join('\n');
}

/**
 * Loads products from store or seed.
 * @returns {Promise<Array<object>>}
 */
export async function loadProducts() {
  let filePath = STORE_PATH;
  try {
    await fsp.access(STORE_PATH);
  } catch {
    filePath = SEED_PATH;
  }
  const raw = await fsp.readFile(filePath, 'utf-8');
  return JSON.parse(raw);
}

/**
 * Main export function: transforms products -> CSV -> gzip using streams and pipeline.
 */
export async function runExport() {
  await fsp.mkdir(EXPORT_DIR, { recursive: true });
  process.stdout.write('📊 Reading products for CSV export...\n');

  const products = await loadProducts();
  const csvData = productsToCsv(products);

  const rawCsvPath = path.join(EXPORT_DIR, 'products.csv');
  const gzipCsvPath = path.join(EXPORT_DIR, 'products.csv.gz');

  // 1. Write plain CSV
  await fsp.writeFile(rawCsvPath, csvData, 'utf-8');
  process.stdout.write(`  ✔ Wrote ${rawCsvPath} (${products.length} products)\n`);

  // 2. Stream plain CSV -> zlib.createGzip() -> products.csv.gz via stream pipeline
  process.stdout.write('🗜️  Compressing CSV to .gz with stream.pipeline and zlib...\n');
  const sourceStream = Readable.from([csvData]);
  const gzipStream = zlib.createGzip();
  const destinationStream = fs.createWriteStream(gzipCsvPath);

  await pipeline(sourceStream, gzipStream, destinationStream);
  process.stdout.write(`  ✔ Created gzip archive: ${gzipCsvPath}\n`);

  // [L5] Demonstration of readline on the generated CSV file
  const fileStream = fs.createReadStream(rawCsvPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let lineCount = 0;
  for await (const line of rl) {
    if (line) lineCount++;
  }
  process.stdout.write(`  ✔ Readline verified: ${lineCount} lines in exported CSV\n`);
  process.stdout.write('✨ Product export completed successfully!\n');
}

// Execute directly if run as a CLI script
if (process.argv[1] && process.argv[1].endsWith('export-products.js')) {
  runExport().catch((err) => {
    process.stderr.write(`❌ Export failed: ${err.message}\n`);
    process.exit(1);
  });
}
