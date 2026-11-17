import http from 'node:http';
import app from './app.js';
import config from './config/index.js';
import { debugBoot } from './utils/logger.js';

// [L1] Introduction to Backend Development: HTTP Server listening for client requests
// [L3] Node.js Runtime & NPM: Application entrypoint running on Node.js >=22 runtime with native ES Modules
// [L6] Process Object & CLI: Process lifecycle, graceful shutdown on SIGINT/SIGTERM, global unhandled exception hooks

const server = http.createServer(app);

// Graceful shutdown helper
function handleGracefulShutdown(signal) {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  debugBoot(`Shutdown initiated via ${signal}`);

  server.close((err) => {
    if (err) {
      console.error('❌ Error during server close:', err);
      process.exit(1);
    }
    console.log('✅ HTTP server closed. Process terminating safely.');
    process.exit(0);
  });

  // Force close after 5 seconds if connections hang
  setTimeout(() => {
    console.error('⚠️  Forceful shutdown after timeout.');
    process.exit(1);
  }, 5000).unref();
}

// Register process signal listeners [L6]
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));

// Global unhandled promise rejection handler [L6]
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  debugBoot('Unhandled rejection: %O', reason);
  process.exit(1);
});

// Global uncaught exception handler [L6]
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception thrown:', err);
  debugBoot('Uncaught exception: %O', err);
  process.exit(1);
});

// Start listening
server.listen(config.port, () => {
  const url = `http://localhost:${config.port}`;
  console.log(`✨ Metal मसाला API server running at ${url}`);
  console.log(`   Health probe:  ${url}/health`);
  console.log(`   Products API:  ${url}/api/v1/products`);
  console.log(`   Environment:   ${config.env}`);
  console.log(`   Data Store:    ${config.dataStore}`);
  debugBoot('Server initialized on port %d', config.port);
});

export default server;
