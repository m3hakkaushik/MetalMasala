# Metal मसाला — Implementation Map: what was built, where, and how

This file answers one question for every curriculum topic: **"How did you implement this concept in the project?"** It is meant to be read before a viva or review, and to be kept up to date by the people (and agents) who build each phase.

**How to use / update it**
- The **How** column is the *planned* implementation, written before coding. Each phase owner **verifies it, corrects it if reality differed, and adds the real file paths** in the form `(files: server/src/…)`.
- Change status `⬜` → `✅` only when the code exists, runs, and has a `// [Lxx]` tag in the source (`grep -rn "\[L17\]" server/src`).
- Phase owners: B1 = Mehak · B2 = Nitesh · B3 = Tanishq · B4 = Aakash.
- Source for lecture numbers/titles: the *Web Dev III* curriculum PDF.

---

## Part A — Backend

### B1 · Mehak — Foundations & Server Core (L1 – L11)

| Lecture | Concept | Where in Metal मसाला | How it's implemented | Status |
|---|---|---|---|---|
| L1 | Introduction to Backend Development | The request lifecycle of the store | `docs/architecture.md` traces one request (browser → Vite proxy → Express → repository → JSON → response). The `server/` folder layout mirrors those layers. Client/server separation explained with real routes (`GET /products`). (files: `docs/architecture.md`, `server/src/app.js`, `server/src/server.js`) | ✅ |
| L2 | HTTP Fundamentals | Correct semantics across the whole API | `docs/http-notes.md` maps methods → CRUD for this API; status codes in use (200/201/204/304/400/404/409/422); `Location` on `201`, `Cache-Control` + `ETag` on product reads, CORS headers. Each shown with a `curl` example. (files: `docs/http-notes.md`, `server/src/utils/response.js`, `server/src/routes/product.routes.js`, `server/src/routes/category.routes.js`) | ✅ |
| L3 | Node.js Runtime & NPM | The `server/` project itself | `package.json` with `"type":"module"`, `engines`, scripts (`dev`, `start`, `dev:native`, `seed`, `export`), `dependencies` vs `devDependencies`, committed lockfile, semver notes in `docs/node-notes.md`. (files: `server/package.json`, `server/package-lock.json`, `docs/node-notes.md`, `server/src/server.js`, `server/src/config/index.js`) | ✅ |
| L4 | Node.js Modules | Code organised into small units | ES Modules across `src/`; one deliberate CommonJS file `utils/formatters.cjs` (`formatINR`, `slugify`) imported via `createRequire` to show interop; module-caching/singleton behaviour noted in comments. (files: `server/src/utils/formatters.cjs`, `server/src/utils/formatters.js`) | ✅ |
| L5 | Core Node.js Modules | Built-ins doing real work | `fs/promises` atomic JSON store + access log; `path`/`url` for ESM paths; `os` stats in `/health`; `crypto.randomUUID` + SHA-1 ETags; `stream.pipeline` + `readline` + `zlib` in `scripts/export-products.js` (products → CSV → gzip). (files: `server/src/utils/jsonStore.js`, `server/src/utils/logger.js`, `server/src/routes/health.routes.js`, `server/scripts/export-products.js`) | ✅ |
| L6 | Process Object & CLI | Seed CLI and process lifecycle | `scripts/seed.js` parses `process.argv` (`--import/--destroy/--file/--help`) with exit codes; `SIGINT/SIGTERM` graceful shutdown; `unhandledRejection` + `uncaughtException` handlers; `process.uptime()/memoryUsage()` in `/health`. (files: `server/scripts/seed.js`, `server/src/server.js`, `server/src/config/index.js`, `server/src/routes/health.routes.js`) | ✅ |
| L7 | HTTP Server Development | Raw Node server alongside Express | `src/native/server.js` using `http.createServer`: manual routing, stream-based JSON body parsing, correct status/headers, 404/405; `docs/node-vs-express.md` compares the two. (files: `server/src/native/server.js`, `docs/node-vs-express.md`, `server/test/smoke.test.js`) | ✅ |
| L8 | API Testing & Debugging | Reproducible tests + debugging setup | `api-tests/*.http` (REST Client) + Postman collection and environment; `.vscode/launch.json` for `node --inspect`; `debug` namespaces (`mm:http`, `mm:data`, `mm:boot`); `node:test` + `supertest` smoke tests. (files: `server/api-tests/catalogue.http`, `server/api-tests/metal-masala.postman_collection.json`, `server/api-tests/metal-masala.postman_environment.json`, `server/.vscode/launch.json`, `docs/debugging.md`, `server/test/smoke.test.js`) | ✅ |
| L9 | Introduction to Express.js | Application skeleton | `app.js` (builds the app) separate from `server.js` (listens); `express.json()`, `express.static`, `cors` for the Vite origin; router mounted at `/api/v1`. (files: `server/src/app.js`, `server/src/server.js`, `server/src/routes/index.js`, `server/public/index.html`) | ✅ |
| L10 | CRUD Fundamentals | Catalogue management | Products & Categories create/read/update/delete through the repository interface; `201` + `Location`, `204` on delete, slug uniqueness (`409`), category-in-use protection. Persists to JSON files. (files: `server/src/repositories/json/category.repo.js`, `server/src/repositories/json/product.repo.js`, `server/src/routes/category.routes.js`, `server/src/routes/product.routes.js`) | ✅ |
| L11 | Request & Response Handling | Browsing the catalogue | `req.params/query/body/get` used for slug lookup and `GET /products` filtering (`q, category, price, finish, material, tags, sort, page, limit`); `res.status().json()` via `sendSuccess`; ETag/304; CSV export via `res.download`/stream. (files: `server/src/routes/product.routes.js`, `server/src/routes/category.routes.js`, `server/src/utils/response.js`) | ✅ |

### B2 · Nitesh — Architecture, Middleware & Configuration (L12 – L20, L29, L30)

| Lecture | Concept | Where in Metal मसाला | How it's implemented | Status |
|---|---|---|---|---|
| L12 | Introduction to MVC Architecture | `server/src/app.js`, `docs/mvc.md` | Express routes dispatch to controllers and services. The repository layer provides the model for the React view. | ✅ |
| L13 | Controllers & Business Logic | `server/src/controllers/product.controller.js`, `server/src/services/product.service.js`, `server/src/services/pricing.service.js` | Controllers handle HTTP. Services coordinate catalogue lookups, slug conflicts, and reusable pricing calculations. The JSON adapter supplies stock and discount fields. | ✅ |
| L14 | CRUD Operations using MVC | `server/src/controllers/`, `server/src/services/`, `server/src/repositories/README.md` | Catalogue CRUD keeps the Phase 1 interface. Newsletter and contact persist records in JSON. Price quotes read current catalogue prices. | ✅ |
| L15 | Express Routing & REST APIs | `server/src/routes/index.js`, `server/src/routes/product.routes.js`, `server/src/routes/review.routes.js`, `docs/rest-conventions.md` | Resource routers share `/api/v1`. The product router preloads slugs with `router.param`. Reviews inherit the product ID and return 501 until Phase 3. | ✅ |
| L16 | Middleware Basics | `server/src/app.js`, `server/src/middleware/`, `docs/middleware.md` | Request IDs, access logging, Morgan, Helmet, CORS, compression, Express parsers, and scoped rate limits run before resource handlers. | ✅ |
| L17 | Middleware Chaining | `server/src/routes/`, `server/src/middleware/auth.js`, `server/src/middleware/validate.js` | Public forms rate-limit before validation. Catalogue writes check roles before validation. Production refuses the development auth stub. | ✅ |
| L18 | Error Handling | `server/src/middleware/errorHandler.js`, `server/src/utils/AppError.js`, `server/test/error-handler.test.js`, `docs/error-handling.md` | One Express error pipeline returns contract codes and request IDs. Tests cover mappings for parser, Mongoose, and JWT failures. | ✅ |
| L19 | Introduction to Databases (SQL vs NoSQL) | `docs/adr/0001-why-mongodb.md`, `server/src/config/index.js` | The ADR records trade-offs for the catalogue, embedded order snapshots, references, and the Phase 3 migration. | ✅ |
| L20 | MongoDB Basics + Installation, Atlas & Local Configuration | `server/docker-compose.yml`, `server/scripts/db-ping.js`, `docs/mongodb-setup.md` | Standalone ping, version lookup, and collection listing passed on local MongoDB 7.0.48 and Atlas MongoDB 8.0.37. | ✅ |
| L29 | Environment Variables | `server/.env.example`, `server/src/config/constants.js`, `docs/env-and-config.md` | Documented defaults, environment modes, public Vite flags, and contract enums. Runtime environment reads are centralized. | ✅ |
| L30 | Configuration Management & dotenv | `server/src/config/index.js`, `server/test/config.test.js` | Dotenv selects the environment file. Zod creates and validates immutable config groups or exits with a redacted field report. | ✅ |

### B3 · Tanishq — Database Layer, Commerce Flow & AI (L21 – L28, L42 – L44)

| Lecture | Concept | Where in Metal मसाला | How it's implemented | Status |
|---|---|---|---|---|
| L21 | MongoDB CRUD Operations | Seeding and data operations | `queries/01-crud.mongodb.js` (`insertMany`, `find`, `updateOne` with `$set/$inc/$push/$pull`, `deleteMany`, `bulkWrite`) on real store data; `scripts/seed.js` now imports into MongoDB (`--fresh` re-runnable). | ⬜ |
| L22 | Query Operations in MongoDB | Catalogue search & filters | `queries/02-queries.mongodb.js` (comparison/logical/array operators, `$regex`, `$text`, projection, sort, skip/limit, `countDocuments`, `distinct`) → implemented in `repositories/mongo/product.repo.js` for every `GET /products` param. | ⬜ |
| L23 | Aggregation Pipeline + Indexing | Analytics, facets, speed | Pipelines (`$match/$group/$unwind/$lookup/$facet/$dateToString`) for `/products/facets`, revenue, sales-by-category, top products, summary and rating recalculation; indexes (weighted text, compound `category+price`, unique `slug/email/orderNumber`, review `(product,user)`) with `explain()` before/after in `docs/indexing.md`. | ⬜ |
| L24 | Data Modelling & Relationships | Schema design | `docs/data-model.md` Mermaid ER diagram + embed-vs-reference table: order items & address embedded snapshots, reviews referenced, wishlist refs, cart items embedded, product → category reference. | ⬜ |
| L25 | Introduction to Mongoose ODM + Schema & Model Design | Models | Category, Product, Review, Cart, Order, User, Subscriber, ContactMessage; `timestamps`, `toJSON` → `id`, virtuals (`discountPercent`, `inStock`), statics/methods (`calcAverageRatings`, `canTransitionTo`), hooks (slug pre-validate, rating post-save), `populate`, `lean()`. | ⬜ |
| L26 | Data Validation using Mongoose | Trustworthy data | Built-in validators + custom (`compareAtPrice ≥ price`, 6-digit pincode, 10-digit phone, integer rating 1–5) with custom messages; `runValidators` on updates; errors surface as `422` via B2's handler; two-layer validation (zod + Mongoose) documented. | ⬜ |
| L27 | Connecting Node.js with MongoDB | Live DB connection | `config/db.js` (`mongoose.connect`, Atlas/local via `DB_TARGET`, event logging, retry/backoff); connect-before-listen; close on shutdown; `/health` includes DB state. | ⬜ |
| L28 | Building REST APIs with Database Integration | Real commerce flow | Mongo repositories replace JSON; Reviews; server-side Cart (+ guest merge); Orders (build from cart, atomic stock decrement with `$inc` + `stock ≥ qty` guard, compensation on failure, order number via `crypto`, state machine, cancel + restock); admin orders & analytics. | ⬜ |
| L42 | AI Tools For Developers | How the team built the project | `docs/ai/AI_TOOLS.md`: agents/assistants used per phase, where they helped or failed, review practices, what is never delegated. Backed by `docs/ai/PROMPT_LOG.md`. | ⬜ |
| L43 | Integrating AI Services | Masala Stylist + AI copywriter | `services/ai/` provider interface with adapters (+ offline `mock`); `POST /ai/stylist` = retrieve candidates (`$text` + inferred filters) → LLM picks ids and writes reply → ids allow-listed against candidates; `POST /ai/describe`; timeouts, rate limits, input caps. | ⬜ |
| L44 | AI driven Development | Spec-first workflow | `docs/ai/AI_DRIVEN_DEVELOPMENT.md`: docs → plan → build → review → log loop actually used (these very docs), prompt examples, review checklist, agent-written tests and the human fixes they needed. | ⬜ |

### B4 · Aakash — Auth, Realtime & Integration (L31 – L41)

| Lecture | Concept | Where in Metal मसाला | How it's implemented | Status |
|---|---|---|---|---|
| L31 | Authentication | Accounts | `POST /auth/register|login|logout|refresh`, `GET /auth/me`, `PATCH /auth/password`; normalised email; identical error for unknown email vs wrong password; strict rate limit on login. (STRETCH: lockout, forgot/reset.) | ⬜ |
| L32 | Authorization Concepts | Who can do what | `docs/authz.md`: authN vs authZ, 401 vs 403, permission matrix; ownership checks in services (orders, cart, addresses, reviews). | ⬜ |
| L33 | Password Hashing (bcrypt) | Safe credentials | `bcryptjs` in User `pre('save')` (cost from config), `comparePassword`, `select:false`, zod password policy, change-password revokes sessions, seeds hashed via `User.create`. | ⬜ |
| L34 | JWT | Stateless identity | `utils/jwt.js` sign/verify (HS256; claims `sub`, `role`); secrets from validated config; decode-vs-verify explained; errors mapped to `TOKEN_EXPIRED`/`UNAUTHENTICATED`. | ⬜ |
| L35 | Access Tokens, Refresh Tokens | Sessions | 15-min access token in JSON/`Authorization`; 7-day refresh token in httpOnly cookie `mm_refresh`; `RefreshToken` collection (hashed, TTL index); rotation + reuse detection (revoke family); client interceptor refreshes silently. | ⬜ |
| L36 | Protected Routes | Real guard | Stub replaced inside `protect` (Bearer → verify → load user → active check → password-changed check); no route edits needed; route audit table in `docs/authz.md`. | ⬜ |
| L37 | RBAC | Customer / manager / admin | `restrictTo(roles)` + `config/permissions.js` + `requirePermission`; admin user management (list, role, activate/deactivate); RBAC test matrix (`api-tests/rbac.http` / `supertest`). | ⬜ |
| L38 | EventEmitter | Decoupled side effects | `events/bus.js` (EventEmitter subclass) with `user.registered`, `order.placed`, `order.statusChanged`, `stock.low`, `review.created`; B3's hooks → `bus.emit` after DB writes; listeners for notifications (mail stub), stock alerts, socket bridge; `once`, `off`, `errorMonitor`. | ⬜ |
| L39 | Web Sockets | Protocol understanding | `docs/websockets.md` (Upgrade handshake, frames, polling vs SSE vs WS); `scripts/ws-demo-server.js` + client using `ws` (echo, broadcast, heartbeat). | ⬜ |
| L40 | Socket.IO | Live commerce | Shared HTTP server; namespaces `/` (viewer counts, drop banners), `/account` (JWT; order tracking rooms), `/admin` (JWT + role; new-order/low-stock alerts, drop publish); rooms `product:<slug>`, `order:<id>`, `user:<id>`, `admins`; client hooks `useSocket`, `useOrderLive`. | ⬜ |
| L41 | Full-Stack Application Integration & Project Review | Everything together | All mock groups removed; MSW excluded from prod bundle; refresh flow + guest-cart merge verified; cross-origin cookie/CORS checks; end-to-end script and final README in `docs/PROJECT_REVIEW.md`. | ⬜ |
| L45 | Capstone Project | The entire repository | Frontend + B1–B4 delivered as one full-stack application; this map fully ✅. | ⬜ |

---

## Part B — Frontend (no lecture numbers; explains design/engineering decisions)

| Topic | Where | How it's implemented | Status |
|---|---|---|---|
| Component architecture | `client/src/components/ui/`, `client/src/features/` | Shared fields, buttons, stickers, dialogs, artwork, and pagination support the storefront and staff screens. | ✅ |
| Routing & guards | `client/src/app/App.jsx`, `client/src/app/Access.jsx` | React Router lazily loads account, checkout, tracking, and staff routes. Guards enforce authentication and role at direct URLs. | ✅ |
| Server state | `client/src/api/`, `client/src/features/cart/useBag.js` | TanStack Query caches catalogue and customer data, provides loading and retry states, and invalidates queries after mutations. | ✅ |
| Client state | `client/src/stores/`, `client/src/features/cart/sessionCart.js` | The guest bag persists in browser storage, auth tokens stay in memory, and sign-in merges guest items into the server-shaped cart. | ✅ |
| Contract-faithful mocking | `client/src/mocks/registry.js`, `client/src/mocks/handlers/` | Selectable MSW route groups support commerce, accounts, catalogue, staff, marketing, and AI. `catalogue-extras` keeps the B3 catalogue routes available during B1 and B2. | ✅ |
| Auth plumbing | `client/src/api/http.js`, `client/src/mocks/handlers/auth.js` | Axios attaches the bearer token, unwraps envelopes, and queues expired-token retries behind one refresh. Mocks implement refresh rotation and reuse handling. | ✅ |
| Forms & validation | `client/src/api/validation.js`, `client/src/api/productFields.js`, `client/src/components/ui/Field.jsx` | React Hook Form and Zod validate modal and page forms, including checkout phone and pincode. | ✅ |
| Design system | `client/src/styles/tokens.css`, `client/src/main.jsx` | Patina, gulaal, haldi and kapoor tokens mapped to Tailwind. Self-hosted Yatra One, Instrument Sans, Mukta and Kalam. | ✅ |
| Signature hero | `client/src/features/home/Hero.jsx` | The shirorekha continues into the pendant rail. Springs react to pointer and scroll velocity, with fixed positions for reduced motion. | ✅ |
| URL-synced filtering | `client/src/pages/Shop.jsx`, `client/src/mocks/handlers/products.js` | Search, sort, and filters stay in the URL. Categories can also be selected via the route. Facets come from `/products/facets`. | ✅ |
| Accessibility & performance | `client/src/app/Layout.jsx`, `client/src/components/ui/Drawer.jsx`, `client/src/styles/base.css` | Skip link, focus rings, native modal focus handling, reduced motion, live status text, route splitting, and illustrated fallbacks. Mobile production Lighthouse scored 100 Performance, 100 Accessibility, and 96 Best Practices. | ✅ |

---

## Part C — Feature → concepts it demonstrates (quick viva cheat-sheet)

| Feature | Concepts involved |
|---|---|
| Browsing & filtering products | HTTP (L2), Express routing (L9, L15), query handling (L11), Mongo queries (L22), indexes (L23), text search (L23) |
| Product CRUD (admin) | CRUD (L10, L14, L21), validation (L26), RBAC (L37), middleware chaining (L17) |
| Cart & checkout | Business logic (L13), Mongoose models (L25), REST + DB (L28), protected routes (L36) |
| Placing an order | Atomic updates (L21/L28), pricing service (L13), events (L38), sockets (L40) |
| Login & sessions | Authentication (L31), bcrypt (L33), JWT (L34), refresh tokens (L35) |
| Admin analytics | Aggregation (L23), RBAC (L37), data modelling (L24) |
| Live order tracking / viewers | EventEmitter (L38), WebSockets (L39), Socket.IO (L40) |
| AI Stylist | Integrating AI services (L43), query operations (L22), env/config (L29–30), error handling (L18) |
| Whole-app configuration | Env vars & dotenv (L29–30), process & CLI (L6), graceful shutdown (L6) |
| How we built it | AI tools (L42), AI-driven development (L44), capstone (L45) |

---

## Handoff log

> Append one entry at the end of each phase. Newest at the bottom.

### Template
```
### <Phase> — <Owner> — <date>
- Branch / PR:
- What's done (one line per lecture group):
- How to run it (commands, env needed):
- Seams left for the next person (what to pick up, where the markers/TODOs are):
- Known issues / shortcuts:
- Contract changes made (and who agreed):
```

### Frontend · 18 November 2026

- Delivered the storefront, URL-filtered catalogue, product detail and reviews, guest bag and sign-in merge, three-step mock checkout, order tracking, account settings, search, Masala Stylist, and staff dashboard, products, orders, and users.
- Run from `client/` with `npm ci`, copy `.env.example` to `.env`, then run `npm run dev`. The root README lists the demo accounts and production preview commands.
- The seed data is in `client/src/mocks/data/`. It contains eight categories, 32 products, 30 reviews, eight sample users, and 23 orders. Product photos can be added later at the paths stored on each product.
- **B1 integration:** remove `products` and `categories` from `VITE_MOCK_GROUPS`, keep `catalogue-extras` alongside `pricing,newsletter,contact,reviews,cart,orders,admin,ai,auth,users`. B3 should remove `catalogue-extras` when its facets and related routes are live.
- The mock product write request uses the category ID as the `category` string and continues to return the embedded category object in reads. The API contract's response and error shapes are unchanged.
- Verified builds with all mocks and with the mock group list empty. Browser checks covered guest checkout, timeline advancement, session reload, wishlist, reviews, staff screens, quick search, and the mobile filter sheet. Mock API checks covered all payment methods, stock restoration, refresh rotation, concurrent token-expiry retries, and staff permissions.
- B1 curriculum rows (L1 – L11) completed and verified below.

### Backend Phase 1 (B1) — Mehak — 18 November 2026

- Branch / PR: `backend/phase-1-foundation`
- What's done (one line per lecture group):
  - **L1–L3:** Node.js runtime setup (`engines: >=22`, `"type": "module"`), package.json scripts, committed lockfile, request lifecycle architecture (`docs/architecture.md`), HTTP semantics (`docs/http-notes.md`), and runtime guide (`docs/node-notes.md`).
  - **L4–L5:** ES Modules across `src/`; deliberate CommonJS module `src/utils/formatters.cjs` with `createRequire` interop and module caching comments; core Node modules (`fs/promises`, `path`, `url`, `os`, `crypto`, `stream`, `readline`, `zlib`, `util`) used for atomic JSON store (`jsonStore.js`), append-only access log (`logger.js`), and stream gzip CSV export.
  - **L6:** Seeder CLI (`scripts/seed.js`) parsing `process.argv` manually (`--import`, `--destroy`, `--file`, `--help`) with exit codes; graceful shutdown on `SIGINT`/`SIGTERM` in `server.js`; global `unhandledRejection` and `uncaughtException` handlers; process uptime/memory in `/health`.
  - **L7:** Standalone raw Node.js HTTP server (`src/native/server.js`) on port 4001 using `http.createServer`, manual stream JSON parsing, query parsing, 404/405 handlers, and comparison document `docs/node-vs-express.md`.
  - **L8:** API test suite `api-tests/catalogue.http` (REST Client), Postman collection and environment files, `.vscode/launch.json` for `--inspect` debugging, `debug` namespaces (`mm:boot`, `mm:http`, `mm:data`), and automated `node:test` + `supertest` smoke tests (15/15 passing).
  - **L9–L11:** Express 4.x application skeleton (`src/app.js` separate from `src/server.js`) with CORS, static serving, and `/api/v1` routes; full Categories & Products CRUD via S1 repository interface; comprehensive query filtering (`q`, `category`, `price`, `material`, `finish`, `tags`, `sort`, `page`, `limit`), `sendSuccess`/`sendError` envelopes, weak ETag + `Cache-Control: public, max-age=60` with 304 revalidation, slug conflict checks (409), category-in-use delete protection (409), and CSV stream export (`/api/v1/products/export.csv`).
- How to run it (commands, env needed):
  - `cd server && npm install`
  - `npm run seed -- --import` (populates `data/store/*.json` from seed data)
  - `npm run dev` (starts Express API server on `http://localhost:4000`)
  - `npm run dev:native` (starts Raw Node HTTP server on `http://localhost:4001`)
  - `npm run export` (exports products to CSV and gzip archive in `data/export/`)
  - `npm test` (runs the 15-test automated smoke test suite)
  - `npm run lint` (runs ESLint, passes with 0 errors)
- Seams left for the next person (what to pick up, where the markers/TODOs are):
  - **S1 (Repository interface):** `server/src/repositories/json/{product,category}.repo.js` implement `findMany, findById, findBySlug, create, update, remove`.
  - **S2 (Auth seam):** write routes (`POST /categories`, `PATCH /categories/:id`, `DELETE /categories/:id`, `POST /products`, `PATCH /products/:id`, `DELETE /products/:id`, `GET /products/export.csv`) carry `// TODO(B2): protect + restrictTo(...)`.
  - **S5 (Response envelope & errors):** `src/utils/response.js` exports `sendSuccess` and `sendError`. Nitesh will wire `AppError` and the central error middleware.
  - **S6 (Config):** `src/config/index.js` reads env vars. Nitesh will upgrade it with dotenv + zod schema validation.
- Known issues / shortcuts:
  - Auth is currently stubbed until B2 creates `protect`/`restrictTo` and B4 delivers JWT auth.
  - Catalogue facets (`/products/facets`) and related products (`/products/:slug/related`) are queued for B3 (MongoDB aggregation). Keep `catalogue-extras` in client mock groups.
- Contract changes made (and who agreed):
  - None; strictly adheres to `docs/01_API_CONTRACT.md`.

### Backend Phase 2 · Nitesh · 18 November 2026

- Local review branch `backend/phase-2-architecture`, based on Mehak's merged Phase 1 at `adf1ebc`.
- Moved catalogue CRUD into routes, controllers, and services. Added the newsletter, contact, and pricing APIs, central middleware, development role checks, validated configuration, and the MongoDB setup and ping.
- Start with `npm ci` and `npm run dev` from `server/`, then start the client with the groups in `client/.env.example`. The API serves products, categories, pricing, newsletter, and contact. Facets, related products, and the remaining app features still use their mock groups.
- Verification passed for 29 automated backend tests and all 31 requests across the catalogue and Phase 2 HTTP files. Seed import, compressed CSV export, frontend lint and build, and browser newsletter, contact, and checkout quoting also passed.
- Local MongoDB 7.0.48 and Atlas MongoDB 8.0.37 passed the standalone ping. Atlas reported no visible collections in `metal_masala`.
- For Phase 3, reuse `calculateQuote`, keep the repository interface and central errors, and replace the nested review placeholder. The HTTP app still uses the JSON repositories.
- The response contract is unchanged. Explicit duplicate slugs return 409, while auto-generated collisions use sequential suffixes.
