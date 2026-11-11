# Backend Phase 2 (B2) — Architecture, Middleware & Configuration

> **Owner:** Nitesh · **Branch:** `backend/phase-2-architecture` · **Lectures:** L12 – L20, L29, L30 (11)
> **Starts after:** B1 merged to `main` · **Hands off to:** Tanishq (B3)
> Read `00_PROJECT_OVERVIEW.md` and `01_API_CONTRACT.md` first. Use the kickoff prompt in the overview.

**Mission:** turn Mehak's working-but-flat API into a **properly layered MVC application** with a real middleware pipeline, centralized error handling and validated configuration — and prepare the database environment (decision record, Atlas + local setup) so Tanishq can plug MongoDB straight in.

You still **do not connect to MongoDB from the app**. Data stays in JSON stores behind the repository interface. You do prove the database environment works with a standalone ping script.

---

## 1. What exists before you

From B1: Express app on port 4000, Products/Categories CRUD with inline route handlers, JSON repositories (`repositories/json/`), `utils/response.js`, minimal `config/index.js`, seed + export scripts, native `http` demo, `.http` API tests.

## 2. What you must deliver (summary)

- MVC structure: `routes → controllers → services → repositories`.
- Products/Categories refactored into it; **Newsletter**, **Contact**, and **Pricing quote** added end-to-end.
- Middleware pipeline (request id, logging, security, CORS, compression, rate limiting, validation) and the **auth seam stubs** (`protect`, `restrictTo`).
- `AppError` + `catchAsync` + central `errorHandler` with the contract's error envelope and codes.
- Validated config module (dotenv + zod), `.env.example`, shared constants.
- `docs/adr/0001-why-mongodb.md`, `docs/mongodb-setup.md`, `docker-compose.yml`, `scripts/db-ping.js`.

---

## 3. Build order

Config first (everything else depends on it), then structure, then pipeline, then errors, then database environment.

### Step 1 — Environment & configuration (L29, L30)
- Install `dotenv`, `zod`. Create `src/config/index.js`:
  - Loads `.env` via `dotenv` (path chosen by `NODE_ENV`: `.env`, `.env.test`).
  - Validates with a **zod schema**: types, defaults, ranges (`PORT` number, `BCRYPT_ROUNDS` 10–14, URL formats, enums for `DB_TARGET`/`DATA_STORE`).
  - **Fail fast:** on invalid/missing values, print a readable table of problems and `process.exit(1)`.
  - Exports one frozen, grouped object: `config.server`, `.db`, `.cors`, `.pricing`, `.rateLimit`, `.log`, `.stock`. (JWT/AI groups are added by B3/B4 — leave clear extension points.)
- `src/config/constants.js`: `ROLES`, `ORDER_STATUS`, `ORDER_TRANSITIONS`, `PAYMENT_METHODS`, `PAYMENT_STATUS`, `MATERIALS`, `FINISHES`, `TAGS`, `DEV_USER_IDS` (values in Overview §5 S7), `ERROR_CODES`. These mirror contract §2 and §1.
- From now on **only `src/config/` touches `process.env`** (S6). Refactor B1's direct reads.
- `.env.example` fully documented (one comment per variable); `.env` stays gitignored.
- Write `docs/env-and-config.md`: what env vars are, why secrets never go in git, `NODE_ENV` modes, difference between server env and client `VITE_` vars (client vars are **public**, never put secrets there).

### Step 2 — MVC structure (L12, L13, L14)
- `docs/mvc.md`: explain Model / View / Controller **for this project** — Model = repositories (Mongoose models from B3), View = the React client consuming JSON, Controller = Express handlers. Include a request-flow diagram showing where validation, auth, services and repositories sit.
- Create folders: `controllers/`, `services/`, `validators/`, `middleware/`, keep `repositories/` and `routes/`.
- **L13 — controllers & business logic:**
  - Controllers are **thin**: read `req`, call a service, send via `sendSuccess`. No business rules.
  - `services/product.service.js`: filtering/sorting/pagination orchestration, slug generation + uniqueness, discount calculation, stock helpers.
  - `services/pricing.service.js`: pure functions implementing **contract §8** (`subtotal`, `shipping`, `codFee`, `total`, `amountToFreeShipping`). Constants from `config.pricing`. **Unit-test it** (`node:test`) — it is pure, so tests are easy and valuable (B3 reuses it for orders).
  - `utils/catchAsync.js` wraps async controllers.
- **L14 — CRUD using MVC:**
  - Refactor Products & Categories out of the B1 route files into controller/service/repository without changing any behaviour (API tests must still pass).
  - Formalize the repository interface (S1) with JSDoc typedefs in `repositories/README.md`.
  - **New resources, built fully through MVC** (JSON store at `data/store/`):
    - `POST /newsletter` — body `{email}`; idempotent (`201` new / `200` existing).
    - `POST /contact` — body `{name,email,message}`; `201`.
    - `POST /pricing/quote` — body `{items:[{productId,qty}], paymentMethod}`; loads products, uses `pricing.service`, returns contract's Pricing quote; `422` for unknown products/qty ≤ 0.

### Step 3 — Routing & REST (L15)
- `routes/index.js` mounts every resource router under `/api/v1`. One router per resource using `express.Router()`.
- `router.param('slug', …)` to pre-load and 404 early where it reduces duplication; `router.route('/').get().post()` chaining style where appropriate.
- Add **placeholder nested route** file for reviews: `/products/:productId/reviews` with `mergeParams: true` returning `501` — B3 fills it in. (Shows nested routing without building the feature.)
- `docs/rest-conventions.md`: resource naming, plural nouns, idempotency of PUT/PATCH/DELETE, status code table, pagination `meta`, versioning (`/api/v1`), why `PATCH` over `PUT`.
- STRETCH: serve Swagger UI at `/api/docs` generated from the contract (`swagger-ui-express` + a hand-written OpenAPI file).

### Step 4 — Middleware (L16, L17)
Build each as a small file in `src/middleware/`:

| File | Kind | Job |
|---|---|---|
| `requestId.js` | custom, app-level | `req.id = randomUUID()`; set `X-Request-Id` header (used in error envelope) |
| `requestLogger.js` | custom, app-level | Logs method, URL, status, duration using `res.on('finish')`. Also use `morgan` (dev format) and explain the difference |
| `security.js` | third-party | `helmet()`, `cors(config.cors)`, `compression()` |
| `validate.js` | custom, route-level | `validate({ body, query, params })` factory taking zod schemas; on failure → `AppError` 422 with `details[]` |
| `rateLimit.js` | third-party | `express-rate-limit` factory; presets: `general` (100/min), `strict` (5/min for `/newsletter`, 3/min for `/contact`) — B3/B4 reuse for `/ai` and `/auth` |
| `auth.js` | **seam (S2)** | `protect` (stub) + `restrictTo(...roles)` (real check) — see below |
| `notFound.js` | custom | Any unmatched route → `AppError(404, NOT_FOUND)` |
| `errorHandler.js` | error-handling | see Step 5 |

- **L16 — basics:** show app-level (`app.use`), router-level (`router.use`), built-in (`express.json({ limit: '10kb' })`, `express.static`), third-party and custom middleware. Document the difference in `docs/middleware.md`.
- **L17 — chaining:** document and demonstrate **order matters**. Required chains in routes:
  - Public write: `rateLimit.strict → validate(schema) → controller`
  - Admin write: `protect → restrictTo('manager','admin') → validate(schema) → controller`
  - Admin delete: `protect → restrictTo('admin') → controller`
  - Show `next()`, `next(err)`, and early-return patterns. Add a one-line comment at each chain explaining why it is ordered that way. Rule used here: **cheapest and most restrictive check first** — rate limit and auth/role checks run before body validation, so anonymous callers get no hints about the schema and we don't waste work validating requests that will be rejected anyway. Public routes have no auth, so for them the order is `rateLimit → validate → controller`. Justify this in `docs/middleware.md`.

**The auth seam (S2) — read carefully:**
```js
// middleware/auth.js  (B2)
export const protect = (req, res, next) => {
  if (config.server.env === 'production') return next(new AppError(501, 'UNAUTHENTICATED', 'Auth not implemented'));
  const role = req.get('x-dev-role') ?? 'customer';          // 'customer' | 'manager' | 'admin'
  req.user = { id: DEV_USER_IDS[role], role };
  next();
};
export const restrictTo = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role) ? next() : next(new AppError(403, 'FORBIDDEN', 'Not allowed'));
```
- Wire `protect` / `restrictTo` into **every route that will ultimately be private** (contract §5), including B1's product/category writes and CSV export. B4 will replace only the inside of `protect`.
- Comment clearly: `// STUB until B4 — replaced by JWT verification`.

### Step 5 — Error handling (L18)
- `utils/AppError.js`: `class AppError extends Error { constructor(status, code, message, details) }`, `isOperational = true`.
- `errorHandler.js` (4-arg middleware, registered **last**):
  - Operational `AppError` → contract error envelope (+ `requestId`).
  - Unknown/programmer errors → log full stack, respond `500 INTERNAL_ERROR` with a generic message in production; include stack only when `NODE_ENV=development`.
  - **Mapping layer** (implement now even though not triggered yet, and unit-test with fake error objects): `err.name === 'CastError'` → `400 INVALID_ID`; `'ValidationError'` (Mongoose) → `422 VALIDATION_ERROR` with `details`; `err.code === 11000` → `409 CONFLICT` (field from `keyValue`); `'JsonWebTokenError'` → `401 UNAUTHENTICATED`; `'TokenExpiredError'` → `401 TOKEN_EXPIRED`; body-parser `entity.parse.failed` → `400 BAD_REQUEST`; `entity.too.large` → `413`.
- Remove every ad-hoc error response from B1/B2 code: **controllers throw `AppError`, `catchAsync` forwards, handler responds** (S5).
- Register order in `app.js`: `requestId → requestLogger → security → express.json → routes → notFound → errorHandler`.
- `docs/error-handling.md`: operational vs programmer errors, the table of codes, a flow diagram.

### Step 6 — Database decision & environment (L19, L20)
- **L19 — `docs/adr/0001-why-mongodb.md`** (ADR format: Context, Options, Decision, Consequences). Compare SQL vs NoSQL **for this catalogue**:
  - Jewellery attributes vary (rings have sizes, kadas have diameters, combos contain products) → flexible documents.
  - Orders benefit from **embedded snapshots** (price/name frozen at purchase).
  - Read-heavy catalogue, JSON in/out end-to-end.
  - **Honest costs:** no joins (use `$lookup`/references), transactions are heavier, schema discipline moves into Mongoose.
- **L20 — `docs/mongodb-setup.md`** with step-by-step: create an Atlas free cluster, DB user, IP allowlist, get the connection string; **local alternative** via installed `mongod` *or* `docker-compose.yml` (`mongo:7`, volume, port 27017); `mongosh` and Compass basics; explain databases / collections / documents / BSON / `ObjectId`.
- `.env.example`: `DB_TARGET`, `MONGODB_URI`, `MONGODB_URI_LOCAL`, `DB_NAME`.
- `scripts/db-ping.js` (uses the official `mongodb` driver, **dev dependency only**): connects using `config.db`, runs `ping`, lists collections, prints server version, closes cleanly, proper exit codes. `npm run db:ping`.

---

## 4. Endpoints you own

`POST /newsletter` · `POST /contact` · `POST /pricing/quote` — plus the architecture changes to everything B1 built.

## 5. Seams you must leave clean (for B3 and B4)

- Repository interface documented and followed by *all* repos (S1).
- `protect` / `restrictTo` wired on all private routes, stub marked (S2).
- `errorHandler` already maps Mongoose/JWT errors (B3/B4 won't touch it).
- `rateLimit` presets exported for reuse.
- `config` has clear places for `db`, `jwt`, `ai` groups; `constants.js` holds enums and `DEV_USER_IDS`.
- `pricing.service` is pure, tested, and reusable for orders.
- Leave the `/products/:productId/reviews` placeholder router returning `501`.

## 6. Frontend integration

Remove `pricing`, `newsletter`, `contact` from `VITE_MOCK_GROUPS`. Test: footer newsletter form, contact page, checkout summary (pricing quote). Confirm error states render the contract's error shape (e.g. send an invalid email). Update `client/.env.example`.

## 7. Definition of Done (B2)

- [ ] Overview §8 checklist ✔
- [ ] No behaviour regressions: all B1 `.http` tests still pass
- [ ] Zero ad-hoc error JSON in the codebase; all errors flow through `errorHandler`
- [ ] Config fails fast with a clear message when `.env` is wrong (demonstrate once in the PR)
- [ ] `grep -rn "process.env" src | grep -v config/` returns nothing
- [ ] `pricing.service` unit tests pass; `errorHandler` mapping tests pass
- [ ] `npm run db:ping` succeeds against Atlas **and** local
- [ ] Docs written: `mvc.md`, `middleware.md`, `rest-conventions.md`, `error-handling.md`, `env-and-config.md`, `mongodb-setup.md`, `adr/0001-why-mongodb.md`
- [ ] `// [L12]`…`// [L30]` tags present; map rows ticked
- [ ] Handoff entry for Tanishq written (include the Atlas connection steps that worked)

## 8. Don'ts

- Don't connect the application to MongoDB or install Mongoose (B3).
- Don't implement JWT/bcrypt/cookies (B4). The stub is the only auth code you write.
- Don't change the response/error shapes — the contract is fixed.
- Don't read `process.env` outside `src/config/`.
