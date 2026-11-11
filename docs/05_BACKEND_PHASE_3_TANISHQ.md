# Backend Phase 3 (B3) — Database Layer, Commerce Flow & AI

> **Owner:** Tanishq · **Branch:** `backend/phase-3-data-ai` · **Lectures:** L21 – L28, L42 – L44 (11)
> **Starts after:** B2 merged to `main` · **Hands off to:** Aakash (B4)
> Read `00_PROJECT_OVERVIEW.md` and `01_API_CONTRACT.md` first. Use the kickoff prompt in the overview.

**Mission:** replace the JSON stores with **MongoDB + Mongoose**, design the data model, and build the real commerce backend — reviews, server-side cart, orders with atomic stock handling, admin orders, analytics via aggregation — plus the **AI Stylist** and the team's AI-workflow documentation.

This is the heaviest phase in code volume. Follow the build order; it differs from lecture numbering where dependencies demand it.

---

## 1. What exists before you

From B1–B2: layered Express app (routes → controllers → services → repositories/json), central error handling, validated config, middleware (including `protect`/`restrictTo` **stubs** and rate-limit presets), `pricing.service`, Newsletter/Contact/Pricing, `db:ping`, Atlas + local Mongo documented and working, constants including `DEV_USER_IDS`.

## 2. What you must deliver (summary)

- `queries/*.mongodb.js` playbooks, `docs/data-model.md`, `docs/indexing.md`.
- Mongoose models: **Category, Product, Review, Cart, Order, User (schema only), Subscriber, ContactMessage**.
- `config/db.js` connection; `DATA_STORE` default flips to `mongo`; JSON repos retired.
- New/real endpoints: reviews, cart, orders, admin orders, analytics, facets, related products, AI stylist, AI describe.
- Seed script writes to MongoDB, including the 3 dev users.
- `docs/ai/AI_TOOLS.md` and `docs/ai/AI_DRIVEN_DEVELOPMENT.md`.

---

## 3. Build order

### Step 1 — Query playbooks (L21, L22)
Write runnable `mongosh` scripts in `server/queries/` against Metal मसाला data (load the seed with `insertMany` first):
- `01-crud.mongodb.js` — `insertOne/Many`, `find`, `updateOne` (`$set`, `$inc`, `$push`, `$pull`), `deleteOne/Many`, `bulkWrite`, `findOneAndUpdate`.
- `02-queries.mongodb.js` — comparison (`$gt/$gte/$lte`), logical (`$and/$or/$nor`), element/array (`$in`, `$all`, `$elemMatch`), `$regex`, `$text` + `textScore`, projection, `sort`, `skip/limit`, `countDocuments`, `distinct`. Each query has a comment like *"Jhumkas under ₹1000 in oxidized-silver, cheapest first"*.
These become the exact basis of the filters you implement in the Mongo product repository (Step 5).

### Step 2 — Data modelling (L24)
`docs/data-model.md` with a **Mermaid ER diagram** and a decision table (embed vs reference, with reason):

| Relationship | Decision | Why |
|---|---|---|
| Product → Category | reference (`category` ObjectId) | Categories change rarely; products queried by category |
| Order → items | **embedded snapshot** | Price/name must be frozen at purchase |
| Order → shippingAddress | embedded snapshot | Same |
| User → addresses | embedded array (max 5) | Always read with the user; bounded |
| User → wishlist | array of Product refs | Small, bounded |
| Cart → items | embedded (`product` ref + `qty`) | One cart per user; small |
| Review → Product/User | separate collection, referenced | Unbounded growth per product |

### Step 3 — Mongoose models (L25, L26)
Install `mongoose`. One file per model in `src/models/`. Match contract §3 field-for-field.
- **Common:** `timestamps: true`; `toJSON` transform → `id`, drop `_id` and `__v`; `lean()` for list endpoints.
- **Product:** `slug` unique; `category` ref; `images[{url,alt}]`; `craft`/`details` sub-schemas; **virtuals** `discountPercent`, `inStock`; **pre-validate hook** generates slug from name (with collision suffix); indexes in Step 6.
- **Review:** unique compound index `(product, user)`; **static** `calcAverageRatings(productId)` using aggregation; **post-save and post-remove hooks** call it to update `ratingAverage/ratingCount` on the Product.
- **Cart:** `user` unique; items `[ { product, qty } ]`; **method** `toResponse()` to compute `lineTotal` and `totals`.
- **Order:** `orderNumber` unique; items snapshot; `pricing`; `payment`; `status`; `statusHistory`; **instance method** `canTransitionTo(next)` using `ORDER_TRANSITIONS`.
- **User (schema only here):** `name`, `email` (unique, lowercase), `password` (`select: false`), `role` (enum from constants), `phone`, `addresses[]`, `wishlist[]`, `isActive`, `passwordChangedAt`. **No hashing and no auth methods** — B4 adds those.
- **Subscriber, ContactMessage:** simple schemas migrating B2's JSON stores.
- **L26 Validation:** built-in (`required`, `min/max`, `enum`, `match`, `minlength/maxlength`) **plus custom validators** (`compareAtPrice ≥ price`, 6-digit pincode, 10-digit phone, `rating` integer 1–5) with custom messages; set `runValidators: true` on updates. Mongoose `ValidationError` already maps to `422` in B2's handler — verify it end-to-end. Document the **two-layer validation** idea (zod at the edge, Mongoose at the model) in `docs/data-model.md`.

### Step 4 — Connect Node to MongoDB (L27)
- `src/config/db.js`: `mongoose.connect(uri, { dbName, serverSelectionTimeoutMS })`, URI chosen by `config.db.target` (`atlas`|`local`).
- Connection event logging (`connected`, `error`, `disconnected`); simple retry with backoff on initial failure; `mongoose.set('strictQuery', true)`.
- `server.js`: connect **before** `listen`; on `SIGINT/SIGTERM` close the connection after the HTTP server stops (extend B1's graceful shutdown).
- `/health` adds `db: { state, name, host }` from `mongoose.connection`.

### Step 5 — Repositories → MongoDB; seed (L28, part 1)
- Create `src/repositories/mongo/*.repo.js` implementing **the same interface (S1)** for Product, Category, Subscriber, ContactMessage. Product `findMany` translates every `GET /products` param to a Mongo filter/sort (**use your Step 1 queries**): `q` → `$text`, `category` slugs → category ids, `$gte/$lte` price, `$in` for finish/material/tags, `inStock` → `stock > 0`.
- Flip `DATA_STORE` default to `mongo`; delete `repositories/json/` and `data/store/` usage once all API tests pass.
- Rewrite `scripts/seed.js` (keep `--import/--destroy`): inserts categories → products (resolving category slugs to ObjectIds) → reviews → **3 dev users** with the fixed `DEV_USER_IDS` and **placeholder** `password: '__unset_until_B4__'` (B4 re-seeds with hashed passwords) → sample orders for analytics (~20, spread over 60 days).
- `scripts/seed.js --import` must be **re-runnable** (destroy-then-import in one go with `--fresh`).

### Step 6 — Aggregation & indexing (L23)
**Aggregation pipelines** (in `services/analytics.service.js` and repos; no pipeline logic in controllers):

| Feature | Stages |
|---|---|
| `/products/facets` | `$match` (current filters) → `$facet` { price `$group` min/max, categories `$group`, finishes, materials, tags (`$unwind` then `$group`) } |
| `revenue` | `$match` (status ≠ cancelled, date range) → `$group` by `$dateToString` → `$sort` |
| `sales-by-category` | `$unwind items` → `$lookup` product → `$lookup` category → `$group` |
| `top-products` | `$unwind items` → `$group` by product → `$sort` → `$limit` → `$lookup` |
| `summary` | `$facet` revenue/orders/avg + customer count + low-stock query |
| Review ratings | `$group` average/count (Review static) |

**Indexes** (declare in schemas, document in `docs/indexing.md` with **`explain('executionStats')` before/after** showing `COLLSCAN → IXSCAN` and `totalDocsExamined`):
- Product: **text index** with weights (`name` 10, `tags` 5, `tagline` 3, `description` 1); compound `{ category: 1, price: 1 }`; `{ isFeatured: 1, createdAt: -1 }`; unique `slug`, `sku`.
- Order: unique `orderNumber`; `{ user: 1, createdAt: -1 }`; `{ status: 1, createdAt: -1 }`.
- Review: unique `(product, user)`; `{ product: 1, createdAt: -1 }`.
- User: unique `email`.
- Explain when an index is **not** worth it.

### Step 7 — Commerce endpoints (L28, part 2)

**Reviews** — `GET/POST /products/:productId/reviews`, `DELETE /reviews/:id` (fill B2's `501` placeholder). `isVerifiedPurchase` = user has a delivered order containing the product.

**Cart** — `GET /cart`, `POST /cart/items`, `PATCH/DELETE /cart/items/:productId`, `DELETE /cart`, `POST /cart/merge`. All behind `protect`. Cap quantities at current stock; `409 OUT_OF_STOCK` with `details`. Create the cart lazily.

**Orders — `POST /orders` algorithm** (put it in `order.service.js`, keep controller thin):
1. Load the user's cart; reject empty → `400`.
2. Re-fetch products from the database (never trust cart snapshots); verify each still exists and `stock ≥ qty`.
3. **Atomic decrement per item:**  
   `Product.updateOne({ _id, stock: { $gte: qty } }, { $inc: { stock: -qty, soldCount: qty } })`  
   If `modifiedCount === 0` for any item → **compensate** (`$inc` back what was already taken) and throw `OUT_OF_STOCK` listing the products. *(If you use Atlas you may wrap this in `session.withTransaction`; local standalone `mongod` has no transactions, so the compensating approach is the portable one — document your choice.)*
4. Totals from **`pricing.service`** (B2) with the chosen `paymentMethod`.
5. Snapshot items (name, slug, image, price, qty, lineTotal) and the shipping address.
6. `orderNumber = MM-<year>-<6 chars>` from `crypto.randomBytes`; retry on duplicate-key.
7. Payment: `cod` → `pending`; `upi_mock`/`card_mock` → `paid` with `transactionId = MOCK-<uuid>`.
8. Save with `statusHistory: [{status:'placed'}]`; clear the cart; return `201`.
- `GET /orders` (own, paginated), `GET /orders/:id` (**owner or manager+** — enforce ownership in the service, not just the route), `PATCH /orders/:id/cancel` (owner; only `placed`/`confirmed`; **restock**).
- `GET /admin/orders` (filters `status`, `q`, pagination), `PATCH /admin/orders/:id/status` (validate with `canTransitionTo`; append `statusHistory`).

**Analytics** — the four admin endpoints from Step 6, behind `protect + restrictTo('admin')`.
**Related** — `GET /products/:slug/related`: same category first, then shared tags, exclude self, max 8.
**Auth seam:** you rely on `req.user` from the stub. Because B3 seeds the dev users, order/cart/review references are valid. Do not write any real auth.

**EVENT HOOK markers to leave (S3)** — add exactly these comments, B4 will turn them into `bus.emit`:
```
// EVENT HOOK: review.created  { review }                         (review.service, after save)
// EVENT HOOK: order.placed    { order }                           (order.service, after save)
// EVENT HOOK: order.statusChanged { order, from, to }             (order.service, status update + cancel)
// EVENT HOOK: stock.low       { product }                         (order.service, when stock ≤ LOW_STOCK_THRESHOLD after decrement)
```

### Step 8 — AI integration (L43)
Extend config with an `ai` group: `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`. **Never hard-code a model name.**

`src/services/ai/`:
- `provider.js` — interface `generate({ system, messages, maxTokens, json })` → `{ text }`.
- Adapters: `anthropic.js`, `openai.js`, `gemini.js` (use whichever the team has keys for; implementing **one real adapter + `mock`** is enough) and **`mock.js`** — deterministic keyword matcher so demos and tests work offline. If `AI_PROVIDER` is unset or the key is missing, fall back to `mock`.
- Use plain `fetch` (Node 22 has it) against the provider's HTTP API, or the provider's SDK — your call; document it.

**`POST /ai/stylist`** (public, `rateLimit` preset 10/min):
1. Validate (`message` ≤ 500 chars, `history` ≤ 6 turns).
2. **Retrieve** candidates: `$text` search + filters inferred from the message (budget ≤ ₹N, finish, tag keywords) → top ~12 products (name, id, price, tags, tagline only).
3. **Generate:** system prompt = brand voice ("Masala Stylist": warm, specific, short, light Hinglish), rules *only recommend from the provided list*, *return JSON `{ reply, productIds }`*.
4. **Verify:** parse JSON safely; **allowlist** `productIds` against the candidate ids (drop anything else) — this is the prompt-injection and hallucination guard. Product text is **data, never instructions**.
5. Respond `{ reply, products, provider }`. Timeout 10 s → `503 AI_UNAVAILABLE`; on unparseable output, fall back to the mock's reply for that request.

**`POST /ai/describe`** (manager+): turns structured attributes into `{ tagline, description }` in brand voice (≤ 90 words).

Both: log latency and provider (not message contents), cap output tokens, never log keys.

### Step 9 — AI workflow documentation (L42, L44)
Write from your real experience and the team's `docs/ai/PROMPT_LOG.md`:
- **`docs/ai/AI_TOOLS.md` (L42):** which tools/agents the team used for what (scaffolding, tests, docs, debugging), where each helped or failed, how outputs were reviewed, what you would never delegate (secrets, auth logic without review, DB deletes).
- **`docs/ai/AI_DRIVEN_DEVELOPMENT.md` (L44):** the **spec-first loop** this project used — docs → plan → build → review → log — with 3–5 concrete before/after prompt examples from `PROMPT_LOG.md`, the review checklist (does it match the contract? tests? secrets? invented dependencies?), and lessons learned. Include agent-generated tests (`node:test` + `supertest`, SHOULD) for products, cart and orders and say what a human had to fix.

---

## 4. Endpoints you own

`GET /products/facets` · `GET /products/:slug/related` · `GET/POST /products/:productId/reviews` · `DELETE /reviews/:id` · all `/cart*` · all `/orders*` · `/admin/orders*` · `/admin/analytics/*` · `POST /ai/stylist` · `POST /ai/describe` — and the Mongo-backed versions of everything from B1/B2.

## 5. Seams you must leave clean (for B4)

- User model has `password` (select:false), `role`, `isActive`, `passwordChangedAt`, `addresses`, `wishlist` — B4 only **adds** hooks/methods.
- Dev users seeded with fixed ids (S2); placeholder passwords.
- Four `EVENT HOOK` markers placed (S3).
- Ownership checks live in services (so B4's real `req.user` plugs in).
- Admin routes are wired with `protect/restrictTo` per the permission matrix.
- AI routes use B2's `rateLimit` preset.

## 6. Frontend integration

Remove from `VITE_MOCK_GROUPS`: `reviews`, `cart`, `orders`, `admin`, `ai`. **Keep** `auth` and `users` mocked. Because auth is still stubbed, set `VITE_DEV_ROLE=admin` while testing admin screens and `customer` otherwise. Test: add to bag → merge → checkout (all 3 payment methods) → order appears → cancel → stock restored → admin changes status → analytics charts populate → AI stylist returns real products. Note: with auth mocked on the client, make sure the client does not rely on a mock user id for server calls (server ignores it).

## 7. Definition of Done (B3)

- [ ] Overview §8 checklist ✔
- [ ] App runs against **Atlas and local** by switching `DB_TARGET`
- [ ] `GET /products` parity with B1 for every filter, now on MongoDB (run the old `.http` tests)
- [ ] Text search works; `explain()` evidence documented for at least 3 queries
- [ ] Order creation is safe under concurrency: two simultaneous orders for the last item → exactly one succeeds (script or test proves it)
- [ ] Cancel restocks; status transitions enforced; ratings recalculated on review create/delete
- [ ] All analytics endpoints return contract shapes (using seeded orders)
- [ ] AI stylist works with `mock` offline **and** with a real provider if a key exists; non-candidate ids are never returned
- [ ] `queries/`, `data-model.md`, `indexing.md`, `AI_TOOLS.md`, `AI_DRIVEN_DEVELOPMENT.md` written
- [ ] `// [L21]`…`// [L28]`, `[L42]`…`[L44]` tags present; map rows ticked
- [ ] Handoff entry for Aakash written (list the 4 EVENT HOOK locations and all routes that rely on the stub)

## 8. Don'ts

- No password hashing, JWT, cookies, refresh tokens, or Socket.IO (B4).
- Don't put aggregation or business rules in controllers.
- Don't trust the client for prices/totals — always recompute from the database.
- Don't change contract shapes. Don't hard-code AI model names or commit keys.
