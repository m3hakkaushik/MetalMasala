import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

const root = path.resolve(import.meta.dirname, '../..');
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';

// [L29] [L30] Select the environment file at startup. Explicit shell values take precedence.
const loaded = dotenv.config({ path: path.join(root, envFile), quiet: true });
if (loaded.error && loaded.error.code !== 'ENOENT') {
  console.error(
    `Unable to read ${envFile} (${loaded.error.code ?? 'unknown error'}).`
  );
  process.exit(1);
}

const integer = (min, max) =>
  z
    .string()
    .regex(/^\d+$/, 'Use a whole number.')
    .transform(Number)
    .pipe(z.number().int().min(min).max(max));

const mongoUri = z
  .string()
  .trim()
  .regex(
    /^mongodb(?:\+srv)?:\/\/[^/\s?#]+(?:[/?][^\s#]*)?$/,
    'Use a mongodb:// or mongodb+srv:// connection string.'
  );

const origin = z
  .string()
  .trim()
  .refine((value) => {
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) && url.origin === value;
    } catch {
      return false;
    }
  }, 'Use an HTTP(S) origin with no path or trailing slash.');

const schema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: integer(1, 65535).prefault('4000'),
    NATIVE_PORT: integer(0, 65535).prefault('4001'),
    CLIENT_ORIGIN: origin.default('http://localhost:5173'),
    LOG_LEVEL: z.enum(['dev', 'combined', 'tiny', 'silent']).optional(),
    DATA_STORE: z.enum(['mongo', 'json']).default('mongo'),
    DATA_STORE_DIR: z.string().trim().min(1).optional(),
    DB_TARGET: z.enum(['local', 'atlas']).default('local'),
    MONGODB_URI: z.preprocess(
      (value) => (value === '' ? undefined : value),
      mongoUri.optional()
    ),
    MONGODB_URI_LOCAL: mongoUri.default(
      'mongodb://127.0.0.1:27017/metal_masala'
    ),
    DB_NAME: z
      .string()
      .trim()
      .regex(/^[\w-]+$/, 'Use letters, digits, underscores, or hyphens.')
      .default('metal_masala'),
    AI_PROVIDER: z.enum(['mock', 'openai', 'anthropic', 'gemini']).default('mock'),
    AI_API_KEY: z.string().trim().optional(),
    AI_MODEL: z.string().trim().optional(),
    FREE_SHIPPING_THRESHOLD: integer(1, Number.MAX_SAFE_INTEGER).prefault(
      '999'
    ),
    SHIPPING_FEE: integer(0, Number.MAX_SAFE_INTEGER).prefault('79'),
    COD_FEE: integer(0, Number.MAX_SAFE_INTEGER).prefault('49'),
    LOW_STOCK_THRESHOLD: integer(0, Number.MAX_SAFE_INTEGER).prefault('5'),
    RATE_LIMIT_WINDOW_MS: integer(1, 2_147_483_647).prefault('60000'),
    RATE_LIMIT_MAX: integer(1, Number.MAX_SAFE_INTEGER).prefault('100'),
    BCRYPT_ROUNDS: integer(10, 14).optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NATIVE_PORT === 0 && env.NODE_ENV !== 'test') {
      ctx.addIssue({
        code: 'custom',
        path: ['NATIVE_PORT'],
        message: 'Use a port between 1 and 65535.',
      });
    }
    if (env.DB_TARGET === 'atlas' && !env.MONGODB_URI) {
      ctx.addIssue({
        code: 'custom',
        path: ['MONGODB_URI'],
        message: 'Required when DB_TARGET=atlas.',
      });
    }
  });

const result = schema.safeParse(process.env);
if (!result.success) {
  const errors = result.error.issues.map((issue) => ({
    variable: issue.path.join('.'),
    problem: issue.message,
  }));
  console.error(`Invalid server configuration (${envFile}):`);
  console.table(errors);
  process.exit(1);
}

const env = result.data;
const config = Object.freeze({
  server: Object.freeze({
    env: env.NODE_ENV,
    port: env.PORT,
    nativePort: env.NATIVE_PORT,
    dataStore: env.DATA_STORE,
    storeDir: path.resolve(root, env.DATA_STORE_DIR ?? 'data/store'),
  }),
  cors: Object.freeze({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
    exposedHeaders: Object.freeze(['X-Request-Id', 'ETag', 'Location']),
  }),
  // [L19] The MongoDB decision is isolated from the JSON-backed HTTP app.
  db: Object.freeze({
    target: env.DB_TARGET,
    uri: env.DB_TARGET === 'atlas' ? env.MONGODB_URI : env.MONGODB_URI_LOCAL,
    name: env.DB_NAME,
  }),
  pricing: Object.freeze({
    freeShippingThreshold: env.FREE_SHIPPING_THRESHOLD,
    shippingFee: env.SHIPPING_FEE,
    codFee: env.COD_FEE,
  }),
  // [L43] AI service integration parameters
  ai: Object.freeze({
    provider: env.AI_PROVIDER,
    apiKey: env.AI_API_KEY,
    model: env.AI_MODEL,
  }),
  rateLimit: Object.freeze({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
  }),
  log: Object.freeze({
    format:
      env.LOG_LEVEL ??
      (env.NODE_ENV === 'test'
        ? 'silent'
        : env.NODE_ENV === 'production'
          ? 'combined'
          : 'dev'),
  }),
  stock: Object.freeze({ lowStockThreshold: env.LOW_STOCK_THRESHOLD }),
});

export default config;
