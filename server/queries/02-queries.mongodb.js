// [L22] Query Operations in MongoDB Playbook
// Metal masala (मेटल मसाला) — Handcrafted Indian Jewellery
// Demonstrates every filter parameter implemented in repositories/mongo/product.repo.js
// mongosh "mongodb://127.0.0.1:27017/metal_masala" queries/02-queries.mongodb.js

use('metal_masala');

print('--- [L22] 1. Comparison Operators: $gte, $lte, $ne ---');
// Scenario: "Jhumkas under ₹1000 in oxidized-silver, cheapest first"
db.products.find({
  price: { $gte: 299, $lte: 1000 },
  finish: 'oxidized-silver',
  stock: { $gt: 0 },
})
  .sort({ price: 1 })
  .projection({ name: 1, price: 1, finish: 1, stock: 1 });

print('--- [L22] 2. Logical Operators: $and, $or, $nor ---');
// Scenario: "Products tagged festive OR wedding-guest, but NOT alloy material"
db.products.find({
  $and: [
    { $or: [{ tags: 'festive' }, { tags: 'wedding-guest' }] },
    { material: { $ne: 'alloy' } },
  ],
})
  .projection({ name: 1, tags: 1, material: 1, price: 1 });

// Scenario: "Neither cheap (<500) nor out of stock" using $nor
db.products.find({
  $nor: [
    { price: { $lt: 500 } },
    { stock: { $lte: 0 } },
  ],
})
  .projection({ name: 1, price: 1, stock: 1 })
  .limit(5);

print('--- [L22] 3. Array & Element Operators: $in, $all, $elemMatch ---');
// Scenario: "Any of oxidized-silver or patina-green finishes ($in)"
db.products.find({
  finish: { $in: ['oxidized-silver', 'patina-green'] },
})
  .projection({ name: 1, finish: 1 })
  .limit(5);

// Scenario: "Products that have BOTH 'festive' AND 'statement' tags ($all)"
db.products.find({
  tags: { $all: ['festive', 'statement'] },
})
  .projection({ name: 1, tags: 1 });

// Scenario: "Orders containing an item with qty >= 2 and lineTotal >= 1500 ($elemMatch)"
db.orders.find({
  items: {
    $elemMatch: { qty: { $gte: 2 }, lineTotal: { $gte: 1500 } },
  },
})
  .projection({ orderNumber: 1, 'items.$': 1, 'pricing.total': 1 });

print('--- [L22] 4. Regular Expressions: $regex ---');
// Scenario: "Case-insensitive substring search for artisan name in craft details"
db.products.find({
  'craft.artisan': { $regex: 'rangrez', $options: 'i' },
})
  .projection({ name: 1, 'craft.artisan': 1 });

print('--- [L22] 5. Full-Text Search: $text & textScore ---');
// Scenario: "Search 'silver floral jhumka' sorted by relevance textScore"
// (Requires text index on name, tagline, description, tags)
db.products.find(
  { $text: { $search: 'silver floral jhumka' } },
  { score: { $meta: 'textScore' }, name: 1, tagline: 1, price: 1 }
)
  .sort({ score: { $meta: 'textScore' } })
  .limit(5);

print('--- [L22] 6. Pagination & Sorting: skip, limit, sort ---');
// Scenario: "Page 2 of products (12 per page) sorted by newest first"
const page = 2;
const limit = 12;
db.products.find({})
  .sort({ createdAt: -1 })
  .skip((page - 1) * limit)
  .limit(limit)
  .projection({ name: 1, slug: 1, price: 1, createdAt: 1 });

print('--- [L22] 7. Aggregation Helpers: countDocuments & distinct ---');
// Scenario: "Count featured products in stock"
const count = db.products.countDocuments({ isFeatured: true, stock: { $gt: 0 } });
print('Featured products in stock count:', count);

// Scenario: "Distinct materials and finishes available across the catalogue"
const materials = db.products.distinct('material');
const finishes = db.products.distinct('finish');
print('Available materials:', materials);
print('Available finishes:', finishes);

print('✅ [L22] Query operations playbook executed successfully.');
