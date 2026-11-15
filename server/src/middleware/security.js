import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import config from '../config/index.js';

// [L16] Set security headers, negotiate compression, and handle CORS preflight.
export const security = [helmet(), compression(), cors(config.cors)];
