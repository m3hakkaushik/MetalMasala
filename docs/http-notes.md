# HTTP Fundamentals & Semantics [L2]

This guide explains the HTTP design principles, verbs, status codes, headers, and caching mechanisms implemented in **Metal मसाला**.

---

## 1. HTTP Methods ↔ CRUD Mapping

| HTTP Verb | CRUD Action | Idempotent | Safe | Used in Metal Masala |
|---|---|---|---|---|
| **GET** | Read | Yes | Yes | Retrieve categories, products, health stats, CSV exports |
| **POST** | Create | No | No | Create product, create category, echo payload |
| **PATCH** | Update (Partial) | No | No | Update category description, modify product stock or price |
| **DELETE** | Delete | Yes | No | Delete product, delete unreferenced category |
| **OPTIONS** | Preflight | Yes | Yes | CORS preflight negotiation for cross-origin requests |
| **HEAD** | Metadata only | Yes | Yes | Checking resource headers without response payload |

---

## 2. HTTP Status Codes in Use

### Success Codes (2xx)
- **`200 OK`**: Standard response for successful `GET` or `PATCH` requests returning data.
- **`201 Created`**: Returned on successful resource creation (`POST /products`, `POST /categories`). Must include a `Location` header pointing to the canonical URI of the new resource.
- **`204 No Content`**: Returned on successful deletion (`DELETE /products/:id`). Must **not** include any response body.

### Redirection / Caching Codes (3xx)
- **`304 Not Modified`**: Returned when the client sends an `If-None-Match` header matching the server's current `ETag`. Signals that the cached client copy is still fresh; saves network bandwidth.

### Client Error Codes (4xx)
- **`400 Bad Request`**: Malformed payload, unparseable JSON syntax, or invalid request structure (`BAD_REQUEST`).
- **`404 Not Found`**: Target endpoint or resource (such as an unknown slug or ID) does not exist (`NOT_FOUND`).
- **`409 Conflict`**: Conflict with existing server state, such as duplicate slug registration or attempting to delete a category that still has products assigned (`CONFLICT`).
- **`422 Unprocessable Entity`**: Payload syntax is valid JSON, but fails domain business rules (e.g. empty name, negative price) (`VALIDATION_ERROR`).

### Server Error Codes (5xx)
- **`500 Internal Server Error`**: Unexpected uncaught exception or fatal server error (`INTERNAL_ERROR`).

---

## 3. Headers and Semantics

### Standard Response Headers
- **`Content-Type: application/json; charset=utf-8`**: Standard JSON MIME type specifying UTF-8 encoding.
- **`Location: /api/v1/products/:slug`**: Included with `201 Created` responses to indicate the URI of the newly created entity.
- **`Cache-Control: public, max-age=60`**: Instructs browsers and intermediaries that the response may be cached for up to 60 seconds.
- **`ETag: W/"<sha1-hash>"`**: Weak entity tag derived from the payload content. Enables conditional revalidation.
- **`X-Request-Id: <uuid>`**: Unique correlation ID generated per request for traceability in logs and error responses.
- **`Content-Disposition: attachment; filename="products.csv"`**: Instructs the browser to download the response stream as a file.

### Cross-Origin Resource Sharing (CORS) Headers
- **`Access-Control-Allow-Origin: http://localhost:5173`**: Whitelists the frontend development origin.
- **`Access-Control-Allow-Credentials: true`**: Permits cookies and authorization headers across origins.

---

## 4. `curl` Command Examples

### 1. Retrieve Catalogue with Filtering (200 OK with ETag & Cache-Control)
```bash
curl -i "http://localhost:4000/api/v1/products?category=jhumkas&sort=popular"
```

### 2. Conditional Revalidation (304 Not Modified)
```bash
# First fetch to get the ETag
ETAG=$(curl -s -D - "http://localhost:4000/api/v1/products/chandni-chowk-jhumka" -o /dev/null | grep -i etag | awk '{print $2}' | tr -d '\r')

# Second request providing If-None-Match
curl -i -H "If-None-Match: $ETAG" "http://localhost:4000/api/v1/products/chandni-chowk-jhumka"
```

### 3. Create a Category (201 Created + Location Header)
```bash
curl -i -X POST "http://localhost:4000/api/v1/categories" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nose Pins",
    "slug": "nose-pins",
    "description": "Delicate oxidized and silver nose pins."
  }'
```

### 4. Duplicate Resource Creation (409 Conflict)
```bash
curl -i -X POST "http://localhost:4000/api/v1/categories" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nose Pins",
    "slug": "nose-pins"
  }'
```

### 5. Validation Failure (422 Unprocessable Entity)
```bash
curl -i -X POST "http://localhost:4000/api/v1/products" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "",
    "price": -100
  }'
```

### 6. Delete a Product (204 No Content)
```bash
curl -i -X DELETE "http://localhost:4000/api/v1/products/prod-chandni-chowk-jhumka"
```

### 7. Export Products as CSV (File Download)
```bash
curl -i -o products.csv "http://localhost:4000/api/v1/products/export.csv"
```
