# Backend Phase 1 (B1) — Foundations & Server Core

> **Owner:** Mehak · **Branch:** `backend/phase-1-foundation` · **Lectures:** L1 – L11 (11)
> **Starts after:** Frontend merged to `main` · **Hands off to:** Nitesh (B2)
> Read `00_PROJECT_OVERVIEW.md` and `01_API_CONTRACT.md` first. Use the kickoff prompt in the overview.

**Mission:** create the `server/` project from nothing and deliver a **real, running Express API** for the catalogue (Products + Categories) — backed by JSON files for now — while demonstrating every Node/HTTP/Express fundamental from Units 1 and the start of Unit 2.

**Why JSON files?** The database arrives in B2/B3. B1 writes data access behind the **repository interface (Overview §5 S1)**, so B3 can swap in MongoDB without touching controllers or routes. The JSON adapter is intentionally temporary — that is by design, not waste.

---

## 1. What exists before you

- `client/` with mock data in `client/src/mocks/data/*.json` (categories, products, reviews, users, orders).
- `docs/` with all spec files.

## 2. What you must deliver (summary)

A `server/` app where:
- `npm run dev` starts the API on port `4000`.
- `GET /api/v1/products`, `/products/:slug`, `/categories` return seed data with filter/sort/search/pagination exactly as in the contract.
- Product & category create/update/delete work and persist to `server/data/store/*.json`.
- `npm run dev:native` starts a **raw `http` server** (no Express) with a tiny API.
- `npm run seed -- --import|--destroy` is a proper CLI.
- API tests exist as `.http` files + a Postman collection; VS Code debugging works.

---

## 3. Build order

Follow this order — each step unlocks the next.

### Step 1 — Scaffold (L1, L2, L3)
- Create `server/`, run `npm init`; set `"type": "module"`, `"engines": {"node": ">=22"}`.
- Scripts: `dev` (`node --watch src/server.js`), `start`, `dev:native`, `seed`, `export`, `lint`, `test`.
- Dependencies: `express`, `cors`, `debug`; dev: `eslint`, `prettier`, `supertest` (optional).
- Commit `package-lock.json`. Add `.gitignore` (`node_modules`, `.env`, `data/store/`, `logs/`).
- Create `.env.example` (`NODE_ENV`, `PORT`, `CLIENT_ORIGIN`, `DATA_STORE=json`).
- Docs to write:
  - **L1** `docs/architecture.md` — diagram + prose of one request: browser → Vite proxy → Express → repository → JSON → response. Name each layer and what it will become in later phases.
  - **L2** `docs/http-notes.md` — methods ↔ CRUD table for *this* API, status codes used (200/201/204/400/404/409/422), headers (`Content-Type`, `Cache-Control`, `ETag`, `Location`, CORS), each with a `curl` example against the running server.
  - **L3** `docs/node-notes.md` — what the Node runtime is, event loop in plain words, `dependencies` vs `devDependencies`, semver (`^`/`~`), why the lockfile is committed.

### Step 2 — Modules & core modules (L4, L5)
- **L4 Modules:** split code into small ES modules under `src/`. Create **one deliberate CommonJS file** `src/utils/formatters.cjs` (`formatINR(n)`, `slugify(str)`) and import it from ESM with `createRequire`. Add a comment explaining interop and module caching (modules are singletons).
- **L5 Core modules** — use each for a *real* job, not a toy:

| Module | Real job in this project |
|---|---|
| `fs/promises` | JSON store read/write (atomic: write temp file then `rename`); append-only request log `logs/access.log` |
| `path` + `url` (`fileURLToPath`) | Resolve `data/`, `public/`, ESM `__dirname` replacement |
| `os` | `/health` reports platform, CPU count, free memory |
| `crypto` | `randomUUID()` for ids/request refs; `createHash('sha1')` for ETags |
| `stream` + `readline` + `zlib` | `scripts/export-products.js`: stream products → CSV rows → gzip → file, using `pipeline` |
| `util` | `promisify`, `inspect` for debug output |

### Step 3 — Process & CLI (L6)
- `scripts/seed.js`: parse `process.argv` manually (no CLI libraries): `--import`, `--destroy`, `--file <path>`, `--help`. Validate input, print friendly progress with `process.stdout.write`, exit with proper codes (`0` ok, `1` bad usage, `2` failure).
- `src/server.js`: graceful shutdown on `SIGINT`/`SIGTERM` (stop accepting connections, flush log stream, `process.exit(0)`); handlers for `unhandledRejection` and `uncaughtException` (log, then exit non-zero).
- `src/config/index.js`: reads `PORT`, `NODE_ENV`, `CLIENT_ORIGIN`, `DATA_STORE` from `process.env` with defaults. (B2 will upgrade it.)
- `/health` shows `process.uptime()` and `process.memoryUsage()`.

### Step 4 — Raw HTTP server (L7)
`src/native/server.js` using only `node:http`:
- Manual routing (`req.method` + parsed `URL`), query parsing with `URLSearchParams`.
- Reads request bodies from the stream, parses JSON safely, returns JSON with correct status/headers.
- Routes: `GET /health`, `GET /native/products` (reads seed JSON via `fs`), `GET /native/products/:slug`, `POST /native/echo`.
- Handles 404 and 405 itself. Runs on port `4001`.
- `docs/node-vs-express.md`: side-by-side table (routing, body parsing, middleware, errors, lines of code) so the viva answer is obvious.

### Step 5 — Testing & debugging (L8)
- `api-tests/catalogue.http` (VS Code REST Client format) covering every endpoint; plus a Postman collection `api-tests/metal-masala.postman_collection.json` with an environment file.
- `.vscode/launch.json` for `node --inspect` with breakpoints; document in `docs/debugging.md` (how to attach, how to use the `debug` package: `DEBUG=mm:* npm run dev`).
- Use `debug` namespaces: `mm:http`, `mm:data`, `mm:boot`.
- SHOULD: one `node:test` + `supertest` smoke test (`GET /health`, `GET /products`).

### Step 6 — Express catalogue API (L9, L10, L11)
Structure:
```
server/
├── data/seed/            # copied from client/src/mocks/data/ (products.json, categories.json, …)
├── data/store/           # runtime JSON (gitignored); seed.js copies seed → store
└── src/
    ├── app.js            # builds the Express app (no listen)
    ├── server.js         # listens, shutdown, process handlers
    ├── config/index.js
    ├── routes/{index,health,product,category}.routes.js
    ├── repositories/json/{product,category}.repo.js
    └── utils/{response.js, formatters.cjs, jsonStore.js}
```

- **L9 Express intro:** `app.js` creates the app: `express.json()`, `express.static('public')`, `cors({ origin: CLIENT_ORIGIN, credentials: true })`, mount router at `/api/v1`. Separate `app.js` from `server.js` so tests can import the app.
- **L10 CRUD fundamentals:** full CRUD for Products and Categories through the **repository interface (S1)**. `POST` → `201` + `Location` header; `PATCH` → `200`; `DELETE` → `204` no body. Slug auto-generation + uniqueness (`409` with the contract's error envelope). Category delete is blocked while products reference it.
- **L11 Request & response handling:**
  - `req.params` (`:slug`, `:id`), `req.query`, `req.body`, `req.get()` — all used meaningfully.
  - `GET /products` implements **every query param in the contract** (`page, limit, sort, q, category, minPrice, maxPrice, material, finish, tags, featured, newDrop, inStock`) in the JSON repository using plain array methods. Return `meta` pagination.
  - `res.status().json()` through `utils/response.js` (`sendSuccess(res, data, { status, meta, message })`).
  - `ETag` + `Cache-Control: public, max-age=60` on product reads; honour `If-None-Match` → `304`.
  - `GET /products/export.csv` (manager+): `res.download` / stream from the export script's logic. *(Route must be declared before `/products/:slug`.)*
  - Minimal validation inside handlers (required fields, `price > 0`, enums from the contract) returning `422 VALIDATION_ERROR` with `details`. (B2 replaces this with zod.)

---

## 4. Endpoints you own (see contract §4.1 for full detail)

`GET /health` · `GET/POST /categories` · `PATCH/DELETE /categories/:id` · `GET/POST /products` · `GET /products/:slug` · `PATCH/DELETE /products/:id` · `GET /products/export.csv`

Not yours (don't build): `facets`, `related`, `pricing/quote`, anything else.

**Auth placeholder:** write routes (`POST/PATCH/DELETE`) carry a comment `// TODO(B2): protect + restrictTo(...)`. B2 creates the middleware and wires it. Do **not** invent your own auth.

---

## 5. Seams you must leave clean

- `repositories/json/*.repo.js` expose **exactly** `findMany, findById, findBySlug, create, update, remove` (S1).
- `utils/response.js` is the only place that formats success responses (S5).
- `config/index.js` is the only file that reads `process.env` (S6).
- `routes/*.routes.js` export an Express `Router`; `routes/index.js` mounts them — B2 will add a controller layer, so keep handlers as small named functions in the same file (easy to extract).

---

## 6. Frontend integration

1. Start API: `cd server && npm run dev`. Start client with  
   `VITE_MOCK_GROUPS=pricing,newsletter,contact,reviews,cart,orders,admin,ai,auth,users` (i.e. **products and categories removed**).
2. Click through home, shop (all filters + sort + search), product pages.
3. Fix server bugs or contract mismatches; the contract wins.
4. Update `client/.env.example` with the new default group list.

---

## 7. Definition of Done (B1)

- [ ] Overview §8 checklist ✔
- [ ] `npm run dev`, `npm run dev:native`, `npm run seed -- --import`, `npm run export` all work from a clean clone
- [ ] `GET /products` supports every contract param; verified with `.http` tests
- [ ] Slug uniqueness (409), 404s, 422s use the contract's error envelope
- [ ] Graceful shutdown works (Ctrl+C prints a clean message, no hanging process)
- [ ] ETag/304 works on product reads
- [ ] Docs written: `architecture.md`, `http-notes.md`, `node-notes.md`, `node-vs-express.md`, `debugging.md`
- [ ] `// [L1]`…`// [L11]` tags present; map rows ticked
- [ ] Client works with products/categories served by the real API
- [ ] Handoff entry for Nitesh written

## 8. Don'ts

- No MongoDB, Mongoose, JWT, bcrypt, or auth logic.
- No controller/service/model folders yet — that is B2's lecture (MVC).
- No global state beyond the JSON store module.
- Don't change JSON shapes: they must equal the contract.
