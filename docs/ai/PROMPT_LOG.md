# AI prompt log

## Frontend increment · 18 November 2026

- “Go threw /docs and ask if have any question related to project and start building.” The project overview and implementation map established the frontend as the starting phase.
- “Do you have real Metal मसाला product photos, or should I build the first storefront pass with illustrated placeholders?” The team confirmed there were no product photos. The storefront uses category and finish illustrations while keeping the specified product photo paths.
- The build followed the frontend milestone order and used the API contract to define the catalogue records, request parameters, pricing quote, and response envelopes.

## Frontend completion · 18 November 2026

- Finish the mock-backed frontend before pushing it to the team GitHub repository. Keep the backend phases queued. The implementation landed as focused frontend and documentation commits.
- Implement the purchase flow against the API contract. A browser check confirmed that a guest item merged after sign-in and checkout returned to the intended route.
- Exercise customer, manager, and admin permissions. The checks covered direct route access, staff API permissions, and stock restoration after cancellation.
- Run the dev and production previews and measure the production home page with mobile Lighthouse. The browser checks exposed a sign-out redirect race. A full navigation after the server revoked the session made the sign-out destination consistent.

## Backend Phase 1 (B1) — Mehak — 18 November 2026

- “Review the project layout, API contract, and implementation map; then build Foundations & Server Core (L1–L11).” The specifications set a clear separation between the mock-backed frontend and the initial JSON-backed Express server.
- “Scaffold server/ with ES Modules, engines, scripts, and committed lockfile.” Node >=22 runtime and package scripts configured cleanly; dependencies isolated to core Express, CORS, and debug.
- “Implement atomic JSON store and access log using core Node modules.” Used `fs/promises` write-to-temp and rename pattern to ensure file integrity during concurrent reads/writes without corrupted state.
- “Create CommonJS formatter utility and import via createRequire to show module interop.” Explaining the singleton caching and synchronous vs static evaluation patterns satisfied the L4 curriculum goal.
- “Build manual CLI seeder and raw Node.js HTTP server on port 4001.” Parsing `process.argv` manually and implementing streaming body parsing highlighted the low-level mechanics before comparing them with Express in `docs/node-vs-express.md`.
- “Implement catalogue CRUD and filtering with ETags and CSV export.” All query parameters from the contract implemented in `product.repo.js`; weak ETag generation enabled 304 Not Modified responses; smoke test verified 15 assertions across all endpoints.
