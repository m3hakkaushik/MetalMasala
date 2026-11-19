# Metal मसाला — API Contract

> **The contract wins.** The frontend mocks (MSW) and the real backend must both match this file.
> If something here is wrong or missing, fix this file **with the team's agreement**, then fix the code.

Base URL (dev): `http://localhost:4000/api/v1` · From the client: `/api/v1` (Vite proxy).
Owner column = the phase that **implements** the endpoint for real. **FE** = the frontend mocks it with MSW from day one.

---

## 1. Conventions

### Success envelope
```json
{ "success": true, "data": { }, "meta": { }, "message": "optional human text" }
```
- `data` is an object or array. `meta` appears only on paginated lists.
- `204 No Content` responses have **no body** (used by DELETE).

### Pagination (`meta` on list endpoints)
```json
{ "page": 1, "limit": 12, "total": 87, "totalPages": 8, "hasNext": true, "hasPrev": false }
```

### Error envelope
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Price must be greater than 0",
    "details": [{ "field": "price", "message": "Price must be greater than 0" }]
  },
  "requestId": "b1f3c1de-…"
}
```
`details` is optional (validation errors only). `requestId` equals the `X-Request-Id` response header. Stack traces are **never** sent in production.

### Error codes

| Code | HTTP | When |
|---|---|---|
| `BAD_REQUEST` | 400 | Malformed request / unparseable JSON |
| `INVALID_ID` | 400 | Malformed id (Mongoose `CastError`) |
| `UNAUTHENTICATED` | 401 | Missing/invalid credentials or token |
| `TOKEN_EXPIRED` | 401 | Access token expired (client should call `/auth/refresh`) |
| `FORBIDDEN` | 403 | Authenticated but role/ownership not allowed |
| `NOT_FOUND` | 404 | Unknown route or resource |
| `CONFLICT` | 409 | Duplicate key (slug, email…) |
| `OUT_OF_STOCK` | 409 | Not enough stock; `details` lists affected products |
| `VALIDATION_ERROR` | 422 | Request body/query failed validation |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected failure |
| `AI_UNAVAILABLE` | 503 | AI provider failed/timed out (client shows a friendly fallback) |

### Auth conventions
- Access token: `Authorization: Bearer <accessToken>` (15 min). Kept **in memory** on the client.
- Refresh token: httpOnly cookie `mm_refresh`, path `/api/v1/auth`, 7 days, rotated on every refresh.
- Staff and customer permissions use the current database account. Seed identities are listed in the README.

### Access legend
`public` · `auth` (any logged-in user) · `manager+` (manager or admin) · `admin` · `owner` (the resource's owner; manager+ may also act where noted)

### Formatting rules
- JSON keys `camelCase`. ids are strings, exposed as `id` (never `_id`, never `__v`).
- Dates are ISO-8601 UTC strings. Money is a **number in rupees** (integers; no paise in the API).

---

## 2. Enums

| Name | Values |
|---|---|
| `material` | `brass`, `german-silver`, `sterling-silver`, `copper`, `alloy` |
| `finish` | `oxidized-silver`, `oxidized-black`, `antique-gold`, `antique-copper`, `patina-green` |
| `tags` (vibes, free-form but seed with these) | `festive`, `college`, `office-desi`, `wedding-guest`, `gift`, `statement`, `everyday`, `date-night` |
| `role` | `customer`, `manager`, `admin` |
| `orderStatus` | `placed`, `confirmed`, `packed`, `shipped`, `out_for_delivery`, `delivered`, `cancelled` |
| `paymentMethod` | `cod`, `upi_mock`, `card_mock` |
| `paymentStatus` | `pending`, `paid`, `failed`, `refunded` |
| Order transitions | `placed→confirmed→packed→shipped→out_for_delivery→delivered`; `cancelled` only from `placed` or `confirmed` |

**Categories (seed, 8):** Jhumkas (झुमके), Chokers & Necklaces (हार), Rings (अंगूठी), Kadas & Bangles (कड़े), Payals (पायल), Maang Tikka (मांग टीका), Nose Pins (नथ), Gift Combos (कॉम्बो).

---

## 3. Data shapes (API representation)

### Category
```json
{ "id": "…", "name": "Jhumkas", "nameHi": "झुमके", "slug": "jhumkas",
  "description": "…", "image": "/categories/jhumkas.jpg", "sortOrder": 1, "productCount": 6 }
```

### Product
```json
{
  "id": "…", "name": "Chandni Chowk Jhumka", "slug": "chandni-chowk-jhumka",
  "tagline": "Loud enough for the sangeet, light enough for 9 a.m. lectures.",
  "description": "Long-form copy…",
  "price": 799, "compareAtPrice": 999, "discountPercent": 20, "currency": "INR",
  "category": { "id": "…", "name": "Jhumkas", "slug": "jhumkas" },
  "tags": ["festive", "college"], "material": "brass", "finish": "oxidized-silver",
  "images": [{ "url": "/products/chandni-chowk-jhumka-1.jpg", "alt": "Oxidized silver jhumka on a teal plinth" }],
  "stock": 14, "inStock": true, "sku": "MM-JHM-001",
  "isFeatured": true, "isNewDrop": false,
  "ratingAverage": 4.6, "ratingCount": 23, "soldCount": 120,
  "craft": { "artisan": "Studio Rangrez", "region": "Jaipur, Rajasthan", "technique": "Hand-oxidized cast brass" },
  "details": { "weightGrams": 18, "lengthMm": 55, "care": "Keep dry. Wipe with a soft cloth." },
  "createdAt": "…", "updatedAt": "…"
}
```
Derived: `discountPercent` (virtual), `inStock = stock > 0`.

### User (never includes password)
```json
{ "id": "…", "name": "Aarav Mehta", "email": "aarav@example.com", "role": "customer",
  "phone": "9876543210", "addresses": [ /* Address */ ], "wishlist": ["productId", "…"], "createdAt": "…" }
```

### Address
```json
{ "id": "…", "label": "Home", "fullName": "Aarav Mehta", "phone": "9876543210",
  "line1": "12, Sector 14", "line2": "Near metro", "city": "Gurugram", "state": "Haryana",
  "pincode": "122001", "isDefault": true }
```
Validation: `phone` = 10 digits; `pincode` = 6 digits; `state` required.

### Review
```json
{ "id": "…", "product": "productId", "user": { "id": "…", "name": "Aarav M." },
  "rating": 5, "title": "Obsessed", "body": "…", "isVerifiedPurchase": true, "createdAt": "…" }
```
`rating` integer 1–5. One review per user per product.

### Cart
```json
{ "id": "…",
  "items": [{ "product": { "id": "…", "name": "…", "slug": "…", "price": 799, "image": "/products/…", "stock": 14 },
              "qty": 2, "lineTotal": 1598 }],
  "totals": { "itemCount": 2, "subtotal": 1598 } }
```

### Pricing quote
```json
{ "subtotal": 1598, "shipping": 0, "codFee": 0, "discount": 0, "total": 1598,
  "freeShippingThreshold": 999, "amountToFreeShipping": 0 }
```

### Order
```json
{
  "id": "…", "orderNumber": "MM-2026-7K3QZD",
  "items": [{ "product": "productId", "name": "…", "slug": "…", "image": "…", "price": 799, "qty": 2, "lineTotal": 1598 }],
  "shippingAddress": { /* Address fields without id/isDefault */ },
  "pricing": { "subtotal": 1598, "shipping": 0, "codFee": 0, "discount": 0, "total": 1598 },
  "payment": { "method": "upi_mock", "status": "paid", "transactionId": "MOCK-…" },
  "status": "placed",
  "statusHistory": [{ "status": "placed", "at": "…", "note": "Order placed" }],
  "user": "userId", "createdAt": "…", "updatedAt": "…"
}
```
Order items are **snapshots** (name/price/image frozen at purchase time).

---

## 4. Endpoints

### 4.1 System & catalogue

| Method | Path | Access | Owner | Notes |
|---|---|---|---|---|
| GET | `/health` | public | B1 | `{status, uptime, env, node, memory, db}` (`db` added in B3) |
| GET | `/categories` | public | B1 | Sorted by `sortOrder`; includes `productCount` |
| POST | `/categories` | manager+ | B1 | |
| PATCH | `/categories/:id` | manager+ | B1 | |
| DELETE | `/categories/:id` | admin | B1 | 409 if products still reference it |
| GET | `/products` | public | B1 (JSON) → B3 (Mongo) | See query params below |
| GET | `/products/facets` | public | B3 | Filter sidebar data (price range, counts per finish/material/tag/category) |
| GET | `/products/:slug` | public | B1 | 404 if unknown |
| GET | `/products/:slug/related` | public | B3 | Up to 8, same category/tags, excludes self |
| POST | `/products` | manager+ | B1 | 201; slug auto-generated if absent; 409 on duplicate slug |
| PATCH | `/products/:id` | manager+ | B1 | |
| DELETE | `/products/:id` | admin | B1 | 204 |
| POST | `/pricing/quote` | public | B2 | Body `{ items:[{productId, qty}], paymentMethod }` → Pricing quote |

**`GET /products` query params**

| Param | Type | Behaviour |
|---|---|---|
| `page`, `limit` | int | defaults `1`, `12`; `limit` max `48` |
| `sort` | enum | `newest` (default), `price-asc`, `price-desc`, `popular` (soldCount), `rating` |
| `q` | string | text search over name, tagline, description, tags |
| `category` | slug list | comma-separated, any-of |
| `minPrice`, `maxPrice` | int | inclusive |
| `material`, `finish`, `tags` | list | comma-separated, any-of |
| `featured`, `newDrop`, `inStock` | `true` | boolean filters |

**`GET /products/facets`** (accepts the same filters except `page/limit/sort`) →
```json
{ "price": { "min": 299, "max": 2499 },
  "categories": [{ "slug": "jhumkas", "count": 6 }],
  "finishes": [{ "value": "oxidized-silver", "count": 9 }],
  "materials": [{ "value": "brass", "count": 14 }],
  "tags": [{ "value": "festive", "count": 11 }] }
```

### 4.2 Marketing

| Method | Path | Access | Owner | Notes |
|---|---|---|---|---|
| POST | `/newsletter` | public | B2 | Body `{email}`. 201 on new, **200** `"Already on the list"` if exists (idempotent). Rate-limited |
| POST | `/contact` | public | B2 | Body `{name, email, message}` (message 10–1000 chars). 201. Rate-limited |

### 4.3 Reviews

| Method | Path | Access | Owner | Notes |
|---|---|---|---|---|
| GET | `/products/:productId/reviews` | public | B3 | Paginated; `sort=newest\|rating` |
| POST | `/products/:productId/reviews` | auth | B3 | Body `{rating,title,body}`; 409 if already reviewed. Updates product `ratingAverage/ratingCount` |
| DELETE | `/reviews/:id` | owner or admin | B3 | 204; recalculates product rating |

### 4.4 Cart *(requires login)*

| Method | Path | Access | Owner | Notes |
|---|---|---|---|---|
| GET | `/cart` | auth | B3 | Returns Cart |
| POST | `/cart/items` | auth | B3 | Body `{productId, qty}`; adds or increments; caps at stock → 409 `OUT_OF_STOCK` |
| PATCH | `/cart/items/:productId` | auth | B3 | Body `{qty}`; `qty: 0` removes |
| DELETE | `/cart/items/:productId` | auth | B3 | |
| DELETE | `/cart` | auth | B3 | Empties cart |
| POST | `/cart/merge` | auth | B3 | Body `{items:[{productId, qty}]}` — merges the guest cart after login (sums qty, caps at stock) |

### 4.5 Orders

| Method | Path | Access | Owner | Notes |
|---|---|---|---|---|
| POST | `/orders` | auth | B3 | Body `{shippingAddress, paymentMethod, notes?}`. Builds the order **from the server-side cart**; decrements stock atomically; clears cart; 201 |
| GET | `/orders` | auth | B3 | Own orders, newest first, paginated |
| GET | `/orders/:id` | owner or manager+ | B3 | |
| PATCH | `/orders/:id/cancel` | owner | B3 | Only from `placed`/`confirmed`; restocks |
| GET | `/admin/orders` | manager+ | B3 | Filters `status`, `q` (order number/email), pagination |
| PATCH | `/admin/orders/:id/status` | manager+ | B3 | Body `{status, note?}`; must follow allowed transitions else 409/422 |

### 4.6 Admin analytics *(all aggregation-backed, exclude `cancelled` orders)*

| Method | Path | Access | Owner | Response `data` |
|---|---|---|---|---|
| GET | `/admin/analytics/summary` | admin | B3 | `{ revenue, orders, avgOrderValue, customers, lowStock:[…] }` |
| GET | `/admin/analytics/revenue?range=7d\|30d\|12m` | admin | B3 | `[{ date, revenue, orders }]` |
| GET | `/admin/analytics/sales-by-category` | admin | B3 | `[{ category, revenue, unitsSold }]` |
| GET | `/admin/analytics/top-products?limit=5` | admin | B3 | `[{ product:{id,name,slug,image}, unitsSold, revenue }]` |

### 4.7 AI

| Method | Path | Access | Owner | Notes |
|---|---|---|---|---|
| POST | `/ai/stylist` | public, rate-limited | B3 | Body `{message, history?:[{role:'user'\|'assistant', content}]}` → `{ reply, products:[Product], provider }`. `message` ≤ 500 chars, history ≤ 6 turns |
| POST | `/ai/describe` | manager+ | B3 | Body `{name, category, material, finish, tags?, notes?}` → `{ tagline, description }` |

### 4.8 Auth *(B4)*

| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/auth/register` | public | Body `{name,email,password}` → 201 `{ user, accessToken, expiresIn }` + sets refresh cookie |
| POST | `/auth/login` | public | Body `{email,password}` → `{ user, accessToken, expiresIn }` + cookie. Generic `UNAUTHENTICATED` on bad credentials |
| POST | `/auth/refresh` | cookie | Rotates refresh token → `{ accessToken, expiresIn }`. Reuse of an old refresh token revokes the whole family |
| POST | `/auth/logout` | cookie | Revokes refresh token, clears cookie → 204 |
| GET | `/auth/me` | auth | → `{ user }` |
| PATCH | `/auth/password` | auth | Body `{currentPassword,newPassword}`; revokes all refresh tokens and issues a fresh token pair |
| POST | `/auth/forgot-password` | public | **STRETCH** — always 200; logs reset link via mail stub |
| POST | `/auth/reset-password/:token` | public | **STRETCH** |

Passwords use at least eight characters, one letter and one number, with a 72-byte limit.

### 4.9 Users *(B4)*

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/users/me` | auth | → User |
| PATCH | `/users/me` | auth | `{name?, phone?}` only (no role/email changes here) |
| POST | `/users/me/addresses` | auth | Max 5; first address becomes default |
| PATCH | `/users/me/addresses/:addressId` | auth | Setting `isDefault:true` unsets others |
| DELETE | `/users/me/addresses/:addressId` | auth | 204 |
| GET | `/users/me/wishlist` | auth | → `[Product]` |
| POST | `/users/me/wishlist/:productId` | auth | Idempotent add |
| DELETE | `/users/me/wishlist/:productId` | auth | 204 |
| GET | `/admin/users` | admin | Paginated; `q`, `role` filters |
| PATCH | `/admin/users/:id/role` | admin | Body `{role}`; cannot demote yourself |
| PATCH | `/admin/users/:id/status` | admin | Body `{isActive}` |

---

## 5. Permission matrix (target state after B4)

| Capability | public | customer | manager | admin |
|---|:--:|:--:|:--:|:--:|
| Browse catalogue, pricing quote, newsletter, contact, AI stylist | ✅ | ✅ | ✅ | ✅ |
| Cart, orders (own), wishlist, addresses, post/delete own review | ❌ | ✅ | ✅ | ✅ |
| Create/update products & categories, `/ai/describe` | ❌ | ❌ | ✅ | ✅ |
| View all orders, change order status | ❌ | ❌ | ✅ | ✅ |
| Delete products/categories | ❌ | ❌ | ❌ | ✅ |
| Analytics | ❌ | ❌ | ❌ | ✅ |
| Manage users & roles | ❌ | ❌ | ❌ | ✅ |

---

## 6. Real-time (Socket.IO) — implemented in B4

Server URL: same host as the API (`VITE_SOCKET_URL`). Connection auth: `io(url, { auth: { token: <accessToken> } })` for protected namespaces.

| Namespace | Auth | Direction | Event | Payload |
|---|---|---|---|---|
| `/` | none | C→S | `product:join` / `product:leave` | `{ slug }` |
| `/` | none | S→C | `viewers:count` | `{ slug, count }` |
| `/` | none | S→C | `drop:announce` | `{ title, message, productSlug? }` |
| `/account` | JWT | C→S | `order:subscribe` | `{ orderId }` (ownership checked) |
| `/account` | JWT | S→C | `order:status` | `{ orderId, status, at, note }` |
| `/admin` | JWT + manager/admin | S→C | `order:new` | `{ orderId, orderNumber, total }` |
| `/admin` | JWT + manager/admin | S→C | `order:status` | `{ orderId, status, at }` |
| `/admin` | JWT + manager/admin | S→C | `stock:low` | `{ productId, name, stock }` |
| `/admin` | JWT + manager/admin | C→S | `drop:publish` | `{ title, message, productSlug? }` → server broadcasts `drop:announce` on `/` |

Rooms: `product:<slug>`, `order:<id>`, `user:<id>`, `admins`.

---

## 7. Internal events (EventEmitter bus) — B4

| Event | Payload | Listeners |
|---|---|---|
| `user.registered` | `{ user }` | welcome-email stub |
| `order.placed` | `{ order }` | confirmation-email stub, `/admin` socket `order:new`, low-stock check |
| `order.statusChanged` | `{ order, from, to }` | status-email stub, `/account` + `/admin` socket `order:status` |
| `stock.low` | `{ product }` | `/admin` socket `stock:low` |
| `review.created` | `{ review }` | (log / analytics stub) |

---

## 8. Business rules (shared by FE mocks and BE)

- **Shipping:** `subtotal ≥ FREE_SHIPPING_THRESHOLD (₹999)` → `0`, else `SHIPPING_FEE (₹79)`.
- **COD fee:** `paymentMethod = cod` → `COD_FEE (₹49)`, else `0`.
- **Total** = `subtotal + shipping + codFee − discount`. (`discount` is always `0` unless the coupon STRETCH is built.)
- **Low stock:** `stock ≤ LOW_STOCK_THRESHOLD (5)`.
- **Order number:** `MM-<year>-<6 chars A–Z0–9>`, generated with `crypto`.
- **Slug:** lowercase, hyphenated, unique (`name` → slug; collisions get `-2`, `-3`).
