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

## Backend Phase 2 · 18 November 2026

- Pull Mehak's finished L1–L11 branch. Work on Nitesh's phase only and keep it local for review.
- Preserve Phase 1 routes, ETags, CSV export, and the JSON store while extracting controllers and services. Role headers were added to the existing write examples so they exercise the same authorized behaviour.
- Test simultaneous signups and catalogue writes, the shipping threshold, malformed JSON, and production auth refusal. The tests confirmed the shared queue prevents lost local writes and that error responses carry the request ID.
- Switch the client to the real contact, newsletter, and pricing endpoints. The browser confirmed a saved contact, an idempotent signup, and the ₹927 COD quote for a ₹799 product.
- Verify MongoDB with the standalone ping while keeping the HTTP application JSON-backed. The local MongoDB 7 check passed.
- Repeat the read-only ping against the team's Atlas cluster. The check passed on MongoDB 8.0.37 using a temporary process environment.

## Backend Phase 3 (B3) — Tanishq — 18 November 2026

- “Review the project folder structure, README, API contract, and implementation map; then build Database Layer, Commerce Flow & AI (L21–L28, L42–L44).” The architecture transitioned from JSON storage to MongoDB + Mongoose with complete contract fidelity.
- “Write runnable query playbooks in server/queries/ for CRUD operations and query filters on real Metal मसाला jewellery data.” Playbooks `01-crud.mongodb.js` and `02-queries.mongodb.js` created with comprehensive examples ($inc, $push, $pull, $text, $facet, $elemMatch).
- “Draft docs/data-model.md with Mermaid ER diagram and embed vs reference decisions; document two-layer validation.” Completed data architecture and schema constraints.
- “Draft docs/indexing.md with compound indexes and explain('executionStats') demonstrating COLLSCAN to IXSCAN improvements.” Analyzed execution stats for catalogue queries, full-text searches, and user order history.
- “Design Mongoose schemas with validation, virtuals, static methods, and hooks for Category, Product, Review, Cart, Order, User, Subscriber, ContactMessage.” Implemented custom validators (compareAtPrice >= price, 6-digit pincode, 10-digit phone, integer rating 1–5) and review average rating calculation hooks.
- “Connect Node.js with MongoDB in config/db.js with retry backoff and graceful shutdown; update /health with live database status.”
- “Implement MongoDB repositories and flip DATA_STORE default to mongo while preserving backwards compatibility.”
- “Build commerce services and controllers: Reviews with verified purchase check, server-side Cart with guest merge, Orders with atomic stock decrement and compensation rollback, Admin Orders, and Aggregation Analytics.”
- “Implement Masala Stylist and AI Copywriter with offline mock adapter and prompt-injection allowlist verification.”
- “Document AI developer tools (AI_TOOLS.md) and spec-first workflow (AI_DRIVEN_DEVELOPMENT.md); leave clean EVENT HOOK seams for B4.”

### Phase 4 · Aakash

- Implemented L31–L41 after the Phase 3 merge. Replaced the development identity and browser mocks with signed account sessions, live REST routes, and Socket.IO. Kept mock payments and the offline AI provider as demo adapters.
- The browser uncovered concurrent first-cart creation during registration. An atomic upsert fixed the merge and a regression test covers concurrent requests. The backend suite also caught a review-rating update that ran after its response. The review hook now awaits recalculation. The stylist response now uses the catalogue product shape so recommendations render with the existing product card.
