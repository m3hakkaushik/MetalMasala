# Metal मसाला

Metal मसाला is a storefront for handcrafted Indian jewellery. The React frontend runs on a local mock API and includes shopping, demo checkout, customer accounts, order tracking, and staff management screens.

## Run locally

Use Node.js 22.12 or later.

```sh
cd client
npm ci
cp .env.example .env
npm run dev
```

Open http://localhost:5173. The default mock configuration uses Mock Service Worker on localhost or HTTPS. A separate server and database are unnecessary for the frontend demo. Checkout simulates UPI, card, and cash on delivery.

```sh
npm run lint
npm run build
npm run preview
```

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

During Backend Phases 1 and 2, keep the `catalogue-extras` group after removing `products` and `categories`. It keeps facets and related products mocked until their Phase 3 implementations are available.

See the [API contract](docs/01_API_CONTRACT.md), [frontend spec](docs/02_FRONTEND_PHASE.md), and [handoff](docs/07_IMPLEMENTATION_MAP.md#handoff-log).
