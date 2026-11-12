import { failure } from './http';

export function rateLimit(max) {
  const recent = [];
  return () => {
    const now = Date.now();
    while (recent.length && recent[0] < now - 60_000) recent.shift();
    if (recent.length >= max)
      return failure(429, 'RATE_LIMITED', 'Try again in a minute.');
    recent.push(now);
  };
}
