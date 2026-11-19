# Project review

The Phase 4 branch integrates the storefront and staff console with the MongoDB API. The lecture map records the evidence for [L1–L44](07_IMPLEMENTATION_MAP.md). L45 is the complete capstone demo. The pull request is the handoff for team review and the release tag follows merge.

## Five-minute walkthrough

1. Open the storefront in Chrome. Browse and filter Jhumkas, then open the same product in two tabs. The viewer count rises to two and returns to one when a tab closes.
2. Add a piece as a guest. Register a customer and verify that the bag contains the item after sign-in. Open Account, save a phone number and an address, and set a default address.
3. Check out with COD, then repeat with demo UPI and demo card. Check pricing and payment status on the confirmation screen.
4. Open the order timeline as the customer. In a separate browser profile sign in as staff, confirm the order, and check that the customer’s timeline updates without a page reload. Cancel the confirmed order as the customer and verify stock is restored. Publish a drop as staff and dismiss the storefront banner from the customer window.
5. Post a review, save the piece to the wishlist, and ask the stylist for jewellery under ₹1,000. Sign in as admin and open analytics. Change a customer’s role and exercise a staff-only endpoint before and after the change. Verify a regular customer receives `403` from the user administration API.

## Session and realtime verification

- For a short expiry demonstration, set `JWT_ACCESS_EXPIRES=15s` locally. Sign in, leave a customer account page open past expiration, and open another account tab in the UI. In the network panel confirm a `TOKEN_EXPIRED` response, a successful refresh with `Set-Cookie`, and a successful retried request. Remove `mm_refresh`, let access expire again, and check for a sign-in redirect.
- Run `server/api-tests/auth.http` for a refresh and replay. The original and replacement cookies both return `401` after reuse. `server/api-tests/rbac.http` covers role access. The automated suite covers hash storage, safe account responses, cookie scope, strict origin checks, concurrent refresh, password and account invalidation, ownership, and the account/admin socket handshake.
- Run the WebSocket demo with two clients for echo, broadcast, and ping/pong. The Socket.IO integration tests check viewer counts, stock and order events, drop announcements, and live order rooms.
- The API serves Helmet headers and rate-limits auth and AI. Run `npm audit` independently in `server/` and `client/`. React Router was updated to the patched v7 line during Phase 4. The production build excludes the service worker and MSW.

## Limits and follow-up

Payments and email delivery use demo adapters. The event bus, drop announcements and viewer counts live within one API instance. A production rollout would need shared realtime infrastructure, durable notifications, and a payment integration. Password reset and account lockout are stretch items. Design assets remain the supplied illustrative catalogue where real photos are unavailable.
