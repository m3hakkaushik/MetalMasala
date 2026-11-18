# Raw Node.js HTTP Server vs. Express.js [L7]

To demonstrate core networking fundamentals and understand why web frameworks exist, **Metal मसाला** includes both a raw Node.js HTTP server (`src/native/server.js`, port 4001) and an Express 4.x application (`src/app.js`, port 4000).

---

## 1. Feature Comparison Table

| Capability | Raw Node `node:http` (`src/native/server.js`) | Express.js (`src/app.js`) |
|---|---|---|
| **Routing** | Manual string and pathname inspection (`pathname.startsWith(...)`, `req.method === 'GET'`). Nested routers or parameterized paths (`:slug`, `:id`) require custom regex matching. | First-class routing via `express.Router()`. Supports clean parameter extraction (`req.params.slug`), route prefixes, and chaining (`router.route()`). |
| **Request Body Parsing** | Must listen on incoming stream data chunks (`req.on('data')`, `req.on('end')`), buffer bytes into a string, enforce size limits, and wrap `JSON.parse` in try/catch. | Built-in `express.json({ limit: '1mb' })` middleware attaches parsed JavaScript objects directly to `req.body`. |
| **Query Parameters** | Manual parsing via `new URL(req.url, 'http://...').searchParams` with manual type casting. | Automatically parsed into an object accessible as `req.query`. |
| **Middleware Pipeline** | Must be hand-rolled using callback or promise chains. | Standardized middleware signature `(req, res, next)`. Easy composition of logging, authentication, validation, and security headers. |
| **Static File Serving** | Requires manually reading files from disk with `fs.readFile`, determining MIME types from extensions, and handling 404/500 stream errors. | One-line middleware `express.static('public')` handles MIME types, caching headers, directory indexing, and streaming. |
| **Response Helpers** | Primitive `res.writeHead(status, headers)` and `res.end(string)`. | Convenient utility methods: `res.status(201).json(data)`, `res.download(path)`, `res.redirect(url)`. |
| **Error Handling** | Each async handler must wrap errors in try/catch; unhandled errors crash the process or leave sockets hanging. | Centralized error middleware `(err, req, res, next)`. Errors forwarded via `next(err)` are caught uniformly. |
| **Boilerplate / Lines of Code** | High boilerplate: ~150 lines just to parse bodies, handle CORS, and route 3 basic endpoints. | Minimal boilerplate: ~30 lines for full app scaffolding with CORS, body parsing, static files, and error handling. |

---

## 2. Code Comparison: Handling a POST JSON Endpoint

### Raw Node.js (`src/native/server.js`)
```javascript
// Manual stream accumulation, body parsing, and response serialization
if (pathname === '/native/echo' && req.method === 'POST') {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > 1e6) { // 1MB protection
      req.destroy();
    }
  });

  req.on('end', () => {
    try {
      const parsed = JSON.parse(body || '{}');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, echoed: parsed }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
    }
  });
}
```

### Express.js (`src/routes/product.routes.js`)
```javascript
// Body is pre-parsed by express.json() middleware; clean status and json helpers
router.post('/echo', (req, res) => {
  return res.status(200).json({
    success: true,
    echoed: req.body
  });
});
```

---

## 3. When to Use Which?

- **Use Raw `node:http`:** When building ultra-lightweight micro-proxies, custom application protocols, high-frequency internal telemetry sinks with zero dependency overhead, or learning the underlying mechanics of TCP/HTTP in Node.js.
- **Use Express.js:** When building production REST APIs, e-commerce applications, and web services requiring clean middleware chaining, standardized routing, authentication, request validation, and comprehensive third-party ecosystem integrations.
