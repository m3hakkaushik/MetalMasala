# Environment variables and configuration · L29–L30

An environment variable is a string supplied by the current shell, process manager, or environment file. The server loads `server/.env` through dotenv. Set `NODE_ENV=test` in the shell to select `server/.env.test`. Explicit environment values take precedence over both files. The file paths are resolved from the server package.

The configuration module converts prices, ports, limits, and thresholds into numbers. Zod checks formats and ranges before any HTTP listener starts. Invalid configuration prints the variable names and reasons, then exits with status 1. Values are omitted from the report.

```sh
cd server
cp .env.example .env
npm start

# Demonstrate validation. The setting applies only to this command.
PORT=invalid npm start
```

| Mode | Behaviour |
| --- | --- |
| `development` | Dev-style logs by default, development role stub for private catalogue endpoints |
| `test` | Loads `.env.test`, defaults to silent logs, allows an ephemeral port for the native demo |
| `production` | Combined logs by default, generic unexpected error messages, development auth refused |

The exported groups are `server`, `db`, `cors`, `pricing`, `rateLimit`, `log`, and `stock`. Runtime source reads the environment only in [config/index.js](../server/src/config/index.js). Stable data enums and development identities live in [config/constants.js](../server/src/config/constants.js). The [environment example](../server/.env.example) lists every Phase 2 setting.

Keep connection strings and other secrets in an ignored environment file or a deployment secret manager. Vite exposes `VITE_*` values to the browser. Use them for public URLs, mock flags, and dev role selection.
