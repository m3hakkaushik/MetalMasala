// [L21] MongoDB CRUD Operations Playbook
// Metal masala (मेटल मसाला) — Handcrafted Indian Jewellery
// Run interactively in mongosh or VS Code MongoDB extension:
// mongosh "mongodb://127.0.0.1:27017/metal_masala" queries/01-crud.mongodb.js

use('metal_masala');

print('--- [L21] 1. CREATE: insertOne & insertMany ---');

// Insert single category
db.categories.insertOne({
  name: 'Anklets & Payals',
  nameHi: 'पायल',
  slug: 'payals',
  description: 'Ghungroo melodies and sterling ghungroo crafts for your feet.',
  image: '/categories/payals.jpg',
  sortOrder: 5,
  productCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
});

// Insert multiple jewellery products
db.products.insertMany([
  {
    name: 'Jaipur Meenakari Jhumka',
    slug: 'jaipur-meenakari-jhumka',
    tagline: 'Hand-enamelled floral elegance with royal green pearls.',
    description: 'Intricately painted Meenakari craft on pure brass with bell drops.',
    price: 1299,
    compareAtPrice: 1599,
    currency: 'INR',
    category: db.categories.findOne({ slug: 'payals' })?._id || new ObjectId(),
    tags: ['festive', 'wedding-guest'],
    material: 'brass',
    finish: 'antique-gold',
    images: [{ url: '/products/jaipur-meenakari-1.jpg', alt: 'Jaipur Meenakari Jhumka front' }],
    stock: 20,
    sku: 'MM-JHM-021',
    isFeatured: true,
    isNewDrop: true,
    ratingAverage: 4.8,
    ratingCount: 15,
    soldCount: 45,
    craft: { artisan: 'Studio Rangrez', region: 'Jaipur, Rajasthan', technique: 'Meenakari on brass' },
    details: { weightGrams: 22, lengthMm: 60, care: 'Keep dry. Avoid perfume.' },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Hampi Temple Choker',
    slug: 'hampi-temple-choker',
    tagline: 'Sculpted Dravidian motifs in hand-buffed oxidized silver.',
    description: 'Choker necklace adorned with Lakshmi coin pendants.',
    price: 1899,
    compareAtPrice: 2299,
    currency: 'INR',
    category: db.categories.findOne({ slug: 'payals' })?._id || new ObjectId(),
    tags: ['festive', 'statement'],
    material: 'german-silver',
    finish: 'oxidized-silver',
    images: [{ url: '/products/hampi-choker-1.jpg', alt: 'Hampi Temple Choker' }],
    stock: 8,
    sku: 'MM-CHK-011',
    isFeatured: true,
    isNewDrop: false,
    ratingAverage: 4.9,
    ratingCount: 28,
    soldCount: 80,
    craft: { artisan: 'Kala Kendra', region: 'Hampi, Karnataka', technique: 'Coin stamping & oxidation' },
    details: { weightGrams: 45, lengthMm: 180, care: 'Wipe with soft cotton.' },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]);

print('--- [L21] 2. READ: find with projection ---');

// Find products in stock with specific fields
db.products.find(
  { stock: { $gt: 0 }, finish: 'oxidized-silver' },
  { name: 1, slug: 1, price: 1, stock: 1, ratingAverage: 1 }
).limit(5);

print('--- [L21] 3. UPDATE: updateOne with $set & $inc ---');

// Update product price and timestamp
db.products.updateOne(
  { slug: 'jaipur-meenakari-jhumka' },
  {
    $set: { price: 1199, updatedAt: new Date() },
  }
);

// Atomic stock decrement and sold count increment (Commerce order placement)
db.products.updateOne(
  { slug: 'jaipur-meenakari-jhumka', stock: { $gte: 2 } },
  {
    $inc: { stock: -2, soldCount: 2 },
    $set: { updatedAt: new Date() },
  }
);

print('--- [L21] 4. ARRAY UPDATES: $push & $pull ---');

// Add address to user with $push
db.users.updateOne(
  { email: 'aarav@example.com' },
  {
    $push: {
      addresses: {
        label: 'Work',
        fullName: 'Aarav Mehta',
        phone: '9876543210',
        line1: 'Tower B, Cyber City',
        city: 'Gurugram',
        state: 'Haryana',
        pincode: '122002',
        isDefault: false,
      },
    },
  }
);

// Append order status history
db.orders.updateOne(
  { orderNumber: /^MM-2026/ },
  {
    $set: { status: 'confirmed' },
    $push: {
      statusHistory: {
        status: 'confirmed',
        at: new Date(),
        note: 'Order confirmed by manager',
      },
    },
  }
);

// Remove address from user with $pull
db.users.updateOne(
  { email: 'aarav@example.com' },
  {
    $pull: {
      addresses: { label: 'Work' },
    },
  }
);

print('--- [L21] 5. ATOMIC findOneAndUpdate ---');

// Increment cart item quantity or return old state
db.carts.findOneAndUpdate(
  { user: ObjectId('65f0c0ffee0000000000a001'), 'items.product': ObjectId('65f0c0ffee0000000000b001') },
  { $inc: { 'items.$.qty': 1 }, $set: { updatedAt: new Date() } },
  { returnDocument: 'after' }
);

print('--- [L21] 6. bulkWrite: batch operations ---');

// Batch operations for catalogue inventory sync
db.products.bulkWrite([
  {
    updateOne: {
      filter: { sku: 'MM-JHM-021' },
      update: { $set: { isFeatured: true } },
    },
  },
  {
    updateOne: {
      filter: { sku: 'MM-CHK-011' },
      update: { $inc: { stock: 5 } },
    },
  },
]);

print('--- [L21] 7. DELETE: deleteOne & deleteMany ---');

// Delete a cancelled test order
db.orders.deleteOne({ orderNumber: 'MM-TEST-0000' });

// Clear temporary test cart items
db.carts.deleteMany({ user: ObjectId('65f0c0ffee0000000000a999') });

print('✅ [L21] CRUD playbook executed successfully.');
