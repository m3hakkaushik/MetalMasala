# Middleware and chaining · L16–L17

## Application pipeline

1. `requestId` produces a UUID and writes the `X-Request-Id` response header. It runs ahead of CORS, parsers, and routing so rejected requests can be correlated.
2. `requestLogger` records the method, URL, status, duration, and request ID on the response's `finish` event. Morgan writes the configured human-readable format to the console. Neither reads request bodies.
3. Helmet sets security headers. Compression negotiates encodings. CORS permits the configured storefront origin and exposes response headers that the client can use.
4. The built-in Express parsers apply a 10 KB body limit. Express also serves the existing static files.
5. Requests under `/api/v1` pass through the general API rate limit and their resource router. The root health probe bypasses the API counter.
6. The not-found middleware and final error handler handle unmatched routes and forwarded errors.

## Router and route scope

The reviews router runs shared parameter validation with `router.use` and validates the `productId` from its parent. The public newsletter and contact routes apply their individual counters before validating the body.

| Route chain | Purpose |
| --- | --- |
| Strict limit → validate → controller | Count invalid form submissions as well as valid ones |
| Protect → manager or admin → validate → controller | Reject restricted catalogue writes before schema validation |
| Protect → admin → validate → controller | Protect deletion before checking whether the record exists |

The general limit defaults to 100 requests per minute. Newsletter allows five requests and contact allows three per client per window. Counters are separate and reset when the local process restarts.

`next()` continues the chain. `next(error)` forwards to the error middleware. The development `protect` accepts `x-dev-role` with a fixed customer, manager, or admin identity and refuses private API requests in production. Phase 4 can replace its authentication logic while keeping the existing route guards.
