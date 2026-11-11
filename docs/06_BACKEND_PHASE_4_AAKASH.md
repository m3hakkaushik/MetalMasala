# Backend Phase 4 (B4) — Authentication, Authorization, Realtime & Integration

> **Owner:** Aakash · **Branch:** `backend/phase-4-auth-realtime` · **Lectures:** L31 – L41 (11)
> **Starts after:** B3 merged to `main` · **This is the final phase → project completes.**
> Read `00_PROJECT_OVERVIEW.md` and `01_API_CONTRACT.md` first. Use the kickoff prompt in the overview.

**Mission:** make the app **secure and live**. Replace the auth stub with real JWT authentication, enforce RBAC across the API, decouple side effects with an EventEmitter bus, add real-time features with Socket.IO, and finish the **full-stack integration** — remove every mock and verify the whole product end to end.

---

## 1. What exists before you

From B1–B3: complete REST API on MongoDB (catalogue, reviews, cart, orders, admin orders, analytics, AI), centralized errors (already mapping JWT errors), validated config, middleware incl. `protect`/`restrictTo` (**stub** `protect`), rate-limit presets, User schema (password `select:false`, role, isActive, passwordChangedAt, addresses, wishlist), dev users with fixed ids, four `EVENT HOOK` markers, `// TODO(B4)` notes.

## 2. What you must deliver (summary)

- Auth: register, login, refresh (rotation + reuse detection), logout, me, change password.
- Real `protect`; RBAC with permission map; user management endpoints; user self-service (profile, addresses, wishlist).
- Event bus + listeners; Socket.IO (3 namespaces, rooms, JWT handshake); WebSocket concept demo.
- Client-side auth + socket integration verified; **all MSW groups removed**.
- Root `README.md`, `docs/authz.md`, `docs/websockets.md`, `docs/PROJECT_REVIEW.md`, finished `07_IMPLEMENTATION_MAP.md`.

---

## 3. Build order

### Step 1 — Config & User model additions (prep)
- Extend `config` with the `auth` group: `jwt.accessSecret`, `jwt.refreshSecret`, `jwt.accessExpires`, `jwt.refreshExpires`, `bcryptRounds`, `cookie.secure`, `devSeedPassword`. zod rules: secrets ≥ 32 chars, access ≠ refresh secret. Update `.env.example`.
- Install `bcryptjs`, `jsonwebtoken`, `cookie-parser`. Register `cookie-parser` in `app.js`; ensure CORS has `credentials: true` and an explicit origin (never `*`).

### Step 2 — Passwords (L33)
- In `user.model.js` add a **`pre('save')` hook**: if `password` modified → `bcrypt.hash(password, config.bcryptRounds)`; set `passwordChangedAt` (minus 1 s) when not new.
- **Instance method** `comparePassword(candidate)`. Fetch with `.select('+password')` only inside the auth service.
- Password policy via zod (contract §4.8). Never log request bodies on auth routes; make `requestLogger` skip bodies entirely.
- Update `scripts/seed.js`: seed the 3 dev users with `config.devSeedPassword` **through `User.create`** (so the hook hashes) — e.g. `aarav@example.com` (customer), `manager@metalmasala.in`, `admin@metalmasala.in`. Same fixed ids as before.
- Short note in `docs/authz.md`: why hashing not encryption, what cost factor means, why salts are built into bcrypt.

### Step 3 — JWT & sessions (L34, L35)
- `src/utils/jwt.js`: `signAccess(user)` (claims: `sub`, `role`; HS256; `exp` from config), `signRefresh(user, familyId)`, `verifyAccess`, `verifyRefresh`. Explain **decode vs verify** in a comment.
- **`RefreshToken` model** (new): `user`, `tokenHash` (SHA-256 of the token — never store raw), `family`, `expiresAt`, `revokedAt`, `replacedBy`, `userAgent`, `ip`. **TTL index** on `expiresAt`; index on `family`.
- **Auth service flows:**
  - `register` → create user (role forced to `customer`), issue tokens, set cookie.
  - `login` → find by normalized email, `comparePassword`, check `isActive`; **identical `UNAUTHENTICATED` error for unknown email and wrong password** (no account enumeration); rate-limit `strict` preset.
  - `refresh` → read `mm_refresh` cookie → verify → look up by hash → **rotate** (revoke old, link `replacedBy`, issue new in same `family`). If a **revoked** token is presented → **revoke the entire family** and return `401` (reuse detection).
  - `logout` → revoke the presented token, clear cookie, `204`.
  - `changePassword` → verify current, set new (hook hashes), revoke **all** refresh tokens, issue fresh pair.
- **Cookie:** name `mm_refresh`, `httpOnly: true`, `sameSite: 'lax'`, `secure: config.cookie.secure`, `path: '/api/v1/auth'`, `maxAge` = refresh lifetime. (Cross-site deployment needs `sameSite: 'none'` + `secure: true` — document it in the README.)
- Access token travels **only** in the JSON body and `Authorization` header — never in a cookie.
- **L31 Authentication** deliverable: endpoints `register, login, refresh, logout, me, password` exactly as the contract. STRETCH: `failedLoginAttempts` + `lockUntil` (lock 15 min after 5 failures); `forgot/reset-password` using `crypto.randomBytes` token (store hash, 30-min expiry) with the mail stub.

### Step 4 — Protected routes (L36)
Replace the **inside** of `protect` in `middleware/auth.js` (S2) — **no route files change**:
1. Read `Authorization: Bearer …`; missing → `401 UNAUTHENTICATED`.
2. `verifyAccess` — JWT errors flow to the existing handler (`TOKEN_EXPIRED` vs `UNAUTHENTICATED`).
3. Load the user; reject if missing or `isActive === false`.
4. Reject if `passwordChangedAt` is later than the token's `iat` (token issued before a password change).
5. `req.user = { id, role, … }` → `next()`.
- **Delete the `x-dev-role` stub** completely.
- **Route audit:** produce a table in `docs/authz.md` listing every route, its access level (contract §4/§5) and a ✔ proving the chain contains the right guards. Anything private and unprotected is a bug.

### Step 5 — Authorization & RBAC (L32, L37)
- `docs/authz.md`: authentication vs authorization; **401 vs 403**; the **permission matrix** (contract §5); ownership vs role.
- `config/permissions.js`: map of permissions → roles, e.g. `'product:write': ['manager','admin']`, `'analytics:read': ['admin']`, `'user:manage': ['admin']`. Add `requirePermission('product:write')` next to `restrictTo`; switch routes to whichever is clearer, but use **both** somewhere to show roles vs permissions.
- **Ownership checks** in services: orders (`owner` or manager+), cart/addresses/wishlist (always the caller's own), reviews delete (owner or admin). Return `403` (not `404`) when the resource exists but isn't theirs — or `404` to avoid leaking existence; **pick one and document it**.
- **Admin endpoints:** `GET /admin/users`, `PATCH /admin/users/:id/role` (admin can't demote themselves), `PATCH /admin/users/:id/status` (deactivation revokes the user's refresh tokens).
- **User self-service (fill the `users` group):** `GET/PATCH /users/me`; addresses CRUD (max 5, single default); wishlist add/remove/list.
- **RBAC test matrix** (SHOULD: automated with `supertest`): rows = endpoints, columns = public/customer/manager/admin, expecting `401/403/2xx` per contract §5. At minimum a `.http` file `api-tests/rbac.http` with the matrix.

### Step 6 — EventEmitter (L38)
- `src/events/bus.js`: `class AppEvents extends EventEmitter`, exported singleton; `setMaxListeners` set deliberately; an `errorMonitor` listener that logs listener failures so a broken listener can never crash a request.
- `src/events/events.js`: constants for event names from contract §7.
- Replace each `// EVENT HOOK` marker from B3 with `bus.emit(EVENTS.X, payload)` — emit **after** the DB write succeeds. Also emit `user.registered` from `register`.
- Listeners in `src/events/listeners/`, registered once at startup (`registerListeners()` in `server.js`):
  - `notification.listener.js` — builds email text from templates and **logs** it via a `mail.service` stub (`user.registered`, `order.placed`, `order.statusChanged`).
  - `stock.listener.js` — on `order.placed`, re-check stock levels and emit `stock.low` for items ≤ threshold.
  - `socket.listener.js` — bridges events to Socket.IO (Step 8).
- Demonstrate `on`, `once` (welcome email once), `off/removeListener`, and async listeners with try/catch. Unit-test the bus with `node:test`.

### Step 7 — WebSockets concept (L39)
- `docs/websockets.md`: HTTP vs WebSocket, the **Upgrade handshake**, frames, full-duplex, polling vs SSE vs WebSocket decision table, heartbeats/ping-pong, reconnection, why proxies/load balancers matter.
- `scripts/ws-demo-server.js` + `scripts/ws-demo-client.js` using the `ws` package: echo, broadcast to all clients, heartbeat ping/pong. `npm run ws:demo`. Demo only — not part of the app server.
- End the doc with *why the app uses Socket.IO instead* (rooms, namespaces, auto-reconnect, fallbacks, auth middleware).

### Step 8 — Socket.IO (L40)
- `src/sockets/index.js` exports `initSockets(httpServer)`; `server.js` creates `http.createServer(app)` and attaches `io` to the **same server/port**. CORS: same origin config, `credentials: true`.
- **Namespaces & events exactly as contract §6:**
  - `/` (public): `product:join/leave` → rooms `product:<slug>`, broadcast `viewers:count` (track counts per room; decrement on `disconnect`/`leave`); server-side `drop:announce` broadcast.
  - `/account` (JWT): `io.use` middleware reads `socket.handshake.auth.token` → `verifyAccess` → attaches user; auto-join `user:<id>`; `order:subscribe` checks ownership then joins `order:<id>`.
  - `/admin` (JWT + manager/admin): same handshake + role check; joins `admins`; receives `order:new`, `order:status`, `stock:low`; `drop:publish` → permission check → emits `drop:announce` on `/`.
- `socket.listener.js` (from Step 6) turns bus events into the emits above.
- **Client integration** (`client/src/hooks/useSocket.js`, `useOrderLive.js`): one managed socket per namespace, token passed in `auth`, reconnect with fresh token after refresh, cleanup on unmount.
  - Order detail page: replace the mock timer with real `order:status` events (timeline animates when status changes).
  - Product page: "N people viewing" badge from `viewers:count`.
  - Admin: toast on `order:new` / `stock:low`; a small "Announce a drop" form emits `drop:publish`; storefront shows a dismissible banner on `drop:announce`.
- Handle: token expiry on handshake (`connect_error` → refresh → reconnect), server restart, tab sleep.

### Step 9 — Full-stack integration & project review (L41)
- Set `VITE_MOCK_GROUPS=` (empty) in `client/.env.example`; remove `VITE_DEV_ROLE` handling; **exclude MSW from production builds** (dynamic import only when `VITE_MOCK_GROUPS` is non-empty).
- Verify the client's refresh interceptor against the real `/auth/refresh` (expire a token manually and watch it recover; kill the cookie and confirm redirect to `/login`).
- Guest cart → login → `POST /cart/merge` verified.
- **End-to-end manual script** in `docs/PROJECT_REVIEW.md`: register → browse/filter → product (viewers badge with two tabs) → bag → checkout (each payment method) → live status updates from the admin panel → cancel → review → wishlist → AI stylist → admin analytics → role change → RBAC denial.
- Cross-origin checks: CORS, cookie `SameSite`, Socket.IO CORS. If deploying: client on Vercel/Netlify, API on Render/Railway, DB on Atlas; set `CLIENT_ORIGIN`, `COOKIE_SECURE=true`, `sameSite:'none'`.
- Security pass: `helmet` on, rate limits on `/auth` and `/ai`, no secrets in git (`git log -p | grep -i secret` sanity check), dependency audit (`npm audit`) with notes.
- **Root `README.md`** (final): what it is, screenshot(s), architecture diagram, tech stack, setup (client + server + Atlas/local), env table, scripts, folder map, API overview linking the contract, demo accounts, how the AI features work and what `mock` mode does, team and phase credits.
- `docs/PROJECT_REVIEW.md`: checklist that **every lecture L1–L44 has evidence** (generated from `07_IMPLEMENTATION_MAP.md`, all ✅), known limitations, future work, demo script (5-minute walkthrough).
- Finish `07_IMPLEMENTATION_MAP.md` — every row ✅ with real file paths; Frontend rows also ✅.
- `docs/ai/PROMPT_LOG.md`: add your prompts.

---

## 4. Endpoints you own

All `/auth/*` · all `/users/me*` · `GET /admin/users` · `PATCH /admin/users/:id/role|status` · Socket.IO namespaces `/`, `/account`, `/admin`.

## 5. Seams you consume (verify, don't rewrite)

- `protect` inside only (S2) — route files untouched.
- `EVENT HOOK` markers → `bus.emit` (S3).
- `errorHandler` already maps JWT errors; just confirm.
- `rateLimit` presets for `/auth/*`.
- Ownership logic in services (B3) — extend, don't replace.

## 6. Frontend integration

Remove **all** remaining mock groups (`auth`, `users`). Confirm: login/register/logout, silent refresh, protected pages, role-guarded admin pages, account area (profile/addresses/wishlist), live order timeline, viewers badge, admin toasts, drop announcements.

## 7. Definition of Done (B4 = project done)

- [ ] Overview §8 checklist ✔
- [ ] `grep -rn "x-dev-role\|DEV_ROLE" client server` returns nothing in code (docs may mention history)
- [ ] Every private route is protected (route audit table complete); RBAC matrix passes
- [ ] Passwords hashed (inspect DB), no password/token in logs or responses
- [ ] Refresh rotation + reuse detection demonstrated (`api-tests/auth.http` with the reuse scenario)
- [ ] Deactivated user and post-password-change tokens are rejected
- [ ] Events fire after DB writes; a throwing listener doesn't break the request
- [ ] Sockets: unauthenticated clients are rejected on `/account` and `/admin`; ownership enforced on `order:subscribe`; viewer counts correct with multiple tabs
- [ ] **No MSW in the production bundle**; client runs fully on the real API
- [ ] Root README + PROJECT_REVIEW complete; `07_IMPLEMENTATION_MAP.md` fully ✅
- [ ] `// [L31]`…`// [L41]` tags present
- [ ] Final PR merged to `main`; tag `v1.0.0`

## 8. Don'ts

- Never store raw refresh tokens; never put access tokens in cookies or localStorage.
- Never return different errors for "unknown email" vs "wrong password".
- Don't emit events before the database write succeeds.
- Don't use `cors({ origin: '*' })` with credentials.
- Don't rewrite B1–B3 modules beyond what the seams require; fix real bugs with a small, documented commit.
