# REST conventions · L15

The versioned API is mounted at `/api/v1`. Each resource has its own Express router. `/health` at the root is also available for local infrastructure probes. The [API contract](01_API_CONTRACT.md) defines the public paths and JSON fields.

| Method | Behaviour | Example |
| --- | --- | --- |
| GET | Reads a resource or a list | `GET /products/chandni-chowk-jhumka` |
| POST | Creates a resource or triggers a calculation | `POST /contact`, `POST /pricing/quote` |
| PATCH | Updates selected fields | `PATCH /products/:id` |
| DELETE | Removes a resource and returns an empty body | `DELETE /categories/:id` |

A typical PUT replaces a full representation and is idempotent. PATCH applies the submitted changes. Reapplying a field assignment yields the same catalogue values. DELETE leaves the resource absent even if a retry subsequently receives a 404. Newsletter POST is intentionally idempotent and returns 200 for an address already on the list.

## Paths and caching

- Place literal routes such as `/products/export.csv` ahead of `/products/:slug`.
- `router.param('slug')` loads a product once for a matching detail request.
- The nested `/products/:productId/reviews` router receives the parent parameter through `mergeParams` and returns 501 until Phase 3 implements reviews.
- Product lists include `page`, `limit`, `total`, `totalPages`, `hasNext`, and `hasPrev` in `meta`. Product reads support `ETag` revalidation and `Cache-Control: public, max-age=60`.

| Status | Meaning in this API |
| --- | --- |
| 200 / 201 | Success / resource created |
| 204 / 304 | No content / cached representation remains valid |
| 400 / 422 | Malformed request / input fails validation |
| 401 / 403 | Authentication failure / role lacks permission |
| 404 / 409 | Resource missing / state conflict |
| 413 / 429 | Payload too large / rate limit reached |
| 500 / 501 | Unexpected failure / feature pending |

Run the [catalogue requests](../server/api-tests/catalogue.http) and the [Phase 2 requests](../server/api-tests/phase-2.http) with a local server.
