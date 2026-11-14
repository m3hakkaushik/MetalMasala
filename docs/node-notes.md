# Node.js Runtime & NPM Fundamentals [L3]

This guide explains the architecture of the Node.js JavaScript runtime, the event loop execution model, package management with NPM, and version pinning strategies in **Metal मसाला**.

---

## 1. What is the Node.js Runtime?

Node.js is an asynchronous, event-driven JavaScript runtime built on top of Google Chrome's **V8 engine** and the **libuv** C library.

- **V8 Engine:** Compiles JavaScript source code directly into native machine code at runtime (Just-In-Time compilation).
- **libuv:** A cross-platform C library that handles the event loop, thread pool (for file system I/O, DNS, crypto), asynchronous networking, and inter-process communication.
- **Node.js Core Bindings:** JavaScript modules (`node:fs`, `node:http`, `node:crypto`, `node:os`) that expose high-level APIs bridging JS to OS-level system calls via libuv.

---

## 2. The Event Loop Explained Simply

JavaScript is single-threaded, meaning only one operation executes on the main thread at any given moment. To handle concurrent network requests without blocking, Node.js offloads I/O tasks to libuv and processes results using an **Event Loop**.

### Event Loop Phases (Executed in Loop Order):
```
   ┌───────────────────────────┐
┌─>│           timers          │  (setTimeout, setInterval callbacks)
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │     pending callbacks     │  (I/O callbacks deferred from previous loop)
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │       idle, prepare       │  (Internal node use)
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │           poll            │  (Retrieve new I/O events, execute I/O callbacks)
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │           check           │  (setImmediate callbacks)
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │      close callbacks      │  (e.g. socket.on('close'))
└──┴───────────────────────────┘
```

### Microtask Queues (`process.nextTick` & Promises)
Between each phase of the event loop, Node.js drains the microtask queue:
1. `process.nextTick()` queue (highest priority microtask).
2. Resolved Promise callbacks (`Promise.then`, `async/await` continuations).

This design ensures high-throughput I/O: while a database or file read is waiting on disk or network, the event loop continues processing incoming HTTP requests on the main thread.

---

## 3. `dependencies` vs. `devDependencies`

In `server/package.json`:

| Category | Purpose | Included in Production Builds? | Examples in Metal Masala |
|---|---|---|---|
| **`dependencies`** | Packages required for the application to run in production. | **Yes** | `express`, `cors`, `debug` |
| **`devDependencies`** | Packages required only during local development, testing, linting, or building. | **No** (omitted via `npm install --omit=dev`) | `supertest`, `eslint`, `prettier` |

Separating these dependencies reduces deployment bundle size, decreases attack surfaces in production containers, and prevents development tooling vulnerabilities from reaching production servers.

---

## 4. Semantic Versioning (SemVer)

Version strings in NPM follow the `MAJOR.MINOR.PATCH` pattern (e.g. `4.21.2`):
- **MAJOR:** Breaking changes / API incompatibility (`4.x` -> `5.0`).
- **MINOR:** Backward-compatible new features (`4.20.0` -> `4.21.0`).
- **PATCH:** Backward-compatible bug fixes (`4.21.1` -> `4.21.2`).

### Version Prefixes in `package.json`:
- **`^` (Caret, e.g. `^4.21.2`):** Allows automatic upgrades to minor and patch releases (any version `< 5.0.0`).
- **`~` (Tilde, e.g. `~4.21.2`):** Allows automatic upgrades to patch releases only (any version `< 4.22.0`).
- **Exact (e.g. `4.21.2`):** Locks the package to that exact release without updates.

---

## 5. Why `package-lock.json` Must Be Committed

While `package.json` specifies allowed version ranges (such as `^4.21.2`), `package-lock.json` records the exact, deterministic dependency tree installed at the moment of installation:
1. **Deterministic Builds:** Guarantees that every developer, CI/CD pipeline, and production server installs the identical byte-for-byte package versions and transitive sub-dependencies.
2. **Integrity Hashes:** Stores cryptographic SHA-512 hashes for every downloaded package tarball, preventing man-in-the-middle package tampering or registry corruption.
3. **Faster Installs:** Enables `npm ci` (clean install), which skips range resolution and installs packages directly from the lockfile in seconds.
