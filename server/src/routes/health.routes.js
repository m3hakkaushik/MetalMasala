import { Router } from 'express';
import os from 'node:os';
import config from '../config/index.js';
import { getDbStatus } from '../config/db.js';
import { sendSuccess } from '../utils/response.js';

// [L5] Core Node.js Modules: os stats (platform, cpus, memory)
// [L6] Process Object & CLI: process.uptime(), process.memoryUsage(), process.version
// [L27] Connecting Node.js with MongoDB: /health reports live database state (state, name, host)

const router = Router();

router.get('/', (req, res) => {
  const healthData = {
    status: 'healthy',
    uptime: Math.floor(process.uptime()),
    env: config.server.env,
    node: process.version,
    memory: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
    },
    os: {
      platform: os.platform(),
      release: os.release(),
      cpus: os.cpus().length,
      freeMemory: Math.round(os.freemem() / 1024 / 1024) + 'MB',
      totalMemory: Math.round(os.totalmem() / 1024 / 1024) + 'MB',
    },
    store: config.server.dataStore,
    db: getDbStatus(),
  };

  return sendSuccess(res, healthData, {
    message: 'Metal Masala API is healthy and operational',
  });
});

export default router;
