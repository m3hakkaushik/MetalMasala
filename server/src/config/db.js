import mongoose from 'mongoose';
import config from './index.js';
import { debugBoot, debugData } from '../utils/logger.js';

// [L27] Connecting Node.js with MongoDB
mongoose.set('strictQuery', true);

// Register Mongoose connection event listeners
mongoose.connection.on('connected', () => {
  console.log(`🍃 MongoDB connected successfully to database "${mongoose.connection.name}" on ${mongoose.connection.host}`);
  debugBoot('MongoDB connected to %s', mongoose.connection.name);
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err.message);
  debugData('MongoDB connection error: %O', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB disconnected');
  debugBoot('MongoDB disconnected');
});

/**
 * Connect to MongoDB using validated configuration with exponential backoff retry.
 * @param {number} maxRetries
 * @param {number} delayMs
 */
export async function connectDB(maxRetries = 3, delayMs = 1000) {
  // If already connected, return existing connection
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const { uri, name, target } = config.db;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      attempt++;
      debugBoot('Attempting MongoDB connection (attempt %d/%d) to target: %s', attempt, maxRetries, target);
      await mongoose.connect(uri, {
        dbName: name,
        serverSelectionTimeoutMS: 5000,
      });
      return mongoose.connection;
    } catch (err) {
      console.error(`MongoDB connection failed (attempt ${attempt}/${maxRetries}):`, err.name || err.message);
      if (attempt >= maxRetries) {
        throw err;
      }
      const backoff = delayMs * Math.pow(2, attempt - 1);
      debugBoot('Retrying in %d ms...', backoff);
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }
}

/**
 * Cleanly disconnect from MongoDB.
 */
export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    debugBoot('MongoDB disconnected cleanly');
  }
}

/**
 * Returns human-readable database state for /health endpoint.
 */
export function getDbStatus() {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return {
    state: states[mongoose.connection.readyState] || 'unknown',
    name: mongoose.connection.name || config.db.name,
    host: mongoose.connection.host || 'unknown',
  };
}

export default { connectDB, disconnectDB, getDbStatus };
