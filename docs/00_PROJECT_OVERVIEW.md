# Metal मसाला — Project Overview

> **Read this first.** Then read `01_API_CONTRACT.md`, then the doc for your phase.
> Audience: the four team members **and the AI agents** that build each phase.

---

## 0. How these docs fit together

| File | Purpose | Who reads it |
|---|---|---|
| `00_PROJECT_OVERVIEW.md` | Vision, stack, workflow, conventions, cross-phase rules | Everyone, always |
| `01_API_CONTRACT.md` | The single source of truth for endpoints, JSON shapes, errors, socket events | Everyone, always |
| `02_FRONTEND_PHASE.md` | Full spec for the frontend phase (design + pages + mock API) | Frontend builder |
| `03_BACKEND_PHASE_1_MEHAK.md` | Backend phase 1 — Node/HTTP foundations, Express core, catalogue CRUD | Mehak |
| `04_BACKEND_PHASE_2_NITESH.md` | Backend phase 2 — MVC, routing, middleware, errors, config, DB setup | Nitesh |
| `05_BACKEND_PHASE_3_TANISHQ.md` | Backend phase 3 — MongoDB, Mongoose, aggregation, cart/orders, AI | Tanishq |
| `06_BACKEND_PHASE_4_AAKASH.md` | Backend phase 4 — Auth, JWT, RBAC, events, sockets, final integration | Aakash |
| `07_IMPLEMENTATION_MAP.md` | **"What was built and how"** — every lecture concept mapped to a feature + how it is implemented. Living document, updated by each phase | Everyone (update it!) |

**Put all of these in `/docs` at the repo root.**

### Copy-paste kickoff prompt for any agent

```
You are building <PHASE NAME> of the project "Metal मसाला".

1. Read docs/00_PROJECT_OVERVIEW.md, docs/01_API_CONTRACT.md and docs/<YOUR PHASE FILE> completely before doing anything.
2. Look at `git log` and the "Handoff log" at the bottom of docs/07_IMPLEMENTATION_MAP.md to see what already exists. Do not rewrite finished work unless your phase doc explicitly says so.
3. If anything is ambiguous, or conflicts with the API contract, ASK ME before coding.
4. Show me a short plan (files you will create, in order) and wait for my OK.
5. Build lecture by lecture in the order given in your phase doc. Mark every spot that demonstrates a curriculum concept with a comment like `// [L17] Middleware chaining: ...`.
6. When finished: tick your rows in docs/07_IMPLEMENTATION_MAP.md (status + real file paths), add a Handoff log entry, append the prompts you used to docs/ai/PROMPT_LOG.md, and run the Definition of Done checklist from your phase doc.
```

---

## 1. The product

**Metal मसाला** is a D2C e-commerce store selling handcrafted Indian jewellery — jhumkas, oxidized metalwork, chokers, kadas, payals — styled for everyday modern fashion.

- **Audience:** Gen-Z and millennials in India (college, first jobs, weddings-as-guests). Mobile-first, UPI-first, Instagram-trained eyes.
- **Brand voice:** confident, playful Hinglish *sprinkled*, never forced. Plain verbs on buttons ("Add to bag", "Place order"). Specific beats clever.
- **Primary job of the site:** get a visitor from "ooh" to "order placed" in as few steps as possible, while the aesthetic does the selling.
- **Currency:** INR (₹). Prices are **tax-inclusive** (GST included in MRP).

### Scope tiers (used in every phase doc)

| Tier | Meaning |
|---|---|
| **MUST** | Required for the phase to be "done". Needed for the curriculum mapping. |
| **SHOULD** | Do it if time allows; makes the capstone noticeably better. |
| **STRETCH** | Only after everything else is merged and green. |

### Feature list (whole project)

- **Storefront:** home, shop with filters/search/sort, product page, cart drawer + page, 3-step checkout, order confirmation, order tracking.
- **Accounts:** register/login, profile, address book, wishlist, order history, reviews.
- **Admin / manager:** dashboard with analytics, product CRUD, order status management, user & role management.
- **Live features:** real-time order tracking, "N people viewing this piece", admin new-order alerts, drop announcements.
- **AI:** "Masala Stylist" chat that recommends products from the real catalogue; AI product-copy generator for admins.

---

## 2. Team, phases and workflow

| Phase | Owner | Lectures (from curriculum PDF) | Theme | Branch |
|---|---|---|---|---|
| **Frontend** | *Anyone (TBD)* | — (project UI; client side of L41 prep) | Storefront + admin UI running on a mock API | `frontend/phase-1` |
| **Backend 1 (B1)** | **Mehak** | **L1 – L11** (11 lectures) | Node & HTTP foundations, Express core, Products/Categories CRUD | `backend/phase-1-foundation` |
| **Backend 2 (B2)** | **Nitesh** | **L12 – L20, L29, L30** (11 lectures) | MVC, routing/REST, middleware, errors, DB choice & Mongo setup, env/config | `backend/phase-2-architecture` |
| **Backend 3 (B3)** | **Tanishq** | **L21 – L28, L42 – L44** (11 lectures) | Mongo queries/aggregation/indexing, Mongoose, DB-backed REST (cart/orders/reviews/analytics), AI | `backend/phase-3-data-ai` |
| **Backend 4 (B4)** | **Aakash** | **L31 – L41** (11 lectures) | Auth, JWT, refresh tokens, RBAC, EventEmitter, WebSockets, Socket.IO, final integration | `backend/phase-4-auth-realtime` |

- **L45 (Capstone)** is the whole project; nothing is assigned to a single person.
- The split is **equal by lecture count (11 each)**. L29/L30 (env & dotenv) sit with B2 and the three AI lectures (L42–44) sit with B3 on purpose — see "dependency reasoning" below.
- Owner order (Mehak → Nitesh → Tanishq → Aakash) is the **execution order**. If the team changes the order, only the "seams" in §5 need re-checking.

**Dependency reasoning:** Env/config (L29–30) is needed *before* any DB connection or JWT secret exists, so it lives in B2. The AI Stylist needs catalogue queries (`$text`, filters), so it lives with the person who owns the database layer (B3). Auth → events → sockets is a straight dependency chain, so it all lives in B4.

### Workflow

```
Frontend ──merge──▶ B1 Mehak ──merge──▶ B2 Nitesh ──merge──▶ B3 Tanishq ──merge──▶ B4 Aakash ──▶ DONE
 (mock API)         (real catalogue)    (architecture)       (database, orders)     (auth, realtime)
```

1. The next person **starts only after the previous branch is merged into `main`**.
2. Start: `git checkout main && git pull && git checkout -b <your-branch>`.
3. Commit small and often (Conventional Commits, see §6).
4. Finish: run your Definition of Done → update `07_IMPLEMENTATION_MAP.md` → open a PR to `main` → another teammate skims it → merge.
5. Tell the next person "main is ready" and share your handoff entry.

---

## 3. Tech stack & decisions

| Layer | Choice | Notes |
|---|---|---|
| Frontend | **React 18 + Vite** (JavaScript/JSX) | Separate SPA in `client/` |
| Routing | React Router v7 | |
| Styling | **Tailwind CSS** + CSS variables for design tokens | |
| Motion | **Framer Motion** (`motion`) | Used sparingly, see frontend doc |
| Client state | Zustand | cart, auth session, UI |
| Server state | TanStack Query | caching, loading/error states |
| HTTP | Axios | one configured instance |
| Forms | React Hook Form + Zod | |
| Mock API | **MSW** (Mock Service Worker) | Frontend phase only; switched off progressively |
| Backend runtime | **Node.js 22 LTS+** | `engines` set in `package.json` |
| Backend framework | **Express 4.x** | Course-aligned; Express 5 upgrade is out of scope |
| Modules | **ES Modules** (`"type": "module"`) | one deliberate CommonJS file for the L4 demo |
| Database | **MongoDB** (Atlas + local) via **Mongoose 9** | |
| Auth | `jsonwebtoken` + `bcryptjs` + `cookie-parser` | bcryptjs = pure JS, no native build pain on Windows |
| Realtime | `socket.io` (+ `ws` for the L39 demo only) | |
| Request validation | `zod` | Mongoose validators are the *second* layer |
| Security/ops | `helmet`, `cors`, `express-rate-limit`, `compression`, `morgan` | |
| AI | Provider-agnostic adapter (`anthropic`/`openai`/`gemini`/`mock`) | `mock` is the default so demos never break |
| Testing | `node:test` + `supertest` (SHOULD), `.http`/Postman files (MUST) | |

### Decision record: React + Vite vs Next.js

**Decision: React + Vite + Tailwind.** Reasons:

1. **The curriculum is about a standalone Express/REST/Socket.IO backend**, finishing with a "full-stack integration" lecture. A clean client/server split is what is being demonstrated. Next.js adds its own server layer (route handlers, server actions) that blurs this and tempts agents to put backend logic in the frontend.
2. **The frontend is built first, with no backend.** A plain SPA + MSW is the cleanest way to mock a REST contract and later switch to the real thing with zero changes to the data layer.
3. **Socket.IO needs a long-lived server.** Next.js on serverless hosting makes that awkward; Express does not.
4. **Honest trade-off:** SSR/SEO is weaker in an SPA. Mitigation: per-route `<title>` and Open Graph tags via `react-helmet-async`. Revisit only if the team later wants to deploy for real search traffic.

### Other decisions already made (do not re-litigate without telling the team)

- **Payments:** no real gateway. Methods are `cod`, `upi_mock`, `card_mock`. Mock methods mark the order `paid` instantly with a fake transaction id. (Razorpay test mode = STRETCH.)
- **Guest cart:** lives in the browser (Zustand + localStorage). **Cart API and checkout require login.** On login the client calls `POST /cart/merge`.
- **Images:** products store image **URLs/paths** only. No upload pipeline (Cloudinary = STRETCH).
- **Pricing rules** (config-driven, see §7): shipping ₹79, free at subtotal ≥ ₹999; COD fee ₹49; GST is already inside the price (no separate tax line).
- **Roles:** `customer`, `manager`, `admin`.

---

## 4. Repository layout

One repo, two apps.

```
metal-masala/
├── README.md                     # root readme (skeleton in FE phase, finished in B4)
├── docs/                         # ← these files
│   ├── 00_… 07_*.md
│   ├── ai/                       # PROMPT_LOG.md (+ AI_TOOLS.md, AI_DRIVEN_DEVELOPMENT.md in B3)
│   ├── adr/                      # architecture decision records (B2+)
│   └── *.md                      # per-phase notes (architecture.md, mvc.md, data-model.md …)
├── client/                       # React app  (see 02_FRONTEND_PHASE.md for internals)
│   ├── .env.example
│   └── src/
└── server/
    ├── package.json
    ├── .env.example
    ├── docker-compose.yml        # B2 (local Mongo)
    ├── api-tests/                # .http files + Postman collection (grows each phase)
    ├── data/
    │   ├── seed/                 # products.json, categories.json, … (copied from client mocks in B1)
    │   └── store/                # runtime JSON stores — GITIGNORED (B1/B2 only)
    ├── queries/                  # mongosh playbooks (B3)
    ├── scripts/                  # seed.js, export-products.js, db-ping.js, ws-demo-*.js
    ├── test/
    └── src/
        ├── server.js             # entry: http server, DB connect, sockets, graceful shutdown
        ├── app.js                # Express app: middleware, routes, error handling
        ├── native/server.js      # raw `http` server demo (B1)
        ├── config/               # index.js (env), constants.js, db.js, permissions.js
        ├── routes/               # one router per resource + index.js
        ├── controllers/
        ├── services/             # business logic (+ services/ai/)
        ├── repositories/         # json/ (B1–B2) → mongo/ (B3)
        ├── models/               # Mongoose models (B3+)
        ├── middleware/           # requestId, logger, validate, auth, rateLimit, notFound, errorHandler
        ├── validators/           # zod schemas
        ├── events/               # bus.js + listeners/ (B4)
        ├── sockets/              # Socket.IO setup (B4)
        └── utils/                # AppError, catchAsync, response, jwt, formatters.cjs …
```

**Ports:** API `4000`, client dev server `5173`. Vite proxies `/api` and `/socket.io` to `http://localhost:4000`.

---

## 5. Cross-phase seams (the "contracts between people")

Because phases are built by different people (and different agents) one after another, these seams are **mandatory**. They let each person work without editing the previous person's code.

### S1 — Repository interface (B1 → B2 → B3)
Services only talk to repositories with this shape:

```js
findMany({ filter, sort, page, limit })  // -> { items, total }
findById(id)        findBySlug(slug)     // -> doc | null
create(data)        update(id, patch)    // -> doc
remove(id)                               // -> boolean
```
- B1 writes JSON-file implementations in `repositories/json/` **already in this shape**.
- B2 formalises it and moves logic into services.
- B3 writes `repositories/mongo/` with the **same method names** and flips the default (`DATA_STORE=mongo`). Controllers and services do not change.

### S2 — Auth seam (B2 → B3 → B4)
- **B2** creates `middleware/auth.js` exporting `protect` and `restrictTo(...roles)`.
  - `protect` is a **stub**: it sets `req.user = { id, role }` from the header `x-dev-role` (`customer` default | `manager` | `admin`) using the fixed dev user ids from the contract. It **refuses to run when `NODE_ENV=production`**.
  - `restrictTo` already contains the **real** role check (`req.user.role` in allowed roles → else 403).
- Every route that will ultimately be private is **already wired** with `protect` / `restrictTo` from the moment it is written.
- **B3** seeds the three dev users in MongoDB with the fixed ids so references (orders, carts, reviews) are valid.
- **B4** replaces only the *inside* of `protect` with real JWT verification and deletes the header stub. **No route files need to change.**

### S3 — Event hooks (B3 → B4)
B3 leaves a marker comment at each place an event should fire, e.g. `// EVENT HOOK: order.placed { order }`. B4 replaces markers with `bus.emit(...)`. Marker list is in the B3 doc.

### S4 — Progressive integration (every phase)
The client reads `VITE_MOCK_GROUPS` (comma-separated). A group listed there is served by MSW; anything **not** listed passes through to the real API.
Groups: `products, categories, pricing, newsletter, contact, reviews, cart, orders, admin, ai, auth, users`.
After finishing your phase, **remove your groups** from `client/.env` / `.env.example`, test the UI against your real endpoints, and fix mismatches **on the server** (the contract wins) — or change the contract doc *with the team's agreement*.

### S5 — Response envelope & errors
Defined in the contract. B1 ships a tiny `utils/response.js` (`sendSuccess`). B2 owns `AppError`, `catchAsync`, and the central `errorHandler`; from B2 onward **no route sends its own error JSON**.

### S6 — Config
B1 creates `src/config/index.js` with `PORT`, `NODE_ENV`, `CLIENT_ORIGIN`. B2 upgrades it (dotenv + zod validation). From B2 onward **`process.env` is read only inside `src/config/`**.

### S7 — Seed data & dev ids
- Frontend phase produces the catalogue in `client/src/mocks/data/*.json`, shaped exactly like the contract. B1 copies it into `server/data/seed/`.
- Fixed dev user ids (defined in `config/constants.js` as `DEV_USER_IDS`):
  `customer 65f0c0ffee0000000000a001`, `manager 65f0c0ffee0000000000a002`, `admin 65f0c0ffee0000000000a003`.

---

## 6. Conventions

**Code**
- ESLint + Prettier in both apps. 2-space indent, single quotes, semicolons.
- Files: `product.controller.js`, `order.service.js`, `user.model.js`, `product.routes.js`. React components `PascalCase.jsx`; hooks `useThing.js`.
- Async/await only. No callbacks, no `.then` chains in app code.
- Controllers are thin (parse → call service → respond). Business rules live in services.
- Never commit secrets. `.env` is gitignored; `.env.example` is always up to date.
- Comments explain *why*. Keep them short.

**Concept tags (important for the viva and for `07_IMPLEMENTATION_MAP.md`)**
Wherever a curriculum concept is demonstrated, add a one-line tag:
```js
// [L17] Middleware chaining: validate → protect → restrictTo → controller
```
This makes the whole project greppable: `grep -rn "\[L" server/src`.

**Git**
- Branch names as in §2. Commits: `feat(b2): add centralized error handler`, `fix(b1): …`, `docs: …`, `chore: …`.
- PR description must contain: what changed, how to run, which map rows were ticked, anything the next person must know.

**Handoff**
Each phase ends with an entry in the **Handoff log** at the bottom of `07_IMPLEMENTATION_MAP.md`: what's done, how to run it, known issues, what the next person should start with.

**AI usage log**
`docs/ai/PROMPT_LOG.md` — append the 3–10 most important prompts you used, and one line on what worked or didn't. This feeds lectures L42/L44.

---

## 7. Environment variables

Server (`server/.env.example`). Introduced in the phase shown; **only `src/config/` reads them**.

| Variable | Example / default | Phase |
|---|---|---|
| `NODE_ENV` | `development` | B1 |
| `PORT` | `4000` | B1 |
| `CLIENT_ORIGIN` | `http://localhost:5173` | B1 |
| `LOG_LEVEL` | `dev` | B2 |
| `DATA_STORE` | `json` (B1–B2) → `mongo` (B3+) | B1 |
| `DB_TARGET` | `atlas` \| `local` | B2 |
| `MONGODB_URI` | Atlas SRV string | B2 |
| `MONGODB_URI_LOCAL` | `mongodb://127.0.0.1:27017/metal_masala` | B2 |
| `DB_NAME` | `metal_masala` | B2 |
| `FREE_SHIPPING_THRESHOLD` | `999` | B2 |
| `SHIPPING_FEE` | `79` | B2 |
| `COD_FEE` | `49` | B2 |
| `LOW_STOCK_THRESHOLD` | `5` | B2 |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | `60000` / `100` | B2 |
| `AI_PROVIDER` | `mock` \| `anthropic` \| `openai` \| `gemini` | B3 |
| `AI_API_KEY` | *(secret)* | B3 |
| `AI_MODEL` | *(provider model name — never hard-code)* | B3 |
| `DEV_SEED_PASSWORD` | `ChangeMe#123` | B4 |
| `BCRYPT_ROUNDS` | `12` | B4 |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | *(long random strings)* | B4 |
| `JWT_ACCESS_EXPIRES` / `JWT_REFRESH_EXPIRES` | `15m` / `7d` | B4 |
| `COOKIE_SECURE` | `false` dev, `true` prod | B4 |

Client (`client/.env.example`): `VITE_API_URL=/api/v1`, `VITE_SOCKET_URL=http://localhost:4000`, `VITE_MOCK_GROUPS=all`, `VITE_DEV_ROLE=` (optional; sends `x-dev-role` until B4 removes the stub).

---

## 8. Definition of Done (applies to every phase)

- [ ] Runs from a clean clone: install → copy `.env.example` → one command to start.
- [ ] Every endpoint you own matches `01_API_CONTRACT.md` (paths, status codes, JSON shapes, error codes).
- [ ] `api-tests/` has requests for every endpoint you added (and they pass).
- [ ] Every lecture in your phase has visible, tagged evidence in the code (`// [Lxx]`) and a ticked row in `07_IMPLEMENTATION_MAP.md` with real file paths.
- [ ] Seams in §5 respected (nothing from a previous phase rewritten unnecessarily).
- [ ] Client tested against your real endpoints with your mock groups removed.
- [ ] No secrets committed, `.env.example` updated, lint passes.
- [ ] Handoff entry written, prompts logged, PR opened.

---

## 9. Assumptions & open questions

**Assumptions made while writing these docs** (change them if wrong — and tell the team):
1. Owner order is Mehak → Nitesh → Tanishq → Aakash.
2. Frontend is built by one person before B1 starts and merged to `main`.
3. Team has (or can create) a free MongoDB Atlas cluster.
4. An LLM API key may not be available to everyone → AI feature must work with `AI_PROVIDER=mock`.

**Open questions for the team (non-blocking):**
- Who builds the frontend? (It is the largest single chunk — consider that when choosing.)
- Real product photos available, or generated placeholder art? (Frontend doc handles both.)
- Is the project going to be deployed? (If yes: Vercel/Netlify for client, Render/Railway for server, Atlas for DB. Cookie settings change — see B4.)
