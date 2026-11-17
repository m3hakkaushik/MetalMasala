// [L7] HTTP Server Development: Raw Node.js HTTP Server using node:http
// Demonstrates manual routing, body stream parsing, query parsing, and custom error handling
// without Express or external routing libraries.

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = parseInt(process.env.NATIVE_PORT || '4001', 10);
const SEED_PRODUCTS = path.resolve(__dirname, '../../data/seed/products.json');
const STORE_PRODUCTS = path.resolve(__dirname, '../../data/store/products.json');

/**
 * Helper to safely read products JSON from store or seed.
 */
async function getProducts() {
  try {
    const raw = await fs.readFile(STORE_PRODUCTS, 'utf-8');
    return JSON.parse(raw);
  } catch {
    const raw = await fs.readFile(SEED_PRODUCTS, 'utf-8');
    return JSON.parse(raw);
  }
}

/**
 * Helper to stream and parse JSON request body manually.
 * @param {http.IncomingMessage} req
 * @returns {Promise<any>}
 */
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      // Prevent flood attacks (1MB limit)
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });

    req.on('end', () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        const parsed = JSON.parse(body);
        resolve(parsed);
      } catch (err) {
        reject(new Error('Invalid JSON: ' + err.message));
      }
    });

    req.on('error', (err) => reject(err));
  });
}

/**
 * Helper to write JSON responses with proper headers.
 */
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data, null, 2));
}

const server = http.createServer(async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  const host = req.headers.host || `localhost:${PORT}`;
  const parsedUrl = new URL(req.url, `http://${host}`);
  const pathname = parsedUrl.pathname;
  const searchParams = parsedUrl.searchParams;

  try {
    // Route: GET /health or GET /native/health
    if (pathname === '/health' || pathname === '/native/health') {
      if (req.method !== 'GET') {
        return sendJson(res, 405, { success: false, error: 'Method Not Allowed' });
      }
      return sendJson(res, 200, {
        success: true,
        server: 'raw-node-http',
        status: 'healthy',
        uptime: process.uptime(),
        node: process.version,
        os: {
          platform: os.platform(),
          cpus: os.cpus().length,
          freeMemory: os.freemem(),
          totalMemory: os.totalmem(),
        },
      });
    }

    // Route: GET /native/products
    if (pathname === '/native/products') {
      if (req.method !== 'GET') {
        return sendJson(res, 405, { success: false, error: 'Method Not Allowed' });
      }

      let products = await getProducts();
      const q = searchParams.get('q');
      if (q) {
        const query = q.toLowerCase();
        products = products.filter(
          (p) =>
            (p.name && p.name.toLowerCase().includes(query)) ||
            (p.description && p.description.toLowerCase().includes(query))
        );
      }

      const limit = parseInt(searchParams.get('limit') || '12', 10);
      const items = products.slice(0, limit);

      return sendJson(res, 200, {
        success: true,
        data: items,
        meta: { total: products.length, count: items.length, limit },
      });
    }

    // Route: GET /native/products/:slug
    if (pathname.startsWith('/native/products/')) {
      if (req.method !== 'GET') {
        return sendJson(res, 405, { success: false, error: 'Method Not Allowed' });
      }

      const slug = pathname.replace('/native/products/', '').trim();
      const products = await getProducts();
      const found = products.find((p) => p.slug === slug);

      if (!found) {
        return sendJson(res, 404, {
          success: false,
          error: { code: 'NOT_FOUND', message: `Product not found with slug: ${slug}` },
        });
      }

      return sendJson(res, 200, { success: true, data: found });
    }

    // Route: POST /native/echo
    if (pathname === '/native/echo') {
      if (req.method !== 'POST') {
        return sendJson(res, 405, { success: false, error: 'Method Not Allowed' });
      }

      try {
        const body = await parseJsonBody(req);
        return sendJson(res, 200, {
          success: true,
          message: 'Echoed payload successfully',
          echoed: body,
          receivedAt: new Date().toISOString(),
        });
      } catch (err) {
        return sendJson(res, 400, {
          success: false,
          error: { code: 'BAD_REQUEST', message: err.message },
        });
      }
    }

    // Unmatched path: 404 Not Found
    return sendJson(res, 404, {
      success: false,
      error: { code: 'NOT_FOUND', message: `Cannot ${req.method} ${pathname}` },
    });
  } catch (err) {
    return sendJson(res, 500, {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: err.message },
    });
  }
});

server.listen(PORT, () => {
  console.log(`[L7] Raw Node HTTP server listening on http://localhost:${PORT}`);
});

export default server;
