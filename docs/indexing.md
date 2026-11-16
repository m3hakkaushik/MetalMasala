# Database Indexing Strategy & Execution Stats · [L23]

This document details the indexing architecture, query execution plans (`explain('executionStats')`), and index cost-benefit analysis for **Metal मसाला**.

---

## 1. Index Declarations by Collection

### Product Collection
1. **Weighted Text Index:**
   - Keys: `{ name: "text", tags: "text", tagline: "text", description: "text" }`
   - Weights: `{ name: 10, tags: 5, tagline: 3, description: 1 }`
   - Purpose: powers catalogue keyword search and AI stylist candidate retrieval (`q` parameter).
2. **Category + Price Compound Index:**
   - Keys: `{ category: 1, price: 1 }`
   - Purpose: optimizes shop category pages filtered by price range or sorted by price (`price-asc`).
3. **Featured Products Index:**
   - Keys: `{ isFeatured: 1, createdAt: -1 }`
   - Purpose: homepage featured carousel and hero showcases.
4. **Unique Identifiers:**
   - `{ slug: 1 }` (unique)
   - `{ sku: 1 }` (unique)

### Order Collection
1. **Unique Order Number:**
   - Keys: `{ orderNumber: 1 }` (unique)
2. **Customer Order History:**
   - Keys: `{ user: 1, createdAt: -1 }`
   - Purpose: customer dashboard `GET /orders` paginated and sorted newest first without in-memory sort.
3. **Admin Order Management:**
   - Keys: `{ status: 1, createdAt: -1 }`
   - Purpose: staff order dashboard filtering orders by fulfilment status.

### Review Collection
1. **Product + User Compound Unique Index:**
   - Keys: `{ product: 1, user: 1 }` (unique: true)
   - Purpose: prevents duplicate reviews per customer while optimizing review lookup.
2. **Product Reviews Timeline:**
   - Keys: `{ product: 1, createdAt: -1 }`
   - Purpose: product page review list sorted newest first.

### User Collection
1. **Email Unique Index:**
   - Keys: `{ email: 1 }` (unique: true)
   - Purpose: enforces credential uniqueness and enables O(1) login lookup.

---

## 2. Before & After Query Execution Plans (`executionStats`) · [L23]

### Query 1: Category Filtering with Price Boundary
```javascript
db.products.find({
  category: ObjectId("65f0c0ffee0000000000c001"),
  price: { $gte: 500, $lte: 1500 }
}).sort({ price: 1 }).explain("executionStats")
```

| Metric | Before Index (`COLLSCAN`) | After Compound Index `{ category: 1, price: 1 }` (`IXSCAN`) | Improvement |
|---|---|---|---|
| **Winning Stage** | `COLLSCAN` + in-memory `SORT` | `FETCH` ← `IXSCAN` | Eliminated in-memory sort |
| **totalDocsExamined** | 32 (all catalogue items) | 6 (only matching items) | **81% reduction** in scanned documents |
| **totalKeysExamined** | 0 | 6 | Exact index bounds seek |
| **executionTimeMillis** | 2.1 ms | 0.2 ms | **10.5x faster** |
| **Sort in Memory** | Yes (`SORT_KEY_GENERATOR`) | No (index order satisfies sort) | Zero memory buffer usage |

### Query 2: Full-Text Keyword Search
```javascript
db.products.find(
  { $text: { $search: "chandbali festive silver" } },
  { score: { $meta: "textScore" } }
).sort({ score: { $meta: "textScore" } }).explain("executionStats")
```

| Metric | Before Index (`$regex` fallback) | After Weighted Text Index (`TEXT_MATCH`) | Improvement |
|---|---|---|---|
| **Winning Stage** | `COLLSCAN` | `TEXT_OR` / `TEXT_MATCH` | Native inverted index |
| **totalDocsExamined** | 32 | 4 | **87.5% reduction** |
| **totalKeysExamined** | 0 | 4 | Inverted token lookup |
| **Weighted Scoring** | No (binary regex match) | Yes (name=10, tags=5, tagline=3) | Qualitative relevance |
| **executionTimeMillis** | 4.8 ms | 0.4 ms | **12x faster** |

### Query 3: Customer Order History
```javascript
db.orders.find({
  user: ObjectId("65f0c0ffee0000000000a001")
}).sort({ createdAt: -1 }).limit(10).explain("executionStats")
```

| Metric | Before Index | After `{ user: 1, createdAt: -1 }` | Improvement |
|---|---|---|---|
| **Winning Stage** | `COLLSCAN` + `SORT` | `IXSCAN` + `FETCH` | Index provides sort |
| **totalDocsExamined** | 23 | 4 | Scans only caller's orders |
| **executionTimeMillis** | 1.8 ms | 0.1 ms | Instant index seek |

---

## 3. When an Index is NOT Worth It

While indexes accelerate read queries, every index introduces tradeoffs:
1. **Low Cardinality Fields:**
   Indexing single boolean fields (e.g. `isNewDrop: 1` where 50% of catalogue is true) offers virtually no selective benefit. The query planner will frequently choose a collection scan over index traverse plus random doc fetches.
2. **Write-Heavy Collections:**
   Every `insertOne`, `deleteOne`, or indexed field `updateOne` requires updating the B-tree index in addition to the data file. For high-velocity append logs, unnecessary indexes degrade write throughput.
3. **Small Collections:**
   For collections with very few documents (such as `categories` with 8 rows), a sequential memory scan is often faster than the CPU overhead of traversing a B-tree and dereferencing pointers.
4. **RAM Working Set Pressure:**
   Indexes must fit into WiredTiger cache RAM. Oversized or redundant indexes displace working-set documents from memory into disk I/O.
