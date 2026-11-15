import { createRequire } from 'node:module';

// [L4] Node.js Modules: Interoperability between ES Modules and CommonJS.
// Because the server package.json sets "type": "module", all .js files are ES Modules.
// To import a legacy or specialized CommonJS file (.cjs), Node.js provides `createRequire`.
// Node.js caches the module on first load, ensuring singleton behavior.
const require = createRequire(import.meta.url);
const { formatINR, slugify } = require('./formatters.cjs');

export { formatINR, slugify };
