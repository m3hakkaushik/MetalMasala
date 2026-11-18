#!/usr/bin/env node

/**
 * // [L6] Process Object & CLI: Manual parsing of process.argv, stdout streaming, exit codes
 * // [L21] MongoDB CRUD Operations: Seeding categories, products, reviews, users, and orders
 * // [L28] Building REST APIs with Database Integration: Data Seeding Pipeline
 *
 * Seed CLI for Metal Masala
 * Usage:
 *   node scripts/seed.js --import
 *   node scripts/seed.js --destroy
 *   node scripts/seed.js --fresh
 *   node scripts/seed.js --file <path>
 *   node scripts/seed.js --help
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import config from '../src/config/index.js';
import { DEV_USER_IDS } from '../src/config/constants.js';
import { Category } from '../src/models/Category.js';
import { Product } from '../src/models/Product.js';
import { Review } from '../src/models/Review.js';
import { User } from '../src/models/User.js';
import { Order } from '../src/models/Order.js';
import { SEED_DIR, STORE_DIR } from '../src/utils/jsonStore.js';

function printUsage() {
  process.stdout.write(`
Metal मसाला — Database Seeder CLI [L6, L21, L28]

Usage:
  node scripts/seed.js [options]
  npm run seed -- [options]

Options:
  --import         Seed MongoDB collections and data store
  --destroy        Wipe all database collections and store files
  --fresh          Destroy existing collections and re-import in one operation
  --file <path>    Import a specific JSON file
  --help, -h       Show this help message

Exit codes:
  0: Success
  1: Invalid arguments / bad usage
  2: Operational failure / error
\n`);
}

async function connectMongoose() {
  const { uri, name } = config.db;
  process.stdout.write(`🔌 Connecting to MongoDB (${config.db.target}: ${name})...\n`);
  await mongoose.connect(uri, {
    dbName: name,
    serverSelectionTimeoutMS: 5000,
  });
}

async function runDestroy() {
  process.stdout.write('🧹 Destroying database collections and runtime store...\n');
  try {
    await connectMongoose();
    const collections = await mongoose.connection.db.listCollections().toArray();
    for (const coll of collections) {
      await mongoose.connection.db.dropCollection(coll.name);
      process.stdout.write(`  ✖ Dropped collection: ${coll.name}\n`);
    }

    // Also clear runtime JSON store if present
    try {
      const files = await fs.readdir(STORE_DIR);
      for (const file of files) {
        if (file.endsWith('.json') || file.includes('.tmp.')) {
          await fs.unlink(path.join(STORE_DIR, file));
        }
      }
    } catch {
      // Ignore if store dir not found
    }

    process.stdout.write('✨ Database and store successfully destroyed.\n');
  } catch (err) {
    process.stderr.write(`❌ Error during destroy: ${err.message}\n`);
    process.exitCode = 2;
  } finally {
    await mongoose.disconnect();
  }
}

async function runImport() {
  process.stdout.write('📦 Starting seed import into MongoDB...\n');
  try {
    await connectMongoose();

    // 1. Categories
    const categoriesRaw = JSON.parse(
      await fs.readFile(path.join(SEED_DIR, 'categories.json'), 'utf-8')
    );
    const categoryMap = new Map(); // slug -> ObjectId

    for (const cat of categoriesRaw) {
      const existing = await Category.findOne({ slug: cat.slug });
      if (existing) {
        categoryMap.set(cat.slug, existing._id);
      } else {
        const created = await Category.create({
          name: cat.name,
          nameHi: cat.nameHi || '',
          slug: cat.slug,
          description: cat.description || '',
          image: cat.image || '',
          sortOrder: cat.sortOrder || 0,
        });
        categoryMap.set(cat.slug, created._id);
      }
    }
    process.stdout.write(`  ✔ Categories seeded (${categoryMap.size} categories)\n`);

    // 2. Products
    const productsRaw = JSON.parse(
      await fs.readFile(path.join(SEED_DIR, 'products.json'), 'utf-8')
    );
    const productMap = new Map(); // seed id/slug -> ObjectId

    for (const prod of productsRaw) {
      let catId = null;
      if (prod.category) {
        const catSlug = typeof prod.category === 'object' ? prod.category.slug : prod.category;
        catId = categoryMap.get(catSlug) || categoryMap.get('jhumkas');
      }

      const existing = await Product.findOne({ slug: prod.slug });
      if (existing) {
        productMap.set(prod.id || prod.slug, existing._id);
        productMap.set(prod.slug, existing._id);
      } else {
        const created = await Product.create({
          name: prod.name,
          slug: prod.slug,
          tagline: prod.tagline || '',
          description: prod.description || '',
          price: prod.price,
          compareAtPrice: prod.compareAtPrice,
          currency: prod.currency || 'INR',
          category: catId,
          tags: prod.tags || [],
          material: prod.material,
          finish: prod.finish,
          images: prod.images || [],
          stock: prod.stock ?? 10,
          sku: prod.sku || `MM-${prod.slug.toUpperCase().slice(0, 8)}`,
          isFeatured: !!prod.isFeatured,
          isNewDrop: !!prod.isNewDrop,
          ratingAverage: prod.ratingAverage || 0,
          ratingCount: prod.ratingCount || 0,
          soldCount: prod.soldCount || 0,
          craft: prod.craft || {},
          details: prod.details || {},
        });
        productMap.set(prod.id || prod.slug, created._id);
        productMap.set(prod.slug, created._id);
      }
    }
    process.stdout.write(`  ✔ Products seeded (${productsRaw.length} products)\n`);

    // 3. Dev Users (fixed IDs, placeholder password for B4)
    const usersRaw = JSON.parse(
      await fs.readFile(path.join(SEED_DIR, 'users.json'), 'utf-8')
    );
    const userMap = new Map();

    for (const u of usersRaw) {
      const fixedId = DEV_USER_IDS[u.role] || u.id;
      const existing = await User.findById(fixedId);
      if (existing) {
        userMap.set(u.id || u.email, existing._id);
      } else {
        const created = await User.create({
          _id: new mongoose.Types.ObjectId(fixedId),
          name: u.name,
          email: u.email,
          password: '__unset_until_B4__',
          role: u.role || 'customer',
          phone: u.phone || '9876543210',
          addresses: u.addresses || [],
          wishlist: [],
          isActive: true,
        });
        userMap.set(u.id || u.email, created._id);
      }
    }
    process.stdout.write(`  ✔ Dev users seeded with fixed IDs\n`);

    // 4. Reviews
    const reviewsRaw = JSON.parse(
      await fs.readFile(path.join(SEED_DIR, 'reviews.json'), 'utf-8')
    );
    let reviewCount = 0;

    for (const rev of reviewsRaw) {
      const prodObjectId = productMap.get(rev.product);
      const userObjectId = userMap.get(rev.user) || DEV_USER_IDS.customer;

      if (prodObjectId) {
        const existing = await Review.findOne({ product: prodObjectId, user: userObjectId });
        if (!existing) {
          await Review.create({
            product: prodObjectId,
            user: userObjectId,
            rating: rev.rating || 5,
            title: rev.title || 'Beautiful Piece',
            body: rev.body || 'Loved the craftsmanship and shine.',
            isVerifiedPurchase: !!rev.isVerifiedPurchase,
          });
          reviewCount++;
        }
      }
    }
    process.stdout.write(`  ✔ Reviews seeded (${reviewCount} reviews imported)\n`);

    // 5. Orders (Sample orders for analytics)
    const ordersRaw = JSON.parse(
      await fs.readFile(path.join(SEED_DIR, 'orders.json'), 'utf-8')
    );
    let orderCount = 0;

    for (const ord of ordersRaw) {
      const existing = await Order.findOne({ orderNumber: ord.orderNumber });
      if (!existing) {
        const resolvedItems = (ord.items || []).map((item) => ({
          ...item,
          product: productMap.get(item.product) || new mongoose.Types.ObjectId(),
        }));

        await Order.create({
          orderNumber: ord.orderNumber,
          user: userMap.get(ord.user) || DEV_USER_IDS.customer,
          items: resolvedItems,
          shippingAddress: ord.shippingAddress,
          pricing: ord.pricing,
          payment: ord.payment,
          status: ord.status || 'placed',
          statusHistory: ord.statusHistory || [{ status: 'placed', at: new Date() }],
          createdAt: ord.createdAt ? new Date(ord.createdAt) : new Date(),
        });
        orderCount++;
      }
    }
    process.stdout.write(`  ✔ Orders seeded (${orderCount} orders imported for analytics)\n`);

    // Also populate JSON store directory for dual-mode fallback
    try {
      await fs.mkdir(STORE_DIR, { recursive: true });
      for (const file of ['categories.json', 'products.json', 'users.json', 'reviews.json', 'orders.json']) {
        const content = await fs.readFile(path.join(SEED_DIR, file), 'utf-8');
        await fs.writeFile(path.join(STORE_DIR, file), content, 'utf-8');
      }
    } catch {
      // Ignore if cannot copy to store dir
    }

    process.stdout.write('✨ Database successfully seeded with Metal मसाला data!\n');
  } catch (err) {
    process.stderr.write(`❌ Error during import: ${err.message}\n`);
    process.exitCode = 2;
  } finally {
    await mongoose.disconnect();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h') || args.length === 0) {
  printUsage();
  process.exit(0);
}

if (args.includes('--fresh')) {
  await runDestroy();
  await runImport();
  process.exit(0);
}

if (args.includes('--destroy')) {
  await runDestroy();
  process.exit(0);
}

if (args.includes('--import')) {
  await runImport();
  process.exit(0);
}

printUsage();
process.exit(1);
