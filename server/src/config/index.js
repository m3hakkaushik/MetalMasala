// [L3] Node.js Runtime & NPM: Environment configuration and runtime validation
// [L6] Process Object & CLI: Accessing process.env for central server configuration.
// S6 Config Seam: This is the ONLY file in the backend that reads process.env directly.
// In B2, this will be upgraded to dotenv + zod validation.

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  nativePort: parseInt(process.env.NATIVE_PORT || '4001', 10),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  dataStore: process.env.DATA_STORE || 'json',
  isProduction: (process.env.NODE_ENV || 'development') === 'production',
};

export default config;
