# API Testing & Debugging Guide [L8]

This guide explains how to test, inspect, and debug the **Metal मसाला** backend server using VS Code, the Node.js inspector, debug logging namespaces, and automated smoke test suites.

---

## 1. Structured Debug Logging with Namespaces

Instead of relying on uncontrolled `console.log()` statements that clutter production logs, the backend uses the standard `debug` package with scoped namespaces:

| Namespace | Purpose | Source File |
|---|---|---|
| **`mm:boot`** | Server initialization, port binding, environment config, shutdown | `src/server.js` |
| **`mm:http`** | Request method, URL, status code, response latency, access log writes | `src/utils/logger.js` |
| **`mm:data`** | Repository reads, atomic JSON writes, seed population, cache locks | `src/utils/jsonStore.js` |

### Running with Debug Logging:

```bash
# Enable all Metal Masala debug logs
DEBUG=mm:* npm run dev

# Enable HTTP request logs only
DEBUG=mm:http npm run dev

# Enable boot and data operations only
DEBUG=mm:boot,mm:data npm run dev
```

---

## 2. Interactive Debugging with VS Code & `--inspect`

The repository includes pre-configured launch tasks in `server/.vscode/launch.json`:

### Available Launch Configurations:
1. **`[L8] Launch Express Server (Dev)`**: Starts `src/server.js` with `node --watch` and `DEBUG=mm:*`. Breakpoints in routes and repositories are hit immediately.
2. **`[L8] Launch Native HTTP Server`**: Launches the raw `http.createServer` demo on port 4001.
3. **`[L8] Run Smoke Tests`**: Executes the automated `node:test` suite with debugging enabled.
4. **`[L8] Attach to Node Process`**: Attaches VS Code to an existing running Node process using port 9229 (`node --inspect src/server.js`).

### How to Debug:
1. Open the project in VS Code.
2. Open the **Run and Debug** view (`Cmd+Shift+D` on Mac).
3. Select **`[L8] Launch Express Server (Dev)`** and press `F5`.
4. Set breakpoints in `src/routes/product.routes.js` or `src/repositories/json/product.repo.js`.
5. Trigger a request via `curl` or `api-tests/catalogue.http` to step through execution, inspect variables, and evaluate expressions in the debug console.

---

## 3. Executing API Tests

### Option A: VS Code REST Client (`api-tests/catalogue.http`)
Install the **REST Client** extension in VS Code. Open `server/api-tests/catalogue.http` and click **"Send Request"** directly above any request block to execute and inspect headers, status codes, and JSON response bodies.

### Option B: Postman Collection
Import `server/api-tests/metal-masala.postman_collection.json` and `server/api-tests/metal-masala.postman_environment.json` into Postman to execute individual requests or run the entire collection via the Postman Collection Runner.

### Option C: Automated Smoke Tests (`node:test`)
Run the test suite directly from the command line:

```bash
cd server
npm test
```
The test suite validates:
- System health endpoints (`/health` and `/api/v1/health`)
- Category listing with dynamic `productCount`
- Product filtering, sorting, and pagination metadata
- Product detail lookup by slug
- `ETag` and `If-None-Match` caching (`304 Not Modified`)
- Error envelope structure on 404, 409, and 422
- CSV streaming on `/api/v1/products/export.csv`
