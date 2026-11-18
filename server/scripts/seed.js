#!/usr/bin/env node

/**
 * // [L5] Core Node.js Modules: fs/promises, path, url
 * // [L6] Process Object & CLI: Manual parsing of process.argv, stdout streaming, exit codes
 *
 * Seed CLI for Metal Masala
 * Usage:
 *   node scripts/seed.js --import
 *   node scripts/seed.js --destroy
 *   node scripts/seed.js --file <path>
 *   node scripts/seed.js --help
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { SEED_DIR, STORE_DIR } from '../src/utils/jsonStore.js';

function printUsage() {
  process.stdout.write(`
Metal मसाला — Database Seeder CLI [L6]

Usage:
  node scripts/seed.js [options]
  npm run seed -- [options]

Options:
  --import         Copy all seed datasets into data/store/*.json
  --destroy        Wipe all runtime store files in data/store/
  --file <path>    Import a specific JSON file into data/store/
  --help, -h       Show this help message

Exit codes:
  0: Success
  1: Invalid arguments / bad usage
  2: Operational failure / error
\n`);
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function runImport() {
  await ensureDir(STORE_DIR);
  process.stdout.write('📦 Starting seed import...\n');

  const files = await fs.readdir(SEED_DIR);
  const jsonFiles = files.filter((f) => f.endsWith('.json'));

  if (jsonFiles.length === 0) {
    process.stdout.write('⚠️  No seed files found in ' + SEED_DIR + '\n');
    process.exit(2);
  }

  for (const file of jsonFiles) {
    const src = path.join(SEED_DIR, file);
    const dest = path.join(STORE_DIR, file);

    const content = await fs.readFile(src, 'utf-8');
    // Validate JSON parsing
    const parsed = JSON.parse(content);
    const count = Array.isArray(parsed) ? parsed.length : 1;

    await fs.writeFile(dest, JSON.stringify(parsed, null, 2), 'utf-8');
    process.stdout.write(`  ✔ Imported ${file} (${count} records)\n`);
  }

  process.stdout.write('✨ Seed data successfully imported into runtime store!\n');
  process.exit(0);
}

async function runDestroy() {
  process.stdout.write('🧹 Destroying runtime store...\n');
  try {
    const files = await fs.readdir(STORE_DIR);
    for (const file of files) {
      if (file.endsWith('.json') || file.includes('.tmp.')) {
        await fs.unlink(path.join(STORE_DIR, file));
        process.stdout.write(`  ✖ Removed ${file}\n`);
      }
    }
    process.stdout.write('✨ Runtime store destroyed successfully.\n');
    process.exit(0);
  } catch (err) {
    if (err.code === 'ENOENT') {
      process.stdout.write('✨ Store directory does not exist. Nothing to destroy.\n');
      process.exit(0);
    }
    process.stderr.write(`❌ Failed to destroy store: ${err.message}\n`);
    process.exit(2);
  }
}

async function runImportFile(filePath) {
  if (!filePath) {
    process.stderr.write('❌ Error: Missing file path for --file\n');
    printUsage();
    process.exit(1);
  }

  await ensureDir(STORE_DIR);
  const resolvedPath = path.resolve(process.cwd(), filePath);
  const filename = path.basename(resolvedPath);

  try {
    process.stdout.write(`📦 Importing single file: ${resolvedPath}...\n`);
    const content = await fs.readFile(resolvedPath, 'utf-8');
    const parsed = JSON.parse(content);
    const count = Array.isArray(parsed) ? parsed.length : 1;

    const dest = path.join(STORE_DIR, filename);
    await fs.writeFile(dest, JSON.stringify(parsed, null, 2), 'utf-8');
    process.stdout.write(`  ✔ Successfully imported ${filename} (${count} records)\n`);
    process.exit(0);
  } catch (err) {
    process.stderr.write(`❌ Failed to import ${resolvedPath}: ${err.message}\n`);
    process.exit(2);
  }
}

async function main() {
  // [L6] Parsing process.argv manually without third-party dependencies
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(args.length === 0 ? 1 : 0);
  }

  if (args.includes('--import')) {
    await runImport();
  } else if (args.includes('--destroy')) {
    await runDestroy();
  } else if (args.includes('--file')) {
    const fileIndex = args.indexOf('--file');
    const targetFile = args[fileIndex + 1];
    await runImportFile(targetFile);
  } else {
    process.stderr.write(`❌ Unknown option(s): ${args.join(' ')}\n`);
    printUsage();
    process.exit(1);
  }
}

main().catch((err) => {
  process.stderr.write(`💥 Fatal error: ${err.stack || err.message}\n`);
  process.exit(2);
});
