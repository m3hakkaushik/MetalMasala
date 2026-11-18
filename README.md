# Metal मसाला

Metal मसाला is a storefront for handcrafted Indian jewellery. The React storefront uses an Express API for catalogue, newsletter, contact, and pricing. Mock Service Worker simulates customer accounts, cart and order processing, and later backend features.

## Run locally

Use Node.js 22.12 or later. Start the API from the repository root.

```sh
cd server
npm ci
cp .env.example .env
npm run dev
```

Open a second terminal at the repository root and start the storefront.

```sh
cd client
npm ci
cp .env.example .env
npm run dev
```

Open http://localhost:5173. The server listens on port 4000 and initializes its JSON catalogue from the seed on first use. Checkout simulates UPI, card, and cash on delivery. Set `VITE_MOCK_GROUPS=all` in the client environment for a standalone demo.

From `server/`, run `npm test` and `npm run lint`. From `client/`, run `npm run lint`, `npm run build`, and `npm run preview`. See the [Phase 2 HTTP examples](server/api-tests/phase-2.http) and [standalone MongoDB setup](docs/mongodb-setup.md).

## Demo accounts

On the sign-in page, open **Use a demo account** to fill its credentials.

| Role | Email | Mock password | Access |
| --- | --- | --- | --- |
| Customer | `aarav@example.com` | `Test@1234` | Shop, checkout, orders, reviews, and account |
| Manager | `manager@metalmasala.in` | `Manager@1234` | Catalogue management and order processing |
| Admin | `admin@metalmasala.in` | `Admin@1234` | Manager features, product deletion, analytics, and user management |

Mock state belongs to the current browser. Add `?resetMocks=1` to the local URL to restore the demo database. The guest bag has separate browser storage. Use fictional contact details for the demo.

## Frontend layout

| Path | Purpose |
| --- | --- |
| `client/src/app` | Routes, role guards, providers, and site layout |
| `client/src/api` | Contract-facing requests, validation, and refresh handling |
| `client/src/pages` and `client/src/features` | Storefront, commerce, account, and staff flows |
| `client/src/components/ui` and `client/src/styles` | Shared UI, jewellery illustrations, and design tokens |
| `client/src/mocks` | Selectable MSW handlers and seed data |
| `client/src/stores` | Guest bag, memory-only access token, and UI state |

There are 32 demo products, eight categories, 30 reviews, and 23 orders. To use product photos later, place WebP files under `client/public/products/` using the paths in `client/src/mocks/data/products.json`, then restart Vite or rebuild.

## Switch to the real API

`VITE_MOCK_GROUPS=all` enables the demo. Use a comma-separated subset for integration or set it to an empty string to build without the mock modules. Unselected requests go through the Vite proxy to port 4000 by default.

Phase 2 defaults to `catalogue-extras,reviews,cart,orders,admin,ai,auth,users`. Keep `catalogue-extras` until the real facets and related-product endpoints land in Phase 3. To test staff catalogue writes from the storefront, sign in as the corresponding demo user, set `VITE_DEV_ROLE=manager` or `VITE_DEV_ROLE=admin`, and restart Vite. The local Express API refuses those headers in production.

See the [API contract](docs/01_API_CONTRACT.md), [frontend spec](docs/02_FRONTEND_PHASE.md), and [handoff](docs/07_IMPLEMENTATION_MAP.md#handoff-log).
