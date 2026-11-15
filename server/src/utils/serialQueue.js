// Queue callers in this process. A failed operation releases the next caller.
export function createSerialQueue() {
  const pending = new Map();

  return async function run(key, operation) {
    const previous = pending.get(key);
    const next = Promise.withResolvers();
    pending.set(key, next.promise);
    try {
      await previous;
      return await operation();
    } finally {
      next.resolve();
      if (pending.get(key) === next.promise) pending.delete(key);
    }
  };
}
