# Authentication and authorization

Authentication verifies the signed token and resolves the current account. Missing, invalid, expired or invalidated credentials return `401`. An authenticated caller without the required role or ownership receives `403` for orders and reviews. A missing address or an address outside the caller’s own account returns `404`. Carts and wishlists always use the caller’s account ID.

`User` hashes a modified password with bcrypt during save. Hashing is one-way and supports comparing a candidate without recovering the original password. Each bcrypt hash contains a random salt and the work factor. Raising the work factor increases the cost of each password comparison. The auth service selects the password explicitly only when required and account responses omit it.

Access JWTs use HS256 and last 15 minutes by default. A separate signing key protects refresh JWTs, which default to seven days. The browser keeps access tokens in memory. The `mm_refresh` cookie is HttpOnly and path-scoped to `/api/v1/auth`. MongoDB stores refresh token digests and expires records through a TTL index. Every refresh rotates the cookie and a replay revokes the whole family. Password changes and deactivation invalidate existing credentials through a millisecond-precision account version. Role checks use the current database role, and account changes disconnect existing authenticated sockets.

## Route audit

Paths use the `/api/v1` prefix except for the standalone health check. The separate raw HTTP lecture demo runs independently on port 4001.

| Routes | Access | Enforced by |
| --- | --- | --- |
| `GET /health` and `GET /api/v1/health` | Public | Infrastructure and API health routers |
| `GET /categories`, `/categories/:id`, `/products`, `/products/facets`, `/products/:slug`, `/products/:slug/related` | Public | Read handlers |
| `GET /products/:productId/reviews` | Public | Nested review router |
| `POST /pricing/quote`, `/newsletter`, `/contact`, `/ai/stylist` | Public | Validation and applicable rate limits |
| `POST /auth/register`, `/auth/login` | Public | Exact browser origin and strict per-endpoint rate limits |
| `POST /auth/refresh`, `/auth/logout` | Cookie | Exact browser origin and refresh cookie handling |
| `GET /auth/me`, `PATCH /auth/password` | Signed in | `protect` and strict password change limiter |
| `GET/PATCH /users/me`, `POST /users/me/addresses`, `PATCH/DELETE /users/me/addresses/:addressId` | Signed in | `protect` and caller-owned account |
| `GET /users/me/wishlist`, `POST/DELETE /users/me/wishlist/:productId` | Signed in | `protect` and caller-owned account |
| `GET/DELETE /cart`, `POST /cart/items`, `POST /cart/merge`, `PATCH/DELETE /cart/items/:productId` | Signed in | `protect` and caller-owned cart |
| `POST/GET /orders` | Signed in | `protect` and caller-owned cart or order list |
| `GET /orders/:id` | Owner, manager, admin | `protect` and order ownership or staff role |
| `PATCH /orders/:id/cancel` | Owner | `protect` and order ownership |
| `POST /products/:productId/reviews` | Signed in | `protect` and review author from account |
| `DELETE /reviews/:id` or `/products/:productId/reviews/:id` | Author or admin | `protect` and review ownership or admin role |
| `GET /products/export.csv`, `POST /products`, `PATCH /products/:id` | Manager, admin | `protect` and `product:write` |
| `POST /categories`, `PATCH /categories/:id`, `POST /ai/describe` | Manager, admin | `protect` and `restrictTo`, with a strict AI limit |
| `GET /admin/orders`, `PATCH /admin/orders/:id/status` | Manager, admin | `protect` and router-level `restrictTo` |
| `DELETE /products/:id`, `/categories/:id` | Admin | `protect` and `restrictTo('admin')` |
| `GET /admin/analytics/summary`, `/revenue`, `/sales-by-category`, `/top-products` under the analytics prefix | Admin | `protect` and `analytics:read` |
| `GET /admin/users`, `PATCH /admin/users/:id/role`, `/admin/users/:id/status` | Admin | `protect` and `user:manage`, plus self-demotion and self-deactivation checks |

The [permission matrix](01_API_CONTRACT.md#5-permission-matrix-target-state-after-b4) describes the full contract. Run the [RBAC requests](../server/api-tests/rbac.http), [rotation exercise](../server/api-tests/auth.http) or the automated checks in `server/test/phase4.test.js`.
